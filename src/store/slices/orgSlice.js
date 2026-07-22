import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { organizationsApi } from '../../api/client.js';

const CURRENT_ORG_KEY = 'taskpro_current_org';

export const fetchMyOrgs = createAsyncThunk('orgs/fetchMine', async () => {
  const res = await organizationsApi.list();
  return res.organizations;
});

export const createOrg = createAsyncThunk('orgs/create', async (name) => {
  const res = await organizationsApi.create({ name });
  return res.organization;
});

export const fetchDashboard = createAsyncThunk('orgs/fetchDashboard', async ({ orgId, params }) => {
  const res = await organizationsApi.dashboard(orgId, params);
  return res; // { stats, recentActivity, ... }
});

// Accepts either an orgId string or { orgId, params } (params = date period).
export const fetchMembers = createAsyncThunk('orgs/fetchMembers', async (arg) => {
  const { orgId, params } = typeof arg === 'string' ? { orgId: arg } : arg;
  const res = await organizationsApi.members(orgId, params);
  return res.members;
});

/** Admin-only, permanent — cascades to everything in the org. */
export const deleteOrg = createAsyncThunk('orgs/delete', async ({ orgId, confirmName }) => {
  await organizationsApi.remove(orgId, confirmName);
  return orgId;
});

/** Any member (including an admin) may leave; the backend reassigns admin/deletes the org as needed. */
export const leaveOrg = createAsyncThunk('orgs/leave', async ({ orgId, confirmName }) => {
  await organizationsApi.leave(orgId, confirmName);
  return orgId;
});

const orgSlice = createSlice({
  name: 'orgs',
  initialState: {
    list: [],
    currentId: localStorage.getItem(CURRENT_ORG_KEY) || null,
    members: [],
    dashboard: null,
    loading: false,
  },
  reducers: {
    setCurrentOrg: (state, action) => {
      state.currentId = action.payload;
      state.dashboard = null;
      state.members = [];
      if (action.payload) localStorage.setItem(CURRENT_ORG_KEY, action.payload);
      else localStorage.removeItem(CURRENT_ORG_KEY);
    },
    activityReceived: (state, action) => {
      // Prepend a live activity to the dashboard feed for the current org.
      if (state.dashboard && action.payload?.organizationId === state.currentId) {
        state.dashboard.recentActivity = [
          {
            id: action.payload.id,
            type: action.payload.type,
            summary: action.payload.summary,
            actor: 'Someone',
            createdAt: action.payload.createdAt,
          },
          ...state.dashboard.recentActivity,
        ].slice(0, 15);
      }
    },
    // Logout only clears the in-session data — `currentId` (and its localStorage
    // mirror) is deliberately left alone so the same org is still selected on
    // the next login. `fetchMyOrgs.fulfilled` already falls back to the first
    // org if this id turns out invalid for whoever logs in next.
    resetOrgs: (state) => {
      state.list = [];
      state.members = [];
      state.dashboard = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOrgs.fulfilled, (state, action) => {
        state.list = action.payload;
        // Ensure currentId points to a valid org.
        const ids = action.payload.map((o) => o.id);
        if (!state.currentId || !ids.includes(state.currentId)) {
          state.currentId = action.payload[0]?.id || null;
          if (state.currentId) localStorage.setItem(CURRENT_ORG_KEY, state.currentId);
        }
      })
      .addCase(createOrg.fulfilled, (state, action) => {
        state.list.push(action.payload);
        state.currentId = action.payload.id;
        state.dashboard = null;
        state.members = [];
        localStorage.setItem(CURRENT_ORG_KEY, action.payload.id);
      })
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.members = action.payload;
      })
      .addMatcher(
        (action) => action.type === deleteOrg.fulfilled.type || action.type === leaveOrg.fulfilled.type,
        (state, action) => {
          const orgId = action.payload;
          state.list = state.list.filter((o) => o.id !== orgId);
          if (state.currentId === orgId) {
            state.currentId = state.list[0]?.id || null;
            state.dashboard = null;
            state.members = [];
            if (state.currentId) localStorage.setItem(CURRENT_ORG_KEY, state.currentId);
            else localStorage.removeItem(CURRENT_ORG_KEY);
          }
        }
      );
  },
});

export const { setCurrentOrg, activityReceived, resetOrgs } = orgSlice.actions;
export default orgSlice.reducer;

export const selectOrgs = (s) => s.orgs.list;
export const selectCurrentOrgId = (s) => s.orgs.currentId;
export const selectCurrentOrg = (s) => s.orgs.list.find((o) => o.id === s.orgs.currentId) || null;
export const selectDashboard = (s) => s.orgs.dashboard;
export const selectMembers = (s) => s.orgs.members;
