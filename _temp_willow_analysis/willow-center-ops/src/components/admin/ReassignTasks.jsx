import { useState, useEffect, useContext } from 'react'
import { getStaff, getOnboardingClients } from '../../services/sheets'
import { bulkReassignTasks } from '../../services/sheetsWrite'
import { ToastContext } from '../../hooks/useToast'

export default function ReassignTasks({ accessToken, userEmail, onRefresh }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const [staffList, setStaffList] = useState([])
  const [fromStaff, setFromStaff] = useState('')
  const [toStaff, setToStaff] = useState('')
  const [previewCount, setPreviewCount] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getStaff(accessToken).then(setStaffList).catch(() => {})
  }, [accessToken])

  const activeStaff = staffList.filter(s => s.status !== 'Inactive')

  useEffect(() => {
    if (!fromStaff) { setPreviewCount(null); return }
    getOnboardingClients(accessToken).then(clients => {
      const count = clients.filter(c => c.staffInitials === fromStaff).length
      setPreviewCount(count)
    }).catch(() => setPreviewCount(null))
  }, [fromStaff, accessToken])

  const handleReassign = async () => {
    if (!fromStaff || !toStaff) {
      toast?.error('Select both From and To staff')
      return
    }
    if (fromStaff === toStaff) {
      toast?.error('From and To must be different')
      return
    }
    setLoading(true)
    try {
      const result = await bulkReassignTasks(accessToken, fromStaff, toStaff, userEmail)
      toast?.success(`Reassigned ${result.taskCount} tasks and ${result.clientCount} clients from ${fromStaff} to ${toStaff}`)
      setFromStaff('')
      setToStaff('')
      setPreviewCount(null)
      onRefresh?.()
    } catch (err) {
      toast?.error(`Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text)' }}>Reassign All Tasks</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>From (Staff)</label>
          <select
            value={fromStaff} onChange={(e) => setFromStaff(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <option value="">Select staff...</option>
            {staffList.map(s => <option key={s.initials} value={s.initials}>{s.name} ({s.initials})</option>)}
          </select>
        </div>

        <div className="text-center text-lg" style={{ color: 'var(--muted)' }}>&darr;</div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>To (Staff)</label>
          <select
            value={toStaff} onChange={(e) => setToStaff(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <option value="">Select staff...</option>
            {activeStaff.filter(s => s.initials !== fromStaff).map(s => (
              <option key={s.initials} value={s.initials}>{s.name} ({s.initials})</option>
            ))}
          </select>
        </div>

        {previewCount !== null && fromStaff && toStaff && (
          <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            This will reassign tasks and <strong>{previewCount}</strong> clients from {fromStaff} to {toStaff}
          </div>
        )}

        <button
          onClick={handleReassign}
          disabled={loading || !fromStaff || !toStaff}
          className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {loading ? 'Reassigning...' : 'Reassign All'}
        </button>
      </div>
    </div>
  )
}
