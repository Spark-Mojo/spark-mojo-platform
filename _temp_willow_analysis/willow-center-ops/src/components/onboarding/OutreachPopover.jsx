import { useState, useContext, useEffect, useRef } from 'react'
import { appendOutreachAttempt } from '../../services/sheetsWrite'
import { ToastContext } from '../../hooks/useToast'

export default function OutreachPopover({ client, config, accessToken, userEmail, onClose, onLogged, anchorRect }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const methods = (config?.outreach_methods || 'SP Reminders,Google Text,LVM,EMW,Final Reminder').split(',').map(m => m.trim())

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const handleLog = async (method) => {
    setLoading(true)
    try {
      await appendOutreachAttempt(accessToken, client.id, method, context, userEmail)
      const attemptCount = (client.outreachAttempts?.length || 0) + 1
      toast?.success(`Outreach logged — ${method} attempt #${attemptCount} for ${client.clientName}`)
      onLogged?.()
      onClose()
    } catch (err) {
      toast?.error(`Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 w-72 rounded-xl shadow-xl p-4"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        top: anchorRect ? anchorRect.bottom + 4 : 0,
        right: 16,
      }}
    >
      <div className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>
        Log outreach for <strong style={{ color: 'var(--text)' }}>{client.clientName}</strong>
      </div>
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder="Context (optional)..."
        className="w-full px-3 py-2 rounded-lg border text-sm mb-3 resize-none"
        rows={2}
        style={{ borderColor: 'var(--border)', color: 'var(--text)', fontSize: '0.8rem' }}
      />
      <div className="flex flex-wrap gap-1.5">
        {methods.map(method => (
          <button
            key={method}
            onClick={() => handleLog(method)}
            disabled={loading}
            className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {method}
          </button>
        ))}
      </div>
    </div>
  )
}
