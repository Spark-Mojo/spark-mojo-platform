model: model-alpha
test: 05-react-implementation
run: B
date: 2026-04-09

### Component: `ClaimStatusPill.jsx`

```jsx
// frontend/src/components/mojos/ClaimStatusPill.jsx

import React from 'react';

const STATE_MAP = {
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
  written_off: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strikethrough: true },
  voided: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strikethrough: true },
  cancelled: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strikethrough: true },
  error: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)' },
  failed: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)' },
};

const DEFAULT_COLORS = { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)' };

const SIZE_STYLES = {
  sm: {
    fontSize: '11px',
    padding: '2px 8px',
  },
  md: {
    fontSize: '13px',
    padding: '4px 12px',
  },
};

function formatLabel(state) {
  if (!state) return 'Unknown';
  const withSpaces = state.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export default function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  const config = STATE_MAP[state] || DEFAULT_COLORS;
  const isUnknown = !STATE_MAP[state];
  const label = isUnknown ? 'Unknown' : formatLabel(state);

  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;

  const containerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '9999px',
    backgroundColor: config.bg,
    color: config.text,
    textDecoration: config.strikethrough ? 'line-through' : 'none',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    lineHeight: '1.4',
    whiteSpace: 'nowrap',
    ...sizeStyle,
  };

  const iconStyle = {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: config.text,
    marginRight: '6px',
    flexShrink: 0,
  };

  return (
    <span style={containerStyle} data-testid="claim-status-pill">
      {showIcon && <span style={iconStyle} data-testid="status-icon" />}
      <span>{label}</span>
    </span>
  );
}
```

### Test File: `ClaimStatusPill.test.jsx`

```jsx
// frontend/src/components/mojos/ClaimStatusPill.test.jsx

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  it('renders "draft" with neutral styling', () => {
    const { getByTestId } = render(<ClaimStatusPill state="draft" />);
    const pill = getByTestId('claim-status-pill');
    expect(pill.textContent).toBe('Draft');
    expect(pill.style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(pill.style.color).toBe('var(--sm-neutral-text)');
  });

  it('renders "paid" with success styling', () => {
    const { getByTestId } = render(<ClaimStatusPill state="paid" />);
    const pill = getByTestId('claim-status-pill');
    expect(pill.textContent).toBe('Paid');
    expect(pill.style.backgroundColor).toBe('var(--sm-success-bg)');
    expect(pill.style.color).toBe('var(--sm-success-text)');
  });

  it('renders "denied" with error styling', () => {
    const { getByTestId } = render(<ClaimStatusPill state="denied" />);
    const pill = getByTestId('claim-status-pill');
    expect(pill.textContent).toBe('Denied');
    expect(pill.style.backgroundColor).toBe('var(--sm-error-bg)');
    expect(pill.style.color).toBe('var(--sm-error-text)');
  });

  it('renders "written_off" with strikethrough text style applied', () => {
    const { getByTestId } = render(<ClaimStatusPill state="written_off" />);
    const pill = getByTestId('claim-status-pill');
    expect(pill.textContent).toBe('Written off');
    expect(pill.style.textDecoration).toBe('line-through');
    expect(pill.style.backgroundColor).toBe('var(--sm-muted-bg)');
  });

  it('renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)', () => {
    const { getByTestId } = render(<ClaimStatusPill state="not_a_real_state" />);
    const pill = getByTestId('claim-status-pill');
    expect(pill.textContent).toBe('Unknown');
    expect(pill.style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(pill.style.color).toBe('var(--sm-neutral-text)');
  });

  it('size="md" applies correct font-size and padding', () => {
    const { getByTestId } = render(<ClaimStatusPill state="draft" size="md" />);
    const pill = getByTestId('claim-status-pill');
    expect(pill.style.fontSize).toBe('13px');
    expect(pill.style.padding).toBe('4px 12px');
  });

  it('showIcon=false hides the icon element', () => {
    const { queryByTestId } = render(<ClaimStatusPill state="draft" showIcon={false} />);
    const icon = queryByTestId('status-icon');
    expect(icon).toBeNull();
  });
});
```