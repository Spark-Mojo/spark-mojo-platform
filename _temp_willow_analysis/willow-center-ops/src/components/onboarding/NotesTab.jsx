import { useState, useContext } from 'react'
import { appendNote } from '../../services/sheetsWrite'
import { ToastContext } from '../../hooks/useToast'

function parseNotes(notesStr) {
  if (!notesStr) return []
  return notesStr.split(' | ').map(entry => {
    const match = entry.match(/^\[([^\]]+)\]\s*([^:]+):\s*(.+)$/)
    if (match) {
      return { initials: match[1], date: match[2].trim(), text: match[3].trim() }
    }
    return { initials: '?', date: '', text: entry.trim() }
  })
}

export default function NotesTab({ client, accessToken, userEmail, userInitials, onUpdate, readOnly = false }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const notes = parseNotes(client.notes)

  const handleAdd = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    try {
      await appendNote(accessToken, client.id, newNote.trim(), userInitials || '??', userEmail)
      toast?.success('Note added')
      setNewNote('')
      onUpdate?.()
    } catch (err) {
      toast?.error(`Failed to add note: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Notes thread */}
      <div className="space-y-3 mb-6">
        {notes.length === 0 ? (
          <div className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>No notes yet</div>
        ) : (
          notes.map((note, i) => (
            <div key={i} className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {note.initials}
              </div>
              <div className="flex-1">
                <div className="text-xs mb-0.5" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {note.date}
                </div>
                <div className="text-sm" style={{ color: 'var(--text)' }}>{note.text}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add note */}
      {!readOnly && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add a note..."
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newNote.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Add Note
          </button>
        </div>
      )}
    </div>
  )
}
