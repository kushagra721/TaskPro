import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { invitationsApi } from '../../api/client.js';

export const fetchMyInvitations = createAsyncThunk('invitations/fetchMine', async () => {
  const res = await invitationsApi.mine();
  return res.invitations;
});

export const acceptInvitation = createAsyncThunk('invitations/accept', async (id) => {
  const res = await invitationsApi.accept(id);
  return { id, organization: res.organization };
});

export const declineInvitation = createAsyncThunk('invitations/decline', async (id) => {
  await invitationsApi.decline(id);
  return { id };
});

const invitationSlice = createSlice({
  name: 'invitations',
  initialState: { mine: [], loading: false, loaded: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyInvitations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyInvitations.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.mine = action.payload;
      })
      .addCase(fetchMyInvitations.rejected, (state) => {
        state.loading = false;
        state.loaded = true;
      })
      .addCase(acceptInvitation.fulfilled, (state, action) => {
        state.mine = state.mine.filter((i) => i.id !== action.payload.id);
      })
      .addCase(declineInvitation.fulfilled, (state, action) => {
        state.mine = state.mine.filter((i) => i.id !== action.payload.id);
      });
  },
});

export default invitationSlice.reducer;

export const selectInvitations = (s) => s.invitations.mine;
export const selectInvitationCount = (s) => s.invitations.mine.length;
export const selectInvitationsLoaded = (s) => s.invitations.loaded;
