model: model-alpha
test: 05-react-implementation
run: C
date: 2026-04-09

```jsx
/* frontend/src/components/mojos/ClaimStatusPill.jsx */
/* eslint-disable react/prop-types */

const STATE_COLORS = {
  draft: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)' },
  ready_to_submit: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)' },
  submitted: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)' },
  pending_review: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)' },
  under_review: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)' },
  acknowledged: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)' },
  accepted: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)' },
  paid: { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)' },
  partial_payment: { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)' },
  rejected: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)' },
  denied: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)' },
  appeal_pending: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)' },
  appeal_submitted: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)' },
  adjudicated: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)' },
  written_off: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)' },
  voided: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)' },
  cancelled: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)' },
  error: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)' },
  failed: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)' },
};

const STRIKETHROUGH_STATES = ['written_off', 'voided', 'cancelled'];

const SIZE_STYLES = {
  sm: { fontSize: '11px', padding: '2px 8px', borderRadius: '9999px' },
  md: { fontSize: '13px', padding: '4px 12px', borderRadius: '9999px' },
};

function formatLabel(state) {
  if (!state) return 'Unknown';
  const withSpaces = state.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export default function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  const colors = STATE_COLORS[state] || { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)' };
  const label = STATE_COLORS[state] ? formatLabel(state) : 'Unknown';
  const sizeStyles = SIZE_STYLES[size] || SIZE_STYLES.sm;
  const hasStrikethrough = STRIKETHROUGH_STATES.includes(state);

  return (
    <span
      data-testid="claim-status-pill"
      style={{
        ...sizeStyles,
        backgroundColor: colors.bg,
        color: colors.text,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        textDecoration: hasStrikethrough ? 'line-through' : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {showIcon && (
        <span
          data-testid="claim-status-icon"
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
}
```

```jsx
/* frontend/src/components/mojos/ClaimStatusPill.test.jsx */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  it('renders "draft" with neutral styling', () => {
    render(<ClaimStatusPill state="draft" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain('Draft');
    expect(pill.style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(pill.style.color).toBe('var(--sm-neutral-text)');
  });

  it('renders "paid" with success styling', () => {
    render(<ClaimStatusPill state="paid" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain('Paid');
    expect(pill.style.backgroundColor).toBe('var(--sm-success-bg)');
    expect(pill.style.color).toBe('var(--sm-success-text)');
  });

  it('renders "denied" with error styling', () => {
    render(<ClaimStatusPill state="denied" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain('Denied');
    expect(pill.style.backgroundColor).toBe('var(--sm-error-bg)');
    expect(pill.style.color).toBe('var(--sm-error-text)');
  });

  it('renders "written_off" with strikethrough text style applied', () => {
    render(<ClaimStatusPill state="written_off" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain('Written off');
    expect(pill.style.textDecoration).toBe('line-through');
  });

  it('renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)', () => {
    render(<ClaimStatusPill state="completely_unknown_state" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain('Unknown');
    expect(pill.style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(pill.style.color).toBe('var(--sm-neutral-text)');
  });

  it('size="md" applies correct font-size and padding', () => {
    render(<ClaimStatusPill state="draft" size="md" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill.style.fontSize).toBe('13px');
    expect(pill.style.padding).toBe('4px 12px');
  });

  it('showIcon=false hides the icon element', () => {
    render(<ClaimStatusPill state="draft" showIcon={false} />);
    const icon = screen.queryByTestId('claim-status-icon');
    expect(icon).not.toBeInTheDocument();
  });
});
```