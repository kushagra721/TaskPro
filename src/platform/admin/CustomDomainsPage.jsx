import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import Select from '../../components/Select.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { PlusIcon, LinkIcon, TrashIcon, CheckIcon } from '../../components/icons.jsx';
import { formatDate } from '../../utils/status.js';

const STATUS_LABEL = { AWAITING_DNS: 'Awaiting DNS', VERIFIED_SSL_PENDING: 'Verified · SSL pending', LIVE: 'Live' };
const STATUS_PILL = { AWAITING_DNS: 'status-pill--open', VERIFIED_SSL_PENDING: 'status-pill--open', LIVE: 'status-pill--completed' };

export default function CustomDomainsPage() {
  const [domains, setDomains] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [setupDomain, setSetupDomain] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([platformApi.domains.list(), platformApi.resellers.list()])
      .then(([d, r]) => {
        setDomains(d.domains);
        setResellers(r.resellers);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (id) => {
    await platformApi.domains.remove(id);
    load();
  };

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <h1 className="page__title">Custom Domains</h1>
          <p className="page__subtitle">Map each reseller's brand domain to the platform.</p>
        </div>
        <button className="btn" onClick={() => setCreateOpen(true)}>
          <PlusIcon size={16} /> Add domain
        </button>
      </div>

      {loading ? (
        <div className="screen-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" />
        </div>
      ) : domains.length === 0 ? (
        <EmptyState icon={<LinkIcon size={30} />} title="No custom domains yet" description="Map a reseller's brand domain to route their clients' signups to them." />
      ) : (
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Reseller</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id}>
                  <td className="task-table__name">{d.domain}</td>
                  <td>{d.reseller?.name || '—'}</td>
                  <td><span className={`status-pill ${STATUS_PILL[d.status]}`}>{STATUS_LABEL[d.status]}</span></td>
                  <td className="nowrap">{formatDate(d.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {d.status !== 'LIVE' && (
                      <button className="btn btn--sm" onClick={() => setSetupDomain(d)}>Continue setup</button>
                    )}
                    <button className="icon-btn icon-btn--danger" onClick={() => remove(d.id)} aria-label="Remove domain">
                      <TrashIcon size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <CreateDomainModal
          resellers={resellers}
          onClose={() => setCreateOpen(false)}
          onCreated={(d) => {
            setCreateOpen(false);
            load();
            setSetupDomain(d);
          }}
        />
      )}

      {setupDomain && (
        <DomainSetupModal
          domain={setupDomain}
          onClose={() => setSetupDomain(null)}
          onChanged={(d) => {
            setSetupDomain(d.status === 'LIVE' ? null : d);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateDomainModal({ resellers, onClose, onCreated }) {
  const [domain, setDomain] = useState('');
  const [resellerId, setResellerId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await platformApi.domains.create({ domain, resellerId });
      onCreated(res.domain);
    } catch (err) {
      setError(err.message || 'Could not add the domain');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Which domain?" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <p className="modal__intro">Enter the exact domain the reseller will use, and pick the reseller it belongs to.</p>
        <div className="field">
          <label className="field__label">Domain <span className="req">*</span></label>
          <input className="input" autoFocus value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="app.brandx.com" />
        </div>
        <div className="field">
          <label className="field__label">Reseller <span className="req">*</span></label>
          <Select
            value={resellerId}
            onChange={setResellerId}
            placeholder="Choose a reseller"
            options={resellers.map((r) => ({ value: r.id, label: `${r.brandName || r.name} (${r.loginMobile})` }))}
          />
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn" type="submit" disabled={busy || !domain.trim() || !resellerId}>
            {busy ? <span className="spinner" /> : 'Continue'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DomainSetupModal({ domain, onClose, onChanged }) {
  const [current, setCurrent] = useState(domain);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const checkDns = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await platformApi.domains.checkDns(current.id);
      setCurrent(res.domain);
      if (!res.pointed) setError('DNS is not pointed here yet. Add the A record below and try again.');
    } catch (err) {
      setError(err.message || 'Could not check DNS');
    } finally {
      setBusy(false);
    }
  };

  const activateSsl = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await platformApi.domains.activateSsl(current.id);
      setCurrent(res.domain);
      onChanged(res.domain);
    } catch (err) {
      setError(err.message || 'Could not activate SSL');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={current.domain} onClose={onClose}>
      {error && <div className="alert alert--error">{error}</div>}

      {current.status === 'AWAITING_DNS' && (
        <>
          <p className="modal__intro">In the reseller's DNS provider, add this <strong>A record</strong>, then check again.</p>
          <div className="kv"><span className="kv__k">Type</span><span className="kv__v">A</span></div>
          <div className="kv"><span className="kv__k">Points to (IP)</span><span className="kv__v">{current.targetIp}</span></div>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={onClose}>Close</button>
            <button className="btn" onClick={checkDns} disabled={busy}>
              {busy ? <span className="spinner" /> : 'Check now'}
            </button>
          </div>
        </>
      )}

      {current.status === 'VERIFIED_SSL_PENDING' && (
        <>
          <p className="modal__intro">
            DNS is verified. Issue an SSL certificate so <strong>https://{current.domain}</strong> works.
          </p>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={onClose}>Close</button>
            <button className="btn" onClick={activateSsl} disabled={busy}>
              {busy ? <span className="spinner" /> : (<><CheckIcon size={15} /> Activate SSL</>)}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
