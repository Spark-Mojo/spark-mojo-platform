import { useState, useEffect, useMemo, useContext } from 'react'
import { RotateCcw, Search } from 'lucide-react'
import { getCompletedClients, getArchivedClients } from '../../services/sheets'
import { reactivateClient } from '../../services/sheetsWrite'
import { calcProgress } from '../../utils/progress'
import { formatApptDate } from '../../utils/dates'
import { ToastContext } from '../../hooks/useToast'

const STATUS_BADGES = {
  urgent: { bg: '#FCEAEA', text: '#A32D2D', label: 'Urgent' },
  'needs-paperwork': { bg: '#FEF4E7', text: '#854F0B', label: 'Needs Paperwork' },
  'pending-insurance': { bg: '#EAF2FB', text: '#185FA5', label: 'Pending Insurance' },
  ready: { bg: '#EAF3DE', text: '#3B6D11', label: 'Ready' },
  archived: { bg: '#F3F4F6', text: '#6B7280', label: 'Archived' },
}

export default function HistoricalView({ accessToken, userEmail, onBack, onRefresh, onClientClick }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [clinicianFilter, setClinicianFilter] = useState('')
  const [confirmReactivate, setConfirmReactivate] = useState(null)

  const years = [new Date().getFullYear(), new Date().getFullYear() - 1]

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [completed, archived] = await Promise.all([
          getCompletedClients(accessToken, year),
          getArchivedClients(accessToken, year),
        ])
        setClients([
          ...completed.map(c => ({ ...c, _type: 'completed' })),
          ...archived.map(c => ({ ...c, _type: 'archived' })),
        ])
      } catch {
        setClients([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [accessToken, year])

  const clinicians = useMemo(() =>
    [...new Set(clients.map(c => c.clinician).filter(Boolean))].sort(),
    [clients]
  )

  const filtered = useMemo(() => {
    let result = [...clients]
    if (statusFilter !== 'all') result = result.filter(c => c._type === statusFilter)
    if (clinicianFilter) result = result.filter(c => c.clinician === clinicianFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => c.clientName.toLowerCase().includes(q))
    }
    return result
  }, [clients, statusFilter, clinicianFilter, searchQuery])

  const handleReactivate = async (client) => {
    try {
      await reactivateClient(accessToken, client.id, userEmail)
      toast?.success(`${client.clientName} reactivated`)
      setConfirmReactivate(null)
      // Reload
      const [completed, archived] = await Promise.all([
        getCompletedClients(accessToken, year),
        getArchivedClients(accessToken, year),
      ])
      setClients([
        ...completed.map(c => ({ ...c, _type: 'completed' })),
        ...archived.map(c => ({ ...c, _type: 'archived' })),
      ])
      onRefresh?.()
    } catch (err) {
      toast?.error(`Failed to reactivate: ${err.message}`)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="text-sm font-medium px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}
        >
          &larr; Active Queue
        </button>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Historical Clients</h2>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={clinicianFilter}
          onChange={(e) => setClinicianFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <option value="">All Clinicians</option>
          {clinicians.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-8 pr-3 py-2 rounded-lg border text-sm w-48"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>Loading...</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Client Name', 'Clinician', 'First Appt', 'Progress', 'Status', 'Actions'].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => {
                const progress = calcProgress(client)
                const type = client._type
                return (
                  <tr
                    key={client.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onClick={() => onClientClick?.(client)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>{client.clientName}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{client.clinician}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
                      {formatApptDate(client.firstAppt)}
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>
                      {progress.pct}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: type === 'completed' ? '#EAF3DE' : '#F3F4F6',
                          color: type === 'completed' ? '#3B6D11' : '#6B7280',
                        }}
                      >
                        {type === 'completed' ? 'Completed' : 'Archived'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {type === 'archived' && (
                        <button
                          onClick={() => setConfirmReactivate(client)}
                          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md"
                          style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}
                        >
                          <RotateCcw size={12} /> Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--muted)' }}>
                    No clients found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Reactivation confirm */}
      {confirmReactivate && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setConfirmReactivate(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl shadow-2xl p-6" style={{ backgroundColor: 'var(--surface)' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Reactivate Client</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                Reactivate <strong>{confirmReactivate.clientName}</strong>&apos;s onboarding?
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmReactivate(null)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--muted)' }}>Cancel</button>
                <button
                  onClick={() => handleReactivate(confirmReactivate)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Reactivate
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
