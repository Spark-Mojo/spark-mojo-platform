/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
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

describe('WorkboardMojo', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    cleanup();
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
    // The approval task title is > 60 chars, should be truncated with ellipsis
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
});
