import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import orgReducer from './slices/orgSlice.js';
import invitationReducer from './slices/invitationSlice.js';
import notificationReducer from './slices/notificationSlice.js';
import groupReducer from './slices/groupSlice.js';
import messageReducer from './slices/messageSlice.js';
import chatReducer from './slices/chatSlice.js';
import taskReducer from './slices/taskSlice.js';
import joinRequestReducer from './slices/joinRequestSlice.js';
import projectReducer from './slices/projectSlice.js';
import clientReducer from './slices/clientSlice.js';
import platformAuthReducer from './slices/platformAuthSlice.js';
import kamdhenuAuthReducer from './slices/kamdhenuAuthSlice.js';
import { socketMiddleware } from './socketMiddleware.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orgs: orgReducer,
    invitations: invitationReducer,
    notifications: notificationReducer,
    groups: groupReducer,
    messages: messageReducer,
    chats: chatReducer,
    tasks: taskReducer,
    joinRequests: joinRequestReducer,
    projects: projectReducer,
    clients: clientReducer,
    platformAuth: platformAuthReducer,
    kamdhenuAuth: kamdhenuAuthReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(socketMiddleware),
});
