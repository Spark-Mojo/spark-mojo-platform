import { Link, useLocation } from 'react-router-dom';
import {
  UserCheck,
  CheckSquare,
  CreditCard,
  RefreshCw,
  Settings,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const showLibrary = import.meta.env.DEV || import.meta.env.VITE_SHOW_LIBRARY === 'true';

const NAV_GROUPS = [
  {
    label: 'Mojos',
    items: [
      { title: 'Onboarding', path: '/onboarding', icon: UserCheck },
      { title: 'Workboard', path: '/workboard', icon: CheckSquare },
      { title: 'Billing AR', path: '/billing', icon: CreditCard },
      { title: 'SP Sync', path: '/sync', icon: RefreshCw },
    ],
  },
  {
    label: 'Administration',
    items: [
      { title: 'Settings', path: '/settings', icon: Settings },
    ],
  },
  ...(showLibrary
    ? [
        {
          label: 'Developer',
          items: [
            { title: 'Library', path: '/library', icon: BookOpen },
          ],
        },
      ]
    : []),
];

export default function Layout({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navContent = (
    <>
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: '#e2e8f0' }}>
        <h1
          className="text-lg tracking-tight"
          style={{ fontWeight: 600, color: '#006666' }}
        >
          Willow Center
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p
              className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#94a3b8' }}
            >
              {group.label}
            </p>
            {group.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive(item.path)
                    ? 'text-white'
                    : 'hover:bg-gray-100'
                )}
                style={
                  isActive(item.path)
                    ? { backgroundColor: '#006666', color: '#ffffff' }
                    : { color: '#34424A' }
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="p-4 border-t text-center"
        style={{ borderColor: '#e2e8f0' }}
      >
        <p className="text-xs" style={{ color: '#94a3b8' }}>
          Powered by{' '}
          <span style={{ color: '#006666', fontWeight: 600 }}>Spark Mojo</span>
        </p>
      </div>
    </>
  );

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:w-60 md:flex-shrink-0"
        style={{ backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0' }}
      >
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        >
          <aside
            className="flex flex-col w-60 h-full"
            style={{ backgroundColor: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-2">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" style={{ color: '#34424A' }} />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header
          className="md:hidden flex items-center gap-3 px-4 py-3 border-b"
          style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" style={{ color: '#34424A' }} />
          </button>
          <span
            className="text-sm font-semibold"
            style={{ color: '#006666' }}
          >
            Willow Center
          </span>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
