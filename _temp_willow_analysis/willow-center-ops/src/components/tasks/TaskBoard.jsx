import { useState, useMemo, useCallback, useContext, useEffect, useRef } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Calendar, User, AlertCircle, X, List, LayoutGrid } from 'lucide-react'
import { ToastContext } from '../../hooks/useToast'
import { getSeedTasks } from '../../services/sheets'

const CATEGORIES = ['All', 'Onboarding', 'Billing', 'Claims', 'Operations', 'Clinical', 'Compliance', 'Voicemail', 'General']
const GENERAL_STATUSES = ['To Do', 'In Progress', 'Done']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

const CATEGORY_STATUSES = {
  General: GENERAL_STATUSES,
  Operations: GENERAL_STATUSES,
  Clinical: GENERAL_STATUSES,
  Compliance: GENERAL_STATUSES,
  Billing: ['Unbilled', 'Submitted', 'Resubmitting', 'Blocked', 'Written Off', 'Resolved'],
  Claims: ['Unbilled', 'Submitted', 'Resubmitting', 'Blocked', 'Written Off', 'Resolved'],
  Voicemail: ['New', 'In Progress', 'Needs Followup', 'Closed'],
  Onboarding: ['Urgent', 'Needs Paperwork', 'Pending Insurance', 'Ready'],
}

function getStatusesForCategory(category) {
  if (!category || category === 'All') return GENERAL_STATUSES
  return CATEGORY_STATUSES[category] || GENERAL_STATUSES
}

function getDefaultStatus(category) {
  const statuses = getStatusesForCategory(category)
  return statuses[0]
}

const PRIORITY_COLORS = {
  Low: { bg: '#F3F4F6', text: '#6B7280' },
  Medium: { bg: '#EAF2FB', text: '#185FA5' },
  High: { bg: '#FEF4E7', text: '#854F0B' },
  Urgent: { bg: '#FCEAEA', text: '#A32D2D' },
}

const STATUS_COLORS = {
  'To Do': { bg: '#F3F4F6', text: '#6B7280' },
  'In Progress': { bg: '#FEF4E7', text: '#854F0B' },
  'Done': { bg: '#EAF3DE', text: '#3B6D11' },
  // Billing / Claims
  'Unbilled': { bg: '#F3F4F6', text: '#6B7280' },
  'Submitted': { bg: '#EAF2FB', text: '#185FA5' },
  'Resubmitting': { bg: '#FEF4E7', text: '#854F0B' },
  'Blocked': { bg: '#FCEAEA', text: '#A32D2D' },
  'Written Off': { bg: '#F3F4F6', text: '#6B7280' },
  'Resolved': { bg: '#EAF3DE', text: '#3B6D11' },
  // Voicemail
  'New': { bg: '#F3F4F6', text: '#6B7280' },
  'Needs Followup': { bg: '#FEF4E7', text: '#854F0B' },
  'Closed': { bg: '#EAF3DE', text: '#3B6D11' },
  // Onboarding
  'Urgent': { bg: '#FCEAEA', text: '#A32D2D' },
  'Needs Paperwork': { bg: '#FEF4E7', text: '#854F0B' },
  'Pending Insurance': { bg: '#EAF2FB', text: '#185FA5' },
  'Ready': { bg: '#EAF3DE', text: '#3B6D11' },
}

const CATEGORY_COLORS = {
  Onboarding: { bg: '#EAF4F1', text: '#2A7A65' },
  Billing: { bg: '#EAF2FB', text: '#185FA5' },
  Claims: { bg: '#F3E8FF', text: '#7C3AED' },
  Operations: { bg: '#FEF4E7', text: '#854F0B' },
  Clinical: { bg: '#FCEAEA', text: '#A32D2D' },
  Compliance: { bg: '#FFF7ED', text: '#9A3412' },
  Voicemail: { bg: '#FEF4E7', text: '#854F0B' },
  General: { bg: '#F3F4F6', text: '#6B7280' },
}

function TaskCard({ task, staff, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium
  const categoryColor = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.General

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'box-shadow 150ms ease',
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className="rounded-lg px-3 py-2.5 mb-2 cursor-pointer hover:shadow-md"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ backgroundColor: priorityColor.bg, color: priorityColor.text }}
        >
          {task.priority}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ backgroundColor: categoryColor.bg, color: categoryColor.text }}
        >
          {task.category}
        </span>
      </div>
      <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
        {task.title}
      </div>
      {task.description && (
        <div className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>
          {task.description}
        </div>
      )}
      <div className="flex items-center gap-3 mt-2">
        {task.assignedTo && (
          <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--muted)' }}>
            <User size={10} />
            {staff.find(s => s.email === task.assignedTo)?.name || task.assignedTo}
          </span>
        )}
        {task.dueDate && (
          <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
            <Calendar size={10} />
            {task.dueDate}
          </span>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({ status, tasks, staff, onTaskClick }) {
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS['To Do']
  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks])

  return (
    <div className="flex-1 min-w-[280px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
        >
          {status}
        </span>
        <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
          ({tasks.length})
        </span>
      </div>
      <div
        className="rounded-xl p-2 min-h-[200px]"
        style={{ backgroundColor: 'rgba(0,0,0,0.02)', border: '1px dashed var(--border)' }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} staff={staff} onClick={onTaskClick} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="text-center py-8 text-xs" style={{ color: 'var(--muted)' }}>
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}

export default function TaskBoard({ tasks, setTasks, staff, userEmail }) {
  const { toast } = useContext(ToastContext)
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeView, setActiveView] = useState('List')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const seededRef = useRef(false)

  // Default to All Staff so seed/unassigned tasks are visible
  const [assigneeFilter, setAssigneeFilter] = useState('')

  // Seed tasks in-memory if none exist
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    if (tasks.length === 0) {
      const seeded = getSeedTasks()
      setTasks(seeded)
    }
  }, [tasks.length, setTasks])

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (activeCategory !== 'All') {
      result = result.filter(t => t.category === activeCategory)
    }
    if (assigneeFilter) {
      result = result.filter(t => t.assignedTo === assigneeFilter)
    }
    return result
  }, [tasks, activeCategory, assigneeFilter])

  const activeStatuses = useMemo(() => {
    if (activeCategory !== 'All') return getStatusesForCategory(activeCategory)
    // Derive columns from actual task statuses so seed tasks with 'Unbilled', 'New', etc. appear
    const seen = new Set()
    const order = [
      'To Do', 'In Progress', 'Done',
      'Unbilled', 'Submitted', 'Resubmitting', 'Blocked', 'Written Off', 'Resolved',
      'New', 'Needs Followup', 'Closed',
      'Urgent', 'Needs Paperwork', 'Pending Insurance', 'Ready',
    ]
    const dynamic = []
    for (const status of order) {
      if (filteredTasks.some(t => t.status === status)) { seen.add(status); dynamic.push(status) }
    }
    // Catch any statuses not in the order list
    for (const t of filteredTasks) {
      if (!seen.has(t.status)) { seen.add(t.status); dynamic.push(t.status) }
    }
    return dynamic.length > 0 ? dynamic : GENERAL_STATUSES
  }, [activeCategory, filteredTasks])

  const grouped = useMemo(() => {
    const groups = {}
    for (const status of activeStatuses) {
      groups[status] = filteredTasks.filter(t => t.status === status)
    }
    return groups
  }, [filteredTasks, activeStatuses])

  const TERMINAL_STATUSES = useMemo(() => new Set(['Done', 'Resolved', 'Closed', 'Ready', 'Written Off']), [])

  const openTaskCount = useMemo(() => {
    return tasks.filter(t => !TERMINAL_STATUSES.has(t.status) && t.assignedTo === userEmail).length
  }, [tasks, userEmail, TERMINAL_STATUSES])

  const handleCreateTask = useCallback((taskData) => {
    const newTask = {
      ...taskData,
      id: `TASK-${Date.now()}`,
      rowIndex: -1,
      createdBy: userEmail || 'system',
      createdAt: new Date().toISOString(),
    }
    setTasks(prev => [...prev, newTask])
    toast.success(`Task created: ${taskData.title}`)
    setShowAddForm(false)
  }, [userEmail, setTasks, toast])

  const handleUpdateTask = useCallback((updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
    toast.success(`Task updated: ${updatedTask.title}`)
    setEditingTask(null)
  }, [setTasks, toast])

  const handleStatusChange = useCallback((task, newStatus) => {
    const updated = { ...task, status: newStatus }
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
  }, [setTasks])

  // dnd-kit sensors and drag handler
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (!over) return
    const taskId = active.id
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Determine which column the task was dropped into by finding the over item's status
    let targetStatus = null
    if (activeStatuses.includes(over.id)) {
      targetStatus = over.id
    } else {
      const overTask = tasks.find(t => t.id === over.id)
      if (overTask) targetStatus = overTask.status
    }

    if (!targetStatus || targetStatus === task.status) return
    handleStatusChange(task, targetStatus)
  }, [tasks, activeStatuses, handleStatusChange])

  return (
    <div className="flex-1 p-6" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
            My Tasks
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{openTaskCount}</span> open tasks assigned to you
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center rounded-lg p-0.5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setActiveView('List')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor: activeView === 'List' ? 'var(--accent)' : 'transparent',
                color: activeView === 'List' ? '#fff' : 'var(--muted)',
              }}
            >
              <List size={14} />
              List
            </button>
            <button
              onClick={() => setActiveView('Kanban')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor: activeView === 'Kanban' ? 'var(--accent)' : 'transparent',
                color: activeView === 'Kanban' ? '#fff' : 'var(--muted)',
              }}
            >
              <LayoutGrid size={14} />
              Kanban
            </button>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-1 mb-4 rounded-lg p-0.5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--muted)',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Assignee filter */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text)', backgroundColor: 'var(--surface)' }}
        >
          <option value="">All Staff</option>
          {staff.filter(s => s.status !== 'Inactive').map(s => (
            <option key={s.email} value={s.email}>{s.name}</option>
          ))}
        </select>
        {assigneeFilter && (
          <button
            onClick={() => setAssigneeFilter('')}
            className="text-xs px-2 py-1 rounded"
            style={{ color: 'var(--accent)' }}
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Kanban View */}
      {activeView === 'Kanban' && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {activeStatuses.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={grouped[status]}
                staff={staff}
                onTaskClick={(task) => setEditingTask(task)}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* List View */}
      {activeView === 'List' && (
        <>
          {activeStatuses.map(status => {
            const items = grouped[status]
            const statusColor = STATUS_COLORS[status] || STATUS_COLORS['To Do']
            return (
              <div key={status} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                  >
                    {status}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    ({items.length})
                  </span>
                </div>
                {items.length === 0 ? (
                  <div
                    className="text-center py-6 rounded-xl text-sm"
                    style={{ color: 'var(--muted)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    No tasks
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    {items.map((task, idx) => {
                      const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium
                      const categoryColor = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.General
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors"
                          style={{ borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none' }}
                          onClick={() => setEditingTask(task)}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                        >
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded"
                            style={{ backgroundColor: priorityColor.bg, color: priorityColor.text }}
                          >
                            {task.priority}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>
                                {task.description}
                              </div>
                            )}
                          </div>
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ backgroundColor: categoryColor.bg, color: categoryColor.text }}
                          >
                            {task.category}
                          </span>
                          {task.assignedTo && (
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                              <User size={12} />
                              {staff.find(s => s.email === task.assignedTo)?.name || task.assignedTo}
                            </span>
                          )}
                          {task.dueDate && (
                            <span
                              className="text-xs flex items-center gap-1"
                              style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                              <Calendar size={12} />
                              {task.dueDate}
                            </span>
                          )}
                          <select
                            value={task.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(task, e.target.value)}
                            className="text-xs px-2 py-1 rounded border"
                            style={{ borderColor: 'var(--border)', color: 'var(--text)', backgroundColor: 'var(--surface)' }}
                          >
                            {getStatusesForCategory(task.category).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {filteredTasks.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
          <AlertCircle size={32} className="mx-auto mb-2" style={{ opacity: 0.5 }} />
          <p className="text-sm">No tasks found</p>
          <p className="text-xs mt-1">Try changing filters or create a new task</p>
        </div>
      )}

      {/* Add/Edit Task Modal */}
      {(showAddForm || editingTask) && (
        <TaskFormModal
          task={editingTask}
          staff={staff}
          onSave={editingTask ? handleUpdateTask : handleCreateTask}
          onClose={() => { setShowAddForm(false); setEditingTask(null) }}
        />
      )}
    </div>
  )
}

function TaskFormModal({ task, staff, onSave, onClose }) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo || '')
  const [dueDate, setDueDate] = useState(task?.dueDate || '')
  const [priority, setPriority] = useState(task?.priority || 'Medium')
  const [category, setCategory] = useState(task?.category || 'General')
  const [status, setStatus] = useState(task?.status || getDefaultStatus(task?.category || 'General'))
  const [linkedRecord, setLinkedRecord] = useState(task?.linkedRecord || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const taskData = {
      ...(task || {}),
      title: title.trim(),
      description: description.trim(),
      assignedTo,
      dueDate,
      priority,
      category,
      status,
      linkedRecord: linkedRecord.trim(),
    }
    onSave(taskData)
  }

  const inputStyle = {
    borderColor: 'var(--border)',
    color: 'var(--text)',
    backgroundColor: 'var(--surface)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-xl"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={inputStyle}
              placeholder="Task title"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={inputStyle}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Assigned To</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              >
                <option value="">Unassigned</option>
                {staff.filter(s => s.status !== 'Inactive').map(s => (
                  <option key={s.email} value={s.email}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Category</label>
              <select
                value={category}
                onChange={e => { setCategory(e.target.value); setStatus(getDefaultStatus(e.target.value)) }}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              >
                {getStatusesForCategory(category).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Linked Record</label>
            <input
              type="text"
              value={linkedRecord}
              onChange={e => setLinkedRecord(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={inputStyle}
              placeholder="Client name, claim ID, VM ID (optional)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
