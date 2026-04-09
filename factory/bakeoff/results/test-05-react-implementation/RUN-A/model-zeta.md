model: model-zeta
test: 05-react-implementation
run: A
date: 2026-04-09

```jsx
// frontend/src/components/mojos/FeatureFlagBadge.jsx
import { useState, useEffect } from 'react';
import useSiteConfig from '@/hooks/useSiteConfig';

export default function FeatureFlagBadge({ 
  featureKey, 
  subdomain: subdomainProp, 
  size = 'sm' 
}) {
  const siteConfig = useSiteConfig();
  const subdomain = subdomainProp || siteConfig?.subdomain;
  
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!subdomain) {
      setHasError(true);
      setLoading(false);
      return;
    }

    const fetchFeatureStatus = async () => {
      try {
        setLoading(true);
        setHasError(false);
        
        const response = await fetch(`/api/modules/admin/features/${subdomain}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          throw new Error('API error');
        }
        
        const data = await response.json();
        const features = data.features || {};
        
        // Feature is enabled only if explicitly true
        setIsEnabled(features[featureKey] === true);
      } catch (err) {
        setHasError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeatureStatus();
  }, [subdomain, featureKey]);

  const displayLabel = featureKey.replace(/_/g, ' ');
  const sizeClasses = size === 'md' 
    ? 'px-3 py-1.5 text-sm' 
    : 'px-2 py-1 text-xs';

  // Loading state: neutral gray pill with "..."
  if (loading) {
    return (
      <span 
        className={`inline-flex items-center rounded-full font-medium ${sizeClasses}`}
        style={{ 
          backgroundColor: 'var(--sm-surface-muted)', 
          color: 'var(--sm-text-muted)' 
        }}
      >
        ...
      </span>
    );
  }

  // Error state: red pill with "unavailable" text
  if (hasError) {
    return (
      <span 
        className={`inline-flex items-center rounded-full font-medium ${sizeClasses}`}
        style={{ 
          backgroundColor: 'var(--sm-danger)', 
          color: 'white' 
        }}
      >
        unavailable
      </span>
    );
  }

  // Enabled state: green pill with feature label and checkmark icon
  if (isEnabled) {
    return (
      <span 
        className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses}`}
        style={{ 
          backgroundColor: 'var(--sm-primary)', 
          color: 'white' 
        }}
      >
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          fill="none"
          aria-hidden="true"
        >
          <path 
            d="M2 6L5 9L10 3" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        {displayLabel}
      </span>
    );
  }

  // Disabled state: gray pill with feature label and dash icon
  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses}`}
      style={{ 
        backgroundColor: 'var(--sm-surface-muted)', 
        color: 'var(--sm-text-muted)' 
      }}
    >
      <svg 
        width="12" 
        height="12" 
        viewBox="0 0 12 12" 
        fill="none"
        aria-hidden="true"
      >
        <path 
          d="M3 6H9" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
      </svg>
      {displayLabel}
    </span>
  );
}
```

```jsx
// frontend/src/components/mojos/FeatureFlagBadge.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FeatureFlagBadge from './FeatureFlagBadge';

// Mock the useSiteConfig hook
const mockUseSiteConfig = vi.fn();
vi.mock('@/hooks/useSiteConfig', () => ({
  default: (...args) => mockUseSiteConfig(...args),
}));

describe('FeatureFlagBadge', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseSiteConfig.mockReturnValue({ subdomain: 'default-site' });
    global.fetch = vi.fn();
  });

  it('renders loading state initially', () => {
    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="test" />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('renders enabled state when feature is true in API response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: { billing_mojo: true } }),
    });

    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="test" />);

    await waitFor(() => {
      expect(screen.getByText('billing mojo')).toBeInTheDocument();
    });

    const badge = screen.getByText('billing mojo').parentElement;
    expect(badge.querySelector('svg')).toBeInTheDocument();
  });

  it('renders disabled state when feature is false in API response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: { billing_mojo: false } }),
    });

    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="test" />);

    await waitFor(() => {
      expect(screen.getByText('billing mojo')).toBeInTheDocument();
    });

    const badge = screen.getByText('billing mojo').parentElement;
    expect(badge.querySelector('svg')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="test" />);

    await waitFor(() => {
      expect(screen.getByText('unavailable')).toBeInTheDocument();
    });
  });

  it('uses subdomain from prop when provided', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: { test_feature: true } }),
    });

    render(<FeatureFlagBadge featureKey="test_feature" subdomain="custom-site" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/modules/admin/features/custom-site',
        expect.any(Object)
      );
    });
  });

  it('uses subdomain from useSiteConfig when prop is absent', async () => {
    mockUseSiteConfig.mockReturnValue({ subdomain: 'config-site' });
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: { test_feature: true } }),
    });

    render(<FeatureFlagBadge featureKey="test_feature" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/modules/admin/features/config-site',
        expect.any(Object)
      );
    });
  });
});
```