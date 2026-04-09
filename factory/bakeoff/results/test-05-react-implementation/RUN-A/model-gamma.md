model: model-gamma
test: 05-react-implementation
run: A
date: 2026-04-09

```jsx
import { useState, useEffect } from 'react';
import { useSiteConfig } from '@/hooks/useSiteConfig';

const STATUS = {
  LOADING: 'loading',
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  ERROR: 'error',
};

const CHECKMARK_ICON = (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DASH_ICON = (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path d="M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function FeatureFlagBadge({ featureKey, subdomain, size = 'sm' }) {
  const siteConfig = useSiteConfig();
  const resolvedSubdomain = subdomain || siteConfig?.subdomain;

  const [status, setStatus] = useState(STATUS.LOADING);

  useEffect(() => {
    if (!resolvedSubdomain || !featureKey) return;

    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/modules/admin/features/${encodeURIComponent(resolvedSubdomain)}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('API request failed');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const features = data?.features || {};
        if (features[featureKey] === true) {
          setStatus(STATUS.ENABLED);
        } else if (features[featureKey] === false) {
          setStatus(STATUS.DISABLED);
        } else {
          setStatus(STATUS.ERROR);
        }
      })
      .catch(() => {
        if (!cancelled) setStatus(STATUS.ERROR);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [resolvedSubdomain, featureKey]);

  const label = featureKey?.replace(/_/g, ' ') || '';

  const isMd = size === 'md';

  const config = {
    [STATUS.LOADING]: {
      bg: 'var(--sm-status-waiting-bg)',
      text: 'var(--sm-status-waiting-text)',
      label: '...',
      icon: null,
    },
    [STATUS.ENABLED]: {
      bg: 'var(--sm-status-completed-bg)',
      text: 'var(--sm-status-completed-text)',
      label: label,
      icon: CHECKMARK_ICON,
    },
    [STATUS.DISABLED]: {
      bg: 'var(--sm-status-canceled-bg)',
      text: 'var(--sm-status-canceled-text)',
      label: label,
      icon: DASH_ICON,
    },
    [STATUS.ERROR]: {
      bg: 'var(--sm-status-failed-bg)',
      text: 'var(--sm-status-failed-text)',
      label: 'unavailable',
      icon: null,
    },
  };

  const current = config[status];

  return (
    <span
      data-testid={`badge-${status}`}
      className="inline-flex items-center gap-1 rounded-full font-medium"
      style={{
        backgroundColor: current.bg,
        color: current.text,
        padding: isMd ? '4px 12px' : '2px 8px',
        fontSize: isMd ? '0.75rem' : '0.625rem',
      }}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
}
```

```js
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeatureFlagBadge from './FeatureFlagBadge';
import * as useSiteConfigModule from '@/hooks/useSiteConfig';

vi.mock('@/hooks/useSiteConfig');

const mockFetch = (response, status = 200) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
    })
  );
};

const mockFetchReject = () => {
  global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
};

describe('FeatureFlagBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetch({ features: { billing_mojo: true } });
    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="test" />);
    const badge = screen.getByTestId('badge-loading');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('...');
  });

  it('renders enabled state when feature is true in API response', async () => {
    mockFetch({ features: { billing_mojo: true } });
    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="test" />);
    await waitFor(() => {
      const badge = screen.getByTestId('badge-enabled');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toContain('billing mojo');
      expect(badge.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('renders disabled state when feature is false in API response', async () => {
    mockFetch({ features: { billing_mojo: false } });
    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="test" />);
    await waitFor(() => {
      const badge = screen.getByTestId('badge-disabled');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toContain('billing mojo');
      expect(badge.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('renders error state on API failure', async () => {
    mockFetchReject();
    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="test" />);
    await waitFor(() => {
      const badge = screen.getByTestId('badge-error');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toBe('unavailable');
    });
  });

  it('uses subdomain from prop when provided', async () => {
    mockFetch({ features: { billing_mojo: true } });
    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="my-site" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/modules/admin/features/my-site',
        expect.any(Object)
      );
    });
  });

  it('uses subdomain from useSiteConfig when prop is absent', async () => {
    vi.mocked(useSiteConfigModule.useSiteConfig).mockReturnValue({ subdomain: 'hook-site' });
    mockFetch({ features: { billing_mojo: true } });
    render(<FeatureFlagBadge featureKey="billing_mojo" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/modules/admin/features/hook-site',
        expect.any(Object)
      );
    });
  });
});
```