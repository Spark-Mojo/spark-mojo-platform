import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Phone, MessageSquare, Clock, Filter, X } from 'lucide-react'
import VoicemailDrawer from './VoicemailDrawer'

// ── Count-up hook ──
function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)

  const animate = useCallback((t) => {
    const startTime = performance.now()
    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * t))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(step)
  }, [duration])

  useEffect(() => {
    animate(target)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, animate])

  return value
}

// ── Status badge config ──
const STATUS_STYLES = {
  'New / Unreviewed':        { bg: '#FCEAEA', color: '#A32D2D' },
  'In Progress':             { bg: '#FEF4E7', color: '#854F0B' },
  'Needs Followup':          { bg: '#EAF2FB', color: '#185FA5' },
  'Answered / Resolved':     { bg: '#EAF3DE', color: '#3B6D11' },
  'Forwarded to Clinician':  { bg: '#EAF2FB', color: '#185FA5' },
  'Called Back — Reached':   { bg: '#EAF3DE', color: '#3B6D11' },
  'Called Back — Left VM':   { bg: '#FEF4E7', color: '#854F0B' },
  'Sent Text':               { bg: '#FEF4E7', color: '#854F0B' },
  'No Answer — Retry':       { bg: '#FEF4E7', color: '#854F0B' },
  'Closed':                  { bg: '#F3F4F6', color: '#6B7280' },
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {status}
    </span>
  )
}

function KPICard({ label, value, icon }) {
  const displayValue = useCountUp(value)
  return (
    <div
      className="rounded-xl p-5 flex items-center gap-4"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
      >
        {icon}
      </div>
      <div>
        <div
          className="text-2xl font-bold"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}
        >
          {displayValue}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function VoicemailView({ voicemails = [], accessToken, userEmail, staff = [], setVoicemails }) {
  const [filters, setFilters] = useState({ type: '', location: '', status: '', dateFrom: '', dateTo: '' })
  const [selectedVmId, setSelectedVmId] = useState(null)

  const selectedVm = useMemo(
    () => selectedVmId ? voicemails.find(v => v.id === selectedVmId) || null : null,
    [voicemails, selectedVmId]
  )

  const handleVoicemailUpdate = useCallback((vmId, updates) => {
    setVoicemails(prev => prev.map(v => v.id === vmId ? { ...v, ...updates } : v))
  }, [setVoicemails])

  // Unique filter values
  const types = useMemo(() => [...new Set(voicemails.map(v => v.type).filter(Boolean))].sort(), [voicemails])
  const locations = useMemo(() => [...new Set(voicemails.map(v => v.location).filter(Boolean))].sort(), [voicemails])
  const statuses = useMemo(() => [...new Set(voicemails.map(v => v.status).filter(Boolean))].sort(), [voicemails])

  // Apply filters
  const filtered = useMemo(() => {
    let result = [...voicemails]

    if (filters.type) result = result.filter(v => v.type === filters.type)
    if (filters.location) result = result.filter(v => v.location === filters.location)
    if (filters.status) result = result.filter(v => v.status === filters.status)
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom)
      result = result.filter(v => {
        const d = new Date(v.date)
        return !isNaN(d.getTime()) && d >= from
      })
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter(v => {
        const d = new Date(v.date)
        return !isNaN(d.getTime()) && d <= to
      })
    }

    // Sort newest first
    result.sort((a, b) => {
      const da = new Date(a.date + ' ' + (a.time || ''))
      const db = new Date(b.date + ' ' + (b.time || ''))
      return db - da
    })

    return result
  }, [voicemails, filters])

  const hasFilters = Object.values(filters).some(Boolean)

  // KPI counts
  const totalCount = voicemails.length
  const unreviewedCount = useMemo(() => voicemails.filter(v => v.status === 'New / Unreviewed').length, [voicemails])
  const inProgressCount = useMemo(() =>
    voicemails.filter(v => !['New / Unreviewed', 'Closed', 'Answered / Resolved', 'Called Back — Reached'].includes(v.status)).length,
    [voicemails]
  )
  const resolvedCount = useMemo(() =>
    voicemails.filter(v => ['Closed', 'Answered / Resolved', 'Called Back — Reached'].includes(v.status)).length,
    [voicemails]
  )

  if (voicemails.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text)' }}>Voicemail Triage</h1>
        <div
          className="rounded-xl p-12 text-center"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Phone size={48} style={{ color: 'var(--muted)' }} className="mx-auto mb-4" />
          <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>No voicemail data available</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Voicemails will appear here once the VM tab exists in the onboarding spreadsheet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text)' }}>Voicemail Triage</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total VMs" value={totalCount} icon={<Phone size={20} />} />
        <KPICard label="Unreviewed" value={unreviewedCount} icon={<MessageSquare size={20} />} />
        <KPICard label="In Progress" value={inProgressCount} icon={<Clock size={20} />} />
        <KPICard label="Resolved" value={resolvedCount} icon={<Phone size={20} />} />
      </div>

      {/* Filter Bar */}
      <div
        className="rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Filter size={16} style={{ color: 'var(--muted)' }} />

        <select
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="text-sm rounded-lg px-3 py-1.5"
          style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'var(--surface)' }}
        >
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filters.location}
          onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
          className="text-sm rounded-lg px-3 py-1.5"
          style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'var(--surface)' }}
        >
          <option value="">All Locations</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="text-sm rounded-lg px-3 py-1.5"
          style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'var(--surface)' }}
        >
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="text-sm rounded-lg px-3 py-1.5"
            style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'var(--surface)', fontFamily: "'IBM Plex Mono', monospace" }}
          />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="text-sm rounded-lg px-3 py-1.5"
            style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'var(--surface)', fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>

        {hasFilters && (
          <button
            onClick={() => setFilters({ type: '', location: '', status: '', dateFrom: '', dateTo: '' })}
            className="text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
            style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}
          >
            <X size={12} /> Clear Filters
          </button>
        )}
      </div>

      {/* VM Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(vm => (
          <div
            key={vm.id}
            onClick={() => setSelectedVmId(vm.id)}
            className="rounded-xl p-4 transition-shadow duration-150"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{vm.name || 'Unknown Caller'}</div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {vm.number || 'No number'}
                </div>
              </div>
              <StatusBadge status={vm.status} />
            </div>

            <div
              className="text-xs mb-3 line-clamp-2"
              style={{ color: 'var(--text)', minHeight: '2rem' }}
            >
              {vm.aboutMessage || 'No message details'}
            </div>

            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {vm.date}{vm.time ? ` ${vm.time}` : ''}
              </span>
              <div className="flex items-center gap-3">
                {vm.type && (
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                  >
                    {vm.type}
                  </span>
                )}
                {vm.location && (
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{vm.location}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && voicemails.length > 0 && (
        <div
          className="rounded-xl p-8 text-center mt-4"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No voicemails match the current filters.</p>
        </div>
      )}

      {/* Footer */}
      {voicemails.length > 0 && (
        <div className="mt-4 text-xs text-right" style={{ color: 'var(--muted)' }}>
          {hasFilters
            ? `Showing ${filtered.length} of ${voicemails.length} voicemails`
            : `${voicemails.length} voicemails`
          }
        </div>
      )}

      {/* Voicemail Drawer */}
      {selectedVm && (
        <VoicemailDrawer
          voicemail={selectedVm}
          onClose={() => setSelectedVmId(null)}
          accessToken={accessToken}
          userEmail={userEmail}
          staff={staff}
          onUpdate={handleVoicemailUpdate}
        />
      )}
    </div>
  )
}
