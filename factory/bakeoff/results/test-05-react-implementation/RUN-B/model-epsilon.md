model: model-epsilon
test: 05-react-implementation
run: B
date: 2026-04-09

```jsx
// frontend/src/components/mojos/ClaimStatusPill.jsx

import React from 'react';

// State-to-color mapping using var(--sm-*) CSS variables
const STATE_STYLES = {
  // Neutral states
  neutral: {
    bg: 'var(--sm-neutral-bg)',
    text: 'var(--sm-neutral-text)',
  },
  // Info states
  info: {
    bg: 'var(--sm-info-bg)',
    text: 'var(--sm-info-text)',
  },
  // Warning states
  warning: {
    bg: 'var(--sm-warning-bg)',
    text: 'var(--sm-warning-text)',
  },
  // Success states
  success: {
    bg: 'var(--sm-success-bg)',
    text: 'var(--sm-success-text)',
  },
  // Error states
  error: {
    bg: 'var(--sm-error-bg)',
    text: 'var(--sm-error-text)',
  },
  // Muted states
  muted: {
    bg: 'var(--sm-muted-bg)',
    text: 'var(--sm-muted-text)',
  },
};

// Map canonical states to style categories
const getStateCategory = (state) => {
  const neutralStates = ['draft', 'ready_to_submit', 'adjudicated'];
  const infoStates = ['submitted', 'pending_review', 'under_review', 'acknowledged'];
  const warningStates = ['accepted', 'appeal_pending', 'appeal_submitted'];
  const successStates = ['paid', 'partial_payment'];
  const errorStates = ['rejected', 'denied', 'error', 'failed'];
  const mutedStates = ['written_off', 'voided', 'cancelled'];

  if (neutralStates.includes(state)) return 'neutral';
  if (infoStates.includes(state)) return 'info';
  if (warningStates.includes(state)) return 'warning';
  if (successStates.includes(state)) return 'success';
  if (errorStates.includes(state)) return 'error';
  if (mutedStates.includes(state)) return 'muted';

  return null;
};

// States that should have strikethrough text
const STRIKETHROUGH_STATES = ['written_off', 'voided', 'cancelled'];

// Format label: replace underscores with spaces, capitalize first word only
const formatLabel = (state) => {
  if (!state) return 'Unknown';

  const withSpaces = state.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

// Size configurations
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

/**
 * ClaimStatusPill - Displays a colored pill badge showing a claim's canonical state
 * 
 * @param {string} props.state - The canonical_state value (required)
 * @param {'sm' | 'md'} [props.size='sm'] - Size variant
 * @param {boolean} [props.showIcon=true] - Whether to show the status icon
 */
export default function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  const category = getStateCategory(state);
  const styleConfig = category ? STATE_STYLES[category] : STATE_STYLES.neutral;
  const sizeConfig = SIZE_STYLES[size] || SIZE_STYLES.sm;
  const label = formatLabel(state);
  const isStrikethrough = STRIKETHROUGH_STATES.includes(state);

  const pillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: styleConfig.bg,
    color: styleConfig.text,
    fontSize: sizeConfig.fontSize,
    padding: sizeConfig.padding,
    borderRadius: '9999px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    lineHeight: 1,
    textDecoration: isStrikethrough ? 'line-through' : 'none',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  };

  return (
    <span data-testid="claim-status-pill" style={pillStyle}>
      {showIcon && (
        <StatusIcon textColor={styleConfig.text} />
      )}
      <span data-testid="claim-status-label">{label}</span>
    </span>
  );
}

/**
 * StatusIcon - Small circular icon indicator
 */
function StatusIcon({ textColor }) {
  const iconStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: textColor,
    flexShrink: 0,
  };

  return (
    <span data-testid="claim-status-icon" style={iconStyle} aria-hidden="true" />
  );
}
```

```jsx
// frontend/src/components/mojos/ClaimStatusPill.test.jsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  describe('State-to-color mapping', () => {
    it('renders "draft" with neutral styling', () => {
      render(<ClaimStatusPill state="draft" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-neutral-bg)',
        color: 'var(--sm-neutral-text)',
      });
    });

    it('renders "ready_to_submit" with neutral styling', () => {
      render(<ClaimStatusPill state="ready_to_submit" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-neutral-bg)',
        color: 'var(--sm-neutral-text)',
      });
    });

    it('renders "paid" with success styling', () => {
      render(<ClaimStatusPill state="paid" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-success-bg)',
        color: 'var(--sm-success-text)',
      });
    });

    it('renders "partial_payment" with success styling', () => {
      render(<ClaimStatusPill state="partial_payment" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-success-bg)',
        color: 'var(--sm-success-text)',
      });
    });

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
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-error-bg)',
        color: 'var(--sm-error-text)',
      });
    });

    it('renders "error" with error styling', () => {
      render(<ClaimStatusPill state="error" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-error-bg)',
        color: 'var(--sm-error-text)',
      });
    });

    it('renders "failed" with error styling', () => {
      render(<ClaimStatusPill state="failed" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-error-bg)',
        color: 'var(--sm-error-text)',
      });
    });

    it('renders "accepted" with warning styling', () => {
      render(<ClaimStatusPill state="accepted" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-warning-bg)',
        color: 'var(--sm-warning-text)',
      });
    });

    it('renders "appeal_pending" with warning styling', () => {
      render(<ClaimStatusPill state="appeal_pending" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-warning-bg)',
        color: 'var(--sm-warning-text)',
      });
    });

    it('renders "appeal_submitted" with warning styling', () => {
      render(<ClaimStatusPill state="appeal_submitted" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-warning-bg)',
        color: 'var(--sm-warning-text)',
      });
    });

    it('renders "submitted" with info styling', () => {
      render(<ClaimStatusPill state="submitted" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-info-bg)',
        color: 'var(--sm-info-text)',
      });
    });

    it('renders "pending_review" with info styling', () => {
      render(<ClaimStatusPill state="pending_review" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-info-bg)',
        color: 'var(--sm-info-text)',
      });
    });

    it('renders "under_review" with info styling', () => {
      render(<ClaimStatusPill state="under_review" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-info-bg)',
        color: 'var(--sm-info-text)',
      });
    });

    it('renders "acknowledged" with info styling', () => {
      render(<ClaimStatusPill state="acknowledged" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-info-bg)',
        color: 'var(--sm-info-text)',
      });
    });

    it('renders "adjudicated" with neutral styling', () => {
      render(<ClaimStatusPill state="adjudicated" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-neutral-bg)',
        color: 'var(--sm-neutral-text)',
      });
    });

    it('renders "voided" with muted styling', () => {
      render(<ClaimStatusPill state="voided" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-muted-bg)',
        color: 'var(--sm-muted-text)',
      });
    });

    it('renders "cancelled" with muted styling', () => {
      render(<ClaimStatusPill state="cancelled" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-muted-bg)',
        color: 'var(--sm-muted-text)',
      });
    });
  });

  describe('Strikethrough styling', () => {
    it('renders "written_off" with strikethrough text style applied', () => {
      render(<ClaimStatusPill state="written_off" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toHaveStyle({
        textDecoration: 'line-through',
      });
    });

    it('renders "voided" with strikethrough text style applied', () => {
      render(<ClaimStatusPill state="voided" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toHaveStyle({
        textDecoration: 'line-through',
      });
    });

    it('renders "cancelled" with strikethrough text style applied', () => {
      render(<ClaimStatusPill state="cancelled" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toHaveStyle({
        textDecoration: 'line-through',
      });
    });

    it('does not apply strikethrough to "paid" state', () => {
      render(<ClaimStatusPill state="paid" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toHaveStyle({
        textDecoration: 'none',
      });
    });
  });

  describe('Unknown state handling', () => {
    it('renders unknown state gracefully', () => {
      render(<ClaimStatusPill state="some_unknown_state" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
    });

    it('shows "Unknown" label for unknown state', () => {
      render(<ClaimStatusPill state="some_unknown_state" />);
      const label = screen.getByTestId('claim-status-label');
      
      expect(label).toHaveTextContent('Unknown');
    });

    it('applies neutral style for unknown state', () => {
      render(<ClaimStatusPill state="some_unknown_state" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toHaveStyle({
        backgroundColor: 'var(--sm-neutral-bg)',
        color: 'var(--sm-neutral-text)',
      });
    });

    it('does not crash for null state', () => {
      render(<ClaimStatusPill state={null} />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(screen.getByTestId('claim-status-label')).toHaveTextContent('Unknown');
    });

    it('does not crash for undefined state', () => {
      render(<ClaimStatusPill state={undefined} />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toBeVisible();
      expect(screen.getByTestId('claim-status-label')).toHaveTextContent('Unknown');
    });
  });

  describe('Label formatting', () => {
    it('formats "ready_to_submit" as "Ready to submit"', () => {
      render(<ClaimStatusPill state="ready_to_submit" />);
      const label = screen.getByTestId('claim-status-label');
      
      expect(label).toHaveTextContent('Ready to submit');
    });

    it('formats "pending_review" as "Pending review"', () => {
      render(<ClaimStatusPill state="pending_review" />);
      const label = screen.getByTestId('claim-status-label');
      
      expect(label).toHaveTextContent('Pending review');
    });

    it('formats "under_review" as "Under review"', () => {
      render(<ClaimStatusPill state="under_review" />);
      const label = screen.getByTestId('claim-status-label');
      
      expect(label).toHaveTextContent('Under review');
    });

    it('formats "partial_payment" as "Partial payment"', () => {
      render(<ClaimStatusPill state="partial_payment" />);
      const label = screen.getByTestId('claim-status-label');
      
      expect(label).toHaveTextContent('Partial payment');
    });

    it('formats "appeal_submitted" as "Appeal submitted"', () => {
      render(<ClaimStatusPill state="appeal_submitted" />);
      const label = screen.getByTestId('claim-status-label');
      
      expect(label).toHaveTextContent('Appeal submitted');
    });

    it('capitalizes first word only', () => {
      render(<ClaimStatusPill state="paid" />);
      const label = screen.getByTestId('claim-status-label');
      
      expect(label).toHaveTextContent('Paid');
    });
  });

  describe('Size variants', () => {
    it('size="sm" applies correct font-size and padding', () => {
      render(<ClaimStatusPill state="draft" size="sm" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toHaveStyle({
        fontSize: '11px',
        padding: '2px 8px',
      });
    });

    it('size="md" applies correct font-size and padding', () => {
      render(<ClaimStatusPill state="draft" size="md" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toHaveStyle({
        fontSize: '13px',
        padding: '4px 12px',
      });
    });

    it('defaults to sm size when not specified', () => {
      render(<ClaimStatusPill state="draft" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toHaveStyle({
        fontSize: '11px',
        padding: '2px 8px',
      });
    });

    it('applies border-radius: 9999px for sm size', () => {
      render(<ClaimStatusPill state="draft" size="sm" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toHaveStyle({
        borderRadius: '9999px',
      });
    });

    it('applies border-radius: 9999px for md size', () => {
      render(<ClaimStatusPill state="draft" size="md" />);
      const pill = screen.getByTestId('claim-status-pill');
      
      expect(pill).toHaveStyle({
        borderRadius: '9999px',
      });
    });
  });

  describe('Icon visibility', () => {
    it('shows icon by default', () => {
      render(<ClaimStatusPill state="draft" />);
      const icon = screen.getByTestId('claim-status-icon');
      
      expect(icon).toBeVisible();
    });

    it('shows icon when showIcon=true', () => {
      render(<ClaimStatusPill state="draft" showIcon={true} />);
      const icon = screen.getByTestId('claim-status-icon');
      
      expect(icon).toBeVisible();
    });

    it('hides the icon element when showIcon=false', () => {
      render(<ClaimStatusPill state="draft" showIcon={false} />);
      const icon = screen.queryByTestId('claim-status-icon');
      
      expect(icon).not.toBeInTheDocument();
    });

    it('label is still visible when icon is hidden', () => {
      render(<ClaimStatusPill state="draft" showIcon={false} />);
      const label = screen.getByTestId('claim-status-label');
      
      expect(label).toHaveTextContent('Draft');
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
        
        expect(container.firstChild).toBeTruthy();
      });
    });
  });
});
```