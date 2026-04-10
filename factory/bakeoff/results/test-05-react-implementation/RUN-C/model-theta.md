model: model-theta
test: 05-react-implementation
run: C
date: 2026-04-09

**frontend/src/components/mojos/ClaimStatusPill.jsx**

```jsx
import PropTypes from 'prop-types';

/**
 * ClaimStatusPill - displays a small colored pill badge showing a claim's canonical state.
 * Pure display component — no API calls.
 *
 * @param {Object} props
 * @param {string} props.state - the canonical_state value
 * @param {"sm"|"md"} [props.size="sm"] - badge size
 * @param {boolean} [props.showIcon=true] - whether to show the status icon
 */
export default function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  // State-to-color mapping using var(--sm-*) tokens
  const getStateStyle = (stateValue) => {
    // Group states by style
    const neutralStates = ['draft', 'ready_to_submit', 'adjudicated'];
    const infoStates = ['submitted', 'pending_review', 'under_review', 'acknowledged'];
    const warningStates = ['accepted', 'appeal_pending', 'appeal_submitted'];
    const successStates = ['paid', 'partial_payment'];
    const errorStates = ['rejected', 'denied', 'error', 'failed'];
    const mutedStates = ['written_off', 'voided', 'cancelled'];

    if (neutralStates.includes(stateValue)) {
      return {
        bg: 'var(--sm-neutral-bg)',
        text: 'var(--sm-neutral-text)',
        strikethrough: false,
      };
    }
    if (infoStates.includes(stateValue)) {
      return {
        bg: 'var(--sm-info-bg)',
        text: 'var(--sm-info-text)',
        strikethrough: false,
      };
    }
    if (warningStates.includes(stateValue)) {
      return {
        bg: 'var(--sm-warning-bg)',
        text: 'var(--sm-warning-text)',
        strikethrough: false,
      };
    }
    if (successStates.includes(stateValue)) {
      return {
        bg: 'var(--sm-success-bg)',
        text: 'var(--sm-success-text)',
        strikethrough: false,
      };
    }
    if (errorStates.includes(stateValue)) {
      return {
        bg: 'var(--sm-error-bg)',
        text: 'var(--sm-error-text)',
        strikethrough: false,
      };
    }
    if (mutedStates.includes(stateValue)) {
      return {
        bg: 'var(--sm-muted-bg)',
        text: 'var(--sm-muted-text)',
        strikethrough: true,
      };
    }
    // Unknown state
    return {
      bg: 'var(--sm-neutral-bg)',
      text: 'var(--sm-neutral-text)',
      strikethrough: false,
    };
  };

  const formatLabel = (stateValue) => {
    if (!stateValue) return 'Unknown';
    
    // Check if it's a known state
    const knownStates = [
      'draft', 'ready_to_submit', 'submitted', 'pending_review', 'under_review',
      'acknowledged', 'accepted', 'paid', 'partial_payment', 'rejected', 'denied',
      'appeal_pending', 'appeal_submitted', 'adjudicated', 'written_off', 'voided',
      'cancelled', 'error', 'failed'
    ];
    
    if (!knownStates.includes(stateValue)) {
      return 'Unknown';
    }
    
    // Replace underscores with spaces, capitalize first word only
    const words = stateValue.replace(/_/g, ' ').split(' ');
    if (words.length === 0) return stateValue;
    
    const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    const restWords = words.slice(1).map(word => word.toLowerCase()).join(' ');
    
    return restWords ? `${firstWord} ${restWords}` : firstWord;
  };

  const style = getStateStyle(state);
  const label = formatLabel(state);

  // Size styling
  const sizeStyles = {
    sm: {
      fontSize: '11px',
      padding: '2px 8px',
    },
    md: {
      fontSize: '13px',
      padding: '4px 12px',
    },
  };

  const currentSizeStyle = sizeStyles[size] || sizeStyles.sm;

  return (
    <span
      data-testid="claim-status-pill"
      data-state={state}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        borderRadius: '9999px',
        backgroundColor: style.bg,
        color: style.text,
        fontWeight: 500,
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1,
        ...currentSizeStyle,
        textDecoration: style.strikethrough ? 'line-through' : 'none',
      }}
    >
      {showIcon && (
        <span
          data-testid="status-icon"
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

ClaimStatusPill.propTypes = {
  state: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['sm', 'md']),
  showIcon: PropTypes.bool,
};
```

**frontend/src/components/mojos/ClaimStatusPill.test.jsx**

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  it('renders "draft" with neutral styling', () => {
    render(<ClaimStatusPill state="draft" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Draft');
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-neutral-bg)',
      color: 'var(--sm-neutral-text)',
    });
    expect(pill).not.toHaveStyle('text-decoration: line-through');
  });

  it('renders "paid" with success styling', () => {
    render(<ClaimStatusPill state="paid" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Paid');
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-success-bg)',
      color: 'var(--sm-success-text)',
    });
  });

  it('renders "denied" with error styling', () => {
    render(<ClaimStatusPill state="denied" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Denied');
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-error-bg)',
      color: 'var(--sm-error-text)',
    });
  });

  it('renders "written_off" with strikethrough text style applied', () => {
    render(<ClaimStatusPill state="written_off" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Written off');
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-muted-bg)',
      color: 'var(--sm-muted-text)',
      textDecoration: 'line-through',
    });
  });

  it('renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)', () => {
    render(<ClaimStatusPill state="some_unknown_state" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Unknown');
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-neutral-bg)',
      color: 'var(--sm-neutral-text)',
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

  it('showIcon=false hides the icon element', () => {
    render(<ClaimStatusPill state="draft" showIcon={false} />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    
    // The icon should not be present
    const icon = screen.queryByTestId('status-icon');
    expect(icon).not.toBeInTheDocument();
  });

  // Additional tests for label formatting
  it('formats label by replacing underscores with spaces, capitalizing first word only', () => {
    const { rerender } = render(<ClaimStatusPill state="ready_to_submit" />);
    
    let pill = screen.getByTestId('claim-status-pill');
    expect(pill).toHaveTextContent('Ready to submit');
    
    rerender(<ClaimStatusPill state="under_review" />);
    pill = screen.getByTestId('claim-status-pill');
    expect(pill).toHaveTextContent('Under review');
    
    rerender(<ClaimStatusPill state="appeal_pending" />);
    pill = screen.getByTestId('claim-status-pill');
    expect(pill).toHaveTextContent('Appeal pending');
  });

  // Test all 19 known states render without errors
  const knownStates = [
    'draft', 'ready_to_submit', 'submitted', 'pending_review', 'under_review',
    'acknowledged', 'accepted', 'paid', 'partial_payment', 'rejected', 'denied',
    'appeal_pending', 'appeal_submitted', 'adjudicated', 'written_off', 'voided',
    'cancelled', 'error', 'failed'
  ];

  knownStates.forEach((stateValue) => {
    it(`renders "${stateValue}" state without errors`, () => {
      expect(() => {
        render(<ClaimStatusPill state={stateValue} />);
      }).not.toThrow();
      
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toBeInTheDocument();
    });
  });
});
```