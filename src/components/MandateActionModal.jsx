import { useState } from 'react';
import Modal from './Modal.jsx';
import { organizationsApi } from '../api/client.js';
import { loadRazorpay, openRazorpayCheckout } from '../utils/razorpay.js';
import { CheckIcon, CreditCardIcon, InfoIcon } from './icons.jsx';
import { formatDate } from '../utils/status.js';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/**
 * Shown after a **downgrade is scheduled** (and again from the Billing page
 * while it's outstanding).
 *
 * A downgrade doesn't charge anything: the customer keeps the plan they've
 * already paid for until it renews, and the cheaper one starts on that date.
 * But their old autopay mandate is still authorised for the *higher* amount,
 * and — for UPI AutoPay — neither we nor Razorpay can amend or reliably
 * withdraw it (`subscriptions cannot be updated when payment mode is upi`), so
 * the customer has to cancel it in the app where they created it. This dialog
 * is that instruction, plus the button that authorises the replacement.
 *
 * Step 2 opens a **future-dated** Razorpay subscription, so approving it debits
 * nothing today — the first collection lands on the switch date.
 */
export default function MandateActionModal({ orgId, pending, onDone, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(pending.mandateReady);

  const startsAt = formatDate(pending.startsAt);

  const authorise = async () => {
    setBusy(true);
    setError('');
    try {
      const { setup } = await organizationsApi.setupMandate(orgId);
      const ready = await loadRazorpay();
      if (!ready) {
        setError("Couldn't load the payment window. Check your connection or any ad blocker, then try again.");
        return;
      }
      const result = await openRazorpayCheckout({ ...setup, subscriptionId: setup.subscriptionId });
      if (result.status === 'dismissed') return;
      if (result.status === 'failed') {
        setError(result.message);
        return;
      }
      const res = await organizationsApi.confirmMandate(orgId, result.payload);
      setDone(true);
      onDone?.(res.billing);
    } catch (err) {
      setError(err.message || 'Could not set up the new autopay mandate');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Two steps to finish your plan change" onClose={onClose}>
      <p className="mandate-steps__lead">
        You&apos;ll stay on <strong>{pending.previousPlanName || 'your current plan'}</strong> until{' '}
        <strong>{startsAt}</strong> — you&apos;ve already paid for that period. <strong>{pending.plan.name}</strong> (
        {money(pending.plan.monthlyPrice)}/month) starts from then, and nothing is charged today.
      </p>

      {error && <div className="alert alert--error">{error}</div>}

      <ol className="mandate-steps">
        <li className="mandate-steps__item">
          <span className="mandate-steps__num">1</span>
          <div>
            <h4 className="mandate-steps__title">Cancel your old autopay mandate</h4>
            <p className="mandate-steps__text">
              {pending.mandateToCancel ? (
                <>
                  Your existing mandate is still authorised for{' '}
                  <strong>{money(pending.mandateToCancel.amount)}/month</strong> ({pending.mandateToCancel.planName}).
                  Open the app you approved it in — your UPI app, or your bank&apos;s mandates/e-mandate section — and
                  cancel it, so you aren&apos;t debited the old amount again.
                </>
              ) : (
                <>
                  If you set up autopay for your old plan, cancel it in the app you approved it in — your UPI app, or
                  your bank&apos;s mandates section.
                </>
              )}
            </p>
            {/* Said plainly rather than hidden: it's the one part of this flow
                we genuinely cannot do for them on a UPI mandate. */}
            <p className="mandate-steps__note">
              <InfoIcon size={14} /> A UPI AutoPay mandate can only be cancelled by you, from your own app.
            </p>
          </div>
        </li>

        <li className="mandate-steps__item">
          <span className={`mandate-steps__num ${done ? 'mandate-steps__num--done' : ''}`}>
            {done ? <CheckIcon size={14} /> : '2'}
          </span>
          <div>
            <h4 className="mandate-steps__title">Approve the new mandate</h4>
            <p className="mandate-steps__text">
              For {money(pending.plan.monthlyPrice)}/month, starting {startsAt}. Approving it now costs you nothing —
              the first debit is on {startsAt}.
            </p>
            {done ? (
              <p className="mandate-steps__note mandate-steps__note--ok">
                <CheckIcon size={14} /> New mandate approved.
              </p>
            ) : (
              <button className="btn btn--sm" onClick={authorise} disabled={busy}>
                {busy ? <span className="spinner" /> : (<><CreditCardIcon size={15} /> Set up autopay · ₹0 now</>)}
              </button>
            )}
          </div>
        </li>
      </ol>

      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
          {done ? 'Close' : 'I’ll do this later'}
        </button>
      </div>
    </Modal>
  );
}
