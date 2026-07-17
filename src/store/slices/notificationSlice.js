import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationsApi } from '../../api/client.js';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  const res = await notificationsApi.list();
  return res; // { notifications, unreadCount }
});

export const markNotificationRead = createAsyncThunk('notifications/markRead', async (id) => {
  await notificationsApi.markRead(id);
  return { id };
});

export const markAllNotificationsRead = createAsyncThunk('notifications/markAllRead', async () => {
  await notificationsApi.markAllRead();
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0, loading: false },
  reducers: {
    notificationReceived: (state, action) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const n = state.items.find((i) => i.id === action.payload.id);
        if (n && !n.read) {
          n.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach((i) => {
          i.read = true;
        });
        state.unreadCount = 0;
      });
  },
});

export const { notificationReceived } = notificationSlice.actions;
export default notificationSlice.reducer;

export const selectNotifications = (s) => s.notifications.items;
export const selectUnreadCount = (s) => s.notifications.unreadCount;
