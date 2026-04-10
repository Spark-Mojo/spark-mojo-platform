model: model-theta
test: 05-react-implementation
run: A
date: 2026-04-09

# FeatureFlagBadge Component Implementation

## Component File: `frontend/src/components/mojos/FeatureFlagBadge.jsx`

```jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import useSiteConfig from '../../hooks/useSiteConfig';

/**
 * FeatureFlagBadge - displays a small badge showing whether a named feature
 * is enabled or disabled for the current site.
 *
 * @param {Object} props
 * @param {string} props.featureKey - the feature flag name e.g. "billing_mojo"
 * @param {string} [props.subdomain] - if not provided, use useSiteConfig().subdomain
 * @param {"sm"|"md"} [props.size="sm"] - badge size
 */
export default function FeatureFlagBadge({ featureKey, subdomain: propSubdomain, size = 'sm' }) {
  const siteConfig = useSiteConfig();
  const subdomain = propSubdomain || siteConfig.subdomain;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!subdomain || !featureKey) {
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/modules/admin/features/${encodeURIComponent(subdomain)}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (isCancelled) return;
        const featureValue = data.features?.[featureKey];
        setEnabled(featureValue === true);
        setError(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Failed to fetch feature flag:', err);
        setError(true);
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [subdomain, featureKey]);

  // Format label: replace underscores with spaces
  const label = featureKey.replace(/_/g, ' ');

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  // Base badge styles
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '9999px',
    fontWeight: '500',
    gap: '4px',
    fontFamily: 'Inter, sans-serif',
  };

  if (loading) {
    return (
      <span
        data-testid="feature-flag-badge"
        data-state="loading"
        style={{
          ...baseStyle,
          backgroundColor: 'var(--sm-surface-muted)',
          color: 'var(--sm-text-muted)',
        }}
        className={sizeClasses[size]}
      >
        ...
      </span>
    );
  }

  if (error) {
    return (
span
        data-testid="feature-flag-badge"
        data-state="error"
        style={{
          ...baseStyle,
          backgroundColor: 'var(--sm-danger-bg)',
          color: 'var(--sm-danger-text)',
        }}
        className={sizeClasses[size]}
      >
        unavailable
span>
    );
  }

  if (enabled) {
    return (
span
        data-testid="feature-flag-badge"
        data-state="enabled"
        style={{
          ...baseStyle,
          backgroundColor: 'var(--sm-success-bg)',
          color: 'var(--sm-success-text)',
        }}
        className={sizeClasses[size]}
      >
svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ flexShrink: 0 }}
        >
          <path
            d="M9.5 3.5L4.75 8.25L2.5 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {label}
      </span>
    );
  }

  // Disabled state
  return (
span
      data-testid="feature-flag-badge"
      data-state="disabled"
      style={{
        ...baseStyle,
        backgroundColor: 'var(--sm-surface-muted)',
        color: 'var(--sm-text-muted)',
      }}
      className={sizeClasses[size]}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M3 6H9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
svg>
      {label}
span>
  );
}

FeatureFlagBadge.propTypes = {
  featureKey: PropTypes.string.isRequired,
  subdomain: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md']),
};
```

## Test File: `frontend/src/components/mojos/FeatureFlagBadge.test.jsx`

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FeatureFlagBadge from './FeatureFlagBadge';

// Mock the useSiteConfig hook
vi.mock('../../hooks/useSiteConfig', () => ({
  default: vi.fn(() => ({
    subdomain: 'test-site',
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FeatureFlagBadge', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() =>
      new Promise(() => {}) // Never resolves to keep loading
    );

    render(<FeatureFlagBadge featureKey="billing_mojo" />);
    
    const badge = screen.getByTestId('feature-flag-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-state', 'loading');
    expect(badge).toHaveTextContent('...');
    expect(badge).toHaveStyle({
      backgroundColor: 'var(--sm-surface-muted)',
      color: 'var(--sm-text-muted)',
    });
  });

  it('renders enabled state when feature is true in API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: {
          billing_mojo: true,
          workboard: false,
        },
      }),
    });

    render(<FeatureFlagBadge featureKey="billing_mojo" />);
    
    // Wait for loading to finish
    await waitFor(() => {
      const badge = screen.getByTestId('feature-flag-badge');
      expect(badge).toHaveAttribute('data-state', 'enabled');
      expect(badge).toHaveTextContent('billing mojo');
      expect(badge).toHaveStyle({
        backgroundColor: 'var(--sm-success-bg)',
        color: 'var(--sm-success-text)',
      });
    });

    // Check that fetch was called with correct URL
    expect(mockFetch).toHaveBeenCalledWith('/api/modules/admin/features/test-site');
  });

  it('renders disabled state when feature is false in API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: {
          billing_mojo: false,
          workboard: true,
        },
      }),
    });

   FeatureFlagBadge featureKey="billing_mojo" />);
    
    await waitFor(() => {
      const badge = screen.getByTestId('feature-flag-badge');
      expect(badge).toHaveAttribute('data-state', 'disabled');
      expect(badge).toHaveTextContent('billing mojo');
      expect(badge).toHaveStyle({
        backgroundColor: 'var(--sm-surface-muted)',
        color: 'var(--sm-text-muted)',
      });
    });
  });

  it('renders error state on API failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

   FeatureFlagBadge featureKey="billing_mojo" />);
    
    await waitFor(() => {
      const badge = screen.getByTestId('feature-flag-badge');
      expect(badge).toHaveAttribute('data-state', 'error');
      expect(badge).toHaveTextContent('unavailable');
      expect(badge).toHaveStyle({
        backgroundColor: 'var(--sm-danger-bg)',
        color: 'var(--sm-danger-text)',
      });
    });
  });

  it('uses subdomain from prop when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: { billing_mojo: true },
      }),
    });

    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="custom-site" />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/modules/admin/features/custom-site');
    });
  });

  it('uses subdomain from useSiteConfig when prop is absent', async () => {
    const { default: useSiteConfig } = await import('../../hooks/useSiteConfig');
    useSiteConfig.mockReturnValueOnce({ subdomain: 'config-site' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: { billing_mojo: true },
      }),
    });

   FeatureFlagBadge featureKey="billing_mojo" />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/modules/admin/features/config-site');
    });
  });

  it('formats label by replacing underscores with spaces', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: { some_feature_key: true },
      }),
    });

   FeatureFlagBadge featureKey="some_feature_key" />);
    
    await waitFor(() => {
      const badge = screen.getByTestId('feature-flag-badge');
      expect(badge).toHaveTextContent('some feature key');
    });
  });

  it('applies size class correctly', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { rerender } = render(<FeatureFlagBadge featureKey="test" size="sm" />);
    let badge = screen.getByTestId('feature-flag-badge');
    expect(badge).toHaveClass('text-xs px-2 py-0.5');

    rerender(<FeatureFlagBadge featureKey="test" size="md" />);
    badge = screen.getByTestId('feature-flag-badge');
    expect(badge).toHaveClass('text-sm px-3 py-1');
  });
});
```

## Implementation Details

### Component Features:
1. **Four Visual States**: Loading (`...`), Enabled (green with checkmark), Disabled (gray with dash), Error (red with "unavailable")
2. **API Integration**: Calls `GET /api/modules/admin/features/{subdomain}` via the Mojo Abstraction Layer
3. **Subdomain Resolution**: Uses prop if provided, otherwise falls back to `useSiteConfig().subdomain`
4. **Label Formatting**: Replaces underscores with spaces (e.g., "billing_mojo" → "billing mojo")
5. **Size Options**: "sm" (default) and "md" with appropriate padding and text size
6. **CSS Variables**: Uses only `var(--sm-*)` semantic tokens for colors

### Architecture Compliance:
- ✅ File extension: `.jsx` (no TypeScript)
- ✅ No hardcoded hex colors
- ✅ Calls MAL endpoint, not Frappe directly
- ✅ Uses `useSiteConfig` hook for default subdomain
- ✅ All 6 required tests implemented

### Testing Coverage:
- All visual states (loading, enabled, disabled, error)
- Subdomain prop precedence
- Label formatting
- Size prop application
- API call verification

The component follows Spark Mojo platform guardrails, using the React-to-MAL pattern and semantic CSS variables as required.