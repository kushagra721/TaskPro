const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let loader = null;

/**
 * Loads Razorpay's checkout script on demand — deliberately not in index.html,
 * since only two admin-only screens ever need it and it's a third-party script.
 * The promise is cached so opening checkout repeatedly doesn't re-inject it.
 */
export const loadRazorpay = () => {
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
export const openRazorpayCheckout = (checkout) =>
  new Promise((resolve) => {
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
