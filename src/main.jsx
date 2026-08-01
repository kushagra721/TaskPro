import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store.js';
import { bootstrap } from './store/slices/authSlice.js';
import { bootstrapPlatform } from './store/slices/platformAuthSlice.js';
import { bootstrapKamdhenu } from './store/slices/kamdhenuAuthSlice.js';
import App from './App.jsx';
import PlatformApp from './platform/PlatformApp.jsx';
import KamdhenuApp from './kamdhenu/KamdhenuApp.jsx';
import './styles/global.css';

// Platform (Super Admin / Reseller) mode: the platform's own dedicated
// hostname, OR a `?portal=` query param — on ANY hostname, by explicit
// request (not locked to localhost/the dedicated hostname), so the portal is
// reachable from wherever the app happens to be deployed/tested without
// needing that specific domain wired up yet. This is still an early, hard
// branch: on every other request (no `?portal=` param) the existing <App/>
// renders completely untouched, so none of the platform code can affect
// normal client functionality.
const PLATFORM_HOSTNAME = 'supertasks.dialerp.com';
const portalParam = new URLSearchParams(window.location.search).get('portal');
const hasPortalParam = portalParam !== null;
// The path check is what makes a **reload survive**. `?portal=` is only ever
// present on the first URL someone types; the moment they sign in and the
// router pushes `/platform/admin/...`, the query string is gone — so on reload
// this file used to fall through to the normal <App/>, which looked exactly
// like being logged out. Every platform route lives under `/platform`, so the
// pathname is the reliable signal.
const isPlatformPath = window.location.pathname.startsWith('/platform');

// Kamdhenu Aviation public landing page — a static marketing page, no auth,
// no Redux. Shown at the dedicated production hostname's ROOT, or at the
// EXACT `/kamdhenu` path locally. Exact-match on the path is deliberate:
// deeper `/kamdhenu/...` paths (login, dashboard, job-works…) belong to the
// Kamdhenu ERP portal below and must keep working unchanged. A `?portal=`
// param always wins over the landing so portal entry links keep working.
const AVIATION_HOSTNAME = 'kamdhenupro.erpthemes.com';
const pathname = window.location.pathname;
const isAviationLanding =
  !hasPortalParam &&
  ((window.location.hostname === AVIATION_HOSTNAME && pathname === '/') ||
    pathname === '/kamdhenu' ||
    pathname === '/kamdhenu/');

// A second, fully separate portal — `?portal=adminkamdhenu` specifically (not
// any `?portal=` value, which is the existing Platform trigger below) — or
// its own `/kamdhenu` path, for the same reload-survival reason as above.
// Checked first so this exact value never also falls into isPlatformMode.
const isKamdhenuMode =
  !isAviationLanding && (portalParam === 'adminkamdhenu' || pathname.startsWith('/kamdhenu'));

const isPlatformMode =
  !isAviationLanding &&
  !isKamdhenuMode &&
  (window.location.hostname === PLATFORM_HOSTNAME || hasPortalParam || isPlatformPath);

if (isAviationLanding) {
  // Static page — no session to hydrate.
} else if (isKamdhenuMode) {
  store.dispatch(bootstrapKamdhenu());
} else if (isPlatformMode) {
  store.dispatch(bootstrapPlatform());
} else {
  // Hydrate auth from a stored token before first render resolves.
  store.dispatch(bootstrap());
}

// Lazy-loaded so the landing page's code (and MUI) is never fetched for the
// normal Task Pro app, and vice versa.
const KamdhenuAviationLanding = React.lazy(() => import('./kamdhenuAviation/KamdhenuAviationLanding.jsx'));

ReactDOM.createRoot(document.getElementById('root')).render(

    <Provider store={store}>
      <BrowserRouter>
        {isAviationLanding ? (
          <React.Suspense fallback={null}>
            <KamdhenuAviationLanding />
          </React.Suspense>
        ) : isKamdhenuMode ? (
          <KamdhenuApp />
        ) : isPlatformMode ? (
          <PlatformApp />
        ) : (
          <App />
        )}
      </BrowserRouter>
    </Provider>

);
