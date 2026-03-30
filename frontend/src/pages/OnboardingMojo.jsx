import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, X, UserCheck, Clock, Shield, CheckCircle2,
  AlertTriangle, ChevronRight, Phone, MessageSquare,
  FileText, Plus, Filter, RefreshCw, Loader2,
  CalendarDays, Building2, CreditCard, User,
  Check, Circle, Archive, RotateCcw, ArrowUp, ArrowDown,
  ArrowUpDown, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/mojo-patterns/StatusBadge';
import MojoHeader from '@/components/mojo-patterns/MojoHeader';
import StatsCardRow from '@/components/mojo-patterns/StatsCardRow';
import FilterTabBar from '@/components/mojo-patterns/FilterTabBar';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000') + '/api/modules/onboarding';

async function api(path, options = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    let detail = `API error: ${resp.status}`;
    try { detail = JSON.parse(text).detail || detail; } catch {}
    throw new Error(detail);
  }
  const json = await resp.json();
  return json.data;
}

const STAGE_ORDER = ['New', 'Paperwork Pending', 'Insurance Pending', 'Verified', 'Ready'];
const STAGE_LABELS = ['Scheduled', 'Paperwork', 'Insurance', 'Verified', 'Ready'];

// ─── Animated Progress Bar (Task 10) ───
function AnimatedProgressBar({ pct, size = 'sm', animate = false, duration = 600 }) {
  const [displayPct, setDisplayPct] = useState(animate ? 0 : pct);
  const [displayNum, setDisplayNum] = useState(animate ? 0 : pct);
  const prevPct = useRef(pct);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = animate && prevPct.current === pct ? 0 : prevPct.current;
    const to = pct;
    const dur = animate && prevPct.current === pct ? duration : 300;
    prevPct.current = pct;

    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = from + (to - from) * eased;
      setDisplayPct(current);
      setDisplayNum(Math.round(current));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [pct, animate, duration]);

  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className={cn('flex-1 bg-gray-200 rounded-full', h)}>
        <div
          className={cn('rounded-full', h,
            displayPct >= 100 ? 'bg-[var(--sm-success)]' : displayPct >= 50 ? 'bg-[var(--sm-info)]' : 'bg-[var(--sm-warning)]'
          )}
          style={{ width: `${Math.min(displayPct, 100)}%` }}
        />
      </div>
      {size === 'md' && <span className="text-sm font-medium w-10 text-right">{displayNum}%</span>}
    </div>
  );
}

function ProgressBar({ pct, size = 'sm' }) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  return (
    <div className={cn('w-full bg-gray-200 rounded-full', h)}>
      <div
        className={cn('rounded-full transition-all', h,
          pct >= 100 ? 'bg-[var(--sm-success)]' : pct >= 50 ? 'bg-[var(--sm-info)]' : 'bg-[var(--sm-warning)]'
        )}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={cn('animate-pulse bg-gray-200 rounded', className)} />;
}

// ─── Toast notification ───
function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-[100] px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white transition-all',
      type === 'success' ? 'bg-[var(--sm-success)]' : type === 'error' ? 'bg-[var(--sm-danger)]' : 'bg-[var(--sm-info)]'
    )}>
      {message}
    </div>
  );
}

// ─── Appointment date formatting with color (Task 9) ───
function AppointmentDate({ date, status }) {
  if (!date) return <span className="text-gray-400">—</span>;

  const apptDate = new Date(date);
  const now = new Date();
  const diffMs = apptDate - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  const isActive = !['Ready', 'Cancelled'].includes(status);

  let colorClass = 'text-slate-600';
  if (isActive) {
    if (diffHours <= 48) colorClass = 'text-[var(--sm-danger)]';
    else if (diffHours <= 168) colorClass = 'text-[var(--sm-warning)]'; // 7 days
  }

  return (
    <span className={cn('font-mono text-xs', colorClass)}>
      {apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
    </span>
  );
}

// ─── Stage Indicator Dots (Task 8) ───
function StageIndicator({ status }) {
  const currentIdx = STAGE_ORDER.indexOf(status);
  const allComplete = status === 'Ready';

  return (
    <div className="flex items-center gap-1.5 mt-3">
      {STAGE_LABELS.map((label, i) => {
        const isComplete = allComplete || i < currentIdx;
        const isCurrent = !allComplete && i === currentIdx;
        const isFuture = !allComplete && i > currentIdx;

        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div className={cn('flex-1 h-0.5 rounded-full',
                isComplete || isCurrent ? 'bg-[var(--sm-primary)]' : 'bg-gray-200'
              )} />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div className="relative">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                  isComplete ? 'bg-[var(--sm-primary)] text-white' :
                  isCurrent ? 'bg-[var(--sm-primary)] text-white ring-4 ring-[color-mix(in_srgb,var(--sm-primary)_20%,transparent)] animate-pulse' :
                  'bg-gray-200 text-gray-400'
                )}>
                  {isComplete ? <Check className="w-3.5 h-3.5" /> : (i + 1)}
                </div>
              </div>
              <span className={cn('text-[9px] font-medium whitespace-nowrap',
                isComplete || isCurrent ? 'text-[var(--sm-primary)]' : 'text-gray-400'
              )}>{label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── ADD CLIENT MODAL (Task 2) ───
function AddClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    client_name: '', clinician: '', first_appointment_date: '',
    insurance_primary: '', insurance_secondary: '',
    self_pay: false, gfe_sent: false, custody_agreement_required: false,
    staff_initials: '', notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.client_name.trim()) errs.client_name = 'Client name is required';
    if (!form.clinician.trim()) errs.clinician = 'Clinician is required';
    if (!form.first_appointment_date) errs.first_appointment_date = 'First appointment is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api('/create', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onCreated();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[480px] max-h-[85vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Client</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Client Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Client Name *</label>
            <input type="text" value={form.client_name} onChange={e => set('client_name', e.target.value)}
              className={cn('w-full border rounded-lg px-3 py-2 text-sm', errors.client_name && 'border-red-400')} />
            {errors.client_name && <p className="text-xs text-[var(--sm-danger)] mt-0.5">{errors.client_name}</p>}
          </div>
          {/* Clinician */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Clinician *</label>
            <input type="text" value={form.clinician} onChange={e => set('clinician', e.target.value)}
              className={cn('w-full border rounded-lg px-3 py-2 text-sm', errors.clinician && 'border-red-400')} />
            {errors.clinician && <p className="text-xs text-[var(--sm-danger)] mt-0.5">{errors.clinician}</p>}
          </div>
          {/* First Appointment */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">First Appointment Date & Time *</label>
            <input type="datetime-local" value={form.first_appointment_date} onChange={e => set('first_appointment_date', e.target.value)}
              className={cn('w-full border rounded-lg px-3 py-2 text-sm', errors.first_appointment_date && 'border-red-400')} />
            {errors.first_appointment_date && <p className="text-xs text-[var(--sm-danger)] mt-0.5">{errors.first_appointment_date}</p>}
          </div>
          {/* Insurance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Primary Insurance</label>
              <input type="text" value={form.insurance_primary} onChange={e => set('insurance_primary', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Secondary Insurance</label>
              <input type="text" value={form.insurance_secondary} onChange={e => set('insurance_secondary', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.self_pay} onChange={e => set('self_pay', e.target.checked)}
                className="rounded border-gray-300" />
              Self Pay
            </label>
            {form.self_pay && (
              <label className="flex items-center gap-2 text-sm ml-6">
                <input type="checkbox" checked={form.gfe_sent} onChange={e => set('gfe_sent', e.target.checked)}
                  className="rounded border-gray-300" />
                GFE Sent
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.custody_agreement_required} onChange={e => set('custody_agreement_required', e.target.checked)}
                className="rounded border-gray-300" />
              Custody Agreement Required
            </label>
          </div>
          {/* Staff Initials */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Staff Initials</label>
            <input type="text" value={form.staff_initials} onChange={e => set('staff_initials', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" maxLength={5} />
          </div>
          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Optional notes..." />
          </div>
          {errors.submit && <p className="text-sm text-[var(--sm-danger)] bg-[var(--sm-glass-danger)] p-2 rounded">{errors.submit}</p>}
          <button type="submit" disabled={submitting}
            className="w-full bg-[var(--sm-danger)] text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Client
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── ARCHIVE MODAL (Task 3) ───
const ARCHIVE_REASONS = [
  'Client decided not to proceed',
  'Insurance not accepted',
  'Unable to contact client',
  'Client found another provider',
  'Financial concerns',
  'Scheduling conflicts',
  'Other',
];

function ArchiveModal({ clientName, onClose, onArchived }) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      await api(`/archive/${encodeURIComponent(clientName)}`, {
        method: 'POST',
        body: JSON.stringify({ reason, notes }),
      });
      onArchived();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-96 p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-1">Archive Client</h3>
        <p className="text-sm text-gray-500 mb-4">Select a reason for archiving {clientName}</p>
        <div className="space-y-3">
          <select value={reason} onChange={e => setReason(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Select a reason...</option>
            {ARCHIVE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {reason === 'Other' && (
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Additional notes..." />
          )}
          {error && <p className="text-sm text-[var(--sm-danger)]">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSubmit} disabled={!reason || submitting}
              className="flex-1 px-4 py-2 text-sm text-white bg-[var(--sm-danger)] rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Archive Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REACTIVATE MODAL (Task 4) ───
function ReactivateModal({ clientName, onClose, onReactivated }) {
  const [appointmentDate, setAppointmentDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!appointmentDate) return;
    setSubmitting(true);
    setError(null);
    try {
      await api(`/reactivate/${encodeURIComponent(clientName)}`, {
        method: 'POST',
        body: JSON.stringify({ first_appointment_date: appointmentDate }),
      });
      onReactivated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-96 p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-1">Reactivate Client</h3>
        <p className="text-sm text-gray-500 mb-4">Return {clientName} to the active onboarding queue?</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">First Appointment Date *</label>
            <input type="datetime-local" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-sm text-[var(--sm-danger)]">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSubmit} disabled={!appointmentDate || submitting}
              className="flex-1 px-4 py-2 text-sm text-white bg-[var(--sm-success)] rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Reactivate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPLETE MODAL (Task 5) ───
function CompleteModal({ clientName, onClose, onCompleted }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api(`/complete/${encodeURIComponent(clientName)}`, { method: 'POST' });
      onCompleted();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-96 p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-1">Mark Complete</h3>
        <p className="text-sm text-gray-500 mb-4">Mark {clientName} as complete? This will move them to the completed clients history.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 px-4 py-2 text-sm text-white bg-[var(--sm-success)] rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── OUTREACH POPOVER (Task 7) ───
function OutreachPopover({ clientName, anchorRef, onClose, onSubmit }) {
  const [method, setMethod] = useState('SP Reminder');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onClose();
    };
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ client_name: clientName, method, notes });
      setSuccess(true);
      setTimeout(onClose, 800);
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div ref={popoverRef} className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 w-72">
        <div className="flex items-center gap-2 text-[var(--sm-success)]">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">Outreach logged</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={popoverRef} className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 w-72">
      <p className="text-xs font-semibold text-gray-700 mb-2">Log Outreach — {clientName}</p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <select value={method} onChange={e => setMethod(e.target.value)}
          className="w-full border rounded px-2 py-1.5 text-xs">
          {['SP Reminder', 'Google Text', 'LVM', 'EMW', 'Final Reminder', 'Other'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full border rounded px-2 py-1.5 text-xs" placeholder="Optional notes" />
        <button type="submit" disabled={submitting}
          className="w-full bg-[var(--sm-primary)] text-white rounded py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50">
          {submitting ? 'Saving...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}

// ─── OUTREACH LOG MODAL (existing, kept for drawer) ───
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
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {['SP Reminder', 'Google Text', 'LVM', 'EMW', 'Final Reminder', 'Other'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Optional notes..." />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full bg-[var(--sm-primary)] text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Log Outreach
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── CLIENT DRAWER ───
function ClientDrawer({ clientName, onClose, onRefresh, isHistorical }) {
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

  // Action modals
  const [showArchive, setShowArchive] = useState(false);
  const [showReactivate, setShowReactivate] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

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
        <p className="text-[var(--sm-danger)] mt-12">{error}</p>
        <button onClick={fetchClient} className="mt-2 text-[var(--sm-primary)] text-sm">Retry</button>
      </div>
    );
  }

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
    'SP Reminder': 'bg-[var(--sm-info)]',
    'Google Text': 'bg-[var(--sm-success)]',
    'LVM': 'bg-[var(--sm-primary)]',
    'EMW': 'bg-[var(--sm-warning)]',
    'Final Reminder': 'bg-[var(--sm-danger)]',
    'Other': 'bg-gray-500',
  };

  const canArchive = !['Cancelled', 'Ready'].includes(client.onboarding_status);
  const canReactivate = client.onboarding_status === 'Cancelled';
  const canComplete = client.onboarding_status === 'Ready';

  return (
    <div className="fixed top-0 right-0 w-[480px] h-full bg-white shadow-2xl z-50 border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-2">
            <h2 className="text-xl font-bold text-gray-900">{client.client_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge variant="status" value={client.onboarding_status} />
              <span className="text-xs text-gray-500">
                {client.assigned_clinician} | {client.assigned_staff} | Added {client.date_added}
              </span>
            </div>
            {/* Appointment date with color */}
            {client.first_appointment_date && (
              <div className="mt-1">
                <span className="text-xs text-gray-400">Appt: </span>
                <AppointmentDate date={client.first_appointment_date} status={client.onboarding_status} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Action buttons in drawer header */}
            {canArchive && (
              <button onClick={() => setShowArchive(true)}
                className="px-2 py-1 text-xs font-medium text-[var(--sm-danger)] hover:bg-[var(--sm-glass-danger)] rounded flex items-center gap-1">
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
            )}
            {canReactivate && (
              <button onClick={() => setShowReactivate(true)}
                className="px-2 py-1 text-xs font-medium text-[var(--sm-success)] hover:bg-[var(--sm-glass-primary)] rounded flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> Reactivate
              </button>
            )}
            {canComplete && (
              <button onClick={() => setShowComplete(true)}
                className="px-2 py-1 text-xs font-medium text-[var(--sm-success)] hover:bg-[var(--sm-glass-primary)] rounded flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stage Indicator Dots (Task 8) */}
        <StageIndicator status={client.onboarding_status} />
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
                ? 'text-[var(--sm-primary)] border-b-2 border-[var(--sm-primary)]'
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
              </div>
              <AnimatedProgressBar pct={client.completion_pct || 0} size="md" animate={true} duration={600} />
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
                      ? 'bg-[var(--sm-primary)] border-[var(--sm-primary)]'
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
                        ? <span className="text-[10px] font-medium text-[var(--sm-danger)] bg-[var(--sm-glass-danger)] px-1.5 py-0.5 rounded">Required</span>
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
              className="w-full mb-4 flex items-center justify-center gap-2 py-2 border border-dashed border-[var(--sm-primary)] rounded-lg text-[var(--sm-primary)] text-sm hover:bg-[var(--sm-glass-primary)]"
            >
              <Plus className="w-4 h-4" /> Log Outreach
            </button>

            {showOutreachForm && (
              <form onSubmit={handleOutreachSubmit} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
                <select value={outreachMethod} onChange={e => setOutreachMethod(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm">
                  {['SP Reminder', 'Google Text', 'LVM', 'EMW', 'Final Reminder', 'Other'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <textarea value={outreachNotes} onChange={e => setOutreachNotes(e.target.value)}
                  rows={2} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Notes..." />
                <div className="flex gap-2">
                  <button type="submit" disabled={outreachSubmitting}
                    className="flex-1 bg-[var(--sm-primary)] text-white rounded py-1.5 text-sm hover:opacity-90 disabled:opacity-50">
                    {outreachSubmitting ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setShowOutreachForm(false)}
                    className="px-3 text-sm text-gray-500 hover:text-gray-700">
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
                        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', 'bg-gray-100 text-gray-700')}>{entry.method}</span>
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
                  <button onClick={handleDetailsSave} className="text-sm text-[var(--sm-primary)] hover:opacity-80 font-medium">Save</button>
                  <button onClick={() => { setEditMode(false); setEditFields({}); }} className="text-sm text-gray-500">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setEditMode(true)} className="text-sm text-[var(--sm-primary)] hover:opacity-80">Edit</button>
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
                        <CheckCircle2 className="w-4 h-4 text-[var(--sm-success)]" />
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

      {/* Action modals */}
      {showArchive && (
        <ArchiveModal
          clientName={client.client_name}
          onClose={() => setShowArchive(false)}
          onArchived={() => { setShowArchive(false); onClose(); if (onRefresh) onRefresh(); }}
        />
      )}
      {showReactivate && (
        <ReactivateModal
          clientName={client.client_name}
          onClose={() => setShowReactivate(false)}
          onReactivated={() => { setShowReactivate(false); onClose(); if (onRefresh) onRefresh(); }}
        />
      )}
      {showComplete && (
        <CompleteModal
          clientName={client.client_name}
          onClose={() => setShowComplete(false)}
          onCompleted={() => { setShowComplete(false); onClose(); if (onRefresh) onRefresh(); }}
        />
      )}
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
                  <AppointmentDate date={c.first_appointment_date} status={c.onboarding_status} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge variant="status" value={c.onboarding_status} />
                <button onClick={() => onViewClient(c.client_name)}
                  className="text-xs text-[var(--sm-primary)] hover:opacity-80 font-medium">
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
      {renderGroup('Overdue', overdue, 'text-[var(--sm-danger)]')}
      {renderGroup('Due Today', today, 'text-[var(--sm-warning)]')}
      {renderGroup('Upcoming (7 Days)', upcoming, 'text-[var(--sm-info)]')}
    </div>
  );
}

// ─── HISTORICAL VIEW (Task 6) ───
function HistoricalView({ onViewClient, onReactivate }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [clinicianFilter, setClinicianFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status_filter', statusFilter);
      if (yearFilter !== 'all') params.set('year', yearFilter);
      if (clinicianFilter !== 'all') params.set('clinician', clinicianFilter);
      if (search) params.set('search', search);
      const data = await api(`/history?${params.toString()}`);
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, yearFilter, clinicianFilter, search]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const clinicians = useMemo(() => {
    const set = new Set(history.map(c => c.assigned_clinician).filter(Boolean));
    return [...set].sort();
  }, [history]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Filters */}
      <div className="p-4 pb-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All History' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                statusFilter === f.key
                  ? 'bg-[var(--sm-primary)] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              )}>
              {f.label}
            </button>
          ))}
          <div className="flex-1" />
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            className="border rounded-lg px-2 py-1 text-xs">
            <option value="all">All Years</option>
            {[2026, 2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={clinicianFilter} onChange={e => setClinicianFilter(e.target.value)}
            className="border rounded-lg px-2 py-1 text-xs">
            <option value="all">All Clinicians</option>
            {clinicians.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-40 focus:outline-none focus:border-[var(--sm-primary)]" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No historical records found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="text-left py-2.5 px-3 font-medium">Client</th>
                  <th className="text-left py-2.5 px-2 font-medium">Clinician</th>
                  <th className="text-left py-2.5 px-2 font-medium">First Appt</th>
                  <th className="text-left py-2.5 px-2 font-medium">Status</th>
                  <th className="text-left py-2.5 px-2 font-medium">Date</th>
                  <th className="text-left py-2.5 px-2 font-medium">Reason</th>
                  <th className="text-right py-2.5 px-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map(c => (
                  <tr key={c.name} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-gray-900">{c.client_name}</td>
                    <td className="py-2.5 px-2 text-gray-600">{c.assigned_clinician}</td>
                    <td className="py-2.5 px-2">
                      <AppointmentDate date={c.first_appointment_date} status={c.onboarding_status} />
                    </td>
                    <td className="py-2.5 px-2"><StatusBadge variant="status" value={c.onboarding_status} /></td>
                    <td className="py-2.5 px-2 text-xs text-gray-600 font-mono">
                      {c.onboarding_status === 'Ready'
                        ? (c.completed_date || '—')
                        : (c.archived_date || '—')}
                    </td>
                    <td className="py-2.5 px-2 text-xs text-gray-500 max-w-[150px] truncate">
                      {c.archive_reason || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onViewClient(c.client_name)}
                          className="text-xs text-[var(--sm-primary)] hover:opacity-80 font-medium px-2 py-1 rounded hover:bg-[var(--sm-glass-primary)]">
                          View
                        </button>
                        {c.onboarding_status === 'Cancelled' && (
                          <button onClick={() => onReactivate(c.client_name)}
                            className="text-xs text-[var(--sm-success)] hover:opacity-80 font-medium px-2 py-1 rounded hover:bg-[var(--sm-glass-primary)] flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Reactivate
                          </button>
                        )}
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
  );
}

// ─── SORTABLE COLUMN HEADER (Task 9) ───
function SortHeader({ label, field, sortField, sortDir, onSort, className }) {
  const isActive = sortField === field;
  return (
    <th
      className={cn('py-2.5 px-2 font-medium cursor-pointer select-none hover:bg-gray-100 transition-colors', className)}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[var(--sm-primary)]" /> : <ArrowDown className="w-3 h-3 text-[var(--sm-primary)]" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-gray-300" />
        )}
      </div>
    </th>
  );
}

// ─── MAIN COMPONENT ───
export default function OnboardingMojo({ isMaximized }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('queue'); // queue | tasks | history
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [drawerClient, setDrawerClient] = useState(null);
  const [outreachModal, setOutreachModal] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [toast, setToast] = useState(null);

  // Popover state (Task 7)
  const [outreachPopover, setOutreachPopover] = useState(null);

  // Reactivate modal (from history)
  const [reactivateClient, setReactivateClient] = useState(null);

  // Sort state (Task 9)
  const [sortField, setSortField] = useState('first_appointment_date');
  const [sortDir, setSortDir] = useState('asc');

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

  const showToast = (message, type = 'success') => setToast({ message, type });

  // Filter + sort logic
  const filtered = useMemo(() => {
    let result = clients.filter(c => {
      // Active queue excludes Ready and Cancelled
      if (!['Ready', 'Cancelled'].includes(c.onboarding_status)) {
        if (filter === 'urgent') return c.urgency_level === 'urgent';
        if (filter === 'insurance') return c.onboarding_status === 'Insurance Pending';
        if (filter === 'paperwork') return c.onboarding_status === 'Paperwork Pending';
        if (filter === 'ready') return false; // Ready clients are in history
        return true;
      }
      if (filter === 'ready') return c.onboarding_status === 'Ready';
      return false;
    }).filter(c => {
      if (!search) return true;
      const s = search.toLowerCase();
      return c.client_name?.toLowerCase().includes(s) || c.assigned_clinician?.toLowerCase().includes(s);
    });

    // Sort (Task 9)
    result.sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'first_appointment_date') {
        aVal = a.first_appointment_date ? new Date(a.first_appointment_date).getTime() : Infinity;
        bVal = b.first_appointment_date ? new Date(b.first_appointment_date).getTime() : Infinity;
      } else if (sortField === 'client_name') {
        aVal = (a.client_name || '').toLowerCase();
        bVal = (b.client_name || '').toLowerCase();
      } else if (sortField === 'onboarding_status') {
        const ORDER = { 'New': 0, 'Paperwork Pending': 1, 'Insurance Pending': 2, 'Verified': 3, 'Ready': 4, 'Cancelled': 5 };
        aVal = ORDER[a.onboarding_status] ?? 99;
        bVal = ORDER[b.onboarding_status] ?? 99;
      } else if (sortField === 'completion_pct') {
        aVal = a.completion_pct || 0;
        bVal = b.completion_pct || 0;
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [clients, filter, search, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

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
        <AlertTriangle className="w-10 h-10 text-[var(--sm-warning)] mb-3" />
        <p className="text-gray-600 mb-2">Failed to load onboarding data</p>
        <p className="text-sm text-gray-400 mb-4">{error}</p>
        <button onClick={fetchClients} className="text-[var(--sm-primary)] text-sm font-medium flex items-center gap-1">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 text-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex-shrink-0">
        <MojoHeader
          icon={<UserCheck className="w-5 h-5" />}
          title="Onboarding"
          actions={
            <div className="flex items-center gap-1">
              {['queue', 'tasks', 'history'].map(view => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={cn(
                    'px-3 py-1.5 rounded text-sm font-medium transition-colors capitalize',
                    activeView === view ? 'bg-[var(--sm-glass-primary)] text-[var(--sm-primary)]' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {view === 'tasks' ? 'My Tasks' : view === 'history' ? 'History' : 'Queue'}
                </button>
              ))}
              <button
                onClick={fetchClients}
                className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 rounded"
                title="Refresh"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          }
        />
      </div>

      {activeView === 'tasks' ? (
        <MyTasksView clients={clients} onViewClient={setDrawerClient} />
      ) : activeView === 'history' ? (
        <HistoricalView
          onViewClient={(name) => setDrawerClient(name)}
          onReactivate={(name) => setReactivateClient(name)}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* KPI Cards */}
          <div className="p-4 pb-2">
            <StatsCardRow cards={[
              { label: 'Active Queue', value: activeQueue, icon: <UserCheck className="w-4 h-4" />, color: 'primary', active: filter === 'all', onClick: () => setFilter('all') },
              { label: 'Urgent', value: urgentCount, icon: <AlertTriangle className="w-4 h-4" />, color: 'danger', active: filter === 'urgent', onClick: () => setFilter('urgent') },
              { label: 'Pending Insurance', value: insurancePending, icon: <Shield className="w-4 h-4" />, color: 'warning', active: filter === 'insurance', onClick: () => setFilter('insurance') },
              { label: 'Ready', value: readyThisWeek, icon: <CheckCircle2 className="w-4 h-4" />, color: 'green', active: filter === 'ready', onClick: () => setFilter('ready') },
            ]} />
          </div>

          {/* Filter chips + search + Add Client button */}
          <div className="px-4 pb-3">
            <FilterTabBar
              tabs={[
                { key: 'all', label: 'All' },
                { key: 'urgent', label: 'Urgent' },
                { key: 'insurance', label: 'Pending Insurance' },
                { key: 'paperwork', label: 'Needs Paperwork' },
                { key: 'ready', label: 'Ready' },
              ]}
              activeTab={filter}
              onTabChange={setFilter}
              rightContent={
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-48 focus:outline-none focus:border-[var(--sm-primary)]"
                    />
                  </div>
                  <button
                    onClick={() => setShowAddClient(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--sm-danger)] text-white text-xs font-medium rounded-lg hover:opacity-90 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Client
                  </button>
                </>
              }
            />
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
                <button onClick={() => { setFilter('all'); setSearch(''); }} className="text-[var(--sm-primary)] text-sm mt-1">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <SortHeader label="Client" field="client_name" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="text-left px-3" />
                      <th className="text-left py-2.5 px-2 font-medium">Clinician</th>
                      <SortHeader label="Appointment" field="first_appointment_date" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="text-left" />
                      <SortHeader label="Progress" field="completion_pct" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="text-left w-24" />
                      <th className="text-left py-2.5 px-2 font-medium">Insurance</th>
                      <SortHeader label="Status" field="onboarding_status" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="text-left" />
                      <th className="text-right py-2.5 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(c => (
                      <tr
                        key={c.name}
                        className={cn(
                          'hover:bg-gray-50 transition-colors',
                          c.urgency_level === 'urgent' && 'border-l-[3px] border-l-[var(--sm-danger)]',
                          c.urgency_level === 'warning' && 'border-l-[3px] border-l-[var(--sm-warning)]',
                        )}
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-gray-900">{c.client_name}</span>
                        </td>
                        <td className="py-2.5 px-2 text-gray-600">{c.assigned_clinician}</td>
                        <td className="py-2.5 px-2">
                          <AppointmentDate date={c.first_appointment_date} status={c.onboarding_status} />
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><ProgressBar pct={c.completion_pct || 0} /></div>
                            <span className="text-xs text-gray-500 w-8 text-right">{c.completion_pct || 0}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-xs text-gray-600">{c.insurance_primary || '—'}</td>
                        <td className="py-2.5 px-2"><StatusBadge variant="status" value={c.onboarding_status} /></td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1 relative">
                            <button
                              onClick={() => setDrawerClient(c.client_name)}
                              className="text-xs text-[var(--sm-primary)] hover:opacity-80 font-medium px-2 py-1 rounded hover:bg-[var(--sm-glass-primary)]"
                            >
                              View
                            </button>
                            {/* Outreach popover trigger (Task 7) */}
                            <div className="relative">
                              <button
                                onClick={() => setOutreachPopover(outreachPopover === c.name ? null : c.name)}
                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                                title="Log outreach"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                              {outreachPopover === c.name && (
                                <OutreachPopover
                                  clientName={c.client_name}
                                  onClose={() => setOutreachPopover(null)}
                                  onSubmit={async (data) => {
                                    await handleOutreachSubmit(data);
                                    showToast('Outreach logged');
                                  }}
                                />
                              )}
                            </div>
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
          onRefresh={() => {
            fetchClients();
          }}
          isHistorical={activeView === 'history'}
        />
      )}

      {/* Outreach Modal (legacy, kept for compat) */}
      {outreachModal && (
        <OutreachModal
          clientName={outreachModal}
          onClose={() => setOutreachModal(null)}
          onSubmit={handleOutreachSubmit}
        />
      )}

      {/* Add Client Modal (Task 2) */}
      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onCreated={() => {
            setShowAddClient(false);
            fetchClients();
            showToast('Client added to queue');
          }}
        />
      )}

      {/* Reactivate from History (Task 4) */}
      {reactivateClient && (
        <ReactivateModal
          clientName={reactivateClient}
          onClose={() => setReactivateClient(null)}
          onReactivated={() => {
            setReactivateClient(null);
            setActiveView('queue');
            fetchClients();
            showToast('Client reactivated and returned to queue');
          }}
        />
      )}

      {/* Toast (shared) */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
