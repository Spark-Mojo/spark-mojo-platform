import { useContext } from 'react'
import { ToastContext } from '../../hooks/useToast'

export default function Toast() {
  const ctx = useContext(ToastContext)
  if (!ctx || !ctx.toasts.length) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {ctx.toasts.map(t => (
        <div
          key={t.id}
          className="px-4 py-3 rounded-lg shadow-lg text-sm text-white max-w-sm"
          style={{
            backgroundColor: t.type === 'error' ? 'var(--red)' : '#1A2A24',
            borderLeft: `4px solid ${t.type === 'error' ? '#991b1b' : 'var(--accent)'}`,
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
