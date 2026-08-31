/*
 * PLATFORM PREVIEW — open the iOS or Android build in a desktop browser.
 *
 *     http://localhost:5173/?platform=ios       ← the iOS app
 *     http://localhost:5173/?platform=android   ← the Android app
 *     http://localhost:5173/?platform=off       ← back to the normal web app
 *
 * The choice sticks for the browser TAB (sessionStorage), so navigating around
 * the app keeps it; closing the tab ends it.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A PLAIN SCRIPT IN `public/` AND NOT A MODULE
 *
 * `api/client.js` resolves the API base at MODULE SCOPE, and ES modules
 * evaluate their whole import graph before the importing module's body runs —
 * so anything called from `main.jsx` would already be too late to influence it.
 * A classic <script> in <head> runs before any module is even fetched, which is
 * the only point where this can be set reliably.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ WHY `CapacitorCustomPlatform` AND NOT JUST A `window.Capacitor` SHIM
 *
 * A hand-written `window.Capacitor` does NOT survive: `@capacitor/core` loads
 * later (via `native/androidShell.js`'s dynamic import) and its
 * `createCapacitor()` overwrites `getPlatform`/`isNativePlatform` with its own,
 * which sniff for the real native bridge and answer 'web' again. A shim
 * therefore tests a race, not the product — an earlier attempt at this failed
 * for exactly that reason.
 *
 * `CapacitorCustomPlatform` is Capacitor's OWN override, the same hook the
 * Electron platform uses. `createCapacitor()` reads it first:
 *
 *     getPlatform = () => capCustomPlatform !== null
 *       ? capCustomPlatform.name        <-- ours wins, permanently
 *       : getPlatformId(win);
 *
 * So the platform stays whatever we set even after core loads. Both are set
 * below: `CapacitorCustomPlatform` for after, the shim for before.
 */
(function () {
  var KEY = 'taskpro_preview_platform';
  var VALID = { ios: 1, android: 1 };

  // NEVER override a real device. If the native bridge is present this is an
  // actual app, and pretending otherwise could only cause harm.
  var realBridge =
    !!window.androidBridge ||
    !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bridge);
  if (realBridge) return;

  var requested = null;
  try {
    requested = new URLSearchParams(window.location.search).get('platform');
  } catch (e) {
    /* no URLSearchParams (very old browser) — preview simply stays off */
  }

  var platform = null;
  try {
    if (requested === 'off' || requested === 'web') {
      sessionStorage.removeItem(KEY);
    } else if (requested && VALID[requested]) {
      sessionStorage.setItem(KEY, requested);
      platform = requested;
    } else {
      platform = sessionStorage.getItem(KEY);
    }
    if (platform && !VALID[platform]) platform = null;
  } catch (e) {
    // Private mode: fall back to the URL alone, so a single page still previews.
    platform = requested && VALID[requested] ? requested : null;
  }

  if (!platform) return;

  // Capacitor's own override — survives @capacitor/core loading (see above).
  window.CapacitorCustomPlatform = { name: platform, plugins: {} };

  // And the pre-core shim, for the window between now and core loading —
  // `utils/native.js#isNativeApp()` is read during that window by `main.jsx`.
  window.Capacitor = {
    getPlatform: function () {
      return platform;
    },
    isNativePlatform: function () {
      return true;
    },
    isNative: true,
    Plugins: {},
  };

  /*
   * The API base must stay the WEB one.
   *
   * `resolveApiUrl` rewrites a localhost API to `10.0.2.2` for native builds —
   * the Android emulator's alias for the host machine, which a desktop browser
   * cannot reach. Left alone, every request in the preview would fail and the
   * app would look broken for a reason that has nothing to do with the code
   * being previewed. `client.js` checks this flag.
   */
  window.__TASKPRO_PREVIEW_PLATFORM__ = platform;

  // Say so, loudly and permanently. A preview that looks identical to the real
  // thing is a trap: this is the browser, with none of the native plugins.
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('div');
    bar.textContent =
      'PREVIEW: ' + platform.toUpperCase() + ' build — browser simulation, no native plugins. ?platform=off to exit';
    bar.setAttribute('data-preview-banner', platform);
    bar.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:2147483647',
      'background:#7c3aed', 'color:#fff', 'font:600 11px/1.6 system-ui,sans-serif',
      'text-align:center', 'padding:3px 8px', 'letter-spacing:.02em',
      'pointer-events:none', 'opacity:.92',
    ].join(';');
    document.body.appendChild(bar);
  });
})();
