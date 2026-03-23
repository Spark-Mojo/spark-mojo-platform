import { useLocation, useNavigate } from 'react-router-dom'
import {
  Users, DollarSign, PhoneIncoming, LayoutDashboard,
  BarChart3, UserCog, Settings, LogOut, ChevronDown, ChevronRight, ClipboardList
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { id: 'home', label: 'Command Center', icon: LayoutDashboard, path: '/' },
  { id: 'onboarding', label: 'Onboarding', icon: Users, path: '/onboarding', badge: 'count' },
  {
    id: 'revenue', label: 'Revenue Cycle', icon: DollarSign, path: '/billing',
    children: [
      { id: 'billing-ar', label: 'AR Dashboard', path: '/billing' },
      { id: 'billing-unbilled', label: 'Unbilled Claims', path: '/billing/unbilled' },
      { id: 'billing-collections', label: 'Collections', path: '/billing/collections' },
    ]
  },
  { id: 'voicemail', label: 'Voicemail', icon: PhoneIncoming, path: '/voicemail' },
  { id: 'staff', label: 'Staff Registry', icon: ClipboardList, path: '/staff' },
]

const REPORT_ITEMS = [
  { id: 'reports-onboarding', label: 'Onboarding', path: '/reports/onboarding' },
  { id: 'reports-billing', label: 'Billing', path: '/reports/billing' },
]

const ADMIN_ITEMS = [
  { id: 'admin-staff', label: 'Manage Staff', icon: UserCog, path: '/admin/staff' },
  { id: 'admin-config', label: 'Config', icon: Settings, path: '/admin/config' },
]

export default function Sidebar({ clientCount, user }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [expandedSections, setExpandedSections] = useState({ revenue: false, reports: false })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const isBillingActive = location.pathname.startsWith('/billing')
  const isReportsActive = location.pathname.startsWith('/reports')

  return (
    <div
      className="w-[220px] min-h-screen flex flex-col text-sm"
      style={{ backgroundColor: 'var(--sidebar)' }}
    >
      {/* Logo — fills ~95% of sidebar width */}
      <div className="px-2 py-5">
        <img src="/assets/willow-center-logo.png" alt="Willow Center" className="w-full px-1" />
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = item.children
            ? location.pathname.startsWith('/billing')
            : isActive(item.path)
          const hasChildren = !!item.children
          const isExpanded = expandedSections.revenue || isBillingActive

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasChildren) {
                    toggleSection('revenue')
                    navigate(item.path)
                  } else {
                    navigate(item.path)
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md mb-0.5 text-left transition-colors"
                style={{
                  backgroundColor: active ? 'var(--accent)' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                }}
              >
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
                {item.badge === 'count' && clientCount > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                    style={{
                      backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  >
                    {clientCount}
                  </span>
                )}
                {hasChildren && (
                  isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                )}
              </button>
              {hasChildren && isExpanded && (
                <div className="ml-4">
                  {item.children.map(child => {
                    const childActive = location.pathname === child.path
                    return (
                      <button
                        key={child.id}
                        onClick={() => navigate(child.path)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md mb-0.5 text-left transition-colors text-xs"
                        style={{
                          backgroundColor: childActive ? 'rgba(42,122,101,0.3)' : 'transparent',
                          color: childActive ? '#fff' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        <span>{child.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Divider */}
        <div className="border-t border-white/10 my-3 mx-2" />

        {/* Reports */}
        <button
          onClick={() => {
            toggleSection('reports')
            navigate('/reports/onboarding')
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider"
          style={{ color: isReportsActive ? '#fff' : 'rgba(255,255,255,0.4)' }}
        >
          <span className="flex-1 text-left">Reports</span>
          {(expandedSections.reports || isReportsActive) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {(expandedSections.reports || isReportsActive) && REPORT_ITEMS.map(item => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left"
              style={{
                backgroundColor: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
              }}
            >
              <BarChart3 size={14} />
              <span>{item.label}</span>
            </button>
          )
        })}

        {/* Divider */}
        <div className="border-t border-white/10 my-3 mx-2" />

        {/* Admin */}
        <div className="px-3 py-1.5 text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Admin
        </div>
        {ADMIN_ITEMS.map(item => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md mb-0.5 text-left transition-colors"
              style={{
                backgroundColor: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {user?.name?.split(' ').map(n => n[0]).join('') || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm truncate">{user?.name || 'User'}</div>
            <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {user?.role || 'Staff'}
            </div>
          </div>
        </div>
        <button
          onClick={() => user?.onLogout?.()}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left transition-colors"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          <LogOut size={14} />
          <span className="text-xs">Logout</span>
        </button>
      </div>
    </div>
  )
}
