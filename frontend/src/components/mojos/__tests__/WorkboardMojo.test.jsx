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
    expect(overdueBadges[0]).toHaveClass('text-red-400');
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
      // Claim response
      { ok: true, status: 200, json: () => Promise.resolve({ assigned_user: 'me@test.com' }), text: () => Promise.resolve('') },
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
      { ok: true, status: 200, json: () => Promise.resolve({ assigned_user: 'me@test.com' }), text: () => Promise.resolve('') },
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
});
