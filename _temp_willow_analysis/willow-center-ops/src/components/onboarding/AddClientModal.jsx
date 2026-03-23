import { useState, useContext, useMemo } from 'react'
import { X } from 'lucide-react'
import { addClient } from '../../services/sheetsWrite'
import { ToastContext } from '../../hooks/useToast'

export default function AddClientModal({ staff, clients, accessToken, userEmail, onClose, onSaved }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    clientName: '',
    clinician: '',
    firstAppt: '',
    primaryInsurance: '',
    selfPay: false,
    dob: '',
    memberId: '',
    employer: '',
    staffInitials: '',
  })

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    if (!form.clientName || !form.clinician || !form.firstAppt || (!form.primaryInsurance && !form.selfPay)) {
      toast?.error('Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      await addClient(accessToken, {
        ...form,
        primaryInsurance: form.selfPay ? 'Self Pay' : form.primaryInsurance,
      }, userEmail)
      toast?.success(`${form.clientName} added to queue`)
      onSaved?.()
      onClose()
    } catch (err) {
      toast?.error(`Failed to add client: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Use active staff from Staff tab; fall back to unique clinicians from Need to Check
  const activeStaff = useMemo(() => {
    const fromStaffTab = staff.filter(s => s.status !== 'Inactive')
    if (fromStaffTab.length > 0) return fromStaffTab

    // Fallback: derive unique clinician names from client data
    const seen = new Set()
    const fallback = []
    for (const c of (clients || [])) {
      const name = (c.clinician || '').trim()
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        fallback.push({ name, initials: c.staffInitials || name.substring(0, 2).toUpperCase() })
      }
    }
    return fallback.sort((a, b) => a.name.localeCompare(b.name))
  }, [staff, clients])

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-xl shadow-2xl"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Add New Client</h2>
            <button onClick={onClose} className="p-1 rounded-md" style={{ color: 'var(--muted)' }}>
              <X size={20} />
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Client Name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Client Name *</label>
              <input
                type="text"
                value={form.clientName}
                onChange={(e) => update('clientName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Clinician */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Clinician *</label>
              <input
                type="text"
                value={form.clinician}
                onChange={(e) => update('clinician', e.target.value)}
                placeholder="Clinician name"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* First Appt */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>First Appointment *</label>
              <input
                type="datetime-local"
                value={form.firstAppt}
                onChange={(e) => update('firstAppt', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'IBM Plex Mono', monospace" }}
              />
            </div>

            {/* Insurance */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Primary Insurance *</label>
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={form.selfPay}
                    onChange={(e) => update('selfPay', e.target.checked)}
                    className="rounded"
                  />
                  Self Pay
                </label>
              </div>
              {!form.selfPay && (
                <input
                  type="text"
                  value={form.primaryInsurance}
                  onChange={(e) => update('primaryInsurance', e.target.value)}
                  placeholder="Insurance carrier name"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              )}
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>DOB</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => update('dob', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'IBM Plex Mono', monospace" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Member ID</label>
                <input
                  type="text"
                  value={form.memberId}
                  onChange={(e) => update('memberId', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Employer</label>
                <input
                  type="text"
                  value={form.employer}
                  onChange={(e) => update('employer', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Staff Assigned</label>
                <select
                  value={form.staffInitials}
                  onChange={(e) => update('staffInitials', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="">Unassigned</option>
                  {activeStaff.map(s => (
                    <option key={s.initials} value={s.initials}>{s.name} ({s.initials})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {saving ? 'Saving...' : 'Add Client'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
