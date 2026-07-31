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
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        const { password, ...rest } = form;
        await platformApi.resellers.update(id, rest);
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

  /*
   * Everything a reseller needs to actually operate is required at creation:
   * they must be able to sign in (password), be contactable (mobile), be shown
   * to their clients (brand name) and raise a compliant invoice (the billing
   * block, which prints as the "billed from" on every client invoice). Mirrors
   * `createResellerSchema` server-side — the form just avoids a round trip.
   *
   * On edit, `password` is absent from the contract entirely, so it's excluded.
   */
  const REQUIRED = ['name', 'email', 'mobile', 'brandName', 'businessName', 'addressLine1', 'city', 'state', 'pincode'];
  const missing = REQUIRED.filter((k) => !String(form[k] || '').trim());
  if (!editing && form.password.trim().length < 6) missing.push('password');
  const canSubmit = missing.length === 0 && !busy && !uploading;
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
                  Contact name <span className="req">*</span>
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
                  Mobile <span className="req">*</span>
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
                    Password <span className="req">*</span>
                  </label>
                  <input
                    className="input"
                    type="password"
                    value={form.password}
                    onChange={up('password')}
                    placeholder="At least 6 characters"
                  />
                </div>
              )}
            </div>

            <div className="reseller-create__section">Billing details</div>
            <div className="field">
              <label className="field__label">
                Business name <span className="req">*</span>
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
                Address <span className="req">*</span>
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
                <label className="field__label">City <span className="req">*</span></label>
                <input className="input" value={form.city} onChange={up('city')} placeholder="Noida" />
              </div>
              <div className="field">
                <label className="field__label">Pincode <span className="req">*</span></label>
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

            <div className="reseller-create__section">White-label brand</div>
            <div className="field">
              <label className="field__label">
                Brand name <span className="req">*</span>
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
                  ? 'Billing details print as the seller on every invoice their clients receive. Domains are managed under Custom Domains.'
                  : 'They sign in with this email and password. Their billing details print as the seller on every invoice their clients receive.'}
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
