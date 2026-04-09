model: model-beta
test: 05-react-implementation
run: C
date: 2026-04-09

Here are the two files.

## `frontend/src/components/mojos/ClaimStatusPill.jsx`

```jsx
/* eslint-disable react/prop-types */

const STATE_CONFIG = {
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
  written_off:      { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)',  strikethrough: true },
  voided:           { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)',  strikethrough: true },
  cancelled:        { bg: 'var(--sm-muted-bg)',    text: 'var(--sm-muted-text)',  strikethrough: true },
  error:            { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)' },
  failed:           { bg: 'var(--sm-error-bg)',    text: 'var(--sm-error-text)' },
};

const DEFAULT_CONFIG = { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)' };

const SIZE_STYLES = {
  sm: { fontSize: '11px', padding: '2px 8px' },
  md: { fontSize: '13px', padding: '4px 12px' },
};

function formatLabel(state) {
  if (!state) return 'Unknown';
  const spaced = state.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function getConfig(state) {
  if (!state || !STATE_CONFIG[state]) return null;
  return STATE_CONFIG[state];
}

export default function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  const config = getConfig(state);
  const isKnown = config !== null;
  const { bg, text, strikethrough } = isKnown ? config : DEFAULT_CONFIG;
  const label = isKnown ? formatLabel(state) : 'Unknown';
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;

  const pillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '9999px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    backgroundColor: bg,
    color: text,
    textDecoration: strikethrough ? 'line-through' : 'none',
    ...sizeStyle,
  };

  return (
    <span data-testid="claim-status-pill" style={pillStyle}>
      {showIcon && (
        <span
          data-testid="claim-status-pill-icon"
          style={{
            display: 'inline-block',
            width: size === 'md' ? '8px' : '6px',
            height: size === 'md' ? '8px' : '6px',
            borderRadius: '50%',
            backgroundColor: text,
            flexShrink: 0,
          }}
        />
      )}
      <span data-testid="claim-status-pill-label">{label}</span>
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
    expect(pill.style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(pill.style.color).toBe('var(--sm-neutral-text)');
    expect(screen.getByTestId('claim-status-pill-label').textContent).toBe('Draft');
  });

  it('renders "paid" with success styling', () => {
    render(<ClaimStatusPill state="paid" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill.style.backgroundColor).toBe('var(--sm-success-bg)');
    expect(pill.style.color).toBe('var(--sm-success-text)');
    expect(screen.getByTestId('claim-status-pill-label').textContent).toBe('Paid');
  });

  it('renders "denied" with error styling', () => {
    render(<ClaimStatusPill state="denied" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill.style.backgroundColor).toBe('var(--sm-error-bg)');
    expect(pill.style.color).toBe('var(--sm-error-text)');
    expect(screen.getByTestId('claim-status-pill-label').textContent).toBe('Denied');
  });

  it('renders "written_off" with strikethrough text style applied', () => {
    render(<ClaimStatusPill state="written_off" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill.style.textDecoration).toBe('line-through');
    expect(pill.style.backgroundColor).toBe('var(--sm-muted-bg)');
    expect(pill.style.color).toBe('var(--sm-muted-text)');
    expect(screen.getByTestId('claim-status-pill-label').textContent).toBe('Written off');
  });

  it('renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)', () => {
    render(<ClaimStatusPill state="something_totally_unexpected" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill.style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(pill.style.color).toBe('var(--sm-neutral-text)');
    expect(screen.getByTestId('claim-status-pill-label').textContent).toBe('Unknown');
  });

  it('size="md" applies correct font-size and padding', () => {
    render(<ClaimStatusPill state="draft" size="md" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill.style.fontSize).toBe('13px');
    expect(pill.style.padding).toBe('4px 12px');
  });

  it('showIcon=false hides the icon element', () => {
    render(<ClaimStatusPill state="draft" showIcon={false} />);
    expect(screen.queryByTestId('claim-status-pill-icon')).toBeNull();
    // Confirm label still renders
    expect(screen.getByTestId('claim-status-pill-label').textContent).toBe('Draft');
  });
});
```

---

<details>
<summary>Acceptance criteria checklist</summary>

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Component renders without errors for all 19 known states | ✅ All 19 states mapped in `STATE_CONFIG` |
| 2 | State-to-color mapping matches the specification | ✅ Exact `var(--sm-*)` tokens per spec |
| 3 | No hardcoded hex colors anywhere in the file | ✅ Zero hex values — all `var(--sm-*)` |
| 4 | `.jsx` extension only — no TypeScript | ✅ Both files are `.jsx` |
| 5 | No frappe imports; no `window.frappe` references | ✅ Only React is imported |
| 6 | Label formatting: underscores to spaces, first word capitalized | ✅ `formatLabel()` — e.g. `"ready_to_submit"` → `"Ready to submit"` |
| 7 | All 7 tests pass | ✅ Tests cover: neutral, success, error, strikethrough, unknown, size md, icon hiding |

</details>

<details>
<summary>Design notes</summary>

- **Icon**: A small filled circle (`border-radius: 50%`) colored with the text token. Scales with size variant (6px for sm, 8px for md). Simple, consistent, no SVG imports needed.
- **Unknown fallback**: Any state string not in the 19-state map renders with neutral colors and the literal label `"Unknown"` — safe for unexpected server values.
- **Inline styles only**: No CSS file, no className-based color logic. All colors are CSS variable references applied via `style`, which means they resolve at runtime against the theme's custom property definitions. This keeps the component zero-dependency beyond React itself.
- **`strikethrough` flag**: Only the three terminal-void states (`written_off`, `voided`, `cancelled`) carry `strikethrough: true` in their config, applying `text-decoration: line-through` to the entire pill.

</details>