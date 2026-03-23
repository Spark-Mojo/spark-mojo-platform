import { useContext } from 'react'
import { Check } from 'lucide-react'
import { isMinor, daysBetween, formatApptDate } from '../../utils/dates'
import { updateClientField } from '../../services/sheetsWrite'
import { ToastContext } from '../../hooks/useToast'

// field must match keys in FIELD_TO_COL_INDEX in sheetsWrite.js
const CHECKLIST_ITEMS = [
  { key: 'paperworkComplete',  label: 'Paperwork completed',        show: () => true,                                                                       required: true  },
  { key: 'insuranceCard',      label: 'Insurance card uploaded',     show: (c) => (c.primaryInsurance || '').toLowerCase() !== 'self pay',                   required: true  },
  { key: 'verified',           label: 'Insurance verified',          show: (c) => (c.primaryInsurance || '').toLowerCase() !== 'self pay',                   required: true  },
  { key: 'custodyAgreement',   label: 'Custody agreement',           show: (c) => isMinor(c.dob) === true || !!c.custodyAgreement,                           required: true  },
  { key: 'gfeSent',            label: 'Good Faith Estimate sent',    show: (c) => (c.primaryInsurance || '').toLowerCase() === 'self pay',                   required: true  },
  { key: 'spNoteAdded',        label: 'SP note added',               show: () => true,                                                                       required: true  },
  { key: 'insuranceUpdated',   label: 'Insurance updated in SP',     show: () => true,                                                                       required: false },
]

export default function ChecklistTab({ client, onToggle, onFieldUpdate, accessToken, userEmail, readOnly = false }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast

  const visibleItems = CHECKLIST_ITEMS.filter(item => item.show(client))

  const handleToggle = async (item) => {
    const newValue = !client[item.key]
    try {
      // Pass client property key — sheetsWrite maps it to the correct column index
      await updateClientField(accessToken, client.id, item.key, newValue ? 'TRUE' : 'FALSE', userEmail)
      // Optimistic local update — keeps drawer open without full refresh flicker
      onFieldUpdate?.(client.id, item.key, newValue)
      onToggle?.()
      toast?.success(`${item.label} ${newValue ? 'checked' : 'unchecked'}`)
    } catch (err) {
      toast?.error(`Failed to update: ${err.message}`)
    }
  }

  const daysUntil = client.firstAppt ? daysBetween(new Date(), new Date(client.firstAppt)) : null

  return (
    <div>
      <div className="space-y-2 mb-6">
        {visibleItems.map(item => {
          const checked = !!client[item.key]
          return (
            <button
              key={item.key}
              onClick={() => !readOnly && handleToggle(item)}
              disabled={readOnly}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              style={{
                backgroundColor: checked ? 'var(--accent-light)' : 'var(--bg)',
                border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: checked ? 'var(--accent)' : 'transparent',
                  border: checked ? 'none' : '2px solid var(--border)',
                }}
              >
                {checked && <Check size={12} color="#fff" />}
              </div>
              <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{item.label}</span>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: item.required ? '#EAF2FB' : '#F3F4F6',
                  color: item.required ? '#185FA5' : '#6B7280',
                }}
              >
                {item.required ? 'Required' : 'Optional'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Appointment info */}
      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
          Appointment Info
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--muted)' }}>First Appointment</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
              {formatApptDate(client.firstAppt) || '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--muted)' }}>Clinician</span>
            <span style={{ color: 'var(--text)' }}>{client.clinician || '—'}</span>
          </div>
          {daysUntil !== null && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted)' }}>Days until appt</span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: daysUntil <= 2 ? 'var(--red)' : daysUntil <= 7 ? 'var(--amber)' : 'var(--text)',
                  fontWeight: 600,
                }}
              >
                {daysUntil}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
