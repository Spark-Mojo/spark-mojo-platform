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

export class FrappeAuth {
  async me() {
    const { message: email } = await frappeRequest('/api/method/frappe.auth.get_logged_user');
    // Fetch full user profile through the abstraction layer — never call Frappe directly
    const { data } = await frappeRequest('/api/modules/desktop/me');
    return {
      email: data.email || email,
      full_name: data.full_name,
      roles: data.roles || [],
    };
  }

  async login(email, password) {
    return frappeRequest('/api/method/login', {
      method: 'POST',
      body: JSON.stringify({ usr: email, pwd: password }),
    });
  }

  async logout() {
    return frappeRequest('/api/method/logout');
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
