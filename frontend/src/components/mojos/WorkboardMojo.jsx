/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000') + '/api/modules/tasks';
const SORT_STORAGE_KEY = 'workboard_sort_preference';

async function fetchTasks() {
  const resp = await fetch(`${API_BASE}/list?view=all`, {
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

const TYPE_COLORS = {
  Action: 'bg-[var(--color-primary,#006666)] text-white',
  Review: 'bg-[var(--color-gold,#FFB300)] text-slate-900',
  Approval: 'bg-[var(--color-coral,#FF6F61)] text-white',
};

const PRIORITY_COLORS = {
  Urgent: 'bg-red-500',
  High: 'bg-[var(--color-coral,#FF6F61)]',
  Medium: 'bg-[var(--color-gold,#FFB300)]',
  Low: 'bg-[var(--color-slate,#34424A)]',
};

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

const SORT_OPTIONS = [
  { key: 'due_at', label: 'Due Date' },
  { key: 'priority', label: 'Priority' },
  { key: 'created_at', label: 'Created Date' },
  { key: 'canonical_state', label: 'Status' },
];

function truncateTitle(title, max = 60) {
  if (!title) return '';
  return title.length > max ? title.slice(0, max) + '...' : title;
}

function formatDueDate(dueAt) {
  if (!dueAt) return null;
  const date = parseISO(dueAt);
  if (isToday(date)) return { text: 'Today', overdue: false };
  if (isTomorrow(date)) return { text: 'Tomorrow', overdue: false };
  if (isPast(date)) return { text: 'Overdue', overdue: true };
  const days = differenceInCalendarDays(date, new Date());
  return { text: `${days} days`, overdue: false };
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

function SortToolbar({ sortField, sortDirection, onSortChange }) {
  return (
    <div data-testid="sort-toolbar" className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          data-testid={`sort-chip-${opt.key}`}
          onClick={() => onSortChange(opt.key, opt.key === sortField ? sortDirection : 'asc')}
          className={cn(
            'text-xs px-2.5 py-1 rounded-full transition-colors',
            opt.key === sortField
              ? 'bg-[var(--color-primary,#006666)] text-white'
              : 'bg-white/10 text-white/50 hover:text-white/70'
          )}
        >
          {opt.label}
        </button>
      ))}
      <button
        data-testid="sort-direction-toggle"
        onClick={() => onSortChange(sortField, sortDirection === 'asc' ? 'desc' : 'asc')}
        className="text-xs text-white/50 hover:text-white/70 ml-1 px-1.5 py-1"
        aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
      >
        {sortDirection === 'asc' ? '\u2191' : '\u2193'}
      </button>
    </div>
  );
}

function TaskRow({ task, claimingId, onClaim }) {
  const { name, title, task_type, canonical_state, priority, due_at, assigned_user, assigned_role, is_unowned } = task;
  const due = formatDueDate(due_at);
  const typeColor = TYPE_COLORS[task_type] || 'bg-[var(--color-slate,#34424A)] text-white';
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Low;
  const isClaiming = claimingId === name;

  return (
    <div
      data-testid="task-row"
      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors rounded-lg cursor-default"
    >
      {/* Priority dot */}
      <span
        data-testid="priority-dot"
        className={cn('h-2.5 w-2.5 rounded-full shrink-0', priorityColor)}
      />

      {/* Title */}
      <span className="flex-1 text-sm text-white/90 truncate min-w-0">
        {truncateTitle(title)}
      </span>

      {/* Task type badge */}
      <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0 border-0', typeColor)}>
        {task_type || 'Task'}
      </Badge>

      {/* State badge */}
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-white/60 border-white/20">
        {canonical_state || 'New'}
      </Badge>

      {/* Due date */}
      {due && (
        <span
          data-testid="due-date"
          className={cn(
            'text-xs shrink-0 tabular-nums',
            due.overdue ? 'text-red-400 font-medium' : 'text-white/50'
          )}
        >
          {due.text}
        </span>
      )}

      {/* Assigned user / role */}
      <span className="text-xs text-white/40 shrink-0 w-20 text-right truncate">
        {is_unowned ? (
          <span className="inline-flex items-center gap-1">
            <span
              data-testid="unowned-pulse"
              className="inline-block h-2 w-2 rounded-full bg-[var(--color-coral,#FF6F61)] animate-pulse"
            />
            {assigned_role || 'Unowned'}
          </span>
        ) : (
          assigned_user || assigned_role || ''
        )}
      </span>

      {/* Claim button */}
      {is_unowned && (
        <button
          data-testid="claim-button"
          disabled={isClaiming}
          onClick={() => onClaim(name)}
          className={cn(
            'text-xs px-2.5 py-1 rounded-md shrink-0 transition-colors',
            'bg-[var(--color-primary,#006666)] text-white hover:bg-[var(--color-primary,#006666)]/80',
            isClaiming && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isClaiming ? (
            <span data-testid="claim-spinner" className="inline-block h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Claim'
          )}
        </button>
      )}
    </div>
  );
}

function Toast({ message, visible }) {
  if (!visible) return null;
  return (
    <div
      data-testid="inline-toast"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[var(--color-slate,#34424A)] text-white text-xs px-4 py-2 rounded-lg shadow-lg border border-white/10 z-10"
    >
      {message}
    </div>
  );
}

export default function WorkboardMojo() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const [toast, setToast] = useState({ message: '', visible: false });

  const [sortPref, setSortPref] = useState(loadSortPreference);

  useEffect(() => {
    let cancelled = false;
    fetchTasks()
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
  }, []);

  const showToast = useCallback((message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  }, []);

  const handleClaim = useCallback(async (taskId) => {
    setClaimingId(taskId);
    try {
      const result = await postClaim(taskId);
      setTasks((prev) =>
        prev.map((t) =>
          t.name === taskId
            ? { ...t, assigned_user: result.assigned_user || 'You', is_unowned: false }
            : t
        )
      );
    } catch (err) {
      showToast(err.message);
      if (err.status === 409) {
        fetchTasks().then(setTasks).catch(() => {});
      }
    } finally {
      setClaimingId(null);
    }
  }, [showToast]);

  const handleSortChange = useCallback((field, direction) => {
    setSortPref({ field, direction });
    saveSortPreference(field, direction);
  }, []);

  const sorted = useMemo(
    () => sortTasks(tasks, sortPref.field, sortPref.direction),
    [tasks, sortPref.field, sortPref.direction]
  );

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div data-testid="error-state" className="flex items-center justify-center h-full p-8">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div data-testid="empty-state" className="flex flex-col items-center justify-center h-full p-8 gap-3">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
          <span className="text-2xl">&#10003;</span>
        </div>
        <p className="text-white/50 text-sm text-center">
          No tasks on your plate. You&apos;re all caught up.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
          Workboard
        </h2>
      </div>
      <SortToolbar
        sortField={sortPref.field}
        sortDirection={sortPref.direction}
        onSortChange={handleSortChange}
      />
      <div className="flex-1 overflow-y-auto">
        {sorted.map((task) => (
          <TaskRow key={task.name} task={task} claimingId={claimingId} onClaim={handleClaim} />
        ))}
      </div>
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
