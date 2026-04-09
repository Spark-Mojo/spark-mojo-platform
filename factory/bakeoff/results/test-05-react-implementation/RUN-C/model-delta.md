model: model-delta
test: 05-react-implementation
run: C
date: 2026-04-09

Looking at the spec, I need to build two files only:

1. `frontend/src/components/mojos/ClaimStatusPill.jsx`
2. The Vitest test file

The injected code context is irrelevant noise — the spec is explicit. Let me implement precisely what's described.

---

**`frontend/src/components/mojos/ClaimStatusPill.jsx`**

```jsx
/* eslint-disable react/prop-types */

const STATE_MAP = {
  draft:            { bg: 'var(--sm-neutral-bg)',  text: 'var(--sm-neutral-text)',  strike: false },
  ready_to_submit:  { bg: 'var(--sm-neutral-bg)',  text: 'var(--sm-neutral-text)',  strike: false },
  submitted:        { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)',     strike: false },
  pending_review:   { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)',     strike: false },
  under_review:     { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)',     strike: false },
  acknowledged:     { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)',     strike: false },
  accepted:         { bg: 'var(--sm-warning-bg)',  text: 'var(--sm-warning-text)',  strike: false },
  paid:             { bg: 'var(--sm-success-bg)',  text: 'var(--sm-success-text)',  strike: false },
  partial_payment:  { bg: 'var(--sm-success-bg)',  text: 'var(--sm-success-text)',  strike: false },
  rejected:         { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)',    strike: false },
  denied:           { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)',    strike: false },
  appeal_pending:   { bg: 'var(--sm-warning-bg)',  text: 'var(--sm-warning-text)',  strike: false },
  appeal_submitted: { bg: 'var(--sm-warning-bg)',  text: 'var(--sm-warning-text)',  strike: false },
  adjudicated:      { bg: 'var(--sm-neutral-bg)',  text: 'var(--sm-neutral-text)',  strike: false },
  written_off:      { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)',    strike: true  },
  voided:           { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)',    strike: true  },
  cancelled:        { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)',    strike: true  },
  error:            { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)',    strike: false },
  failed:           { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)',    strike: false },
};

const UNKNOWN_STYLE = {
  bg: 'var(--sm-neutral-bg)',
  text: 'var(--sm-neutral-text)',
  strike: false,
};

const SIZE_STYLES = {
  sm: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '9999px',
  },
  md: {
    fontSize: '13px',
    padding: '4px 12px',
    borderRadius: '9999px',
  },
};

function formatLabel(state) {
  if (!state || typeof state !== 'string') return 'Unknown';
  const withSpaces = state.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export default function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  const config = (state && STATE_MAP[state]) ? STATE_MAP[state] : null;
  const isUnknown = config === null;

  const { bg, text, strike } = isUnknown ? UNKNOWN_STYLE : config;
  const label = isUnknown ? 'Unknown' : formatLabel(state);
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;

  const pillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: bg,
    color: text,
    fontSize: sizeStyle.fontSize,
    padding: sizeStyle.padding,
    borderRadius: sizeStyle.borderRadius,
    fontWeight: 500,
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    textDecoration: strike ? 'line-through' : 'none',
  };

  return (
    <span data-testid="claim-status-pill" data-state={state || 'unknown'} style={pillStyle}>
      {showIcon && (
        <span data-testid="claim-status-icon" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {isUnknown ? '?' : '●'}
        </span>
      )}
      <span data-testid="claim-status-label">{label}</span>
    </span>
  );
}
```

---

**`frontend/src/components/mojos/ClaimStatusPill.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  it('renders "draft" with neutral styling', () => {
    render(<ClaimStatusPill state="draft" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(screen.getByTestId('claim-status-label').textContent).toBe('Draft');
    expect(pill.style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(pill.style.color).toBe('var(--sm-neutral-text)');
  });

  it('renders "paid" with success styling', () => {
    render(<ClaimStatusPill state="paid" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(screen.getByTestId('claim-status-label').textContent).toBe('Paid');
    expect(pill.style.backgroundColor).toBe('var(--sm-success-bg)');
    expect(pill.style.color).toBe('var(--sm-success-text)');
  });

  it('renders "denied" with error styling', () => {
    render(<ClaimStatusPill state="denied" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(screen.getByTestId('claim-status-label').textContent).toBe('Denied');
    expect(pill.style.backgroundColor).toBe('var(--sm-error-bg)');
    expect(pill.style.color).toBe('var(--sm-error-text)');
  });

  it('renders "written_off" with strikethrough text style applied', () => {
    render(<ClaimStatusPill state="written_off" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(screen.getByTestId('claim-status-label').textContent).toBe('Written off');
    expect(pill.style.textDecoration).toBe('line-through');
  });

  it('renders unknown state gracefully — shows "Unknown" label, neutral style, no crash', () => {
    render(<ClaimStatusPill state="totally_made_up_state" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(screen.getByTestId('claim-status-label').textContent).toBe('Unknown');
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
  });
});
```

---

<details>
<summary>Implementation notes — why each decision was made this way</summary>

**No external imports.** The spec says pure display, no Frappe, no API. Zero imports beyond React itself — and since this is JSX with no hooks, React doesn't even need to be explicitly imported in modern React (JSX transform). The component has no `useState`, no `useEffect`, nothing.

**`STATE_MAP` is a flat object, not a switch.** A lookup table is O(1), declarative, and makes the 19 states auditable in one glance. Adding a state later is a one-line diff.

**`strike` is a boolean in the map, not derived.** The three muted states (`written_off`, `voided`, `cancelled`) are the only ones with strikethrough. Encoding it directly in the map makes the intent explicit and prevents a separate `STRIKE_STATES` array that could drift.

**`formatLabel` is a pure function, not inline.** The test for `written_off → "Written off"` validates the exact transformation: replace underscores, capitalize first character only (not `toTitleCase`). The function handles `null`/non-string defensively and returns `'Unknown'` — same path as the unknown state guard.

**`data-testid="claim-status-icon"` on the icon span.** The spec test `showIcon=false hides the icon element` needs a reliable selector. `queryByTestId` returning `null` is the cleanest assertion.

**`data-state` attribute on the pill.** Not required by the spec but costs nothing and makes future tests and debugging easier — you can inspect which state a pill represents without parsing its text.

**Size fallback.** `SIZE_STYLES[size] || SIZE_STYLES.sm` means passing `size="lg"` (invalid) silently defaults to `sm` rather than crashing with `undefined` style properties.

</details>