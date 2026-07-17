import { io } from 'socket.io-client';

// Derive the socket origin from the API URL (strip the trailing /api).
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

let socket = null;

export const connectSocket = (token) => {
  if (socket) socket.disconnect();
  socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/** Join an org room (used after switching org or accepting an invite). */
export const joinOrgRoom = (orgId) => {
  if (socket && orgId) socket.emit('org:join', orgId);
};

/** Join/leave a channel room while viewing it. */
export const joinGroupRoom = (groupId) => {
  if (socket && groupId) socket.emit('group:join', groupId);
};

export const leaveGroupRoom = (groupId) => {
  if (socket && groupId) socket.emit('group:leave', groupId);
};
