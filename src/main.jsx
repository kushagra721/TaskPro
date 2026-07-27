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
// hostname, OR — localhost only — a `?portal=` query param for local testing
// (see CLAUDE.md's Platform section). This is an early, hard branch: on any
// other host the existing <App/> renders completely untouched, so none of
// the platform code can affect normal client functionality.
const PLATFORM_HOSTNAME = 'supertasks.dialerp.com';
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const hasDevPortalParam = new URLSearchParams(window.location.search).has('portal');
const isPlatformMode =
  window.location.hostname === PLATFORM_HOSTNAME || (isLocalhost && hasDevPortalParam);

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
