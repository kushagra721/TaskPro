/**
 * Is this build running inside the Capacitor native shell (the Android/iOS
 * app) rather than a browser?
 *
 * This is the switch that keeps the two login flows apart. The web app
 * identifies its tenant by the hostname it's served from; inside the native
 * WebView `window.location.hostname` is `localhost` (Android) or `capacitor`
 * (iOS), which maps to no reseller at all — which is exactly why the app needs
 * to be *told* its tenant via a company code instead.
 *
 * Capacitor injects `window.Capacitor` into the WebView, so this needs no
 * plugin and no import from `@capacitor/core` (keeping the web bundle free of
 * it). Read defensively — it's absent in every browser.
 */
export const isNativeApp = () => {
  const cap = typeof window !== 'undefined' ? window.Capacitor : undefined;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  // Older Capacitor versions exposed a plain boolean instead of the method.
  return Boolean(cap.isNative);
};
