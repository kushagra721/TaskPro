import App from '../App.jsx';
import KamdhenuApp from '../kamdhenu/KamdhenuApp.jsx';
import { bootstrap } from '../store/slices/authSlice.js';
import { restoreKamdhenuSession } from '../store/slices/kamdhenuAuthSlice.js';

/**
 * Which product a company code opens.
 *
 * This repository ships more than one product against one backend, and on
 * **mobile** the company code is the only signal available to choose between
 * them (the web app uses the hostname/portal split in `main.jsx` instead, which
 * is untouched). Rather than scattering `if (code === 'KAMDHENUPRO')` through
 * the shell, every difference between the products is captured here as data:
 * which route tree to mount, where its login and dashboard live, and how to
 * restore a session.
 *
 * **Adding a product** is one entry in `PROJECTS` plus one line in
 * `COMPANY_CODE_PROJECTS`. Nothing else in the native flow needs to change.
 *
 * `restoreSession(dispatch)` must resolve when a session is valid, and reject
 * with the string `'no-token'` (nobody has signed in on this device yet) or
 * `'invalid-token'` (there was a session and the server rejected it). The
 * shell treats those two differently — see `native/NativeApp.jsx`.
 */
export const PROJECTS = {
  taskpro: {
    key: 'taskpro',
    label: 'Task Pro',
    App,
    loginPath: '/login',
    dashboardPath: '/dashboard',
    restoreSession: (dispatch) => dispatch(bootstrap()).unwrap(),
  },
  kamdhenu: {
    key: 'kamdhenu',
    label: 'Kamdhenu Aviation',
    App: KamdhenuApp,
    loginPath: '/kamdhenu/login',
    dashboardPath: '/kamdhenu/dashboard',
    restoreSession: (dispatch) => dispatch(restoreKamdhenuSession()).unwrap(),
  },
};

/** Company code (normalised: uppercase, alphanumeric) → project key. Anything
 *  not listed falls through to Task Pro, which is the default product. */
export const COMPANY_CODE_PROJECTS = {
  KAMDHENUPRO: 'kamdhenu',
};

export const DEFAULT_PROJECT_KEY = 'taskpro';

/** Normalised the same way the code itself is everywhere else, so a stored
 *  lowercase/spaced value still maps correctly. */
const normalise = (code) => String(code ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

export const resolveProject = (companyCode) =>
  PROJECTS[COMPANY_CODE_PROJECTS[normalise(companyCode)] || DEFAULT_PROJECT_KEY];
