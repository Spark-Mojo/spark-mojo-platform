/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WorkboardMojo from '../WorkboardMojo';

const MOCK_TASKS = [
  {
    name: 'SM-TASK-001',
    title: 'Review quarterly report',
    task_type: 'Review',
    canonical_state: 'Ready',
    priority: 'High',
    due_at: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days out
    created_at: '2026-03-20T10:00:00.000Z',
    assigned_user: 'alice@test.com',
    is_unowned: false,
  },
  {
    name: 'SM-TASK-002',
    title: 'Approve vendor invoice for the new office equipment purchase order that exceeds the normal limit',
    task_type: 'Approval',
    canonical_state: 'New',
    priority: 'Urgent',
    due_at: new Date(Date.now() - 86400000).toISOString(), // yesterday — overdue
    created_at: '2026-03-22T08:00:00.000Z',
    assigned_user: 'bob@test.com',
    is_unowned: false,
  },
  {
    name: 'SM-TASK-003',
    title: 'Process customer refund',
    task_type: 'Action',
    canonical_state: 'New',
    priority: 'Medium',
    due_at: null, // no due date — sorts last
    created_at: '2026-03-18T12:00:00.000Z',
    assigned_role: 'Support',
    is_unowned: true,
  },
];

const MOCK_FULL_TASK = {
  name: 'SM-TASK-001',
  title: 'Review quarterly report',
  task_type: 'Review',
  canonical_state: 'Ready',
  priority: 'High',
  due_at: '2026-03-28T10:00:00.000Z',
  assigned_user: 'alice@test.com',
  assigned_role: 'Finance',
  source_system: 'ERPNext',
  completion_criteria: 'All sections reviewed and approved',
  comments: [
    { name: 'CMT-001', comment: 'First comment', comment_by: 'alice@test.com', created_at: '2026-03-20T10:00:00.000Z' },
    { name: 'CMT-002', comment: 'Second comment', comment_by: 'bob@test.com', created_at: '2026-03-21T14:00:00.000Z' },
  ],
  state_history: [
    { name: 'SH-001', to_state: 'New', changed_at: '2026-03-19T08:00:00.000Z' },
    { name: 'SH-002', to_state: 'Ready', changed_at: '2026-03-20T09:00:00.000Z' },
  ],
};

function mockFetchSuccess(tasks = MOCK_TASKS) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ tasks }),
      text: () => Promise.resolve(JSON.stringify({ tasks })),
    })
  );
}

function mockFetchError() {
  return vi.fn(() =>
    Promise.resolve({
      ok: false,
      status: 500,
      text: () => Promise.resolve(JSON.stringify({ detail: 'Server error' })),
    })
  );
}

function mockFetchSequence(responses) {
  let callIndex = 0;
  return vi.fn(() => {
    const resp = responses[callIndex] || responses[responses.length - 1];
    callIndex++;
    return Promise.resolve(resp);
  });
}

describe('WorkboardMojo', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    cleanup();
    localStorage.clear();
  });

  it('renders loading skeleton initially', () => {
    globalThis.fetch = vi.fn(() => new Promise(() => {})); // never resolves
    render(<WorkboardMojo />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders task list after successful fetch', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    expect(screen.getByText('Review quarterly report')).toBeInTheDocument();
    expect(screen.getByText('Process customer refund')).toBeInTheDocument();
  });

  it('renders empty state when no tasks', async () => {
    globalThis.fetch = mockFetchSuccess([]);
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText(/No tasks on your plate/)).toBeInTheDocument();
  });

  it('renders error state on fetch failure', async () => {
    globalThis.fetch = mockFetchError();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  it('truncates long titles at 60 chars', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    const truncated = 'Approve vendor invoice for the new office equipment purchase...';
    expect(screen.getAllByText(truncated).length).toBeGreaterThanOrEqual(1);
  });

  it('sorts tasks by due_at ascending, nulls last', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    const rows = screen.getAllByTestId('task-row');
    // Overdue (yesterday) first, then 3 days, then null
    expect(rows[0]).toHaveTextContent(/Approve vendor/);
    expect(rows[1]).toHaveTextContent(/Review quarterly/);
    expect(rows[2]).toHaveTextContent(/Process customer/);
  });

  it('shows "Overdue" in red for past due dates', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    const overdueBadges = screen.getAllByText('Overdue');
    expect(overdueBadges.length).toBeGreaterThanOrEqual(1);
    expect(overdueBadges[0]).toHaveClass('text-red-500');
  });

  it('shows pulsing indicator for unowned tasks', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    const pulses = screen.getAllByTestId('unowned-pulse');
    expect(pulses.length).toBeGreaterThanOrEqual(1);
    expect(pulses[0]).toHaveClass('animate-pulse');
  });

  // --- STORY-008b: Claim action tests ---

  it('renders Claim button only on unowned rows', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    const claimButtons = screen.getAllByTestId('claim-button');
    // Only SM-TASK-003 is unowned
    expect(claimButtons).toHaveLength(1);
    expect(claimButtons[0]).toHaveTextContent('Claim');
  });

  it('calls POST /api/modules/tasks/claim with correct task_id on click', async () => {
    const fetchMock = mockFetchSequence([
      // Initial list fetch
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      // Claim response — API returns { task: {...} } shape
      { ok: true, status: 200, json: () => Promise.resolve({ task: { assigned_user: 'me@test.com', is_unowned: false, canonical_state: 'In Progress' } }), text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    const claimBtn = screen.getByTestId('claim-button');
    fireEvent.click(claimBtn);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const claimCall = fetchMock.mock.calls[1];
    expect(claimCall[0]).toContain('/api/modules/tasks/claim');
    expect(JSON.parse(claimCall[1].body)).toEqual({ task_id: 'SM-TASK-003' });
    expect(claimCall[1].method).toBe('POST');
  });

  it('updates row on successful claim: removes pulse and Claim button', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      { ok: true, status: 200, json: () => Promise.resolve({ task: { assigned_user: 'me@test.com', is_unowned: false, canonical_state: 'In Progress' } }), text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    const claimBtn = screen.getByTestId('claim-button');
    fireEvent.click(claimBtn);
    await waitFor(() => {
      expect(screen.queryByTestId('claim-button')).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('unowned-pulse')).not.toBeInTheDocument();
    expect(screen.getByText('me@test.com')).toBeInTheDocument();
  });

  it('shows "already claimed" toast on 409 response', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      { ok: false, status: 409, json: () => Promise.resolve({}), text: () => Promise.resolve('') },
      // Re-fetch after 409
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    const claimBtn = screen.getByTestId('claim-button');
    fireEvent.click(claimBtn);
    await waitFor(() => {
      expect(screen.getByTestId('inline-toast')).toBeInTheDocument();
    });
    expect(screen.getByText('This task was already claimed')).toBeInTheDocument();
  });

  it('shows generic error toast on non-409 claim failure', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      { ok: false, status: 500, json: () => Promise.resolve({}), text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    const claimBtn = screen.getByTestId('claim-button');
    fireEvent.click(claimBtn);
    await waitFor(() => {
      expect(screen.getByTestId('inline-toast')).toBeInTheDocument();
    });
    expect(screen.getByText(/Could not claim task/)).toBeInTheDocument();
  });

  // --- STORY-008b: Sort controls tests ---

  it('renders sort chips above task list', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    expect(screen.getByTestId('sort-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('sort-chip-due_at')).toBeInTheDocument();
    expect(screen.getByTestId('sort-chip-priority')).toBeInTheDocument();
    expect(screen.getByTestId('sort-chip-created_at')).toBeInTheDocument();
    expect(screen.getByTestId('sort-chip-canonical_state')).toBeInTheDocument();
  });

  it('clicking sort chip re-sorts the list', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    // Default is due_at asc. Click priority chip to sort by priority.
    fireEvent.click(screen.getByTestId('sort-chip-priority'));
    const rows = screen.getAllByTestId('task-row');
    // Priority asc: Urgent (0), High (1), Medium (2)
    expect(rows[0]).toHaveTextContent(/Approve vendor/); // Urgent
    expect(rows[1]).toHaveTextContent(/Review quarterly/); // High
    expect(rows[2]).toHaveTextContent(/Process customer/); // Medium
  });

  it('persists sort preference to localStorage', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getByTestId('sort-chip-priority'));
    const stored = JSON.parse(localStorage.getItem('workboard_sort_preference'));
    expect(stored).toEqual({ field: 'priority', direction: 'asc' });
  });

  it('restores sort preference from localStorage on mount', async () => {
    localStorage.setItem('workboard_sort_preference', JSON.stringify({ field: 'created_at', direction: 'desc' }));
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    // created_at desc: 2026-03-22 first, then 2026-03-20, then 2026-03-18
    const rows = screen.getAllByTestId('task-row');
    expect(rows[0]).toHaveTextContent(/Approve vendor/); // 2026-03-22
    expect(rows[1]).toHaveTextContent(/Review quarterly/); // 2026-03-20
    expect(rows[2]).toHaveTextContent(/Process customer/); // 2026-03-18
  });

  // --- STORY-009: Task detail drawer tests ---

  it('opens drawer with correct task data when row is clicked', async () => {
    const fetchMock = mockFetchSequence([
      // Initial list
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      // GET /get for task detail
      { ok: true, json: () => Promise.resolve({ task: MOCK_FULL_TASK }), text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    // Click first row (SM-TASK-002 is first due to sort by due_at asc)
    fireEvent.click(screen.getAllByTestId('task-row')[1]); // SM-TASK-001
    await waitFor(() => {
      expect(screen.getByTestId('task-detail-drawer')).toBeInTheDocument();
    });
    expect(screen.getByTestId('drawer-title')).toHaveTextContent('Review quarterly report');
    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.getByText('Second comment')).toBeInTheDocument();
  });

  it('shows loading skeleton in drawer while fetching task', async () => {
    let resolveGet;
    const getPromise = new Promise((r) => { resolveGet = r; });
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      { ok: true, json: () => getPromise, text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getAllByTestId('task-row')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('drawer-skeleton')).toBeInTheDocument();
    });
    resolveGet({ task: MOCK_FULL_TASK });
    await waitFor(() => {
      expect(screen.queryByTestId('drawer-skeleton')).not.toBeInTheDocument();
    });
  });

  it('calls POST update_state and updates workboard row on state change', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      { ok: true, json: () => Promise.resolve({ task: MOCK_FULL_TASK }), text: () => Promise.resolve('') },
      // POST update_state
      { ok: true, json: () => Promise.resolve({ canonical_state: 'In Progress' }), text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getAllByTestId('task-row')[1]);
    await waitFor(() => {
      expect(screen.getByTestId('state-selector')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('state-selector'), { target: { value: 'In Progress' } });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    const updateCall = fetchMock.mock.calls[2];
    expect(updateCall[0]).toContain('/api/modules/tasks/update_state');
    expect(JSON.parse(updateCall[1].body)).toMatchObject({ task_id: 'SM-TASK-001', canonical_state: 'In Progress' });
  });

  it('shows status_reason input when transitioning to Blocked', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      { ok: true, json: () => Promise.resolve({ task: MOCK_FULL_TASK }), text: () => Promise.resolve('') },
      // POST update_state after reason is entered
      { ok: true, json: () => Promise.resolve({ canonical_state: 'Blocked' }), text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getAllByTestId('task-row')[1]);
    await waitFor(() => {
      expect(screen.getByTestId('state-selector')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('state-selector'), { target: { value: 'Blocked' } });
    await waitFor(() => {
      expect(screen.getByTestId('status-reason-prompt')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('status-reason-input'), { target: { value: 'Waiting on vendor' } });
    fireEvent.click(screen.getByTestId('confirm-reason-btn'));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    const body = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(body.status_reason).toBe('Waiting on vendor');
    expect(body.canonical_state).toBe('Blocked');
  });

  it('calls POST add_comment and shows new comment in drawer', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      { ok: true, json: () => Promise.resolve({ task: MOCK_FULL_TASK }), text: () => Promise.resolve('') },
      // POST add_comment
      {
        ok: true,
        json: () => Promise.resolve({
          comments: [
            ...MOCK_FULL_TASK.comments,
            { name: 'CMT-003', comment: 'New test comment', comment_by: 'me@test.com', created_at: '2026-03-25T12:00:00.000Z' },
          ],
        }),
        text: () => Promise.resolve(''),
      },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getAllByTestId('task-row')[1]);
    await waitFor(() => {
      expect(screen.getByTestId('comment-input')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('comment-input'), { target: { value: 'New test comment' } });
    fireEvent.click(screen.getByTestId('comment-submit'));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    const commentCall = fetchMock.mock.calls[2];
    expect(commentCall[0]).toContain('/api/modules/tasks/add_comment');
    expect(JSON.parse(commentCall[1].body)).toMatchObject({ task_id: 'SM-TASK-001', comment: 'New test comment' });
    await waitFor(() => {
      expect(screen.getByText('New test comment')).toBeInTheDocument();
    });
  });

  it('calls POST complete, closes drawer, and removes row from list', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      { ok: true, json: () => Promise.resolve({ task: MOCK_FULL_TASK }), text: () => Promise.resolve('') },
      // POST complete
      { ok: true, json: () => Promise.resolve({ canonical_state: 'Completed' }), text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getAllByTestId('task-row')[1]);
    await waitFor(() => {
      expect(screen.getByTestId('complete-button')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('complete-button'));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    const completeCall = fetchMock.mock.calls[2];
    expect(completeCall[0]).toContain('/api/modules/tasks/complete');
    await waitFor(() => {
      expect(screen.queryByTestId('task-detail-drawer')).not.toBeInTheDocument();
    });
    expect(screen.getAllByTestId('task-row')).toHaveLength(2);
  });

  it('closes drawer when Escape is pressed', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      { ok: true, json: () => Promise.resolve({ task: MOCK_FULL_TASK }), text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getAllByTestId('task-row')[1]);
    await waitFor(() => {
      expect(screen.getByTestId('task-detail-drawer')).toBeInTheDocument();
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('task-detail-drawer')).not.toBeInTheDocument();
    });
  });

  it('closes drawer when backdrop is clicked', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      { ok: true, json: () => Promise.resolve({ task: MOCK_FULL_TASK }), text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getAllByTestId('task-row')[1]);
    await waitFor(() => {
      expect(screen.getByTestId('drawer-backdrop')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('drawer-backdrop'));
    await waitFor(() => {
      expect(screen.queryByTestId('task-detail-drawer')).not.toBeInTheDocument();
    });
  });

  // --- STORY-010: Kanban view toggle tests ---

  it('renders view toggle with List and Kanban buttons', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('view-toggle-list')).toBeInTheDocument();
    expect(screen.getByTestId('view-toggle-kanban')).toBeInTheDocument();
  });

  it('defaults to list view', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    expect(screen.queryByTestId('kanban-board')).not.toBeInTheDocument();
    expect(screen.getByTestId('sort-toolbar')).toBeInTheDocument();
  });

  it('shows kanban columns when Kanban toggle is clicked', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getByTestId('view-toggle-kanban'));
    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    expect(screen.getAllByTestId('kanban-column')).toHaveLength(6);
    expect(screen.queryByTestId('sort-toolbar')).not.toBeInTheDocument();
  });

  it('kanban columns show correct task counts', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getByTestId('view-toggle-kanban'));
    const counts = screen.getAllByTestId('kanban-column-count');
    // New: 2 (SM-TASK-002 + SM-TASK-003), Ready: 1 (SM-TASK-001), In Progress: 0, Waiting: 0, Blocked: 0, Other: 0
    expect(counts[0]).toHaveTextContent('2'); // New
    expect(counts[1]).toHaveTextContent('1'); // Ready
    expect(counts[2]).toHaveTextContent('0'); // In Progress
    expect(counts[3]).toHaveTextContent('0'); // Waiting
    expect(counts[4]).toHaveTextContent('0'); // Blocked
    expect(counts[5]).toHaveTextContent('0'); // Other
  });

  it('tasks appear in correct kanban columns by canonical_state', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getByTestId('view-toggle-kanban'));
    const cards = screen.getAllByTestId('kanban-card');
    expect(cards).toHaveLength(3);
    // New column should have SM-TASK-002 and SM-TASK-003
    const columns = screen.getAllByTestId('kanban-column');
    const newColumnCards = columns[0].querySelectorAll('[data-testid="kanban-card"]');
    expect(newColumnCards).toHaveLength(2);
    const readyColumnCards = columns[1].querySelectorAll('[data-testid="kanban-card"]');
    expect(readyColumnCards).toHaveLength(1);
  });

  it('clicking kanban card opens detail drawer', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      { ok: true, json: () => Promise.resolve({ task: MOCK_FULL_TASK }), text: () => Promise.resolve('') },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getByTestId('view-toggle-kanban'));
    const cards = screen.getAllByTestId('kanban-card');
    fireEvent.click(cards[0]);
    await waitFor(() => {
      expect(screen.getByTestId('task-detail-drawer')).toBeInTheDocument();
    });
  });

  it('empty kanban columns render with zero count', async () => {
    const singleTask = [MOCK_TASKS[0]]; // Only Ready state task
    globalThis.fetch = mockFetchSuccess(singleTask);
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(1);
    });
    fireEvent.click(screen.getByTestId('view-toggle-kanban'));
    const counts = screen.getAllByTestId('kanban-column-count');
    expect(counts[0]).toHaveTextContent('0'); // New
    expect(counts[1]).toHaveTextContent('1'); // Ready
    expect(counts[2]).toHaveTextContent('0'); // In Progress
    expect(counts[3]).toHaveTextContent('0'); // Waiting
    expect(counts[4]).toHaveTextContent('0'); // Blocked
    expect(counts[5]).toHaveTextContent('0'); // Other
  });

  it('persists view preference to localStorage', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getByTestId('view-toggle-kanban'));
    expect(localStorage.getItem('workboard_view_preference')).toBe('kanban');
  });

  it('claim response with { task: {...} } shape updates task row with server state', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: () => Promise.resolve({ tasks: MOCK_TASKS }), text: () => Promise.resolve('') },
      {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          task: {
            name: 'SM-TASK-003',
            assigned_user: 'claimed@test.com',
            canonical_state: 'In Progress',
            is_unowned: false,
          },
        }),
        text: () => Promise.resolve(''),
      },
    ]);
    globalThis.fetch = fetchMock;
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(3);
    });
    fireEvent.click(screen.getByTestId('claim-button'));
    await waitFor(() => {
      expect(screen.getByText('claimed@test.com')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('claim-button')).not.toBeInTheDocument();
  });

  it('kanban Other column catches tasks in non-column states', async () => {
    const tasksWithFailed = [
      ...MOCK_TASKS,
      {
        name: 'SM-TASK-004',
        title: 'Failed task',
        task_type: 'Action',
        canonical_state: 'Failed',
        priority: 'Low',
        due_at: null,
        assigned_user: 'alice@test.com',
        is_unowned: false,
      },
    ];
    globalThis.fetch = mockFetchSuccess(tasksWithFailed);
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getAllByTestId('task-row')).toHaveLength(4);
    });
    fireEvent.click(screen.getByTestId('view-toggle-kanban'));
    const columns = screen.getAllByTestId('kanban-column');
    // Other column is last (index 5)
    const otherCards = columns[5].querySelectorAll('[data-testid="kanban-card"]');
    expect(otherCards).toHaveLength(1);
  });

  it('restores view preference from localStorage on mount', async () => {
    localStorage.setItem('workboard_view_preference', 'kanban');
    globalThis.fetch = mockFetchSuccess();
    render(<WorkboardMojo />);
    await waitFor(() => {
      expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('kanban-column')).toHaveLength(6);
    expect(screen.queryByTestId('task-row')).not.toBeInTheDocument();
  });
});
