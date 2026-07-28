import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { organizationsApi, groupsApi } from '../../api/client.js';

export const fetchChats = createAsyncThunk('chats/fetch', async (orgId) => {
  const res = await organizationsApi.chats(orgId);
  return res.chats;
});

/** Marks a group read server-side and zeroes its local unread count
 *  immediately, so navigating back to the Chats list doesn't show a stale
 *  badge while the next `fetchChats` is in flight. */
export const markChatRead = createAsyncThunk('chats/markRead', async (groupId) => {
  await groupsApi.markRead(groupId);
  return groupId;
});

const chatSlice = createSlice({
  name: 'chats',
  initialState: { list: [], loading: false, loaded: false },
  reducers: {
    // Dispatched by socketMiddleware on the org-wide 'chat:message' event —
    // updates the last-message preview and bumps unread (unless the message
    // is the caller's own, computed by the middleware before dispatching).
    chatMessageReceived: (state, action) => {
      const { groupId, message, mine } = action.payload;
      const chat = state.list.find((c) => c.id === groupId);
      if (!chat) return;
      chat.lastMessage = {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        authorId: message.author.id,
        authorName: message.author.name || message.author.email,
        mine,
        attachmentKind: message.attachments?.[0]?.kind || null,
      };
      if (!mine) chat.unreadCount = (chat.unreadCount || 0) + 1;
    },
    // From 'chat:message:edited'. Only refreshes the preview text, and only if
    // the edited message still *is* the last one — an edit is not new activity,
    // so it must never touch unreadCount or reorder the list.
    chatMessageEdited: (state, action) => {
      const { groupId, message } = action.payload;
      const chat = state.list.find((c) => c.id === groupId);
      if (!chat || chat.lastMessage?.id !== message.id) return;
      chat.lastMessage.content = message.content;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.list = action.payload;
      })
      .addCase(fetchChats.rejected, (state) => {
        state.loading = false;
        state.loaded = true;
      })
      .addCase(markChatRead.fulfilled, (state, action) => {
        const chat = state.list.find((c) => c.id === action.payload);
        if (chat) chat.unreadCount = 0;
      });
  },
});

export const { chatMessageReceived, chatMessageEdited } = chatSlice.actions;
export default chatSlice.reducer;

export const selectChats = (s) => s.chats.list;
export const selectChatsLoaded = (s) => s.chats.loaded;
export const selectTotalUnread = (s) => s.chats.list.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
