import { useState, useEffect, useRef, useMemo, useContext } from 'react'
import { DollarSign, Users, ArrowUpDown, Loader, RefreshCw, X as XIcon } from 'lucide-react'
import { useBillingData } from '../../hooks/useBillingData'
import { useAuth } from '../../contexts/auth'
import { ToastContext } from '../../hooks/useToast'

const RESOLUTION_STATUSES = [
  'Pending Outreach',
  'In Progress',
  'Paid in Full',
  'Payment Plan Established',
  'Written Off',
  'Blocked from Scheduling in SP',
  'Unresolvable / Referred Out',
]

const STATUS_STYLES = {
  'Pending Outreach': { bg: '#FEF4E7', color: '#854F0B' },
  'In Progress': { bg: '#EAF2FB', color: '#185FA5' },
  'Paid in Full': { bg: '#EAF3DE', color: '#3B6D11' },
  'Payment Plan Established': { bg: '#EAF2FB', color: '#185FA5' },
  'Written Off': { bg: '#F3F4F6', color: '#6B7280' },
  'Blocked from Scheduling in SP': { bg: '#FCEAEA', color: '#A32D2D' },
  'Unresolvable / Referred Out': { bg: '#F3F4F6', color: '#6B7280' },
}

const OUTREACH_METHODS = ['Text', 'Phone Call', 'Email', 'Left Voicemail']

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#FEF4E7', color: '#854F0B' }
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status || 'Pending Outreach'}
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
  if (typeof n !== 'number' || isNaN(n)) return '$0.00'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const selectStyle = {
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '0.8125rem',
  fontFamily: "'Sora', sans-serif",
  minWidth: '140px',
  outline: 'none',
}

function ClientBalanceDrawer({ client, overrides, onUpdate, onClose }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast

  const [noteText, setNoteText] = useState('')
  const [selectedStatus, setSelectedStatus] = useState(overrides?.resolutionStatus || 'Pending Outreach')
  const [statusNote, setStatusNote] = useState('')

  const attempts = overrides?.outreachAttempts || []
  const canAddAttempt = attempts.length < 5
  const existingNotes = overrides?.notes || ''

  const handleLogAttempt = (method) => {
    if (!canAddAttempt) return
    const newAttempt = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      method,
    }
    const updated = [...attempts, newAttempt]
    onUpdate({ outreachAttempts: updated })
    toast?.success(`Outreach logged — ${method} attempt #${updated.length} for ${client.clientName}`)
  }

  const handleAddNote = () => {
    if (!noteText.trim()) return
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const newNote = `[${timestamp}] ${noteText.trim()}`
    onUpdate({ notes: existingNotes ? `${existingNotes}\n${newNote}` : newNote })
    toast?.success(`Note added for ${client.clientName}`)
    setNoteText('')
  }

  const handleSaveStatus = () => {
    // Paid in Full doesn't require a note
    if (selectedStatus === 'Paid in Full') {
      onUpdate({ resolutionStatus: selectedStatus })
      toast?.success(`${client.clientName} marked as Paid in Full`)
      return
    }

    // All other non-default statuses require a note
    if (selectedStatus !== 'Pending Outreach' && !statusNote.trim()) return

    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    let notePrefix = selectedStatus
    if (selectedStatus === 'Payment Plan Established') {
      notePrefix = 'Payment Plan'
    }
    const newNote = `[${timestamp}] ${notePrefix}: ${statusNote.trim()}`
    const updatedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote

    onUpdate({ resolutionStatus: selectedStatus, notes: updatedNotes })
    toast?.success(`Status updated to "${selectedStatus}" for ${client.clientName}`)
    setStatusNote('')
  }

  const needsNote = selectedStatus !== 'Pending Outreach' && selectedStatus !== 'Paid in Full'
  const currentStatus = overrides?.resolutionStatus || 'Pending Outreach'

  const detailRows = [
    { label: 'Client', value: client.clientName },
    { label: 'Clinician', value: client.clinician },
    { label: 'Total Unpaid', value: formatDollar(client.totalUnpaid), mono: true },
    { label: 'Claims', value: String(client.claimCount), mono: true },
    { label: 'Most Recent DOS', value: formatDate(client.mostRecentDOS), mono: true },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div
        className="fixed top-0 right-0 h-full w-[480px] z-50 flex flex-col shadow-2xl"
        style={{
          backgroundColor: 'var(--surface)',
          animation: 'clientBalanceDrawerSlideIn 200ms ease',
          fontFamily: "'Sora', sans-serif",
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              {client.clientName}
            </h2>
            <button onClick={onClose} className="p-1 rounded-md" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <XIcon size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={currentStatus} />
            <span style={{ color: 'var(--muted)' }}>·</span>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>{client.clinician || '—'}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Client Details */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
              Client Details
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
          {existingNotes && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                Notes
              </h3>
              <div
                className="text-sm rounded-lg p-3 whitespace-pre-wrap"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                {existingNotes}
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

          {/* Add Note */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
              Add Note
            </h3>
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
          </div>

          {/* Resolution Status */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
              Resolution Status
            </h3>
            <div className="rounded-lg p-4 space-y-3" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                style={{ ...selectStyle, width: '100%' }}
              >
                {RESOLUTION_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {needsNote && (
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>
                    {selectedStatus === 'Payment Plan Established'
                      ? 'Payment plan details ($25/mo minimum)'
                      : selectedStatus === 'Written Off'
                        ? 'Authorization & reason for write-off (required)'
                        : 'Note (required)'}
                  </label>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder={
                      selectedStatus === 'Payment Plan Established'
                        ? 'e.g., $50/mo starting April 2026'
                        : selectedStatus === 'Written Off'
                          ? 'Enter authorization and reason...'
                          : 'Enter note...'
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm mb-2 resize-none"
                    rows={2}
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                  />
                </div>
              )}

              <button
                onClick={handleSaveStatus}
                disabled={needsNote && !statusNote.trim()}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{
                  backgroundColor: selectedStatus === 'Paid in Full' ? '#2A7A65' : 'var(--text)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {selectedStatus === 'Paid in Full' ? 'Mark as Paid in Full' : `Set Status: ${selectedStatus}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes clientBalanceDrawerSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}

export default function ClientBalanceWorklist() {
  const { accessToken } = useAuth()
  const { unpaidClaims, isLoaded, fetchFromSheet, clientBalanceOverrides, updateClientBalance } = useBillingData()
  const [sortOrder, setSortOrder] = useState('highest')
  const [filterClinician, setFilterClinician] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (!isLoaded && accessToken && !fetchingRef.current) {
      fetchingRef.current = true
      fetchFromSheet(accessToken)
        .catch(err => setFetchError(err.message || 'Failed to load billing data'))
        .finally(() => { fetchingRef.current = false })
    }
  }, [isLoaded, accessToken, fetchFromSheet])

  // Group unpaid claims by client where clientPaymentStatus = UNPAID
  const clientBalances = useMemo(() => {
    const unpaidClients = unpaidClaims.filter(
      c => c.clientPaymentStatus?.toUpperCase() === 'UNPAID'
    )
    const grouped = {}
    for (const claim of unpaidClients) {
      const rawName = claim.client || 'Unknown'
      const key = rawName.trim().toLowerCase()
      if (!grouped[key]) {
        grouped[key] = {
          clientName: rawName.trim(),
          clinician: claim.clinician,
          totalUnpaid: 0,
          mostRecentDOS: null,
          claimCount: 0,
        }
      }
      grouped[key].totalUnpaid += claim.billedAmount || 0
      grouped[key].claimCount++
      const dos = claim.dateOfService ? new Date(claim.dateOfService) : null
      if (dos && (!grouped[key].mostRecentDOS || dos > grouped[key].mostRecentDOS)) {
        grouped[key].mostRecentDOS = dos
      }
    }
    return Object.values(grouped)
  }, [unpaidClaims])

  // Merge overrides into client data
  const clientsWithOverrides = useMemo(() => {
    return clientBalances.map(c => ({
      ...c,
      resolutionStatus: clientBalanceOverrides[c.clientName]?.resolutionStatus || 'Pending Outreach',
    }))
  }, [clientBalances, clientBalanceOverrides])

  const hasActiveFilter = filterClinician !== '' || filterStatus !== ''

  const clinicians = useMemo(() => {
    return [...new Set(clientBalances.map(c => c.clinician).filter(Boolean))].sort()
  }, [clientBalances])

  const filteredClients = useMemo(() => {
    let result = clientsWithOverrides
    if (filterClinician) result = result.filter(c => c.clinician === filterClinician)
    if (filterStatus) result = result.filter(c => c.resolutionStatus === filterStatus)
    return result
  }, [clientsWithOverrides, filterClinician, filterStatus])

  const sortedClients = useMemo(() => {
    const sorted = [...filteredClients]
    sorted.sort((a, b) => {
      return sortOrder === 'highest' ? b.totalUnpaid - a.totalUnpaid : a.totalUnpaid - b.totalUnpaid
    })
    return sorted
  }, [filteredClients, sortOrder])

  const totalUnpaid = useMemo(() => {
    return filteredClients.reduce((sum, c) => sum + c.totalUnpaid, 0)
  }, [filteredClients])

  const handleUpdateClient = (clientName, updates) => {
    updateClientBalance(clientName, updates)
  }

  if (!isLoaded) {
    return (
      <div className="flex-1 p-6" style={{ fontFamily: "'Sora', sans-serif" }}>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Client Balance Collections
        </h1>
        <div
          className="rounded-xl p-8 text-center mt-8"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {fetchError ? (
            <>
              <p className="text-sm mb-3" style={{ color: 'var(--red)' }}>{fetchError}</p>
              <button
                onClick={() => {
                  setFetchError(null)
                  fetchingRef.current = true
                  fetchFromSheet(accessToken)
                    .catch(err => setFetchError(err.message || 'Failed to load billing data'))
                    .finally(() => { fetchingRef.current = false })
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </>
          ) : (
            <>
              <Loader size={32} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 12px' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading billing data from Google Sheets...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6" style={{ fontFamily: "'Sora', sans-serif" }}>
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
        Client Balance Collections
      </h1>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ maxWidth: '500px' }}>
        <div
          className="rounded-xl p-5 flex items-start gap-4"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#C47B1A18' }}
          >
            <Users size={20} color="#C47B1A" />
          </div>
          <div>
            <div
              className="text-2xl font-semibold"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}
            >
              {filteredClients.length}
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              Clients with Balance
            </div>
          </div>
        </div>
        <div
          className="rounded-xl p-5 flex items-start gap-4"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#C9404018' }}
          >
            <DollarSign size={20} color="#C94040" />
          </div>
          <div>
            <div
              className="text-2xl font-semibold"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}
            >
              {formatDollar(Math.round(totalUnpaid))}
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              Total Client Unpaid
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div
        className="rounded-xl p-4 flex flex-wrap items-center gap-3"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.05em' }}>
          Filters
        </span>

        <select
          value={filterClinician}
          onChange={e => setFilterClinician(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Clinicians</option>
          {clinicians.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Statuses</option>
          {RESOLUTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex-1" />

        <button
          onClick={() => setSortOrder(prev => prev === 'highest' ? 'lowest' : 'highest')}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{
            color: 'var(--text)',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          <ArrowUpDown size={12} />
          {sortOrder === 'highest' ? 'Highest First' : 'Lowest First'}
        </button>

        {hasActiveFilter && (
          <button
            onClick={() => { setFilterClinician(''); setFilterStatus('') }}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{
              color: 'var(--accent)',
              backgroundColor: 'var(--accent-light)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <XIcon size={12} />
            Clear Filters
          </button>
        )}
      </div>

      {/* Client Cards */}
      {sortedClients.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {hasActiveFilter ? 'No clients match the current filters.' : 'No clients with unpaid balances found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedClients.map(client => {
            const overrides = clientBalanceOverrides[client.clientName] || {}
            const attemptCount = overrides.outreachAttempts?.length || 0
            return (
              <div
                key={client.clientName}
                onClick={() => setSelectedClient(client)}
                className="rounded-xl p-5 space-y-3"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'box-shadow 150ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                      {client.clientName}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {client.clinician || '—'}
                    </div>
                  </div>
                  <StatusBadge status={client.resolutionStatus} />
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                  <div>
                    <span>Claims: </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
                      {client.claimCount}
                    </span>
                  </div>
                  <div>
                    <span>Last DOS: </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
                      {formatDate(client.mostRecentDOS)}
                    </span>
                  </div>
                </div>

                {/* Amount + outreach count */}
                <div className="flex items-center justify-between">
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {attemptCount > 0 ? `${attemptCount} outreach attempt${attemptCount !== 1 ? 's' : ''}` : 'No outreach yet'}
                  </div>
                  <div
                    className="text-base font-semibold"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}
                  >
                    {formatDollar(Math.round(client.totalUnpaid))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer count */}
      <div
        className="text-xs"
        style={{
          color: 'var(--muted)',
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
        {hasActiveFilter ? ` (filtered from ${clientsWithOverrides.length})` : ''}
      </div>

      {selectedClient && (
        <ClientBalanceDrawer
          client={selectedClient}
          overrides={clientBalanceOverrides[selectedClient.clientName] || {}}
          onUpdate={(updates) => handleUpdateClient(selectedClient.clientName, updates)}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  )
}
