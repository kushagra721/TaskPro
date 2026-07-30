import { useCallback } from 'react';
import { organizationsApi } from '../api/client.js';
import { loadRazorpay, openRazorpayCheckout } from '../utils/razorpay.js';

/**
 * Runs the full pay-then-apply sequence for an upgrade or a top-up, so the
 * Manage Plan and Billing pages can't drift in how they handle it.
 *
 * The server decides whether a charge is due — `checkout` answers `{free:true}`
 * when the amount is ₹0 or the workspace's reseller hasn't connected Razorpay,
 * and the caller then falls through to the direct endpoint. That's why the
 * `free` branch lives here rather than being guessed from the plan price.
 *
 * Resolves `{ ok, billing?, cancelled?, message? }` — a dismissed sheet is a
 * normal outcome (`cancelled: true`), not an error to surface as a failure.
 */
export function useCheckout(orgId) {
  return useCallback(
    async ({ kind, planId, tasks, applyFree }) => {
      let started;
      try {
        started = await organizationsApi.checkout(orgId, { kind, planId, tasks });
      } catch (err) {
        // 422 + `billingDetailsRequired` — a tax invoice needs a "bill to"
        // party, so the caller opens the billing dialog instead of showing an
        // error the user can't act on.
        if (err?.status === 422 && err?.fields?.billingDetailsRequired) {
          return { ok: false, needsBillingDetails: true, message: err.message };
        }
        throw err;
      }

      if (started.free) {
        // Nothing to charge — apply directly through the existing endpoint.
        const res = await applyFree();
        return { ok: true, billing: res.billing };
      }

      const ready = await loadRazorpay();
      if (!ready) {
        return {
          ok: false,
          message: "Couldn't load the payment window. Check your connection or any ad blocker, then try again.",
        };
      }

      const result = await openRazorpayCheckout(started.checkout);
      if (result.status === 'dismissed') return { ok: false, cancelled: true };
      if (result.status === 'failed') return { ok: false, message: result.message };

      // Only the server's signature check may grant the plan/quota.
      const confirmed = await organizationsApi.verifyPayment(orgId, result.payload);
      return { ok: true, billing: confirmed.billing };
    },
    [orgId]
  );
}
