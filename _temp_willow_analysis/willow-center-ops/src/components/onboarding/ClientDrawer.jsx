import { useState, useEffect } from 'react'
import { X, Archive } from 'lucide-react'
import { calcProgress } from '../../utils/progress'
import { deriveStatus } from '../../utils/status'
import { daysUntil18 } from '../../utils/dates'

import ChecklistTab from './ChecklistTab'
import OutreachTab from './OutreachTab'
import NotesTab from './NotesTab'
import DetailsTab from './DetailsTab'
import EditTab from './EditTab'
import ArchiveModal from './ArchiveModal'

const STATUS_BADGES = {
  urgent: { bg: '#FCEAEA', text: '#A32D2D', label: 'Urgent' },
  'needs-paperwork': { bg: '#FEF4E7', text: '#854F0B', label: 'Needs Paperwork' },
  'pending-insurance': { bg: '#EAF2FB', text: '#185FA5', label: 'Pending Insurance' },
  ready: { bg: '#EAF3DE', text: '#3B6D11', label: 'Ready' },
  archived: { bg: '#F3F4F6', text: '#6B7280', label: 'Archived' },
}

const STAGES = ['Scheduled', 'Paperwork', 'Insurance', 'Verified', 'Ready']

function AnimatedProgressBar({ pct, trigger }) {
  const [width, setWidth] = useState(0)
  const [displayNum, setDisplayNum] = useState(0)

  useEffect(() => {
    const resetTimeout = setTimeout(() => {
      setWidth(0)
      setDisplayNum(0)
    }, 0)
    const timeout = setTimeout(() => {
      setWidth(pct)
      // Count up animation
      const duration = 600
      const steps = 30
      const increment = pct / steps
      let current = 0
      const interval = setInterval(() => {
        current += increment
        if (current >= pct) {
          setDisplayNum(pct)
          clearInterval(interval)
        } else {
          setDisplayNum(Math.round(current))
        }
      }, duration / steps)
      return () => clearInterval(interval)
    }, 50)
    return () => { clearTimeout(resetTimeout); clearTimeout(timeout) }
  }, [pct, trigger])

  const color = pct < 50 ? '#E24B4A' : pct < 80 ? '#EF9F27' : 'var(--accent)'

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Progress</span>
        <span
          className="text-lg font-semibold"
          style={{ color, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {displayNum}%
        </span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: color,
            transition: 'width 600ms ease-out',
          }}
        />
      </div>
    </div>
  )
}

function StageIndicator({ client, config }) {
  const status = deriveStatus(client, config)
  let currentIdx = 0
  if (client.paperworkComplete) currentIdx = 2
  if (client.verified || (client.primaryInsurance || '').toLowerCase() === 'self pay') currentIdx = 3
  if (status === 'ready') currentIdx = 4

  return (
    <div className="flex items-center justify-between mb-6">
      {STAGES.map((stage, i) => {
        const done = i < currentIdx
        const current = i === currentIdx
        return (
          <div key={stage} className="flex flex-col items-center flex-1">
            <div
              className="w-3 h-3 rounded-full mb-1"
              style={{
                backgroundColor: done ? 'var(--green)' : current ? 'var(--accent)' : 'var(--border)',
                boxShadow: current ? '0 0 0 4px rgba(42,122,101,0.2)' : 'none',
              }}
            />
            <span className="text-xs" style={{ color: done ? 'var(--green)' : current ? 'var(--accent)' : 'var(--muted)' }}>
              {stage}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function ClientDrawer({ client, config, staff, clients, onClose, onUpdate, onFieldUpdate, accessToken, userEmail, readOnly = false }) {
  const [activeTab, setActiveTab] = useState('Checklist')
  const [animTrigger, setAnimTrigger] = useState(0)
  const [age18Dismissed, setAge18Dismissed] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  if (!client) return null

  const status = deriveStatus(client, config)
  const badge = STATUS_BADGES[status]
  const { pct } = calcProgress(client)
  const d18 = daysUntil18(client.dob)
  const showAge18Banner = d18 !== null && d18 > 0 && d18 <= (Number(config?.age18_warning_days) || 90) && !age18Dismissed

  const tabs = readOnly
    ? ['Checklist', 'Outreach', 'Notes', 'Details']
    : ['Checklist', 'Outreach', 'Notes', 'Details', 'Edit']

  const handleChecklistToggle = () => {
    setAnimTrigger(prev => prev + 1)
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-[480px] z-50 flex flex-col shadow-2xl"
        style={{
          backgroundColor: 'var(--surface)',
          animation: 'slideIn 200ms ease',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{client.clientName}</h2>
            <div className="flex items-center gap-2">
              {!readOnly && (
                <button
                  onClick={() => setShowArchive(true)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--red)' }}
                  title="Archive client"
                >
                  <Archive size={16} />
                </button>
              )}
              <button onClick={onClose} className="p-1 rounded-md" style={{ color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm mb-2">
            {badge && (
              <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: badge.bg, color: badge.text }}>
                {badge.label}
              </span>
            )}
            <span style={{ color: 'var(--muted)' }}>•</span>
            <span style={{ color: 'var(--muted)' }}>{client.clinician}</span>
            <span style={{ color: 'var(--muted)' }}>•</span>
            <span style={{ color: 'var(--muted)' }}>{client.staffInitials || 'Unassigned'}</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            Added {client.dateAdded}
          </div>
        </div>

        {/* Historical Record banner */}
        {readOnly && (
          <div className="mx-6 mt-3 px-4 py-2 rounded-lg text-center" style={{ backgroundColor: '#F3F4F6', border: '1px solid var(--border)' }}>
            <span className="text-xs font-medium" style={{ color: '#6B7280' }}>Historical Record — Read Only</span>
          </div>
        )}

        {/* Progress */}
        <div className="px-6 pt-4">
          <AnimatedProgressBar pct={pct} trigger={animTrigger} />
          <StageIndicator client={client} config={config} />
        </div>

        {/* Age-18 banner */}
        {showAge18Banner && (
          <div className="mx-6 mb-3 px-4 py-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#FEF4E7', border: '1px solid var(--amber)' }}>
            <span className="text-xs font-medium" style={{ color: '#854F0B' }}>
              Client turns 18 in {d18} days — review custody and insurance
            </span>
            <button onClick={() => setAge18Dismissed(true)} className="text-xs ml-2" style={{ color: '#854F0B' }}>Dismiss</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mx-6" style={{ borderColor: 'var(--border)' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 text-sm font-medium transition-colors relative"
              style={{
                color: activeTab === tab ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'Checklist' && (
            <ChecklistTab
              client={client}
              config={config}
              onToggle={handleChecklistToggle}
              onUpdate={onUpdate}
              onFieldUpdate={onFieldUpdate}
              accessToken={accessToken}
              userEmail={userEmail}
              readOnly={readOnly}
            />
          )}
          {activeTab === 'Outreach' && (
            <OutreachTab
              client={client}
              config={config}
              accessToken={accessToken}
              userEmail={userEmail}
              onUpdate={onUpdate}
              readOnly={readOnly}
            />
          )}
          {activeTab === 'Notes' && (
            <NotesTab
              client={client}
              accessToken={accessToken}
              userEmail={userEmail}
              userInitials={client.staffInitials}
              onUpdate={onUpdate}
              readOnly={readOnly}
            />
          )}
          {activeTab === 'Details' && (
            <DetailsTab
              client={client}
              config={config}
              accessToken={accessToken}
              userEmail={userEmail}
              onUpdate={onUpdate}
              readOnly={readOnly}
            />
          )}
          {activeTab === 'Edit' && !readOnly && (
            <EditTab
              client={client}
              staff={staff || []}
              clients={clients || []}
              accessToken={accessToken}
              userEmail={userEmail}
              onUpdate={onUpdate}
            />
          )}
        </div>
      </div>

      {showArchive && (
        <ArchiveModal
          client={client}
          accessToken={accessToken}
          userEmail={userEmail}
          onClose={() => setShowArchive(false)}
          onArchived={onUpdate}
        />
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
