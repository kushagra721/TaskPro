import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { projectsApi } from '../../api/client.js';

/** Paginated + filtered list for the Manage Projects page. */
export const fetchProjects = createAsyncThunk('projects/fetch', async ({ orgId, params }) => {
  const res = await projectsApi.list(orgId, params);
  return { projects: res.projects, pagination: res.pagination };
});

/** Every project, for the task-form dropdowns. */
export const fetchAllProjects = createAsyncThunk('projects/fetchAll', async (orgId) => {
  const res = await projectsApi.listAll(orgId);
  return res.projects;
});

/** Single project, for the Project Detail page. */
export const fetchProject = createAsyncThunk('projects/fetchOne', async ({ orgId, projectId }) => {
  const res = await projectsApi.get(orgId, projectId);
  return res.project;
});

export const createProject = createAsyncThunk('projects/create', async ({ orgId, ...payload }) => {
  const res = await projectsApi.create(orgId, payload);
  return res.project;
});

export const updateProject = createAsyncThunk('projects/update', async ({ orgId, projectId, ...payload }) => {
  const res = await projectsApi.update(orgId, projectId, payload);
  return res.project;
});

export const deleteProject = createAsyncThunk('projects/delete', async ({ orgId, projectId }) => {
  await projectsApi.remove(orgId, projectId);
  return projectId;
});

const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    items: [],
    all: [],
    detail: null,
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    loading: false,
  },
  reducers: {
    // Another member created/renamed/removed a project (socket event).
    projectChanged: (state, action) => {
      const p = action.payload;
      if (p.deleted) {
        state.all = state.all.filter((x) => x.id !== p.id);
        return;
      }
      const i = state.all.findIndex((x) => x.id === p.id);
      if (i >= 0) state.all[i] = p;
      else state.all.push(p);
    },
    resetProjects: (state) => {
      state.items = [];
      state.all = [];
      state.pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
    },
  },
  extraReducers: (builder) => {
    builder
      // Projects belong to one org, so a switch must not leave stale ones in
      // the task-form dropdown.
      .addCase('orgs/setCurrentOrg', (state) => {
        state.items = [];
        state.all = [];
        state.pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
      })
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.projects;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProjects.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchAllProjects.fulfilled, (state, action) => {
        state.all = action.payload;
      })
      .addCase(fetchProject.pending, (state) => {
        state.detail = null;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.detail = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.all.push(action.payload);
        state.pagination.total += 1;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const apply = (list) => {
          const i = list.findIndex((p) => p.id === action.payload.id);
          if (i >= 0) list[i] = action.payload;
        };
        apply(state.items);
        apply(state.all);
        if (state.detail?.id === action.payload.id) state.detail = action.payload;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload);
        state.all = state.all.filter((p) => p.id !== action.payload);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
      });
  },
});

export const { projectChanged, resetProjects } = projectSlice.actions;
export default projectSlice.reducer;

export const selectProjects = (s) => s.projects.items;
export const selectAllProjects = (s) => s.projects.all;
export const selectProjectDetail = (s) => s.projects.detail;
export const selectProjectsPagination = (s) => s.projects.pagination;
export const selectProjectsLoading = (s) => s.projects.loading;
