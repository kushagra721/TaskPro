import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { platformApi } from '../../api/client.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Modal from '../../components/Modal.jsx';
import Select from '../../components/Select.jsx';
import {
  ArrowLeftIcon,
  BuildingIcon,
  CheckIcon,
  EditIcon,
  ExternalLinkIcon,
  FolderIcon,
  LinkIcon,
  TrashIcon,
} from '../../components/icons.jsx';
import { formatDate } from '../../utils/status.js';

const DOMAIN_STATUS_LABEL = {
  AWAITING_DNS: 'Awaiting DNS',
  VERIFIED_SSL_PENDING: 'Verified · SSL pending',
  LIVE: 'Live',
  SSL_FAILED: 'SSL failed',
};
const DOMAIN_STATUS_PILL = {
  AWAITING_DNS: 'status-pill--open',
  VERIFIED_SSL_PENDING: 'status-pill--open',
  LIVE: 'status-pill--completed',
  SSL_FAILED: 'status-pill--cancelled',
};

// The two edit popups' field sets. `half: true` pairs a field with the next
// one in a `.row2` — keep the halves adjacent or the pairing breaks.
const ACCOUNT_FIELDS = [
  { key: 'name', label: 'Reseller name', required: true, placeholder: 'Acme Digital' },
  { key: 'brandName', label: 'Brand name', placeholder: 'Acme AI' },
  { key: 'email', label: 'Login email', required: true, type: 'email', placeholder: 'owner@acme.com' },
  { key: 'mobile', label: 'Mobile', placeholder: '9812345678' },
  { key: 'themeColor', label: 'Theme colour', type: 'color' },
];

const BILLING_FIELDS = [
  { key: 'businessName', label: 'Business name', placeholder: 'Acme Digital Services Pvt Ltd' },
  { key: 'addressLine1', label: 'Address', placeholder: 'Street address' },
  { key: 'addressLine2', label: 'Address line 2', placeholder: 'Area, landmark' },
  { key: 'city', label: 'City', half: true, placeholder: 'Noida' },
  { key: 'pincode', label: 'Pincode', half: true, placeholder: '201301' },
  { key: 'state', label: 'State', half: true, placeholder: 'Uttar Pradesh' },
  { key: 'gstin', label: 'GSTIN', half: true, placeholder: '09AABCU9603R1ZM', upper: true },
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
        {field.label} {field.required ? <span className="req">*</span> : <span className="field__opt">(optional)</span>}
      </label>
      {field.type === 'color' ? (
        <div className="pdetail__colour-field">
          <input type="color" value={value || '#6366f1'} onChange={(e) => onChange(e.target.value)} aria-label={field.label} />
          <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#6366f1" />
        </div>
      ) : (
        <input
          className="input"
          type={field.type || 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={field.upper ? { textTransform: 'uppercase' } : undefined}
        />
      )}
    </div>
  );
}

/** Renders a field list, pairing consecutive `half` fields into `.row2` rows. */
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
      rows.push(
        <Field
          key={f.key}
          field={f}
          value={form[f.key]}
          onChange={(v) => onChange(f.key, v)}
            />
      );
    }
  }
  return rows;
}

/** Super Admin's reseller detail page — reached by clicking a row/tile on
 *  ResellersPage. Edit hands off to the shared create/edit form page; Delete is
 *  confirmed here (their client workspaces survive as house/direct — the
 *  Organization FK is ON DELETE SET NULL — which is what the copy explains). */
export default function ResellerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reseller, setReseller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // Which card's edit popup is open ('account' | 'billing' | null). Each one
  // PATCHes only its own fields — the endpoint takes a partial body, so the
  // other card's values are never touched.
  const [section, setSection] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    platformApi.resellers
      .get(id)
      .then((res) => setReseller(res.reseller))
      .catch((err) => setLoadError(err.message || 'Could not load the reseller'))
      .finally(() => setLoading(false));
  }, [id]);

  const openSection = (which) => {
    const fields = which === 'account' ? ACCOUNT_FIELDS : BILLING_FIELDS;
    // `?? ''` on every field: these columns are nullable and a null in a
    // controlled input makes React silently fall back to uncontrolled.
    setForm(Object.fromEntries(fields.map((f) => [f.key, reseller[f.key] ?? ''])));
    setSaveError('');
    setSection(which);
  };

  const saveSection = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const res = await platformApi.resellers.update(id, form);
      // The update endpoint returns the plain shape (no counts/domains), so
      // merge rather than replace or the stats row and domain list blank out.
      setReseller((r) => ({ ...r, ...res.reseller }));
      setSection(null);
    } catch (err) {
      setSaveError(err.message || 'Could not save the changes');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await platformApi.resellers.remove(id);
      navigate('/platform/admin/resellers');
    } catch (err) {
      setDeleteError(err.message || 'Could not delete the reseller');
      setDeleting(false);
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

  if (!reseller) {
    return (
      <div className="page">
        <button className="btn btn--ghost btn--sm back-btn" onClick={() => navigate('/platform/admin/resellers')}>
          <ArrowLeftIcon size={15} /> Back to resellers
        </button>
        <div className="panel platform-list-card">
          <EmptyState icon={<BuildingIcon size={30} />} title="Reseller not found" description={loadError} />
        </div>
      </div>
    );
  }

  const hasBilling =
    reseller.businessName ||
    reseller.addressLine1 ||
    reseller.addressLine2 ||
    reseller.city ||
    reseller.state ||
    reseller.pincode ||
    reseller.gstin;

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm back-btn" onClick={() => navigate('/platform/admin/resellers')}>
        <ArrowLeftIcon size={15} /> Back to resellers
      </button>

      <div className="panel pdetail__head">
        {reseller.logoUrl ? (
          <img className="pdetail__logo" src={reseller.logoUrl} alt="" />
        ) : (
          <span className="pdetail__logo pdetail__logo--mark" style={{ background: reseller.themeColor || 'var(--primary)' }}>
            {(reseller.brandName || reseller.name || '?')[0].toUpperCase()}
          </span>
        )}
        <div className="pdetail__head-text">
          <h2 className="pdetail__title">{reseller.brandName || reseller.name}</h2>
          <p className="pdetail__sub">
            {reseller.brandName ? `${reseller.name} · ` : ''}
            {reseller.email}
          </p>
        </div>
        <span
          className={`status-pill ${reseller.status === 'ACTIVE' ? 'status-pill--completed' : 'status-pill--cancelled'}`}
        >
          {reseller.status}
        </span>
        <div className="pdetail__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/platform/admin/resellers/${id}/edit`)}>
            <EditIcon size={14} /> Edit
          </button>
          <button className="btn btn--danger btn--sm" onClick={() => setConfirming(true)}>
            <TrashIcon size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="platform-stats platform-stats--3">
        <div className="platform-stat">
          <span className="platform-stat__icon">
            <BuildingIcon size={19} />
          </span>
          <div>
            <div className="platform-stat__label">Workspaces</div>
            <div className="platform-stat__value">{reseller.workspaceCount}</div>
          </div>
        </div>
        <div className="platform-stat">
          <span className="platform-stat__icon">
            <LinkIcon size={19} />
          </span>
          <div>
            <div className="platform-stat__label">Domains</div>
            <div className="platform-stat__value">{reseller.domainCount}</div>
          </div>
        </div>
        <div className="platform-stat">
          <span className="platform-stat__icon">
            <FolderIcon size={19} />
          </span>
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
            <Row label="Reseller name" value={reseller.name} />
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
            <Row label="Created" value={formatDate(reseller.createdAt)} />
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
          {hasBilling ? (
            <dl className="pdetail__list">
              <Row label="Business name" value={reseller.businessName} />
              <Row label="Address" value={reseller.addressLine1} />
              <Row label="Address line 2" value={reseller.addressLine2} />
              <Row label="City" value={reseller.city} />
              <Row label="State" value={reseller.state} />
              <Row label="Pincode" value={reseller.pincode} />
              <Row label="GSTIN" value={reseller.gstin} />
            </dl>
          ) : (
            <EmptyState
              icon={<EditIcon size={26} />}
              title="No billing details yet"
              description="Add their business name, address and GSTIN so invoices have a bill-to block."
            />
          )}
        </div>
      </div>

      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <div className="platform-list-card__title-row">
              <h3 className="platform-list-card__title">Domains</h3>
              <span className="tab__count">{reseller.domains.length}</span>
            </div>
          </div>
          <div className="platform-list-card__actions">
            <button className="btn btn--sm btn--ghost" onClick={() => navigate('/platform/admin/domains')}>
              Manage domains
            </button>
          </div>
        </div>
        {reseller.domains.length === 0 ? (
          <EmptyState
            icon={<LinkIcon size={26} />}
            title="No domains mapped"
            description="Map a brand domain so this reseller's clients sign up under their own hostname."
          />
        ) : (
          <ul className="pdetail__domains">
            {reseller.domains.map((d) => (
              <li key={d.id}>
                <button className="pdetail__domain-name" onClick={() => navigate(`/platform/admin/domains/${d.id}`)}>
                  {d.domain}
                </button>
                <span className={`status-pill ${DOMAIN_STATUS_PILL[d.status]}`}>{DOMAIN_STATUS_LABEL[d.status]}</span>
                {d.status === 'LIVE' && (
                  <a className="domain-open-link" href={`https://${d.domain}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon size={12} /> Open
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {section && (
        <Modal
          title={section === 'account' ? 'Edit account' : 'Edit billing details'}
          onClose={() => setSection(null)}
        >
          <form onSubmit={saveSection}>
            {saveError && <div className="alert alert--error">{saveError}</div>}
            {section === 'account' && form.email !== reseller.email && (
              <div className="alert alert--warn">
                Changing the email also changes the address this reseller signs in with.
              </div>
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
              <button
                className="btn"
                type="submit"
                disabled={saving || (section === 'account' && (!form.name?.trim() || !form.email?.trim()))}
              >
                {saving ? <span className="spinner" /> : <><CheckIcon size={15} /> Save changes</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirming && (
        <ConfirmModal
          title="Delete this reseller?"
          confirmLabel="Delete reseller"
          busy={deleting}
          error={deleteError}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        >
          <p className="modal__intro">
            <strong>{reseller.brandName || reseller.name}</strong> and their sign-in account will be deleted, along with
            their {reseller.domainCount} mapped domain{reseller.domainCount === 1 ? '' : 's'} and {reseller.planCount}{' '}
            plan{reseller.planCount === 1 ? '' : 's'}.
          </p>
          <p className="modal__intro">
            Their {reseller.workspaceCount} client workspace{reseller.workspaceCount === 1 ? '' : 's'} will{' '}
            <strong>not</strong> be deleted — they stay live as house/direct clients. This can&apos;t be undone.
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}
