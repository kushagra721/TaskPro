import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store.js';
import { bootstrap } from './store/slices/authSlice.js';
import { bootstrapPlatform } from './store/slices/platformAuthSlice.js';
import App from './App.jsx';
import PlatformApp from './platform/PlatformApp.jsx';
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
const hasPortalParam = new URLSearchParams(window.location.search).has('portal');
const isPlatformMode = window.location.hostname === PLATFORM_HOSTNAME || hasPortalParam;

if (isPlatformMode) {
  store.dispatch(bootstrapPlatform());
} else {
  // Hydrate auth from a stored token before first render resolves.
  store.dispatch(bootstrap());
}

ReactDOM.createRoot(document.getElementById('root')).render(

    <Provider store={store}>
      <BrowserRouter>
        {isPlatformMode ? <PlatformApp /> : <App />}
      </BrowserRouter>
    </Provider>

);
