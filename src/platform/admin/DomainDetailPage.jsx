import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { platformApi } from '../../api/client.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Modal from '../../components/Modal.jsx';
import Select from '../../components/Select.jsx';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EditIcon,
  ExternalLinkIcon,
  LinkIcon,
  TrashIcon,
} from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/status.js';

const STATUS_LABEL = {
  AWAITING_DNS: 'Awaiting DNS',
  VERIFIED_SSL_PENDING: 'Verified · SSL pending',
  LIVE: 'Live',
  SSL_FAILED: 'SSL failed',
};
const STATUS_PILL = {
  AWAITING_DNS: 'status-pill--open',
  VERIFIED_SSL_PENDING: 'status-pill--open',
  LIVE: 'status-pill--completed',
  SSL_FAILED: 'status-pill--cancelled',
};
const STATUS_NOTE = {
  AWAITING_DNS: "Waiting for the domain's A record to point at us. Continue setup to check it.",
  VERIFIED_SSL_PENDING: 'DNS is verified. Continue setup to issue the SSL certificate.',
  LIVE: 'DNS is verified and HTTPS is bound — clients can sign up on this domain.',
  SSL_FAILED: 'SSL issuance failed on the last attempt. Continue setup to retry it.',
};

function Row({ label, value }) {
  return (
    <div className="pdetail__row">
      <dt>{label}</dt>
      <dd>{value || <span className="muted">—</span>}</dd>
    </div>
  );
}

/** Super Admin's custom-domain detail page. Edit is a small modal (only two
 *  fields — hostname and owning reseller), unlike the reseller's full-page
 *  form. Renaming the hostname resets it to AWAITING_DNS server-side, which is
 *  what the modal's warning copy tells the user before they confirm. */
export default function DomainDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [domain, setDomain] = useState(null);
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ domain: '', resellerId: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    platformApi.domains
      .get(id)
      .then((res) => setDomain(res.domain))
      .catch((err) => setLoadError(err.message || 'Could not load the domain'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    platformApi.resellers.list().then((r) => setResellers(r.resellers));
  }, []);

  const openEdit = () => {
    setForm({ domain: domain.domain, resellerId: domain.resellerId });
    setSaveError('');
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const res = await platformApi.domains.update(id, form);
      setDomain(res.domain);
      setEditing(false);
    } catch (err) {
      setSaveError(err.message || 'Could not save the domain');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await platformApi.domains.remove(id);
      navigate('/platform/admin/domains');
    } catch (err) {
      setDeleteError(err.message || 'Could not remove the domain');
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

  if (!domain) {
    return (
      <div className="page">
        <button className="btn btn--ghost btn--sm back-btn" onClick={() => navigate('/platform/admin/domains')}>
          <ArrowLeftIcon size={15} /> Back to domains
        </button>
        <div className="panel platform-list-card">
          <EmptyState icon={<LinkIcon size={30} />} title="Domain not found" description={loadError} />
        </div>
      </div>
    );
  }

  const renaming = form.domain.trim().toLowerCase() !== domain.domain;

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm back-btn" onClick={() => navigate('/platform/admin/domains')}>
        <ArrowLeftIcon size={15} /> Back to domains
      </button>

      <div className="panel pdetail__head">
        <span className="pdetail__logo pdetail__logo--mark" style={{ background: 'var(--primary)' }}>
          <LinkIcon size={20} />
        </span>
        <div className="pdetail__head-text">
          <h2 className="pdetail__title">{domain.domain}</h2>
          <p className="pdetail__sub">{domain.reseller?.name || 'No reseller'}</p>
        </div>
        <span className={`status-pill ${STATUS_PILL[domain.status]}`}>{STATUS_LABEL[domain.status]}</span>
        <div className="pdetail__actions">
          {domain.status === 'LIVE' ? (
            <a className="btn btn--ghost btn--sm" href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon size={14} /> Open
            </a>
          ) : (
            <button className="btn btn--sm" onClick={() => navigate(`/platform/admin/domains/${id}/setup`)}>
              Continue setup <ArrowRightIcon size={14} />
            </button>
          )}
          <button className="btn btn--ghost btn--sm" onClick={openEdit}>
            <EditIcon size={14} /> Edit
          </button>
          <button className="btn btn--danger btn--sm" onClick={() => setConfirming(true)}>
            <TrashIcon size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h3 className="platform-list-card__title">Setup</h3>
            <p className="platform-list-card__subtitle">{STATUS_NOTE[domain.status]}</p>
          </div>
        </div>
        <dl className="pdetail__list">
          <Row label="Domain" value={domain.domain} />
          <Row label="Status" value={<span className={`status-pill ${STATUS_PILL[domain.status]}`}>{STATUS_LABEL[domain.status]}</span>} />
          <Row label="Required A record" value={`${domain.domain} → ${domain.targetIp}`} />
          <Row label="Reseller" value={domain.reseller?.name} />
          <Row label="Reseller email" value={domain.reseller?.email} />
          <Row label="Added" value={formatDateTime(domain.createdAt)} />
        </dl>
      </div>

      {editing && (
        <Modal title="Edit domain" onClose={() => setEditing(false)}>
          <form onSubmit={save}>
            {saveError && <div className="alert alert--error">{saveError}</div>}
            <div className="field">
              <label className="field__label">
                Domain <span className="req">*</span>
              </label>
              <input
                className="input"
                autoFocus
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                placeholder="app.brandx.com"
              />
            </div>
            <div className="field">
              <label className="field__label">
                Reseller <span className="req">*</span>
              </label>
              <Select
                value={form.resellerId}
                onChange={(v) => setForm((f) => ({ ...f, resellerId: v }))}
                placeholder="Choose a reseller"
                options={resellers.map((r) => ({ value: r.id, label: `${r.brandName || r.name} (${r.email})` }))}
              />
            </div>
            {renaming && domain.status !== 'AWAITING_DNS' && (
              <div className="alert alert--warn">
                Renaming the hostname resets setup to <strong>Awaiting DNS</strong> — the existing certificate was issued
                for the old name, so DNS and SSL have to be verified again.
              </div>
            )}
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn" type="submit" disabled={saving || !form.domain.trim() || !form.resellerId}>
                {saving ? <span className="spinner" /> : <><CheckIcon size={15} /> Save changes</>}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirming && (
        <ConfirmModal
          title="Remove this domain?"
          confirmLabel="Remove domain"
          message={`${domain.domain} will stop routing signups to ${domain.reseller?.name || 'this reseller'}. Existing workspaces are unaffected. This can't be undone.`}
          busy={deleting}
          error={deleteError}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
