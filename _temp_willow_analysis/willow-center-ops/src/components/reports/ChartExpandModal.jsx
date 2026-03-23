import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function ChartExpandModal({ title, controls, onClose, children }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', animation: 'fadeIn 200ms ease' }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--surface)',
          width: 'calc(100vw - 80px)',
          height: 'calc(100vh - 80px)',
          animation: 'scaleIn 200ms ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
            {title}
          </h2>
          <div className="flex items-center gap-3">
            {controls}
            <button onClick={onClose} style={{ color: 'var(--muted)' }} className="hover:opacity-70">
              <X size={20} />
            </button>
          </div>
        </div>
        <div style={{ height: 'calc(100% - 48px)' }}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>,
    document.body
  )
}
