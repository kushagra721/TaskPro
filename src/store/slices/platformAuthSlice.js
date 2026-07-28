import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { platformApi, platformTokenStore } from '../../api/client.js';

export const loginPlatformWithPassword = createAsyncThunk(
  'platformAuth/loginWithPassword',
  async ({ email, password }) => {
    const res = await platformApi.loginWithPassword(email, password);
    platformTokenStore.set(res.token);
    return res;
  }
);

export const requestPlatformOtp = createAsyncThunk('platformAuth/requestOtp', async (email) => {
  return platformApi.requestOtp(email);
});

export const verifyPlatformOtp = createAsyncThunk('platformAuth/verifyOtp', async ({ email, code }) => {
  const res = await platformApi.verifyOtp(email, code);
  platformTokenStore.set(res.token);
  return res;
});

const platformAuthSlice = createSlice({
  name: 'platformAuth',
  initialState: { platformUser: null, loading: false, error: '' },
  reducers: {
    platformLogout: (state) => {
      platformTokenStore.clear();
      state.platformUser = null;
    },
    platformHydrated: (state, action) => {
      state.platformUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyPlatformOtp.fulfilled, (state, action) => {
        state.platformUser = action.payload.platformUser;
      })
      .addCase(loginPlatformWithPassword.fulfilled, (state, action) => {
        state.platformUser = action.payload.platformUser;
      });
  },
});

export const { platformLogout, platformHydrated } = platformAuthSlice.actions;
export default platformAuthSlice.reducer;

export const selectPlatformUser = (s) => s.platformAuth.platformUser;

const decodeJwtPayload = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

/** Rehydrates the platform session from the stored JWT on page load — the
 *  token already carries everything needed (role/resellerId/name/email), so
 *  no network round trip is needed, unlike the normal app's `bootstrap()`. */
export const bootstrapPlatform = () => (dispatch) => {
  const token = platformTokenStore.get();
  if (!token) return;
  const decoded = decodeJwtPayload(token);
  if (!decoded || decoded.ptype !== 'platform') {
    platformTokenStore.clear();
    return;
  }
  dispatch(
    platformHydrated({
      id: decoded.sub,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      resellerId: decoded.resellerId,
    })
  );
};
