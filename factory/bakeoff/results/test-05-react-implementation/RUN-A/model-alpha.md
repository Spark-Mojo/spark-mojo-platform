model: model-alpha
test: 05-react-implementation
run: A
date: 2026-04-09

```javascript
// frontend/src/components/mojos/FeatureFlagBadge.jsx
import { useState, useEffect } from 'react';
import { useSiteConfig } from '@/hooks/useSiteConfig';

export default function FeatureFlagBadge({ featureKey, subdomain, size = 'sm' }) {
  const { subdomain: configSubdomain } = useSiteConfig();
  const effectiveSubdomain = subdomain ?? configSubdomain;

  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!effectiveSubdomain || !featureKey) {
      setStatus('error');
      return;
    }

    setStatus('loading');

    fetch(`/api/modules/admin/features/${effectiveSubdomain}`)
      .then((res) => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
      })
      .then((data) => {
        const isEnabled = data.features?.[featureKey];
        setStatus(isEnabled ? 'enabled' : 'disabled');
      })
      .catch(() => {
        setStatus('error');
      });
  }, [effectiveSubdomain, featureKey]);

  const label = featureKey.replace(/_/g, ' ');

  const sizeClasses = size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5';
  const baseClasses = 'inline-flex items-center rounded-full font-medium gap-1.5';

  if (status === 'loading') {
    return (
      <span
        className={`${baseClasses} ${sizeClasses}`}
        style={{ backgroundColor: 'var(--sm-surface-muted)', color: 'var(--sm-text-muted)' }}
      >
        ...
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span
        className={`${baseClasses} ${sizeClasses}`}
        style={{ backgroundColor: 'var(--sm-danger)', color: 'var(--sm-danger-text, white)' }}
        data-testid="feature-flag-badge"
      >
        unavailable
      </span>
    );
  }

  if (status === 'enabled') {
    return (
      <span
        className={`${baseClasses} ${sizeClasses}`}
        style={{ backgroundColor: 'var(--sm-success)', color: 'var(--sm-success-text, white)' }}
        data-testid="feature-flag-badge"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {label}
      </span>
    );
  }

  // disabled
  return (
    <span
      className={`${baseClasses} ${sizeClasses}`}
      style={{ backgroundColor: 'var(--sm-surface-muted)', color: 'var(--sm-text-muted)' }}
      data-testid="feature-flag-badge"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      {label}
    </span>
  );
}
```

```javascript
// frontend/src/components/mojos/FeatureFlagBadge.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FeatureFlagBadge from './FeatureFlagBadge';

// Mock useSiteConfig
vi.mock('@/hooks/useSiteConfig', () => ({
  useSiteConfig: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('FeatureFlagBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSiteConfig.mockReturnValue({ subdomain: 'default-site' });
  });

  it('renders loading state initially', () => {
    render(<FeatureFlagBadge featureKey="test_mojo" />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('renders enabled state when feature is true in API response', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ features: { test_mojo: true } }),
    });
    
    render(<FeatureFlagBadge featureKey="test_mojo" />);
    
    await waitFor(() => {
      expect(screen.getByText('test mojo')).toBeInTheDocument();
      expect(screen.getByTestId('feature-flag-badge')).toHaveStyle({ backgroundColor: 'var(--sm-success)' });
    });
  });

  it('renders disabled state when feature is false in API response', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ features: { test_mojo: false } }),
    });
    
    render(<FeatureFlagBadge featureKey="test_mojo" />);
    
    await waitFor(() => {
      expect(screen.getByText('test mojo')).toBeInTheDocument();
      expect(screen.getByTestId('feature-flag-badge')).toHaveStyle({ backgroundColor: 'var(--sm-surface-muted)' });
    });
  });

  it('renders error state on API failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<FeatureFlagBadge featureKey="test_mojo" />);
    
    await waitFor(() => {
      expect(screen.getByText('unavailable')).toBeInTheDocument();
    });
  });

  it('uses subdomain from prop when provided', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ features: { test_mojo: true } }),
    });
    
    render(<FeatureFlagBadge featureKey="test_mojo" subdomain="custom-site" />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/modules/admin/features/custom-site');
    });
  });

  it('uses subdomain from useSiteConfig when prop is absent', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ features: { test_mojo: true } }),
    });
    
    render(<FeatureFlagBadge featureKey="test_mojo" />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/modules/admin/features/default-site');
    });
  });
});
```