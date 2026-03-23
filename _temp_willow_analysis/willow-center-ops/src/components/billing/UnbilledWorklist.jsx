import { useState, useEffect, useRef, useMemo } from 'react'
import { DollarSign, FileText, ArrowUpDown, Loader, RefreshCw, X } from 'lucide-react'
import { useBillingData } from '../../hooks/useBillingData'
import { useAuth } from '../../contexts/auth'
import ClaimDrawer from './ClaimDrawer'

const STATUS_STYLES = {
  'Unbilled': { bg: '#FEF4E7', color: '#854F0B' },
  'Submitted — Awaiting Response': { bg: '#EAF2FB', color: '#185FA5' },
  'Resubmitting': { bg: '#EAF2FB', color: '#185FA5' },
  'Blocked — No Appointment in SP': { bg: '#FCEAEA', color: '#A32D2D' },
  'Written Off': { bg: '#F3F4F6', color: '#6B7280' },
  'Resolved / Paid': { bg: '#EAF3DE', color: '#3B6D11' },
}

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

export default function UnbilledWorklist() {
  const { accessToken } = useAuth()
  const { unbilledClaims, isLoaded, fetchFromSheet } = useBillingData()
  const [sortOrder, setSortOrder] = useState('oldest')
  const [filterClinician, setFilterClinician] = useState('')
  const [filterPayer, setFilterPayer] = useState('')
  const [selectedClaim, setSelectedClaim] = useState(null)
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

  const hasActiveFilter = filterClinician !== '' || filterPayer !== ''

  const clinicians = useMemo(() => {
    return [...new Set(unbilledClaims.map(c => c.clinician).filter(Boolean))].sort()
  }, [unbilledClaims])

  const payers = useMemo(() => {
    return [...new Set(unbilledClaims.map(c => c.payer).filter(Boolean))].sort()
  }, [unbilledClaims])

  const filteredClaims = useMemo(() => {
    let result = unbilledClaims
    if (filterClinician) result = result.filter(c => c.clinician === filterClinician)
    if (filterPayer) result = result.filter(c => c.payer === filterPayer)
    return result
  }, [unbilledClaims, filterClinician, filterPayer])

  const sortedClaims = useMemo(() => {
    const sorted = [...filteredClaims]
    sorted.sort((a, b) => {
      const da = a.dateOfService ? new Date(a.dateOfService).getTime() : 0
      const db = b.dateOfService ? new Date(b.dateOfService).getTime() : 0
      return sortOrder === 'oldest' ? da - db : db - da
    })
    return sorted
  }, [filteredClaims, sortOrder])

  const totalAmount = useMemo(() => {
    return filteredClaims.reduce((sum, c) => sum + (c.amountOwed || 0), 0)
  }, [filteredClaims])

  if (!isLoaded) {
    return (
      <div className="flex-1 p-6" style={{ fontFamily: "'Sora', sans-serif" }}>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Unbilled Claims Worklist
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
        Unbilled Claims Worklist
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
            <FileText size={20} color="#C47B1A" />
          </div>
          <div>
            <div
              className="text-2xl font-semibold"
              style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}
            >
              {filteredClaims.length}
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              Unbilled Claims
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
              {formatDollar(Math.round(totalAmount))}
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              Total Amount Owed
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
          value={filterPayer}
          onChange={e => setFilterPayer(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Payers</option>
          {payers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <div className="flex-1" />

        <button
          onClick={() => setSortOrder(prev => prev === 'oldest' ? 'newest' : 'oldest')}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{
            color: 'var(--text)',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          <ArrowUpDown size={12} />
          {sortOrder === 'oldest' ? 'Oldest First' : 'Newest First'}
        </button>

        {hasActiveFilter && (
          <button
            onClick={() => { setFilterClinician(''); setFilterPayer('') }}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{
              color: 'var(--accent)',
              backgroundColor: 'var(--accent-light)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={12} />
            Clear Filters
          </button>
        )}
      </div>

      {/* Claim Cards */}
      {sortedClaims.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {hasActiveFilter ? 'No claims match the current filters.' : 'No unbilled claims found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedClaims.map(claim => (
            <div
              key={claim.id}
              onClick={() => setSelectedClaim(claim)}
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
              {/* Header: client name + status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    {claim.client || '—'}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {claim.clinician || '—'}
                  </div>
                </div>
                <StatusBadge status={claim.status} />
              </div>

              {/* Details row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                <div>
                  <span>DOS: </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
                    {formatDate(claim.dateOfService)}
                  </span>
                </div>
                <div>
                  <span>Code: </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
                    {claim.billingCode || '—'}
                  </span>
                </div>
              </div>

              {/* Payer + Amount */}
              <div className="flex items-center justify-between">
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  {claim.payer || '—'}
                </div>
                <div
                  className="text-base font-semibold"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}
                >
                  {formatDollar(claim.amountOwed)}
                </div>
              </div>
            </div>
          ))}
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
        {filteredClaims.length} claim{filteredClaims.length !== 1 ? 's' : ''}
        {hasActiveFilter ? ` (filtered from ${unbilledClaims.length})` : ''}
      </div>

      {selectedClaim && (
        <ClaimDrawer
          claim={unbilledClaims.find(c => c.id === selectedClaim.id) || selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </div>
  )
}
