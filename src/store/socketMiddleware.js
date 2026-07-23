import { connectSocket, disconnectSocket } from '../realtime/socket.js';
import { notificationReceived } from './slices/notificationSlice.js';
import { fetchMyInvitations } from './slices/invitationSlice.js';
import { activityReceived, fetchMyOrgs } from './slices/orgSlice.js';
import { fetchIncomingJoinRequests } from './slices/joinRequestSlice.js';
import { groupReceived } from './slices/groupSlice.js';
import { messageReceived, reactionUpdated, messageDeleted } from './slices/messageSlice.js';
import { taskReceived, taskUpdatedLive, taskRemovedLive } from './slices/taskSlice.js';
import { projectChanged } from './slices/projectSlice.js';
import { clientChanged } from './slices/clientSlice.js';

/**
 * Bridges the Redux store and the Socket.io connection: connects on auth,
 * translates incoming socket events into slice dispatches, disconnects on logout.
 */
export const socketMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  const isAuthEvent =
    action.type === 'auth/setCredentials' || action.type === 'auth/bootstrap/fulfilled';

  if (isAuthEvent) {
    const token = store.getState().auth.token;
    if (token) {
      const socket = connectSocket(token);

      socket.on('notification:new', (notification) => {
        store.dispatch(notificationReceived(notification));
        if (notification.type === 'ORG_INVITATION') store.dispatch(fetchMyInvitations());
        // A generic org notification (e.g. join request approved, or a new
        // incoming join request) may change membership or the admin's queue.
        if (notification.type === 'GENERIC' && notification.data?.organizationId) {
          store.dispatch(fetchMyOrgs());
          store.dispatch(fetchIncomingJoinRequests());
        }
      });
      socket.on('activity:new', (activity) => store.dispatch(activityReceived(activity)));

      // Channels + chat
      socket.on('group:new', (group) => store.dispatch(groupReceived(group)));
      socket.on('message:new', (message) => store.dispatch(messageReceived(message)));
      socket.on('message:reaction', (payload) => store.dispatch(reactionUpdated(payload)));
      socket.on('message:deleted', (payload) => store.dispatch(messageDeleted(payload)));

      // Tasks
      socket.on('task:new', (task) => store.dispatch(taskReceived(task)));
      socket.on('task:updated', (task) => store.dispatch(taskUpdatedLive(task)));
      socket.on('task:deleted', (payload) => store.dispatch(taskRemovedLive(payload)));

      // Projects (org-wide, so the task-form dropdown stays fresh)
      socket.on('project:changed', (project) => store.dispatch(projectChanged(project)));
      // Clients (org-wide, so the task-form dropdown stays fresh)
      socket.on('client:changed', (client) => store.dispatch(clientChanged(client)));
    }
  }

  if (action.type === 'auth/logout') {
    disconnectSocket();
  }

  return result;
};
