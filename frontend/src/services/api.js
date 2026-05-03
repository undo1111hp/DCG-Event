const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('dcg_token');
}

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) {
    return '';
  }

  const query = new URLSearchParams();
  for (const [key, value] of entries) {
    query.set(key, String(value));
  }

  return `?${query.toString()}`;
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  return data;
}

export const api = {
  health: () => request('/health'),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  update_account: (payload) => request('/auth/me', { method: 'PUT', body: JSON.stringify(payload) }),
  change_password: (payload) => request('/auth/me/password', { method: 'PUT', body: JSON.stringify(payload) }),
  my_registrations: () => request('/auth/me/registrations'),
  list_events: (params = {}) => request(`/events${buildQuery(params)}`),
  list_manage_events: (params = {}) => request(`/events/manage${buildQuery(params)}`),
  get_event: (event_id) => request(`/events/${event_id}`),
  create_event: (payload) => request('/events', { method: 'POST', body: JSON.stringify(payload) }),
  get_event_stats: (event_id) => request(`/events/${event_id}/stats`),
  update_event: (event_id, payload) =>
    request(`/events/${event_id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete_event: (event_id) => request(`/events/${event_id}`, { method: 'DELETE' }),
  register_for_event: (event_id) => request(`/events/${event_id}/register`, { method: 'POST' }),
  list_event_tickets: (event_id) => request(`/commerce/events/${event_id}/tickets`),
  create_ticket: (event_id, payload) =>
    request(`/commerce/events/${event_id}/tickets`, { method: 'POST', body: JSON.stringify(payload) }),
  update_ticket: (event_id, ticket_id, payload) =>
    request(`/commerce/events/${event_id}/tickets/${ticket_id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
  delete_ticket: (event_id, ticket_id) => request(`/commerce/events/${event_id}/tickets/${ticket_id}`, { method: 'DELETE' }),
  create_order: (event_id, payload) =>
    request(`/commerce/events/${event_id}/orders`, { method: 'POST', body: JSON.stringify(payload) }),
  my_orders: () => request('/commerce/my-orders'),
  list_event_orders: (event_id) => request(`/commerce/events/${event_id}/orders`),
  list_order_payments: (order_id) => request(`/commerce/orders/${order_id}/payments`),
  pay_order: (order_id) => request(`/commerce/orders/${order_id}/pay`, { method: 'PUT' }),
  cancel_order: (order_id) => request(`/commerce/orders/${order_id}/cancel`, { method: 'PUT' }),
  list_event_reviews: (event_id) => request(`/events/${event_id}/reviews`),
  add_event_review: (event_id, payload) =>
    request(`/events/${event_id}/reviews`, { method: 'POST', body: JSON.stringify(payload) }),
  list_categories: () => request('/meta/categories'),
  create_category: (payload) => request('/meta/categories', { method: 'POST', body: JSON.stringify(payload) }),
  list_venues: () => request('/meta/venues'),
  create_venue: (payload) => request('/meta/venues', { method: 'POST', body: JSON.stringify(payload) }),
  update_venue: (venue_id, payload) =>
    request(`/meta/venues/${venue_id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  list_users: () => request('/admin/users'),
  update_user_role: (user_id, role) =>
    request(`/admin/users/${user_id}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
};
