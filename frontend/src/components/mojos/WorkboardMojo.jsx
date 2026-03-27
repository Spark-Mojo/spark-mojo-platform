/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays, parseISO, isToday, isTomorrow, isPast, format } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000') + '/api/modules/tasks';
const SORT_STORAGE_KEY = 'workboard_sort_preference';
const VIEW_STORAGE_KEY = 'workboard_view_preference';
const KANBAN_COLUMNS = ['New', 'Ready', 'In Progress', 'Waiting', 'Blocked', 'Other'];

const CANONICAL_STATES = ['New', 'Ready', 'In Progress', 'Waiting', 'Blocked', 'Failed', 'Completed', 'Canceled'];
const REASON_REQUIRED_STATES = ['Blocked', 'Failed'];

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

const TYPE_COLORS = {
  Action: 'bg-teal-100 text-teal-700',
  Review: 'bg-amber-100 text-amber-800',
  Approval: 'bg-orange-100 text-orange-800',
};

const PRIORITY_COLORS = {
  Urgent: 'bg-red-500',
  High: 'bg-orange-400',
  Medium: 'bg-amber-400',
  Low: 'bg-gray-400',
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

function SortToolbar({ sortField, sortDirection, onSortChange }) {
  return (
    <div data-testid="sort-toolbar" className="flex items-center gap-2 px-4 py-2 border-b border-gray-200">
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          data-testid={`sort-chip-${opt.key}`}
          onClick={() => onSortChange(opt.key, opt.key === sortField ? sortDirection : 'asc')}
          className={cn(
            'text-xs px-2.5 py-1 rounded-full font-medium transition-colors',
            opt.key === sortField
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
          )}
        >
          {opt.label}
        </button>
      ))}
      <button
        data-testid="sort-direction-toggle"
        onClick={() => onSortChange(sortField, sortDirection === 'asc' ? 'desc' : 'asc')}
        className="text-xs text-gray-400 hover:text-gray-600 ml-1 px-1.5 py-1"
        aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
      >
        {sortDirection === 'asc' ? '\u2191' : '\u2193'}
      </button>
    </div>
  );
}

function TaskRow({ task, claimingId, onClaim, selected, onRowClick }) {
  const { name, title, task_type, canonical_state, priority, due_at, assigned_user, assigned_role, is_unowned } = task;
  const due = formatDueDate(due_at);
  const typeColor = TYPE_COLORS[task_type] || 'bg-[var(--color-slate,#34424A)] text-white';
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Low;
  const isClaiming = claimingId === name;

  return (
    <div
      data-testid="task-row"
      onClick={() => onRowClick(name)}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer',
        selected && 'bg-gray-50',
        due?.overdue && 'border-l-[3px] border-l-red-500'
      )}
    >
      {/* Priority dot */}
      <span
        data-testid="priority-dot"
        className={cn('h-2.5 w-2.5 rounded-full shrink-0', priorityColor)}
      />

      {/* Title */}
      <span className="flex-1 text-sm font-medium text-gray-900 truncate min-w-0">
        {truncateTitle(title)}
      </span>

      {/* Task type badge */}
      <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full shrink-0 border-0 font-medium', typeColor)}>
        {task_type || 'Task'}
      </Badge>

      {/* State badge */}
      <Badge className="text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium bg-slate-100 text-slate-700 border-0">
        {canonical_state || 'New'}
      </Badge>

      {/* Due date */}
      {due && (
        <span
          data-testid="due-date"
          className={cn(
            'text-xs shrink-0 font-mono tabular-nums',
            due.overdue ? 'text-red-500 font-medium' : 'text-gray-500'
          )}
        >
          {due.text}
        </span>
      )}

      {/* Assigned user / role */}
      <span className="text-xs text-gray-400 shrink-0 w-20 text-right truncate">
        {is_unowned ? (
          <span className="inline-flex items-center gap-1">
            <span
              data-testid="unowned-pulse"
              className="inline-block h-2 w-2 rounded-full bg-orange-400 animate-pulse"
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
          onClick={(e) => { e.stopPropagation(); onClaim(name); }}
          className={cn(
            'text-xs px-2.5 py-1 rounded font-medium shrink-0 transition-colors',
            'text-teal-600 hover:text-teal-800 hover:bg-teal-50',
            isClaiming && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isClaiming ? (
            <span data-testid="claim-spinner" className="inline-block h-3 w-3 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          ) : (
            'Claim'
          )}
        </button>
      )}
    </div>
  );
}

function TaskDetailDrawer({ task, loading, onClose, onUpdateState, onAddComment, onComplete, stateChanging }) {
  const [commentText, setCommentText] = useState('');
  const [pendingState, setPendingState] = useState(null);
  const [statusReasonInput, setStatusReasonInput] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const commentInputRef = useRef(null);

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

            {/* Status bar */}
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

            {/* Details */}
            <div className="px-6 py-3 border-b border-gray-200 space-y-2">
              <label className="text-xs text-gray-500 block">Details</label>
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

            {/* Complete button */}
            <div className="px-6 py-4 mt-auto">
              <button
                data-testid="complete-button"
                onClick={onComplete}
                className="w-full py-2.5 rounded-lg bg-[#FF6F61] text-white text-sm font-medium hover:bg-[#e5635a] transition-colors"
              >
                Complete Task
              </button>
            </div>
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
          'text-xs px-2 py-1 rounded transition-colors',
          viewMode === 'list'
            ? 'bg-teal-600 text-white'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        )}
        aria-label="List view"
      >
        &#9776;
      </button>
      <button
        data-testid="view-toggle-kanban"
        onClick={() => onViewChange('kanban')}
        className={cn(
          'text-xs px-2 py-1 rounded transition-colors',
          viewMode === 'kanban'
            ? 'bg-teal-600 text-white'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        )}
        aria-label="Kanban view"
      >
        &#9707;
      </button>
    </div>
  );
}

function KanbanCard({ task, selected, onCardClick, index }) {
  const { name, title, priority, due_at, assigned_user, assigned_role, is_unowned } = task;
  const due = formatDueDate(due_at);
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Low;

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
            snapshot.isDragging && 'shadow-lg border-teal-300'
          )}
        >
          <div className="flex items-start gap-2 mb-2">
            <span className={cn('h-2 w-2 rounded-full shrink-0 mt-1', priorityColor)} />
            <span className="text-sm font-medium text-gray-900 line-clamp-2 min-w-0">{title}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              {is_unowned ? (
                <span className="inline-flex items-center gap-1">
                  <span
                    data-testid="kanban-unowned-pulse"
                    className="inline-block h-2 w-2 rounded-full bg-orange-400 animate-pulse"
                  />
                  {assigned_role || 'Unowned'}
                </span>
              ) : (
                assigned_user || assigned_role || ''
              )}
            </span>
            {due && (
              <span className={cn('tabular-nums', due.overdue ? 'text-red-500' : '')}>
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

  // Drawer state
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [drawerTask, setDrawerTask] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [stateChanging, setStateChanging] = useState(false);

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
      const updatedTask = result.task || result;
      setTasks((prev) =>
        prev.map((t) =>
          t.name === taskId
            ? { ...t, ...updatedTask, is_unowned: false }
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

  const handleViewChange = useCallback((mode) => {
    setViewMode(mode);
    saveViewPreference(mode);
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
      setTasks((prev) => prev.filter((t) => t.name !== drawerTask.name));
      handleCloseDrawer();
    } catch (err) {
      showToast(err.message);
    }
  }, [drawerTask, showToast, handleCloseDrawer]);

  const sorted = useMemo(
    () => sortTasks(tasks, sortPref.field, sortPref.direction),
    [tasks, sortPref.field, sortPref.direction]
  );

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div data-testid="error-state" className="flex items-center justify-center h-full p-8">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (sorted.length === 0) {
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
    <div className="relative flex flex-col h-full bg-gray-50 text-gray-900 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900">
          Workboard
        </h2>
        <ViewToggle viewMode={viewMode} onViewChange={handleViewChange} />
      </div>
      {viewMode === 'list' && (
        <SortToolbar
          sortField={sortPref.field}
          sortDirection={sortPref.direction}
          onSortChange={handleSortChange}
        />
      )}
      {viewMode === 'list' ? (
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white rounded-lg border border-gray-200 mx-3 mt-3 overflow-hidden divide-y divide-gray-100">
          {sorted.map((task) => (
            <TaskRow
              key={task.name}
              task={task}
              claimingId={claimingId}
              onClaim={handleClaim}
              selected={selectedTaskId === task.name}
              onRowClick={handleRowClick}
            />
          ))}
          </div>
        </div>
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
            stateChanging={stateChanging}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
