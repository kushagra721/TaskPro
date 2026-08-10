import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { organizationsApi } from '../../api/client.js';
import PaymentConfirmModal from '../../components/PaymentConfirmModal.jsx';
import BillingDetailsModal from '../../components/BillingDetailsModal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { selectCurrentOrg } from '../../store/slices/orgSlice.js';
import { useCheckout } from '../../hooks/useCheckout.js';
import {
  ArrowLeftIcon,
  CheckIcon,
  CreditCardIcon,
  DatabaseIcon,
  TaskIcon,
  UserIcon,
} from '../../components/icons.jsx';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const storage = (mb) =>
  mb === -1 ? 'Unlimited' : mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 ? 1 : 0)} GB` : `${mb} MB`;

/**
 * "Manage your plan" — the plan grid a workspace admin picks from. The plans
 * are **their own reseller's**, loaded live (`GET /billing/plans`), so a
 * white-labelled customer only ever sees the tiers their provider published;
 * a house/direct workspace has no reseller and therefore nothing to show.
 *
 * Allowances are quoted **per active member** and plans have **no seat cap** —
 * a bigger team simply gets a proportionally bigger quota. Deliberately not
 * shown as a multiplied workspace total (`5,000 × 22 = 110,000`): that reads as
 * a bundle the plan doesn't sell, and the real workspace-wide figure already
 * lives on the Billing page where it's actually being consumed.
 */
export default function ManagePlanPage() {
  const navigate = useNavigate();
  const org = useSelector(selectCurrentOrg);
  const orgId = org?.id;
  const runCheckout = useCheckout(orgId);

  const [plans, setPlans] = useState([]);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [hasReseller, setHasReseller] = useState(true);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null); // plan pending confirmation
  const [quote, setQuote] = useState(null); // server-priced breakdown for the dialog
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Opened when checkout reports the workspace has no invoice address yet.
  const [editingBilling, setEditingBilling] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);

  const saveBilling = async (form) => {
    setSavingBilling(true);
    setError('');
    try {
      await organizationsApi.updateBillingDetails(orgId, form);
      setEditingBilling(false);
      // Re-quote so the dialog's "Billed to" block shows what was just saved.
      const res = await organizationsApi.quote(orgId, { kind: 'PLAN', planId: target.id });
      setQuote(res.quote);
    } catch (err) {
      setError(err.message || 'Could not save the billing details');
    } finally {
      setSavingBilling(false);
    }
  };

  /** Prices the change server-side, then opens the confirm dialog. Nothing is
   *  created until the user actually confirms — see the quote endpoint. */
  const askConfirm = async (plan) => {
    setTarget(plan);
    setQuote(null);
    setQuoting(true);
    setError('');
    try {
      const res = await organizationsApi.quote(orgId, { kind: 'PLAN', planId: plan.id });
      setQuote(res.quote);
    } catch (err) {
      setError(err.message || 'Could not price this plan');
      setTarget(null);
    } finally {
      setQuoting(false);
    }
  };

  // Only the plan list is needed here — allowances are quoted per active
  // member, so this page never has to know the workspace's member count.
  useEffect(() => {
    if (!orgId) return;
    organizationsApi
      .billingPlans(orgId)
      .then((p) => {
        setPlans(p.plans);
        setCurrentPlanId(p.currentPlanId);
        setHasReseller(p.hasReseller);
      })
      .catch((err) => setError(err.message || 'Could not load plans'))
      .finally(() => setLoading(false));
  }, [orgId]);

  const current = plans.find((p) => p.id === currentPlanId) || null;

  const choose = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await runCheckout({
        kind: 'PLAN',
        planId: target.id,
        // Only reached when there's nothing to charge — see useCheckout.
        applyFree: () => organizationsApi.changePlan(orgId, target.id),
      });
      if (res.cancelled) {
        // Closing the payment sheet isn't a failure; just return to the page.
        setBusy(false);
        setTarget(null);
        return;
      }
      if (res.needsBillingDetails) {
        // Collect them here, then the user can hit Pay again — no page change,
        // so they don't lose their place in the upgrade.
        setEditingBilling(true);
        setBusy(false);
        return;
      }
      if (!res.ok) {
        setError(res.message || 'The payment did not go through.');
        setBusy(false);
        return;
      }
      // A downgrade doesn't take effect (or charge) now — it's booked for the
      // next billing date. There is nothing more to do here: the autopay is
      // amended at the gateway, and in the one case where it can't be (UPI),
      // the Billing page carries a single "approve autopay" button. Both read
      // better on that page than in a modal stacked over this one.
      navigate('/more/billing');
    } catch (err) {
      setError(err.message || 'Could not change the plan');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="screen-center" style={{ minHeight: '40vh' }}>
          <span className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm back-btn" onClick={() => navigate('/more/billing')}>
        <ArrowLeftIcon size={15} /> Back to billing
      </button>

      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Manage your plan</h1>
          <p className="page__subtitle">Monthly task quota that renews each cycle</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="planpick-banner">
        <span className="planpick-banner__tag">Task-based billing</span>
        <h2 className="planpick-banner__title">Only pay for the work you track</h2>
        <p className="planpick-banner__sub">
          Monthly plans renew a task quota each cycle. Your quota scales with your team — every plan&apos;s allowance is
          per member, so it grows as you add people.
        </p>
        <div className="planpick-banner__facts">
          <span>
            <CheckIcon size={13} /> Renews monthly
          </span>
          <span>
            <CheckIcon size={13} /> Top-ups never expire
          </span>
          <span>
            <CheckIcon size={13} /> Change any time
          </span>
        </div>
      </div>

      {!hasReseller ? (
        <div className="panel">
          <EmptyState
            icon={<CreditCardIcon size={30} />}
            title="No plans available"
            description="This workspace signed up directly rather than through a reseller, so there are no plans published for it yet."
          />
        </div>
      ) : plans.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<CreditCardIcon size={30} />}
            title="No plans published yet"
            description="Your provider hasn't published any plans for their customers yet. Check back soon."
          />
        </div>
      ) : (
        <div className="panel planpick">
          <div className="planpick__head">
            <h3 className="planpick__title">Monthly plans</h3>
            <p className="planpick__sub">Task quota per cycle · renews automatically</p>
          </div>

          <div className="planpick__grid">
            {plans.map((p) => {
              const isCurrent = p.id === currentPlanId;
              const unlimited = p.maxTasksPerUser === -1;
              // "Most popular" is simply the priciest published tier — there's
              // no popularity signal in the data, so this is presentation only.
              const popular = !isCurrent && p.monthlyPrice === Math.max(...plans.map((x) => x.monthlyPrice)) && plans.length > 1;
              const isUpgrade = current ? p.monthlyPrice > current.monthlyPrice : true;
              const bullets = (p.featureBullets || '').split('\n').map((l) => l.trim()).filter(Boolean);

              return (
                <div key={p.id} className={`planpick__card ${isCurrent ? 'planpick__card--current' : ''} ${popular ? 'planpick__card--popular' : ''}`}>
                  {isCurrent && (
                    <span className="planpick__flag planpick__flag--current">
                      <CheckIcon size={12} /> Current plan
                    </span>
                  )}
                  {popular && <span className="planpick__flag planpick__flag--popular">Most popular</span>}

                  <div className="planpick__card-head">
                    <span className="planpick__card-icon">
                      <CreditCardIcon size={16} />
                    </span>
                    <div>
                      <div className="planpick__card-name">{p.name}</div>
                      <div className="planpick__card-kind">Monthly plan</div>
                    </div>
                  </div>

                  <div className="planpick__price">
                    {money(p.monthlyPrice)} <small>per month</small>
                  </div>

                  {/* Stated **per active member**, not as a multiplied
                      workspace total: the allowance is per person and there is
                      no seat cap, so a headline like "5,000 × 22 = 110,000"
                      reads as a bundle the plan doesn't actually sell. The live
                      workspace total is on the Billing page, where it belongs. */}
                  <div className="planpick__quota">
                    <div className="planpick__quota-main">
                      <TaskIcon size={14} />
                      <strong>{unlimited ? 'Unlimited' : num(p.maxTasksPerUser)}</strong> tasks / active member
                    </div>
                    <span className="planpick__quota-rate">Renews every month · no member limit</span>
                  </div>

                  <ul className="planpick__features">
                    <li>
                      <DatabaseIcon size={14} /> {storage(p.maxStorageMbPerUser)} storage / active member
                    </li>
                    <li>
                      <UserIcon size={14} /> Unlimited members
                    </li>
                    {p.dataExport && (
                      <li>
                        <CheckIcon size={14} className="planpick__check" /> Data export
                      </li>
                    )}
                    {p.apiAccess && (
                      <li>
                        <CheckIcon size={14} className="planpick__check" /> API access
                      </li>
                    )}
                    {p.prioritySupport && (
                      <li>
                        <CheckIcon size={14} className="planpick__check" /> Priority support
                      </li>
                    )}
                    {p.advancedReports && (
                      <li>
                        <CheckIcon size={14} className="planpick__check" /> Advanced reports
                      </li>
                    )}
                    {bullets.map((b, i) => (
                      <li key={i}>
                        <CheckIcon size={14} className="planpick__check" /> {b}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <button className="btn btn--ghost planpick__btn" disabled>
                      <CheckIcon size={15} /> Current plan
                    </button>
                  ) : (
                    <button
                      className={`btn planpick__btn ${isUpgrade ? '' : 'btn--ghost'}`}
                      onClick={() => askConfirm(p)}
                      disabled={quoting}
                    >
                      {current ? (isUpgrade ? 'Upgrade' : 'Downgrade') : 'Choose plan'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="planpick__foot">
            Just need a few more tasks this cycle?{' '}
            <button className="link-btn" onClick={() => navigate('/more/billing')}>
              Recharge top-up tasks
            </button>
          </div>
        </div>
      )}

      {editingBilling && (
        <BillingDetailsModal
          details={quote?.billingDetails}
          busy={savingBilling}
          error={error}
          onSave={saveBilling}
          onClose={() => setEditingBilling(false)}
        />
      )}

      {target && quote && !editingBilling && (
        <PaymentConfirmModal
          quote={quote}
          busy={busy}
          error={error}
          onConfirm={choose}
          onEditBilling={() => navigate('/more/billing')}
          onClose={() => {
            setTarget(null);
            setQuote(null);
            setError('');
          }}
        />
      )}
    </div>
  );
}
