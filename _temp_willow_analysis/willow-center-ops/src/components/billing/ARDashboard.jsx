import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { DollarSign, ShieldAlert, UserX, FileX, Loader, RefreshCw, X } from 'lucide-react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useBillingData } from '../../hooks/useBillingData'
import { useAuth } from '../../contexts/auth'
import { calcKPIs, calcARAgingBuckets, filterClaims } from '../../services/billing'

function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)

  const animate = useCallback(() => {
    if (ref.current) cancelAnimationFrame(ref.current)
    if (target === 0) {
      ref.current = requestAnimationFrame(() => setValue(0))
      return
    }
    const start = performance.now()
    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
  }, [target, duration])

  useEffect(() => {
    animate()
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [animate])

  return value
}

function KPICard({ iconEl, label, value, format, color }) {
  const numericTarget = typeof value === 'number' ? value : 0
  const animated = useCountUp(numericTarget)

  const display = format === 'dollar'
    ? '$' + animated.toLocaleString()
    : animated.toLocaleString()

  return (
    <div
      className="rounded-xl p-5 flex items-start gap-4"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + '18' }}
      >
        {iconEl}
      </div>
      <div>
        <div
          className="text-2xl font-semibold"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}
        >
          {display}
        </div>
        <div className="text-sm mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Sora', sans-serif" }}>
          {label}
        </div>
      </div>
    </div>
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

function StatusBadge({ status }) {
  const styles = {
    'UNPAID': { bg: '#FCEAEA', color: '#A32D2D' },
    'UNBILLED': { bg: '#FEF4E7', color: '#854F0B' },
    'PAID': { bg: '#EAF3DE', color: '#3B6D11' },
    'PARTIALLY PAID': { bg: '#EAF2FB', color: '#185FA5' },
  }
  const s = styles[status?.toUpperCase()] || { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status || '—'}
    </span>
  )
}

const CHART_COLORS = {
  '0-30': '#161D2E',
  '31-60': '#2A7A65',
  '61-90': '#3D9B82',
  '91-120': '#C47B1A',
  '120+': '#C94040',
}

function ChartTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg p-3 shadow-lg text-xs"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="font-semibold mb-1" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
        {label} days
      </div>
      {payload.map(entry => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span style={{ color: 'var(--muted)' }}>{entry.name}:</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
            {formatDollar(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

const selectStyle = {
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '0.8125rem',
  fontFamily: "'Sora', sans-serif",
  minWidth: '120px',
  maxWidth: '200px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  outline: 'none',
}

const dateInputStyle = {
  ...selectStyle,
  minWidth: '120px',
  maxWidth: '160px',
  fontFamily: "'IBM Plex Mono', monospace",
}

const emptyFilters = {
  clinician: '',
  primaryInsurance: '',
  clientPaymentStatus: '',
  insurancePaymentStatus: '',
  dateFrom: '',
  dateTo: '',
}

export default function ARDashboard() {
  const { accessToken } = useAuth()
  const { unpaidClaims, isLoaded, fetchFromSheet } = useBillingData()
  const [filters, setFilters] = useState(emptyFilters)
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

  const hasActiveFilter = Object.values(filters).some(v => v !== '')

  // Unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    if (!unpaidClaims.length) return { clinicians: [], insurances: [], clientStatuses: [], insuranceStatuses: [] }
    const clinicians = [...new Set(unpaidClaims.map(c => c.clinician).filter(Boolean))].sort()
    const insurances = [...new Set(unpaidClaims.map(c => c.primaryInsurance).filter(Boolean))].sort()
    const clientStatuses = [...new Set(unpaidClaims.map(c => c.clientPaymentStatus).filter(Boolean))].sort()
    const insuranceStatuses = [...new Set(unpaidClaims.map(c => c.insurancePaymentStatus).filter(Boolean))].sort()
    return { clinicians, insurances, clientStatuses, insuranceStatuses }
  }, [unpaidClaims])

  // Filtered claims
  const filteredClaims = useMemo(() => {
    if (!hasActiveFilter) return unpaidClaims
    return filterClaims(unpaidClaims, filters)
  }, [unpaidClaims, filters, hasActiveFilter])

  // KPIs from filtered claims
  const kpis = useMemo(() => {
    if (!isLoaded || !filteredClaims.length) {
      return { totalUnpaid: 0, insuranceUnpaidCount: 0, clientUnpaidCount: 0, unbilledCount: 0 }
    }
    return calcKPIs(filteredClaims)
  }, [filteredClaims, isLoaded])

  // Aging buckets from filtered claims
  const agingData = useMemo(() => {
    if (!filteredClaims.length) return []
    const buckets = calcARAgingBuckets(filteredClaims)
    return buckets.map(b => ({
      name: b.bucket,
      amount: Math.round(b.total),
      count: b.count,
    }))
  }, [filteredClaims])

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  if (!isLoaded) {
    return (
      <div className="flex-1 p-6" style={{ fontFamily: "'Sora', sans-serif" }}>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Revenue Cycle — AR Dashboard
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

  const columns = [
    { key: 'dateOfService', label: 'Date of Service', render: (c) => formatDate(c.dateOfService), mono: true },
    { key: 'client', label: 'Client', truncate: true, maxW: 160 },
    { key: 'clinician', label: 'Clinician', truncate: true, maxW: 140 },
    { key: 'billingCode', label: 'Code', mono: true },
    { key: 'primaryInsurance', label: 'Primary Insurance', truncate: true, maxW: 160 },
    { key: 'totalFee', label: 'Total Fee', render: (c) => formatDollar(c.totalFee), mono: true, align: 'right' },
    { key: 'totalUnpaid', label: 'Total Unpaid', render: (c) => formatDollar(c.totalUnpaid), mono: true, align: 'right' },
    { key: 'clientPaymentStatus', label: 'Client Status', render: (c) => <StatusBadge status={c.clientPaymentStatus} /> },
    { key: 'insurancePaymentStatus', label: 'Insurance Status', render: (c) => <StatusBadge status={c.insurancePaymentStatus} /> },
  ]

  return (
    <div className="flex-1 p-6 space-y-6" style={{ fontFamily: "'Sora', sans-serif", overflow: 'hidden', minWidth: 0 }}>
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
        Revenue Cycle — AR Dashboard
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          iconEl={<DollarSign size={20} color="#C94040" />}
          label="Total Unpaid"
          value={Math.round(kpis.totalUnpaid)}
          format="dollar"
          color="#C94040"
        />
        <KPICard
          iconEl={<ShieldAlert size={20} color="#2065B8" />}
          label="Insurance Unpaid"
          value={kpis.insuranceUnpaidCount}
          color="#2065B8"
        />
        <KPICard
          iconEl={<UserX size={20} color="#C47B1A" />}
          label="Client Unpaid"
          value={kpis.clientUnpaidCount}
          color="#C47B1A"
        />
        <KPICard
          iconEl={<FileX size={20} color="#2A7A65" />}
          label="Unbilled to Insurance"
          value={kpis.unbilledCount}
          color="#2A7A65"
        />
      </div>

      {/* AR Aging Chart */}
      {agingData.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', minWidth: 0 }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
            AR Aging by Days Outstanding
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={agingData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                label={{ value: 'Days', position: 'insideBottomRight', offset: -5, fontSize: 11, fill: '#6B7280' }}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend
                formatter={(val) => <span style={{ fontSize: 12, fontFamily: "'Sora', sans-serif", color: '#6B7280' }}>{val}</span>}
              />
              <Bar
                dataKey="amount"
                name="Unpaid Amount"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              >
                {agingData.map((entry) => (
                  <Cell key={entry.name} fill={CHART_COLORS[entry.name] || '#161D2E'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter Bar */}
      <div
        className="rounded-xl p-4 flex flex-wrap items-center gap-3"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.05em' }}>
          Filters
        </span>

        <select
          value={filters.clinician}
          onChange={e => updateFilter('clinician', e.target.value)}
          style={selectStyle}
        >
          <option value="">All Clinicians</option>
          {filterOptions.clinicians.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={filters.primaryInsurance}
          onChange={e => updateFilter('primaryInsurance', e.target.value)}
          style={selectStyle}
        >
          <option value="">All Payers</option>
          {filterOptions.insurances.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={filters.clientPaymentStatus}
          onChange={e => updateFilter('clientPaymentStatus', e.target.value)}
          style={selectStyle}
        >
          <option value="">Client Status</option>
          {filterOptions.clientStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filters.insurancePaymentStatus}
          onChange={e => updateFilter('insurancePaymentStatus', e.target.value)}
          style={selectStyle}
        >
          <option value="">Insurance Status</option>
          {filterOptions.insuranceStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>From</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => updateFilter('dateFrom', e.target.value)}
            style={dateInputStyle}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>To</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => updateFilter('dateTo', e.target.value)}
            style={dateInputStyle}
          />
        </div>

        {hasActiveFilter && (
          <button
            onClick={() => setFilters(emptyFilters)}
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

      {/* Claims Data Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', minWidth: 0 }}
      >
        <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8F7F4', position: 'sticky', top: 0, zIndex: 1 }}>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-xs font-semibold whitespace-nowrap"
                    style={{
                      color: 'var(--muted)',
                      textAlign: col.align || 'left',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim, i) => (
                <tr
                  key={claim.id}
                  style={{
                    backgroundColor: i % 2 === 0 ? 'var(--surface)' : '#FAFAF8',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {columns.map(col => {
                    const cellValue = col.render ? col.render(claim) : (claim[col.key] || '—')
                    const rawText = typeof cellValue === 'string' ? cellValue : claim[col.key] || ''
                    return (
                      <td
                        key={col.key}
                        className="px-4 py-3"
                        style={{
                          color: 'var(--text)',
                          textAlign: col.align || 'left',
                          fontFamily: col.mono ? "'IBM Plex Mono', monospace" : "'Sora', sans-serif",
                          fontSize: '0.8125rem',
                          maxWidth: col.truncate ? col.maxW : undefined,
                          overflow: col.truncate ? 'hidden' : undefined,
                          textOverflow: col.truncate ? 'ellipsis' : undefined,
                          whiteSpace: 'nowrap',
                        }}
                        title={col.truncate ? rawText : undefined}
                      >
                        {cellValue}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {filteredClaims.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: 'var(--muted)' }}
                  >
                    {hasActiveFilter ? 'No claims match the current filters.' : 'No unpaid claims found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div
          className="px-4 py-2 text-xs"
          style={{
            color: 'var(--muted)',
            borderTop: '1px solid var(--border)',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {filteredClaims.length} claim{filteredClaims.length !== 1 ? 's' : ''}
          {hasActiveFilter ? ` (filtered from ${unpaidClaims.length})` : ''}
        </div>
      </div>
    </div>
  )
}
