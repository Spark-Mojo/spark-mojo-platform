model: model-zeta
test: 05-react-implementation
run: C
date: 2026-04-09

 ```jsx
// frontend/src/components/mojos/ClaimStatusPill.jsx
/* eslint-disable react/prop-types */
import React from 'react';

const STATE_CONFIG = {
  // Neutral
  draft: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strike: false },
  ready_to_submit: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strike: false },
  adjudicated: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strike: false },
  
  // Info
  submitted: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strike: false },
  pending_review: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strike: false },
  under_review: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strike: false },
  acknowledged: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strike: false },
  
  // Warning
  accepted: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strike: false },
  appeal_pending: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strike: false },
  appeal_submitted: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strike: false },
  
  // Success
  paid: { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)', strike: false },
  partial_payment: { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)', strike: false },
  
  // Error
  rejected: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strike: false },
  denied: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strike: false },
  error: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strike: false },
  failed: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strike: false },
  
  // Muted with strikethrough
  written_off: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strike: true },
  voided: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strike: true },
  cancelled: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strike: true },
};

const SIZE_STYLES = {
  sm: { fontSize: '11px', padding: '2px 8px' },
  md: { fontSize: '13px', padding: '4px 12px' },
};

function formatLabel(state) {
  // Replace underscores with spaces
  const withSpaces = state.replace(/_/g, ' ');
  // Capitalize first word only
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).toLowerCase();
}

export default function ClaimStatusPill({ 
  state, 
  size = 'sm', 
  showIcon = true 
}) {
  const config = STATE_CONFIG[state] || { 
    bg: 'var(--sm-neutral-bg)', 
    text: 'var(--sm-neutral-text)', 
    strike: false 
  };
  
  const isUnknown = !STATE_CONFIG[state];
  const displayLabel = isUnknown ? 'Unknown' : formatLabel(state);
  const sizeStyles = SIZE_STYLES[size] || SIZE_STYLES.sm;
  
  const pillStyle = {
    backgroundColor: config.bg,
    color: config.text,
    fontSize: sizeStyles.fontSize,
    padding: sizeStyles.padding,
    borderRadius: '9999px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: size === 'md' ? '6px' : '4px',
    fontWeight: 500,
    lineHeight: 1,
    textDecoration: config.strike ? 'line-through' : 'none',
  };
  
  const iconSize = size === 'md' ? '8px' : '6px';
  
  return (
    <span 
      data-testid="claim-status-pill"
      style={pillStyle}
    >
      {showIcon && (
        <span 
          data-testid="status-icon"
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: '50%',
            backgroundColor: config.text,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
```

```jsx
// frontend/src/components/mojos/ClaimStatusPill.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  it('renders "draft" with neutral styling', () => {
    render(<ClaimStatusPill state="draft" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toHaveTextContent('Draft');
    expect(pill.style.backgroundColor).toBe('var(--sm-neutral-bg)');
    expect(pill.style.color).toBe('var(--sm-neutral-text)');
  });

  it('renders "paid" with success styling', () => {
    render(<ClaimStatusPill state="paid" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toHaveTextContent('Paid');
    expect(pill.style.backgroundColor).toBe('var(--sm-success-bg)');
    expect(pill.style.color).toBe('var(--sm-success-text)');
  });

  it('renders "denied" with error styling', () => {
    render(<ClaimStatusPill state="denied" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toHaveTextContent('Denied');
    expect(pill.style.backgroundColor).toBe('var(--sm-error-bg)');
    expect(pill.style.color).toBe('var(--sm-error-text)');
  });

  it('renders "written_off" with strikethrough text style applied', () => {
    render(<ClaimStatusPill state="written_off" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toHaveTextContent('Written off');
    expect(pill.style.textDecoration).toBe('line-through');
    expect(pill.style.backgroundColor).toBe('var(--sm-muted-bg)');
    expect(pill.style.color).toBe('var(--sm-muted-text)');
  });

  it('renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)', () => {
    render(<ClaimStatusPill state="nonexistent_state" />);
    const pill = screen.getByTestId('claim-status-pill');
    expect(pill).toHaveTextContent('Unknown');
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
    const icon = screen.queryByTestId('status-icon');
    expect(icon).not.toBeInTheDocument();
  });
});
```