import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { groupsApi } from '../../api/client.js';

export const fetchMessages = createAsyncThunk('messages/fetch', async ({ groupId, cursor }) => {
  const res = await groupsApi.messages(groupId, cursor);
  return { groupId, messages: res.messages, nextCursor: res.nextCursor };
});

export const sendMessage = createAsyncThunk('messages/send', async ({ groupId, content, attachments }) => {
  const res = await groupsApi.sendMessage(groupId, content, attachments);
  return { groupId, message: res.message };
});

export const deleteMessage = createAsyncThunk('messages/delete', async ({ groupId, messageId }) => {
  await groupsApi.deleteMessage(groupId, messageId);
  return { groupId, messageId };
});

const ensure = (state, groupId) => {
  if (!state.byGroup[groupId]) state.byGroup[groupId] = { items: [], nextCursor: null, loading: false };
  return state.byGroup[groupId];
};

const messageSlice = createSlice({
  name: 'messages',
  initialState: { byGroup: {} },
  reducers: {
    messageReceived: (state, action) => {
      const { groupId } = action.payload;
      const bucket = ensure(state, groupId);
      if (!bucket.items.find((m) => m.id === action.payload.id)) {
        bucket.items.push(action.payload);
      }
    },
    reactionUpdated: (state, action) => {
      const { groupId, messageId, reactions } = action.payload;
      const bucket = state.byGroup[groupId];
      if (!bucket) return;
      const msg = bucket.items.find((m) => m.id === messageId);
      if (msg) msg.reactions = reactions;
    },
    messageDeleted: (state, action) => {
      const { groupId, id } = action.payload;
      const bucket = state.byGroup[groupId];
      if (!bucket) return;
      bucket.items = bucket.items.filter((m) => m.id !== id);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state, action) => {
        ensure(state, action.meta.arg.groupId).loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const bucket = ensure(state, action.payload.groupId);
        bucket.loading = false;
        bucket.items = action.payload.messages;
        bucket.nextCursor = action.payload.nextCursor;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const bucket = ensure(state, action.payload.groupId);
        if (!bucket.items.find((m) => m.id === action.payload.message.id)) {
          bucket.items.push(action.payload.message);
        }
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const bucket = state.byGroup[action.payload.groupId];
        if (bucket) bucket.items = bucket.items.filter((m) => m.id !== action.payload.messageId);
      });
  },
});

export const { messageReceived, reactionUpdated, messageDeleted } = messageSlice.actions;
export default messageSlice.reducer;

export const selectMessages = (groupId) => (s) => s.messages.byGroup[groupId]?.items || [];
export const selectMessagesLoading = (groupId) => (s) =>
  s.messages.byGroup[groupId]?.loading || false;
