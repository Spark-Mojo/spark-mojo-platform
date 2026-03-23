import { useState, useMemo, useContext } from 'react'
import { updateClientField } from '../../services/sheetsWrite'
import { ToastContext } from '../../hooks/useToast'

const FIELDS = [
  { key: 'clientName', label: 'Client Name', col: 'Full Client Name', type: 'text' },
  { key: 'clinician', label: 'Clinician', col: 'Clinician', type: 'select' },
  { key: 'dateAdded', label: 'Date Added', col: 'Date', type: 'date' },
  { key: 'firstAppt', label: 'First Appointment', col: 'First Appt', type: 'date' },
  { key: 'dob', label: 'Date of Birth', col: 'DOB', type: 'date' },
  { key: 'primaryInsurance', label: 'Primary Insurance', col: 'Primary Insurance', type: 'text' },
  { key: 'secondaryInsurance', label: 'Secondary Insurance', col: 'Secondary Insurance', type: 'text' },
  { key: 'memberId', label: 'Member ID', col: 'Member ID', type: 'text' },
  { key: 'employer', label: 'Employer', col: 'Employer', type: 'text' },
  { key: 'notes', label: 'Notes', col: 'Notes', type: 'textarea' },
]

function toInputDate(val) {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

export default function EditTab({ client, staff, clients, accessToken, userEmail, onUpdate }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast

  const initial = useMemo(() => {
    const values = {}
    for (const f of FIELDS) {
      values[f.key] = f.type === 'date' ? toInputDate(client[f.key]) : (client[f.key] || '')
    }
    return values
  }, [client])

  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)

  const staffOptions = useMemo(() => {
    const names = staff.filter(s => s.status !== 'Inactive').map(s => s.name)
    if (names.length === 0 && clients) {
      return [...new Set(clients.map(c => c.clinician).filter(Boolean))].sort()
    }
    return names
  }, [staff, clients])

  const hasChanges = useMemo(() => {
    return FIELDS.some(f => values[f.key] !== initial[f.key])
  }, [values, initial])

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const changed = FIELDS.filter(f => values[f.key] !== initial[f.key])
      for (const f of changed) {
        await updateClientField(accessToken, client.id, f.col, values[f.key], userEmail)
      }
      toast?.success(`${changed.length} field${changed.length !== 1 ? 's' : ''} updated`)
      onUpdate?.()
    } catch (err) {
      toast?.error(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    borderColor: 'var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
  }

  return (
    <div>
      <div className="space-y-4">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              {f.label}
            </label>
            {f.type === 'select' ? (
              <select
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              >
                <option value="">Unassigned</option>
                {staffOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                rows={3}
                style={inputStyle}
              />
            ) : (
              <input
                type={f.type}
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  ...inputStyle,
                  fontFamily: f.type === 'date' ? "'IBM Plex Mono', monospace" : undefined,
                }}
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className="w-full mt-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
