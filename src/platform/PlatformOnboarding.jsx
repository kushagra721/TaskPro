import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { platformApi } from '../api/client.js';
import { platformOnboarded, selectPlatformUser } from '../store/slices/platformAuthSlice.js';
import { ArrowRightIcon, CheckIcon } from '../components/icons.jsx';

const money = (n) => `₹${n.toLocaleString('en-IN')}`;
const limitLabel = (n) => (n === -1 ? 'Unlimited' : n.toLocaleString());
const storageLabel = (mb) =>
  mb === -1 ? 'Unlimited' : mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 ? 1 : 0)} GB` : `${mb} MB`;

/**
 * Post-verification setup for a **self-signed-up** reseller: billing details
 * plus the one required choice, which global plan they're on. Deliberately its
 * own full-page step outside the portal shell (no sidebar/tabs) — until it's
 * done the reseller has no plan, so dropping them straight into the portal
 * would show a half-configured account.
 *
 * A Super-Admin-provisioned reseller never lands here: their plan is set at
 * creation, and the onboarding gate keys off `createdById` being null (see
 * `platformAuth.service.js#needsOnboardingFor`).
 */
export default function PlatformOnboarding() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const platformUser = useSelector(selectPlatformUser);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    planId: '',
    businessName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    platformApi
      .globalPlans()
      .then((r) => setPlans(r.plans))
      .catch((err) => setError(err.message || 'Could not load the plans'))
      .finally(() => setLoading(false));
  }, []);

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await platformApi.onboarding(form);
      // Clear the guard before navigating, or PlatformProtectedRoute bounces
      // us straight back here.
      dispatch(platformOnboarded());
      navigate('/platform/reseller', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not save your details');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="screen-center" style={{ minHeight: '60vh' }}>
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="onboarding">
      <div className="onboarding__inner">
        <div className="reseller-create__head">
          <h1 className="reseller-create__title">Welcome{platformUser?.name ? `, ${platformUser.name}` : ''} 👋</h1>
          <p className="reseller-create__sub">
            Two last things before your portal is ready: pick the plan you want, and add the billing details we&apos;ll
            put on your invoices.
          </p>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={submit}>
          <div className="reseller-create__section">Choose your plan</div>
          {plans.length === 0 ? (
            <div className="alert alert--warn">
              No platform plans are available yet. Please contact us — your account is created, and you can sign in once
              a plan is published.
            </div>
          ) : (
            <div className="onboarding__plans">
              {plans.map((p) => {
                const selected = form.planId === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={`onboarding__plan ${selected ? 'onboarding__plan--selected' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, planId: p.id }))}
                    aria-pressed={selected}
                  >
                    <span className="onboarding__plan-check">{selected && <CheckIcon size={13} />}</span>
                    <span className="onboarding__plan-name">{p.name}</span>
                    <span className="onboarding__plan-price">
                      {money(p.monthlyPrice)}
                      <small>/mo</small>
                    </span>
                    {p.description && <span className="onboarding__plan-desc">{p.description}</span>}
                    <dl className="plan-spec-table">
                      <div className="plan-spec-table__row">
                        <dt>Tasks / user</dt>
                        <dd>{limitLabel(p.maxTasksPerUser)}</dd>
                      </div>
                      <div className="plan-spec-table__row">
                        <dt>Storage / user</dt>
                        <dd>{storageLabel(p.maxStorageMbPerUser)}</dd>
                      </div>
                      <div className="plan-spec-table__row">
                        <dt>Billed yearly</dt>
                        <dd>{money(p.yearlyPrice)}</dd>
                      </div>
                    </dl>
                  </button>
                );
              })}
            </div>
          )}

          <div className="reseller-create__section">Billing details</div>
          <div className="field">
            <label className="field__label">
              Business name <span className="field__opt">(as it should appear on invoices)</span>
            </label>
            <input
              className="input"
              value={form.businessName}
              onChange={up('businessName')}
              placeholder="Your Company Pvt Ltd"
            />
          </div>
          <div className="field">
            <label className="field__label">
              Address <span className="field__opt">(optional)</span>
            </label>
            <input className="input" value={form.addressLine1} onChange={up('addressLine1')} placeholder="Street address" />
          </div>
          <div className="field">
            <label className="field__label">
              Address line 2 <span className="field__opt">(optional)</span>
            </label>
            <input className="input" value={form.addressLine2} onChange={up('addressLine2')} placeholder="Area, landmark" />
          </div>
          <div className="row2">
            <div className="field">
              <label className="field__label">City</label>
              <input className="input" value={form.city} onChange={up('city')} placeholder="Noida" />
            </div>
            <div className="field">
              <label className="field__label">Pincode</label>
              <input className="input" value={form.pincode} onChange={up('pincode')} placeholder="201301" inputMode="numeric" />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label className="field__label">State</label>
              <input className="input" value={form.state} onChange={up('state')} placeholder="Uttar Pradesh" />
            </div>
            <div className="field">
              <label className="field__label">
                GSTIN <span className="field__opt">(optional)</span>
              </label>
              <input
                className="input"
                value={form.gstin}
                onChange={up('gstin')}
                placeholder="09AABCU9603R1ZM"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>

          <div className="reseller-create__actions">
            <button className="btn" type="submit" disabled={busy || !form.planId}>
              {busy ? <span className="spinner" /> : (<>Go to my portal <ArrowRightIcon size={16} /></>)}
            </button>
            <span className="reseller-create__note">
              You can change any of this later from your profile. Only the plan is required now.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
