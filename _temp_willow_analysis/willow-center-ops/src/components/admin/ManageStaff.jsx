import { useState, useEffect, useContext, useRef } from 'react'
import { Plus, UserX, Pencil, X, UserCheck } from 'lucide-react'
import { getStaff, seedStaffFromNPIs } from '../../services/sheets'
import { addStaff, deactivateStaff, updateStaffRecord, createTask } from '../../services/sheetsWrite'
import { getOnboardingClients } from '../../services/sheets'
import { ToastContext } from '../../hooks/useToast'

const EMPTY_FORM = { name: '', initials: '', email: '', role: 'Clinician', npi: '', supervisor: '', supervisorNpi: '', supervisionNotes: '' }

export default function ManageStaff({ accessToken, userEmail, onRefresh, staff: propStaff, setStaff: propSetStaff }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const [staffList, setStaffList] = useState(propStaff || [])
  const [loading, setLoading] = useState(!propStaff?.length)
  const [showAdd, setShowAdd] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [showInactive, setShowInactive] = useState(false)
  const seededRef = useRef(false)

  // Seed from Clinician NPIs on first load if Staff tab is empty
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    async function loadAndSeed() {
      setLoading(true)
      try {
        const seeded = await seedStaffFromNPIs(accessToken, userEmail)
        if (seeded.length > 0) {
          setStaffList(seeded)
          propSetStaff?.(seeded)
        } else {
          const s = await getStaff(accessToken)
          setStaffList(s)
          propSetStaff?.(s)
        }
      } catch {
        try {
          const s = await getStaff(accessToken)
          setStaffList(s)
        } catch {
          setStaffList([])
        }
      }
      setLoading(false)
    }
    loadAndSeed()
  }, [accessToken, userEmail, propSetStaff])

  const loadStaff = async () => {
    setLoading(true)
    try {
      const s = await getStaff(accessToken)
      setStaffList(s)
      propSetStaff?.(s)
    } catch {
      setStaffList([])
    }
    setLoading(false)
  }

  const suggestInitials = (name) => {
    return name.split(' ').map(w => w[0]?.toUpperCase() || '').join('')
  }

  const handleAdd = async () => {
    if (!form.name || !form.initials) {
      toast?.error('Name and initials are required')
      return
    }
    try {
      await addStaff(accessToken, form, userEmail)
      toast?.success(`${form.name} added`)
      setForm({ ...EMPTY_FORM })
      setShowAdd(false)
      await loadStaff()
      onRefresh?.()
    } catch (err) {
      toast?.error(`Failed to add: ${err.message}`)
    }
  }

  const handleEdit = (staff) => {
    setEditingStaff(staff)
    setForm({
      name: staff.name,
      initials: staff.initials,
      email: staff.email,
      role: staff.role,
      npi: staff.npi,
      supervisor: staff.supervisor,
      supervisorNpi: staff.supervisorNpi,
      supervisionNotes: staff.supervisionNotes,
    })
  }

  const handleSaveEdit = async () => {
    if (!form.name || !form.initials) {
      toast?.error('Name and initials are required')
      return
    }
    try {
      await updateStaffRecord(accessToken, editingStaff.rowIndex, { ...form, status: editingStaff.status }, userEmail)
      toast?.success(`${form.name} updated`)
      setEditingStaff(null)
      setForm({ ...EMPTY_FORM })
      await loadStaff()
      onRefresh?.()
    } catch (err) {
      toast?.error(`Failed to update: ${err.message}`)
    }
  }

  const handleToggleActive = async (staff) => {
    const newStatus = staff.status === 'Active' ? 'Inactive' : 'Active'
    if (newStatus === 'Inactive') {
      setConfirmDeactivate(staff)
      return
    }
    try {
      await updateStaffRecord(accessToken, staff.rowIndex, { ...staff, status: 'Active' }, userEmail)
      toast?.success(`${staff.name} reactivated`)
      await loadStaff()
      onRefresh?.()
    } catch (err) {
      toast?.error(`Failed to reactivate: ${err.message}`)
    }
  }

  const handleDeactivate = async (staff) => {
    try {
      await deactivateStaff(accessToken, staff.initials, userEmail)
      const clients = await getOnboardingClients(accessToken)
      const affected = clients.filter(c => c.staffInitials === staff.initials)
      for (const client of affected) {
        await createTask(accessToken, {
          type: 'reassign',
          clientId: client.id,
          assignedTo: '',
          description: `Reassign ${client.clientName} from deactivated staff ${staff.name}`,
        }, userEmail)
      }
      toast?.success(`${staff.name} deactivated. ${affected.length} reassignment tasks created.`)
      setConfirmDeactivate(null)
      await loadStaff()
      onRefresh?.()
    } catch (err) {
      toast?.error(`Failed to deactivate: ${err.message}`)
    }
  }

  const activeStaff = staffList.filter(s => s.status === 'Active')
  const inactiveStaff = staffList.filter(s => s.status !== 'Active')
  const displayList = showInactive ? staffList : activeStaff

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Manage Staff</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            {activeStaff.length} active
          </span>
          {inactiveStaff.length > 0 && (
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: showInactive ? '#F3F4F6' : 'transparent', color: 'var(--muted)' }}
            >
              {showInactive ? 'Hide' : 'Show'} {inactiveStaff.length} inactive
            </button>
          )}
        </div>
        <button
          onClick={() => { setForm({ ...EMPTY_FORM }); setShowAdd(true); setEditingStaff(null) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>Loading...</div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
          <UserCheck size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No staff records yet. Add staff or seed from Clinician NPIs tab.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Name', 'Initials', 'NPI', 'Supervisor', 'Supervisor NPI', 'Role', 'Email', 'Status', 'Actions'].map(col => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayList.map(s => (
                  <tr key={`${s.name}-${s.initials}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: s.status === 'Active' ? 'var(--text)' : 'var(--muted)' }}>{s.name}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>{s.initials}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "'IBM Plex Mono', monospace", color: s.npi ? 'var(--text)' : 'var(--muted)' }}>{s.npi || '—'}</td>
                    <td className="px-4 py-3" style={{ color: s.supervisor ? 'var(--text)' : 'var(--muted)' }}>{s.supervisor || '—'}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "'IBM Plex Mono', monospace", color: s.supervisorNpi ? 'var(--text)' : 'var(--muted)' }}>{s.supervisorNpi || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text)' }}>{s.role}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{s.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium cursor-pointer"
                        style={{
                          backgroundColor: s.status === 'Active' ? '#EAF3DE' : '#F3F4F6',
                          color: s.status === 'Active' ? '#3B6D11' : '#6B7280',
                        }}
                        onClick={() => handleToggleActive(s)}
                        title={s.status === 'Active' ? 'Click to deactivate' : 'Click to reactivate'}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(s)}
                          className="p-1.5 rounded-md hover:bg-gray-100"
                          style={{ color: 'var(--accent)' }}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        {s.status === 'Active' && (
                          <button
                            onClick={() => setConfirmDeactivate(s)}
                            className="p-1.5 rounded-md hover:bg-gray-100"
                            style={{ color: 'var(--red)' }}
                            title="Deactivate"
                          >
                            <UserX size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supervision Notes (shown below table if any staff have them) */}
      {displayList.some(s => s.supervisionNotes) && (
        <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Supervision Notes</h3>
          <div className="space-y-2">
            {displayList.filter(s => s.supervisionNotes).map(s => (
              <div key={`note-${s.name}`} className="text-sm" style={{ color: 'var(--muted)' }}>
                <span className="font-medium" style={{ color: 'var(--text)' }}>{s.name}:</span> {s.supervisionNotes}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {(showAdd || editingStaff) && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => { setShowAdd(false); setEditingStaff(null) }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl shadow-2xl p-6" style={{ backgroundColor: 'var(--surface)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
                </h3>
                <button onClick={() => { setShowAdd(false); setEditingStaff(null) }} className="p-1 rounded" style={{ color: 'var(--muted)' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Full Name *</label>
                    <input
                      type="text" placeholder="Full Name" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value, ...(editingStaff ? {} : { initials: suggestInitials(e.target.value) }) })}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Initials *</label>
                    <input
                      type="text" placeholder="Initials" value={form.initials}
                      onChange={(e) => setForm({ ...form, initials: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'IBM Plex Mono', monospace" }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Email</label>
                    <input
                      type="email" placeholder="Email" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Role</label>
                    <select
                      value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      <option value="Clinician">Clinician</option>
                      <option value="Staff">Staff</option>
                      <option value="Admin">Admin</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="NP">Nurse Practitioner</option>
                    </select>
                  </div>
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
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Supervisor</label>
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
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Supervision Notes</label>
                  <textarea
                    placeholder="Supervision notes..." value={form.supervisionNotes}
                    onChange={(e) => setForm({ ...form, supervisionNotes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    rows={2}
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => { setShowAdd(false); setEditingStaff(null) }}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ color: 'var(--muted)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={editingStaff ? handleSaveEdit : handleAdd}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {editingStaff ? 'Save Changes' : 'Add Staff'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Deactivation confirm */}
      {confirmDeactivate && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setConfirmDeactivate(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl shadow-2xl p-6" style={{ backgroundColor: 'var(--surface)' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Deactivate Staff</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                Deactivate <strong>{confirmDeactivate.name}</strong>? They will be hidden from dropdowns. Reassignment tasks will be created for their clients.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDeactivate(null)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--muted)' }}>Cancel</button>
                <button onClick={() => handleDeactivate(confirmDeactivate)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--red)' }}>Deactivate</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
