import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { platformApi } from '../../api/client.js';
import BrandPreview from '../BrandPreview.jsx';
import Select from '../../components/Select.jsx';
import { ArrowLeftIcon, CameraIcon, CheckIcon, PlusIcon, TrashIcon } from '../../components/icons.jsx';

const THEME_COLORS = [
  '#6366f1',
  '#10b981',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#f97316',
  '#06b6d4',
  '#ef4444',
  '#111827',
];

const LOGO_MAX_BYTES = 400 * 1024;

const EMPTY = {
  name: '',
  email: '',
  mobile: '',
  password: '',
  planId: '',
  brandName: '',
  themeColor: THEME_COLORS[0],
  logoUrl: '',
  businessName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
};

/** Full-page reseller form — deliberately a page, not a modal, because the
 *  white-label branding fields are only meaningful next to the live preview of
 *  the reseller's home page, which needs the room. One component serves both
 *  `/resellers/new` and `/resellers/:id/edit` (same convention as
 *  AddDomainPage/CreatePlanPage); the edit route loads via the detail endpoint. */
export default function CreateResellerPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // The global (platform) plans a reseller can be put on — NOT `plans.list()`,
  // which for a Super Admin returns the same set but for a Reseller would
  // return their own. This endpoint is explicitly the global one.
  useEffect(() => {
    platformApi.globalPlans().then((r) => setPlans(r.plans)).catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    platformApi.resellers
      .get(id)
      .then((res) => {
        const r = res.reseller;
        setForm({
          ...EMPTY,
          // `?? ''` throughout: every column is nullable, and a null in a
          // controlled input makes React fall back to uncontrolled.
          name: r.name ?? '',
          email: r.email ?? '',
          mobile: r.mobile ?? '',
          planId: r.planId ?? '',
          brandName: r.brandName ?? '',
          themeColor: r.themeColor || THEME_COLORS[0],
          logoUrl: r.logoUrl ?? '',
          businessName: r.businessName ?? '',
          addressLine1: r.addressLine1 ?? '',
          addressLine2: r.addressLine2 ?? '',
          city: r.city ?? '',
          state: r.state ?? '',
          pincode: r.pincode ?? '',
          gstin: r.gstin ?? '',
        });
      })
      .catch((err) => setError(err.message || 'Could not load the reseller'))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('The logo must be an image file');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError('The logo must be under 400 KB');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const res = await platformApi.upload([file]);
      set('logoUrl', res.files[0].url);
    } catch (err) {
      setError(err.message || 'Could not upload the logo');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (editing) {
        // `password` isn't part of the update contract — there's no
        // change-password flow for platform accounts yet (see CLAUDE.md).
        // `planId` is dropped when empty: it's a required *uuid* in the update
        // schema too, and pre-global-plans resellers legitimately have none.
        const { password, planId, ...rest } = form;
        await platformApi.resellers.update(id, planId ? { ...rest, planId } : rest);
        navigate(`/platform/admin/resellers/${id}`);
      } else {
        await platformApi.resellers.create(form);
        navigate('/platform/admin/resellers');
      }
    } catch (err) {
      setError(err.message || `Could not ${editing ? 'save' : 'create'} the reseller`);
    } finally {
      setBusy(false);
    }
  };

  // A plan is mandatory when creating; on edit it's only enforced if the
  // reseller already had one (see the submit handler).
  const canSubmit =
    form.name.trim() && form.email.trim() && (editing || form.planId) && !busy && !uploading;
  const backTo = editing ? `/platform/admin/resellers/${id}` : '/platform/admin/resellers';

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
      <button className="btn btn--ghost btn--sm back-btn" onClick={() => navigate(backTo)}>
        <ArrowLeftIcon size={15} /> {editing ? 'Back to reseller' : 'Back to resellers'}
      </button>

      <form className="reseller-create" onSubmit={submit}>
        <div className="reseller-create__head">
          <h1 className="reseller-create__title">{editing ? 'Edit reseller' : 'Create a reseller'}</h1>
          <p className="reseller-create__sub">
            {editing
              ? 'Update their account, branding and billing details. Changing the email also changes the address they sign in with.'
              : 'Set up their login and white-label look in one step. Branding is optional — you can change it anytime.'}
          </p>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="reseller-create__grid">
          <div className="reseller-create__form">
            <div className="reseller-create__section">Account</div>
            <div className="row2">
              <div className="field">
                <label className="field__label">
                  Reseller name <span className="req">*</span>
                </label>
                <input className="input" autoFocus value={form.name} onChange={up('name')} placeholder="Acme Digital" />
              </div>
              <div className="field">
                <label className="field__label">
                  Email <span className="req">*</span>
                </label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={up('email')}
                  placeholder="owner@acme.com"
                />
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label className="field__label">
                  Mobile <span className="field__opt">(optional)</span>
                </label>
                <input
                  className="input"
                  value={form.mobile}
                  onChange={up('mobile')}
                  placeholder="9812345678"
                  inputMode="numeric"
                />
              </div>
              {!editing && (
                <div className="field">
                  <label className="field__label">
                    Password <span className="field__opt">(optional)</span>
                  </label>
                  <input
                    className="input"
                    type="password"
                    value={form.password}
                    onChange={up('password')}
                    placeholder="Leave blank for OTP-only login"
                  />
                </div>
              )}
            </div>

            <div className="field">
              <label className="field__label">
                Platform plan <span className="req">*</span>
              </label>
              <Select
                value={form.planId}
                onChange={(v) => set('planId', v)}
                placeholder={plans.length ? 'Choose a plan' : 'No platform plans yet'}
                options={plans.map((p) => ({
                  value: p.id,
                  label: `${p.name} — ₹${p.monthlyPrice.toLocaleString('en-IN')}/mo`,
                }))}
              />
              <p className="field__hint">
                {plans.length
                  ? 'Which platform plan this reseller is subscribed to. Create more under Plans.'
                  : 'Create a platform plan under the Plans tab first — every reseller must be on one.'}
              </p>
            </div>

            <div className="reseller-create__section">Billing details</div>
            <div className="field">
              <label className="field__label">
                Business name <span className="field__opt">(as it should appear on invoices)</span>
              </label>
              <input
                className="input"
                value={form.businessName}
                onChange={up('businessName')}
                placeholder="Acme Digital Services Pvt Ltd"
              />
            </div>
            <div className="field">
              <label className="field__label">
                Address <span className="field__opt">(optional)</span>
              </label>
              <input
                className="input"
                value={form.addressLine1}
                onChange={up('addressLine1')}
                placeholder="Street address"
              />
            </div>
            <div className="field">
              <label className="field__label">
                Address line 2 <span className="field__opt">(optional)</span>
              </label>
              <input
                className="input"
                value={form.addressLine2}
                onChange={up('addressLine2')}
                placeholder="Area, landmark"
              />
            </div>
            <div className="row2">
              <div className="field">
                <label className="field__label">City</label>
                <input className="input" value={form.city} onChange={up('city')} placeholder="Noida" />
              </div>
              <div className="field">
                <label className="field__label">Pincode</label>
                <input
                  className="input"
                  value={form.pincode}
                  onChange={up('pincode')}
                  placeholder="201301"
                  inputMode="numeric"
                />
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

            <div className="reseller-create__section">White-label brand</div>
            <div className="field">
              <label className="field__label">
                Brand name <span className="field__opt">(shown to their clients)</span>
              </label>
              <input className="input" value={form.brandName} onChange={up('brandName')} placeholder="Acme AI" />
            </div>

            <div className="field">
              <label className="field__label">Theme colour</label>
              <div className="swatches">
                {THEME_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`swatch ${form.themeColor === c ? 'swatch--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => set('themeColor', c)}
                    aria-label={`Theme colour ${c}`}
                  >
                    {form.themeColor === c && <CheckIcon size={13} />}
                  </button>
                ))}
                <label className="swatch swatch--custom" title="Custom colour">
                  🎨
                  <input
                    type="color"
                    value={form.themeColor}
                    onChange={(e) => set('themeColor', e.target.value)}
                    aria-label="Custom theme colour"
                  />
                </label>
              </div>
              <p className="field__hint">
                {THEME_COLORS.includes(form.themeColor)
                  ? 'Using the platform default palette.'
                  : `Custom colour ${form.themeColor}.`}
              </p>
            </div>

            <div className="field">
              <label className="field__label">Logo</label>
              <div className="logo-picker">
                {form.logoUrl ? (
                  <img className="logo-picker__img" src={form.logoUrl} alt="Brand logo" />
                ) : (
                  <span className="logo-picker__ph">
                    <CameraIcon size={18} />
                  </span>
                )}
                <div className="logo-picker__text">
                  <button
                    type="button"
                    className="logo-picker__btn"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : form.logoUrl ? 'Replace logo' : 'Upload logo'}
                  </button>
                  <div className="logo-picker__hint">PNG / SVG · under 400 KB</div>
                </div>
                {form.logoUrl && !uploading && (
                  <button type="button" className="logo-picker__remove" onClick={() => set('logoUrl', '')} aria-label="Remove logo">
                    <TrashIcon size={15} />
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickLogo} />
              </div>
            </div>

            <div className="reseller-create__actions">
              <button className="btn" type="submit" disabled={!canSubmit}>
                {busy ? (
                  <span className="spinner" />
                ) : editing ? (
                  <><CheckIcon size={15} /> Save changes</>
                ) : (
                  <><PlusIcon size={15} /> Create reseller</>
                )}
              </button>
              <span className="reseller-create__note">
                {editing
                  ? 'Billing details are used for their invoices and receipts. Domains are managed under Custom Domains.'
                  : 'They sign in with their email — password if you set one above, otherwise OTP only. Map their domain later in Custom Domains.'}
              </span>
            </div>
          </div>

          <aside className="reseller-create__preview">
            <div className="reseller-create__preview-label">Live preview · website home page</div>
            <BrandPreview brandName={form.brandName} themeColor={form.themeColor} logoUrl={form.logoUrl} />
            <p className="reseller-create__preview-note">
              How <b>{form.brandName?.trim() || 'Brand name'}</b>&apos;s home page looks to visitors on their domain.
            </p>
          </aside>
        </div>
      </form>
    </div>
  );
}
