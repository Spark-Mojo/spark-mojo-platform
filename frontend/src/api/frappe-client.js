const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || '';

async function frappeRequest(path, options = {}) {
  const url = `${FRAPPE_URL}${path}`;
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('frappe-unauthorized'));
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

// Dev fallback user when Frappe auth is not available
const DEV_USER = {
  email: 'dev@willow.com',
  full_name: 'Dev User',
  roles: ['Front Desk'],
};

export class FrappeAuth {
  async me() {
    try {
      const { data } = await frappeRequest('/api/modules/desktop/me');
      return {
        email: data.email,
        full_name: data.full_name,
        roles: data.roles || [],
      };
    } catch {
      // Try the abstraction layer's own session (Google OAuth)
      try {
        const resp = await fetch(`${FRAPPE_URL}/auth/me`, { credentials: 'include' });
        if (resp.ok) {
          const user = await resp.json();
          return { email: user.email, full_name: user.full_name, roles: [] };
        }
      } catch {}
      // In development, return mock user so desktop renders
      if (import.meta.env.VITE_ENVIRONMENT === 'development') {
        return DEV_USER;
      }
      throw new Error('Not authenticated');
    }
  }

  async login() {
    // Redirect to abstraction layer's Google OAuth endpoint
    window.location.href = `${FRAPPE_URL}/auth/google`;
  }

  async loginWithPassword(email, password) {
    return frappeRequest('/api/method/login', {
      method: 'POST',
      body: JSON.stringify({ usr: email, pwd: password }),
    });
  }

  async logout() {
    // Clear both abstraction layer and Frappe sessions
    try {
      await fetch(`${FRAPPE_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    try {
      await frappeRequest('/api/method/logout');
    } catch {}
  }
}

export class FrappeEntities {
  constructor() {
    return new Proxy(this, {
      get(target, entityName) {
        if (entityName in target || typeof entityName === 'symbol') {
          return target[entityName];
        }
        return createEntityClient(entityName);
      },
    });
  }
}

function createEntityClient(entityName) {
  const base = `/api/modules/${entityName}`;

  return {
    async list(sort, limit) {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', String(limit));
      const query = params.toString();
      const { data } = await frappeRequest(`${base}/list${query ? '?' + query : ''}`);
      return data || [];
    },

    async filter(filters) {
      const { data } = await frappeRequest(`${base}/list`, {
        method: 'POST',
        body: JSON.stringify({ filters }),
      });
      return data || [];
    },

    async get(id) {
      const { data } = await frappeRequest(`${base}/${encodeURIComponent(id)}`);
      return data;
    },

    async create(doc) {
      const { data } = await frappeRequest(`${base}/create`, {
        method: 'POST',
        body: JSON.stringify(doc),
      });
      return data;
    },

    async update(id, fields) {
      const { data } = await frappeRequest(`${base}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(fields),
      });
      return data;
    },

    async delete(id) {
      return frappeRequest(`${base}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
  };
}
