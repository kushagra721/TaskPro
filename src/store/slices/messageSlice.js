import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { groupsApi } from '../../api/client.js';

export const fetchMessages = createAsyncThunk('messages/fetch', async ({ groupId, cursor }) => {
  const res = await groupsApi.messages(groupId, cursor);
  return { groupId, messages: res.messages, nextCursor: res.nextCursor };
});

export const sendMessage = createAsyncThunk(
  'messages/send',
  async ({ groupId, content, attachments, clientId }) => {
    const res = await groupsApi.sendMessage(groupId, content, attachments);
    return { groupId, message: res.message, clientId };
  }
);

export const deleteMessage = createAsyncThunk('messages/delete', async ({ groupId, messageId }) => {
  await groupsApi.deleteMessage(groupId, messageId);
  return { groupId, messageId };
});

const ensure = (state, groupId) => {
  if (!state.byGroup[groupId]) {
    state.byGroup[groupId] = { items: [], pending: [], nextCursor: null, loading: false };
  }
  return state.byGroup[groupId];
};

const messageSlice = createSlice({
  name: 'messages',
  initialState: { byGroup: {}, typing: {} },
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
    // Optimistic single-grey-tick entry shown the instant Send is pressed,
    // before the server has confirmed the write — reconciled by clientId in
    // sendMessage.fulfilled/rejected below.
    messagePending: (state, action) => {
      const { groupId } = action.payload;
      ensure(state, groupId).pending.push(action.payload);
    },
    // From the 'typing:update' socket event. Keyed by userId so a stale
    // "stop" from an out-of-order event can't clobber a newer "start".
    typingReceived: (state, action) => {
      const { groupId, userId, name, typing } = action.payload;
      if (!state.typing[groupId]) state.typing[groupId] = {};
      if (typing) state.typing[groupId][userId] = name;
      else delete state.typing[groupId][userId];
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
        bucket.pending = bucket.pending.filter((p) => p.clientId !== action.payload.clientId);
        if (!bucket.items.find((m) => m.id === action.payload.message.id)) {
          bucket.items.push(action.payload.message);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        const bucket = state.byGroup[action.meta.arg.groupId];
        if (bucket) bucket.pending = bucket.pending.filter((p) => p.clientId !== action.meta.arg.clientId);
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const bucket = state.byGroup[action.payload.groupId];
        if (bucket) bucket.items = bucket.items.filter((m) => m.id !== action.payload.messageId);
      });
  },
});

export const { messageReceived, reactionUpdated, messageDeleted, messagePending, typingReceived } =
  messageSlice.actions;
export default messageSlice.reducer;

export const selectMessages = (groupId) => (s) => s.messages.byGroup[groupId]?.items || [];
export const selectPendingMessages = (groupId) => (s) => s.messages.byGroup[groupId]?.pending || [];
export const selectMessagesLoading = (groupId) => (s) =>
  s.messages.byGroup[groupId]?.loading || false;
export const selectTypingNames = (groupId) => (s) => Object.values(s.messages.typing[groupId] || {});
// Raw {userId: name} map — used where the typing user's identity (to look up
// their avatar in the group's member list) is needed, not just their name.
export const selectTyping = (groupId) => (s) => s.messages.typing[groupId] || {};
export const selectAllTyping = (s) => s.messages.typing;
