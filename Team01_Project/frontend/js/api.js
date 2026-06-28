const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  auth: {
    register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login:    (body) => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  },
  tasks: {
    list:   (params = {}) => apiFetch('/tasks?' + new URLSearchParams(params)),
    get:    (id)          => apiFetch(`/tasks/${id}`),
    create: (body)        => apiFetch('/tasks',    { method: 'POST',   body: JSON.stringify(body) }),
    update: (id, body)    => apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id)          => apiFetch(`/tasks/${id}`, { method: 'DELETE' }),
  },
  categories: {
    list:   ()     => apiFetch('/categories'),
    create: (body) => apiFetch('/categories', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id)   => apiFetch(`/categories/${id}`, { method: 'DELETE' }),
  },
};
