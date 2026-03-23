import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, X, UserCheck, Clock, Shield, CheckCircle2,
  AlertTriangle, ChevronRight, Phone, MessageSquare,
  FileText, Plus, Filter, RefreshCw, Loader2,
  CalendarDays, Building2, CreditCard, User,
  Check, Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000') + '/api/modules/onboarding';

async function api(path, options = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  const json = await resp.json();
  return json.data;
}

// ─── Status badge colors ───
const STATUS_COLORS = {
  'New': 'bg-slate-100 text-slate-700',
  'Paperwork Pending': 'bg-amber-100 text-amber-800',
  'Insurance Pending': 'bg-orange-100 text-orange-800',
  'Verified': 'bg-blue-100 text-blue-700',
  'Ready': 'bg-emerald-100 text-emerald-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

const STAGE_ORDER = ['New', 'Paperwork Pending', 'Insurance Pending', 'Verified', 'Ready'];
const STAGE_LABELS = ['Scheduled', 'Paperwork', 'Insurance', 'Verified', 'Ready'];

function StatusBadge({ status }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status] || 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  );
}

function ProgressBar({ pct, size = 'sm' }) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  return (
    <div className={cn('w-full bg-gray-200 rounded-full', h)}>
      <div
        className={cn('rounded-full transition-all', h,
          pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
        )}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={cn('animate-pulse bg-gray-200 rounded', className)} />;
}

// ─── KPI Card ───
function KpiCard({ label, value, icon: Icon, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all text-left flex-1 min-w-0',
        active ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      <div className={cn('p-2 rounded-lg', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 truncate">{label}</div>
      </div>
    </button>
  );
}

// ─── OUTREACH LOG MODAL ───
function OutreachModal({ clientName, onClose, onSubmit }) {
  const [method, setMethod] = useState('SP Reminder');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ client_name: clientName, method, notes });
      onClose();
    } catch (err) {
      alert('Failed to log outreach: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-96 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Log Outreach</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{clientName}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Method</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {['SP Reminder', 'Google Text', 'LVM', 'EMW', 'Final Reminder', 'Other'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Optional notes..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Log Outreach
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── CLIENT DRAWER ───
function ClientDrawer({ clientName, onClose, onRefresh }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('checklist');
  const [notesValue, setNotesValue] = useState('');
  const [notesSaved, setNotesSaved] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({});
  const notesTimer = useRef(null);

  // Outreach inline form
  const [showOutreachForm, setShowOutreachForm] = useState(false);
  const [outreachMethod, setOutreachMethod] = useState('SP Reminder');
  const [outreachNotes, setOutreachNotes] = useState('');
  const [outreachSubmitting, setOutreachSubmitting] = useState(false);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api(`/get/${encodeURIComponent(clientName)}`);
      setClient(data);
      setNotesValue(data.notes || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientName]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  // Auto-save notes
  const saveNotes = useCallback(async (val) => {
    try {
      await api(`/update/${encodeURIComponent(clientName)}`, {
        method: 'POST',
        body: JSON.stringify({ notes: val }),
      });
      setNotesSaved(new Date());
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  }, [clientName]);

  const handleNotesChange = (val) => {
    setNotesValue(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => saveNotes(val), 1000);
  };

  // Toggle checklist item
  const handleToggle = async (item) => {
    const newComplete = !item.is_complete;
    // Optimistic update
    setClient(prev => ({
      ...prev,
      onboarding_checklist: prev.onboarding_checklist.map(i =>
        i.item_name === item.item_name ? { ...i, is_complete: newComplete ? 1 : 0 } : i
      ),
    }));

    try {
      const updated = await api('/checklist/toggle', {
        method: 'POST',
        body: JSON.stringify({
          client_name: clientName,
          item_name: item.item_name,
          is_complete: newComplete,
        }),
      });
      setClient(updated);
      if (onRefresh) onRefresh();
    } catch (err) {
      // Revert
      fetchClient();
    }
  };

  // Log outreach
  const handleOutreachSubmit = async (e) => {
    e.preventDefault();
    setOutreachSubmitting(true);
    try {
      const updated = await api('/outreach/log', {
        method: 'POST',
        body: JSON.stringify({
          client_name: clientName,
          method: outreachMethod,
          notes: outreachNotes,
        }),
      });
      setClient(updated);
      setShowOutreachForm(false);
      setOutreachNotes('');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setOutreachSubmitting(false);
    }
  };

  // Save details edit
  const handleDetailsSave = async () => {
    try {
      const updated = await api(`/update/${encodeURIComponent(clientName)}`, {
        method: 'POST',
        body: JSON.stringify(editFields),
      });
      setClient(updated);
      setEditMode(false);
      setEditFields({});
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed top-0 right-0 w-[480px] h-full bg-white shadow-2xl z-50 border-l border-gray-200 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed top-0 right-0 w-[480px] h-full bg-white shadow-2xl z-50 border-l border-gray-200 p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        <p className="text-red-600 mt-12">{error}</p>
        <button onClick={fetchClient} className="mt-2 text-teal-600 text-sm">Retry</button>
      </div>
    );
  }

  const stageIndex = STAGE_ORDER.indexOf(client.onboarding_status);
  const checklist = client.onboarding_checklist || [];
  const visibleChecklist = checklist.filter(item =>
    !(item.applies_to_self_pay_only && !client.self_pay)
  );
  const requiredItems = visibleChecklist.filter(i => i.is_required);
  const requiredDone = requiredItems.filter(i => i.is_complete).length;

  const outreach = [...(client.outreach_log || [])].sort((a, b) =>
    new Date(b.attempt_date) - new Date(a.attempt_date)
  );

  const METHOD_COLORS = {
    'SP Reminder': 'bg-blue-500',
    'Google Text': 'bg-green-500',
    'LVM': 'bg-purple-500',
    'EMW': 'bg-orange-500',
    'Final Reminder': 'bg-red-500',
    'Other': 'bg-gray-500',
  };

  return (
    <div className="fixed top-0 right-0 w-[480px] h-full bg-white shadow-2xl z-50 border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900 pr-8">{client.client_name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={client.onboarding_status} />
          <span className="text-xs text-gray-500">
            {client.assigned_clinician} | {client.assigned_staff} | Added {client.date_added}
          </span>
        </div>

        {/* Stage progress bar */}
        <div className="flex items-center gap-1 mt-3">
          {STAGE_LABELS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center">
              <div className={cn(
                'w-full h-1.5 rounded-full',
                i <= stageIndex ? 'bg-teal-500' : 'bg-gray-200'
              )} />
              <span className={cn('text-[10px] mt-0.5',
                i <= stageIndex ? 'text-teal-700 font-medium' : 'text-gray-400'
              )}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {['checklist', 'outreach', 'notes', 'details'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'text-teal-700 border-b-2 border-teal-500'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{requiredDone} of {requiredItems.length} required items</span>
                <span className="font-medium">{client.completion_pct || 0}%</span>
              </div>
              <ProgressBar pct={client.completion_pct || 0} size="md" />
            </div>
            <div className="space-y-1">
              {visibleChecklist.map(item => (
                <button
                  key={item.item_name}
                  onClick={() => handleToggle(item)}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors',
                    'hover:bg-gray-50'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    item.is_complete
                      ? 'bg-teal-500 border-teal-500'
                      : 'border-gray-300'
                  )}>
                    {item.is_complete ? <Check className="w-3 h-3 text-white" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn('text-sm', item.is_complete && 'line-through text-gray-400')}>
                      {item.item_name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.is_required
                        ? <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Required</span>
                        : <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Optional</span>
                      }
                      {item.is_complete && item.completed_by && (
                        <span className="text-[10px] text-gray-400">
                          {item.completed_by} · {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* OUTREACH TAB */}
        {activeTab === 'outreach' && (
          <div>
            <button
              onClick={() => setShowOutreachForm(!showOutreachForm)}
              className="w-full mb-4 flex items-center justify-center gap-2 py-2 border border-dashed border-teal-400 rounded-lg text-teal-600 text-sm hover:bg-teal-50"
            >
              <Plus className="w-4 h-4" /> Log Outreach
            </button>

            {showOutreachForm && (
              <form onSubmit={handleOutreachSubmit} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
                <select
                  value={outreachMethod}
                  onChange={e => setOutreachMethod(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  {['SP Reminder', 'Google Text', 'LVM', 'EMW', 'Final Reminder', 'Other'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <textarea
                  value={outreachNotes}
                  onChange={e => setOutreachNotes(e.target.value)}
                  rows={2}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="Notes..."
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={outreachSubmitting}
                    className="flex-1 bg-teal-600 text-white rounded py-1.5 text-sm hover:bg-teal-700 disabled:opacity-50"
                  >
                    {outreachSubmitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOutreachForm(false)}
                    className="px-3 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {outreach.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No outreach logged yet</p>
            ) : (
              <div className="space-y-3">
                {outreach.map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5', METHOD_COLORS[entry.method] || 'bg-gray-400')} />
                      {i < outreach.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xs font-medium px-1.5 py-0.5 rounded',
                          'bg-gray-100 text-gray-700'
                        )}>{entry.method}</span>
                        <span className="text-xs text-gray-400">{entry.staff_initials}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {entry.attempt_date ? new Date(entry.attempt_date).toLocaleString() : ''}
                      </p>
                      {entry.notes && <p className="text-sm text-gray-700 mt-1">{entry.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div>
            <textarea
              value={notesValue}
              onChange={e => handleNotesChange(e.target.value)}
              rows={12}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Add notes about this client..."
            />
            {notesSaved && (
              <p className="text-xs text-gray-400 mt-1">
                Last saved: {notesSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div>
            <div className="flex justify-end mb-3">
              {editMode ? (
                <div className="flex gap-2">
                  <button onClick={handleDetailsSave} className="text-sm text-teal-600 hover:text-teal-800 font-medium">Save</button>
                  <button onClick={() => { setEditMode(false); setEditFields({}); }} className="text-sm text-gray-500">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setEditMode(true)} className="text-sm text-teal-600 hover:text-teal-800">Edit</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Employer', field: 'employer' },
                { label: 'Primary Insurance', field: 'insurance_primary' },
                { label: 'Secondary Insurance', field: 'insurance_secondary' },
                { label: 'Member ID', field: 'member_id' },
                { label: 'Custody Agreement', field: 'custody_agreement_required', check: true },
                { label: 'Self Pay', field: 'self_pay', check: true },
                { label: 'GFE Sent', field: 'gfe_sent', check: true },
                { label: 'Insurance Card Uploaded', field: 'insurance_card_uploaded', check: true },
                { label: 'Insurance Verified', field: 'insurance_verified', check: true },
                { label: 'SP Note Added', field: 'sp_note_added', check: true },
                { label: 'Insurance Updated in SP', field: 'insurance_updated_in_sp', check: true },
              ].map(({ label, field, check }) => (
                <div key={field} className="p-2 bg-gray-50 rounded">
                  <label className="text-[10px] font-medium text-gray-500 uppercase block">{label}</label>
                  {editMode && !check ? (
                    <input
                      className="text-sm border rounded px-2 py-1 w-full mt-0.5"
                      value={editFields[field] !== undefined ? editFields[field] : (client[field] || '')}
                      onChange={e => setEditFields(prev => ({ ...prev, [field]: e.target.value }))}
                    />
                  ) : check ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      {client[field] ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300" />
                      )}
                      <span className="text-sm">{client[field] ? 'Yes' : 'No'}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 mt-0.5">{client[field] || '—'}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MY TASKS VIEW ───
function MyTasksView({ clients, onViewClient }) {
  const staffInitials = 'JI'; // POC: hardcoded dev user
  const now = new Date();
  const myClients = clients.filter(c => c.assigned_staff === staffInitials && c.onboarding_status !== 'Cancelled');

  const overdue = myClients.filter(c => {
    if (!c.first_appointment_date) return false;
    return new Date(c.first_appointment_date) < now && c.onboarding_status !== 'Ready';
  });
  const today = myClients.filter(c => {
    if (!c.first_appointment_date) return false;
    const d = new Date(c.first_appointment_date);
    return d.toDateString() === now.toDateString() && c.onboarding_status !== 'Ready';
  });
  const upcoming = myClients.filter(c => {
    if (!c.first_appointment_date) return false;
    const d = new Date(c.first_appointment_date);
    const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
    return d > now && d <= in7 && c.onboarding_status !== 'Ready';
  });

  const renderGroup = (title, items, color) => (
    <div className="mb-4">
      <h3 className={cn('text-sm font-semibold mb-2', color)}>{title} ({items.length})</h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 pl-2">None</p>
      ) : (
        <div className="space-y-1">
          {items.map(c => (
            <div key={c.name} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 hover:border-gray-200">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">{c.client_name}</span>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{c.assigned_clinician}</span>
                  <span>·</span>
                  <span>{c.first_appointment_date ? new Date(c.first_appointment_date).toLocaleDateString() : '—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.onboarding_status} />
                <button
                  onClick={() => onViewClient(c.client_name)}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4">
      {renderGroup('Overdue', overdue, 'text-red-600')}
      {renderGroup('Due Today', today, 'text-amber-600')}
      {renderGroup('Upcoming (7 Days)', upcoming, 'text-blue-600')}
    </div>
  );
}

// ─── MAIN COMPONENT ───
export default function OnboardingMojo({ isMaximized }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('queue'); // queue | tasks
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [drawerClient, setDrawerClient] = useState(null);
  const [outreachModal, setOutreachModal] = useState(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('/list');
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Filter logic
  const filtered = clients.filter(c => {
    if (filter === 'urgent') return c.urgency_level === 'urgent';
    if (filter === 'insurance') return c.onboarding_status === 'Insurance Pending';
    if (filter === 'paperwork') return c.onboarding_status === 'Paperwork Pending';
    if (filter === 'ready') return c.onboarding_status === 'Ready';
    return true;
  }).filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.client_name?.toLowerCase().includes(s) || c.assigned_clinician?.toLowerCase().includes(s);
  });

  // KPI computations
  const activeQueue = clients.filter(c => !['Ready', 'Cancelled'].includes(c.onboarding_status)).length;
  const urgentCount = clients.filter(c => c.urgency_level === 'urgent').length;
  const insurancePending = clients.filter(c => c.onboarding_status === 'Insurance Pending').length;
  const readyThisWeek = clients.filter(c => c.onboarding_status === 'Ready').length;

  const handleOutreachSubmit = async (data) => {
    await api('/outreach/log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    fetchClients();
  };

  if (error && !clients.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-gray-600 mb-2">Failed to load onboarding data</p>
        <p className="text-sm text-gray-400 mb-4">{error}</p>
        <button onClick={fetchClients} className="text-teal-600 text-sm font-medium flex items-center gap-1">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 text-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-teal-600" />
          <h1 className="text-base font-semibold">Onboarding</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveView('queue')}
            className={cn(
              'px-3 py-1.5 rounded text-sm font-medium transition-colors',
              activeView === 'queue' ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Queue
          </button>
          <button
            onClick={() => setActiveView('tasks')}
            className={cn(
              'px-3 py-1.5 rounded text-sm font-medium transition-colors',
              activeView === 'tasks' ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            My Tasks
          </button>
          <button
            onClick={fetchClients}
            className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 rounded"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {activeView === 'tasks' ? (
        <MyTasksView clients={clients} onViewClient={setDrawerClient} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* KPI Cards */}
          <div className="p-4 pb-2">
            <div className="flex gap-3">
              <KpiCard
                label="Active Queue" value={activeQueue} icon={UserCheck}
                color="bg-teal-100 text-teal-700"
                active={filter === 'all'} onClick={() => setFilter('all')}
              />
              <KpiCard
                label="Urgent" value={urgentCount} icon={AlertTriangle}
                color="bg-red-100 text-red-700"
                active={filter === 'urgent'} onClick={() => setFilter('urgent')}
              />
              <KpiCard
                label="Pending Insurance" value={insurancePending} icon={Shield}
                color="bg-orange-100 text-orange-700"
                active={filter === 'insurance'} onClick={() => setFilter('insurance')}
              />
              <KpiCard
                label="Ready" value={readyThisWeek} icon={CheckCircle2}
                color="bg-emerald-100 text-emerald-700"
                active={filter === 'ready'} onClick={() => setFilter('ready')}
              />
            </div>
          </div>

          {/* Filter chips + search */}
          <div className="px-4 pb-3 flex items-center gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'urgent', label: 'Urgent' },
              { key: 'insurance', label: 'Pending Insurance' },
              { key: 'paperwork', label: 'Needs Paperwork' },
              { key: 'ready', label: 'Ready' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  filter === f.key
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                )}
              >
                {f.label}
              </button>
            ))}
            <div className="flex-1" />
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-48 focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          {/* Table */}
          <div className="px-4 pb-4">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No clients match your current filters</p>
                <button onClick={() => { setFilter('all'); setSearch(''); }} className="text-teal-600 text-sm mt-1">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="text-left py-2.5 px-3 font-medium">Client</th>
                      <th className="text-left py-2.5 px-2 font-medium">Clinician</th>
                      <th className="text-left py-2.5 px-2 font-medium">Appointment</th>
                      <th className="text-left py-2.5 px-2 font-medium w-24">Progress</th>
                      <th className="text-left py-2.5 px-2 font-medium">Insurance</th>
                      <th className="text-left py-2.5 px-2 font-medium">Status</th>
                      <th className="text-right py-2.5 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(c => (
                      <tr
                        key={c.name}
                        className={cn(
                          'hover:bg-gray-50 transition-colors',
                          c.urgency_level === 'urgent' && 'border-l-[3px] border-l-red-500',
                          c.urgency_level === 'warning' && 'border-l-[3px] border-l-amber-500',
                        )}
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-gray-900">{c.client_name}</span>
                        </td>
                        <td className="py-2.5 px-2 text-gray-600">{c.assigned_clinician}</td>
                        <td className="py-2.5 px-2 text-gray-600 text-xs">
                          {c.first_appointment_date
                            ? new Date(c.first_appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><ProgressBar pct={c.completion_pct || 0} /></div>
                            <span className="text-xs text-gray-500 w-8 text-right">{c.completion_pct || 0}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-xs text-gray-600">{c.insurance_primary || '—'}</td>
                        <td className="py-2.5 px-2"><StatusBadge status={c.onboarding_status} /></td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDrawerClient(c.client_name)}
                              className="text-xs text-teal-600 hover:text-teal-800 font-medium px-2 py-1 rounded hover:bg-teal-50"
                            >
                              View
                            </button>
                            <button
                              onClick={() => setOutreachModal(c.client_name)}
                              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client Drawer */}
      {drawerClient && (
        <ClientDrawer
          clientName={drawerClient}
          onClose={() => setDrawerClient(null)}
          onRefresh={fetchClients}
        />
      )}

      {/* Outreach Modal */}
      {outreachModal && (
        <OutreachModal
          clientName={outreachModal}
          onClose={() => setOutreachModal(null)}
          onSubmit={handleOutreachSubmit}
        />
      )}
    </div>
  );
}
