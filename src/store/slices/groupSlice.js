import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { groupsApi } from '../../api/client.js';

// Accepts either an orgId string or { orgId, params } (params = date period).
export const fetchGroups = createAsyncThunk('groups/fetch', async (arg) => {
  const { orgId, params } = typeof arg === 'string' ? { orgId: arg } : arg;
  const res = await groupsApi.listForOrg(orgId, params);
  return res.groups;
});

export const createGroup = createAsyncThunk('groups/create', async ({ orgId, ...payload }) => {
  const res = await groupsApi.create(orgId, payload);
  return res.group;
});

export const fetchGroup = createAsyncThunk('groups/fetchOne', async (groupId) => {
  const res = await groupsApi.get(groupId);
  return res.group;
});

export const addGroupMember = createAsyncThunk('groups/addMember', async ({ groupId, userId }) => {
  const res = await groupsApi.addMember(groupId, userId);
  return { groupId, members: res.members };
});

export const removeGroupMember = createAsyncThunk('groups/removeMember', async ({ groupId, userId }) => {
  await groupsApi.removeMember(groupId, userId);
  return { groupId, userId };
});

const groupSlice = createSlice({
  name: 'groups',
  initialState: { list: [], detail: null, loading: false },
  reducers: {
    groupReceived: (state, action) => {
      if (!state.list.find((g) => g.id === action.payload.id)) {
        state.list.push(action.payload);
      }
    },
    clearGroups: (state) => {
      state.list = [];
      state.detail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchGroups.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        if (!state.list.find((g) => g.id === action.payload.id)) state.list.push(action.payload);
      })
      .addCase(fetchGroup.fulfilled, (state, action) => {
        state.detail = action.payload;
      })
      .addCase(addGroupMember.fulfilled, (state, action) => {
        if (state.detail && state.detail.id === action.payload.groupId) {
          state.detail.members = action.payload.members;
        }
      })
      .addCase(removeGroupMember.fulfilled, (state, action) => {
        if (state.detail && state.detail.id === action.payload.groupId) {
          state.detail.members = state.detail.members.filter((m) => m.id !== action.payload.userId);
        }
      });
  },
});

export const { groupReceived, clearGroups } = groupSlice.actions;
export default groupSlice.reducer;

export const selectGroups = (s) => s.groups.list;
export const selectGroupDetail = (s) => s.groups.detail;
