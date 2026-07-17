import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { groupsApi } from '../../api/client.js';

export const fetchMessages = createAsyncThunk('messages/fetch', async ({ groupId, cursor }) => {
  const res = await groupsApi.messages(groupId, cursor);
  return { groupId, messages: res.messages, nextCursor: res.nextCursor };
});

export const sendMessage = createAsyncThunk('messages/send', async ({ groupId, content }) => {
  const res = await groupsApi.sendMessage(groupId, content);
  return { groupId, message: res.message };
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
      });
  },
});

export const { messageReceived, reactionUpdated } = messageSlice.actions;
export default messageSlice.reducer;

export const selectMessages = (groupId) => (s) => s.messages.byGroup[groupId]?.items || [];
export const selectMessagesLoading = (groupId) => (s) =>
  s.messages.byGroup[groupId]?.loading || false;
