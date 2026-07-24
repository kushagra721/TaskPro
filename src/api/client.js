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
  loginWithPassword: (payload) => request('/auth/login/password', { method: 'POST', body: payload, auth: false }),
  verify: (payload) => request('/auth/verify', { method: 'POST', body: payload, auth: false }),
  resend: (payload) => request('/auth/resend', { method: 'POST', body: payload, auth: false }),
  requestPasswordChange: () => request('/auth/password/change/request', { method: 'POST' }),
  confirmPasswordChange: (payload) => request('/auth/password/change/confirm', { method: 'POST', body: payload }),
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
  checkName: (name) => request(`/organizations/check-name?name=${encodeURIComponent(name)}`),
  get: (orgId) => request(`/organizations/${orgId}`),
  update: (orgId, payload) => request(`/organizations/${orgId}`, { method: 'PATCH', body: payload }),
  remove: (orgId, confirmName) => request(`/organizations/${orgId}`, { method: 'DELETE', body: { confirmName } }),
  leave: (orgId, confirmName, newOwnerUserId) =>
    request(`/organizations/${orgId}/leave`, { method: 'POST', body: { confirmName, newOwnerUserId } }),
  dashboard: (orgId, params) => request(`/organizations/${orgId}/dashboard${qs(params)}`),
  members: (orgId, params) => request(`/organizations/${orgId}/members${qs(params)}`),
  memberProfile: (orgId, userId) => request(`/organizations/${orgId}/members/${userId}`),
  myTasks: (orgId, params) => request(`/organizations/${orgId}/my-tasks${qs(params)}`),
  activities: (orgId, params) => request(`/organizations/${orgId}/activities${qs(params)}`),
  reports: (orgId, params) => request(`/organizations/${orgId}/reports${qs(params)}`),
  storageReport: (orgId) => request(`/organizations/${orgId}/storage`),
  changeRole: (orgId, userId, role) =>
    request(`/organizations/${orgId}/members/${userId}/role`, { method: 'PATCH', body: { role } }),
  removeMember: (orgId, userId) =>
    request(`/organizations/${orgId}/members/${userId}`, { method: 'DELETE' }),
  invite: (orgId, payload) =>
    request(`/organizations/${orgId}/invitations`, { method: 'POST', body: payload }),
  listInvitations: (orgId) => request(`/organizations/${orgId}/invitations`),
  cancelInvitation: (orgId, invitationId) =>
    request(`/organizations/${orgId}/invitations/${invitationId}`, { method: 'DELETE' }),
  // Search + join requests
  search: (q) => request(`/organizations/search${qs({ q })}`),
  requestToJoin: (orgId) => request(`/organizations/${orgId}/join-requests`, { method: 'POST' }),
  listJoinRequests: (orgId) => request(`/organizations/${orgId}/join-requests`),
  approveJoinRequest: (orgId, requestId) =>
    request(`/organizations/${orgId}/join-requests/${requestId}/approve`, { method: 'POST' }),
  declineJoinRequest: (orgId, requestId) =>
    request(`/organizations/${orgId}/join-requests/${requestId}/decline`, { method: 'POST' }),
};

// ---- Projects ----
export const projectsApi = {
  list: (orgId, params) => request(`/organizations/${orgId}/projects${qs(params)}`),
  // `all=1` returns every project unpaginated — used by the task form dropdowns.
  listAll: (orgId) => request(`/organizations/${orgId}/projects${qs({ all: 1 })}`),
  get: (orgId, projectId) => request(`/organizations/${orgId}/projects/${projectId}`),
  create: (orgId, payload) => request(`/organizations/${orgId}/projects`, { method: 'POST', body: payload }),
  update: (orgId, projectId, payload) =>
    request(`/organizations/${orgId}/projects/${projectId}`, { method: 'PATCH', body: payload }),
  remove: (orgId, projectId, confirmName) =>
    request(`/organizations/${orgId}/projects/${projectId}`, { method: 'DELETE', body: { confirmName } }),
};

// ---- Clients ----
export const clientsApi = {
  list: (orgId, params) => request(`/organizations/${orgId}/clients${qs(params)}`),
  // `all=1` returns every client unpaginated — used by the task form dropdowns.
  listAll: (orgId) => request(`/organizations/${orgId}/clients${qs({ all: 1 })}`),
  get: (orgId, clientId) => request(`/organizations/${orgId}/clients/${clientId}`),
  create: (orgId, payload) => request(`/organizations/${orgId}/clients`, { method: 'POST', body: payload }),
  update: (orgId, clientId, payload) =>
    request(`/organizations/${orgId}/clients/${clientId}`, { method: 'PATCH', body: payload }),
  remove: (orgId, clientId, confirmName) =>
    request(`/organizations/${orgId}/clients/${clientId}`, { method: 'DELETE', body: { confirmName } }),
};

// ---- Invitations (invitee side) ----
export const invitationsApi = {
  mine: () => request('/invitations'),
  accept: (id) => request(`/invitations/${id}/accept`, { method: 'POST' }),
  decline: (id) => request(`/invitations/${id}/decline`, { method: 'POST' }),
  declineByToken: (token) =>
    request(`/invitations/public/${token}/decline`, { method: 'POST', auth: false }),
  statusByToken: (token) => request(`/invitations/public/${token}`, { auth: false }),
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
  update: (groupId, payload) => request(`/groups/${groupId}`, { method: 'PATCH', body: payload }),
  remove: (groupId, confirmName) => request(`/groups/${groupId}`, { method: 'DELETE', body: { confirmName } }),
  addMember: (groupId, userId) =>
    request(`/groups/${groupId}/members`, { method: 'POST', body: { userId } }),
  removeMember: (groupId, userId) =>
    request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  messages: (groupId, cursor) =>
    request(`/groups/${groupId}/messages${cursor ? `?cursor=${cursor}` : ''}`),
  sendMessage: (groupId, content, attachments) =>
    request(`/groups/${groupId}/messages`, { method: 'POST', body: { content, attachments } }),
  react: (groupId, messageId, emoji) =>
    request(`/groups/${groupId}/messages/${messageId}/reactions`, { method: 'POST', body: { emoji } }),
  deleteMessage: (groupId, messageId) =>
    request(`/groups/${groupId}/messages/${messageId}`, { method: 'DELETE' }),
  tasks: (groupId, params) => request(`/groups/${groupId}/tasks${qs(params)}`),
  createTask: (groupId, payload) =>
    request(`/groups/${groupId}/tasks`, { method: 'POST', body: payload }),
};

// ---- Uploads (bulk images/videos/docs -> Azure Blob Storage URLs) ----
export const uploadsApi = {
  /** `files`: File[]. Multipart, so it bypasses the JSON `request()` wrapper. */
  async upload(files) {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const headers = {};
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_URL}/uploads`, { method: 'POST', headers, body: form });
    } catch {
      throw new Error('Cannot reach the server. Is the backend running?');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.message || 'Upload failed');
      error.status = res.status;
      throw error;
    }
    return data;
  },
};

// ---- Tasks ----
export const tasksApi = {
  listForOrg: (orgId, params) => request(`/organizations/${orgId}/tasks${qs(params)}`),
  get: (taskId) => request(`/tasks/${taskId}`),
  update: (taskId, payload) => request(`/tasks/${taskId}`, { method: 'PATCH', body: payload }),
  remove: (taskId) => request(`/tasks/${taskId}`, { method: 'DELETE' }),
  // Per-task timeline: history entries + user-authored messages.
  activities: (taskId) => request(`/tasks/${taskId}/activities`),
  addMessage: (taskId, message) =>
    request(`/tasks/${taskId}/activities`, { method: 'POST', body: { message } }),
  // Attachments — add is open to any group member, remove is creator/admin only.
  addAttachments: (taskId, attachments) =>
    request(`/tasks/${taskId}/attachments`, { method: 'POST', body: { attachments } }),
  removeAttachment: (taskId, attachmentId) =>
    request(`/tasks/${taskId}/attachments/${attachmentId}`, { method: 'DELETE' }),
};
