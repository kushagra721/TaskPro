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

// A second, fully separate portal — `?portal=adminkamdhenu` specifically (not
// any `?portal=` value, which is the existing Platform trigger below) — or
// its own `/kamdhenu` path, for the same reload-survival reason as above.
// Checked first so this exact value never also falls into isPlatformMode.
const isKamdhenuMode = portalParam === 'adminkamdhenu' || window.location.pathname.startsWith('/kamdhenu');

const isPlatformMode =
  !isKamdhenuMode && (window.location.hostname === PLATFORM_HOSTNAME || hasPortalParam || isPlatformPath);

if (isKamdhenuMode) {
  store.dispatch(bootstrapKamdhenu());
} else if (isPlatformMode) {
  store.dispatch(bootstrapPlatform());
} else {
  // Hydrate auth from a stored token before first render resolves.
  store.dispatch(bootstrap());
}

ReactDOM.createRoot(document.getElementById('root')).render(

    <Provider store={store}>
      <BrowserRouter>
        {isKamdhenuMode ? <KamdhenuApp /> : isPlatformMode ? <PlatformApp /> : <App />}
      </BrowserRouter>
    </Provider>

);
