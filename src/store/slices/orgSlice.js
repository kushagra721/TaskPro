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
    resetOrgs: (state) => {
      state.list = [];
      state.currentId = null;
      state.members = [];
      state.dashboard = null;
      localStorage.removeItem(CURRENT_ORG_KEY);
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
      });
  },
});

export const { setCurrentOrg, activityReceived, resetOrgs } = orgSlice.actions;
export default orgSlice.reducer;

export const selectOrgs = (s) => s.orgs.list;
export const selectCurrentOrgId = (s) => s.orgs.currentId;
export const selectCurrentOrg = (s) => s.orgs.list.find((o) => o.id === s.orgs.currentId) || null;
export const selectDashboard = (s) => s.orgs.dashboard;
export const selectMembers = (s) => s.orgs.members;
