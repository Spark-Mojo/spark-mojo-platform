import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Plus, ListTodo } from 'lucide-react'

const ROUTE_TITLES = {
  '/': 'Command Center',
  '/onboarding': 'Onboarding',
  '/billing': 'Revenue Cycle — AR Dashboard',
  '/billing/unbilled': 'Revenue Cycle — Unbilled Claims',
  '/billing/collections': 'Revenue Cycle — Collections',
  '/voicemail': 'Voicemail',
  '/reports/onboarding': 'Reports — Onboarding',
  '/reports/billing': 'Reports — Billing',
  '/tasks': 'Task Board',
  '/admin/staff': 'Admin — Manage Staff',
  '/admin/reassign': 'Admin — Reassign Tasks',
  '/admin/config': 'Admin — Config',
  '/staff': 'Staff Registry',
}

export default function TopBar({ taskCount, onboarding }) {
  const location = useLocation()
  const navigate = useNavigate()
  const title = ROUTE_TITLES[location.pathname] || 'Willow Ops'
  const isOnboardingRoute = location.pathname === '/onboarding'

  return (
    <div
      className="flex items-center gap-4 px-6 py-3 border-b"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
    >
      <h1 className="text-lg font-semibold mr-4" style={{ color: 'var(--text)' }}>
        {title}
      </h1>

      {/* Onboarding-specific controls */}
      {isOnboardingRoute && onboarding && (
        <>
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ backgroundColor: 'var(--bg)' }}>
            {['Queue', 'Kanban'].map(view => {
              const isActive = onboarding.activeView === view
              return (
                <button
                  key={view}
                  onClick={() => onboarding.setActiveView(view)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: isActive ? 'var(--surface)' : 'transparent',
                    color: isActive ? 'var(--text)' : 'var(--muted)',
                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  {view}
                </button>
              )
            })}
          </div>

          <div className="flex-1" />

          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--muted)' }}
            />
            <input
              type="text"
              placeholder="Search clients..."
              value={onboarding.searchQuery}
              onChange={(e) => onboarding.setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg border text-sm w-64 outline-none focus:ring-2"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
          </div>

          <button
            onClick={onboarding.onAddClient}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Plus size={16} />
            Add Client
          </button>
        </>
      )}

      {!isOnboardingRoute && <div className="flex-1" />}

      {/* My Tasks button */}
      <button
        onClick={() => navigate('/tasks')}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          backgroundColor: location.pathname === '/tasks' ? 'var(--accent-light)' : 'transparent',
          color: location.pathname === '/tasks' ? 'var(--accent)' : 'var(--muted)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
        }}
      >
        <ListTodo size={16} />
        <span>My Tasks</span>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full font-mono"
          style={{
            backgroundColor: taskCount > 0 ? 'var(--accent)' : 'var(--border)',
            color: taskCount > 0 ? '#fff' : 'var(--muted)',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {taskCount}
        </span>
      </button>
    </div>
  )
}
