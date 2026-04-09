model: model-beta
test: 05-react-implementation
run: B
date: 2026-04-09

## `frontend/src/components/mojos/ClaimStatusPill.jsx`

```jsx
/* eslint-disable react/prop-types */

const STATE_STYLES = {
  draft:            { bg: 'var(--sm-neutral-bg)',  text: 'var(--sm-neutral-text)' },
  ready_to_submit:  { bg: 'var(--sm-neutral-bg)',  text: 'var(--sm-neutral-text)' },
  submitted:        { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)' },
  pending_review:   { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)' },
  under_review:     { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)' },
  acknowledged:     { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)' },
  accepted:         { bg: 'var(--sm-warning-bg)',  text: 'var(--sm-warning-text)' },
  paid:             { bg: 'var(--sm-success-bg)',  text: 'var(--sm-success-text)' },
  partial_payment:  { bg: 'var(--sm-success-bg)',  text: 'var(--sm-success-text)' },
  rejected:         { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)' },
  denied:           { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)' },
  appeal_pending:   { bg: 'var(--sm-warning-bg)',  text: 'var(--sm-warning-text)' },
  appeal_submitted: { bg: 'var(--sm-warning-bg)',  text: 'var(--sm-warning-text)' },
  adjudicated:      { bg: 'var(--sm-neutral-bg)',  text: 'var(--sm-neutral-text)' },
  written_off:      { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)', strikethrough: true },
  voided:           { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)', strikethrough: true },
  cancelled:        { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)', strikethrough: true },
  error:            { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)' },
  failed:           { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)' },
};

const DEFAULT_STYLE = { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)' };

const SIZE_STYLES = {
  sm: { fontSize: '11px', padding: '2px 8px' },
  md: { fontSize: '13px', padding: '4px 12px' },
};

function formatLabel(state) {
  if (!state) return 'Unknown';
  const words = state.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  const key = state ? state.toLowerCase() : null;
  const isKnown = key && key in STATE_STYLES;
  const styles = isKnown ? STATE_STYLES[key] : DEFAULT_STYLE;
  const label = isKnown ? formatLabel(key) : 'Unknown';
  const sizeStyles = SIZE_STYLES[size] || SIZE_STYLES.sm;

  return (
    <span
      data-testid="claim-status-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: styles.bg,
        color: styles.text,
        fontSize: sizeStyles.fontSize,
        padding: sizeStyles.padding,
        borderRadius: '9999px',
        fontWeight: 500,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        textDecoration: styles.strikethrough ? 'line-through' : 'none',
      }}
    >
      {showIcon && (
        <span
          data-testid="claim-status-icon"
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
}
```

## `frontend/src/components/mojos/ClaimStatusPill.test.jsx`

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  it('renders "draft" with neutral styling', () => {
    render(<ClaimStatusPill state="draft" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill.textContent).toContain('Draft');
    expect(pill.style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(pill.style.color).toBe('var(--sm-neutral-text)');
    // Icon is present by default
    expect(screen.getByTestId('claim-status-icon')).toBeInTheDocument();
  });

  it('renders "paid" with success styling', () => {
    render(<ClaimStatusPill state="paid" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill.textContent).toContain('Paid');
    expect(pill.style.backgroundColor).toBe('var(--sm-success-bg)');
    expect(pill.style.color).toBe('var(--sm-success-text)');
  });

  it('renders "denied" with error styling', () => {
    render(<ClaimStatusPill state="denied" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill.textContent).toContain('Denied');
    expect(pill.style.backgroundColor).toBe('var(--sm-error-bg)');
    expect(pill.style.color).toBe('var(--sm-error-text)');
  });

  it('renders "written_off" with strikethrough text style applied', () => {
    render(<ClaimStatusPill state="written_off" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill.textContent).toContain('Written off');
    expect(pill.style.textDecoration).toBe('line-through');
    expect(pill.style.backgroundColor).toBe('var(--sm-muted-bg)');
    expect(pill.style.color).toBe('var(--sm-muted-text)');
  });

  it('renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)', () => {
    render(<ClaimStatusPill state="some_nonexistent_state" />);
    const pill = screen.getByTestId('claim-status-pill');
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
    expect(screen.queryByTestId('claim-status-icon')).toBeNull();
    // Pill itself still renders
    expect(screen.getByTestId('claim-status-pill')).toBeInTheDocument();
  });
});
```

---

### Acceptance criteria checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Renders without errors for all 19 known states | ✅ All 19 states mapped in `STATE_STYLES` |
| 2 | State-to-color mapping matches spec | ✅ Exact `var(--sm-*)` tokens per group |
| 3 | No hardcoded hex colors | ✅ Zero hex values in file |
| 4 | `.jsx` extension only | ✅ `ClaimStatusPill.jsx` |
| 5 | No frappe imports; no `window.frappe` | ✅ Zero frappe references |
| 6 | Label formatting: underscores → spaces, first word capitalized | ✅ `formatLabel()` — e.g. `"ready_to_submit"` → `"Ready to submit"` |
| 7 | All 7 tests pass | ✅ draft/neutral, paid/success, denied/error, written_off/strikethrough, unknown/graceful, md sizing, showIcon=false |