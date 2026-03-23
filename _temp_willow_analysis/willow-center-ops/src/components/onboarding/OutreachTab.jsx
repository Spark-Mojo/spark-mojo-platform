import { useState, useEffect, useContext } from 'react'
import { Phone } from 'lucide-react'
import { appendOutreachAttempt } from '../../services/sheetsWrite'
import { getOutreachLog } from '../../services/sheets'
import { ToastContext } from '../../hooks/useToast'

export default function OutreachTab({ client, config, accessToken, userEmail, onUpdate, readOnly = false }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const [context, setContext] = useState('')
  const [extendedLog, setExtendedLog] = useState([])
  const [loading, setLoading] = useState(false)

  const methods = (config?.outreach_methods || 'SP Reminders,Google Text,LVM,EMW,Final Reminder').split(',').map(m => m.trim())

  // Combine inline attempts + extended log
  const allAttempts = [
    ...client.outreachAttempts.map((a, i) => ({
      date: a.date,
      method: a.method,
      context: '',
      staffEmail: '',
      index: i + 1,
    })),
    ...extendedLog.map((a, i) => ({
      date: a.timestamp?.split('T')[0] || a.timestamp,
      method: a.method,
      context: a.context,
      staffEmail: a.staffEmail,
      index: client.outreachAttempts.length + i + 1,
    })),
  ]

  useEffect(() => {
    if (accessToken && client.id) {
      getOutreachLog(accessToken, client.id).then(setExtendedLog).catch(() => {})
    }
  }, [accessToken, client.id])

  const handleLog = async (method) => {
    setLoading(true)
    try {
      await appendOutreachAttempt(accessToken, client.id, method, context, userEmail)
      toast?.success(`Outreach logged — ${method} attempt #${allAttempts.length + 1} for ${client.clientName}`)
      setContext('')
      onUpdate?.()
      // Refresh extended log
      const log = await getOutreachLog(accessToken, client.id)
      setExtendedLog(log)
    } catch (err) {
      toast?.error(`Failed to log outreach: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Timeline */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Outreach History
          </h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            {allAttempts.length} attempt{allAttempts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {allAttempts.length === 0 ? (
          <div className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>No outreach attempts yet</div>
        ) : (
          <div className="space-y-0">
            {allAttempts.map((attempt, i) => (
              <div key={i} className="flex gap-3">
                {/* Connector line */}
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent)', marginTop: 4 }} />
                  {i < allAttempts.length - 1 && (
                    <div className="w-0.5 flex-1 my-1" style={{ backgroundColor: 'var(--border)' }} />
                  )}
                </div>
                <div className="pb-4 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                    >
                      {attempt.method || 'Unknown'}
                    </span>
                    {attempt.staffEmail && (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{attempt.staffEmail}</span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {attempt.date || '—'}
                  </div>
                  {attempt.context && (
                    <div className="text-xs mt-1" style={{ color: 'var(--text)' }}>{attempt.context}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log attempt panel */}
      {!readOnly && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
          <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
            Log Attempt
          </h3>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Context note (optional)..."
            className="w-full px-3 py-2 rounded-lg border text-sm mb-3 resize-none"
            rows={2}
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
          />
          <div className="flex flex-wrap gap-2">
            {methods.map(method => (
              <button
                key={method}
                onClick={() => handleLog(method)}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                }}
              >
                {method}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
