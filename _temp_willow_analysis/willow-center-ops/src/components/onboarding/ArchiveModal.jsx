import { useState, useContext } from 'react'
import { X } from 'lucide-react'
import { moveClientToArchive } from '../../services/sheetsWrite'
import { ToastContext } from '../../hooks/useToast'

const REASONS = [
  'Client changed mind',
  'Insurance issue',
  'Incomplete paperwork — client unresponsive',
  'Distance / location',
  'Clinician not available',
  'Other',
]

export default function ArchiveModal({ client, accessToken, userEmail, onClose, onArchived }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleArchive = async () => {
    const finalReason = reason === 'Other' ? otherReason : reason
    if (!finalReason) {
      toast?.error('Please select a reason')
      return
    }
    setSaving(true)
    try {
      await moveClientToArchive(accessToken, client.id, finalReason, userEmail)
      toast?.success(`${client.clientName} archived`)
      onArchived?.()
      onClose()
    } catch (err) {
      toast?.error(`Failed to archive: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Archive Client</h2>
            <button onClick={onClose} className="p-1" style={{ color: 'var(--muted)' }}><X size={20} /></button>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Archive <strong style={{ color: 'var(--text)' }}>{client.clientName}</strong>? Select a reason:
            </p>
            <div className="space-y-2 mb-4">
              {REASONS.map(r => (
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text)' }}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
            {reason === 'Other' && (
              <input
                type="text"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Describe reason..."
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            )}
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--muted)' }}>Cancel</button>
            <button
              onClick={handleArchive}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--red)' }}
            >
              {saving ? 'Archiving...' : 'Archive'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
