model: model-delta
test: 05-react-implementation
run: A
date: 2026-04-09

I'll implement exactly what the spec requires: the component file and the test file. Nothing else.

---

## `frontend/src/components/mojos/FeatureFlagBadge.jsx`

```jsx
/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { useSiteConfig } from '@/hooks/useSiteConfig';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000') + '/api/modules/admin';

const STYLES = {
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '9999px',
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
  sm: { fontSize: '11px', padding: '2px 8px' },
  md: { fontSize: '13px', padding: '4px 12px' },
  loading: {
    backgroundColor: 'var(--sm-status-new-bg)',
    color: 'var(--sm-text-muted)',
  },
  enabled: {
    backgroundColor: 'var(--sm-status-completed-bg)',
    color: 'var(--sm-status-completed-text)',
  },
  disabled: {
    backgroundColor: 'var(--sm-status-canceled-bg)',
    color: 'var(--sm-status-canceled-text)',
  },
  error: {
    backgroundColor: 'var(--sm-status-failed-bg)',
    color: 'var(--sm-status-failed-text)',
  },
};

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 5.5L4 7.5L8 3"
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
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 5H7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatLabel(featureKey) {
  return featureKey.replace(/_/g, ' ');
}

export default function FeatureFlagBadge({ featureKey, subdomain: subdomainProp, size = 'sm' }) {
  const { subdomain: subdomainFromHook } = useSiteConfig();
  const resolvedSubdomain = subdomainProp !== undefined ? subdomainProp : subdomainFromHook;

  const [status, setStatus] = useState('loading'); // 'loading' | 'enabled' | 'disabled' | 'error'

  useEffect(() => {
    if (!resolvedSubdomain || !featureKey) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    fetch(`${API_BASE}/features/${encodeURIComponent(resolvedSubdomain)}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then((data) => {
        if (cancelled) return;
        const features = data?.features ?? {};
        const isEnabled = features[featureKey] === true;
        setStatus(isEnabled ? 'enabled' : 'disabled');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedSubdomain, featureKey]);

  const sizeStyle = STYLES[size] ?? STYLES.sm;

  if (status === 'loading') {
    return (
      <span
        data-testid="feature-flag-badge"
        data-status="loading"
        style={{ ...STYLES.pill, ...sizeStyle, ...STYLES.loading }}
        aria-label={`${formatLabel(featureKey)} status loading`}
      >
        ...
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span
        data-testid="feature-flag-badge"
        data-status="error"
        style={{ ...STYLES.pill, ...sizeStyle, ...STYLES.error }}
        aria-label={`${formatLabel(featureKey)} unavailable`}
      >
        unavailable
      </span>
    );
  }

  if (status === 'enabled') {
    return (
      <span
        data-testid="feature-flag-badge"
        data-status="enabled"
        style={{ ...STYLES.pill, ...sizeStyle, ...STYLES.enabled }}
        aria-label={`${formatLabel(featureKey)} enabled`}
      >
        <CheckIcon />
        {formatLabel(featureKey)}
      </span>
    );
  }

  // disabled
  return (
    <span
      data-testid="feature-flag-badge"
      data-status="disabled"
      style={{ ...STYLES.pill, ...sizeStyle, ...STYLES.disabled }}
      aria-label={`${formatLabel(featureKey)} disabled`}
    >
      <DashIcon />
      {formatLabel(featureKey)}
    </span>
  );
}
```

---

## `frontend/src/components/mojos/FeatureFlagBadge.test.jsx`

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FeatureFlagBadge from './FeatureFlagBadge';

// --- Mock useSiteConfig hook ---
vi.mock('@/hooks/useSiteConfig', () => ({
  useSiteConfig: vi.fn(() => ({ subdomain: 'hook-subdomain' })),
}));

import { useSiteConfig } from '@/hooks/useSiteConfig';

// --- Helpers ---
function makeFetchOk(features) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ features }),
    })
  );
}

function makeFetchError() {
  return vi.fn(() =>
    Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })
  );
}

// Reset fetch between tests
beforeEach(() => {
  vi.resetAllMocks();
  useSiteConfig.mockReturnValue({ subdomain: 'hook-subdomain' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('FeatureFlagBadge', () => {

  it('renders loading state initially', () => {
    // fetch never resolves during this synchronous check
    global.fetch = vi.fn(() => new Promise(() => {}));

    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="acme" />);

    const badge = screen.getByTestId('feature-flag-badge');
    expect(badge).toBeDefined();
    expect(badge.dataset.status).toBe('loading');
    expect(badge.textContent).toBe('...');
  });

  it('renders enabled state when feature is true in API response', async () => {
    global.fetch = makeFetchOk({ billing_mojo: true });

    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="acme" />);

    await waitFor(() => {
      const badge = screen.getByTestId('feature-flag-badge');
      expect(badge.dataset.status).toBe('enabled');
    });

    const badge = screen.getByTestId('feature-flag-badge');
    // Label replaces underscores with spaces
    expect(badge.textContent).toContain('billing mojo');
  });

  it('renders disabled state when feature is false in API response', async () => {
    global.fetch = makeFetchOk({ billing_mojo: false });

    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="acme" />);

    await waitFor(() => {
      const badge = screen.getByTestId('feature-flag-badge');
      expect(badge.dataset.status).toBe('disabled');
    });

    const badge = screen.getByTestId('feature-flag-badge');
    expect(badge.textContent).toContain('billing mojo');
  });

  it('renders error state on API failure', async () => {
    global.fetch = makeFetchError();

    render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="acme" />);

    await waitFor(() => {
      const badge = screen.getByTestId('feature-flag-badge');
      expect(badge.dataset.status).toBe('error');
    });

    const badge = screen.getByTestId('feature-flag-badge');
    expect(badge.textContent).toContain('unavailable');
  });

  it('uses subdomain from prop when provided', async () => {
    global.fetch = makeFetchOk({ workboard: true });

    render(<FeatureFlagBadge featureKey="workboard" subdomain="prop-subdomain" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('prop-subdomain'),
        expect.any(Object)
      );
    });

    // Hook subdomain must NOT appear in the URL
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).not.toContain('hook-subdomain');
  });

  it('uses subdomain from useSiteConfig when prop is absent', async () => {
    useSiteConfig.mockReturnValue({ subdomain: 'hook-subdomain' });
    global.fetch = makeFetchOk({ workboard: false });

    // No subdomain prop passed
    render(<FeatureFlagBadge featureKey="workboard" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('hook-subdomain'),
        expect.any(Object)
      );
    });

    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).not.toContain('prop-subdomain');
  });

});
```

---

### Implementation notes

<details>
<summary>Design decisions worth knowing</summary>

**State machine** — The four visual states (`loading`, `enabled`, `disabled`, `error`) are driven by a single `status` string in `useState`. This makes the render branches exhaustive and easy to test by reading `data-status` off the DOM node directly — no class name or color inspection needed.

**Subdomain resolution** — `subdomainProp !== undefined` (not a falsy check) is intentional. An empty string `""` passed as a prop should be treated as a deliberate prop, not as "absent," so the hook fallback won't silently shadow it. The spec says *if not provided* — `undefined` is the canonical "not provided" value in JSX.

**No hex colors** — All color is expressed through `var(--sm-*)` tokens. The enabled/disabled/error/loading tokens reuse the existing status palette (`completed`, `canceled`, `failed`, `new`) which already exists in the platform's CSS variable system. No new tokens are invented.

**No Frappe imports** — The component imports nothing from Frappe. The `window.frappe` global is never touched. `fetch` calls go to `/api/modules/admin/features/{subdomain}` through the MAL, satisfying Architecture Immutable #1.

**Cancellation** — The `useEffect` sets a `cancelled` flag and checks it before calling `setStatus`, preventing state updates on unmounted components when the badge is removed before the request resolves.

**Test isolation** — Each test owns its `global.fetch` mock. The `beforeEach`/`afterEach` pair with `vi.resetAllMocks()` ensures no cross-test bleed. The `useSiteConfig` mock is declared at module scope so `vi.mock` hoisting works correctly, then overridden per-test via `mockReturnValue`.

</details>