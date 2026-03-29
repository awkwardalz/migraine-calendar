const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  verifyToken: () => request('/auth/verify'),

  getHeadaches: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/headaches${query ? `?${query}` : ''}`);
  },
  getHeadache: (id) => request(`/headaches/${id}`),
  createHeadache: (data) => request('/headaches', { method: 'POST', body: JSON.stringify(data) }),
  updateHeadache: (id, data) => request(`/headaches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHeadache: (id) => request(`/headaches/${id}`, { method: 'DELETE' }),

  getPreventive: () => request('/preventive'),
  getPreventiveById: (id) => request(`/preventive/${id}`),
  createPreventive: (data) => request('/preventive', { method: 'POST', body: JSON.stringify(data) }),
  updatePreventive: (id, data) => request(`/preventive/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePreventive: (id) => request(`/preventive/${id}`, { method: 'DELETE' }),

  getStats: () => request('/stats'),

  getPeriods: () => request('/period'),
  getPeriodById: (id) => request(`/period/${id}`),
  createPeriod: (data) => request('/period', { method: 'POST', body: JSON.stringify(data) }),
  updatePeriod: (id, data) => request(`/period/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePeriod: (id) => request(`/period/${id}`, { method: 'DELETE' }),

  getWeather: (start, end) => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    return request(`/weather?${params.toString()}`);
  },

  triggerWeatherFetch: (start, end) => {
    const body = {};
    if (start) body.start = start;
    if (end) body.end = end;
    return request('/weather/fetch', { method: 'POST', body: JSON.stringify(body) });
  },
};
