model: model-epsilon
test: 05-react-implementation
run: C
date: 2026-04-09

```javascript
// frontend/src/components/mojos/ClaimStatusPill.jsx
/* eslint-disable react/prop-types */
import React from 'react';

/**
 * State-to-color configuration mapping
 * All colors use CSS custom properties (var(--sm-*))
 */
const STATE_STYLES = {
  // Neutral states
  draft: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strikethrough: false },
  ready_to_submit: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strikethrough: false },
  adjudicated: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strikethrough: false },

  // Info states
  submitted: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strikethrough: false },
  pending_review: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strikethrough: false },
  under_review: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strikethrough: false },
  acknowledged: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strikethrough: false },

  // Warning states
  accepted: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strikethrough: false },
  appeal_pending: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strikethrough: false },
  appeal_submitted: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strikethrough: false },

  // Success states
  paid: { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)', strikethrough: false },
  partial_payment: { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)', strikethrough: false },

  // Error states
  rejected: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strikethrough: false },
  denied: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strikethrough: false },
  error: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strikethrough: false },
  failed: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strikethrough: false },

  // Muted states with strikethrough
  written_off: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strikethrough: true },
  voided: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strikethrough: true },
  cancelled: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strikethrough: true },
};

/** Default style for unknown states (neutral gray) */
const DEFAULT_STYLE = { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strikethrough: false };

/** Size variant configurations */
const SIZE_STYLES = {
  sm: {
    fontSize: '11px',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: '9999px',
  },
  md: {
    fontSize: '13px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: '9999px',
  },
};

/**
 * Format state label: replace underscores with spaces, capitalize first word only
 * @param {string} state - The canonical state value
 * @returns {string} Formatted label
 */
function formatLabel(state) {
  if (!state) return 'Unknown';
  return state.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * ClaimStatusPill - Displays a colored pill badge showing a claim's canonical state
 * 
 * @param {Object} props
 * @param {string} props.state - The canonical_state value (required)
 * @param {'sm'|'md'} [props.size='sm'] - Size variant
 * @param {boolean} [props.showIcon=true] - Whether to show the status icon
 * @returns {React.ReactElement}
 */
export default function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  const stateStyle = STATE_STYLES[state] || DEFAULT_STYLE;
  const label = stateStyle === DEFAULT_STYLE && state ? 'Unknown' : formatLabel(state);
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;

  const pillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: stateStyle.bg,
    color: stateStyle.text,
    fontSize: sizeStyle.fontSize,
    paddingTop: sizeStyle.paddingTop,
    paddingBottom: sizeStyle.paddingBottom,
    paddingLeft: sizeStyle.paddingLeft,
    paddingRight: sizeStyle.paddingRight,
    borderRadius: sizeStyle.borderRadius,
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    textDecoration: stateStyle.strikethrough ? 'line-through' : 'none',
  };

  return (
    <span data-testid="claim-status-pill" style={pillStyle}>
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
      <span data-testid="claim-status-label">{label}</span>
    </span>
  );
}
```

```javascript
// frontend/src/components/mojos/ClaimStatusPill.test.jsx
/* eslint-disable no-unused-vars */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  describe('Neutral states', () => {
    it('renders "draft" with neutral styling', () => {
      render(<ClaimStatusPill state="draft" />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-neutral-bg)',
        color: 'var(--sm-neutral-text)',
      });
    });

    it('formats label correctly for neutral states', () => {
      render(<ClaimStatusPill state="ready_to_submit" />);
      expect(screen.getByTestId('claim-status-label').textContent).toBe('Ready to submit');
    });
  });

  describe('Success states', () => {
    it('renders "paid" with success styling', () => {
      render(<ClaimStatusPill state="paid" />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-success-bg)',
        color: 'var(--sm-success-text)',
      });
    });
  });

  describe('Error states', () => {
    it('renders "denied" with error styling', () => {
      render(<ClaimStatusPill state="denied" />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-error-bg)',
        color: 'var(--sm-error-text)',
      });
    });

    it('renders "rejected" with error styling', () => {
      render(<ClaimStatusPill state="rejected" />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-error-bg)',
        color: 'var(--sm-error-text)',
      });
    });

    it('renders "failed" with error styling', () => {
      render(<ClaimStatusPill state="failed" />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-error-bg)',
        color: 'var(--sm-error-text)',
      });
    });
  });

  describe('Strikethrough states', () => {
    it('renders "written_off" with strikethrough text style applied', () => {
      render(<ClaimStatusPill state="written_off" />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-muted-bg)',
        color: 'var(--sm-muted-text)',
        textDecoration: 'line-through',
      });
    });

    it('renders "voided" with strikethrough text style applied', () => {
      render(<ClaimStatusPill state="voided" />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-muted-bg)',
        color: 'var(--sm-muted-text)',
        textDecoration: 'line-through',
      });
    });

    it('renders "cancelled" with strikethrough text style applied', () => {
      render(<ClaimStatusPill state="cancelled" />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-muted-bg)',
        color: 'var(--sm-muted-text)',
        textDecoration: 'line-through',
      });
    });
  });

  describe('Unknown state handling', () => {
    it('renders unknown state gracefully showing "Unknown" label', () => {
      render(<ClaimStatusPill state="not_a_real_state" />);
      expect(screen.getByTestId('claim-status-label').textContent).toBe('Unknown');
    });

    it('renders unknown state with neutral style and no crash', () => {
      const { container } = render(<ClaimStatusPill state="completely_unknown" />);
      expect(container).toBeTruthy();
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-neutral-bg)',
        color: 'var(--sm-neutral-text)',
      });
    });

    it('handles empty state string gracefully', () => {
      render(<ClaimStatusPill state="" />);
      expect(screen.getByTestId('claim-status-label').textContent).toBe('Unknown');
    });
  });

  describe('Size variants', () => {
    it('size="sm" applies correct font-size and padding', () => {
      render(<ClaimStatusPill state="draft" size="sm" />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toHaveStyle({
        fontSize: '11px',
        paddingTop: '2px',
        paddingBottom: '2px',
        paddingLeft: '8px',
        paddingRight: '8px',
        borderRadius: '9999px',
      });
    });

    it('size="md" applies correct font-size and padding', () => {
      render(<ClaimStatusPill state="draft" size="md" />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toHaveStyle({
        fontSize: '13px',
        paddingTop: '4px',
        paddingBottom: '4px',
        paddingLeft: '12px',
        paddingRight: '12px',
        borderRadius: '9999px',
      });
    });

    it('defaults to sm size when size prop is not provided', () => {
      render(<ClaimStatusPill state="draft" />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toHaveStyle({
        fontSize: '11px',
      });
    });
  });

  describe('Icon visibility', () => {
    it('shows icon by default', () => {
      render(<ClaimStatusPill state="draft" />);
      expect(screen.getByTestId('claim-status-icon')).toBeVisible();
    });

    it('showIcon=false hides the icon element', () => {
      render(<ClaimStatusPill state="draft" showIcon={false} />);
      expect(screen.queryByTestId('claim-status-icon')).toBeNull();
    });

    it('label is still visible when icon is hidden', () => {
      render(<ClaimStatusPill state="paid" showIcon={false} />);
      expect(screen.getByTestId('claim-status-label')).toBeVisible();
      expect(screen.getByTestId('claim-status-label').textContent).toBe('Paid');
    });
  });

  describe('Label formatting', () => {
    it('replaces underscores with spaces and capitalizes first word', () => {
      render(<ClaimStatusPill state="ready_to_submit" />);
      expect(screen.getByTestId('claim-status-label').textContent).toBe('Ready to submit');
    });

    it('handles multiple underscores', () => {
      render(<ClaimStatusPill state="under_review" />);
      expect(screen.getByTestId('claim-status-label').textContent).toBe('Under review');
    });

    it('handles partial_payment correctly', () => {
      render(<ClaimStatusPill state="partial_payment" />);
      expect(screen.getByTestId('claim-status-label').textContent).toBe('Partial payment');
    });
  });

  describe('All 19 known states', () => {
    const allStates = [
      'draft',
      'ready_to_submit',
      'submitted',
      'pending_review',
      'under_review',
      'acknowledged',
      'accepted',
      'paid',
      'partial_payment',
      'rejected',
      'denied',
      'appeal_pending',
      'appeal_submitted',
      'adjudicated',
      'written_off',
      'voided',
      'cancelled',
      'error',
      'failed',
    ];

    allStates.forEach((state) => {
      it(`renders "${state}" without errors`, () => {
        const { container } = render(<ClaimStatusPill state={state} />);
        expect(container).toBeTruthy();
        expect(screen.getByTestId('claim-status-pill')).toBeVisible();
      });
    });
  });
});
```