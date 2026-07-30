import Modal from './Modal.jsx';
import { ActivityIcon, CreditCardIcon, ShieldIcon, TaskIcon } from './icons.jsx';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0).toLocaleString('en-IN');

/**
 * The review-before-you-pay dialog for an upgrade or a top-up. The whole
 * breakdown comes from `POST /billing/quote`, priced server-side — nothing here
 * computes an amount, so what's shown can't disagree with what Razorpay charges.
 *
 * `quote.requiresPayment` is false when the workspace's reseller hasn't
 * connected a gateway (or the total is ₹0); the copy and the confirm button
 * both switch to "apply" wording rather than promising a payment step that
 * won't happen.
 */
export default function PaymentConfirmModal({ quote, busy = false, error = '', onConfirm, onEditBilling, onClose }) {
  const d = quote.billingDetails || {};
  const hasBilling = d.businessName || d.addressLine1 || d.city;
  const isTopup = quote.kind === 'TOPUP';
  const ItemIcon = isTopup ? ActivityIcon : CreditCardIcon;

  return (
    <Modal title={quote.title} onClose={onClose}>
      <div className="payconf">
        <p className="payconf__sub">{quote.subtitle}</p>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="payconf__item">
          <span className="payconf__item-icon">
            <ItemIcon size={18} />
          </span>
          <div className="payconf__item-text">
            <div className="payconf__item-name">{quote.itemName}</div>
            <div className="payconf__item-sub">{quote.itemSub}</div>
          </div>
          <div className="payconf__item-price">{money(quote.itemPrice)}</div>
        </div>

        <div className="payconf__box">
          <div className="payconf__box-label">Payment details</div>
          {quote.lines.map((l) => (
            <div className={`payconf__row ${l.muted ? 'payconf__row--muted' : ''}`} key={l.label}>
              <span>{l.label}</span>
              <span>{l.value}</span>
            </div>
          ))}
          <div className="payconf__row">
            <span>Subtotal</span>
            <span>{money(quote.subtotal)}</span>
          </div>
          <div className="payconf__row">
            <span>GST ({quote.taxPercent}%)</span>
            <span>{money(quote.taxAmount)}</span>
          </div>
          <div className="payconf__row payconf__row--total">
            <span>Total payable</span>
            <span>{money(quote.total)}</span>
          </div>
        </div>

        {quote.rolloverTasks > 0 && (
          <div className="payconf__rollover">
            <span className="payconf__rollover-icon">
              <TaskIcon size={17} />
            </span>
            <div>
              <div className="payconf__rollover-title">You keep +{num(quote.rolloverTasks)} tasks</div>
              <div className="payconf__rollover-sub">
                Unused tasks from this cycle roll over as top-up credits that never expire.
              </div>
            </div>
          </div>
        )}

        <div className="payconf__box">
          <div className="payconf__box-head">
            <span className="payconf__box-label">Billed to</span>
            {onEditBilling && (
              <button type="button" className="link-btn" onClick={onEditBilling}>
                Edit
              </button>
            )}
          </div>
          {hasBilling ? (
            <div className="payconf__billed">
              <strong>{d.businessName || '—'}</strong>
              <span>{[d.addressLine1, d.addressLine2].filter(Boolean).join(', ')}</span>
              <span>{[d.city, d.state, d.pincode].filter(Boolean).join(', ')}</span>
              {d.gstin && <span className="muted">GSTIN {d.gstin}</span>}
            </div>
          ) : (
            <div className="payconf__billed">
              <span className="muted">No billing details yet — add them so your invoice is complete.</span>
            </div>
          )}
        </div>

        <p className="payconf__note">
          <ShieldIcon size={15} />
          <span>
            {isTopup
              ? 'Top-up tasks never expire and are used once your monthly quota runs out.'
              : 'Your plan activates immediately and a new billing cycle starts.'}{' '}
            {quote.requiresPayment
              ? "You'll pay through a secure Razorpay window, and it's applied as soon as the payment succeeds."
              : 'No payment is needed — this is applied straight away.'}
          </span>
        </p>

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn payconf__pay" onClick={onConfirm} disabled={busy}>
            {busy ? (
              <span className="spinner" />
            ) : (
              <>
                <CreditCardIcon size={16} />{' '}
                {quote.requiresPayment ? `Pay now · ${money(quote.total)}` : 'Confirm'}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
