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

/**
 * Which shell is this running in — `'ios'`, `'android'` or `'web'`?
 *
 * Capacitor injects `getPlatform()` alongside `isNativePlatform()`, so this
 * needs no plugin either. Read defensively: it is absent in every browser, and
 * an older Capacitor could in principle omit the method.
 */
export const nativePlatform = () => {
  const cap = typeof window !== 'undefined' ? window.Capacitor : undefined;
  const p = cap?.getPlatform?.();
  return typeof p === 'string' && p ? p : 'web';
};

/**
 * Is this the iOS app?
 *
 * WHY THIS EXISTS: App Store Review Guideline 3.1.1 requires digital goods
 * sold inside an iOS app to go through Apple's own in-app purchase. Task Pro
 * bills through Razorpay, which is correct on the web and on Android and is
 * exactly what gets an iOS build rejected — so the whole Plans & Billing
 * surface is withheld from this one platform.
 *
 * It is a PLATFORM test, not a native test: the Android app keeps billing.
 */
export const isIosApp = () => isNativeApp() && nativePlatform() === 'ios';

/**
 * Build-time kill switch for the paid-plan surface, set by the iOS workflow in
 * `codemagic.yaml` (`VITE_DISABLE_BILLING=1`).
 *
 * ⚠️ THIS IS A SEPARATE MECHANISM FROM `isIosApp()`, AND BOTH ARE NEEDED.
 * `isIosApp()` is a RUNTIME test: it hides the screens, but the Razorpay
 * loader and its `checkout.razorpay.com` URL are still compiled into the
 * bundle, where anyone auditing the IPA can find them. This flag is read at
 * BUILD time, so Vite folds the constant and the SDK URL is not in the iOS
 * bundle at all — which is what "remove the payment SDK" actually means to a
 * store reviewer.
 *
 * Vite inlines `import.meta.env.*` as a literal, so this whole expression
 * becomes `true`/`false` at build time and everything behind it is dropped.
 *
 * Unset everywhere else, so the web and Android builds are untouched.
 */
export const BILLING_DISABLED_AT_BUILD = import.meta.env.VITE_DISABLE_BILLING === '1';

/**
 * Is the paid-plan surface available to this build?
 *
 * Every place that leads to checkout asks this ONE question rather than
 * testing the platform itself — the menu entry, the two routes and the quota
 * prompt would otherwise be three chances to reopen the hole a store review
 * closed. Named for the rule rather than for the platform, so bringing billing
 * back (via Apple IAP, say) is a change here and nowhere else.
 *
 * Two independent reasons to be off, deliberately belt-and-braces: the build
 * flag above (so the code is absent from an iOS IPA) and the runtime platform
 * test (so it stays off even if the flag is ever forgotten in CI).
 */
export const billingEnabled = () => !BILLING_DISABLED_AT_BUILD && !isIosApp();
