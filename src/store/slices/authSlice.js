import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { usersApi, tokenStore } from '../../api/client.js';

/** On app load, if a token exists, hydrate the user from /users/me. */
export const bootstrap = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  const token = tokenStore.get();
  if (!token) return rejectWithValue('no-token');
  try {
    const res = await usersApi.me();
    return { user: res.user, token };
  } catch {
    tokenStore.clear();
    return rejectWithValue('invalid-token');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: tokenStore.get() || null,
    loading: true, // true until bootstrap resolves
  },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      tokenStore.set(action.payload.token);
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      tokenStore.clear();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrap.pending, (state) => {
        state.loading = true;
      })
      .addCase(bootstrap.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(bootstrap.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
      });
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectAuth = (s) => s.auth;
export const selectUser = (s) => s.auth.user;
export const selectIsAuthenticated = (s) => Boolean(s.auth.user);
