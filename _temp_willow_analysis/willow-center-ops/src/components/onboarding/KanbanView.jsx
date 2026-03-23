import { useMemo, useContext } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { deriveStatus } from '../../utils/status'
import { calcProgress } from '../../utils/progress'
import { formatApptDate } from '../../utils/dates'
import { updateClientField } from '../../services/sheetsWrite'
import { ToastContext } from '../../hooks/useToast'

const COLUMNS = [
  { id: 'needs-paperwork', label: 'Paperwork', bg: '#FEF4E7', accent: '#854F0B' },
  { id: 'pending-insurance', label: 'Insurance', bg: '#EAF2FB', accent: '#185FA5' },
  { id: 'ready', label: 'Ready', bg: '#EAF3DE', accent: '#3B6D11' },
  { id: 'urgent', label: 'Urgent', bg: '#FCEAEA', accent: '#A32D2D' },
]

function ClientCard({ client, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: client.id })
  const progress = calcProgress(client)
  const isUrgent = client._status === 'urgent'
  const barColor = progress.pct < 50 ? '#E24B4A' : progress.pct < 80 ? '#EF9F27' : 'var(--accent)'

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'box-shadow 150ms ease, border-color 150ms ease',
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  }

  const pills = [
    { label: 'Paperwork', ok: client.paperworkComplete },
    { label: 'Ins Card', ok: client.insuranceCard },
    { label: 'Verified', ok: client.verified },
    { label: 'SP Note', ok: client.spNoteAdded },
  ]

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(client)}
      className="rounded-lg px-4 py-3 mb-2 cursor-pointer hover:shadow-md"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(client)}
      aria-label={`Client: ${client.clientName}`}
      data-status={client._status}
      data-column-id={client._status}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium" style={{ color: isUrgent ? 'var(--red)' : 'var(--text)' }}>
          {client.clientName}
        </span>
      </div>
      <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
        {client.clinician} &middot; {formatApptDate(client.firstAppt)}
      </div>
      {/* Mini progress bar */}
      <div className="w-full h-1 rounded-full mb-2" style={{ backgroundColor: 'var(--border)' }}>
        <div className="h-full rounded-full" style={{ width: `${progress.pct}%`, backgroundColor: barColor }} />
      </div>
      {/* Checklist pills */}
      <div className="flex flex-wrap gap-1">
        {pills.map(p => (
          <span
            key={p.label}
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: p.ok ? '#EAF3DE' : '#FCEAEA',
              color: p.ok ? '#3B6D11' : '#A32D2D',
            }}
          >
            {p.ok ? '✓' : '✕'} {p.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function KanbanView({ clients, config, accessToken, userEmail, onClientClick, onRefresh }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const enriched = useMemo(() =>
    clients.map(c => ({ ...c, _status: deriveStatus(c, config) })).filter(c => c._status !== 'archived'),
    [clients, config]
  )

  const columnData = useMemo(() => {
    const result = {}
    COLUMNS.forEach(col => {
      result[col.id] = enriched.filter(c => c._status === col.id)
    })
    return result
  }, [enriched])

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over) return

    const client = enriched.find(c => c.id === active.id)
    if (!client) return

    // Determine target column from the over element
    // over.id could be a client id or a column droppable id
    let targetColumn = null

    // Check if dropped over a column
    for (const col of COLUMNS) {
      if (over.id === col.id) {
        targetColumn = col.id
        break
      }
      // Check if dropped over a card in a column
      const card = enriched.find(c => c.id === over.id)
      if (card && card._status === col.id) {
        targetColumn = col.id
        break
      }
    }

    if (!targetColumn || targetColumn === client._status) return

    try {
      // Update booleans to match target column
      if (targetColumn === 'needs-paperwork') {
        await updateClientField(accessToken, client.id, 'Paperwork Complete', 'FALSE', userEmail)
        await updateClientField(accessToken, client.id, 'urgent_override', 'FALSE', userEmail)
      } else if (targetColumn === 'pending-insurance') {
        await updateClientField(accessToken, client.id, 'Paperwork Complete', 'TRUE', userEmail)
        await updateClientField(accessToken, client.id, 'Verified', 'FALSE', userEmail)
        await updateClientField(accessToken, client.id, 'urgent_override', 'FALSE', userEmail)
      } else if (targetColumn === 'ready') {
        await updateClientField(accessToken, client.id, 'Paperwork Complete', 'TRUE', userEmail)
        await updateClientField(accessToken, client.id, 'Verified', 'TRUE', userEmail)
        await updateClientField(accessToken, client.id, 'SP Note Added', 'TRUE', userEmail)
        await updateClientField(accessToken, client.id, 'urgent_override', 'FALSE', userEmail)
      } else if (targetColumn === 'urgent') {
        await updateClientField(accessToken, client.id, 'urgent_override', 'TRUE', userEmail)
      }

      const colLabel = COLUMNS.find(c => c.id === targetColumn)?.label
      toast?.success(`${client.clientName} moved to ${colLabel}`)
      onRefresh?.()
    } catch (err) {
      toast?.error(`Failed to move: ${err.message}`)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4 h-full">
        {COLUMNS.map(col => (
          <div key={col.id} className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: col.accent }}>{col.label}</h3>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: col.bg, color: col.accent }}
              >
                {columnData[col.id]?.length || 0}
              </span>
            </div>
            <div
              className="flex-1 rounded-xl p-2 min-h-[200px]"
              style={{ backgroundColor: col.bg + '40' }}
            >
              <SortableContext items={(columnData[col.id] || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                {(columnData[col.id] || []).map(client => (
                  <ClientCard key={client.id} client={client} onClick={onClientClick} />
                ))}
                {(columnData[col.id] || []).length === 0 && (
                  <div className="text-center py-8 text-xs" style={{ color: 'var(--muted)' }}>
                    No clients
                  </div>
                )}
              </SortableContext>
            </div>
          </div>
        ))}
      </div>
    </DndContext>
  )
}
