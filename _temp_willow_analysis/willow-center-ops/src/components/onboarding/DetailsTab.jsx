import { useContext } from 'react'
import { Check } from 'lucide-react'
import { updateClientField } from '../../services/sheetsWrite'
import { ToastContext } from '../../hooks/useToast'

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-sm" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--text)', fontFamily: mono ? "'IBM Plex Mono', monospace" : undefined }}>
        {value || '—'}
      </span>
    </div>
  )
}

export default function DetailsTab({ client, accessToken, userEmail, onUpdate, readOnly = false }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast

  let clinicianHistory = []
  if (client.clinicianHistory) {
    try {
      clinicianHistory = JSON.parse(client.clinicianHistory)
    } catch {
      // Not JSON — ignore
    }
  }

  const handleSPToggle = async (fieldKey, label) => {
    const newValue = !client[fieldKey]
    try {
      // Pass client property key — sheetsWrite maps it to the correct column index
      await updateClientField(accessToken, client.id, fieldKey, newValue ? 'TRUE' : 'FALSE', userEmail)
      toast?.success(`${label} ${newValue ? 'checked' : 'unchecked'}`)
      onUpdate?.()
    } catch (err) {
      toast?.error(`Failed to update: ${err.message}`)
    }
  }

  return (
    <div>
      {/* Info grid */}
      <div className="mb-6">
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
          Client Information
        </h3>
        <InfoRow label="DOB"                value={client.dob}             mono />
        <InfoRow label="Employer"           value={client.employer} />
        <InfoRow label="Primary Insurance"  value={client.primaryInsurance} />
        <InfoRow label="Member ID"          value={client.memberId}         mono />
        <InfoRow label="Secondary Insurance" value={client.secondaryInsurance} />
        <InfoRow label="Verification Status" value={client.verified ? 'Verified ✓' : 'Not Verified'} />
        <InfoRow label="Staff"              value={client.staffInitials} />
      </div>

      {/* Clinician history */}
      <div className="mb-6">
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
          Clinician History
        </h3>
        <div className="text-sm mb-2" style={{ color: 'var(--text)' }}>
          <span className="font-medium">Current:</span> {client.clinician || '—'}
        </div>
        {clinicianHistory.length > 0 ? (
          <div className="space-y-1">
            {[...clinicianHistory].reverse().map((entry, i) => (
              <div key={i} className="text-sm" style={{ color: 'var(--muted)' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{entry.dateRange || '—'}</span>: {entry.name || '—'}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm" style={{ color: 'var(--muted)' }}>No prior assignments</div>
        )}
      </div>

      {/* SP sync checkboxes */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
          SimplePractice Sync
        </h3>
        <div className="space-y-2">
          {[
            { key: 'spNoteAdded',      label: 'SP note added' },
            { key: 'insuranceUpdated', label: 'Insurance updated in SP' },
          ].map(item => {
            const checked = !!client[item.key]
            return (
              <button
                key={item.key}
                onClick={() => !readOnly && handleSPToggle(item.key, item.label)}
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
                <span className="text-sm" style={{ color: 'var(--text)' }}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
