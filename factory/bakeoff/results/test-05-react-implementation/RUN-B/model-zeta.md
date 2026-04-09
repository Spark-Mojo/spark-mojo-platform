model: model-zeta
test: 05-react-implementation
run: B
date: 2026-04-09

```jsx
/* eslint-disable react/prop-types */
import React from 'react';

const STATE_CONFIG = {
  // Neutral
  draft: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strikethrough: false },
  ready_to_submit: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strikethrough: false },
  adjudicated: { bg: 'var(--sm-neutral-bg)', text: 'var(--sm-neutral-text)', strikethrough: false },
  
  // Info
  submitted: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strikethrough: false },
  pending_review: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strikethrough: false },
  under_review: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strikethrough: false },
  acknowledged: { bg: 'var(--sm-info-bg)', text: 'var(--sm-info-text)', strikethrough: false },
  
  // Warning
  accepted: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strikethrough: false },
  appeal_pending: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strikethrough: false },
  appeal_submitted: { bg: 'var(--sm-warning-bg)', text: 'var(--sm-warning-text)', strikethrough: false },
  
  // Success
  paid: { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)', strikethrough: false },
  partial_payment: { bg: 'var(--sm-success-bg)', text: 'var(--sm-success-text)', strikethrough: false },
  
  // Error
  rejected: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strikethrough: false },
  denied: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strikethrough: false },
  error: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strikethrough: false },
  failed: { bg: 'var(--sm-error-bg)', text: 'var(--sm-error-text)', strikethrough: false },
  
  // Muted (with strikethrough)
  written_off: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strikethrough: true },
  voided: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strikethrough: true },
  cancelled: { bg: 'var(--sm-muted-bg)', text: 'var(--sm-muted-text)', strikethrough: true },
};

function formatLabel(state) {
  if (!state) return '';
  const text = state.replace(/_/g, ' ');
  const words = text.split(' ');
  if (words.length === 0) return '';
  
  // Capitalize first word only, lowercase the rest
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  for (let i = 1; i < words.length; i++) {
    words[i] = words[i].toLowerCase();
  }
  return words.join(' ');
}

const SIZE_STYLES = {
  sm: { fontSize: '11px', padding: '2px 8px', borderRadius: '9999px' },
  md: { fontSize: '13px', padding: '4px 12px', borderRadius: '9999px' },
};

export default function ClaimStatusPill({ state, size = 'sm', showIcon = true }) {
  const config = STATE_CONFIG[state];
  
  let bgColor;
  let textColor;
  let strikethrough;
  let label;
  
  if (config) {
    bgColor = config.bg;
    textColor = config.text;
    strikethrough = config.strikethrough;
    label = formatLabel(state);
  } else {
    // Unknown state fallback
    bgColor = 'var(--sm-neutral-bg)';
    textColor = 'var(--sm-neutral-text)';
    strikethrough = false;
    label = 'Unknown';
  }
  
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;
  
  const style = {
    backgroundColor: bgColor,
    color: textColor,
    ...sizeStyle,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: 500,
    lineHeight: 1,
    textDecoration: strikethrough ? 'line-through' : 'none',
  };
  
  return (
    <span style={style}>
      {showIcon && (
        <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
          <circle cx="3" cy="3" r="3" />
        </svg>
      )}
      <span>{label}</span>
    </span>
  );
}
```

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimStatusPill from './ClaimStatusPill';

describe('ClaimStatusPill', () => {
  it('renders "draft" with neutral styling', () => {
    render(<ClaimStatusPill state="draft" />);
    const textElement = screen.getByText('Draft');
    const pill = textElement.parentElement;
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-neutral-bg)',
      color: 'var(--sm-neutral-text)',
    });
  });

  it('renders "paid" with success styling', () => {
    render(<ClaimStatusPill state="paid" />);
    const textElement = screen.getByText('Paid');
    const pill = textElement.parentElement;
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-success-bg)',
      color: 'var(--sm-success-text)',
    });
  });

  it('renders "denied" with error styling', () => {
    render(<ClaimStatusPill state="denied" />);
    const textElement = screen.getByText('Denied');
    const pill = textElement.parentElement;
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-error-bg)',
      color: 'var(--sm-error-text)',
    });
  });

  it('renders "written_off" with strikethrough text style applied', () => {
    render(<ClaimStatusPill state="written_off" />);
    const textElement = screen.getByText('Written off');
    const pill = textElement.parentElement;
    expect(pill).toHaveStyle({
      textDecoration: 'line-through',
    });
  });

  it('renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)', () => {
    render(<ClaimStatusPill state="unknown_xyz_state" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    const textElement = screen.getByText('Unknown');
    const pill = textElement.parentElement;
    expect(pill).toHaveStyle({
      backgroundColor: 'var(--sm-neutral-bg)',
      color: 'var(--sm-neutral-text)',
    });
  });

  it('size="md" applies correct font-size and padding', () => {
    render(<ClaimStatusPill state="draft" size="md" />);
    const textElement = screen.getByText('Draft');
    const pill = textElement.parentElement;
    expect(pill).toHaveStyle({
      fontSize: '13px',
      padding: '4px 12px',
    });
  });

  it('showIcon=false hides the icon element', () => {
    const { container: withIcon } = render(<ClaimStatusPill state="draft" showIcon={true} />);
    const { container: withoutIcon } = render(<ClaimStatusPill state="draft" showIcon={false} />);
    
    expect(withIcon.querySelector('svg')).toBeInTheDocument();
    expect(withoutIcon.querySelector('svg')).not.toBeInTheDocument();
  });
});
```