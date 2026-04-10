model: model-theta
test: 05-react-implementation
run: B
date: 2026-04-09

```jsx
/* eslint-disable react/prop-types */
import React from 'react';

/**
 * ClaimStatusPill component - displays a colored pill badge showing a claim's canonical state.
 * 
 * @param {Object} props
 * @param {string} props.state - The canonical_state value (required)
 * @param {"sm"|"md"} [props.size="sm"] - Size variant
 * @param {boolean} [props.showIcon=true] - Whether to show an icon
 * @returns {JSX.Element}
 */
const ClaimStatusPill = ({ state, size = "sm", showIcon = true }) => {
  // Normalize state to lowercase for consistent matching
  const normalizedState = String(state).toLowerCase();
  
  // Determine styling based on state
  const getStateStyle = () => {
    switch (normalizedState) {
      case 'draft':
      case 'ready_to_submit':
        return {
          backgroundColor: 'var(--sm-neutral-bg)',
          color: 'var(--sm-neutral-text)',
          textDecoration: 'none'
        };
      
      case 'submitted':
      case 'pending_review':
      case 'under_review':
      case 'acknowledged':
        return {
          backgroundColor: 'var(--sm-info-bg)',
          color: 'var(--sm-info-text)',
          textDecoration: 'none'
        };
      
      case 'accepted':
        return {
          backgroundColor: 'var(--sm-warning-bg)',
          color: 'var(--sm-warning-text)',
          textDecoration: 'none'
        };
      
      case 'paid':
      case 'partial_payment':
        return {
          backgroundColor: 'var(--sm-success-bg)',
          color: 'var(--sm-success-text)',
          textDecoration: 'none'
        };
      
      case 'rejected':
      case 'denied':
        return {
          backgroundColor: 'var(--sm-error-bg)',
          color: 'var(--sm-error-text)',
          textDecoration: 'none'
        };
      
      case 'appeal_pending':
      case 'appeal_submitted':
        return {
          backgroundColor: 'var(--sm-warning-bg)',
          color: 'var(--sm-warning-text)',
          textDecoration: 'none'
        };
      
      case 'adjudicated':
        return {
          backgroundColor: 'var(--sm-neutral-bg)',
          color: 'var(--sm-neutral-text)',
          textDecoration: 'none'
        };
      
      case 'written_off':
      case 'voided':
      case 'cancelled':
        return {
          backgroundColor: 'var(--sm-muted-bg)',
          color: 'var(--sm-muted-text)',
          textDecoration: 'line-through'
        };
      
      case 'error':
      case 'failed':
        return {
          backgroundColor: 'var(--sm-error-bg)',
          color: 'var(--sm-error-text)',
          textDecoration: 'none'
        };
      
      default:
        // Unknown state
        return {
          backgroundColor: 'var(--sm-neutral-bg)',
          color: 'var(--sm-neutral-text)',
          textDecoration: 'none'
        };
    }
  };
  
  // Format label: replace underscores with spaces, capitalize first word only
  const formatLabel = () => {
    if (!state || typeof state !== 'string') {
      return 'Unknown';
    }
    
    // Handle unknown states
    const knownStates = [
      'draft', 'ready_to_submit', 'submitted', 'pending_review', 
      'under_review', 'acknowledged', 'accepted', 'paid', 'partial_payment',
      'rejected', 'denied', 'appeal_pending', 'appeal_submitted',
      'adjudicated', 'written_off', 'voided', 'cancelled', 'error', 'failed'
    ];
    
    if (!knownStates.includes(normalizedState)) {
      return 'Unknown';
    }
    
    // Replace underscores with spaces
    let label = state.replace(/_/g, ' ');
    
    // Capitalize first word only (lowercase the rest)
    const words = label.split(' ');
    if (words.length > 0) {
      words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
      for (let i = 1; i < words.length; i++) {
        words[i] = words[i].toLowerCase();
      }
      label = words.join(' ');
    }
    
    return label;
  };
  
  // Size-based styling
  const sizeStyle = size === 'md' 
    ? {
        fontSize: '13px',
        padding: '4px 12px',
        borderRadius: '9999px'
      }
    : {
        fontSize: '11px',
        padding: '2px 8px',
        borderRadius: '9999px'
      };
  
  const stateStyle = getStateStyle();
  const label = formatLabel();
  
  return (
    <span
      className="claim-status-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        lineHeight: 1,
        ...sizeStyle,
        ...stateStyle
      }}
      data-testid="claim-status-pill"
      data-state={normalizedState}
      data-size={size}
    >
      {showIcon && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: stateStyle.color,
            flexShrink: 0
          }}
          data-testid="status-icon"
        />
      )}
span>{span>
span>
  );
};

export default ClaimStatusPill;
```

Now I need to write the test file. The spec says tests (Vitest) with 7 test cases. Let me create the test file at `frontend/src/components/mojos/ClaimStatusPill.test.jsx`. I'll use Vitest and React Testing Library. Let me write the tests:```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  it('renders "draft" with neutral styling', () => {
   ClaimStatusPill state="draft" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Draft');
    expect(pill).toHaveStyle({ backgroundColor: 'var(--sm-neutral-bg)' });
    expect(pill).toHaveStyle({ color: 'var(--sm-neutral-text)' });
  });
  
  it('renders "paid" with success styling', () => {
    render(<ClaimStatusPill state="paid" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Paid');
    expect(pill).toHaveStyle({ backgroundColor: 'var(--sm-success-bg)' });
    expect(pill).toHaveStyle({ color: 'var(--sm-success-text)' });
  });
  
  it('renders "denied" with error styling', () => {
    render(<ClaimStatusPill state="denied" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Denied');
    expect(pill).toHaveStyle({ backgroundColor: 'var(--sm-error-bg)' });
    expect(pill).toHaveStyle({ color: 'var(--sm-error-text)' });
  });
  
  it('renders "written_off" with strikethrough text style applied', () => {
    render(<ClaimStatusPill state="written_off" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Written off');
    expect(pill).toHaveStyle({ backgroundColor: 'var(--sm-muted-bg)' });
    expect(pill).toHaveStyle({ color: 'var(--sm-muted-text)' });
    expect(pill).toHaveStyle({ textDecoration: 'line-through' });
  });
  
  it('renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)', () => {
    render(<ClaimStatusPill state="nonexistent_state" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Unknown');
    expect(pill).toHaveStyle({ backgroundColor: 'var(--sm-neutral-bg)' });
    expect(pill).toHaveStyle({ color: 'var(--sm-neutral-text)' });
  });
  
  it('size="md" applies correct font-size and padding', () => {
    render(<ClaimStatusPill state="draft" size="md" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveStyle({ fontSize: '13px' });
    expect(pill).toHaveStyle({ padding: '4px 12px' });
  });
  
  it('showIcon=false hides the icon element', () => {
    render(<ClaimStatusPill state="draft" showIcon={false} />);
    
    const icon = screen.queryByTestId('status-icon');
    expect(icon).not.toBeInTheDocument();
    
    // Pill should still render
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Draft');
  });
  
  // Additional tests for all 19 known states
  const knownStates = [
    'draft', 'ready_to_submit', 'submitted', 'pending_review', 
    'under_review', 'acknowledged', 'accepted', 'paid', 'partial_payment',
    'rejected', 'denied', 'appeal_pending', 'appeal_submitted',
    'adjudicated', 'written_off', 'voided', 'cancelled', 'error', 'failed'
  ];
  
  knownStates.forEach(state => {
    it(`renders "${state}" without errors`, () => {
      expect(() =>ClaimStatusPill state={state} />)).not.toThrow();
    });
  });
  
  // Test label formatting
  it('formats label correctly: underscores to spaces, first word capitalized', () => {
    const testCases = [
      { state: 'ready_to_submit', expected: 'Ready to submit' },
      { state: 'pending_review', expected: 'Pending review' },
      { state: 'under_review', expected: 'Under review' },
      { state: 'partial_payment', expected: 'Partial payment' },
      { state: 'appeal_pending', expected: 'Appeal pending' },
      { state: 'appeal_submitted', expected: 'Appeal submitted' },
      { state: 'written_off', expected: 'Written off' },
      { state: 'draft', expected: 'Draft' },
      { state: 'paid', expected: 'Paid' },
    ];
    
    testCases.forEach(({ state, expected }) => {
      const { unmount } =ClaimStatusPill state={state} />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toHaveTextContent(expected);
      unmount();
    });
  });
});
```

Wait, I need to ensure the test file also follows the platform constraints. The test file should be `.test.jsx` or `.test.js`. Let me check if there are any constraints about test files. The story spec says "TESTS (Vitest):" and lists 7 tests. I should include those tests exactly. Let me adjust the test file to focus on the 7 specified tests and also ensure it tests all 19 known states as per acceptance criteria #1.

Actually, looking at the acceptance criteria:
1. Component renders without errors for all 19 known states
2. State-to-color mapping matches the specification
3. No hardcoded hex colors anywhere in the file
4. .jsx extension only — no TypeScript
5. No frappe imports; no window.frappe references
6. Label formatting: underscores to spaces, first word capitalized
7. All 7 tests pass

My component meets these. The test file should verify them. Let me revise the test file to be more comprehensive and match the 7 specified tests exactly, plus additional tests for the acceptance criteria.

But the spec says "Write the component and the test file. Nothing else." So I should output both files. Let me also check if I need to handle the icon properly. The spec says "showIcon: boolean (optional, default true)" but doesn't specify what icon to show. I used a simple colored dot. That should be fine.

One more thing: the spec mentions "border-radius 9999px" which I used. Good.

Also, I should ensure the component uses the CSS variables correctly. I used them in the style object.

Now let me output both files in the final response. I'll also add a comment about the icon choice. Since no specific icon is mentioned, a colored dot seems reasonable.

Let me also check if there are any existing patterns in the Spark Mojo codebase. Looking at the provided WorkboardMojo component, I see they use inline styles and CSS variables. My approach is consistent.

One improvement: I should make the icon color match the text color as I did. Good.

Now, final output. I'll present the component file and test file separately.# ClaimStatusPill Component

## Component File: `frontend/src/components/mojos/ClaimStatusPill.jsx`

```jsx
/* eslint-disable react/prop-types */
import React from 'react';

/**
 * ClaimStatusPill component - displays a colored pill badge showing a claim's canonical state.
 * 
 * @param {Object} props
 * @param {string} props.state - The canonical_state value (required)
 * @param {"sm"|"md"} [props.size="sm"] - Size variant
 * @param {boolean} [props.showIcon=true] - Whether to show an icon
 * @returns {JSX.Element}
 */
const ClaimStatusPill = ({ state, size = "sm", showIcon = true }) => {
  // Normalize state to lowercase for consistent matching
  const normalizedState = String(state).toLowerCase();
  
  // Determine styling based on state
  const getStateStyle = () => {
    switch (normalizedState) {
      case 'draft':
      case 'ready_to_submit':
        return {
          backgroundColor: 'var(--sm-neutral-bg)',
          color: 'var(--sm-neutral-text)',
          textDecoration: 'none'
        };
      
      case 'submitted':
      case 'pending_review':
      case 'under_review':
      case 'acknowledged':
        return {
          backgroundColor: 'var(--sm-info-bg)',
          color: 'var(--sm-info-text)',
          textDecoration: 'none'
        };
      
      case 'accepted':
        return {
          backgroundColor: 'var(--sm-warning-bg)',
          color: 'var(--sm-warning-text)',
          textDecoration: 'none'
        };
      
      case 'paid':
      case 'partial_payment':
        return {
          backgroundColor: 'var(--sm-success-bg)',
          color: 'var(--sm-success-text)',
          textDecoration: 'none'
        };
      
      case 'rejected':
      case 'denied':
        return {
          backgroundColor: 'var(--sm-error-bg)',
          color: 'var(--sm-error-text)',
          textDecoration: 'none'
        };
      
      case 'appeal_pending':
      case 'appeal_submitted':
        return {
          backgroundColor: 'var(--sm-warning-bg)',
          color: 'var(--sm-warning-text)',
          textDecoration: 'none'
        };
      
      case 'adjudicated':
        return {
          backgroundColor: 'var(--sm-neutral-bg)',
          color: 'var(--sm-neutral-text)',
          textDecoration: 'none'
        };
      
      case 'written_off':
      case 'voided':
      case 'cancelled':
        return {
          backgroundColor: 'var(--sm-muted-bg)',
          color: 'var(--sm-muted-text)',
          textDecoration: 'line-through'
        };
      
      case 'error':
      case 'failed':
        return {
          backgroundColor: 'var(--sm-error-bg)',
          color: 'var(--sm-error-text)',
          textDecoration: 'none'
        };
      
      default:
        // Unknown state
        return {
          backgroundColor: 'var(--sm-neutral-bg)',
          color: 'var(--sm-neutral-text)',
          textDecoration: 'none'
        };
    }
  };
  
  // Format label: replace underscores with spaces, capitalize first word only
  const formatLabel = () => {
    if (!state || typeof state !== 'string') {
      return 'Unknown';
    }
    
    // Handle unknown states
    const knownStates = [
      'draft', 'ready_to_submit', 'submitted', 'pending_review', 
      'under_review', 'acknowledged', 'accepted', 'paid', 'partial_payment',
      'rejected', 'denied', 'appeal_pending', 'appeal_submitted',
      'adjudicated', 'written_off', 'voided', 'cancelled', 'error', 'failed'
    ];
    
    if (!knownStates.includes(normalizedState)) {
      return 'Unknown';
    }
    
    // Replace underscores with spaces
    let label = state.replace(/_/g, ' ');
    
    // Capitalize first word only (lowercase the rest)
    const words = label.split(' ');
    if (words.length > 0) {
      words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
      for (let i = 1; i < words.length; i++) {
        words[i] = words[i].toLowerCase();
      }
      label = words.join(' ');
    }
    
    return label;
  };
  
  // Size-based styling
  const sizeStyle = size === 'md' 
    ? {
        fontSize: '13px',
        padding: '4px 12px',
        borderRadius: '9999px'
      }
    : {
        fontSize: '11px',
        padding: '2px 8px',
        borderRadius: '9999px'
      };
  
  const stateStyle = getStateStyle();
  const label = formatLabel();
  
  return (
span
      className="claim-status-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        lineHeight: 1,
        ...sizeStyle,
        ...stateStyle
      }}
      data-testid="claim-status-pill"
      data-state={normalizedState}
      data-size={size}
    >
      {showIcon && (
span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: stateStyle.color,
            flexShrink: 0
          }}
          data-testid="status-icon"
        />
      )}
span>{span>
span>
  );
};

export default ClaimStatusPill;
```

## Test File: `frontend/src/components/mojos/ClaimStatusPill.test.jsx`

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  // Specified 7 tests
  it('renders "draft" with neutral styling', () => {
   ClaimStatusPill state="draft" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Draft');
    expect(pill).toHaveStyle({ backgroundColor: 'var(--sm-neutral-bg)' });
    expect(pill).toHaveStyle({ color: 'var(--sm-neutral-text)' });
  });
  
  it('renders "paid" with success styling', () => {
   ClaimStatusPill state="paid" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Paid');
    expect(pill).toHaveStyle({ backgroundColor: 'var(--sm-success-bg)' });
    expect(pill).toHaveStyle({ color: 'var(--sm-success-text)' });
  });
  
  it('renders "denied" with error styling', () => {
   ClaimStatusPill state="denied" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Denied');
    expect(pill).toHaveStyle({ backgroundColor: 'var(--sm-error-bg)' });
    expect(pill).toHaveStyle({ color: 'var(--sm-error-text)' });
  });
  
  it('renders "written_off" with strikethrough text style applied', () => {
   ClaimStatusPill state="written_off" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Written off');
    expect(pill).toHaveStyle({ backgroundColor: 'var(--sm-muted-bg)' });
    expect(pill).toHaveStyle({ color: 'var(--sm-muted-text)' });
    expect(pill).toHaveStyle({ textDecoration: 'line-through' });
  });
  
  it('renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)', () => {
    render(<ClaimStatusPill state="nonexistent_state" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Unknown');
    expect(pill).toHaveStyle({ backgroundColor: 'var(--sm-neutral-bg)' });
    expect(pill).toHaveStyle({ color: 'var(--sm-neutral-text)' });
  });
  
  it('size="md" applies correct font-size and padding', () => {
    render(<ClaimStatusPill state="draft" size="md" />);
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveStyle({ fontSize: '13px' });
    expect(pill).toHaveStyle({ padding: '4px 12px' });
  });
  
  it('showIcon=false hides the icon element', () => {
   ClaimStatusPill state="draft" showIcon={false} />);
    
    const icon = screen.queryByTestId('status-icon');
    expect(icon).not.toBeInTheDocument();
    
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Draft');
  });
  
  // Additional tests for acceptance criteria
  it('renders without errors for all 19 known states', () => {
    const knownStates = [
      'draft', 'ready_to_submit', 'submitted', 'pending_review', 
      'under_review', 'acknowledged', 'accepted', 'paid', 'partial_payment',
      'rejected', 'denied', 'appeal_pending', 'appeal_submitted',
      'adjudicated', 'written_off', 'voided', 'cancelled', 'error', 'failed'
    ];
    
    knownStates.forEach(state => {
      expect(() => render(<ClaimStatusPill state={state} />)).not.toThrow();
    });
  });
  
  it('formats labels correctly: underscores to spaces, first word capitalized', () => {
    const testCases = [
      { state: 'ready_to_submit', expected: 'Ready to submit' },
      { state: 'pending_review', expected: 'Pending review' },
      { state: 'under_review', expected: 'Under review' },
      { state: 'partial_payment', expected: 'Partial payment' },
      { state: 'appeal_pending', expected: 'Appeal pending' },
      { state: 'appeal_submitted', expected: 'Appeal submitted' },
      { state: 'written_off', expected: 'Written off' },
      { state: 'draft', expected: 'Draft' },
      { state: 'paid', expected: 'Paid' },
    ];
    
    testCases.forEach(({ state, expected }) => {
      const { unmount } = render(<ClaimStatusPill state={state} />);
      const pill = screen.getByTestId('claim-status-pill');
      expect(pill).toHaveTextContent(expected);
      unmount();
    });
  });
  
  it('uses correct color mapping for all state groups', () => {
    const stateGroups = [
      { states: ['draft', 'ready_to_submit'], bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)' },
      { states: ['submitted', 'pending_review', 'under_review', 'acknowledged'], bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)' },
      { states: ['accepted'], bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)' },
      { states: ['paid', 'partial_payment'], bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)' },
      { states: ['rejected', 'denied'], bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)' },
      { states: ['appeal_pending', 'appeal_submitted'], bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)' },
      { states: ['adjudicated'], bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)' },
      { states: ['written_off', 'voided', 'cancelled'], bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)' },
      { states: ['error', 'failed'], bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)' }
    ];
    
    stateGroups.forEach(group => {
      group.states.forEach(state => {
        const { unmount } = render(<ClaimStatusPill state={state} />);
        const pill = screen.getByTestId('claim-status-pill');
        expect(pill).toHaveStyle({ backgroundColor: group.bg });
        expect(pill).toHaveStyle({ color: group.text });
        unmount();
      });
    });
  });
});
```

## Implementation Summary

The `ClaimStatusPill` component meets all story requirements:

1. **Pure display component** - No API calls, accepts `state`, `size`, and `showIcon` props
2. **CSS variables only** - Uses `var(--sm-*)` tokens for all colors, no hardcoded hex values
3. **State mapping** - Implements exact color mapping from spec for all 19 states
4. **Label formatting** - Converts underscores to spaces, capitalizes first word only
5. **Size variants** - `sm` (11px font, 2px 8px padding) and `md` (13px font, 4px 12px padding)
6. **Unknown state handling** - Shows "Unknown" with neutral styling
7. **Strikethrough** - Applied to `written_off`, `voided`, `cancelled` states
8. **Icon handling** - Simple dot icon that matches text color, hideable via `showIcon={false}`
9. **No frappe imports** - Clean implementation with no platform dependencies
10. **Test coverage** - All 7 specified tests plus additional coverage for acceptance criteria

The component follows Spark Mojo architecture constraints: `.jsx` file extension, React-only, no TypeScript, and uses semantic CSS variables for theming.