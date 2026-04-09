model: model-epsilon
test: 05-react-implementation
run: A
date: 2026-04-09

```javascript
import { useState, useEffect } from 'react';
import { useSiteConfig } from '@/hooks/useSiteConfig';

const API_BASE = '/api/modules/admin/features';

/**
 * Fetches feature flags for a given subdomain
 * @param {string} subdomain
 * @returns {Promise<{features: Record<string, boolean>}>}
 */
async function fetchFeatureFlags(subdomain) {
  const resp = await fetch(`${API_BASE}/${encodeURIComponent(subdomain)}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch features: ${resp.status}`);
  }
  return resp.json();
}

/**
 * Formats feature key for display by replacing underscores with spaces
 * @param {string} featureKey
 * @returns {string}
 */
function formatFeatureLabel(featureKey) {
  return featureKey.replace(/_/g, ' ');
}

/**
 * Checkmark SVG icon
 */
function CheckIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
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

/**
 * Dash SVG icon
 */
function DashIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 6H9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * FeatureFlagBadge - Displays a small badge showing whether a named feature is enabled or disabled
 *
 * @param {Object} props
 * @param {string} props.featureKey - The feature flag name (required)
 * @param {string} [props.subdomain] - Override subdomain (optional, uses useSiteConfig if not provided)
 * @param {"sm"|"md"} [props.size="sm"] - Badge size
 * @param {Object} [props.siteConfig] - Optional site config override for testing
 */
export default function FeatureFlagBadge({ featureKey, subdomain: subdomainProp, size = 'sm', siteConfig: siteConfigProp }) {
  const { subdomain: siteConfigSubdomain } = useSiteConfig() || {};
  const subdomain = subdomainProp ?? siteConfigSubdomain ?? '';

  const [status, setStatus] = useState('loading'); // 'loading' | 'enabled' | 'disabled' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!subdomain || !featureKey) {
      setStatus('error');
      setErrorMessage('Missing subdomain or feature key');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);

    fetchFeatureFlags(subdomain)
      .then((data) => {
        if (cancelled) return;
        const features = data?.features || {};
        const isEnabled = Boolean(features[featureKey]);
        setStatus(isEnabled ? 'enabled' : 'disabled');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(err.message || 'Failed to fetch feature status');
      });

    return () => {
      cancelled = true;
    };
  }, [subdomain, featureKey]);

  const label = formatFeatureLabel(featureKey);
  const isSmall = size === 'sm';

  const pillClass = isSmall
    ? 'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full'
    : 'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full';

  const iconSize = isSmall ? 10 : 12;

  if (status === 'loading') {
    return (
      <span
        data-testid="feature-badge"
        data-status="loading"
        className={pillClass}
        style={{
          backgroundColor: 'var(--sm-control-bg)',
          color: 'var(--sm-text-muted)',
        }}
      >
        <span data-testid="feature-badge-label">...</span>
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span
        data-testid="feature-badge"
        data-status="error"
        className={pillClass}
        style={{
          backgroundColor: 'var(--sm-danger)',
          color: 'var(--sm-white)',
        }}
      >
        <span data-testid="feature-badge-label">unavailable</span>
      </span>
    );
  }

  if (status === 'enabled') {
    return (
      <span
        data-testid="feature-badge"
        data-status="enabled"
        className={pillClass}
        style={{
          backgroundColor: 'var(--sm-success)',
          color: 'var(--sm-white)',
        }}
      >
        <CheckIcon size={iconSize} />
        <span data-testid="feature-badge-label">{label}</span>
      </span>
    );
  }

  // status === 'disabled'
  return (
    <span
      data-testid="feature-badge"
      data-status="disabled"
      className={pillClass}
      style={{
        backgroundColor: 'var(--sm-control-bg)',
        color: 'var(--sm-text-muted)',
      }}
    >
      <DashIcon size={iconSize} />
      <span data-testid="feature-badge-label">{label}</span>
    </span>
  );
}
```

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeatureFlagBadge from './FeatureFlagBadge';

// Mock the useSiteConfig hook
vi.mock('@/hooks/useSiteConfig', () => ({
  useSiteConfig: vi.fn(),
}));

// Import after mock
const { useSiteConfig } = require('@/hooks/useSiteConfig');

describe('FeatureFlagBadge', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('renders loading state initially', () => {
    it('shows loading state with "..." text', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      useSiteConfig.mockReturnValue({ subdomain: 'testsite' });

      render(<FeatureFlagBadge featureKey="billing_mojo" />);

      const badge = screen.getByTestId('feature-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-status', 'loading');
      expect(screen.getByTestId('feature-badge-label')).toHaveTextContent('...');
    });
  });

  describe('renders enabled state when feature is true in API response', () => {
    it('displays green pill with checkmark and feature label', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: { billing_mojo: true } }),
      });

      useSiteConfig.mockReturnValue({ subdomain: 'testsite' });

      render(<FeatureFlagBadge featureKey="billing_mojo" />);

      await waitFor(() => {
        const badge = screen.getByTestId('feature-badge');
        expect(badge).toHaveAttribute('data-status', 'enabled');
      });

      expect(screen.getByTestId('feature-badge-label')).toHaveTextContent('billing mojo');
    });

    it('displays enabled state with subdomain from useSiteConfig when prop is absent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: { workboard: true } }),
      });

      useSiteConfig.mockReturnValue({ subdomain: 'mysite' });

      render(<FeatureFlagBadge featureKey="workboard" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/modules/admin/features/mysite',
          expect.objectContaining({ credentials: 'include' })
        );
      });

      await waitFor(() => {
        const badge = screen.getByTestId('feature-badge');
        expect(badge).toHaveAttribute('data-status', 'enabled');
      });
    });
  });

  describe('renders disabled state when feature is false in API response', () => {
    it('displays gray pill with dash icon and feature label', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: { billing_mojo: false } }),
      });

      useSiteConfig.mockReturnValue({ subdomain: 'testsite' });

      render(<FeatureFlagBadge featureKey="billing_mojo" />);

      await waitFor(() => {
        const badge = screen.getByTestId('feature-badge');
        expect(badge).toHaveAttribute('data-status', 'disabled');
      });

      expect(screen.getByTestId('feature-badge-label')).toHaveTextContent('billing mojo');
    });
  });

  describe('renders error state on API failure', () => {
    it('displays red pill with "unavailable" text', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      useSiteConfig.mockReturnValue({ subdomain: 'testsite' });

      render(<FeatureFlagBadge featureKey="billing_mojo" />);

      await waitFor(() => {
        const badge = screen.getByTestId('feature-badge');
        expect(badge).toHaveAttribute('data-status', 'error');
      });

      expect(screen.getByTestId('feature-badge-label')).toHaveTextContent('unavailable');
    });

    it('displays error state when API returns non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      useSiteConfig.mockReturnValue({ subdomain: 'testsite' });

      render(<FeatureFlagBadge featureKey="billing_mojo" />);

      await waitFor(() => {
        const badge = screen.getByTestId('feature-badge');
        expect(badge).toHaveAttribute('data-status', 'error');
      });
    });
  });

  describe('uses subdomain from prop when provided', () => {
    it('calls API with provided subdomain', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: { billing_mojo: true } }),
      });

      useSiteConfig.mockReturnValue({ subdomain: 'unused-site' });

      render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="explicit-site" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/modules/admin/features/explicit-site',
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('uses prop subdomain even if useSiteConfig returns different value', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: { billing_mojo: true } }),
      });

      useSiteConfig.mockReturnValue({ subdomain: 'hook-subdomain' });

      render(<FeatureFlagBadge featureKey="billing_mojo" subdomain="prop-subdomain" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/modules/admin/features/prop-subdomain',
          expect.any(Object)
        );
      });
    });
  });

  describe('uses subdomain from useSiteConfig when prop is absent', () => {
    it('fetches from site config subdomain', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: { billing_mojo: true } }),
      });

      useSiteConfig.mockReturnValue({ subdomain: 'site-config-subdomain' });

      render(<FeatureFlagBadge featureKey="billing_mojo" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/modules/admin/features/site-config-subdomain',
          expect.any(Object)
        );
      });
    });

    it('handles missing subdomain gracefully', async () => {
      useSiteConfig.mockReturnValue({});

      render(<FeatureFlagBadge featureKey="billing_mojo" />);

      await waitFor(() => {
        const badge = screen.getByTestId('feature-badge');
        expect(badge).toHaveAttribute('data-status', 'error');
      });
    });
  });

  describe('feature label formatting', () => {
    it('replaces underscores with spaces in feature key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: { my_feature_flag: true } }),
      });

      useSiteConfig.mockReturnValue({ subdomain: 'testsite' });

      render(<FeatureFlagBadge featureKey="my_feature_flag" />);

      await waitFor(() => {
        expect(screen.getByTestId('feature-badge-label')).toHaveTextContent('my feature flag');
      });
    });

    it('handles multiple underscores correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: { billing_mojo_v2_enabled: true } }),
      });

      useSiteConfig.mockReturnValue({ subdomain: 'testsite' });

      render(<FeatureFlagBadge featureKey="billing_mojo_v2_enabled" />);

      await waitFor(() => {
        expect(screen.getByTestId('feature-badge-label')).toHaveTextContent('billing mojo v2 enabled');
      });
    });
  });

  describe('size prop', () => {
    it('renders small size by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: { billing_mojo: true } }),
      });

      useSiteConfig.mockReturnValue({ subdomain: 'testsite' });

      render(<FeatureFlagBadge featureKey="billing_mojo" />);

      const badge = screen.getByTestId('feature-badge');
      expect(badge.className).toContain('text-[10px]');
    });

    it('renders medium size when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ features: { billing_mojo: true } }),
      });

      useSiteConfig.mockReturnValue({ subdomain: 'testsite' });

      render(<FeatureFlagBadge featureKey="billing_mojo" size="md" />);

      const badge = screen.getByTestId('feature-badge');
      expect(badge.className).toContain('text-xs');
    });
  });
});
```