/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000') + '/api/modules/tasks';

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

function sortByDueDate(tasks) {
  return [...tasks].sort((a, b) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at) - new Date(b.due_at);
  });
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

function TaskRow({ task }) {
  const { title, task_type, canonical_state, priority, due_at, assigned_user, assigned_role, is_unowned } = task;
  const due = formatDueDate(due_at);
  const typeColor = TYPE_COLORS[task_type] || 'bg-[var(--color-slate,#34424A)] text-white';
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Low;

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
    </div>
  );
}

export default function WorkboardMojo() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const sorted = useMemo(() => sortByDueDate(tasks), [tasks]);

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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
          Workboard
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((task) => (
          <TaskRow key={task.name} task={task} />
        ))}
      </div>
    </div>
  );
}
