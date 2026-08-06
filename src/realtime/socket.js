import { io } from 'socket.io-client';
import { apiBaseUrl } from '../api/client.js';

/**
 * The socket origin — the API base with the trailing `/api` stripped.
 *
 * Derived from `apiBaseUrl` rather than from `VITE_API_URL` directly, because
 * the native build REWRITES that address (localhost means the phone inside a
 * WebView, so it becomes 10.0.2.2 or `VITE_NATIVE_API_URL`). Reading the raw
 * env var here bypassed that rewrite, so the Android app opened a socket to
 * itself and every realtime feature — live chat, task updates, read receipts,
 * typing indicators — was silently dead there while working fine on web.
 */
const SOCKET_URL = apiBaseUrl.replace(/\/api\/?$/, '');

let socket = null;

/**
 * The channel the user currently has open, if any.
 *
 * Tracked because room membership lives on the SERVER's socket, and that
 * membership is lost whenever the connection is: a dropped network, a phone
 * waking up, a server restart. Room joins are issued once, when the chat page
 * mounts, so without re-issuing them a reconnect leaves an open conversation
 * subscribed to nothing — messages stop arriving live and the page looks
 * frozen until it is navigated away from and back.
 */
let activeGroupId = null;

export const connectSocket = (token) => {
  if (socket) socket.disconnect();
  socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });

  // Re-establish room membership after every (re)connect, not just the first.
  socket.on('connect', () => {
    if (activeGroupId && isVisible()) socket.emit('group:join', activeGroupId);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  activeGroupId = null;
};

/** Join an org room (used after switching org or accepting an invite). */
export const joinOrgRoom = (orgId) => {
  if (socket && orgId) socket.emit('org:join', orgId);
};

const isVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';

/** Join/leave a channel room while viewing it. */
export const joinGroupRoom = (groupId) => {
  activeGroupId = groupId || null;
  if (socket && groupId && isVisible()) socket.emit('group:join', groupId);
};

export const leaveGroupRoom = (groupId) => {
  if (activeGroupId === groupId) activeGroupId = null;
  if (socket && groupId) socket.emit('group:leave', groupId);
};

/**
 * Being in a channel's room means "this person can SEE these messages" — the
 * server uses it to decide whether a push notification would be a duplicate of
 * something already on screen.
 *
 * A mounted chat page is not the same thing. Backgrounding the app (or locking
 * the phone) leaves the page mounted and the socket connected, so without this
 * the user would be treated as watching a conversation they cannot see, and the
 * notification they actually need would be suppressed. Leaving the room while
 * hidden, and rejoining on return, makes the signal mean what the server
 * assumes it means.
 *
 * `visibilitychange` rather than a Capacitor plugin: it is a standard browser
 * event, fires correctly inside the Android WebView, and needs no dependency —
 * and the same behaviour is wanted on web, where a background tab is equally
 * invisible.
 */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!socket || !activeGroupId) return;
    if (document.visibilityState === 'hidden') socket.emit('group:leave', activeGroupId);
    else socket.emit('group:join', activeGroupId);
  });
}

/** Ephemeral typing indicator — not persisted. Rebroadcast to the group room
 *  (for anyone with the chat open) *and* the org room (so the Chats list can
 *  show a live "typing…" preview even for a chat that isn't currently open). */
export const sendTypingStart = (groupId, orgId) => {
  if (socket && groupId) socket.emit('typing:start', { groupId, orgId });
};

export const sendTypingStop = (groupId, orgId) => {
  if (socket && groupId) socket.emit('typing:stop', { groupId, orgId });
};
