/**
 * Native-only shell behaviour: status bar, hardware back button, text selection.
 *
 * All three of these are things a browser gives us for free and a WebView does
 * not. None of it is imported at module scope — `@capacitor/status-bar` and
 * `@capacitor/app` exist only in the native build, and a static import would
 * pull them into the web bundle and throw there. Every call is also wrapped:
 * chrome that fails to configure must never stop the app from starting.
 */
import { isNativeApp } from '../utils/native.js';

/** The app's own background (`--bg` in global.css). The status bar matches it. */
const STATUS_BAR_COLOR = '#F4F6FB';

/**
 * Make the status bar match the app instead of fighting it.
 *
 * Two separate faults produced the two symptoms that were reported:
 *
 *  - *Dark on some devices.* The Android theme inherited
 *    `Theme.AppCompat.DayNight`, which flips with the device's own dark-mode
 *    setting. TaskPro has no dark theme, so on a phone in dark mode the bar
 *    went dark while the app stayed light. The theme is now pinned to `Light`
 *    (see `values/styles.xml`), and this call restates it at runtime.
 *
 *  - *Overlapping the UI.* `targetSdkVersion` is 36, and from API 35 Android
 *    **enforces** edge-to-edge: the app draws underneath the system bars and
 *    `android:statusBarColor` is ignored. Nothing in the CSS applied a top
 *    inset (all 11 `env(safe-area-inset-*)` rules are bottom-only), so the
 *    header rendered under the clock. `setOverlaysWebView({overlay:false})`
 *    insets the WebView below the bar natively — deliberately chosen over
 *    adding `padding-top: env(safe-area-inset-top)` in CSS, because the two
 *    together would double-pad on any device where both take effect.
 */
const setupStatusBar = async () => {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // Order matters: stop overlaying first, so the colour applies to a bar
    // that actually has its own space rather than to a transparent strip.
    await StatusBar.setOverlaysWebView({ overlay: false });
    // `Style.Light` means "light background, dark icons" — the dark glyphs are
    // what makes the clock readable against our near-white bar. It reads
    // backwards; `Style.Dark` is the one that produces white icons.
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: STATUS_BAR_COLOR });
  } catch (err) {
    console.warn('[native] status bar setup skipped:', err?.message || err);
  }
};

/**
 * Is a dismissable overlay currently on screen?
 *
 * `Modal` already closes itself on Escape, so the back button can reuse that
 * contract rather than every modal in the app needing to know about Android.
 */
const closeTopOverlay = () => {
  const overlay = document.querySelector('.modal-overlay, .drawer-overlay');
  if (!overlay) return false;
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return true;
};

/**
 * Make the hardware back button navigate instead of killing the app.
 *
 * With no `backButton` listener registered, Capacitor's default is to close
 * the activity — which is why a single press anywhere in the app force-closed
 * it. Precedence is deliberate:
 *
 *   1. An open modal/drawer closes first — backing out of a dialog should not
 *      also navigate the page underneath it.
 *   2. Otherwise go back through history.
 *   3. At the first screen, **minimize** rather than exit. `App.exitApp()`
 *      would reproduce the original complaint at the one place a user is most
 *      likely to press back by reflex; minimizing matches what every other
 *      Android app does, and leaves the session intact for the next launch.
 */
const setupBackButton = async () => {
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (closeTopOverlay()) return;
      if (canGoBack && window.history.length > 1) {
        window.history.back();
        return;
      }
      App.minimizeApp();
    });
  } catch (err) {
    console.warn('[native] back button setup skipped:', err?.message || err);
  }
};

/**
 * Tag `<html>` so the stylesheet can suppress long-press text selection.
 *
 * The rules themselves live in `global.css` (`.native-app`) rather than here,
 * so the exceptions — inputs, textareas and the contenteditable chat composer,
 * which must stay selectable or the app becomes untypeable — sit beside the
 * components they protect.
 */
const markNativeDocument = () => {
  document.documentElement.classList.add('native-app');
};

/**
 * Called once from `main.jsx`, before render. A no-op on the web.
 */
export const initAndroidShell = () => {
  if (!isNativeApp()) return;
  markNativeDocument();
  setupStatusBar();
  setupBackButton();
};
