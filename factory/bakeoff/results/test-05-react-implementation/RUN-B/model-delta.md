model: model-delta
test: 05-react-implementation
run: B
date: 2026-04-09

I'll analyze the spec carefully, then produce the component and test file.

---

## `frontend/src/components/mojos/ClaimStatusPill.jsx`

```jsx
/* eslint-disable react/prop-types */

const STATE_MAP = {
  draft:             { bg: 'var(--sm-neutral-bg)',  text: 'var(--sm-neutral-text)',  strike: false },
  ready_to_submit:   { bg: 'var(--sm-neutral-bg)',  text: 'var(--sm-neutral-text)',  strike: false },
  submitted:         { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)',     strike: false },
  pending_review:    { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)',     strike: false },
  under_review:      { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)',     strike: false },
  acknowledged:      { bg: 'var(--sm-info-bg)',     text: 'var(--sm-info-text)',     strike: false },
  accepted:          { bg: 'var(--sm-warning-bg)',  text: 'var(--sm-warning-text)', strike: false },
  paid:              { bg: 'var(--sm-success-bg)',  text: 'var(--sm-success-text)', strike: false },
  partial_payment:   { bg: 'var(--sm-success-bg)',  text: 'var(--sm-success-text)', strike: false },
  rejected:          { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)',   strike: false },
  denied:            { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)',   strike: false },
  appeal_pending:    { bg: 'var(--sm-warning-bg)',  text: 'var(--sm-warning-text)', strike: false },
  appeal_submitted:  { bg: 'var(--sm-warning-bg)',  text: 'var(--sm-warning-text)', strike: false },
  adjudicated:       { bg: 'var(--sm-neutral-bg)',  text: 'var(--sm-neutral-text)',  strike: false },
  written_off:       { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)',   strike: true  },
  voided:            { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)',   strike: true  },
  cancelled:         { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)',   strike: true  },
  error:             { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)',   strike: false },
  failed:            { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)',   strike: false },
};

const UNKNOWN_STYLE = {
  bg:   'var(--sm-neutral-bg)',
  text: 'var(--sm-neutral-text)',
};

const SIZE_STYLES = {
  sm: {
    fontSize:     '11px',
    padding:      '2px 8px',
    borderRadius: '9999px',
  },
  md: {
    fontSize:     '13px',
    padding:      '4px 12px',
    borderRadius: '9999px',
  },
};

/**
 * Converts a canonical_state string to a human-readable label.
 * Replaces underscores with spaces; capitalizes first word only.
 * Example: "ready_to_submit" → "Ready to submit"
 */
function formatLabel(state) {
  if (!state || typeof state !== 'string') return 'Unknown';
  const words = state.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * ClaimStatusPill
 *
 * Props:
 *   state    {string}          — canonical_state value (required)
 *   size     {"sm" | "md"}    — pill size (optional, default "sm")
 *   showIcon {boolean}        — show/hide the icon dot (optional, default true)
 */
export default function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  const config = STATE_MAP[state] || null;
  const isUnknown = config === null;

  const bg   = isUnknown ? UNKNOWN_STYLE.bg   : config.bg;
  const text = isUnknown ? UNKNOWN_STYLE.text  : config.text;
  const strike = !isUnknown && config.strike;
  const label  = isUnknown ? 'Unknown' : formatLabel(state);

  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;

  const pillStyle = {
    display:         'inline-flex',
    alignItems:      'center',
    gap:             '4px',
    backgroundColor: bg,
    color:           text,
    fontSize:        sizeStyle.fontSize,
    padding:         sizeStyle.padding,
    borderRadius:    sizeStyle.borderRadius,
    fontWeight:      500,
    lineHeight:      1.4,
    textDecoration:  strike ? 'line-through' : 'none',
    whiteSpace:      'nowrap',
  };

  const iconStyle = {
    display:         'inline-block',
    width:           '6px',
    height:          '6px',
    borderRadius:    '9999px',
    backgroundColor: text,
    flexShrink:      0,
    opacity:         0.7,
  };

  return (
    <span
      data-testid="claim-status-pill"
      data-state={state || 'unknown'}
      style={pillStyle}
    >
      {showIcon && (
        <span
          data-testid="claim-status-pill-icon"
          aria-hidden="true"
          style={iconStyle}
        />
      )}
      <span data-testid="claim-status-pill-label">{label}</span>
    </span>
  );
}
```

---

## `frontend/src/components/mojos/ClaimStatusPill.test.jsx`

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimStatusPill from './ClaimStatusPill';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the computed inline style object on the pill root element.
 * We assert on style properties directly because the component uses
 * inline styles (no class names to test against).
 */
function getPillStyle(container) {
  return container.querySelector('[data-testid="claim-status-pill"]').style;
}

function getPillLabel(container) {
  return container.querySelector('[data-testid="claim-status-pill-label"]');
}

function getIcon(container) {
  return container.querySelector('[data-testid="claim-status-pill-icon"]');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClaimStatusPill', () => {
  // 1. renders "draft" with neutral styling
  it('renders draft state with neutral styling', () => {
    const { container } = render(<ClaimStatusPill state="draft" />);

    const style = getPillStyle(container);
    expect(style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(style.color).toBe('var(--sm-neutral-text)');

    const label = getPillLabel(container);
    expect(label.textContent).toBe('Draft');
  });

  // 2. renders "paid" with success styling
  it('renders paid state with success styling', () => {
    const { container } = render(<ClaimStatusPill state="paid" />);

    const style = getPillStyle(container);
    expect(style.backgroundColor).toBe('var(--sm-success-bg)');
    expect(style.color).toBe('var(--sm-success-text)');

    const label = getPillLabel(container);
    expect(label.textContent).toBe('Paid');
  });

  // 3. renders "denied" with error styling
  it('renders denied state with error styling', () => {
    const { container } = render(<ClaimStatusPill state="denied" />);

    const style = getPillStyle(container);
    expect(style.backgroundColor).toBe('var(--sm-error-bg)');
    expect(style.color).toBe('var(--sm-error-text)');

    const label = getPillLabel(container);
    expect(label.textContent).toBe('Denied');
  });

  // 4. renders "written_off" with strikethrough text style applied
  it('renders written_off state with line-through text decoration', () => {
    const { container } = render(<ClaimStatusPill state="written_off" />);

    const style = getPillStyle(container);
    expect(style.backgroundColor).toBe('var(--sm-muted-bg)');
    expect(style.color).toBe('var(--sm-muted-text)');
    expect(style.textDecoration).toBe('line-through');

    const label = getPillLabel(container);
    expect(label.textContent).toBe('Written off');
  });

  // 5. renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)
  it('renders unknown state gracefully with Unknown label and neutral style', () => {
    // Should not throw
    const { container } = render(<ClaimStatusPill state="totally_made_up_state_xyz" />);

    const style = getPillStyle(container);
    expect(style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(style.color).toBe('var(--sm-neutral-text)');

    const label = getPillLabel(container);
    expect(label.textContent).toBe('Unknown');

    // Strikethrough must NOT be applied to unknown states
    expect(style.textDecoration).not.toBe('line-through');
  });

  // 6. size="md" applies correct font-size and padding
  it('applies correct font-size and padding for size="md"', () => {
    const { container } = render(<ClaimStatusPill state="draft" size="md" />);

    const style = getPillStyle(container);
    expect(style.fontSize).toBe('13px');
    expect(style.padding).toBe('4px 12px');
    expect(style.borderRadius).toBe('9999px');
  });

  // 7. showIcon=false hides the icon element
  it('hides the icon element when showIcon is false', () => {
    const { container } = render(<ClaimStatusPill state="paid" showIcon={false} />);

    const icon = getIcon(container);
    expect(icon).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Bonus coverage — spec requires all 19 known states render without error
  // ---------------------------------------------------------------------------

  const ALL_19_STATES = [
    'draft', 'ready_to_submit', 'submitted', 'pending_review', 'under_review',
    'acknowledged', 'accepted', 'paid', 'partial_payment', 'rejected', 'denied',
    'appeal_pending', 'appeal_submitted', 'adjudicated', 'written_off', 'voided',
    'cancelled', 'error', 'failed',
  ];

  it.each(ALL_19_STATES)(
    'renders state "%s" without throwing',
    (state) => {
      expect(() => render(<ClaimStatusPill state={state} />)).not.toThrow();
      // Every known state should NOT show "Unknown"
      const pill = screen.getAllByTestId('claim-status-pill-label').at(-1);
      expect(pill.textContent).not.toBe('Unknown');
    }
  );

  // Icon is visible by default (showIcon prop defaults to true)
  it('shows the icon element by default', () => {
    const { container } = render(<ClaimStatusPill state="submitted" />);
    const icon = getIcon(container);
    expect(icon).not.toBeNull();
  });

  // Label formatting: underscores → spaces, first word capitalized only
  it('formats ready_to_submit label correctly as "Ready to submit"', () => {
    const { container } = render(<ClaimStatusPill state="ready_to_submit" />);
    const label = getPillLabel(container);
    expect(label.textContent).toBe('Ready to submit');
  });

  // sm size defaults
  it('applies correct font-size and padding for default size="sm"', () => {
    const { container } = render(<ClaimStatusPill state="draft" />);
    const style = getPillStyle(container);
    expect(style.fontSize).toBe('11px');
    expect(style.padding).toBe('2px 8px');
    expect(style.borderRadius).toBe('9999px');
  });

  // voided and cancelled also get strikethrough
  it.each(['voided', 'cancelled'])(
    'renders %s with muted styling and line-through',
    (state) => {
      const { container } = render(<ClaimStatusPill state={state} />);
      const style = getPillStyle(container);
      expect(style.backgroundColor).toBe('var(--sm-muted-bg)');
      expect(style.textDecoration).toBe('line-through');
    }
  );
});
```

---

<details>
<summary>Implementation notes</summary>

**Component design decisions**

- `STATE_MAP` is a flat lookup object keyed by the exact `canonical_state` string. A missing key is the sentinel for "unknown" — no separate list needed, zero duplication.
- The icon is a small filled circle (`6px × 6px`, `border-radius: 9999px`) whose color is derived from the same `text` token. This keeps it visually harmonious across all states without introducing any additional color tokens.
- `formatLabel` is a pure function: `replace(/_/g, ' ')` then `charAt(0).toUpperCase() + slice(1)`. This satisfies "Ready to submit" (not "Ready To Submit") because only the first character is uppercased, not every word.
- All style is inline — zero Tailwind, zero hardcoded hex. Every color value is a `var(--sm-*)` token, satisfying Acceptance Criterion 3.
- The file has no `import` statements for Frappe, `window.frappe`, or any external UI library, satisfying Criteria 4 and 5.

**Test design decisions**

- Tests query via `data-testid` attributes, making them selector-stable against future label changes.
- The `it.each(ALL_19_STATES)` block satisfies Criterion 1 (all 19 states render without crashing) without requiring 19 separate `it` blocks.
- Style assertions use `.style.propertyName` on the DOM element. JSDOM preserves inline style strings exactly as set, so `'var(--sm-neutral-bg)'` round-trips cleanly.
- The 7 specified tests are clearly numbered in comments so reviewers can map them back to the story spec one-for-one.

</details>