import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clientsApi } from '../../api/client.js';

/** Paginated + filtered list for the Manage Clients page. */
export const fetchClients = createAsyncThunk('clients/fetch', async ({ orgId, params }) => {
  const res = await clientsApi.list(orgId, params);
  return { clients: res.clients, pagination: res.pagination };
});

/** Every client, for the task-form dropdowns. */
export const fetchAllClients = createAsyncThunk('clients/fetchAll', async (orgId) => {
  const res = await clientsApi.listAll(orgId);
  return res.clients;
});

/** Single client, for the Client Detail page. */
export const fetchClient = createAsyncThunk('clients/fetchOne', async ({ orgId, clientId }) => {
  const res = await clientsApi.get(orgId, clientId);
  return res.client;
});

export const createClient = createAsyncThunk('clients/create', async ({ orgId, ...payload }) => {
  const res = await clientsApi.create(orgId, payload);
  return res.client;
});

export const updateClient = createAsyncThunk('clients/update', async ({ orgId, clientId, ...payload }) => {
  const res = await clientsApi.update(orgId, clientId, payload);
  return res.client;
});

export const deleteClient = createAsyncThunk('clients/delete', async ({ orgId, clientId, confirmName }) => {
  await clientsApi.remove(orgId, clientId, confirmName);
  return clientId;
});

const clientSlice = createSlice({
  name: 'clients',
  initialState: {
    items: [],
    all: [],
    detail: null,
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    loading: false,
  },
  reducers: {
    // Another member created/renamed/removed a client (socket event).
    clientChanged: (state, action) => {
      const c = action.payload;
      if (c.deleted) {
        state.all = state.all.filter((x) => x.id !== c.id);
        return;
      }
      const i = state.all.findIndex((x) => x.id === c.id);
      if (i >= 0) state.all[i] = c;
      else state.all.push(c);
    },
    /**
     * Seed the detail from a page-bundle response.
     *
     * The client-space page fetches its client as part of one combined request
     * rather than through `fetchClient`, but the edit and delete modals still
     * read `selectClientDetail` — so the bundle hands the client here instead
     * of the page keeping a second, divergent copy in local state.
     */
    clientLoaded: (state, action) => {
      state.detail = action.payload;
    },
    resetClients: (state) => {
      state.items = [];
      state.all = [];
      state.pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
    },
  },
  extraReducers: (builder) => {
    builder
      // Clients belong to one org, so a switch must not leave stale ones in
      // the task-form dropdown.
      .addCase('orgs/setCurrentOrg', (state) => {
        state.items = [];
        state.all = [];
        state.pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
      })
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.clients;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchClients.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchAllClients.fulfilled, (state, action) => {
        state.all = action.payload;
      })
      .addCase(fetchClient.pending, (state) => {
        state.detail = null;
      })
      .addCase(fetchClient.fulfilled, (state, action) => {
        state.detail = action.payload;
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.all.push(action.payload);
        state.pagination.total += 1;
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        const apply = (list) => {
          const i = list.findIndex((c) => c.id === action.payload.id);
          if (i >= 0) list[i] = action.payload;
        };
        apply(state.items);
        apply(state.all);
        if (state.detail?.id === action.payload.id) state.detail = action.payload;
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload);
        state.all = state.all.filter((c) => c.id !== action.payload);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
      });
  },
});

export const { clientChanged, clientLoaded, resetClients } = clientSlice.actions;
export default clientSlice.reducer;

export const selectClients = (s) => s.clients.items;
export const selectAllClients = (s) => s.clients.all;
export const selectClientDetail = (s) => s.clients.detail;
export const selectClientsPagination = (s) => s.clients.pagination;
export const selectClientsLoading = (s) => s.clients.loading;
