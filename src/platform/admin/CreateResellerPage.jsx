import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformApi } from '../../api/client.js';
import BrandPreview from '../BrandPreview.jsx';
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

/** Full-page "Create a reseller" — deliberately a page, not a modal, because the
 *  white-label branding fields are only meaningful next to the live preview of the
 *  reseller's home page, which needs the room. */
export default function CreateResellerPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    brandName: '',
    themeColor: THEME_COLORS[0],
    logoUrl: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      await platformApi.resellers.create(form);
      navigate('/platform/admin/resellers');
    } catch (err) {
      setError(err.message || 'Could not create the reseller');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = form.name.trim() && form.email.trim() && !busy && !uploading;

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm back-btn" onClick={() => navigate('/platform/admin/resellers')}>
        <ArrowLeftIcon size={15} /> Back to resellers
      </button>

      <form className="reseller-create" onSubmit={submit}>
        <div className="reseller-create__head">
          <h1 className="reseller-create__title">Create a reseller</h1>
          <p className="reseller-create__sub">
            Set up their login and white-label look in one step. Branding is optional — you can change it anytime.
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
                {busy ? <span className="spinner" /> : <><PlusIcon size={15} /> Create reseller</>}
              </button>
              <span className="reseller-create__note">
                They sign in with their email — password if you set one above, otherwise OTP only. Map their domain later in Custom Domains.
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
