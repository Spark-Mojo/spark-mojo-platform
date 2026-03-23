import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { DollarSign, ShieldAlert, UserX, FileX, Loader, RefreshCw, CheckCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useBillingData } from '../../hooks/useBillingData'
import { useAuth } from '../../contexts/auth'
import { calcKPIs, calcARAgingBuckets } from '../../services/billing'
import ChartExpandModal from './ChartExpandModal'

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

function formatDollar(n) {
  if (typeof n !== 'number' || isNaN(n)) return '$0'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const AGING_COLORS = {
  '0-30': '#161D2E',
  '31-60': '#2A7A65',
  '61-90': '#3D9B82',
  '91-120': '#C47B1A',
  '120+': '#C94040',
}

const PAYER_COLORS = ['#161D2E', '#2A7A65', '#3D9B82', '#5BBAA3', '#C47B1A', '#EF9F27', '#2065B8', '#C94040', '#8B5CF6', '#6B7280']

const CODE_COLORS = ['#161D2E', '#2A7A65', '#3D9B82', '#C47B1A', '#2065B8', '#C94040', '#EF9F27', '#8B5CF6']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg p-3 shadow-lg text-xs"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="font-semibold mb-1" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
        {label}
      </div>
      {payload.map(entry => (
        <div key={entry.name || entry.dataKey} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color || entry.fill }} />
          <span style={{ color: 'var(--muted)' }}>{entry.name}:</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
            {formatDollar(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div
      className="rounded-lg p-3 shadow-lg text-xs"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.payload?.fill }} />
        <span className="font-semibold" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
          {entry.name}
        </span>
      </div>
      <div className="mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
        {formatDollar(entry.value)} ({entry.payload?.pct}%)
      </div>
    </div>
  )
}

function CollectionsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg p-3 shadow-lg text-xs"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="font-semibold mb-1" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
        {label}
      </div>
      {payload.map(entry => (
        <div key={entry.name || entry.dataKey} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span style={{ color: 'var(--muted)' }}>{entry.name}:</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
            {entry.name === 'Collection Rate' ? `${entry.value}%` : formatDollar(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function ChartCard({ title, children }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <div
        className="rounded-xl p-5 cursor-pointer transition-shadow hover:shadow-lg"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={() => setExpanded(true)}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
          {title}
        </h2>
        {children}
      </div>
      {expanded && (
        <ChartExpandModal title={title} onClose={() => setExpanded(false)}>
          {children}
        </ChartExpandModal>
      )}
    </>
  )
}

export default function BillingReports() {
  const { accessToken } = useAuth()
  const { unpaidClaims, unbilledClaims, isLoaded, fetchFromSheet } = useBillingData()
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

  // KPIs
  const kpis = useMemo(() => {
    if (!isLoaded || !unpaidClaims.length) {
      return { totalUnpaid: 0, insuranceUnpaidCount: 0, clientUnpaidCount: 0, unbilledCount: 0 }
    }
    return calcKPIs(unpaidClaims)
  }, [unpaidClaims, isLoaded])

  const unbilledTotal = useMemo(() => {
    return unbilledClaims.reduce((sum, c) => sum + (c.amountOwed || 0), 0)
  }, [unbilledClaims])

  const collectedTotal = useMemo(() => {
    return unpaidClaims
      .filter(c => c.insurancePaymentStatus?.toUpperCase() === 'PAID')
      .reduce((sum, c) => sum + (c.billedAmount || 0), 0)
  }, [unpaidClaims])

  const insuranceSplit = useMemo(() => {
    let insTotal = 0
    let clientTotal = 0
    for (const c of unpaidClaims) {
      if (c.insurancePaymentStatus?.toUpperCase() === 'UNPAID') {
        insTotal += c.totalUnpaid || 0
      }
      if (c.clientPaymentStatus?.toUpperCase() === 'UNPAID') {
        clientTotal += c.clientUnpaid || 0
      }
    }
    return { insTotal, clientTotal }
  }, [unpaidClaims])

  // Aging data
  const agingData = useMemo(() => {
    if (!unpaidClaims.length) return []
    const buckets = calcARAgingBuckets(unpaidClaims)
    return buckets.map(b => ({
      name: b.bucket,
      amount: Math.round(b.total),
      count: b.count,
    }))
  }, [unpaidClaims])

  // Collections rate by payer
  const payerCollections = useMemo(() => {
    if (!unpaidClaims.length) return []
    const byPayer = {}
    for (const c of unpaidClaims) {
      const payer = c.primaryInsurance || 'Unknown'
      if (!byPayer[payer]) byPayer[payer] = { charged: 0, paid: 0 }
      byPayer[payer].charged += c.insuranceCharge || 0
      byPayer[payer].paid += c.insurancePaid || 0
    }
    return Object.entries(byPayer)
      .filter(([, v]) => v.charged > 0)
      .map(([payer, v]) => ({
        name: payer,
        rate: Math.round((v.paid / v.charged) * 100),
        charged: Math.round(v.charged),
        paid: Math.round(v.paid),
      }))
      .sort((a, b) => b.charged - a.charged)
      .slice(0, 10)
  }, [unpaidClaims])

  // Revenue by clinician
  const clinicianRevenue = useMemo(() => {
    if (!unpaidClaims.length) return []
    const byClinician = {}
    for (const c of unpaidClaims) {
      const name = c.clinician || 'Unknown'
      byClinician[name] = (byClinician[name] || 0) + (c.totalFee || 0)
    }
    return Object.entries(byClinician)
      .map(([name, total]) => ({ name, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
  }, [unpaidClaims])

  // Billing code distribution
  const codeDistribution = useMemo(() => {
    if (!unpaidClaims.length) return []
    const byCode = {}
    for (const c of unpaidClaims) {
      const code = c.billingCode || 'Unknown'
      byCode[code] = (byCode[code] || 0) + (c.totalFee || 0)
    }
    const total = Object.values(byCode).reduce((s, v) => s + v, 0)
    return Object.entries(byCode)
      .map(([code, amount]) => ({
        name: code,
        value: Math.round(amount),
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [unpaidClaims])

  if (!isLoaded) {
    return (
      <div className="flex-1 p-6" style={{ fontFamily: "'Sora', sans-serif" }}>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Billing Reports
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
        Billing Reports
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          iconEl={<DollarSign size={20} color="#C94040" />}
          label="Total Outstanding"
          value={Math.round(kpis.totalUnpaid)}
          format="dollar"
          color="#C94040"
        />
        <KPICard
          iconEl={<CheckCircle size={20} color="#2A7A65" />}
          label="Collected"
          value={Math.round(collectedTotal)}
          format="dollar"
          color="#2A7A65"
        />
        <KPICard
          iconEl={<ShieldAlert size={20} color="#2065B8" />}
          label="Insurance Unpaid"
          value={Math.round(insuranceSplit.insTotal)}
          format="dollar"
          color="#2065B8"
        />
        <KPICard
          iconEl={<UserX size={20} color="#C47B1A" />}
          label="Client Unpaid"
          value={Math.round(insuranceSplit.clientTotal)}
          format="dollar"
          color="#C47B1A"
        />
        <KPICard
          iconEl={<FileX size={20} color="#6B7280" />}
          label="Unbilled Total"
          value={Math.round(unbilledTotal)}
          format="dollar"
          color="#6B7280"
        />
      </div>

      {/* Charts row 1: Aging + Collections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AR Aging Chart */}
        <ChartCard title="AR Aging by Days Outstanding">
          {agingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={agingData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name="Unpaid Amount" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {agingData.map(entry => (
                    <Cell key={entry.name} fill={AGING_COLORS[entry.name] || '#161D2E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No aging data available.</p>
          )}
        </ChartCard>

        {/* Collections Rate by Payer */}
        <ChartCard title="Collections Rate by Payer">
          {payerCollections.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={payerCollections} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickFormatter={v => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <Tooltip content={<CollectionsTooltip />} />
                <Bar dataKey="rate" name="Collection Rate" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {payerCollections.map((entry, i) => (
                    <Cell key={entry.name} fill={PAYER_COLORS[i % PAYER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No payer data available.</p>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2: Revenue by Clinician + Billing Code Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Clinician */}
        <ChartCard title="Revenue by Clinician (Total Billed)">
          {clinicianRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={clinicianRevenue} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" name="Total Billed" fill="#2A7A65" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No clinician data available.</p>
          )}
        </ChartCard>

        {/* Billing Code Distribution */}
        <ChartCard title="Billing Code Distribution">
          {codeDistribution.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={280}>
                <PieChart>
                  <Pie
                    data={codeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {codeDistribution.map((entry, i) => (
                      <Cell key={entry.name} fill={CODE_COLORS[i % CODE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {codeDistribution.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: CODE_COLORS[i % CODE_COLORS.length] }}
                    />
                    <span style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
                      {entry.name}
                    </span>
                    <span className="ml-auto" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>
                      {entry.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No billing code data available.</p>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
