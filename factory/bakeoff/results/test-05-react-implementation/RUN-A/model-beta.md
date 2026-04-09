model: model-beta
test: 05-react-implementation
run: A
date: 2026-04-09

## `frontend/src/components/mojos/FeatureFlagBadge.jsx`

```jsx
/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { useSiteConfig } from '@/hooks/useSiteConfig';

const API_BASE =
  (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000') +
  '/api/modules/admin/features';

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M3 6H9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SIZE_STYLES = {
  sm: { fontSize: '11px', padding: '2px 8px', gap: '3px' },
  md: { fontSize: '13px', padding: '4px 12px', gap: '5px' },
};

const STATUS_STYLES = {
  loading: {
    backgroundColor: 'var(--sm-surface-muted)',
    color: 'var(--sm-text-muted)',
  },
  enabled: {
    backgroundColor: 'var(--sm-status-completed-bg)',
    color: 'var(--sm-status-completed-text)',
  },
  disabled: {
    backgroundColor: 'var(--sm-surface-muted)',
    color: 'var(--sm-text-muted)',
  },
  error: {
    backgroundColor: 'var(--sm-status-failed-bg)',
    color: 'var(--sm-status-failed-text)',
  },
};

export default function FeatureFlagBadge({
  featureKey,
  subdomain: subdomainProp,
  size = 'sm',
}) {
  const { subdomain: hookSubdomain } = useSiteConfig();
  const subdomain = subdomainProp || hookSubdomain;

  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!subdomain) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    fetch(`${API_BASE}/${encodeURIComponent(subdomain)}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((resp) => {
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);
        return resp.json();
      })
      .then((data) => {
        if (cancelled) return;
        const features = data.features || {};
        setStatus(features[featureKey] ? 'enabled' : 'disabled');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [subdomain, featureKey]);

  const label = featureKey.replace(/_/g, ' ');
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;
  const colorStyle = STATUS_STYLES[status];

  let content;
  if (status === 'loading') {
    content = '...';
  } else if (status === 'enabled') {
    content = (
      <>
        <CheckIcon /> {label}
      </>
    );
  } else if (status === 'disabled') {
    content = (
      <>
        <DashIcon /> {label}
      </>
    );
  } else {
    content = 'unavailable';
  }

  return (
    <span
      data-testid="feature-flag-badge"
      data-status={status}
      style={{
        ...colorStyle,
        fontSize: sizeStyle.fontSize,
        padding: sizeStyle.padding,
        gap: sizeStyle.gap,
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '9999px',
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {content}
    </span>
  );
}
```

---

## `frontend/src/components/mojos/FeatureFlagBadge.test.jsx`

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock useSiteConfig — vi.mock is hoisted above imports
vi.mock('@/hooks/useSiteConfig', () => ({
  useSiteConfig: vi.fn(),
}));

import FeatureFlagBadge from './FeatureFlagBadge';
import { useSiteConfig } from '@/hooks/useSiteConfig';

function mockFetchResponse(features) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ features }),
    })
  );
}

describe('FeatureFlagBadge', () => {
  beforeEach(() => {
    useSiteConfig.mockReturnValue({ subdomain: 'test-site' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    // fetch that never resolves keeps component in loading state
    global.fetch = vi.fn(() => new Promise(() => {}));

    render(<FeatureFlagBadge featureKey="billing_mojo" />);

    const badge = screen.getByTestId('feature-flag-badge');
    expect(badge).toHaveAttribute('data-status', 'loading');
    expect(badge).toHaveTextContent('...');
  });

  it('renders enabled state when feature is true in API response', async () => {
    global.fetch = mockFetchResponse({ billing_mojo: true, workboard: false });

    render(<FeatureFlagBadge featureKey="billing_mojo" />);

    await waitFor(() => {
      expect(screen.getByTestId('feature-flag-badge')).toHaveAttribute(
        'data-status',
        'enabled'
      );
    });

    const badge = screen.getByTestId('feature-flag-badge');
    expect(badge).toHaveTextContent('billing mojo');
  });

  it('renders disabled state when feature is false in API response', async () => {
    global.fetch = mockFetchResponse({ billing_mojo: false });

    render(<FeatureFlagBadge featureKey="billing_mojo" />);

    await waitFor(() => {
      expect(screen.getByTestId('feature-flag-badge')).toHaveAttribute(
        'data-status',
        'disabled'
      );
    });

    const badge = screen.getByTestId('feature-flag-badge');
    expect(badge).toHaveTextContent('billing mojo');
  });

  it('renders error state on API failure', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    render(<FeatureFlagBadge featureKey="billing_mojo" />);

    await waitFor(() => {
      expect(screen.getByTestId('feature-flag-badge')).toHaveAttribute(
        'data-status',
        'error'
      );
    });

    expect(screen.getByTestId('feature-flag-badge')).toHaveTextContent(
      'unavailable'
    );
  });

  it('uses subdomain from prop when provided', async () => {
    global.fetch = mockFetchResponse({ billing_mojo: true });

    render(
      <FeatureFlagBadge featureKey="billing_mojo" subdomain="prop-site" />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/prop-site');
    expect(url).not.toContain('/test-site');
  });

  it('uses subdomain from useSiteConfig when prop is absent', async () => {
    useSiteConfig.mockReturnValue({ subdomain: 'hook-site' });
    global.fetch = mockFetchResponse({ billing_mojo: true });

    render(<FeatureFlagBadge featureKey="billing_mojo" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/hook-site');
  });
});
```

---

### Acceptance criteria traceability

| # | Criterion | How it's met |
|---|-----------|-------------|
| 1 | Renders without errors | Component is a pure function component with standard hooks; tests verify render |
| 2 | All 4 visual states render correctly | `data-status` attribute drives `loading` / `enabled` / `disabled` / `error` — each tested |
| 3 | No hardcoded hex colors | Every color references `var(--sm-*)` tokens; zero hex values in the file |
| 4 | No Frappe imports or `window.frappe` | Only imports are `react` and `useSiteConfig`; fetch targets `/api/modules/admin/features/` |
| 5 | File extension is `.jsx` | Both files end in `.jsx` |
| 6 | All 6 tests pass | Each of the 6 specified test cases is implemented with clear assertions |