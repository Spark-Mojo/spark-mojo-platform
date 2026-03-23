import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from 'recharts'
import { getCompletedClients, getArchivedClients } from '../../services/sheets'
import { useBillingData } from '../../hooks/useBillingData'
import ChartExpandModal from './ChartExpandModal'

function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  const animate = useCallback(() => {
    if (ref.current) cancelAnimationFrame(ref.current)
    if (target === 0) { ref.current = requestAnimationFrame(() => setValue(0)); return }
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
  useEffect(() => { animate(); return () => { if (ref.current) cancelAnimationFrame(ref.current) } }, [animate])
  return value
}

function KPICard({ label, value }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0)
  return (
    <div className="rounded-xl p-5 flex flex-col" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-2xl font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
        {animated.toLocaleString()}
      </div>
      <div className="text-sm mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Sora', sans-serif" }}>{label}</div>
    </div>
  )
}

function formatDollar(n) {
  if (typeof n !== 'number' || isNaN(n)) return '$0'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const PALETTE = ['#161D2E', '#2A7A65', '#3D9B82', '#C47B1A', '#2065B8', '#C94040', '#EF9F27', '#5BBAA3', '#8B5CF6', '#6B7280']

function TimeWindowToggle({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-0.5 rounded-md p-0.5" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
          style={{
            backgroundColor: value === opt.value ? 'var(--accent)' : 'transparent',
            color: value === opt.value ? '#fff' : 'var(--muted)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function ChartCard({ title, children, controls, expandContent }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <div
        className="rounded-xl p-5 cursor-pointer transition-shadow hover:shadow-lg"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center justify-between mb-4" onClick={e => e.stopPropagation()}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>{title}</h2>
          {controls}
        </div>
        {children}
      </div>
      {expanded && (
        <ChartExpandModal title={title} controls={controls} onClose={() => setExpanded(false)}>
          {expandContent || children}
        </ChartExpandModal>
      )}
    </>
  )
}

function getMonthCutoff(months) {
  if (!months) return null
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function filterMonthlyData(data, months) {
  if (!months) return data
  const cutoff = getMonthCutoff(months)
  return data.filter(d => d._key >= cutoff)
}

function filterClientsByMonths(clients, months, dateField = 'dateAdded') {
  if (!months) return clients
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  return clients.filter(c => {
    const d = new Date(c[dateField])
    return !isNaN(d.getTime()) && d >= cutoff
  })
}

function GenericTooltip({ active, payload, label, isDollar }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 shadow-lg text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="font-semibold mb-1" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.dataKey || entry.name} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color || entry.stroke }} />
          <span style={{ color: 'var(--muted)' }}>{entry.name}:</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
            {isDollar ? formatDollar(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function PercentTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 shadow-lg text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="font-semibold mb-1" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.dataKey || entry.name} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color || entry.stroke }} />
          <span style={{ color: 'var(--muted)' }}>{entry.name}:</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
            {entry.value}%
          </span>
        </div>
      ))}
    </div>
  )
}

function DollarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 shadow-lg text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="font-semibold mb-1" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.dataKey || entry.name} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color || entry.stroke }} />
          <span style={{ color: 'var(--muted)' }}>{entry.name}:</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
            {formatDollar(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function parseMonthKey(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = d.getMonth()
  if (y < 2020 || y > 2030) return null
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [y, m] = key.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

function daysBetweenDates(d1, d2) {
  return Math.abs(Math.round((d2 - d1) / 86400000))
}

export default function OnboardingReports({ accessToken, clients }) {
  const [completed, setCompleted] = useState([])
  const [cancelled, setCancelled] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)
  const { unpaidClaims, unbilledClaims, isLoaded: billingLoaded } = useBillingData()

  // Time window states (local per chart)
  const [volumeWindow, setVolumeWindow] = useState(12)
  const [cancelRateWindow, setCancelRateWindow] = useState(12)
  const [cancelKpiWindow, setCancelKpiWindow] = useState(1)
  const [payerWindow, setPayerWindow] = useState(12)
  const [clinicianWindow, setClinicianWindow] = useState(12)
  const [completionWindow, setCompletionWindow] = useState(12)
  const [outreachWindow, setOutreachWindow] = useState(12)
  const [reasonWindow, setReasonWindow] = useState(12)

  useEffect(() => {
    if (!accessToken || fetchedRef.current) return
    fetchedRef.current = true
    async function load() {
      const years = [2022, 2023, 2024, 2025, 2026]
      const completedResults = []
      const cancelledResults = []
      for (const year of years) {
        const [comp, canc] = await Promise.all([
          getCompletedClients(accessToken, year),
          getArchivedClients(accessToken, year),
        ])
        completedResults.push(...comp)
        cancelledResults.push(...canc)
      }
      setCompleted(completedResults)
      setCancelled(cancelledResults)
      setLoading(false)
    }
    load()
  }, [accessToken])

  // Active queue count
  const activeCount = clients?.length || 0

  // Monthly volume data
  const volumeData = useMemo(() => {
    const months = {}
    for (const c of completed) {
      const key = parseMonthKey(c.dateAdded)
      if (key) months[key] = (months[key] || 0) + 1
    }
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({ name: monthLabel(key), count, _key: key }))
  }, [completed])

  // Cancellation rate by month
  const cancellationData = useMemo(() => {
    const compByMonth = {}
    const cancByMonth = {}
    for (const c of completed) {
      const key = parseMonthKey(c.dateAdded)
      if (key) compByMonth[key] = (compByMonth[key] || 0) + 1
    }
    for (const c of cancelled) {
      const key = parseMonthKey(c.dateAdded)
      if (key) cancByMonth[key] = (cancByMonth[key] || 0) + 1
    }
    const allMonths = new Set([...Object.keys(compByMonth), ...Object.keys(cancByMonth)])
    return [...allMonths]
      .sort()
      .map(key => {
        const comp = compByMonth[key] || 0
        const canc = cancByMonth[key] || 0
        const total = comp + canc
        return { name: monthLabel(key), rate: total > 0 ? Math.round((canc / total) * 100) : 0, _key: key }
      })
  }, [completed, cancelled])

  // Payer mix over time (by year) — top 8 payers by volume, rest as "Other"
  const payerMixData = useMemo(() => {
    const byYear = {}
    const payerTotals = {}
    for (const c of [...completed, ...cancelled]) {
      const d = new Date(c.dateAdded)
      if (isNaN(d.getTime())) continue
      const year = d.getFullYear()
      if (year < 2020 || year > 2030) continue
      const raw = (c.primaryInsurance || '').trim()
      const payer = raw || 'Unknown'
      payerTotals[payer] = (payerTotals[payer] || 0) + 1
      if (!byYear[year]) byYear[year] = {}
      byYear[year][payer] = (byYear[year][payer] || 0) + 1
    }
    // Top 8 payers by total volume
    const sorted = Object.entries(payerTotals).sort((a, b) => b[1] - a[1])
    const topPayers = sorted.slice(0, 8).map(([name]) => name)
    const otherPayers = new Set(sorted.slice(8).map(([name]) => name))
    const hasOther = otherPayers.size > 0
    const payers = hasOther ? [...topPayers, 'Other'] : topPayers
    return {
      data: Object.keys(byYear).sort().map(year => {
        const row = { name: year }
        for (const p of topPayers) row[p] = byYear[year][p] || 0
        if (hasOther) {
          row['Other'] = 0
          for (const op of otherPayers) row['Other'] += byYear[year][op] || 0
        }
        return row
      }),
      payers,
    }
  }, [completed, cancelled])

  // Clinician caseload growth
  const clinicianGrowth = useMemo(() => {
    const byClinMonth = {}
    const allClinicians = new Set()
    for (const c of completed) {
      const key = parseMonthKey(c.dateAdded)
      const clin = c.clinician
      if (!key || !clin) continue
      allClinicians.add(clin)
      if (!byClinMonth[key]) byClinMonth[key] = {}
      byClinMonth[key][clin] = (byClinMonth[key][clin] || 0) + 1
    }
    const clinicians = [...allClinicians].sort()
    const months = Object.keys(byClinMonth).sort()
    return {
      data: months.map(key => {
        const row = { name: monthLabel(key), _key: key }
        for (const cl of clinicians) row[cl] = byClinMonth[key]?.[cl] || 0
        return row
      }),
      clinicians,
    }
  }, [completed])

  // Time to completion histogram (re-aggregates on window change)
  const completionHistogram = useMemo(() => {
    const filtered = filterClientsByMonths(completed, completionWindow)
    const bins = {}
    for (const c of filtered) {
      if (!c.dateAdded || !c.verified) continue
      const added = new Date(c.dateAdded)
      // verified might be TRUE/FALSE; skip if it's just a bool
      // Try to use firstAppt as proxy for completion date if verified is a bool
      let endDate = null
      if (c.firstAppt) {
        endDate = new Date(c.firstAppt)
      }
      if (!endDate || isNaN(endDate.getTime())) continue
      if (isNaN(added.getTime())) continue
      const days = daysBetweenDates(added, endDate)
      if (days > 365) continue // ignore outliers
      const weekBin = Math.floor(days / 7)
      const label = weekBin === 0 ? '0-6 days' : `${weekBin * 7}-${weekBin * 7 + 6} days`
      bins[weekBin] = { label, count: (bins[weekBin]?.count || 0) + 1, weekBin }
    }
    return Object.values(bins).sort((a, b) => a.weekBin - b.weekBin).slice(0, 12)
  }, [completed, completionWindow])

  // Outreach attempts comparison: avg for completed vs cancelled (re-aggregates on window change)
  const outreachComparison = useMemo(() => {
    const fc = filterClientsByMonths(completed, outreachWindow)
    const fx = filterClientsByMonths(cancelled, outreachWindow)
    function avgAttempts(list) {
      if (!list.length) return 0
      const total = list.reduce((sum, c) => sum + (c.outreachAttempts?.length || 0), 0)
      return Math.round((total / list.length) * 10) / 10
    }
    return [
      { name: 'Completed', avg: avgAttempts(fc) },
      { name: 'Cancelled', avg: avgAttempts(fx) },
    ]
  }, [completed, cancelled, outreachWindow])

  // Cancellation reason analysis (re-aggregates on window change)
  const cancellationReasons = useMemo(() => {
    const filteredCancelled = filterClientsByMonths(cancelled, reasonWindow)
    const keywords = {
      'Insurance Issue': ['insurance', 'ins ', 'coverage', 'deductible', 'copay', 'oop'],
      'No Response': ['no response', 'no answer', 'unreachable', 'no contact', 'ghosted', 'nvm'],
      'Changed Provider': ['changed provider', 'different provider', 'another', 'switched', 'transfer'],
      'Scheduling Conflict': ['schedule', 'scheduling', 'availability', 'time', 'conflict'],
      'Financial': ['cost', 'afford', 'financial', 'money', 'payment', 'price', 'expensive'],
      'Moved': ['moved', 'relocat', 'moving'],
      'Personal Reasons': ['personal', 'family', 'health', 'decided'],
    }
    const counts = {}
    for (const c of filteredCancelled) {
      const text = ((c.notes || '') + ' ' + (c.archiveReason || '')).toLowerCase()
      if (!text.trim()) { counts['Unknown'] = (counts['Unknown'] || 0) + 1; continue }
      let matched = false
      for (const [reason, kws] of Object.entries(keywords)) {
        if (kws.some(kw => text.includes(kw))) {
          counts[reason] = (counts[reason] || 0) + 1
          matched = true
          break
        }
      }
      if (!matched) counts['Other'] = (counts['Other'] || 0) + 1
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [cancelled, reasonWindow])

  // Billing-dependent charts (only if billing data uploaded)
  const billedVsCollected = useMemo(() => {
    if (!billingLoaded || !unpaidClaims.length) return []
    const byMonth = {}
    for (const c of unpaidClaims) {
      if (!c.dateOfService) continue
      const key = parseMonthKey(c.dateOfService instanceof Date ? c.dateOfService.toISOString() : c.dateOfService)
      if (!key) continue
      if (!byMonth[key]) byMonth[key] = { billed: 0, collected: 0 }
      byMonth[key].billed += c.totalFee || 0
      byMonth[key].collected += c.insurancePaid || 0
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ name: monthLabel(key), billed: Math.round(v.billed), collected: Math.round(v.collected) }))
  }, [unpaidClaims, billingLoaded])

  const writeOffTrend = useMemo(() => {
    if (!billingLoaded || !unpaidClaims.length) return []
    const byMonth = {}
    for (const c of unpaidClaims) {
      if (!c.dateOfService) continue
      const key = parseMonthKey(c.dateOfService instanceof Date ? c.dateOfService.toISOString() : c.dateOfService)
      if (!key) continue
      if (!byMonth[key]) byMonth[key] = { total: 0, writeOff: 0 }
      byMonth[key].total += c.totalFee || 0
      byMonth[key].writeOff += c.writeOff || 0
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ name: monthLabel(key), rate: v.total > 0 ? Math.round((v.writeOff / v.total) * 100) : 0 }))
  }, [unpaidClaims, billingLoaded])

  const unbilledByClinician = useMemo(() => {
    if (!billingLoaded || !unbilledClaims.length) return []
    const byClin = {}
    for (const c of unbilledClaims) {
      const name = c.clinician || 'Unknown'
      byClin[name] = (byClin[name] || 0) + (c.amountOwed || 0)
    }
    return Object.entries(byClin)
      .map(([name, total]) => ({ name, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
  }, [unbilledClaims, billingLoaded])

  // Cancel rate KPI with time window
  const cancelKpiRate = useMemo(() => {
    const fc = filterClientsByMonths(completed, cancelKpiWindow)
    const fx = filterClientsByMonths(cancelled, cancelKpiWindow)
    const total = fc.length + fx.length
    return total > 0 ? Math.round((fx.length / total) * 100) : 0
  }, [completed, cancelled, cancelKpiWindow])

  const cancelKpiLabel = cancelKpiWindow === 1 ? 'This month' : cancelKpiWindow === 3 ? 'This quarter' : 'All time'

  if (loading) {
    return (
      <div className="flex-1 p-6" style={{ fontFamily: "'Sora', sans-serif" }}>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Onboarding Reports</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading historical data...</p>
      </div>
    )
  }

  const totalCompleted = completed.length
  const totalCancelled = cancelled.length

  return (
    <div className="flex-1 p-6 space-y-6" style={{ fontFamily: "'Sora', sans-serif" }}>
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Onboarding Reports</h1>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Active Queue" value={activeCount} />
        <KPICard label="Total Completed" value={totalCompleted} />
        <KPICard label="Total Cancelled" value={totalCancelled} />
        <div className="rounded-xl p-5 flex flex-col" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>
              {cancelKpiRate}%
            </div>
            <TimeWindowToggle
              options={[{ label: 'Month', value: 1 }, { label: 'Quarter', value: 3 }, { label: 'All', value: null }]}
              value={cancelKpiWindow}
              onChange={setCancelKpiWindow}
            />
          </div>
          <div className="text-sm mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Sora', sans-serif" }}>Cancel Rate</div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{cancelKpiLabel}</div>
        </div>
      </div>

      {/* Row 1: Volume + Cancellation Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="New Client Volume by Month" controls={
          <TimeWindowToggle
            options={[{ label: '3mo', value: 3 }, { label: '12mo', value: 12 }, { label: 'All', value: null }]}
            value={volumeWindow}
            onChange={setVolumeWindow}
          />
        }>
          {(() => { const d = filterMonthlyData(volumeData, volumeWindow); return d.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={Math.max(0, Math.floor(d.length / 12) - 1)} />
                <YAxis tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <Tooltip content={<GenericTooltip />} />
                <Bar dataKey="count" name="New Clients" fill="#2A7A65" radius={[3, 3, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No volume data available.</p>
          )})()}
        </ChartCard>

        <ChartCard title="Cancellation Rate by Month" controls={
          <TimeWindowToggle
            options={[{ label: '3mo', value: 3 }, { label: '12mo', value: 12 }, { label: 'All', value: null }]}
            value={cancelRateWindow}
            onChange={setCancelRateWindow}
          />
        }>
          {(() => { const d = filterMonthlyData(cancellationData, cancelRateWindow); return d.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={d} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={Math.max(0, Math.floor(d.length / 12) - 1)} />
                <YAxis tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<PercentTooltip />} />
                <Line type="monotone" dataKey="rate" name="Cancel Rate" stroke="#C94040" strokeWidth={2} dot={{ r: 3, fill: '#C94040' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No cancellation data available.</p>
          )})()}
        </ChartCard>
      </div>

      {/* Row 2: Payer Mix + Clinician Caseload Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Payer Mix Over Time" controls={
          <TimeWindowToggle
            options={[{ label: '12mo', value: 12 }, { label: 'All', value: null }]}
            value={payerWindow}
            onChange={setPayerWindow}
          />
        }>
          {(() => {
            const cutoff = payerWindow ? getMonthCutoff(payerWindow) : null
            const filteredPayer = cutoff ? {
              data: payerMixData.data.filter(d => String(d.name) >= cutoff.slice(0, 4)),
              payers: payerMixData.payers,
            } : payerMixData
            return filteredPayer.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={filteredPayer.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <Tooltip content={<GenericTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'Sora', sans-serif" }} />
                {filteredPayer.payers.map((payer, i) => (
                  <Area key={payer} type="monotone" dataKey={payer} stackId="1" stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.6} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No payer data available.</p>
          )})()}
        </ChartCard>

        <ChartCard title="Clinician Caseload Growth (Completed per Month)" controls={
          <TimeWindowToggle
            options={[{ label: '12mo', value: 12 }, { label: 'All', value: null }]}
            value={clinicianWindow}
            onChange={setClinicianWindow}
          />
        }>
          {(() => { const d = filterMonthlyData(clinicianGrowth.data, clinicianWindow); return d.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={d} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={Math.max(0, Math.floor(d.length / 12) - 1)} />
                <YAxis tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <Tooltip content={<GenericTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'Sora', sans-serif" }} />
                {clinicianGrowth.clinicians.slice(0, 8).map((clin, i) => (
                  <Line key={clin} type="monotone" dataKey={clin} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No clinician data available.</p>
          )})()}
        </ChartCard>
      </div>

      {/* Row 3: Time to Completion Histogram */}
      <ChartCard title="Time to Completion (Date Added to First Appointment)" controls={
        <TimeWindowToggle
          options={[{ label: '12mo', value: 12 }, { label: 'All', value: null }]}
          value={completionWindow}
          onChange={setCompletionWindow}
        />
      }>
        {completionHistogram.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={completionHistogram} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <YAxis tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <Tooltip content={<GenericTooltip />} />
              <Bar dataKey="count" name="Clients" fill="#161D2E" radius={[3, 3, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No completion data available.</p>
        )}
      </ChartCard>

      {/* Advanced Metrics Section */}
      <h2 className="text-lg font-semibold pt-2" style={{ color: 'var(--text)' }}>Advanced Metrics</h2>

      {/* Row 4: Outreach Comparison + Cancellation Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Avg Outreach Attempts: Completed vs Cancelled" controls={
          <TimeWindowToggle
            options={[{ label: '12mo', value: 12 }, { label: 'All', value: null }]}
            value={outreachWindow}
            onChange={setOutreachWindow}
          />
        }>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={outreachComparison} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <YAxis tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <Tooltip content={<GenericTooltip />} />
              <Bar dataKey="avg" name="Avg Attempts" radius={[4, 4, 0, 0]} maxBarSize={60}>
                <Cell fill="#2A7A65" />
                <Cell fill="#C94040" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cancellation Reason Analysis" controls={
          <TimeWindowToggle
            options={[{ label: '12mo', value: 12 }, { label: 'All', value: null }]}
            value={reasonWindow}
            onChange={setReasonWindow}
          />
        }>
          {cancellationReasons.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cancellationReasons} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <Tooltip content={<GenericTooltip />} />
                <Bar dataKey="count" name="Cancellations" fill="#C47B1A" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No cancellation reason data available.</p>
          )}
        </ChartCard>
      </div>

      {/* Billing-dependent charts */}
      {billingLoaded && (
        <>
          <h2 className="text-lg font-semibold pt-2" style={{ color: 'var(--text)' }}>Billing Cross-Reference</h2>

          {/* Row 5: Billed vs Collected + Write-off Rate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {billedVsCollected.length > 0 && (
              <ChartCard title="Monthly Billed vs Collected">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={billedVsCollected} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={Math.max(0, Math.floor(billedVsCollected.length / 12) - 1)} />
                    <YAxis tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                    <Tooltip content={<DollarTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'Sora', sans-serif" }} />
                    <Line type="monotone" dataKey="billed" name="Billed" stroke="#161D2E" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="collected" name="Collected" stroke="#2A7A65" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {writeOffTrend.length > 0 && (
              <ChartCard title="Write-off Rate Over Time">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={writeOffTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={Math.max(0, Math.floor(writeOffTrend.length / 12) - 1)} />
                    <YAxis tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} domain={[0, 'auto']} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<PercentTooltip />} />
                    <Line type="monotone" dataKey="rate" name="Write-off Rate" stroke="#C94040" strokeWidth={2} dot={{ r: 3, fill: '#C94040' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {/* Row 6: Unbilled by Clinician */}
          {unbilledByClinician.length > 0 && (
            <ChartCard title="Unbilled Claims by Clinician">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={unbilledByClinician} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Sora', sans-serif", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                  <Tooltip content={<DollarTooltip />} />
                  <Bar dataKey="total" name="Unbilled Amount" fill="#C47B1A" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}
    </div>
  )
}
