import { useState, useMemo } from 'react'
import { deriveStatus } from '../../utils/status'
import { daysBetween, formatApptDate, isMinor } from '../../utils/dates'
import { calcProgress } from '../../utils/progress'

function generateTasks(clients, config) {
  const tasks = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const client of clients) {
    const status = deriveStatus(client, config)
    if (status === 'archived') continue

    const daysUntil = client.firstAppt ? daysBetween(today, new Date(client.firstAppt)) : null

    // Outreach follow-up task
    const followupDays = Number(config?.outreach_followup_days) || 3
    if (client.outreachAttempts.length > 0) {
      const lastAttempt = client.outreachAttempts[client.outreachAttempts.length - 1]
      if (lastAttempt.date) {
        const daysSince = daysBetween(new Date(lastAttempt.date), today)
        if (daysSince >= followupDays && !calcProgress(client).pct === 100) {
          const dueDate = new Date(lastAttempt.date)
          dueDate.setDate(dueDate.getDate() + followupDays)
          tasks.push({
            id: `outreach-${client.id}`,
            type: 'outreach',
            description: `Follow up on outreach for ${client.clientName}`,
            clientName: client.clientName,
            clientId: client.id,
            clinician: client.clinician,
            assignedTo: client.staffInitials,
            dueDate,
          })
        }
      }
    }

    // Paperwork incomplete and appt approaching
    if (!client.paperworkComplete && daysUntil !== null && daysUntil <= 7) {
      tasks.push({
        id: `paperwork-${client.id}`,
        type: 'paperwork',
        description: `Paperwork incomplete — appt in ${daysUntil} days`,
        clientName: client.clientName,
        clientId: client.id,
        clinician: client.clinician,
        assignedTo: client.staffInitials,
        dueDate: new Date(client.firstAppt),
      })
    }

    // Insurance verification needed
    if (!client.verified && (client.primaryInsurance || '').toLowerCase() !== 'self pay' && client.paperworkComplete) {
      tasks.push({
        id: `insurance-${client.id}`,
        type: 'insurance',
        description: `Verify insurance for ${client.clientName}`,
        clientName: client.clientName,
        clientId: client.id,
        clinician: client.clinician,
        assignedTo: client.staffInitials,
        dueDate: client.firstAppt ? new Date(client.firstAppt) : null,
      })
    }

    // Minor turning 18
    if (isMinor(client.dob) === true) {
      const warningDays = Number(config?.age18_warning_days) || 90
      const taskDueDays = Number(config?.age18_task_due_days) || 30
      const dobDate = new Date(client.dob)
      const eighteenth = new Date(dobDate)
      eighteenth.setFullYear(eighteenth.getFullYear() + 18)
      const daysTo18 = daysBetween(today, eighteenth)
      if (daysTo18 > 0 && daysTo18 <= warningDays) {
        const due = new Date(eighteenth)
        due.setDate(due.getDate() - taskDueDays)
        tasks.push({
          id: `age18-${client.id}`,
          type: 'age18',
          description: `${client.clientName} turns 18 in ${daysTo18} days — review custody & insurance`,
          clientName: client.clientName,
          clientId: client.id,
          clinician: client.clinician,
          assignedTo: client.staffInitials,
          dueDate: due,
        })
      }
    }
  }

  return tasks
}

function categorizeTask(task) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!task.dueDate) return 'upcoming'
  const due = new Date(task.dueDate)
  due.setHours(0, 0, 0, 0)
  if (due < today) return 'overdue'
  if (due.getTime() === today.getTime()) return 'today'
  return 'upcoming'
}

function findDefaultStaff(staff, clients, userName, userEmail) {
  // Try email match first
  const byEmail = staff.find(s => s.email === userEmail)
  if (byEmail) return byEmail.email

  if (!userName) return ''

  // Case-insensitive partial name match against staff
  const nameLower = userName.toLowerCase()
  const byName = staff.find(s => {
    const sName = (s.name || '').toLowerCase()
    return sName.includes(nameLower) || nameLower.includes(sName)
  })
  if (byName) return byName.email

  // Try matching against clinician names from client data
  const clinicians = [...new Set(clients.map(c => c.clinician).filter(Boolean))]
  const matchedClinician = clinicians.find(c => {
    const cLower = c.toLowerCase()
    return cLower.includes(nameLower) || nameLower.includes(cLower)
  })
  if (matchedClinician) {
    const staffByClinician = staff.find(s => s.name === matchedClinician)
    if (staffByClinician) return staffByClinician.email
  }

  return ''
}

export default function MyTasksView({ clients, config, staff, userEmail, userName, onClientClick }) {
  const [viewAs, setViewAs] = useState(() => findDefaultStaff(staff, clients, userName, userEmail))
  const [clinicianFilter, setClinicianFilter] = useState('')

  const allTasks = useMemo(() => generateTasks(clients, config), [clients, config])

  // Map email to initials
  const currentStaff = staff.find(s => s.email === viewAs)
  const viewInitials = currentStaff?.initials || ''

  const filtered = useMemo(() => {
    let tasks = viewInitials ? allTasks.filter(t => t.assignedTo === viewInitials) : allTasks
    if (clinicianFilter) tasks = tasks.filter(t => t.clinician === clinicianFilter)
    return tasks
  }, [allTasks, viewInitials, clinicianFilter])

  const groups = useMemo(() => {
    const overdue = filtered.filter(t => categorizeTask(t) === 'overdue')
    const today = filtered.filter(t => categorizeTask(t) === 'today')
    const upcoming = filtered.filter(t => categorizeTask(t) === 'upcoming')
    return { overdue, today, upcoming }
  }, [filtered])

  const clinicians = [...new Set(clients.map(c => c.clinician).filter(Boolean))].sort()

  const groupColors = {
    overdue: { bg: '#FCEAEA', text: '#A32D2D', label: 'Overdue' },
    today: { bg: '#FEF4E7', text: '#854F0B', label: 'Today' },
    upcoming: { bg: '#EAF2FB', text: '#185FA5', label: 'Upcoming' },
  }

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold" style={{ color: '#A32D2D', fontFamily: "'IBM Plex Mono', monospace" }}>
            {groups.overdue.length}
          </span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Overdue</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold" style={{ color: '#854F0B', fontFamily: "'IBM Plex Mono', monospace" }}>
            {groups.today.length}
          </span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold" style={{ color: '#185FA5', fontFamily: "'IBM Plex Mono', monospace" }}>
            {groups.upcoming.length}
          </span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Upcoming</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={viewAs}
          onChange={(e) => setViewAs(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <option value="">All Staff</option>
          {staff.filter(s => s.status !== 'Inactive').map(s => (
            <option key={s.email} value={s.email}>{s.name} ({s.initials})</option>
          ))}
        </select>
        <select
          value={clinicianFilter}
          onChange={(e) => setClinicianFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <option value="">All Clinicians</option>
          {clinicians.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Task groups */}
      {['overdue', 'today', 'upcoming'].map(group => {
        const items = groups[group]
        const colors = groupColors[group]
        if (items.length === 0) return null
        return (
          <div key={group} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {colors.label}
              </span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>({items.length})</span>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              {items.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onClick={() => {
                    const client = clients.find(c => c.id === task.clientId)
                    if (client) onClientClick(client)
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                >
                  <div className="flex-1">
                    <div className="text-sm" style={{ color: 'var(--text)' }}>{task.description}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {task.clinician}
                    </div>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ backgroundColor: colors.bg, color: colors.text, fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {task.dueDate ? formatApptDate(task.dueDate) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>No tasks</div>
      )}
    </div>
  )
}
