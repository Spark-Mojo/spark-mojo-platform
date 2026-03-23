import { useState, useContext } from 'react'
import { X, Send, MessageSquare, RotateCcw, Ban, AlertTriangle } from 'lucide-react'
import { ToastContext } from '../../hooks/useToast'
import { useBillingData } from '../../hooks/useBillingData'

const STATUS_STYLES = {
  'Unbilled': { bg: '#FEF4E7', color: '#854F0B' },
  'Submitted — Awaiting Response': { bg: '#EAF2FB', color: '#185FA5' },
  'Resubmitting': { bg: '#EAF2FB', color: '#185FA5' },
  'Blocked — No Appointment in SP': { bg: '#FCEAEA', color: '#A32D2D' },
  'Written Off': { bg: '#F3F4F6', color: '#6B7280' },
  'Resolved / Paid': { bg: '#EAF3DE', color: '#3B6D11' },
}

const OUTREACH_METHODS = ['Phone Call', 'Text', 'Email', 'Left VM', 'Sent to Julia']

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status || '—'}
    </span>
  )
}

function formatDate(d) {
  if (!d) return '—'
  if (!(d instanceof Date)) d = new Date(d)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDollar(n) {
  if (typeof n !== 'number' || isNaN(n)) return '$0'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function ClaimDrawer({ claim, onClose }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const { updateUnbilledClaim } = useBillingData()

  const [noteText, setNoteText] = useState('')
  const [showWriteOff, setShowWriteOff] = useState(false)
  const [writeOffReason, setWriteOffReason] = useState('')
  const [showAddNote, setShowAddNote] = useState(false)

  if (!claim) return null

  const attempts = claim.outreachAttempts || []
  const canAddAttempt = attempts.length < 5

  const handleLogAttempt = (method) => {
    if (!canAddAttempt) return
    const newAttempt = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      method,
    }
    const updated = [...attempts, newAttempt]
    updateUnbilledClaim(claim.id, { outreachAttempts: updated })
    toast?.success(`Outreach logged — ${method} attempt #${updated.length} for ${claim.client}`)
  }

  const handleMarkSubmitted = () => {
    updateUnbilledClaim(claim.id, { status: 'Submitted — Awaiting Response' })
    toast?.success(`Claim marked as submitted for ${claim.client}`)
  }

  const handleResubmit = () => {
    updateUnbilledClaim(claim.id, { status: 'Resubmitting' })
    toast?.success(`Claim marked for resubmission for ${claim.client}`)
  }

  const handleBlock = () => {
    updateUnbilledClaim(claim.id, { status: 'Blocked — No Appointment in SP' })
    toast?.success(`Claim blocked — no SP appointment for ${claim.client}`)
  }

  const handleWriteOff = () => {
    if (!writeOffReason.trim()) return
    updateUnbilledClaim(claim.id, {
      status: 'Written Off',
      notes: claim.notes ? `${claim.notes}\nWrite-off: ${writeOffReason.trim()}` : `Write-off: ${writeOffReason.trim()}`,
    })
    toast?.success(`Claim written off for ${claim.client}`)
    setShowWriteOff(false)
    setWriteOffReason('')
  }

  const handleAddNote = () => {
    if (!noteText.trim()) return
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const newNote = `[${timestamp}] ${noteText.trim()}`
    updateUnbilledClaim(claim.id, {
      notes: claim.notes ? `${claim.notes}\n${newNote}` : newNote,
    })
    toast?.success(`Note added for ${claim.client}`)
    setNoteText('')
    setShowAddNote(false)
  }

  const detailRows = [
    { label: 'Client', value: claim.client },
    { label: 'Clinician', value: claim.clinician },
    { label: 'Date of Service', value: formatDate(claim.dateOfService), mono: true },
    { label: 'Billing Code', value: claim.billingCode, mono: true },
    { label: 'Payer', value: claim.payer },
    { label: 'Amount Owed', value: formatDollar(claim.amountOwed), mono: true },
  ]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-[480px] z-50 flex flex-col shadow-2xl"
        style={{
          backgroundColor: 'var(--surface)',
          animation: 'claimDrawerSlideIn 200ms ease',
          fontFamily: "'Sora', sans-serif",
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              {claim.client || 'Claim Details'}
            </h2>
            <button onClick={onClose} className="p-1 rounded-md" style={{ color: 'var(--muted)' }}>
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={claim.status} />
            <span style={{ color: 'var(--muted)' }}>·</span>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>{claim.clinician || '—'}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Claim Details */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
              Claim Details
            </h3>
            <div className="space-y-2">
              {detailRows.map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{row.label}</span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: 'var(--text)',
                      fontFamily: row.mono ? "'IBM Plex Mono', monospace" : "'Sora', sans-serif",
                    }}
                  >
                    {row.value || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {claim.notes && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                Notes
              </h3>
              <div
                className="text-sm rounded-lg p-3 whitespace-pre-wrap"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                {claim.notes}
              </div>
            </div>
          )}

          {/* Outreach History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Outreach History
              </h3>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                {attempts.length} / 5 attempts
              </span>
            </div>

            {attempts.length === 0 ? (
              <div className="text-sm py-3 text-center" style={{ color: 'var(--muted)' }}>
                No outreach attempts yet
              </div>
            ) : (
              <div className="space-y-0">
                {attempts.map((attempt, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: 'var(--accent)', marginTop: 4 }}
                      />
                      {i < attempts.length - 1 && (
                        <div className="w-0.5 flex-1 my-1" style={{ backgroundColor: 'var(--border)' }} />
                      )}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                        >
                          {attempt.method || 'Unknown'}
                        </span>
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {attempt.date || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Log Attempt */}
            {canAddAttempt && (
              <div className="rounded-lg p-3 mt-3" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Log Attempt</h4>
                <div className="flex flex-wrap gap-2">
                  {OUTREACH_METHODS.map(method => (
                    <button
                      key={method}
                      onClick={() => handleLogAttempt(method)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer', border: 'none' }}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
              Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={handleMarkSubmitted}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  cursor: 'pointer',
                }}
              >
                <Send size={14} />
                Mark Submitted
              </button>

              <button
                onClick={() => setShowAddNote(!showAddNote)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <MessageSquare size={14} />
                Add Note
              </button>

              {showAddNote && (
                <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full px-3 py-2 rounded-lg border text-sm mb-2 resize-none"
                    rows={2}
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    Save Note
                  </button>
                </div>
              )}

              <button
                onClick={handleResubmit}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={14} />
                Resubmit
              </button>

              <button
                onClick={() => setShowWriteOff(!showWriteOff)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#FEF4E7',
                  color: '#854F0B',
                  border: '1px solid #EAB308',
                  cursor: 'pointer',
                }}
              >
                <AlertTriangle size={14} />
                Write Off
              </button>

              {showWriteOff && (
                <div className="rounded-lg p-3" style={{ backgroundColor: '#FEF4E7', border: '1px solid #EAB308' }}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#854F0B' }}>
                    Write-off reason (required)
                  </label>
                  <textarea
                    value={writeOffReason}
                    onChange={(e) => setWriteOffReason(e.target.value)}
                    placeholder="Enter reason for write-off..."
                    className="w-full px-3 py-2 rounded-lg border text-sm mb-2 resize-none"
                    rows={2}
                    style={{ borderColor: '#EAB308', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                  />
                  <button
                    onClick={handleWriteOff}
                    disabled={!writeOffReason.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#854F0B', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    Confirm Write Off
                  </button>
                </div>
              )}

              <button
                onClick={handleBlock}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#FCEAEA',
                  color: '#A32D2D',
                  border: '1px solid #F87171',
                  cursor: 'pointer',
                }}
              >
                <Ban size={14} />
                Block — No SP Appt
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes claimDrawerSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
