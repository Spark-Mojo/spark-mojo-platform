model: model-gamma
test: 05-react-implementation
run: C
date: 2026-04-09

I'll implement the `ClaimStatusPill` component and its test file exactly as specified.

### Component File

```jsx
import React from 'react';

const STATUS_CONFIG = {
  draft: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', icon: 'circle' },
  ready_to_submit: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', icon: 'upload' },
  submitted: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', icon: 'clock' },
  pending_review: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', icon: 'clock' },
  under_review: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', icon: 'search' },
  acknowledged: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', icon: 'check' },
  accepted: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', icon: 'check' },
  paid: { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)', icon: 'check' },
  partial_payment: { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)', icon: 'partial' },
  rejected: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', icon: 'x' },
  denied: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', icon: 'x' },
  appeal_pending: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', icon: 'clock' },
  appeal_submitted: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', icon: 'upload' },
  adjudicated: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', icon: 'check' },
  written_off: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', icon: 'x', strikethrough: true },
  voided: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', icon: 'x', strikethrough: true },
  cancelled: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', icon: 'x', strikethrough: true },
  error: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', icon: 'x' },
  failed: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', icon: 'x' },
};

const ICON_MAP = {
  circle: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
      <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  upload: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5V1M4 1L2 3M4 1L6 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 5v1.5a.5.5 0 00.5.5h5a.5.5 0 00.5-.5V5" />
    </svg>
  ),
  clock: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="4" cy="4" r="3" />
      <path d="M4 2.5V4l1 .5" strokeLinecap="round" />
    </svg>
  ),
  search: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="3.5" cy="3.5" r="2" />
      <path d="M5.5 5.5L7 7" strokeLinecap="round" />
    </svg>
  ),
  check: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 4L3 5.5L6.5 2" />
    </svg>
  ),
  partial: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="4" cy="4" r="3" fill="none" />
      <path d="M4 1v3" strokeLinecap="round" />
    </svg>
  ),
  x: (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 2l4 4M6 2l-4 4" />
    </svg>
  ),
};

const SIZE_CONFIG = {
  sm: { fontSize: '11px', padding: '2px 8px' },
  md: { fontSize: '13px', padding: '4px 12px' },
};

function formatLabel(state) {
  return state
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  const config = STATUS_CONFIG[state] || { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', icon: 'circle' };
  const label = STATUS_CONFIG[state] ? formatLabel(state) : 'Unknown';
  const sizeStyle = SIZE_CONFIG[size] || SIZE_CONFIG.sm;
  const icon = showIcon ? ICON_MAP[config.icon] : null;

  return (
    <span
      data-testid="claim-status-pill"
      className="claim-status-pill inline-flex items-center gap-1 rounded-full font-medium"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        fontSize: sizeStyle.fontSize,
        padding: sizeStyle.padding,
        borderRadius: '9999px',
        textDecoration: config.strikethrough ? 'line-through' : undefined,
      }}
    >
      {icon}
      {label}
    </span>
  );
}

export default ClaimStatusPill;
```

### Test File

```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  it('renders "draft" with neutral styling', () => {
    const { container } = render(<ClaimStatusPill state="draft" />);
    const pill = container.querySelector('.claim-status-pill');
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-neutral-bg)',
      color: 'var(--sm-neutral-text)',
    });
  });

  it('renders "paid" with success styling', () => {
    const { container } = render(<ClaimStatusPill state="paid" />);
    const pill = container.querySelector('.claim-status-pill');
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-success-bg)',
      color: 'var(--sm-success-text)',
    });
  });

  it('renders "denied" with error styling', () => {
    const { container } = render(<ClaimStatusPill state="denied" />);
    const pill = container.querySelector('.claim-status-pill');
    expect(screen.getByText('Denied')).toBeInTheDocument();
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-error-bg)',
      color: 'var(--sm-error-text)',
    });
  });

  it('renders "written_off" with strikethrough text style applied', () => {
    const { container } = render(<ClaimStatusPill state="written_off" />);
    const pill = container.querySelector('.claim-status-pill');
    expect(screen.getByText('Written off')).toBeInTheDocument();
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-muted-bg)',
      color: 'var(--sm-muted-text)',
      textDecoration: 'line-through',
    });
  });

  it('renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)', () => {
    const { container } = render(<ClaimStatusPill state="some_random_state" />);
    const pill = container.querySelector('.claim-status-pill');
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-neutral-bg)',
      color: 'var(--sm-neutral-text)',
    });
  });

  it('size="md" applies correct font-size and padding', () => {
    const { container } = render(<ClaimStatusPill state="draft" size="md" />);
    const pill = container.querySelector('.claim-status-pill');
    expect(pill).toHaveStyle({
      fontSize: '13px',
      padding: '4px 12px',
    });
  });

  it('showIcon=false hides the icon element', () => {
    const { container } = render(<ClaimStatusPill state="draft" showIcon={false} />);
    const pill = container.querySelector('.claim-status-pill');
    const svg = pill.querySelector('svg');
    expect(svg).toBeNull();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
```