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

const decodeJwtPayload = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

/** The ERP token carries the role + single-site assignment so the shell can
 *  role-filter nav/routes without a network round-trip on load. */
const adminFromToken = (decoded) => ({
  id: decoded.sub,
  name: decoded.name,
  email: decoded.email,
  role: decoded.role || 'ADMIN',
  siteId: decoded.siteId || null,
});

/**
 * Session restore for the **mobile shell** (`native/NativeApp.jsx`), which has
 * to decide between the dashboard and the login screen before it renders
 * anything — so unlike `bootstrapKamdhenu` (fire-and-forget, used by the web
 * portal) this reports its outcome and actually verifies the token.
 *
 * Three checks, cheapest first: is there a token at all, is it a well-formed
 * unexpired Kamdhenu token, and does the server still accept it. The last one
 * is the only authoritative answer — a token can be perfectly valid-looking and
 * belong to a deleted or suspended account.
 *
 * Rejects with `'no-token'` (never signed in) or `'invalid-token'` (expired or
 * refused); the shell routes those two outcomes differently.
 *
 * Declared above the slice because `extraReducers` references it at slice
 * creation time.
 */
export const restoreKamdhenuSession = createAsyncThunk(
  'kamdhenuAuth/restoreSession',
  async (_, { rejectWithValue }) => {
    const token = kamdhenuTokenStore.get();
    if (!token) return rejectWithValue('no-token');

    const decoded = decodeJwtPayload(token);
    const expired = decoded?.exp ? decoded.exp * 1000 <= Date.now() : false;
    if (!decoded || decoded.ptype !== 'kamdhenu' || expired) {
      kamdhenuTokenStore.clear();
      return rejectWithValue('invalid-token');
    }

    try {
      const res = await kamdhenuApi.me();
      // Prefer the server's copy — role/site can have changed since the token
      // was minted, and the token is not re-issued on such a change.
      return { ...adminFromToken(decoded), ...(res.kamdhenuAdmin || {}) };
    } catch {
      kamdhenuTokenStore.clear();
      return rejectWithValue('invalid-token');
    }
  }
);

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
      })
      // Unlike the two login cases, this one's payload IS the admin — it's
      // assembled from the token plus /auth/me, not a login response envelope.
      .addCase(restoreKamdhenuSession.fulfilled, (state, action) => {
        state.kamdhenuAdmin = action.payload;
      })
      .addCase(restoreKamdhenuSession.rejected, (state) => {
        state.kamdhenuAdmin = null;
      });
  },
});

export const { kamdhenuLogout, kamdhenuHydrated } = kamdhenuAuthSlice.actions;
export default kamdhenuAuthSlice.reducer;

export const selectKamdhenuAdmin = (s) => s.kamdhenuAuth.kamdhenuAdmin;
// 'ADMIN' | 'SUPERVISOR' | 'MEMBER' (null when signed out).
export const selectKamdhenuRole = (s) => s.kamdhenuAuth.kamdhenuAdmin?.role || null;

/** Rehydrates the Kamdhenu session from the stored JWT on page load — mirrors
 *  `bootstrapPlatform()`. Web portal only; the mobile shell uses
 *  `restoreKamdhenuSession` above, which verifies rather than assumes. */
export const bootstrapKamdhenu = () => (dispatch) => {
  const token = kamdhenuTokenStore.get();
  if (!token) return;
  const decoded = decodeJwtPayload(token);
  if (!decoded || decoded.ptype !== 'kamdhenu') {
    kamdhenuTokenStore.clear();
    return;
  }
  dispatch(kamdhenuHydrated(adminFromToken(decoded)));
};
