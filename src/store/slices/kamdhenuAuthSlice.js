import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { kamdhenuApi, kamdhenuTokenStore } from '../../api/client.js';

export const loginKamdhenuWithPassword = createAsyncThunk(
  'kamdhenuAuth/loginWithPassword',
  async ({ email, password }) => {
    const res = await kamdhenuApi.loginWithPassword(email, password);
    kamdhenuTokenStore.set(res.token);
    return res;
  }
);

export const requestKamdhenuOtp = createAsyncThunk('kamdhenuAuth/requestOtp', async (email) => {
  return kamdhenuApi.requestOtp(email);
});

export const verifyKamdhenuOtp = createAsyncThunk('kamdhenuAuth/verifyOtp', async ({ email, code }) => {
  const res = await kamdhenuApi.verifyOtp(email, code);
  kamdhenuTokenStore.set(res.token);
  return res;
});

const kamdhenuAuthSlice = createSlice({
  name: 'kamdhenuAuth',
  initialState: { kamdhenuAdmin: null, loading: false, error: '' },
  reducers: {
    kamdhenuLogout: (state) => {
      kamdhenuTokenStore.clear();
      state.kamdhenuAdmin = null;
    },
    kamdhenuHydrated: (state, action) => {
      state.kamdhenuAdmin = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyKamdhenuOtp.fulfilled, (state, action) => {
        state.kamdhenuAdmin = action.payload.kamdhenuAdmin;
      })
      .addCase(loginKamdhenuWithPassword.fulfilled, (state, action) => {
        state.kamdhenuAdmin = action.payload.kamdhenuAdmin;
      });
  },
});

export const { kamdhenuLogout, kamdhenuHydrated } = kamdhenuAuthSlice.actions;
export default kamdhenuAuthSlice.reducer;

export const selectKamdhenuAdmin = (s) => s.kamdhenuAuth.kamdhenuAdmin;
// 'ADMIN' | 'SUPERVISOR' | 'MEMBER' (null when signed out).
export const selectKamdhenuRole = (s) => s.kamdhenuAuth.kamdhenuAdmin?.role || null;

const decodeJwtPayload = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

/** Rehydrates the Kamdhenu session from the stored JWT on page load — mirrors
 *  `bootstrapPlatform()`. */
export const bootstrapKamdhenu = () => (dispatch) => {
  const token = kamdhenuTokenStore.get();
  if (!token) return;
  const decoded = decodeJwtPayload(token);
  if (!decoded || decoded.ptype !== 'kamdhenu') {
    kamdhenuTokenStore.clear();
    return;
  }
  dispatch(
    kamdhenuHydrated({
      id: decoded.sub,
      name: decoded.name,
      email: decoded.email,
      // The ERP token carries the role + single-site assignment so the shell
      // can role-filter nav/routes without a network round-trip on load.
      role: decoded.role || 'ADMIN',
      siteId: decoded.siteId || null,
    })
  );
};
