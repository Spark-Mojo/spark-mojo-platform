import { useState, useContext } from 'react'
import { X, Phone, MessageSquare } from 'lucide-react'
import { ToastContext } from '../../hooks/useToast'
import { updateVoicemailInSheet } from '../../services/sheets'

const ALL_STATUSES = [
  'New / Unreviewed',
  'In Progress',
  'Answered — Resolved',
  'Needs Followup',
  'Forwarded to Clinician',
  'Called Back — Reached',
  'Called Back — Left VM',
  'Sent Text',
  'No Answer — Retry',
  'Closed',
]

const STATUS_STYLES = {
  'New / Unreviewed':        { bg: '#FCEAEA', color: '#A32D2D' },
  'In Progress':             { bg: '#FEF4E7', color: '#854F0B' },
  'Needs Followup':          { bg: '#EAF2FB', color: '#185FA5' },
  'Answered — Resolved':     { bg: '#EAF3DE', color: '#3B6D11' },
  'Answered / Resolved':     { bg: '#EAF3DE', color: '#3B6D11' },
  'Forwarded to Clinician':  { bg: '#EAF2FB', color: '#185FA5' },
  'Called Back — Reached':   { bg: '#EAF3DE', color: '#3B6D11' },
  'Called Back — Left VM':   { bg: '#FEF4E7', color: '#854F0B' },
  'Sent Text':               { bg: '#FEF4E7', color: '#854F0B' },
  'No Answer — Retry':       { bg: '#FEF4E7', color: '#854F0B' },
  'Closed':                  { bg: '#F3F4F6', color: '#6B7280' },
}

const OUTREACH_METHODS = ['Phone Call', 'Text', 'Email', 'Left VM']

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

export default function VoicemailDrawer({ voicemail, onClose, accessToken, userEmail, staff = [], onUpdate }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast

  const [selectedStatus, setSelectedStatus] = useState(voicemail?.status || 'New / Unreviewed')
  const [noteText, setNoteText] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [followupNote, setFollowupNote] = useState('')
  const [saving, setSaving] = useState(false)

  if (!voicemail) return null

  const attempts = voicemail.outreachAttempts || []
  const canAddAttempt = attempts.length < 5

  const handleLogAttempt = async (method) => {
    if (!canAddAttempt) return
    const newAttempt = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      method,
    }
    const updatedAttempts = [...attempts, newAttempt]

    try {
      setSaving(true)
      await updateVoicemailInSheet(accessToken, voicemail.rowIndex, {
        outreachAttempts: updatedAttempts,
      }, userEmail)
      onUpdate?.(voicemail.id, { outreachAttempts: updatedAttempts })
      toast?.success(`Outreach logged — ${method} attempt #${updatedAttempts.length} for ${voicemail.name}`)
    } catch (err) {
      toast?.error(`Failed to log outreach: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async () => {
    if (selectedStatus === voicemail.status) return

    // Needs Followup requires note + assigned staff
    if (selectedStatus === 'Needs Followup') {
      if (!followupNote.trim() || !assignedTo) {
        toast?.error('Needs Followup requires a note and assigned staff member')
        return
      }
    }

    const updates = {}
    // Map status to actual sheet columns
    updates.taskComplete = selectedStatus === 'Closed'
    updates.forwarded = selectedStatus === 'Forwarded to Clinician'
    updates.calledBack = selectedStatus === 'Called Back — Reached' || selectedStatus === 'Called Back — Left VM'
    updates.action = selectedStatus
    updates.status = selectedStatus

    if (selectedStatus === 'Needs Followup' && followupNote.trim()) {
      const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const note = `[${timestamp}] Follow-up: ${followupNote.trim()} (assigned: ${assignedTo})`
      updates.notes = voicemail.notes ? `${voicemail.notes}\n${note}` : note
    }

    try {
      setSaving(true)
      await updateVoicemailInSheet(accessToken, voicemail.rowIndex, updates, userEmail)
      onUpdate?.(voicemail.id, updates)
      toast?.success(`Status updated to "${selectedStatus}" for ${voicemail.name}`)
      setFollowupNote('')
      setAssignedTo('')
    } catch (err) {
      toast?.error(`Failed to update status: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const newNote = `[${timestamp}] ${noteText.trim()}`
    const updatedNotes = voicemail.notes ? `${voicemail.notes}\n${newNote}` : newNote

    try {
      setSaving(true)
      await updateVoicemailInSheet(accessToken, voicemail.rowIndex, { notes: updatedNotes }, userEmail)
      onUpdate?.(voicemail.id, { notes: updatedNotes })
      toast?.success(`Note added for ${voicemail.name}`)
      setNoteText('')
    } catch (err) {
      toast?.error(`Failed to add note: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const detailRows = [
    { label: 'Caller', value: voicemail.name },
    { label: 'Phone', value: voicemail.number, mono: true },
    { label: 'Date', value: voicemail.date, mono: true },
    { label: 'Time', value: voicemail.time, mono: true },
    { label: 'Type', value: voicemail.type },
    { label: 'Location', value: voicemail.location },
    { label: 'Insurance', value: voicemail.insurance },
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
          animation: 'vmDrawerSlideIn 200ms ease',
          fontFamily: "'Sora', sans-serif",
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              {voicemail.name || 'Unknown Caller'}
            </h2>
            <button onClick={onClose} className="p-1 rounded-md" style={{ color: 'var(--muted)' }}>
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={voicemail.status} />
            {voicemail.type && (
              <>
                <span style={{ color: 'var(--muted)' }}>·</span>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{voicemail.type}</span>
              </>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Details */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
              Voicemail Details
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

          {/* Message */}
          {voicemail.aboutMessage && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                Message
              </h3>
              <div
                className="text-sm rounded-lg p-3"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                {voicemail.aboutMessage}
              </div>
            </div>
          )}

          {/* Notes */}
          {voicemail.notes && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                Notes
              </h3>
              <div
                className="text-sm rounded-lg p-3 whitespace-pre-wrap"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                {voicemail.notes}
              </div>
            </div>
          )}

          {/* Status Update */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
              Update Status
            </h3>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2 mb-3"
              style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'var(--surface)' }}
            >
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {selectedStatus === 'Needs Followup' && (
              <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>
                  Assigned To (required)
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 mb-2"
                  style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'var(--surface)' }}
                >
                  <option value="">Select staff member...</option>
                  {staff.filter(s => s.status !== 'Inactive').map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>
                  Follow-up Note (required)
                </label>
                <textarea
                  value={followupNote}
                  onChange={(e) => setFollowupNote(e.target.value)}
                  placeholder="Describe what follow-up is needed..."
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  rows={2}
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                />
              </div>
            )}

            <button
              onClick={handleStatusChange}
              disabled={saving || selectedStatus === voicemail.status}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: selectedStatus !== voicemail.status ? 'var(--accent)' : 'var(--bg)',
                color: selectedStatus !== voicemail.status ? '#fff' : 'var(--muted)',
                border: selectedStatus !== voicemail.status ? 'none' : '1px solid var(--border)',
                cursor: selectedStatus !== voicemail.status ? 'pointer' : 'default',
              }}
            >
              {saving ? 'Saving...' : 'Save Status'}
            </button>
          </div>

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

            {canAddAttempt && (
              <div className="rounded-lg p-3 mt-3" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Log Attempt</h4>
                <div className="flex flex-wrap gap-2">
                  {OUTREACH_METHODS.map(method => (
                    <button
                      key={method}
                      onClick={() => handleLogAttempt(method)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      style={{ backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer', border: 'none' }}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Add Note */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
              Add Note
            </h3>
            <div className="flex gap-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 rounded-lg border text-sm resize-none"
                rows={2}
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
              />
            </div>
            <button
              onClick={handleAddNote}
              disabled={saving || !noteText.trim()}
              className="mt-2 px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <MessageSquare size={12} />
              Save Note
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes vmDrawerSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
