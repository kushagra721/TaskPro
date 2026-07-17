import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { joinRequestsApi } from '../../api/client.js';

export const fetchIncomingJoinRequests = createAsyncThunk('joinRequests/fetchIncoming', async () => {
  const res = await joinRequestsApi.incoming();
  return res.requests;
});

export const approveJoinRequest = createAsyncThunk('joinRequests/approve', async (id) => {
  await joinRequestsApi.approve(id);
  return { id };
});

export const declineJoinRequest = createAsyncThunk('joinRequests/decline', async (id) => {
  await joinRequestsApi.decline(id);
  return { id };
});

const joinRequestSlice = createSlice({
  name: 'joinRequests',
  initialState: { incoming: [] },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIncomingJoinRequests.fulfilled, (state, action) => {
        state.incoming = action.payload;
      })
      .addCase(approveJoinRequest.fulfilled, (state, action) => {
        state.incoming = state.incoming.filter((r) => r.id !== action.payload.id);
      })
      .addCase(declineJoinRequest.fulfilled, (state, action) => {
        state.incoming = state.incoming.filter((r) => r.id !== action.payload.id);
      });
  },
});

export default joinRequestSlice.reducer;

export const selectIncomingJoinRequests = (s) => s.joinRequests.incoming;
