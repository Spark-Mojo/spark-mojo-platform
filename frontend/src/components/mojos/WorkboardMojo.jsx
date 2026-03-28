/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { parseISO, isToday, isTomorrow, isPast, format } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AssignmentField from '@/components/ui/AssignmentField';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000') + '/api/modules/tasks';
const SORT_STORAGE_KEY = 'workboard_sort_preference';
const VIEW_STORAGE_KEY = 'workboard_view_preference';
const KANBAN_COLUMNS = ['New', 'Ready', 'In Progress', 'Waiting', 'Blocked', 'Other'];

const CANONICAL_STATES = ['New', 'Ready', 'In Progress', 'Waiting', 'Blocked', 'Failed', 'Completed', 'Canceled'];
const RESOLVED_STATES = ['Completed', 'Canceled', 'Failed'];
const REASON_REQUIRED_STATES = ['Blocked', 'Failed'];

const TASK_TYPES = ['Action', 'Review', 'Approval', 'Input', 'Exception', 'Monitoring', 'System'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];
const SOURCE_SYSTEM_OPTIONS = ['Manual', 'Frappe', 'n8n', 'EHR', 'Stripe', 'AI'];

async function fetchTasks(includeCompleted = false) {
  const params = new URLSearchParams({ view: 'all' });
  if (includeCompleted) params.set('include_completed', 'true');
  const resp = await fetch(`${API_BASE}/list?${params}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    let detail = `API error: ${resp.status}`;
    try { detail = JSON.parse(text).detail || detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  const json = await resp.json();
  return json.tasks || [];
}

async function postClaim(taskId) {
  const resp = await fetch(`${API_BASE}/claim`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId }),
  });
  if (resp.status === 409) {
    throw Object.assign(new Error('This task was already claimed'), { status: 409 });
  }
  if (!resp.ok) {
    throw new Error('Could not claim task — please try again');
  }
  return resp.json();
}

async function fetchTask(taskId) {
  const resp = await fetch(`${API_BASE}/get?task_id=${encodeURIComponent(taskId)}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Failed to load task: ${resp.status}`);
  }
  return resp.json();
}

async function postUpdateState(taskId, canonicalState, statusReason) {
  const body = { task_id: taskId, canonical_state: canonicalState };
  if (statusReason) body.status_reason = statusReason;
  const resp = await fetch(`${API_BASE}/update_state`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`Failed to update state: ${resp.status}`);
  }
  return resp.json();
}

async function postAddComment(taskId, comment) {
  const resp = await fetch(`${API_BASE}/add_comment`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, comment }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to add comment: ${resp.status}`);
  }
  return resp.json();
}

async function postComplete(taskId, completionNote) {
  const body = { task_id: taskId };
  if (completionNote) body.completion_note = completionNote;
  const resp = await fetch(`${API_BASE}/complete`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`Failed to complete task: ${resp.status}`);
  }
  return resp.json();
}

function extractServerMessages(raw) {
  if (!raw) return null;
  try {
    const msgs = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(msgs) || msgs.length === 0) return null;
    const first = typeof msgs[0] === 'string' ? JSON.parse(msgs[0]) : msgs[0];
    const msg = first?.message || (typeof first === 'string' ? first : null);
    if (!msg) return null;
    return msg.replace(/^[\w.]+Error:\s*/i, '').trim() || null;
  } catch { return null; }
}

function parseFrappeError(text, fallback) {
  if (!text) return fallback;
  try {
    const parsed = typeof text === 'string' ? JSON.parse(text) : text;

    // Check top-level _server_messages
    const topMsg = extractServerMessages(parsed._server_messages);
    if (topMsg) return topMsg;

    // Check nested detail._server_messages (abstraction layer wrapper)
    if (parsed.detail && typeof parsed.detail === 'object') {
      const nestedMsg = extractServerMessages(parsed.detail._server_messages);
      if (nestedMsg) return nestedMsg;
      if (parsed.detail.message) return String(parsed.detail.message).replace(/^[\w.]+Error:\s*/i, '').trim();
      if (parsed.detail.error) return parsed.detail.error;
    }
    if (typeof parsed.detail === 'string') return parsed.detail;

    // Frappe exc_type style: { message: "..." }
    if (parsed.message) {
      return String(parsed.message).replace(/^[\w.]+Error:\s*/i, '').trim() || fallback;
    }
  } catch { /* not JSON */ }

  // Handle network-level errors
  if (text && typeof text === 'object' && text.message === 'Failed to fetch') {
    return 'Could not connect — please check your connection and try again';
  }
  return fallback;
}

async function postCreateTask(data) {
  const resp = await fetch(`${API_BASE}/create`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(parseFrappeError(text, `Failed to create task: ${resp.status}`));
  }
  return resp.json();
}

async function postAssign(taskId, assignedUser, assignedRole, dueAt) {
  const body = { task_id: taskId };
  if (assignedUser !== undefined) body.assigned_user = assignedUser;
  if (assignedRole !== undefined) body.assigned_role = assignedRole;
  if (dueAt !== undefined) body.due_at = dueAt;
  const resp = await fetch(`${API_BASE}/assign`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(parseFrappeError(text, `Failed to save assignment. Please check the values and try again.`));
  }
  return resp.json();
}

const TYPE_COLORS = {
  Action: 'bg-teal-100 text-teal-700',
  Review: 'bg-amber-100 text-amber-800',
  Approval: 'bg-orange-100 text-orange-800',
};

const TYPE_BADGE_STYLES = {
  Action:   { bg: '#E6F2F2', text: '#006666' },
  Review:   { bg: '#FFF8E6', text: '#B45309' },
  Approval: { bg: '#FFF0EE', text: '#FF6F61' },
};

const STATUS_COLORS = {
  'New':         { bg: '#F1F5F9', text: '#64748B' },
  'Ready':       { bg: '#E6F2F2', text: '#006666' },
  'In Progress': { bg: '#EFF6FF', text: '#2563EB' },
  'Waiting':     { bg: '#FFF8E6', text: '#B45309' },
  'Blocked':     { bg: '#FFF0EE', text: '#DC2626' },
  'Failed':      { bg: '#FEE2E2', text: '#B91C1C' },
  'Completed':   { bg: '#F0FDF4', text: '#16A34A' },
  'Canceled':    { bg: '#F8FAFC', text: '#94A3B8' },
};

const PRIORITY_STRIPE = {
  Urgent: '#E53935',
  High:   '#FF6F61',
  Medium: '#FFB300',
  Low:    '#B0BEC5',
};

const PRIORITY_COLORS = {
  Urgent: 'bg-red-500',
  High: 'bg-orange-400',
  Medium: 'bg-amber-400',
  Low: 'bg-gray-400',
};

const FILTER_TABS = ['All', 'Action', 'Review', 'Approval'];

const isUnownedByUser = (task) => !task.assigned_user;

const TABLE_COLUMNS = [
  { key: 'title', label: 'TASK', sortable: true, width: 'flex-1 min-w-0' },
  { key: 'task_type', label: 'TYPE', sortable: true, width: 'w-[90px]' },
  { key: 'canonical_state', label: 'STATUS', sortable: true, width: 'w-[100px]' },
  { key: 'source_system', label: 'SOURCE', sortable: false, width: 'w-[90px]' },
  { key: 'due_at', label: 'DUE DATE', sortable: true, width: 'w-[100px]' },
  { key: 'assigned_user', label: 'ASSIGNED', sortable: false, width: 'w-[130px]' },
  { key: '_actions', label: 'ACTIONS', sortable: false, width: 'w-[80px]' },
];

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

function formatDueDate(dueAt) {
  if (!dueAt) return null;
  const date = parseISO(dueAt);
  if (isToday(date)) return { text: 'Today', overdue: false, warn: true };
  if (isTomorrow(date)) return { text: 'Tomorrow', overdue: false, warn: true };
  if (isPast(date)) return { text: 'Overdue', overdue: true, warn: false };
  return { text: format(date, 'MMM d'), overdue: false, warn: false };
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.replace(/@.*$/, '').split(/[.\-_\s]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || '?').slice(0, 2).toUpperCase();
}

function getFirstName(email) {
  if (!email) return '';
  const local = email.split('@')[0];
  const parts = local.split(/[.\-_]+/);
  const name = parts[0] || '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatTimestamp(ts) {
  if (!ts) return '';
  try {
    return format(parseISO(ts), 'MMM d, yyyy h:mm a');
  } catch {
    return ts;
  }
}

function compareTasks(a, b, field, direction) {
  const dir = direction === 'asc' ? 1 : -1;

  if (field === 'priority') {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa === 99 && pb === 99) return 0;
    if (pa === 99) return 1;
    if (pb === 99) return -1;
    return (pa - pb) * dir;
  }

  const va = a[field];
  const vb = b[field];

  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;

  if (field === 'due_at' || field === 'created_at') {
    return (new Date(va) - new Date(vb)) * dir;
  }

  return String(va).localeCompare(String(vb)) * dir;
}

// TODO: When task count exceeds ~100, move sorting server-side via order_by
// query parameter to avoid client-side performance issues.
function sortTasks(tasks, field, direction) {
  return [...tasks].sort((a, b) => compareTasks(a, b, field, direction));
}

function loadSortPreference() {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (raw) {
      const pref = JSON.parse(raw);
      if (pref.field && pref.direction) return pref;
    }
  } catch { /* ignore */ }
  return { field: 'due_at', direction: 'asc' };
}

function saveSortPreference(field, direction) {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ field, direction }));
  } catch { /* ignore */ }
}

function LoadingSkeleton() {
  return (
    <div data-testid="loading-skeleton" className="space-y-3 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div data-testid="drawer-skeleton" className="space-y-4 p-6">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function useCountUp(target, duration = 600) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (target === 0) { setCount(0); prevTarget.current = 0; return; }
    const from = prevTarget.current === target ? 0 : prevTarget.current;
    prevTarget.current = target;
    const start = performance.now();
    let raf;
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return count;
}

function StatCard({ label, value, testId, iconSvg, iconBg }) {
  const display = useCountUp(value, 600);
  return (
    <div data-testid={testId} className="flex items-center gap-3 bg-white rounded-lg border border-[#E2E8EB] p-3 flex-1 min-w-0">
      <div className={cn('p-2 rounded-lg', iconBg)}>
        {iconSvg}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-gray-900">{display}</div>
        <div className="text-xs text-gray-500 truncate">{label}</div>
      </div>
    </div>
  );
}

const STAT_ICONS = {
  active: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1z" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 8l2 2 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  urgent: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14.5 13H1.5L8 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
  overdue: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  waiting: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 6v4M10 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
};

function StatsBar({ tasks }) {
  const stats = useMemo(() => {
    let active = 0, urgent = 0, overdue = 0, waiting = 0;
    for (const t of tasks) {
      if (!RESOLVED_STATES.includes(t.canonical_state)) {
        active++;
        if (t.priority === 'Urgent') urgent++;
        if (t.due_at && isPast(parseISO(t.due_at)) && !isToday(parseISO(t.due_at))) overdue++;
        if (t.canonical_state === 'Waiting') waiting++;
      }
    }
    return { active, urgent, overdue, waiting };
  }, [tasks]);

  const cards = [
    { label: 'Active Tasks', value: stats.active, testId: 'stat-active', iconSvg: STAT_ICONS.active, iconBg: 'bg-teal-100 text-teal-700' },
    { label: 'Urgent', value: stats.urgent, testId: 'stat-urgent', iconSvg: STAT_ICONS.urgent, iconBg: 'bg-red-100 text-red-700' },
    { label: 'Overdue', value: stats.overdue, testId: 'stat-overdue', iconSvg: STAT_ICONS.overdue, iconBg: 'bg-amber-100 text-amber-700' },
    { label: 'Waiting', value: stats.waiting, testId: 'stat-waiting', iconSvg: STAT_ICONS.waiting, iconBg: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <div data-testid="stats-bar" className="flex gap-3 px-4 py-3">
      {cards.map((c) => (
        <StatCard key={c.testId} {...c} />
      ))}
    </div>
  );
}

function FilterTabs({ activeTab, onTabChange, showCompleted, onToggleCompleted, sourceFilter, onSourceFilterChange, sourceOptions }) {
  return (
    <div data-testid="filter-tabs" className="flex items-center gap-1 px-4 py-2 border-b border-[#E2E8EB]">
      {FILTER_TABS.map((tab) => (
        <button
          key={tab}
          data-testid={`filter-tab-${tab.toLowerCase()}`}
          onClick={() => onTabChange(tab)}
          className={cn(
            'text-xs px-3 py-1.5 font-medium transition-colors border-b-2',
            activeTab === tab
              ? 'border-[#006666] text-[#006666]'
              : 'border-transparent text-[#6B7A84] hover:text-[#34424A]'
          )}
        >
          {tab}
        </button>
      ))}
      <div className="flex-1" />
      {sourceOptions.length > 0 && (
        <select
          data-testid="source-filter"
          value={sourceFilter}
          onChange={(e) => onSourceFilterChange(e.target.value)}
          className="text-xs px-2 py-1.5 font-medium text-[#34424A] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-teal-400 rounded cursor-pointer"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <option value="">All Sources</option>
          {sourceOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}
      <button
        data-testid="filter-show-completed"
        onClick={onToggleCompleted}
        className={cn(
          'text-xs px-3 py-1.5 font-medium transition-colors border-b-2',
          showCompleted
            ? 'border-[#006666] text-[#006666]'
            : 'border-transparent text-[#6B7A84] hover:text-[#34424A]'
        )}
      >
        Show Completed
      </button>
    </div>
  );
}

function ColumnHeaders({ sortField, sortDirection, onSortChange }) {
  return (
    <div data-testid="column-headers" className="flex items-center gap-2 px-3 py-2.5 bg-[#F0F4F5] border-b border-[#E2E8EB]" style={{ paddingLeft: 'calc(4px + 12px)' }}>
      {TABLE_COLUMNS.map((col) => (
        <div
          key={col.key}
          data-testid={`col-header-${col.key}`}
          className={cn('shrink-0 flex items-center gap-1', col.width, col.sortable && 'cursor-pointer select-none')}
          onClick={col.sortable ? () => {
            if (sortField === col.key) {
              onSortChange(col.key, sortDirection === 'asc' ? 'desc' : 'asc');
            } else {
              onSortChange(col.key, 'asc');
            }
          } : undefined}
        >
          <span className="text-[11px] font-bold text-[#6B7A84] uppercase tracking-wider">{col.label}</span>
          {col.sortable && (
            <span className={cn('text-[10px]', sortField === col.key ? 'text-[#006666]' : 'text-[#B0BEC5]')}>
              {sortField === col.key ? (sortDirection === 'asc' ? '\u2191' : '\u2193') : '\u2195'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function TaskRow({ task, claimingId, onClaim, selected, onRowClick, onViewClick }) {
  const { name, title, task_type, canonical_state, priority, due_at, source_system, assigned_user, assigned_role } = task;
  const due = formatDueDate(due_at);
  const isClaiming = claimingId === name;
  const isResolved = RESOLVED_STATES.includes(canonical_state);
  const stripeColor = PRIORITY_STRIPE[priority] || PRIORITY_STRIPE.Low;
  const typeBadge = TYPE_BADGE_STYLES[task_type] || { bg: '#F1F5F9', text: '#64748B' };
  const statusBadge = STATUS_COLORS[canonical_state] || STATUS_COLORS.New;
  const unowned = isUnownedByUser(task);

  return (
    <div
      data-testid="task-row"
      onClick={() => onRowClick(name)}
      className={cn(
        'flex items-center gap-2 px-3 h-[52px] border-b border-[#E2E8EB] transition-colors cursor-pointer',
        selected ? 'bg-[#f0f7f7]' : 'hover:bg-[#f5fafa]',
        isResolved && 'opacity-60',
        unowned && !isResolved && 'unowned-pulse-row'
      )}
      style={{
        borderLeft: unowned && !isResolved
          ? undefined
          : `4px solid ${isResolved ? '#B0BEC5' : stripeColor}`,
      }}
    >
      {/* TASK — title + ID */}
      <div className="flex-1 min-w-0 pr-2">
        <div className={cn('text-sm font-medium text-[#34424A] truncate', isResolved && 'line-through')}>
          {title}
        </div>
        <div className="text-[11px] text-[#94A3B8]">{name}</div>
      </div>

      {/* TYPE badge */}
      <div className="w-[90px] shrink-0">
        {task_type && (
          <span
            data-testid="type-badge"
            className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: typeBadge.bg, color: typeBadge.text }}
          >
            {task_type}
          </span>
        )}
      </div>

      {/* STATUS badge */}
      <div className="w-[100px] shrink-0">
        <span
          data-testid="status-badge"
          className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: statusBadge.bg, color: statusBadge.text }}
        >
          {canonical_state || 'New'}
        </span>
      </div>

      {/* SOURCE */}
      <div className="w-[90px] shrink-0">
        {source_system && (
          <span
            data-testid="source-badge"
            className="inline-block text-[10px] px-2 py-0.5 rounded-full border border-[#E2E8EB] text-[#6B7A84]"
          >
            {source_system}
          </span>
        )}
      </div>

      {/* DUE DATE */}
      <div className="w-[100px] shrink-0">
        {due ? (
          <span
            data-testid="due-date"
            className={cn(
              'text-xs tabular-nums',
              due.overdue ? 'text-[#FF6F61] font-medium' : due.warn ? 'text-[#B45309] font-medium' : 'text-[#34424A]'
            )}
          >
            {due.text}
          </span>
        ) : (
          <span className="text-xs text-[#B0BEC5]">&mdash;</span>
        )}
      </div>

      {/* ASSIGNED — initials avatar + name */}
      <div className="w-[130px] shrink-0 flex items-center gap-1.5">
        {assigned_user ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#006666] text-white text-[10px] font-bold shrink-0">
              {getInitials(assigned_user)}
            </span>
            <span className="text-xs text-[#34424A] truncate">{getFirstName(assigned_user)}</span>
          </span>
        ) : (
          <span
            data-testid="unassigned-badge"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[11px] font-bold"
            style={{ backgroundColor: '#FF6F61' }}
          >
            &#9888; {assigned_role || 'Unassigned'}
          </span>
        )}
      </div>

      {/* ACTIONS — View or Claim */}
      <div className="w-[80px] shrink-0 flex justify-end">
        {!assigned_user && !isResolved ? (
          <button
            data-testid="claim-button"
            disabled={isClaiming}
            onClick={(e) => { e.stopPropagation(); onClaim(name); }}
            className={cn(
              'text-[11px] px-3 py-1 rounded border font-medium transition-colors',
              'border-[#006666] text-[#006666] hover:bg-[#006666] hover:text-white',
              isClaiming && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isClaiming ? (
              <span data-testid="claim-spinner" className="inline-block h-3 w-3 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            ) : 'Claim'}
          </button>
        ) : (
          <button
            data-testid="view-button"
            onClick={(e) => { e.stopPropagation(); onViewClick(name); }}
            className="text-[11px] px-3 py-1 rounded border border-[#006666] text-[#006666] hover:bg-[#006666] hover:text-white font-medium transition-colors"
          >
            View
          </button>
        )}
      </div>
    </div>
  );
}

function TaskDetailDrawer({ task, loading, onClose, onUpdateState, onAddComment, onComplete, onAssign, stateChanging }) {
  const [commentText, setCommentText] = useState('');
  const [pendingState, setPendingState] = useState(null);
  const [statusReasonInput, setStatusReasonInput] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingAssign, setEditingAssign] = useState(false);
  const [assignUser, setAssignUser] = useState('');
  const [assignRole, setAssignRole] = useState('');
  const [assignDueAt, setAssignDueAt] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [completing, setCompleting] = useState(false);
  const commentInputRef = useRef(null);

  const isResolved = task ? RESOLVED_STATES.includes(task.canonical_state) : false;

  useEffect(() => {
    if (task) {
      setAssignUser(task.assigned_user || '');
      setAssignRole(task.assigned_role || '');
      setAssignDueAt(task.due_at ? task.due_at.slice(0, 10) : '');
      setEditingAssign(false);
      setAssignError(null);
    }
  }, [task]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleStateChange = (newState) => {
    if (REASON_REQUIRED_STATES.includes(newState)) {
      setPendingState(newState);
      setStatusReasonInput('');
    } else {
      onUpdateState(newState, null);
    }
  };

  const handleConfirmStateWithReason = () => {
    if (!statusReasonInput.trim()) return;
    onUpdateState(pendingState, statusReasonInput.trim());
    setPendingState(null);
    setStatusReasonInput('');
  };

  const handleCancelReason = () => {
    setPendingState(null);
    setStatusReasonInput('');
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    onAddComment(commentText.trim());
    setCommentText('');
  };

  const handleStartEditAssign = () => {
    setAssignUser(task?.assigned_user || '');
    setAssignRole(task?.assigned_role || '');
    setAssignDueAt(task?.due_at ? task.due_at.slice(0, 10) : '');
    setEditingAssign(true);
    setAssignError(null);
  };

  const handleCancelEditAssign = () => {
    setEditingAssign(false);
    setAssignError(null);
  };

  const handleSaveAssign = async () => {
    setAssignSaving(true);
    setAssignError(null);
    try {
      await onAssign(assignUser, assignRole, assignDueAt);
      setEditingAssign(false);
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssignSaving(false);
    }
  };

  const typeColor = task ? (TYPE_COLORS[task.task_type] || 'bg-[var(--color-slate,#34424A)] text-white') : '';
  const priorityColor = task ? (PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Low) : '';
  const comments = task?.comments || [];
  const stateHistory = task?.state_history || [];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        data-testid="drawer-backdrop"
        className="fixed inset-0 bg-black/40 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      {/* Drawer panel */}
      <motion.div
        data-testid="task-detail-drawer"
        className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white z-50 shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {loading ? (
          <DrawerSkeleton />
        ) : task ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 data-testid="drawer-title" className="text-base font-semibold text-gray-900 mb-2">
                  {task.title}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0 font-medium', typeColor)}>
                    {task.task_type || 'Task'}
                  </Badge>
                  <span className={cn('h-2.5 w-2.5 rounded-full inline-block', priorityColor)} />
                  <span className="text-xs text-gray-500">{task.priority}</span>
                </div>
              </div>
              <button
                data-testid="drawer-close"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
                aria-label="Close drawer"
              >
                &#10005;
              </button>
            </div>

            {/* Status bar — read-only for resolved tasks */}
            {!isResolved && (
              <div className="px-6 py-3 border-b border-gray-200">
                <label className="text-xs text-gray-500 block mb-1">Status</label>
                {pendingState ? (
                  <div data-testid="status-reason-prompt" className="space-y-2">
                    <p className="text-xs text-gray-600">
                      Reason for {pendingState}:
                    </p>
                    <input
                      data-testid="status-reason-input"
                      type="text"
                      value={statusReasonInput}
                      onChange={(e) => setStatusReasonInput(e.target.value)}
                      placeholder="Enter reason..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmStateWithReason();
                        if (e.key === 'Escape') { e.stopPropagation(); handleCancelReason(); }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        data-testid="confirm-reason-btn"
                        onClick={handleConfirmStateWithReason}
                        disabled={!statusReasonInput.trim()}
                        className="text-xs px-3 py-1.5 rounded bg-teal-600 text-white disabled:opacity-40"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={handleCancelReason}
                        className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    data-testid="state-selector"
                    value={task.canonical_state || 'New'}
                    onChange={(e) => handleStateChange(e.target.value)}
                    disabled={stateChanging}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  >
                    {CANONICAL_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Resolved status display */}
            {isResolved && (
              <div className="px-6 py-3 border-b border-gray-200">
                <label className="text-xs text-gray-500 block mb-1">Status</label>
                <Badge className="text-xs px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-600 border-0">
                  {task.canonical_state}
                </Badge>
              </div>
            )}

            {/* Details */}
            <div className="px-6 py-3 border-b border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500">Details</label>
                {!isResolved && !editingAssign && (
                  <button
                    data-testid="edit-assign-button"
                    onClick={handleStartEditAssign}
                    className="text-gray-400 hover:text-gray-600 text-xs p-0.5"
                    aria-label="Edit assignment"
                  >
                    &#9998;
                  </button>
                )}
              </div>

              {/* Inline assign edit form */}
              {editingAssign ? (
                <div data-testid="assign-edit-form" className="space-y-2 bg-gray-50 rounded-lg p-3">
                  <AssignmentField
                    assignedUser={assignUser}
                    assignedRole={assignRole}
                    onUserChange={(email) => setAssignUser(email || '')}
                    onRoleChange={(role) => setAssignRole(role || '')}
                  />
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Due Date</label>
                    <input
                      data-testid="assign-due-date-input"
                      type="date"
                      value={assignDueAt}
                      onChange={(e) => setAssignDueAt(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  {assignError && <p className="text-red-500 text-xs">{assignError}</p>}
                  <div className="flex gap-2">
                    <button
                      data-testid="assign-save-button"
                      onClick={handleSaveAssign}
                      disabled={assignSaving}
                      className="text-xs px-3 py-1.5 rounded bg-teal-600 text-white disabled:opacity-40"
                    >
                      {assignSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      data-testid="assign-cancel-button"
                      onClick={handleCancelEditAssign}
                      className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {task.assigned_user && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Assigned to</span>
                      <span className="text-gray-700">{task.assigned_user}</span>
                    </div>
                  )}
                  {task.assigned_role && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Role</span>
                      <span className="text-gray-700">{task.assigned_role}</span>
                    </div>
                  )}
                </>
              )}
              {task.due_at && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Due</span>
                  <span className="text-gray-700 font-mono">{formatTimestamp(task.due_at)}</span>
                </div>
              )}
              {task.source_system && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Source</span>
                  <span className="text-gray-700">{task.source_system}</span>
                </div>
              )}
              {task.related_crm_record && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">CRM Record</span>
                  <span className="text-gray-700">{task.related_crm_record}</span>
                </div>
              )}
              {task.completion_criteria && (
                <div className="text-xs">
                  <span className="text-gray-500 block mb-1">Completion Criteria</span>
                  <p className="text-gray-700">{task.completion_criteria}</p>
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="px-6 py-3 border-b border-gray-200 flex-1 min-h-0">
              <label className="text-xs text-gray-500 block mb-2">Comments</label>
              <div data-testid="comments-list" className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {[...comments].reverse().map((c, i) => (
                  <div key={c.name || i} className="bg-gray-50 rounded-lg p-2">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>{c.comment_by || 'Unknown'}</span>
                      <span>{formatTimestamp(c.created_at || c.creation)}</span>
                    </div>
                    <p className="text-xs text-gray-700">{c.comment}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-gray-400">No comments yet</p>
                )}
              </div>
              {/* Comment input — hidden for resolved tasks */}
              {!isResolved && (
                <div className="flex gap-2">
                  <input
                    ref={commentInputRef}
                    data-testid="comment-input"
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitComment(); }}
                  />
                  <button
                    data-testid="comment-submit"
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim()}
                    className="text-xs px-3 py-1.5 rounded bg-teal-600 text-white disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>

            {/* State History */}
            <Collapsible.Root open={historyOpen} onOpenChange={setHistoryOpen} className="px-6 py-3 border-b border-gray-200">
              <Collapsible.Trigger asChild>
                <button data-testid="history-toggle" className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 w-full">
                  <span>{historyOpen ? '\u25BC' : '\u25B6'}</span>
                  <span>State History ({stateHistory.length})</span>
                </button>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <div data-testid="state-history" className="mt-2 space-y-1.5">
                  {stateHistory.map((entry, i) => (
                    <div key={entry.name || i} className="flex items-center gap-2 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
                      <span className="text-gray-600">{entry.to_state || entry.canonical_state}</span>
                      <span className="text-gray-400">{formatTimestamp(entry.changed_at || entry.creation)}</span>
                    </div>
                  ))}
                  {stateHistory.length === 0 && (
                    <p className="text-xs text-gray-400">No state changes recorded</p>
                  )}
                </div>
              </Collapsible.Content>
            </Collapsible.Root>

            {/* Complete button — hidden for resolved tasks */}
            {!isResolved && (
              <div className="px-6 py-4 mt-auto">
                <button
                  data-testid="complete-button"
                  disabled={completing}
                  onClick={async () => {
                    setCompleting(true);
                    try {
                      await onComplete();
                    } finally {
                      setCompleting(false);
                    }
                  }}
                  className="w-full py-2.5 rounded-lg bg-[#FF6F61] text-white text-sm font-medium hover:bg-[#e5635a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {completing ? 'Completing...' : 'Complete Task'}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </>
  );
}

function Toast({ message, visible }) {
  if (!visible) return null;
  return (
    <div
      data-testid="inline-toast"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-4 py-2 rounded-lg shadow-lg z-10"
    >
      {message}
    </div>
  );
}

function loadViewPreference() {
  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    if (raw === 'kanban') return 'kanban';
  } catch { /* ignore */ }
  return 'list';
}

function saveViewPreference(mode) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch { /* ignore */ }
}

function ViewToggle({ viewMode, onViewChange }) {
  return (
    <div data-testid="view-toggle" className="flex items-center gap-1">
      <button
        data-testid="view-toggle-list"
        onClick={() => onViewChange('list')}
        className={cn(
          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          viewMode === 'list'
            ? 'bg-[#006666] text-white'
            : 'text-[#34424A] hover:text-gray-700'
        )}
        aria-label="List view"
      >
        List
      </button>
      <button
        data-testid="view-toggle-kanban"
        onClick={() => onViewChange('kanban')}
        className={cn(
          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          viewMode === 'kanban'
            ? 'bg-[#006666] text-white'
            : 'text-[#34424A] hover:text-gray-700'
        )}
        aria-label="Kanban view"
      >
        Kanban
      </button>
    </div>
  );
}

function CreateTaskModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', task_type: 'Action', priority: 'Medium',
    assigned_user: '', assigned_role: '', due_at: '', source_system: 'Manual', description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({
        title: '', task_type: 'Action', priority: 'Medium',
        assigned_user: '', assigned_role: '', due_at: '', source_system: 'Manual', description: '',
      });
      setError(null);
    }
  }, [open]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = { title: form.title.trim(), task_type: form.task_type, priority: form.priority, executor_type: 'Human' };
      if (form.assigned_user.trim()) payload.assigned_user = form.assigned_user.trim();
      if (form.assigned_role.trim()) payload.assigned_role = form.assigned_role.trim();
      if (form.due_at) payload.due_at = form.due_at;
      if (form.source_system.trim()) payload.source_system = form.source_system.trim();
      if (form.description.trim()) payload.description = form.description.trim();
      const result = await postCreateTask(payload);
      const newTask = result.task || result;
      onCreated(newTask);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400';

  return (
    <>
      <motion.div
        data-testid="create-modal-backdrop"
        className="fixed inset-0 bg-black/40 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          data-testid="create-task-modal"
          className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">New Task</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1" aria-label="Close">
              &#10005;
            </button>
          </div>
          <div className="px-6 py-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Title *</label>
              <input
                data-testid="create-title-input"
                type="text" value={form.title} onChange={(e) => handleChange('title', e.target.value)}
                className={inputClass} placeholder="Task title" autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Task Type</label>
              <select data-testid="create-type-select" value={form.task_type} onChange={(e) => handleChange('task_type', e.target.value)} className={inputClass}>
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Priority</label>
              <select data-testid="create-priority-select" value={form.priority} onChange={(e) => handleChange('priority', e.target.value)} className={inputClass}>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Assignment</label>
              <AssignmentField
                assignedUser={form.assigned_user}
                assignedRole={form.assigned_role}
                onUserChange={(email) => handleChange('assigned_user', email || '')}
                onRoleChange={(role) => handleChange('assigned_role', role || '')}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Due Date</label>
              <input data-testid="create-due-input" type="date" value={form.due_at} onChange={(e) => handleChange('due_at', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Source System</label>
              <select data-testid="create-source-select" value={form.source_system} onChange={(e) => handleChange('source_system', e.target.value)} className={inputClass}>
                {SOURCE_SYSTEM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} className={cn(inputClass, 'resize-none')} rows={3} placeholder="Optional description" />
            </div>
            {error && <p data-testid="create-error" className="text-red-500 text-xs">{error}</p>}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
            <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              data-testid="create-submit-button"
              onClick={handleSubmit} disabled={!form.title.trim() || submitting}
              className="text-xs px-4 py-2 rounded-lg bg-[var(--color-primary,#006666)] text-white hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function KanbanCard({ task, selected, onCardClick, index }) {
  const { name, title, priority, due_at, assigned_user, assigned_role } = task;
  const due = formatDueDate(due_at);
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Low;
  const unowned = isUnownedByUser(task);

  return (
    <Draggable draggableId={name} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          data-testid="kanban-card"
          onClick={() => onCardClick(name)}
          className={cn(
            'bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-gray-300 transition-all',
            selected && 'ring-1 ring-teal-500 border-teal-500',
            snapshot.isDragging && 'shadow-lg border-teal-300',
            unowned && 'unowned-pulse-card'
          )}
        >
          <div className="flex items-start gap-2 mb-2">
            <span className={cn('h-2 w-2 rounded-full shrink-0 mt-1', priorityColor)} />
            <span className="text-sm font-medium text-gray-900 line-clamp-2 min-w-0">{title}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span className="truncate">
              {unowned ? (
                <span className="inline-flex items-center gap-1">
                  <span
                    data-testid="kanban-unowned-pulse"
                    className="inline-block h-2 w-2 rounded-full bg-orange-400 animate-pulse"
                  />
                  {assigned_role || 'Unassigned'}
                </span>
              ) : (
                assigned_user || assigned_role || ''
              )}
            </span>
            {due && (assigned_user || assigned_role || unowned) && (
              <span className="shrink-0">&middot;</span>
            )}
            {due && (
              <span className={cn('tabular-nums shrink-0', due.overdue ? 'text-red-500' : '')}>
                {due.text}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

function KanbanColumn({ columnState, tasks, selectedTaskId, onCardClick }) {
  return (
    <div data-testid="kanban-column" className="flex flex-col min-w-[180px] w-full">
      <div className="flex items-center gap-2 px-2 py-2 border-b border-gray-200 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{columnState}</span>
        <Badge className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-500 border-0" data-testid="kanban-column-count">
          {tasks.length}
        </Badge>
      </div>
      <Droppable droppableId={columnState}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 space-y-2 px-1 overflow-y-auto rounded-lg min-h-[60px] transition-colors',
              snapshot.isDraggingOver && 'bg-teal-50'
            )}
          >
            {tasks.map((task, index) => (
              <KanbanCard
                key={task.name}
                task={task}
                index={index}
                selected={selectedTaskId === task.name}
                onCardClick={onCardClick}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function KanbanBoard({ tasks, selectedTaskId, onCardClick, onDragEnd }) {
  const grouped = useMemo(() => {
    const groups = {};
    for (const col of KANBAN_COLUMNS) {
      groups[col] = [];
    }
    for (const task of tasks) {
      const state = task.canonical_state || 'New';
      const bucket = groups[state] ? state : 'Other';
      groups[bucket].push(task);
    }
    return groups;
  }, [tasks]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div data-testid="kanban-board" className="flex gap-3 p-3 overflow-x-auto h-full">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col}
            columnState={col}
            tasks={grouped[col]}
            selectedTaskId={selectedTaskId}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </DragDropContext>
  );
}

export default function WorkboardMojo() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const [toast, setToast] = useState({ message: '', visible: false });

  const [sortPref, setSortPref] = useState(loadSortPreference);
  const [viewMode, setViewMode] = useState(loadViewPreference);
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterTab, setFilterTab] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showUnclaimedOnly, setShowUnclaimedOnly] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Drawer state
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [drawerTask, setDrawerTask] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [stateChanging, setStateChanging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTasks(showCompleted)
      .then((data) => {
        if (!cancelled) {
          setTasks(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [showCompleted]);

  const showToast = useCallback((message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  }, []);

  const handleClaim = useCallback(async (taskId) => {
    setClaimingId(taskId);

    // Capture only this task's prior assigned_user for surgical rollback
    const priorUser = tasks.find((t) => t.name === taskId)?.assigned_user || '';

    // Optimistic update — use placeholder email; real value comes from API
    setTasks((prev) =>
      prev.map((t) =>
        t.name === taskId
          ? { ...t, assigned_user: t.assigned_user || 'claiming...', is_unowned: false }
          : t
      )
    );

    try {
      const result = await postClaim(taskId);
      const updatedTask = result.task || result;
      setTasks((prev) =>
        prev.map((t) =>
          t.name === taskId
            ? { ...t, ...updatedTask, is_unowned: false }
            : t
        )
      );
    } catch (err) {
      // Surgical rollback — only revert this task, leave others untouched
      setTasks((prev) =>
        prev.map((t) =>
          t.name === taskId
            ? { ...t, assigned_user: priorUser }
            : t
        )
      );
      showToast(err.message || 'Failed to claim task — please try again');
      if (err.status === 409) {
        fetchTasks(showCompleted).then(setTasks).catch(() => {});
      }
    } finally {
      setClaimingId(null);
    }
  }, [tasks, showToast, showCompleted]);

  const handleSortChange = useCallback((field, direction) => {
    setSortPref({ field, direction });
    saveSortPreference(field, direction);
  }, []);

  const handleViewChange = useCallback((mode) => {
    setViewMode(mode);
    saveViewPreference(mode);
  }, []);

  const handleToggleCompleted = useCallback(() => {
    setShowCompleted((prev) => !prev);
  }, []);

  const handleTaskCreated = useCallback((newTask) => {
    setTasks((prev) => [{
      ...newTask,
      is_unowned: !newTask.assigned_user && !!newTask.assigned_role,
    }, ...prev]);
  }, []);

  const handleKanbanDragEnd = useCallback(async (result) => {
    const { draggableId, source, destination } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newState = destination.droppableId;
    const taskId = draggableId;

    // Blocked requires a reason — prompt via drawer instead of dropping
    if (REASON_REQUIRED_STATES.includes(newState)) {
      setSelectedTaskId(taskId);
      setDrawerLoading(true);
      setDrawerTask(null);
      try {
        const data = await fetchTask(taskId);
        setDrawerTask(data.task || data);
      } catch {
        showToast('Failed to load task details');
        setSelectedTaskId(null);
      } finally {
        setDrawerLoading(false);
      }
      showToast(`Set status to ${newState} in the detail panel (reason required)`);
      return;
    }

    // Optimistic update
    const prevTasks = tasks;
    setTasks((prev) =>
      prev.map((t) =>
        t.name === taskId ? { ...t, canonical_state: newState } : t
      )
    );

    try {
      await postUpdateState(taskId, newState, null);
    } catch (err) {
      setTasks(prevTasks);
      showToast(err.message || 'Failed to update state');
    }
  }, [tasks, showToast]);

  const handleRowClick = useCallback(async (taskId) => {
    setSelectedTaskId(taskId);
    setDrawerLoading(true);
    setDrawerTask(null);
    const requestedId = taskId;
    try {
      const data = await fetchTask(taskId);
      setSelectedTaskId((current) => {
        if (current === requestedId) {
          setDrawerTask(data.task || data);
        }
        return current;
      });
    } catch {
      showToast('Failed to load task details');
      setSelectedTaskId((current) => current === requestedId ? null : current);
    } finally {
      setDrawerLoading(false);
    }
  }, [showToast]);

  const handleCloseDrawer = useCallback(() => {
    setSelectedTaskId(null);
    setDrawerTask(null);
  }, []);

  const handleUpdateState = useCallback(async (newState, statusReason) => {
    if (!drawerTask) return;
    setStateChanging(true);
    try {
      await postUpdateState(drawerTask.name, newState, statusReason);
      setDrawerTask((prev) => prev ? { ...prev, canonical_state: newState } : prev);
      setTasks((prev) =>
        prev.map((t) =>
          t.name === drawerTask.name ? { ...t, canonical_state: newState } : t
        )
      );
    } catch (err) {
      showToast(err.message);
    } finally {
      setStateChanging(false);
    }
  }, [drawerTask, showToast]);

  const handleAddComment = useCallback(async (comment) => {
    if (!drawerTask) return;
    try {
      const result = await postAddComment(drawerTask.name, comment);
      const newComments = result.comments || [...(drawerTask.comments || []), { comment, comment_by: 'You', created_at: new Date().toISOString() }];
      setDrawerTask((prev) => prev ? { ...prev, comments: newComments } : prev);
    } catch (err) {
      showToast(err.message);
    }
  }, [drawerTask, showToast]);

  const handleComplete = useCallback(async () => {
    if (!drawerTask) return;
    try {
      await postComplete(drawerTask.name);
      if (showCompleted) {
        setTasks((prev) =>
          prev.map((t) =>
            t.name === drawerTask.name ? { ...t, canonical_state: 'Completed' } : t
          )
        );
      } else {
        setTasks((prev) => prev.filter((t) => t.name !== drawerTask.name));
      }
      handleCloseDrawer();
    } catch (err) {
      showToast(err.message);
    }
  }, [drawerTask, showToast, handleCloseDrawer, showCompleted]);

  const handleAssign = useCallback(async (assignedUser, assignedRole, dueAt) => {
    if (!drawerTask) return;
    const result = await postAssign(drawerTask.name, assignedUser, assignedRole, dueAt);
    const updated = result.task || result;
    setDrawerTask((prev) => prev ? { ...prev, assigned_user: updated.assigned_user, assigned_role: updated.assigned_role, due_at: updated.due_at } : prev);
    setTasks((prev) =>
      prev.map((t) =>
        t.name === drawerTask.name
          ? { ...t, assigned_user: updated.assigned_user, assigned_role: updated.assigned_role, due_at: updated.due_at, is_unowned: !updated.assigned_user && !!updated.assigned_role }
          : t
      )
    );
  }, [drawerTask]);

  const unclaimedCount = useMemo(() =>
    tasks.filter((t) => !t.assigned_user && !RESOLVED_STATES.includes(t.canonical_state)).length,
    [tasks]
  );

  const sourceOptions = useMemo(() =>
    [...new Set(tasks.map((t) => t.source_system).filter(Boolean))].sort(),
    [tasks]
  );

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchesType = filterTab === 'All' || t.task_type === filterTab;
      const matchesSource = !sourceFilter || t.source_system === sourceFilter;
      const matchesUnclaimed = !showUnclaimedOnly || !t.assigned_user;
      return matchesType && matchesSource && matchesUnclaimed;
    });
  }, [tasks, filterTab, sourceFilter, showUnclaimedOnly]);

  const sorted = useMemo(
    () => sortTasks(filtered, sortPref.field, sortPref.direction),
    [filtered, sortPref.field, sortPref.direction]
  );

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div data-testid="error-state" className="flex items-center justify-center h-full p-8">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div data-testid="empty-state" className="flex flex-col items-center justify-center h-full p-8 gap-3">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-2xl text-teal-600">&#10003;</span>
        </div>
        <p className="text-gray-400 text-sm text-center">
          No tasks on your plate. You&apos;re all caught up.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-[#F8F9FA] text-[#34424A] overflow-hidden">
      <style>{`
        @keyframes unownedPulse {
          0%   { background-color: #ffffff; }
          30%  { background-color: #fff0ee; }
          60%  { background-color: #fff8e6; }
          100% { background-color: #ffffff; }
        }
        @keyframes borderPulse {
          0%, 50%  { border-left-color: #FF6F61; }
          51%, 100% { border-left-color: #FFB300; }
        }
        @keyframes borderPulseTop {
          0%, 50%  { border-top-color: #FF6F61; }
          51%, 100% { border-top-color: #FFB300; }
        }
        .unowned-pulse-row {
          animation: unownedPulse 2s infinite, borderPulse 1s infinite;
          border-left: 8px solid #FF6F61 !important;
        }
        .unowned-pulse-card {
          animation: unownedPulse 2s infinite, borderPulseTop 1s infinite;
          border-top: 8px solid #FF6F61 !important;
        }
      `}</style>
      {/* Header bar */}
      <div className="bg-white border-b border-[#E2E8EB] px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Mojo icon — teal checkmark, same size as Onboarding's UserCheck */}
          <div data-testid="mojo-icon" className="text-[#006666] shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#006666" strokeWidth="2"/><path d="M6 10.5L8.5 13L14 7" stroke="#006666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 data-testid="workboard-title" className="text-base font-semibold text-[#34424A]">
            Workboard
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <ViewToggle viewMode={viewMode} onViewChange={handleViewChange} />
          <button
            data-testid="new-task-button"
            onClick={() => setCreateModalOpen(true)}
            className="ml-2 px-3 py-1.5 rounded text-sm font-medium bg-[#006666] text-white hover:opacity-90 transition-colors whitespace-nowrap"
          >
            + New Task
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Stats bar */}
          <StatsBar tasks={tasks} />

          {/* Filter tabs */}
          <FilterTabs
            activeTab={filterTab}
            onTabChange={setFilterTab}
            showCompleted={showCompleted}
            onToggleCompleted={handleToggleCompleted}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            sourceOptions={sourceOptions}
          />

          {/* Unclaimed alert banner */}
          {unclaimedCount > 0 && (
            <div
              data-testid="unclaimed-banner"
              style={{
                background: 'rgba(255, 111, 97, 0.12)',
                borderLeft: '4px solid #FF6F61',
                padding: '8px 16px',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                color: '#34424A',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>&#9888;</span>
              {!showUnclaimedOnly ? (
                <>
                  <span>{unclaimedCount} task{unclaimedCount !== 1 ? 's' : ''} unclaimed</span>
                  <span>&mdash;</span>
                  <button
                    data-testid="view-unclaimed-link"
                    onClick={() => { setShowUnclaimedOnly(true); setFilterTab('All'); }}
                    style={{ color: '#006666', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  >
                    View unclaimed &rarr;
                  </button>
                </>
              ) : (
                <>
                  <span>Showing {unclaimedCount} unclaimed task{unclaimedCount !== 1 ? 's' : ''}</span>
                  <span>&middot;</span>
                  <button
                    data-testid="clear-unclaimed-filter"
                    onClick={() => setShowUnclaimedOnly(false)}
                    style={{ color: '#006666', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  >
                    Clear filter &times;
                  </button>
                </>
              )}
            </div>
          )}

          {/* Column headers */}
          <ColumnHeaders
            sortField={sortPref.field}
            sortDirection={sortPref.direction}
            onSortChange={handleSortChange}
          />

          {/* Table body */}
          <div className="flex-1 overflow-y-auto">
            <div className="bg-white">
              {sorted.map((task) => (
                <TaskRow
                  key={task.name}
                  task={task}
                  claimingId={claimingId}
                  onClaim={handleClaim}
                  selected={selectedTaskId === task.name}
                  onRowClick={handleRowClick}
                  onViewClick={handleRowClick}
                />
              ))}
              {sorted.length === 0 && (
                <div className="py-8 text-center text-sm text-[#94A3B8]">
                  No tasks match the current filter.
                </div>
              )}
            </div>
          </div>

          {/* Table footer */}
          <div data-testid="table-footer" className="bg-white border-t border-[#E2E8EB] px-4 py-2 flex-shrink-0">
            <span className="text-xs text-[#6B7A84]">Showing {sorted.length} task{sorted.length !== 1 ? 's' : ''}</span>
          </div>
        </>
      ) : (
        <KanbanBoard
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onCardClick={handleRowClick}
          onDragEnd={handleKanbanDragEnd}
        />
      )}
      <Toast message={toast.message} visible={toast.visible} />
      <AnimatePresence>
        {selectedTaskId && (
          <TaskDetailDrawer
            task={drawerTask}
            loading={drawerLoading}
            onClose={handleCloseDrawer}
            onUpdateState={handleUpdateState}
            onAddComment={handleAddComment}
            onComplete={handleComplete}
            onAssign={handleAssign}
            stateChanging={stateChanging}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {createModalOpen && (
          <CreateTaskModal
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onCreated={handleTaskCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
