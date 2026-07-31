import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { organizationsApi } from '../../api/client.js';
import BillingDetailsModal from '../../components/BillingDetailsModal.jsx';
import DocumentActions from '../../components/DocumentActions.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Modal from '../../components/Modal.jsx';
import MandateActionModal from '../../components/MandateActionModal.jsx';
import PaymentConfirmModal from '../../components/PaymentConfirmModal.jsx';
import { selectCurrentOrg } from '../../store/slices/orgSlice.js';
import { useCheckout } from '../../hooks/useCheckout.js';
import {
  ActivityIcon,
  CheckIcon,
  CreditCardIcon,
  EditIcon,
  InfoIcon,
  PlusIcon,
  ReceiptIcon,
  RotateIcon,
  TaskIcon,
  UserIcon,
} from '../../components/icons.jsx';
import { formatDate, formatDateTime } from '../../utils/status.js';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const num = (n) => Number(n || 0).toLocaleString('en-IN');

const KIND_LABEL = { PLAN_CHANGE: 'PLAN', TOPUP: 'TOP-UP', PLAN_CANCEL: 'CANCEL' };

/** SVG donut for the hero's "% remaining" ring — a couple of circles beats
 *  pulling in a chart library for one number. */
function UsageRing({ percent }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="billing-hero__ring">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={R} className="billing-hero__ring-track" />
        <circle
          cx="60"
          cy="60"
          r={R}
          className="billing-hero__ring-value"
          strokeDasharray={C}
          strokeDashoffset={C - (C * Math.max(0, Math.min(100, percent))) / 100}
        />
      </svg>
      <div className="billing-hero__ring-text">
        <strong>{percent}%</strong>
        <span>Remaining</span>
      </div>
    </div>
  );
}

function StatCard({ Icon, label, value, sub, progress }) {
  return (
    <div className="billing-stat">
      <span className="billing-stat__icon">
        <Icon size={18} />
      </span>
      <div className="billing-stat__label">{label}</div>
      <div className="billing-stat__value">{value}</div>
      {progress !== undefined && (
        <div className="billing-stat__bar">
          <span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
      {sub && <div className="billing-stat__sub">{sub}</div>}
    </div>
  );
}

/**
 * "Plans & Billing" (More tab, **admin/owner only** — the API is behind
 * requireOrgAdmin too, so a member linking here gets a 403 rather than a
 * half-rendered page).
 *
 * The metered unit is **tasks**, which is what the plan model actually prices
 * (`Plan.maxTasksPerUser`) — the reference design this is modelled on was a CRM
 * metering "leads", and tasks play the identical role here. Quota is
 * `tasks/user × members`, plus a never-expiring top-up balance.
 */
export default function BillingPage() {
  const navigate = useNavigate();
  const org = useSelector(selectCurrentOrg);
  const orgId = org?.id;
  const runCheckout = useCheckout(orgId);

  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [recharging, setRecharging] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [topupTasks, setTopupTasks] = useState('100');
  // Server-priced breakdown for the confirm dialog. Set = dialog open, so the
  // amount shown is always the one the order will be created for.
  const [topupQuote, setTopupQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(
    (spinner) => {
      if (!orgId) return;
      spinner(true);
      setError('');
      organizationsApi
        .billing(orgId)
        .then((res) => setBilling(res.billing))
        .catch((err) => setError(err.message || 'Could not load billing'))
        .finally(() => spinner(false));
    },
    [orgId]
  );

  useEffect(() => load(setLoading), [load]);

  const saveDetails = async (form) => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await organizationsApi.updateBillingDetails(orgId, form);
      setBilling((b) => ({ ...b, billingDetails: res.billingDetails }));
      setEditing(false);
    } catch (err) {
      setSaveError(err.message || 'Could not save the billing details');
    } finally {
      setSaving(false);
    }
  };

  /** Step 1 of the recharge: price it server-side and show the breakdown. */
  const askTopup = async () => {
    setQuoting(true);
    setActionError('');
    try {
      const res = await organizationsApi.quote(orgId, { kind: 'TOPUP', tasks: Number(topupTasks) });
      setTopupQuote(res.quote);
    } catch (err) {
      setActionError(err.message || 'Could not price this top-up');
    } finally {
      setQuoting(false);
    }
  };

  /** Step 2: pay (or apply directly when there's nothing to charge). */
  const doTopup = async () => {
    const tasks = Number(topupTasks);
    setBusy(true);
    setActionError('');
    try {
      const res = await runCheckout({
        kind: 'TOPUP',
        tasks,
        // Only reached when there's nothing to charge — see useCheckout.
        applyFree: () => organizationsApi.topup(orgId, tasks),
      });
      if (res.cancelled) {
        // Closing the payment sheet isn't a failure — leave the modal open so
        // they can retry without re-entering the amount.
        return;
      }
      if (res.needsBillingDetails) {
        // Swap to the billing form; the quote reopens once it's saved.
        setTopupQuote(null);
        setRecharging(false);
        setEditing(true);
        return;
      }
      if (!res.ok) {
        setActionError(res.message || 'The payment did not go through.');
        return;
      }
      setBilling(res.billing);
      setTopupQuote(null);
      setRecharging(false);
    } catch (err) {
      setActionError(err.message || 'Could not add the top-up');
    } finally {
      setBusy(false);
    }
  };

  const closeRecharge = () => {
    setRecharging(false);
    setTopupQuote(null);
    setActionError('');
  };

  const doCancel = async () => {
    setBusy(true);
    setActionError('');
    try {
      const res = await organizationsApi.cancelPlan(orgId);
      setBilling(res.billing);
      setCancelling(false);
    } catch (err) {
      setActionError(err.message || 'Could not cancel the plan');
    } finally {
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

  if (!billing) {
    return (
      <div className="page">
        <div className="panel">
          <EmptyState icon={<CreditCardIcon size={30} />} title="Billing unavailable" description={error} />
        </div>
      </div>
    );
  }

  const { plan, usage, period, billingDetails, transactions, hasReseller, reseller, memberCount, pendingChange } = billing;
  const d = billingDetails;
  // Mirrors `billing.service.js#priceTopup` so the user sees roughly what
  // they'll be charged before the payment window opens. Indicative only — the
  // server prices the actual order, and says so in the hint below.
  const perTaskRate = plan && !usage.unlimited && usage.planQuota > 0 ? plan.monthlyPrice / usage.planQuota : null;
  const topupPrice = perTaskRate === null ? null : Math.round(perTaskRate * (Number(topupTasks) || 0));
  // Extra tasks are a paid-plan feature — see the Recharge button below.
  const canRecharge = Boolean(plan) && plan.monthlyPrice > 0;
  const hasDetails = d.businessName || d.addressLine1 || d.city || d.state || d.pincode || d.gstin;

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Billing</h1>
          <p className="page__subtitle">Plans and usage for {org?.name}</p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => load(setReloading)} disabled={reloading}>
          <RotateIcon size={15} className={reloading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {actionError && <div className="alert alert--error">{actionError}</div>}

      {/* A downgrade booked for the next cycle. It stays visible until the
          switch date because the customer has to cancel their old autopay
          mandate themselves — see MandateActionModal. */}
      {pendingChange && (
        <div className="alert alert--warn pending-change">
          <div>
            <strong>{pendingChange.plan.name}</strong> starts on {formatDate(pendingChange.startsAt)}. You keep{' '}
            {plan?.name} until then, and nothing is charged today.
            {!pendingChange.mandateReady && ' Your old autopay mandate still needs cancelling, and the new one approving.'}
          </div>
          <button className="btn btn--sm" onClick={() => setShowPending(true)}>
            {pendingChange.mandateReady ? 'View details' : 'Finish setup'}
          </button>
        </div>
      )}

      {/* ---- Hero: remaining quota ---- */}
      <div className="billing-hero">
        <div className="billing-hero__main">
          <span className="billing-hero__tag">
            <TaskIcon size={13} /> Tasks remaining
          </span>
          <div className="billing-hero__big">{usage.unlimited ? 'Unlimited' : num(usage.remaining)}</div>
          <div className="billing-hero__pills">
            {usage.unlimited ? (
              <span className="billing-hero__pill">Unlimited tasks on {plan.name}</span>
            ) : (
              <>
                <span className="billing-hero__pill">{num(usage.planQuota)} monthly</span>
                {usage.topupTasks > 0 && <span className="billing-hero__pill">+{num(usage.topupTasks)} top-up</span>}
              </>
            )}
            {period && <span className="billing-hero__pill">{period.daysLeft}d left</span>}
          </div>
          {plan && !usage.unlimited && !canRecharge && (
            <p className="billing-hero__note">
              Extra tasks are available on a paid plan — upgrade to add more.
            </p>
          )}
          <div className="billing-hero__actions">
            <button className="btn billing-hero__btn" onClick={() => navigate('/more/billing/plans')}>
              <CreditCardIcon size={16} /> Manage plan
            </button>
            {/* Top-ups are priced off the plan's own per-task rate, so a free
                plan has nothing to price them against — the server rejects it
                with a 402 too (`billing.service.js#priceTopup`). Point at the
                upgrade instead of offering a button that can only fail. */}
            {/* {plan && !usage.unlimited && canRecharge && (
              <button className="btn billing-hero__btn billing-hero__btn--ghost" onClick={() => setRecharging(true)}>
                <PlusIcon size={16} /> Recharge
              </button>
            )} */}
          </div>
        </div>
        {!usage.unlimited && (
          <div className="billing-hero__side">
            <UsageRing percent={usage.percentRemaining} />
            <p className="billing-hero__side-note">
              {num(usage.tasksThisPeriod)} / {num(usage.totalQuota)} tasks this cycle
            </p>
          </div>
        )}
      </div>

      {/* ---- Current plan ---- */}
      <div className="panel billing-plan">
        {plan ? (
          <>
            <div className="billing-plan__row">
              <span className="billing-plan__icon">
                <CreditCardIcon size={20} />
              </span>
              <div className="billing-plan__text">
                <div className="billing-plan__eyebrow">Current plan</div>
                <div className="billing-plan__name-row">
                  <h2 className="billing-plan__name">{plan.name}</h2>
                  <span className="status-pill status-pill--completed">Active</span>
                </div>
                <div className="billing-plan__meta">
                  <span>Renews {formatDate(period.renewsAt)}</span>
                  <span className="status-pill status-pill--open">{period.daysLeft}d left</span>
                  <span>{money(plan.monthlyPrice)}/mo</span>
                </div>
                <div className="billing-plan__meta">
                  <span>
                    Billing day <strong>{period.billingDay}</strong> of every month
                  </span>
                </div>
              </div>
            </div>
            <p className="billing-plan__note">
              <InfoIcon size={14} /> Changing plan starts a new billing cycle immediately, and resets this cycle&apos;s
              task count. Top-up tasks never expire and are kept.
            </p>
            <button className="link-btn billing-plan__cancel" onClick={() => setCancelling(true)}>
              Cancel plan
            </button>
          </>
        ) : (
          <EmptyState
            icon={<CreditCardIcon size={30} />}
            title="No plan yet"
            description={
              hasReseller
                ? `Pick one of ${reseller?.name ?? 'your provider'}'s plans to set a monthly task quota for this workspace.`
                : 'This workspace signed up directly rather than through a reseller, so there are no plans to choose from yet.'
            }
            action={
              hasReseller && (
                <button className="btn" onClick={() => navigate('/more/billing/plans')}>
                  <CreditCardIcon size={16} /> Choose a plan
                </button>
              )
            }
          />
        )}
      </div>

      {/* ---- Stat cards ---- */}
      <div className="billing-stats">
        <StatCard
          Icon={TaskIcon}
          label="Monthly plan"
          value={
            usage.unlimited ? (
              'Unlimited'
            ) : (
              <>
                {num(usage.tasksThisPeriod)}
                <small>/{num(usage.totalQuota)}</small>
              </>
            )
          }
          progress={usage.unlimited || !usage.totalQuota ? 0 : (usage.tasksThisPeriod / usage.totalQuota) * 100}
          sub={plan ? `${plan.name} · ${period.daysLeft}d left` : 'No plan'}
        />
        <StatCard
          Icon={ActivityIcon}
          label="Top-up balance"
          value={num(usage.topupTasks)}
          sub="Never expires"
        />
        <StatCard
          Icon={UserIcon}
          label="Tasks created"
          value={num(usage.tasksTotal)}
          sub={`Across ${memberCount} member${memberCount === 1 ? '' : 's'}, all time`}
        />
      </div>

      {/* ---- Billing details ---- */}
      <h3 className="billing-section-title">Billing details</h3>
      <div className="panel billing-details">
        {hasDetails ? (
          <div className="billing-details__text">
            <strong>{d.businessName || '—'}</strong>
            <span>{[d.addressLine1, d.addressLine2].filter(Boolean).join(', ')}</span>
            <span>{[d.city, d.pincode].filter(Boolean).join(', ')}</span>
            <span>{d.state}</span>
            {d.gstin && <span className="muted">GSTIN {d.gstin}</span>}
          </div>
        ) : (
          <div className="billing-details__text">
            <strong>No billing details yet</strong>
            <span className="muted">Add your business name, address and GSTIN so invoices are complete.</span>
          </div>
        )}
        <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
          <EditIcon size={14} /> Edit
        </button>
      </div>

      {/* ---- Transactions ---- */}
      <h3 className="billing-section-title">Recent transactions</h3>
      <div className="panel">
        {transactions.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon size={28} />}
            title="No transactions yet"
            description="Plan changes and top-ups for this workspace will show up here."
          />
        ) : (
          <>
            <div className="table-wrap task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Tasks</th>
                    <th>Amount</th>
                    <th>Invoice</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="nowrap">{formatDateTime(t.createdAt)}</td>
                      <td>
                        <span className={`billing-kind billing-kind--${t.kind.toLowerCase()}`}>{KIND_LABEL[t.kind]}</span>{' '}
                        {t.description}
                      </td>
                      <td className="nowrap">{t.tasksDelta ? `+${num(t.tasksDelta)}` : '—'}</td>
                      <td className="nowrap">{t.amount ? money(t.amount) : '—'}</td>
                      {/* A free change is never billed, so it has no documents
                          — those rows show "—" rather than a dead icon. */}
                      <td><DocumentActions doc={t.invoice} /></td>
                      <td><DocumentActions doc={t.receipt} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="task-cards">
              {transactions.map((t) => (
                <div key={t.id} className="tcard">
                  <div className="tcard__row">
                    <div className="tcard__title">{t.description}</div>
                    <span className={`billing-kind billing-kind--${t.kind.toLowerCase()} tcard__del`}>
                      {KIND_LABEL[t.kind]}
                    </span>
                  </div>
                  <div className="tcard__tags">
                    {t.amount ? <span>{money(t.amount)}</span> : null}
                    {t.tasksDelta ? <span>+{num(t.tasksDelta)} tasks</span> : null}
                  </div>
                  <div className="tcard__foot">
                    <span className="nowrap muted">{formatDateTime(t.createdAt)}</span>
                    {/* Same documents as the desktop columns — a mobile user
                        still needs their invoice. */}
                    <span className="doc-actions">
                      {t.invoice && <DocumentActions doc={t.invoice} />}
                      {t.receipt && <DocumentActions doc={t.receipt} />}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {editing && (
        <BillingDetailsModal
          details={d}
          busy={saving}
          error={saveError}
          onSave={saveDetails}
          onClose={() => setEditing(false)}
        />
      )}

      {/* Two steps: pick a quantity, then review the priced breakdown. The
          quote replaces this dialog rather than stacking on it. */}
      {showPending && pendingChange && (
        <MandateActionModal
          orgId={orgId}
          pending={{ ...pendingChange, previousPlanName: plan?.name }}
          onDone={(next) => setBilling(next)}
          onClose={() => setShowPending(false)}
        />
      )}

      {recharging && !topupQuote && (
        <Modal title="Recharge tasks" onClose={closeRecharge}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askTopup();
            }}
          >
            <p className="modal__intro">
              Extra tasks on top of your monthly quota. Top-ups never expire and carry over between cycles.
            </p>
            {actionError && <div className="alert alert--error">{actionError}</div>}
            <div className="field">
              <label className="field__label">
                Extra tasks <span className="req">*</span>
              </label>
              <input
                className="input"
                type="number"
                min="1"
                autoFocus
                value={topupTasks}
                onChange={(e) => setTopupTasks(e.target.value)}
              />
              <p className="field__hint">
                Priced at your plan&apos;s own per-task rate
                {topupPrice !== null && (
                  <>
                    {' '}— around <strong>{money(topupPrice)}</strong> before GST
                  </>
                )}
                . You&apos;ll see the exact total before paying.
              </p>
            </div>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={closeRecharge} disabled={quoting}>
                Cancel
              </button>
              <button className="btn" type="submit" disabled={quoting || Number(topupTasks) < 1}>
                {quoting ? <span className="spinner" /> : (<><CheckIcon size={15} /> Review &amp; pay</>)}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {topupQuote && (
        <PaymentConfirmModal
          quote={topupQuote}
          busy={busy}
          error={actionError}
          onConfirm={doTopup}
          onEditBilling={() => {
            closeRecharge();
            setEditing(true);
          }}
          // Back to the quantity step rather than out of the flow entirely.
          onClose={() => {
            setTopupQuote(null);
            setActionError('');
          }}
        />
      )}

      {cancelling && (
        <ConfirmModal
          title="Cancel this plan?"
          confirmLabel="Cancel plan"
          message={`${org?.name} will drop to no plan and lose its monthly task quota. Your ${num(usage.topupTasks)} top-up task${usage.topupTasks === 1 ? '' : 's'} are kept — top-ups never expire. You can pick a plan again at any time.`}
          busy={busy}
          error={actionError}
          onConfirm={doCancel}
          onClose={() => setCancelling(false)}
        />
      )}
    </div>
  );
}

