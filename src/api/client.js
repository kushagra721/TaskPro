import { isNativeApp } from '../utils/native.js';

/**
 * Where the API lives.
 *
 * Web takes `VITE_API_URL` verbatim. The **native (Capacitor) build** can't:
 * inside the WebView `localhost` is the phone/emulator itself, so a dev-machine
 * URL of `http://localhost:5000` resolves to nothing and every request fails
 * with "Cannot reach the server" — which is exactly what it looked like.
 *
 * `VITE_NATIVE_API_URL` is the explicit override (set it to your LAN IP for a
 * real device, or the deployed https URL). With it unset, a localhost host is
 * rewritten to **10.0.2.2**, the Android emulator's standing alias for the host
 * machine — so the default `.env` works in the emulator with no extra setup.
 * Note any http:// host must also be allowed in the app's
 * network_security_config.xml, or Android blocks it before we ever see it.
 */
const resolveApiUrl = () => {
  const web = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  if (!isNativeApp()) return web;

  const native = import.meta.env.VITE_NATIVE_API_URL;
  if (native) return native;

  return web.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/i, '$110.0.2.2');
};

// Trailing slash trimmed once, here, because every caller below appends a path
// that already starts with one — `VITE_API_URL=.../api/` was producing
// `/api//auth/login`. Express happened to route that anyway, so it went
// unnoticed until the native error message printed the URL in full.
const API_URL = resolveApiUrl().replace(/\/+$/, '');

/**
 * Message for a fetch that never reached a server (DNS, refused, blocked).
 *
 * The native build names the URL it actually tried, because there the address
 * is a build-time constant the user can't see: an unreachable dev machine and
 * an Android-blocked cleartext request look identical on screen otherwise, and
 * that ambiguity is what made this hard to diagnose the first time.
 */
const unreachableMessage = () =>
  isNativeApp()
    ? `Cannot reach the server at ${API_URL}. Check VITE_NATIVE_API_URL and that this host is allowed in network_security_config.xml.`
    : 'Cannot reach the server. Is the backend running?';

const TOKEN_KEY = 'taskpro_token';
// Separate key from TOKEN_KEY — a platform (Super Admin/Reseller) session and
// a normal client session must never collide/overwrite each other, since a
// browser could plausibly have both open (e.g. testing locally via ?portal=).
const PLATFORM_TOKEN_KEY = 'taskpro_platform_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const platformTokenStore = {
  get: () => localStorage.getItem(PLATFORM_TOKEN_KEY),
  set: (token) => localStorage.setItem(PLATFORM_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(PLATFORM_TOKEN_KEY),
};

// Separate again from both TOKEN_KEY and PLATFORM_TOKEN_KEY — the Kamdhenu
// portal (`?portal=adminkamdhenu`) is a third, fully isolated session lane so
// all three can coexist in one browser.
const KAMDHENU_TOKEN_KEY = 'taskpro_kamdhenu_token';

export const kamdhenuTokenStore = {
  get: () => localStorage.getItem(KAMDHENU_TOKEN_KEY),
  set: (token) => localStorage.setItem(KAMDHENU_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(KAMDHENU_TOKEN_KEY),
};

// The mobile app no longer identifies its tenant by company code — the server
// resolves it from the host instead (see `Test_domain` in the API config), so
// nothing writes this key any more.
//
// It is still CLEARED on load, once, and that is the point: an app upgraded
// from a build that did ask for a code still has the old value in
// localStorage, and the API **prefers `X-Company-Code` over `X-App-Host`**.
// Leaving it would mean the stale code kept deciding the tenant and silently
// overrode the new behaviour — the upgrade would look like it did nothing.
const COMPANY_KEY = 'taskpro_company';

try {
  localStorage.removeItem(COMPANY_KEY);
} catch {
  // Private-mode/quota failures are irrelevant here: if we cannot read or write
  // localStorage there is no stale value to worry about either.
}

/**
 * Absolute URL for a server-rendered document (invoice/receipt), from the
 * API-relative path the backend returns.
 *
 * The backend deliberately sends a path, not a URL: it can't know whether it's
 * being reached on localhost or the deployed host, and it must never guess the
 * *frontend* address (which is what produced broken links before). `API_URL`
 * here is the single source of truth for where the API lives.
 */
export const documentHref = (path) => `${API_URL.replace(/\/$/, '')}${path}`;

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
  const headers = {
    'Content-Type': 'application/json',
    // The browser's own hostname — the API may live on a different host
    // entirely (VITE_API_URL), so this is how the backend knows which
    // reseller's custom domain (if any) a signup is happening on. See
    // organization.controller.js#create.
    'X-App-Host': window.location.hostname,
  };
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
    throw new Error(unreachableMessage());
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

/** Same shape as `request`, but authenticates with the platform token and
 *  never sends the normal user JWT — a fully separate credential lane. */
async function platformRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = platformTokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}/platform${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(unreachableMessage());
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

/** Same shape as `platformRequest`, but for the Kamdhenu portal's own
 *  credential lane — never sends the normal user or platform JWT. */
async function kamdhenuRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = kamdhenuTokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}/kamdhenu${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(unreachableMessage());
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

export const kamdhenuApi = {
  loginWithPassword: (email, password) =>
    kamdhenuRequest('/auth/login/password', { method: 'POST', body: { email, password }, auth: false }),
  requestOtp: (email) => kamdhenuRequest('/auth/login', { method: 'POST', body: { email }, auth: false }),
  verifyOtp: (email, code) =>
    kamdhenuRequest('/auth/verify', { method: 'POST', body: { email, code }, auth: false }),
  me: () => kamdhenuRequest('/auth/me'),

  // ---- Kamdhenu Construction ERP (routes verified against
  // TaskProApi/src/routes/kamdhenu.routes.js) ----
  sites: {
    list: (params) => kamdhenuRequest(`/sites${qs(params)}`),
    listAll: () => kamdhenuRequest(`/sites${qs({ all: 1 })}`),
    get: (id) => kamdhenuRequest(`/sites/${id}`),
    create: (payload) => kamdhenuRequest('/sites', { method: 'POST', body: payload }),
    update: (id, payload) => kamdhenuRequest(`/sites/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => kamdhenuRequest(`/sites/${id}`, { method: 'DELETE' }),
  },
  equipment: {
    list: (params) => kamdhenuRequest(`/equipment${qs(params)}`),
    listAll: () => kamdhenuRequest(`/equipment${qs({ all: 1 })}`),
    get: (id) => kamdhenuRequest(`/equipment/${id}`),
    create: (payload) => kamdhenuRequest('/equipment', { method: 'POST', body: payload }),
    update: (id, payload) => kamdhenuRequest(`/equipment/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => kamdhenuRequest(`/equipment/${id}`, { method: 'DELETE' }),
  },
  members: {
    list: (params) => kamdhenuRequest(`/members${qs(params)}`),
    listAll: () => kamdhenuRequest(`/members${qs({ all: 1 })}`),
    get: (id) => kamdhenuRequest(`/members/${id}`),
    create: (payload) => kamdhenuRequest('/members', { method: 'POST', body: payload }),
    update: (id, payload) => kamdhenuRequest(`/members/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => kamdhenuRequest(`/members/${id}`, { method: 'DELETE' }),
  },
  materials: {
    list: (params) => kamdhenuRequest(`/materials${qs(params)}`),
    listAll: () => kamdhenuRequest(`/materials${qs({ all: 1 })}`),
    get: (id) => kamdhenuRequest(`/materials/${id}`),
    create: (payload) => kamdhenuRequest('/materials', { method: 'POST', body: payload }),
    update: (id, payload) => kamdhenuRequest(`/materials/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => kamdhenuRequest(`/materials/${id}`, { method: 'DELETE' }),
  },
  categories: {
    list: () => kamdhenuRequest('/material-categories'),
    create: (payload) => kamdhenuRequest('/material-categories', { method: 'POST', body: payload }),
    remove: (id) => kamdhenuRequest(`/material-categories/${id}`, { method: 'DELETE' }),
  },
  purchaseOrders: {
    list: (params) => kamdhenuRequest(`/purchase-orders${qs(params)}`),
    listAll: (params) => kamdhenuRequest(`/purchase-orders${qs({ ...params, all: 1 })}`),
    get: (id) => kamdhenuRequest(`/purchase-orders/${id}`),
    create: (payload) => kamdhenuRequest('/purchase-orders', { method: 'POST', body: payload }),
    update: (id, payload) => kamdhenuRequest(`/purchase-orders/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => kamdhenuRequest(`/purchase-orders/${id}`, { method: 'DELETE' }),
  },
  materialIn: {
    list: (params) => kamdhenuRequest(`/material-in${qs(params)}`),
    listAll: (params) => kamdhenuRequest(`/material-in${qs({ ...params, all: 1 })}`),
    get: (id) => kamdhenuRequest(`/material-in/${id}`),
    create: (payload) => kamdhenuRequest('/material-in', { method: 'POST', body: payload }),
    update: (id, payload) => kamdhenuRequest(`/material-in/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => kamdhenuRequest(`/material-in/${id}`, { method: 'DELETE' }),
  },
  materialOut: {
    list: (params) => kamdhenuRequest(`/material-out${qs(params)}`),
    listAll: (params) => kamdhenuRequest(`/material-out${qs({ ...params, all: 1 })}`),
    get: (id) => kamdhenuRequest(`/material-out/${id}`),
    create: (payload) => kamdhenuRequest('/material-out', { method: 'POST', body: payload }),
    update: (id, payload) => kamdhenuRequest(`/material-out/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => kamdhenuRequest(`/material-out/${id}`, { method: 'DELETE' }),
  },
  jobWorks: {
    list: (params) => kamdhenuRequest(`/job-works${qs(params)}`),
    listAll: (params) => kamdhenuRequest(`/job-works${qs({ ...params, all: 1 })}`),
    get: (id) => kamdhenuRequest(`/job-works/${id}`),
    create: (payload) => kamdhenuRequest('/job-works', { method: 'POST', body: payload }),
    // v3 lifecycle: each unit's after picture completes THAT unit; the job
    // work flips to DONE once every unit is done (no general PUT).
    uploadUnitAfter: (id, unitId, afterImageUrl) =>
      kamdhenuRequest(`/job-works/${id}/units/${unitId}/after`, {
        method: 'PATCH',
        body: { afterImageUrl },
      }),
    remove: (id) => kamdhenuRequest(`/job-works/${id}`, { method: 'DELETE' }),
  },
  /** Multipart, so it bypasses `kamdhenuRequest`'s JSON wrapper — same shape as
   *  `uploadsApi.upload` / `platformApi.upload` but on the kamdhenu lane. */
  async upload(files) {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const headers = {};
    const token = kamdhenuTokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_URL}/kamdhenu/uploads`, { method: 'POST', headers, body: form });
    } catch {
      throw new Error(unreachableMessage());
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.message || 'Upload failed');
      error.status = res.status;
      throw error;
    }
    return data;
  },
  stock: (params) => kamdhenuRequest(`/stock${qs(params)}`),
  dashboard: () => kamdhenuRequest('/dashboard'),
  report: (type, params) => kamdhenuRequest(`/reports/${type}${qs(params)}`),
  settings: () => kamdhenuRequest('/settings'),
  updateSettings: (patch) => kamdhenuRequest('/settings', { method: 'PATCH', body: patch }),
};

// ---- Auth (public) ----
export const authApi = {
  // Mobile step 1 — resolve a company code to its tenant before any login.
  // Encoded because the user types it freely; the server normalises it anyway.
  company: (code) => request(`/auth/company/${encodeURIComponent(code)}`, { auth: false }),
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
  // Plans & billing — admin/owner only (requireOrgAdmin server-side).
  billing: (orgId) => request(`/organizations/${orgId}/billing`),
  billingPlans: (orgId) => request(`/organizations/${orgId}/billing/plans`),
  updateBillingDetails: (orgId, payload) =>
    request(`/organizations/${orgId}/billing/details`, { method: 'PATCH', body: payload }),
  changePlan: (orgId, planId) => request(`/organizations/${orgId}/billing/plan`, { method: 'POST', body: { planId } }),
  cancelPlan: (orgId) => request(`/organizations/${orgId}/billing/cancel`, { method: 'POST' }),
  topup: (orgId, tasks) => request(`/organizations/${orgId}/billing/topup`, { method: 'POST', body: { tasks } }),
  // Razorpay: open an order, then settle it. The server prices the order and
  // verifies the signature — neither amount nor success is trusted from here.
  // Read-only pricing for the confirm dialog — writes nothing, so an abandoned
  // dialog doesn't leave a "not completed" payment behind.
  quote: (orgId, payload) => request(`/organizations/${orgId}/billing/quote`, { method: 'POST', body: payload }),
  checkout: (orgId, payload) => request(`/organizations/${orgId}/billing/checkout`, { method: 'POST', body: payload }),
  verifyPayment: (orgId, payload) =>
    request(`/organizations/${orgId}/billing/verify`, { method: 'POST', body: payload }),
  // The replacement autopay mandate of a scheduled downgrade — future-dated, so
  // authorising it charges nothing today.
  setupMandate: (orgId) => request(`/organizations/${orgId}/billing/mandate/setup`, { method: 'POST' }),
  confirmMandate: (orgId, payload) =>
    request(`/organizations/${orgId}/billing/mandate/confirm`, { method: 'POST', body: payload }),
  changeRole: (orgId, userId, role) =>
    request(`/organizations/${orgId}/members/${userId}/role`, { method: 'PATCH', body: { role } }),
  removeMember: (orgId, userId) =>
    request(`/organizations/${orgId}/members/${userId}`, { method: 'DELETE' }),
  invite: (orgId, payload) =>
    request(`/organizations/${orgId}/invitations`, { method: 'POST', body: payload }),
  listInvitations: (orgId) => request(`/organizations/${orgId}/invitations`),
  cancelInvitation: (orgId, invitationId) =>
    request(`/organizations/${orgId}/invitations/${invitationId}`, { method: 'DELETE' }),
  // Chats tab — WhatsApp-style inbox of the caller's own groups
  chats: (orgId) => request(`/organizations/${orgId}/chats`),
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
  markRead: (groupId) => request(`/groups/${groupId}/read`, { method: 'POST' }),
  sendMessage: (groupId, content, attachments) =>
    request(`/groups/${groupId}/messages`, { method: 'POST', body: { content, attachments } }),
  react: (groupId, messageId, emoji) =>
    request(`/groups/${groupId}/messages/${messageId}/reactions`, { method: 'POST', body: { emoji } }),
  editMessage: (groupId, messageId, content) =>
    request(`/groups/${groupId}/messages/${messageId}`, { method: 'PATCH', body: { content } }),
  /** "Delete for me" — hides it from this user only. */
  hideMessage: (groupId, messageId) =>
    request(`/groups/${groupId}/messages/${messageId}/hide`, { method: 'POST' }),
  /** "Delete for everyone" — the hard delete. */
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
      throw new Error(unreachableMessage());
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

// ---- Stickers (image editor's online sticker search, proxied via our API) ----
export const stickersApi = {
  search: (q) => request(`/stickers/search${qs({ q })}`),
  /**
   * Fetches a proxied sticker and returns it as a data URL.
   *
   * Not just `<img src={path}>`: the proxy endpoint requires auth and an
   * `<img>` can't carry an Authorization header. Fetching it here also means
   * fabric composites an inline data URL, so the editor's canvas stays
   * same-origin and can always be exported.
   */
  async imageDataUrl(path) {
    const headers = {};
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, { headers });
    if (!res.ok) throw new Error('Could not load that sticker');
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
};

// ---- Platform (Super Admin / Reseller) ----
export const platformApi = {
  loginWithPassword: (email, password) =>
    platformRequest('/auth/login/password', { method: 'POST', body: { email, password }, auth: false }),
  requestOtp: (email) => platformRequest('/auth/login', { method: 'POST', body: { email }, auth: false }),
  verifyOtp: (email, code) =>
    platformRequest('/auth/verify', { method: 'POST', body: { email, code }, auth: false }),
  resellers: {
    list: () => platformRequest('/resellers'),
    create: (payload) => platformRequest('/resellers', { method: 'POST', body: payload }),
    get: (id) => platformRequest(`/resellers/${id}`),
    update: (id, payload) => platformRequest(`/resellers/${id}`, { method: 'PATCH', body: payload }),
    remove: (id) => platformRequest(`/resellers/${id}`, { method: 'DELETE' }),
  },
  domains: {
    list: () => platformRequest('/domains'),
    create: (payload) => platformRequest('/domains', { method: 'POST', body: payload }),
    get: (id) => platformRequest(`/domains/${id}`),
    update: (id, payload) => platformRequest(`/domains/${id}`, { method: 'PATCH', body: payload }),
    checkDns: (id) => platformRequest(`/domains/${id}/check-dns`, { method: 'POST' }),
    activateSsl: (id) => platformRequest(`/domains/${id}/activate-ssl`, { method: 'POST' }),
    remove: (id) => platformRequest(`/domains/${id}`, { method: 'DELETE' }),
  },
  clients: {
    list: (params) => platformRequest(`/clients${qs(params)}`),
    stats: () => platformRequest('/clients/stats'),
    create: (payload) => platformRequest('/clients', { method: 'POST', body: payload }),
  },
  members: {
    list: (params) => platformRequest(`/members${qs(params)}`),
  },
  navCounts: () => platformRequest('/nav-counts'),
  // The signed-in account's own record — always scoped server-side to the
  // caller, never by id.
  profile: {
    get: () => platformRequest('/profile'),
    update: (payload) => platformRequest('/profile', { method: 'PATCH', body: payload }),
  },
  projections: { get: (params) => platformRequest(`/projections${qs(params)}`) },
  // Manage Mandates — reseller-only, always scoped server-side to the caller's
  // own reseller (the id comes from the token, never from these params).
  mandates: {
    list: (params) => platformRequest(`/mandates${qs(params)}`),
    cancel: (id) => platformRequest(`/mandates/${id}/cancel`, { method: 'POST' }),
  },
  transactions: {
    list: (params) => platformRequest(`/transactions${qs(params)}`),
  },
  invoices: { list: (params) => platformRequest(`/invoices${qs(params)}`) },
  receipts: { list: (params) => platformRequest(`/receipts${qs(params)}`) },
  gateway: {
    get: () => platformRequest('/payment-gateway'),
    update: (payload) => platformRequest('/payment-gateway', { method: 'PATCH', body: payload }),
  },
  signup: (payload) => platformRequest('/auth/signup', { method: 'POST', body: payload, auth: false }),
  verifySignup: (email, code) =>
    platformRequest('/auth/verify-signup', { method: 'POST', body: { email, code }, auth: false }),
  onboarding: (payload) => platformRequest('/onboarding', { method: 'POST', body: payload }),
  // Global (platform) plans — the set a reseller is subscribed to. Readable by
  // either role; distinct from `plans.list()`, which returns whichever set the
  // caller *owns*.
  globalPlans: () => platformRequest('/global-plans'),
  plans: {
    list: () => platformRequest('/plans'),
    create: (payload) => platformRequest('/plans', { method: 'POST', body: payload }),
    update: (id, payload) => platformRequest(`/plans/${id}`, { method: 'PATCH', body: payload }),
    duplicate: (id) => platformRequest(`/plans/${id}/duplicate`, { method: 'POST' }),
    remove: (id) => platformRequest(`/plans/${id}`, { method: 'DELETE' }),
  },
  /** Multipart, so it bypasses `platformRequest`'s JSON wrapper — same shape as
   *  `uploadsApi.upload` but on the platform credential lane. */
  async upload(files) {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const headers = {};
    const token = platformTokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_URL}/platform/uploads`, { method: 'POST', headers, body: form });
    } catch {
      throw new Error(unreachableMessage());
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
