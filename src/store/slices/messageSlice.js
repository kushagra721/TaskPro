import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { groupsApi } from '../../api/client.js';

export const fetchMessages = createAsyncThunk('messages/fetch', async ({ groupId, cursor }) => {
  const res = await groupsApi.messages(groupId, cursor);
  // `older` distinguishes the two very different calls that share this thunk:
  // opening a channel (replace) and scrolling up for history (prepend).
  return { groupId, messages: res.messages, nextCursor: res.nextCursor, older: !!cursor };
});

export const sendMessage = createAsyncThunk(
  'messages/send',
  async ({ groupId, content, attachments, clientId, replyToId }) => {
    const res = await groupsApi.sendMessage(groupId, content, attachments, replyToId);
    return { groupId, message: res.message, clientId };
  }
);

export const editMessage = createAsyncThunk(
  'messages/edit',
  async ({ groupId, messageId, content }) => {
    const res = await groupsApi.editMessage(groupId, messageId, content);
    return { groupId, message: res.message };
  }
);

/** "Delete for everyone" — hard delete, broadcast to the whole group. */
export const deleteMessage = createAsyncThunk('messages/delete', async ({ groupId, messageId }) => {
  await groupsApi.deleteMessage(groupId, messageId);
  return { groupId, messageId };
});

/** "Delete for me" — hidden for this user only; drops out of the local list
 *  the same way, but nobody else's view changes. */
export const hideMessage = createAsyncThunk('messages/hide', async ({ groupId, messageId }) => {
  await groupsApi.hideMessage(groupId, messageId);
  return { groupId, messageId };
});

const ensure = (state, groupId) => {
  if (!state.byGroup[groupId]) {
    state.byGroup[groupId] = {
      items: [],
      pending: [],
      nextCursor: null,
      loading: false,
      // Tracked apart from `loading` so the scroll handler can tell "opening
      // the channel" from "fetching older messages" — the first shows a full
      // panel spinner, the second a small one above the list.
      loadingOlder: false,
    };
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
    // From the 'message:updated' socket event (an edit). Replaces the row in
    // place so its position in the list — and therefore the scroll — doesn't move.
    messageUpdated: (state, action) => {
      const { groupId, id } = action.payload;
      const bucket = state.byGroup[groupId];
      if (!bucket) return;
      const i = bucket.items.findIndex((m) => m.id === id);
      if (i !== -1) bucket.items[i] = action.payload;
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
        const bucket = ensure(state, action.meta.arg.groupId);
        if (action.meta.arg.cursor) bucket.loadingOlder = true;
        else bucket.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const bucket = ensure(state, action.payload.groupId);
        bucket.loading = false;
        bucket.loadingOlder = false;
        if (action.payload.older) {
          // PREPEND. This used to replace `items` outright, which is why paging
          // back was never wired up — the first older page would have wiped the
          // conversation the user was reading. Dedupe by id: a message that
          // arrived over the socket while the request was in flight can also be
          // in the page that comes back.
          const have = new Set(bucket.items.map((m) => m.id));
          const older = action.payload.messages.filter((m) => !have.has(m.id));
          bucket.items = [...older, ...bucket.items];
        } else {
          bucket.items = action.payload.messages;
        }
        // Only the *oldest* page's cursor is meaningful — it is where the next
        // scroll-up continues from. A first-page fetch resets it.
        bucket.nextCursor = action.payload.nextCursor;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        const bucket = ensure(state, action.meta.arg.groupId);
        bucket.loading = false;
        bucket.loadingOlder = false;
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
      .addCase(editMessage.fulfilled, (state, action) => {
        const bucket = state.byGroup[action.payload.groupId];
        if (!bucket) return;
        const i = bucket.items.findIndex((m) => m.id === action.payload.message.id);
        if (i !== -1) bucket.items[i] = action.payload.message;
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const bucket = state.byGroup[action.payload.groupId];
        if (bucket) bucket.items = bucket.items.filter((m) => m.id !== action.payload.messageId);
      })
      .addCase(hideMessage.fulfilled, (state, action) => {
        const bucket = state.byGroup[action.payload.groupId];
        if (bucket) bucket.items = bucket.items.filter((m) => m.id !== action.payload.messageId);
      });
  },
});

export const {
  messageReceived,
  reactionUpdated,
  messageUpdated,
  messageDeleted,
  messagePending,
  typingReceived,
} = messageSlice.actions;
export default messageSlice.reducer;

export const selectMessages = (groupId) => (s) => s.messages.byGroup[groupId]?.items || [];
export const selectPendingMessages = (groupId) => (s) => s.messages.byGroup[groupId]?.pending || [];
export const selectMessagesLoading = (groupId) => (s) =>
  s.messages.byGroup[groupId]?.loading || false;
/** Cursor for the NEXT older page, or null when the start of the conversation
 *  has been reached — the scroll handler stops asking on null. */
export const selectNextCursor = (groupId) => (s) => s.messages.byGroup[groupId]?.nextCursor || null;

/** True only while a HISTORY page is in flight (distinct from `loading`, which
 *  covers opening the channel). */
export const selectLoadingOlder = (groupId) => (s) => !!s.messages.byGroup[groupId]?.loadingOlder;

export const selectTypingNames = (groupId) => (s) => Object.values(s.messages.typing[groupId] || {});
// Raw {userId: name} map — used where the typing user's identity (to look up
// their avatar in the group's member list) is needed, not just their name.
export const selectTyping = (groupId) => (s) => s.messages.typing[groupId] || {};
export const selectAllTyping = (s) => s.messages.typing;
