import { useState, useMemo } from 'react'
import { deriveStatus } from '../../utils/status'
import { calcProgress } from '../../utils/progress'
import { daysBetween, formatApptDate } from '../../utils/dates'
import { Phone } from 'lucide-react'
import OutreachPopover from './OutreachPopover'

const STATUS_BADGES = {
  urgent: { bg: '#FCEAEA', text: '#A32D2D', label: 'Urgent' },
  'needs-paperwork': { bg: '#FEF4E7', text: '#854F0B', label: 'Needs Paperwork' },
  'pending-insurance': { bg: '#EAF2FB', text: '#185FA5', label: 'Pending Insurance' },
  ready: { bg: '#EAF3DE', text: '#3B6D11', label: 'Ready' },
  archived: { bg: '#F3F4F6', text: '#6B7280', label: 'Archived' },
}

function KPICard({ label, count, urgent, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-xl p-4 text-left transition-all"
      style={{
        backgroundColor: 'var(--surface)',
        border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderLeft: urgent ? '4px solid #E24B4A' : undefined,
      }}
    >
      <div className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>{label}</div>
      <div
        className="text-2xl font-semibold font-mono"
        style={{ color: urgent ? '#E24B4A' : 'var(--text)', fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {count}
      </div>
    </button>
  )
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
      style={{
        backgroundColor: active ? 'var(--accent)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--muted)',
        border: active ? 'none' : '1px solid var(--border)',
      }}
    >
      {label}
    </button>
  )
}

const FILTER_MAP = {
  all: () => true,
  urgent: (c) => c.status === 'urgent',
  'pending-insurance': (c) => c.status === 'pending-insurance',
  'needs-paperwork': (c) => c.status === 'needs-paperwork',
  ready: (c) => c.status === 'ready',
}

function ProgressBar({ pct }) {
  const color = pct < 50 ? '#E24B4A' : pct < 80 ? '#EF9F27' : 'var(--accent)'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>{pct}%</span>
    </div>
  )
}

export default function QueueView({ clients, config, searchQuery, onClientClick, accessToken, userEmail, onRefresh }) {
  const [popoverClient, setPopoverClient] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortCol, setSortCol] = useState('firstAppt')
  const [sortDir, setSortDir] = useState('asc')

  const enriched = useMemo(() =>
    clients.map(c => ({
      ...c,
      status: deriveStatus(c, config),
      progress: calcProgress(c),
    })),
    [clients, config]
  )

  // KPI counts
  const kpis = useMemo(() => {
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return {
      active: enriched.filter(c => c.status !== 'archived').length,
      urgent: enriched.filter(c => c.status === 'urgent').length,
      pendingIns: enriched.filter(c => c.status === 'pending-insurance').length,
      thisWeek: enriched.filter(c => {
        if (!c.firstAppt) return false
        const d = new Date(c.firstAppt)
        return d >= now && d <= weekEnd
      }).length,
    }
  }, [enriched])

  const filtered = useMemo(() => {
    let result = enriched.filter(c => c.status !== 'archived')
    if (activeFilter !== 'all') result = result.filter(FILTER_MAP[activeFilter])
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.clientName.toLowerCase().includes(q) || c.clinician.toLowerCase().includes(q)
      )
    }
    return result
  }, [enriched, activeFilter, searchQuery])

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      // Urgent always first
      if (a.status === 'urgent' && b.status !== 'urgent') return -1
      if (b.status === 'urgent' && a.status !== 'urgent') return 1

      let valA, valB
      if (sortCol === 'firstAppt') {
        valA = a.firstAppt ? new Date(a.firstAppt).getTime() : Infinity
        valB = b.firstAppt ? new Date(b.firstAppt).getTime() : Infinity
      } else if (sortCol === 'clientName') {
        valA = a.clientName.toLowerCase()
        valB = b.clientName.toLowerCase()
      } else if (sortCol === 'clinician') {
        valA = a.clinician.toLowerCase()
        valB = b.clinician.toLowerCase()
      } else if (sortCol === 'progress') {
        valA = a.progress.pct
        valB = b.progress.pct
      } else {
        valA = a[sortCol] || ''
        valB = b[sortCol] || ''
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortCol, sortDir])

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const handleKPIClick = (filter) => {
    setActiveFilter(prev => prev === filter ? 'all' : filter)
  }

  const SortIndicator = ({ col }) => {
    if (sortCol !== col) return null
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const columns = [
    { id: 'clientName', label: 'Client Name' },
    { id: 'clinician', label: 'Clinician' },
    { id: 'firstAppt', label: 'First Appt' },
    { id: 'progress', label: 'Progress' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: '' },
  ]

  return (
    <div>
      {/* KPI Cards */}
      <div className="flex gap-4 mb-4">
        <KPICard label="Active Queue" count={kpis.active} onClick={() => handleKPIClick('all')} active={activeFilter === 'all'} />
        <KPICard label="Urgent" count={kpis.urgent} urgent onClick={() => handleKPIClick('urgent')} active={activeFilter === 'urgent'} />
        <KPICard label="Pending Insurance" count={kpis.pendingIns} onClick={() => handleKPIClick('pending-insurance')} active={activeFilter === 'pending-insurance'} />
        <KPICard label="Appts This Week" count={kpis.thisWeek} />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 mb-4">
        {['all', 'urgent', 'pending-insurance', 'needs-paperwork', 'ready'].map(f => (
          <FilterChip
            key={f}
            label={f === 'all' ? 'All' : STATUS_BADGES[f]?.label || f}
            active={activeFilter === f}
            onClick={() => setActiveFilter(f)}
          />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {columns.map(col => (
                <th
                  key={col.id}
                  onClick={col.id !== 'actions' && col.id !== 'insurance' ? () => handleSort(col.id) : undefined}
                  className="text-left px-4 py-3 text-xs font-medium"
                  style={{
                    color: 'var(--muted)',
                    cursor: col.id !== 'actions' && col.id !== 'insurance' ? 'pointer' : 'default',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {col.label}<SortIndicator col={col.id} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(client => {
              const badge = STATUS_BADGES[client.status]
              const daysUntil = client.firstAppt ? daysBetween(new Date(), new Date(client.firstAppt)) : null
              const apptColor = daysUntil !== null && daysUntil <= 2 ? 'var(--red)' : daysUntil !== null && daysUntil <= 7 ? 'var(--amber)' : 'var(--muted)'

              return (
                <tr
                  key={client.id}
                  onClick={() => onClientClick(client)}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: badge?.bg === '#FCEAEA' ? '#E24B4A' : 'transparent' }}
                      />
                      <span style={{ color: client.status === 'urgent' ? 'var(--red)' : 'var(--text)', fontWeight: 500 }}>
                        {client.clientName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{client.clinician}</td>
                  <td className="px-4 py-3" style={{ color: apptColor, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
                    {formatApptDate(client.firstAppt)}
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar pct={client.progress.pct} />
                  </td>
                  <td className="px-4 py-3">
                    {client.verified ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#EAF3DE', color: '#3B6D11' }}>Verified</span>
                    ) : (client.primaryInsurance || '').toLowerCase() === 'self pay' ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>Self Pay</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#EAF2FB', color: '#185FA5' }}>
                        {client.primaryInsurance || 'Unknown'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {badge && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: badge.bg, color: badge.text }}>
                        {badge.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPopoverClient(popoverClient?.id === client.id ? null : client) }}
                      className="p-1.5 rounded-md transition-colors"
                      style={{ color: 'var(--muted)' }}
                      title="Log Outreach"
                    >
                      <Phone size={14} />
                    </button>
                    {popoverClient?.id === client.id && (
                      <OutreachPopover
                        client={client}
                        config={config}
                        accessToken={accessToken}
                        userEmail={userEmail}
                        onClose={() => setPopoverClient(null)}
                        onLogged={onRefresh}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--muted)' }}>
                  No clients match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
