import { useState, useEffect, useRef, useContext } from 'react'
import { Building2, Plus, Pencil, X } from 'lucide-react'
import { fetchClinicianNPIs } from '../../services/sheets'
import { addClinicianNPI, updateClinicianNPI } from '../../services/sheetsWrite'
import { useAuth } from '../../contexts/auth'
import { ToastContext } from '../../hooks/useToast'

const ORG_INFO = {
  name: 'Willow Center',
  tin: '812069415',
  billingNpi: '1336596550',
}

const EMPTY_FORM = { name: '', npi: '', supervisor: '', supervisorNpi: '', supervisionNotes: '' }

export default function StaffRegistry() {
  const { accessToken, user } = useAuth()
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const [clinicians, setClinicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!accessToken || loadedRef.current) return
    loadedRef.current = true
    fetchClinicianNPIs(accessToken).then(data => {
      setClinicians(data)
      setLoading(false)
    }).catch(err => {
      setFetchError(err.message || 'Failed to load clinician data')
      setLoading(false)
    })
  }, [accessToken])

  const reload = async () => {
    const data = await fetchClinicianNPIs(accessToken)
    setClinicians(data)
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { toast?.error('Name is required'); return }
    try {
      await addClinicianNPI(accessToken, form, user?.email)
      toast?.success(`${form.name} added to registry`)
      setForm({ ...EMPTY_FORM })
      setShowForm(false)
      await reload()
    } catch (err) {
      toast?.error(`Failed to add: ${err.message}`)
    }
  }

  const handleEdit = (c) => {
    setEditingRow(c)
    setForm({ name: c.name, npi: c.npi, supervisor: c.supervisor, supervisorNpi: c.supervisorNpi, supervisionNotes: c.supervisionNotes })
  }

  const handleSaveEdit = async () => {
    if (!form.name.trim()) { toast?.error('Name is required'); return }
    try {
      await updateClinicianNPI(accessToken, editingRow.rowIndex, form, user?.email)
      toast?.success(`${form.name} updated`)
      setEditingRow(null)
      setForm({ ...EMPTY_FORM })
      await reload()
    } catch (err) {
      toast?.error(`Failed to update: ${err.message}`)
    }
  }

  const closeForm = () => { setShowForm(false); setEditingRow(null); setForm({ ...EMPTY_FORM }) }

  return (
    <div className="flex-1 p-6" style={{ fontFamily: "'Sora', sans-serif" }}>
      {/* Org Info Card */}
      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={18} style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Organization</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Practice Name</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{ORG_INFO.name}</div>
          </div>
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>TIN</div>
            <div className="text-sm font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>{ORG_INFO.tin}</div>
          </div>
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Billing NPI</div>
            <div className="text-sm font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>{ORG_INFO.billingNpi}</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Clinician NPIs</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            {clinicians.length} clinicians
          </span>
        </div>
        <button
          onClick={() => { setForm({ ...EMPTY_FORM }); setShowForm(true); setEditingRow(null) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent)', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={16} /> Add Clinician
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>Loading...</div>
      ) : fetchError ? (
        <div className="text-center py-20">
          <p className="text-sm mb-3" style={{ color: 'var(--red)' }}>{fetchError}</p>
          <button
            onClick={() => {
              setFetchError(null)
              setLoading(true)
              fetchClinicianNPIs(accessToken).then(data => {
                setClinicians(data)
                setLoading(false)
              }).catch(err => {
                setFetchError(err.message || 'Failed to load clinician data')
                setLoading(false)
              })
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent)', border: 'none', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      ) : clinicians.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
          <p className="text-sm">No clinician NPI records found. Add clinicians to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Clinician Name', 'Individual NPI', 'Supervisor Name', 'Supervisor NPI', 'Notes / Supervision Details', ''].map(col => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clinicians.map(c => (
                  <tr key={`${c.name}-${c.rowIndex}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>{c.name}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "'IBM Plex Mono', monospace", color: c.npi ? 'var(--text)' : 'var(--muted)' }}>{c.npi || '—'}</td>
                    <td className="px-4 py-3" style={{ color: c.supervisor ? 'var(--text)' : 'var(--muted)' }}>{c.supervisor || '—'}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "'IBM Plex Mono', monospace", color: c.supervisorNpi ? 'var(--text)' : 'var(--muted)' }}>{c.supervisorNpi || '—'}</td>
                    <td className="px-4 py-3" style={{ color: c.supervisionNotes ? 'var(--text)' : 'var(--muted)', maxWidth: '300px' }}>
                      {c.supervisionNotes || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1.5 rounded-md"
                        style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showForm || editingRow) && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeForm} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl shadow-2xl p-6" style={{ backgroundColor: 'var(--surface)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  {editingRow ? 'Edit Clinician' : 'Add Clinician'}
                </h3>
                <button onClick={closeForm} className="p-1 rounded" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Clinician Name *</label>
                  <input
                    type="text" placeholder="Full Name" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Individual NPI</label>
                  <input
                    type="text" placeholder="NPI Number" value={form.npi}
                    onChange={(e) => setForm({ ...form, npi: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Supervisor Name</label>
                    <input
                      type="text" placeholder="Supervisor Name" value={form.supervisor}
                      onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Supervisor NPI</label>
                    <input
                      type="text" placeholder="Supervisor NPI" value={form.supervisorNpi}
                      onChange={(e) => setForm({ ...form, supervisorNpi: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'IBM Plex Mono', monospace" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Notes / Supervision Details</label>
                  <textarea
                    placeholder="Notes..." value={form.supervisionNotes}
                    onChange={(e) => setForm({ ...form, supervisionNotes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    rows={2}
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={closeForm} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={editingRow ? handleSaveEdit : handleAdd}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--accent)', border: 'none', cursor: 'pointer' }}
                >
                  {editingRow ? 'Save Changes' : 'Add Clinician'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
