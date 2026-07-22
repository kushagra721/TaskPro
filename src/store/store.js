import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import orgReducer from './slices/orgSlice.js';
import invitationReducer from './slices/invitationSlice.js';
import notificationReducer from './slices/notificationSlice.js';
import groupReducer from './slices/groupSlice.js';
import messageReducer from './slices/messageSlice.js';
import taskReducer from './slices/taskSlice.js';
import joinRequestReducer from './slices/joinRequestSlice.js';
import projectReducer from './slices/projectSlice.js';
import clientReducer from './slices/clientSlice.js';
import { socketMiddleware } from './socketMiddleware.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orgs: orgReducer,
    invitations: invitationReducer,
    notifications: notificationReducer,
    groups: groupReducer,
    messages: messageReducer,
    tasks: taskReducer,
    joinRequests: joinRequestReducer,
    projects: projectReducer,
    clients: clientReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(socketMiddleware),
});
