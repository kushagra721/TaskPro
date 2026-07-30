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

/** Reseller self-registration — no token yet, that comes from verifySignup. */
export const signupPlatformReseller = createAsyncThunk('platformAuth/signup', async (payload) => {
  return platformApi.signup(payload);
});

export const verifyPlatformSignup = createAsyncThunk('platformAuth/verifySignup', async ({ email, code }) => {
  const res = await platformApi.verifySignup(email, code);
  platformTokenStore.set(res.token);
  return res;
});

const platformAuthSlice = createSlice({
  name: 'platformAuth',
  initialState: { platformUser: null, loading: false, error: '', needsOnboarding: false },
  reducers: {
    platformLogout: (state) => {
      platformTokenStore.clear();
      state.platformUser = null;
      state.needsOnboarding = false;
    },
    /** Cleared once the onboarding step succeeds, so the guard stops firing. */
    platformOnboarded: (state) => {
      state.needsOnboarding = false;
    },
    platformHydrated: (state, action) => {
      state.platformUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyPlatformOtp.fulfilled, (state, action) => {
        state.platformUser = action.payload.platformUser;
        state.needsOnboarding = !!action.payload.needsOnboarding;
      })
      .addCase(verifyPlatformSignup.fulfilled, (state, action) => {
        state.platformUser = action.payload.platformUser;
        state.needsOnboarding = !!action.payload.needsOnboarding;
      })
      .addCase(loginPlatformWithPassword.fulfilled, (state, action) => {
        // A password login on an unverified account returns no token — it
        // bounces to the verify screen instead, so there's no session to set.
        if (action.payload.platformUser) {
          state.platformUser = action.payload.platformUser;
          state.needsOnboarding = !!action.payload.needsOnboarding;
        }
      });
  },
});

export const { platformLogout, platformHydrated, platformOnboarded } = platformAuthSlice.actions;
export default platformAuthSlice.reducer;

export const selectPlatformUser = (s) => s.platformAuth.platformUser;

/** True only within the sign-in that reported it — `bootstrapPlatform()` can't
 *  know it from the JWT alone (deliberately, so the claim can't go stale), so
 *  after a page reload this is false and the guard simply doesn't fire. It's a
 *  routing convenience, not a security boundary: the plan is still enforced
 *  server-side wherever it matters. */
export const selectNeedsOnboarding = (s) => s.platformAuth.needsOnboarding;

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
