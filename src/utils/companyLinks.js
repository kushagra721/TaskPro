/**
 * Dial ERP's public pages — the company behind Task Pro.
 *
 * ONE list, consumed by BOTH surfaces: the marketing site's footer and the
 * app's More page. A legal URL that is right in one place and stale in the
 * other is worse than not having it, and the privacy policy in particular has
 * to keep matching what is filed on the Play Store listing.
 *
 * Every one of these leaves the app. On Android that is Capacitor's doing, not
 * ours: `Bridge#launchIntent` sees a host that is neither the app's own nor in
 * `server.allowNavigation` (which `capacitor.config.json` does not configure)
 * and fires an ACTION_VIEW intent, so the page opens in the device browser
 * rather than inside the WebView. On the web `target="_blank"` opens a tab.
 */
export const COMPANY_LINKS = [
  { key: 'privacy', label: 'Privacy Policy', desc: 'How we handle your data', url: 'https://dialerp.in/privacy' },
  { key: 'terms', label: 'Terms & Conditions', desc: 'The terms you agree to', url: 'https://dialerp.in/terms' },
  { key: 'contact', label: 'Contact Us', desc: 'Get in touch with our team', url: 'https://dialerp.in/contactus' },
  { key: 'about', label: 'About Us', desc: 'The company behind Task Pro', url: 'https://dialerp.in/aboutus' },
];
