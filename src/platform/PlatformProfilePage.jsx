import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { platformApi } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import Select from '../components/Select.jsx';
import { platformLogout, selectPlatformUser } from '../store/slices/platformAuthSlice.js';
import { BuildingIcon, CheckIcon, EditIcon, FolderIcon, LinkIcon, LogoutIcon } from '../components/icons.jsx';
import { formatDate } from '../utils/status.js';

const ROLE_LABEL = { SUPER_ADMIN: 'Super Admin', RESELLER: 'Reseller' };

// Same two field sets as the Super Admin's reseller detail page, so a reseller
// edits exactly what an admin would edit for them — minus `status`, which is
// not a self-service action.
const ACCOUNT_FIELDS = [
  { key: 'name', label: 'Contact name', required: true },
  { key: 'brandName', label: 'Brand name', required: true, hint: 'Shown to your clients' },
  { key: 'email', label: 'Login email', required: true, type: 'email' },
  { key: 'mobile', label: 'Mobile', required: true },
];

const BILLING_FIELDS = [
  { key: 'businessName', label: 'Business name', required: true },
  { key: 'addressLine1', label: 'Address', required: true },
  { key: 'addressLine2', label: 'Address line 2' },
  { key: 'city', label: 'City', required: true, half: true },
  { key: 'pincode', label: 'Pincode', required: true, half: true },
  { key: 'state', label: 'State', required: true, half: true },
  { key: 'gstin', label: 'GSTIN', half: true, upper: true },
];

const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

function Row({ label, value }) {
  return (
    <div className="pdetail__row">
      <dt>{label}</dt>
      <dd>{value || <span className="muted">—</span>}</dd>
    </div>
  );
}

function Field({ field, value, onChange }) {
  return (
    <div className="field">
      <label className="field__label">
        {field.label}{' '}
        {field.required ? <span className="req">*</span> : <span className="field__opt">(optional)</span>}
      </label>
      {field.key === 'state' ? (
        <Select value={value} onChange={onChange} placeholder="Choose a state" options={STATES.map((s) => ({ value: s, label: s }))} />
      ) : (
        <input
          className="input"
          type={field.type || 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={field.upper ? { textTransform: 'uppercase' } : undefined}
        />
      )}
      {field.hint && <p className="field__hint">{field.hint}</p>}
    </div>
  );
}

/** Pairs consecutive `half` fields into `.row2` rows. */
function FieldList({ fields, form, onChange }) {
  const rows = [];
  for (let i = 0; i < fields.length; i += 1) {
    const f = fields[i];
    const next = fields[i + 1];
    if (f.half && next?.half) {
      rows.push(
        <div className="row2" key={f.key}>
          <Field field={f} value={form[f.key]} onChange={(v) => onChange(f.key, v)} />
          <Field field={next} value={form[next.key]} onChange={(v) => onChange(next.key, v)} />
        </div>
      );
      i += 1;
    } else {
      rows.push(<Field key={f.key} field={f} value={form[f.key]} onChange={(v) => onChange(f.key, v)} />);
    }
  }
  return rows;
}

/**
 * The signed-in platform account's own profile — the reseller-side equivalent of
 * the client app's My Profile, with **Account** and **Billing details** as
 * separate cards, each with its own edit popup (same shape as the Super Admin's
 * reseller detail page, so the two never drift).
 *
 * A Super Admin has no `Reseller` record, so they see the identity card and
 * sign-out only; everything below is reseller-specific.
 */
export default function PlatformProfilePage() {
  const dispatch = useDispatch();
  const platformUser = useSelector(selectPlatformUser);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState(null); // 'account' | 'billing' | null
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    platformApi.profile
      .get()
      .then((res) => setProfile(res.profile))
      .catch((err) => setError(err.message || 'Could not load your profile'))
      .finally(() => setLoading(false));
  }, []);

  const reseller = profile?.reseller;

  const openSection = (which) => {
    const fields = which === 'account' ? ACCOUNT_FIELDS : BILLING_FIELDS;
    // `?? ''` on every field — these columns are nullable, and a null in a
    // controlled input makes React fall back to uncontrolled.
    setForm(Object.fromEntries(fields.map((f) => [f.key, reseller?.[f.key] ?? ''])));
    setError('');
    setSection(which);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await platformApi.profile.update(form);
      // Merge — the update response has no counts, so a replace would blank
      // the stat cards.
      setProfile((p) => ({ ...p, reseller: { ...p.reseller, ...res.reseller } }));
      setSection(null);
    } catch (err) {
      setError(err.message || 'Could not save your changes');
    } finally {
      setSaving(false);
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

  const displayName = reseller?.brandName || reseller?.name || platformUser?.name;
  const hasBilling = reseller && (reseller.businessName || reseller.addressLine1 || reseller.city);

  return (
    <div className="page">
      <div className="panel pdetail__head">
        {reseller?.logoUrl ? (
          <img className="pdetail__logo" src={reseller.logoUrl} alt="" />
        ) : (
          <span className="pdetail__logo pdetail__logo--mark" style={{ background: reseller?.themeColor || 'var(--primary)' }}>
            {(displayName || '?')[0].toUpperCase()}
          </span>
        )}
        <div className="pdetail__head-text">
          <h2 className="pdetail__title">{displayName}</h2>
          <p className="pdetail__sub">{profile?.email}</p>
        </div>
        <span className="status-pill status-pill--completed">{ROLE_LABEL[profile?.role] || profile?.role}</span>
        <div className="pdetail__actions">
          <button type="button" className="btn btn--danger btn--sm" onClick={() => dispatch(platformLogout())}>
            <LogoutIcon size={15} /> Sign out
          </button>
        </div>
      </div>

      {error && !section && <div className="alert alert--error">{error}</div>}

      {!reseller ? (
        <div className="panel platform-list-card">
          <p className="platform-list-card__subtitle" style={{ margin: 0 }}>
            Super Admin accounts have no reseller record, so there are no branding or billing details to manage here.
          </p>
        </div>
      ) : (
        <>
          <div className="platform-stats platform-stats--3">
            <div className="platform-stat">
              <span className="platform-stat__icon"><BuildingIcon size={19} /></span>
              <div>
                <div className="platform-stat__label">Workspaces</div>
                <div className="platform-stat__value">{reseller.workspaceCount}</div>
              </div>
            </div>
            <div className="platform-stat">
              <span className="platform-stat__icon"><LinkIcon size={19} /></span>
              <div>
                <div className="platform-stat__label">Domains</div>
                <div className="platform-stat__value">{reseller.domainCount}</div>
              </div>
            </div>
            <div className="platform-stat">
              <span className="platform-stat__icon"><FolderIcon size={19} /></span>
              <div>
                <div className="platform-stat__label">Plans</div>
                <div className="platform-stat__value">{reseller.planCount}</div>
              </div>
            </div>
          </div>

          <div className="pdetail__grid">
            <div className="panel platform-list-card pdetail__card">
              <div className="platform-list-card__head">
                <div className="platform-list-card__head-text">
                  <h3 className="platform-list-card__title">Account</h3>
                </div>
                <div className="platform-list-card__actions">
                  <button className="btn btn--ghost btn--sm" onClick={() => openSection('account')}>
                    <EditIcon size={14} /> Edit
                  </button>
                </div>
              </div>
              <dl className="pdetail__list">
                <Row label="Contact name" value={reseller.name} />
                <Row label="Brand name" value={reseller.brandName} />
                <Row label="Login email" value={reseller.email} />
                <Row label="Mobile" value={reseller.mobile} />
                <Row
                  label="Theme colour"
                  value={
                    reseller.themeColor && (
                      <span className="pdetail__colour">
                        <span className="pdetail__swatch" style={{ background: reseller.themeColor }} />
                        {reseller.themeColor}
                      </span>
                    )
                  }
                />
                <Row label="Joined" value={formatDate(reseller.createdAt)} />
              </dl>
            </div>

            <div className="panel platform-list-card pdetail__card">
              <div className="platform-list-card__head">
                <div className="platform-list-card__head-text">
                  <h3 className="platform-list-card__title">Billing details</h3>
                </div>
                <div className="platform-list-card__actions">
                  <button className="btn btn--ghost btn--sm" onClick={() => openSection('billing')}>
                    <EditIcon size={14} /> Edit
                  </button>
                </div>
              </div>
              {/* These print as the "billed from" block on every invoice your
                  clients receive — worth saying, so they're kept accurate. */}
              <p className="platform-list-card__subtitle" style={{ marginTop: -4 }}>
                These appear as the seller on every invoice your clients receive.
              </p>
              <dl className="pdetail__list">
                {hasBilling ? (
                  <>
                    <Row label="Business name" value={reseller.businessName} />
                    <Row label="Address" value={reseller.addressLine1} />
                    <Row label="Address line 2" value={reseller.addressLine2} />
                    <Row label="City" value={reseller.city} />
                    <Row label="State" value={reseller.state} />
                    <Row label="Pincode" value={reseller.pincode} />
                    <Row label="GSTIN" value={reseller.gstin} />
                  </>
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    Not added yet — your clients&apos; invoices will have no seller address until you add them.
                  </p>
                )}
              </dl>
            </div>
          </div>
        </>
      )}

      {section && (
        <Modal
          title={section === 'account' ? 'Edit account' : 'Edit billing details'}
          onClose={() => setSection(null)}
        >
          <form onSubmit={save}>
            {error && <div className="alert alert--error">{error}</div>}
            {section === 'account' && form.email !== reseller?.email && (
              <div className="alert alert--warn">Changing the email also changes the address you sign in with.</div>
            )}
            <FieldList
              fields={section === 'account' ? ACCOUNT_FIELDS : BILLING_FIELDS}
              form={form}
              onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
            />
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setSection(null)} disabled={saving}>
                Cancel
              </button>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? <span className="spinner" /> : (<><CheckIcon size={15} /> Save changes</>)}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
