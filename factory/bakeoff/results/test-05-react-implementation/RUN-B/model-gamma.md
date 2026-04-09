model: model-gamma
test: 05-react-implementation
run: B
date: 2026-04-09

Here are both files implementing the spec exactly.

### Component

```jsx
/* eslint-disable react/prop-types */

const STATE_CONFIG = {
  draft:                  { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strike: false },
  ready_to_submit:        { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strike: false },
  submitted:              { bg: 'var(--sm-info-bg)',    text: 'var(--sm-info-text)',    strike: false },
  pending_review:         { bg: 'var(--sm-info-bg)',    text: 'var(--sm-info-text)',    strike: false },
  under_review:           { bg: 'var(--sm-info-bg)',    text: 'var(--sm-info-text)',    strike: false },
  acknowledged:           { bg: 'var(--sm-info-bg)',    text: 'var(--sm-info-text)',    strike: false },
  accepted:               { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strike: false },
  paid:                   { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)', strike: false },
  partial_payment:        { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)', strike: false },
  rejected:               { bg: 'var(--sm-error-bg)',   text: 'var(--sm-error-text)',   strike: false },
  denied:                 { bg: 'var(--sm-error-bg)',   text: 'var(--sm-error-text)',   strike: false },
  appeal_pending:         { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strike: false },
  appeal_submitted:       { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strike: false },
  adjudicated:            { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strike: false },
  written_off:            { bg: 'var(--sm-muted-bg)',   text: 'var(--sm-muted-text)',   strike: true  },
  voided:                 { bg: 'var(--sm-muted-bg)',   text: 'var(--sm-muted-text)',   strike: true  },
  cancelled:              { bg: 'var(--sm-muted-bg)',   text: 'var(--sm-muted-text)',   strike: true  },
  error:                  { bg: 'var(--sm-error-bg)',   text: 'var(--sm-error-text)',   strike: false },
  failed:                 { bg: 'var(--sm-error-bg)',   text: 'var(--sm-error-text)',   strike: false },
};

const SIZE_STYLES = {
  sm: { fontSize: '11px', padding: '2px 8px', borderRadius: '9999px' },
  md: { fontSize: '13px', padding: '4px 12px', borderRadius: '9999px' },
};

function formatLabel(state) {
  return state.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export default function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  const config = STATE_CONFIG[state];
  const isKnown = !!config;
  const label = isKnown ? formatLabel(state) : 'Unknown';
  const bg = config?.bg ?? 'var(--sm-neutral-bg)';
  const text = config?.text ?? 'var(--sm-neutral-text)';
  const strike = config?.strike ?? false;
  const sizeStyle = SIZE_STYLES[size] ?? SIZE_STYLES.sm;

  return (
    <span
      data-testid="claim-status-pill"
      className="inline-flex items-center gap-1 font-medium whitespace-nowrap"
      style={{
        ...sizeStyle,
        backgroundColor: bg,
        color: text,
        textDecoration: strike ? 'line-through' : undefined,
      }}
    >
      {showIcon && (
        <span
          data-testid="status-icon"
          className="inline-block shrink-0"
          style={{
            height: size === 'md' ? '8px' : '6px',
            width: size === 'md' ? '8px' : '6px',
            borderRadius: '9999px',
            backgroundColor: 'currentColor',
          }}
        />
      )}
      {label}
    </span>
  );
}
```

### Tests

```jsx
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
    expect(pill.textContent.trim()).toBe('Written off');
    expect(pill.style.textDecoration).toBe('line-through');
    expect(pill.style.backgroundColor).toBe('var(--sm-muted-bg)');
    expect(pill.style.color).toBe('var(--sm-muted-text)');
  });

  it('renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)', () => {
    const { getByTestId } = render(<ClaimStatusPill state="some_bizarre_state" />);
    const pill = getByTestId('claim-status-pill');
    expect(pill.textContent.trim()).toBe('Unknown');
    expect(pill.style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(pill.style.color).toBe('var(--sm-neutral-text)');
  });

  it('size="md" applies correct font-size and padding', () => {
    const { getByTestId } = render(<ClaimStatusPill state="submitted" size="md" />);
    const pill = getByTestId('claim-status-pill');
    expect(pill.style.fontSize).toBe('13px');
    expect(pill.style.padding).toBe('4px 12px');
  });

  it('showIcon=false hides the icon element', () => {
    const { queryByTestId } = render(<ClaimStatusPill state="accepted" showIcon={false} />);
    expect(queryByTestId('status-icon')).toBeNull();
  });
});
```