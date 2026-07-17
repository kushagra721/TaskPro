const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'taskpro_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Build a `?a=1&b=2` string from an object, skipping empty values. */
const qs = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.append(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

/**
 * Thin fetch wrapper. Attaches the JWT when present, parses JSON, and throws an
 * Error carrying the server message + field errors on non-2xx responses.
 */
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || 'Something went wrong');
    error.fields = data.errors;
    error.status = res.status;
    throw error;
  }

  return data;
}

// ---- Auth (public) ----
export const authApi = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  verify: (payload) => request('/auth/verify', { method: 'POST', body: payload, auth: false }),
  resend: (payload) => request('/auth/resend', { method: 'POST', body: payload, auth: false }),
};

// ---- Users ----
export const usersApi = {
  me: () => request('/users/me'),
  updateMe: (payload) => request('/users/me', { method: 'PATCH', body: payload }),
};

// ---- Organizations ----
export const organizationsApi = {
  list: () => request('/organizations'),
  create: (payload) => request('/organizations', { method: 'POST', body: payload }),
  get: (orgId) => request(`/organizations/${orgId}`),
  dashboard: (orgId, params) => request(`/organizations/${orgId}/dashboard${qs(params)}`),
  members: (orgId, params) => request(`/organizations/${orgId}/members${qs(params)}`),
  myTasks: (orgId, params) => request(`/organizations/${orgId}/my-tasks${qs(params)}`),
  activities: (orgId, params) => request(`/organizations/${orgId}/activities${qs(params)}`),
  reports: (orgId, params) => request(`/organizations/${orgId}/reports${qs(params)}`),
  changeRole: (orgId, userId, role) =>
    request(`/organizations/${orgId}/members/${userId}/role`, { method: 'PATCH', body: { role } }),
  removeMember: (orgId, userId) =>
    request(`/organizations/${orgId}/members/${userId}`, { method: 'DELETE' }),
  invite: (orgId, payload) =>
    request(`/organizations/${orgId}/invitations`, { method: 'POST', body: payload }),
  listInvitations: (orgId) => request(`/organizations/${orgId}/invitations`),
  // Search + join requests
  search: (q) => request(`/organizations/search${qs({ q })}`),
  requestToJoin: (orgId) => request(`/organizations/${orgId}/join-requests`, { method: 'POST' }),
  listJoinRequests: (orgId) => request(`/organizations/${orgId}/join-requests`),
  approveJoinRequest: (orgId, requestId) =>
    request(`/organizations/${orgId}/join-requests/${requestId}/approve`, { method: 'POST' }),
  declineJoinRequest: (orgId, requestId) =>
    request(`/organizations/${orgId}/join-requests/${requestId}/decline`, { method: 'POST' }),
};

// ---- Invitations (invitee side) ----
export const invitationsApi = {
  mine: () => request('/invitations'),
  accept: (id) => request(`/invitations/${id}/accept`, { method: 'POST' }),
  decline: (id) => request(`/invitations/${id}/decline`, { method: 'POST' }),
};

// ---- Join requests (admin side, for the bell) ----
export const joinRequestsApi = {
  incoming: () => request('/join-requests/incoming'),
  approve: (id) => request(`/join-requests/${id}/approve`, { method: 'POST' }),
  decline: (id) => request(`/join-requests/${id}/decline`, { method: 'POST' }),
};

// ---- Notifications ----
export const notificationsApi = {
  list: () => request('/notifications'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
};

// ---- Groups / channels + chat ----
export const groupsApi = {
  listForOrg: (orgId, params) => request(`/organizations/${orgId}/groups${qs(params)}`),
  create: (orgId, payload) => request(`/organizations/${orgId}/groups`, { method: 'POST', body: payload }),
  get: (groupId) => request(`/groups/${groupId}`),
  addMember: (groupId, userId) =>
    request(`/groups/${groupId}/members`, { method: 'POST', body: { userId } }),
  removeMember: (groupId, userId) =>
    request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  messages: (groupId, cursor) =>
    request(`/groups/${groupId}/messages${cursor ? `?cursor=${cursor}` : ''}`),
  sendMessage: (groupId, content) =>
    request(`/groups/${groupId}/messages`, { method: 'POST', body: { content } }),
  react: (groupId, messageId, emoji) =>
    request(`/groups/${groupId}/messages/${messageId}/reactions`, { method: 'POST', body: { emoji } }),
  tasks: (groupId, params) => request(`/groups/${groupId}/tasks${qs(params)}`),
  createTask: (groupId, payload) =>
    request(`/groups/${groupId}/tasks`, { method: 'POST', body: payload }),
};

// ---- Tasks ----
export const tasksApi = {
  listForOrg: (orgId, params) => request(`/organizations/${orgId}/tasks${qs(params)}`),
  get: (taskId) => request(`/tasks/${taskId}`),
  update: (taskId, payload) => request(`/tasks/${taskId}`, { method: 'PATCH', body: payload }),
  remove: (taskId) => request(`/tasks/${taskId}`, { method: 'DELETE' }),
};
