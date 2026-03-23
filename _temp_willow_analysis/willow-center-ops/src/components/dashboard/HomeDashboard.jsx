import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, DollarSign, Phone, AlertTriangle, ClipboardList, BarChart3, Settings, UserCog, Loader } from 'lucide-react'
import { deriveStatus } from '../../utils/status'
import { useBillingData } from '../../hooks/useBillingData'
import { useAuth } from '../../contexts/auth'

function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)

  const animate = useCallback(() => {
    if (ref.current) cancelAnimationFrame(ref.current)
    if (target === 0) {
      ref.current = requestAnimationFrame(() => setValue(0))
      return
    }
    const start = performance.now()
    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
  }, [target, duration])

  useEffect(() => {
    animate()
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [animate])

  return value
}

function KPICard({ iconEl, label, value, format, color, loading, error }) {
  const numericTarget = typeof value === 'number' ? value : 0
  const animated = useCountUp(numericTarget)

  let display
  if (error) {
    display = '—'
  } else if (loading) {
    display = null
  } else {
    display = format === 'dollar'
      ? '$' + animated.toLocaleString()
      : animated.toLocaleString()
  }

  return (
    <div
      className="rounded-xl p-5 flex items-start gap-4"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + '18' }}
      >
        {iconEl}
      </div>
      <div>
        <div
          className="text-2xl font-semibold"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}
        >
          {loading ? <Loader size={20} className="animate-spin" style={{ color: 'var(--muted)' }} /> : display}
        </div>
        <div className="text-sm mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Sora', sans-serif" }}>
          {label}
        </div>
      </div>
    </div>
  )
}

function NavTile({ iconEl, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl p-5 flex flex-col items-center gap-3 text-center transition-shadow duration-150 hover:shadow-md cursor-pointer"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: 'var(--accent-light)' }}
      >
        {iconEl}
      </div>
      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</span>
    </button>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeDashboard({ clients = [], config = {}, voicemails = [] }) {
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const { unpaidClaims, isLoaded: billingLoaded, fetchFromSheet } = useBillingData()
  const [billingError, setBillingError] = useState(false)

  useEffect(() => {
    if (!billingLoaded && accessToken) {
      fetchFromSheet(accessToken).catch(() => setBillingError(true))
    }
  }, [billingLoaded, accessToken, fetchFromSheet])

  // KPI calculations
  const activeCount = clients.filter(c => !c.archiveReason).length

  const totalUnpaid = billingLoaded
    ? unpaidClaims.reduce((sum, c) => sum + (c.totalUnpaid || 0), 0)
    : null

  const openVoicemails = voicemails.filter(
    vm => vm.status !== 'Closed' && vm.status !== 'Answered — Resolved'
  ).length

  const urgentCount = clients.filter(c => deriveStatus(c, config) === 'urgent').length

  const navTiles = [
    { iconEl: <ClipboardList size={24} style={{ color: 'var(--accent)' }} />, label: 'Onboarding', path: '/onboarding' },
    { iconEl: <DollarSign size={24} style={{ color: 'var(--accent)' }} />, label: 'Revenue Cycle', path: '/billing' },
    { iconEl: <Phone size={24} style={{ color: 'var(--accent)' }} />, label: 'Voicemail', path: '/voicemail' },
    { iconEl: <BarChart3 size={24} style={{ color: 'var(--accent)' }} />, label: 'Reports', path: '/reports/onboarding' },
    { iconEl: <UserCog size={24} style={{ color: 'var(--accent)' }} />, label: 'Staff', path: '/admin/staff' },
    { iconEl: <Settings size={24} style={{ color: 'var(--accent)' }} />, label: 'Config', path: '/admin/config' },
  ]

  return (
    <div className="flex-1 p-6 space-y-8" style={{ fontFamily: "'Sora', sans-serif" }}>
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
          {getGreeting()}, James
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Here&apos;s your operations overview.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          iconEl={<Users size={20} color="#2A7A65" />}
          label="Active Onboarding Queue"
          value={activeCount}
          color="#2A7A65"
        />
        <KPICard
          iconEl={<DollarSign size={20} color="#2065B8" />}
          label="Total AR Unpaid"
          value={totalUnpaid !== null ? Math.round(totalUnpaid) : 0}
          format="dollar"
          color="#2065B8"
          loading={!billingLoaded && !billingError}
          error={billingError}
        />
        <KPICard
          iconEl={<Phone size={20} color="#C47B1A" />}
          label="Open Voicemails"
          value={openVoicemails}
          color="#C47B1A"
        />
        <KPICard
          iconEl={<AlertTriangle size={20} color="#C94040" />}
          label="Urgent Items"
          value={urgentCount}
          color="#C94040"
        />
      </div>

      {/* My Tasks Summary */}
      <div
        className="rounded-xl p-4 flex flex-wrap gap-6"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>My Tasks</span>
        {['Onboarding', 'Billing', 'Voicemail', 'General'].map(cat => (
          <span key={cat} className="text-sm" style={{ color: 'var(--muted)' }}>
            {cat}:{' '}
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>0</span>
          </span>
        ))}
      </div>

      {/* Quick Nav Tiles */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Quick Navigation
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {navTiles.map(tile => (
            <NavTile
              key={tile.path}
              iconEl={tile.iconEl}
              label={tile.label}
              onClick={() => navigate(tile.path)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
