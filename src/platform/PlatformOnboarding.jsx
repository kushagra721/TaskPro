import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { platformApi } from '../api/client.js';
import { platformOnboarded, selectPlatformUser } from '../store/slices/platformAuthSlice.js';
import { ArrowRightIcon } from '../components/icons.jsx';

/**
 * Post-verification setup for a **self-signed-up** reseller: the billing details
 * that print as the seller on every invoice their own clients receive.
 * Deliberately its own full-page step outside the portal shell (no
 * sidebar/tabs) — until it's done their invoices would have no seller address.
 *
 * A Super-Admin-provisioned reseller never lands here: their billing details are
 * captured at creation, and the onboarding gate keys off `createdById` being
 * null (see `platformAuth.service.js#needsOnboardingFor`).
 */
export default function PlatformOnboarding() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const platformUser = useSelector(selectPlatformUser);
  const [form, setForm] = useState({
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

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Everything an invoice's seller block needs; line 2 and GSTIN stay optional.
  const billingComplete = ['businessName', 'addressLine1', 'city', 'state', 'pincode'].every((k) => form[k].trim());

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

  return (
    <div className="onboarding">
      <div className="onboarding__inner">
        <div className="reseller-create__head">
          <h1 className="reseller-create__title">Welcome{platformUser?.name ? `, ${platformUser.name}` : ''} 👋</h1>
          <p className="reseller-create__sub">
            One last thing before your portal is ready: the billing details that appear as the seller on every invoice
            your clients receive.
          </p>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={submit}>
          <div className="reseller-create__section">Billing details</div>
          <div className="field">
            <label className="field__label">
              Business name <span className="req">*</span>
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
              Address <span className="req">*</span>
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
              <label className="field__label">City <span className="req">*</span></label>
              <input className="input" value={form.city} onChange={up('city')} placeholder="Noida" />
            </div>
            <div className="field">
              <label className="field__label">Pincode <span className="req">*</span></label>
              <input className="input" value={form.pincode} onChange={up('pincode')} placeholder="201301" inputMode="numeric" />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label className="field__label">State <span className="req">*</span></label>
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
            <button className="btn" type="submit" disabled={busy || !billingComplete}>
              {busy ? <span className="spinner" /> : (<>Go to my portal <ArrowRightIcon size={16} /></>)}
            </button>
            <span className="reseller-create__note">
              You can change any of this later from your profile.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
