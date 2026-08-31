import { BILLING_DISABLED_AT_BUILD, billingEnabled } from './native.js';

/**
 * ⚠️ THE SDK URL IS BEHIND A BUILD-TIME CONSTANT ON PURPOSE — DO NOT INLINE IT.
 *
 * `BILLING_DISABLED_AT_BUILD` is `import.meta.env.VITE_DISABLE_BILLING === '1'`,
 * which Vite replaces with a literal at build time. In the iOS build the
 * ternary therefore folds to `''` and the minifier drops the
 * `checkout.razorpay.com` string entirely — so the IPA an App Store reviewer
 * unpacks contains no payment SDK reference at all. Writing the URL directly
 * would leave it in every bundle no matter what the app does at runtime.
 *
 * Verified against the built output: with the flag set the string is absent
 * from `dist/`; without it, it is present exactly as before.
 */
const SCRIPT_SRC = BILLING_DISABLED_AT_BUILD ? '' : 'https://checkout.razorpay.com/v1/checkout.js';

let loader = null;

/**
 * Loads Razorpay's checkout script on demand — deliberately not in index.html,
 * since only two admin-only screens ever need it and it's a third-party script.
 * The promise is cached so opening checkout repeatedly doesn't re-inject it.
 *
 * Resolves **false** on any build or platform where billing is withheld (App
 * Store Review 3.1.1 — see `native.js#billingEnabled`). That is the last of
 * the four gates: the More entry is hidden, both routes redirect, `QuotaGate`
 * points at the browser, and this refuses to fetch the third-party script even
 * if some future screen calls it. `useCheckout` already treats a false here as
 * "couldn't load the payment window", so no caller needed changing.
 */
export const loadRazorpay = () => {
  if (!billingEnabled() || !SCRIPT_SRC) return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loader) return loader;

  loader = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever —
      // this is usually a blocked network or an ad blocker, both transient.
      loader = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return loader;
};

/**
 * Opens Razorpay checkout and resolves with what happened:
 *   `{ status: 'paid', payload }` — the handler fired; the payload still has to
 *      be verified server-side before anything is granted.
 *   `{ status: 'dismissed' }`     — the user closed the sheet.
 *   `{ status: 'failed', message }`
 *
 * Resolving (rather than rejecting) on dismissal keeps the caller's control
 * flow linear: a closed sheet is a normal outcome, not an error.
 */
export const openRazorpayCheckout = (checkout) => {
  // Folds away in the iOS build, taking the `new window.Razorpay(...)`
  // construction below with it — see SCRIPT_SRC above for why the constant is
  // build-time. Unreachable in practice (`loadRazorpay` already resolved false
  // and `useCheckout` stops there), so this is purely about what ends up in
  // the bundle.
  if (BILLING_DISABLED_AT_BUILD) {
    return Promise.resolve({ status: 'failed', message: 'Payments are not available in this app.' });
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const rzp = new window.Razorpay({
      key: checkout.keyId,
      // Exactly one of these is set by the server. `subscription_id` is what
      // makes Razorpay show the eMandate / UPI Autopay options and the "will
      // then charge ₹X every month" summary — a plan upgrade. `order_id` is the
      // plain one-off sheet, used for top-ups.
      ...(checkout.subscriptionId
        ? { subscription_id: checkout.subscriptionId }
        : { order_id: checkout.orderId, amount: checkout.amount }),
      currency: checkout.currency,
      name: checkout.name,
      description: checkout.description,
      prefill: checkout.prefill,
      theme: { color: '#6366f1' },
      handler: (response) =>
        finish({
          status: 'paid',
          payload: {
            transactionId: checkout.transactionId,
            // A subscription checkout returns `razorpay_subscription_id`
            // instead of an order id, and its signature covers a different
            // string — the server picks the right check from what the
            // transaction was opened against.
            razorpayOrderId: response.razorpay_order_id,
            razorpaySubscriptionId: response.razorpay_subscription_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          },
        }),
      modal: { ondismiss: () => finish({ status: 'dismissed' }) },
    });

    rzp.on('payment.failed', (response) =>
      finish({ status: 'failed', message: response?.error?.description || 'The payment failed.' })
    );

    rzp.open();
  });
};
