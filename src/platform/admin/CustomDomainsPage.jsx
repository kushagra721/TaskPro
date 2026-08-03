import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformApi } from '../../api/client.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Fab from '../../components/Fab.jsx';
import { PlusIcon, LinkIcon, TrashIcon, RotateIcon, ExternalLinkIcon, ArrowRightIcon } from '../../components/icons.jsx';
import { formatDate } from '../../utils/status.js';

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

export default function CustomDomainsPage() {
  const navigate = useNavigate();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  // The domain pending deletion — also what gates the confirm modal open.
  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = (spinner) => {
    spinner(true);
    platformApi.domains
      .list()
      .then((res) => setDomains(res.domains))
      .finally(() => spinner(false));
  };

  useEffect(() => load(setLoading), []);

  const askRemove = (e, d) => {
    // The row itself opens the detail page — don't navigate on a delete click.
    e.stopPropagation();
    setDeleteError('');
    setTarget(d);
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await platformApi.domains.remove(target.id);
      setTarget(null);
      load(setReloading);
    } catch (err) {
      setDeleteError(err.message || 'Could not remove the domain');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <div className="platform-list-card__title-row">
              <h2 className="platform-list-card__title">Custom Domains</h2>
              {!loading && <span className="tab__count">{domains.length}</span>}
            </div>
            <p className="platform-list-card__subtitle">
              Map each reseller's brand domain to the platform, verify DNS, and issue free SSL — step by step.
            </p>
          </div>
          <div className="platform-list-card__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => load(setReloading)} disabled={loading || reloading}>
              <RotateIcon size={15} className={reloading ? 'spin' : ''} /> Reload
            </button>
            <button className="btn btn--sm hide-mobile" onClick={() => navigate('/platform/admin/domains/new')}>
              <PlusIcon size={16} /> Add domain
            </button>
          </div>
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : domains.length === 0 ? (
          <EmptyState
            icon={<LinkIcon size={30} />}
            title="No custom domains yet"
            description="Map a reseller's brand domain to route their clients' signups to them."
          />
        ) : (
          <>
            <div className="table-wrap task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Company code</th>
                    <th>Reseller</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((d) => (
                    <tr
                      key={d.id}
                      className="row-clickable"
                      onClick={() => navigate(`/platform/admin/domains/${d.id}`)}
                    >
                      <td>
                        <div className="task-table__name">{d.domain}</div>
                        {d.status === 'LIVE' && (
                          <a
                            className="domain-open-link"
                            href={`https://${d.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLinkIcon size={12} /> Open
                          </a>
                        )}
                      </td>
                      <td><code className="code-chip">{d.companyCode}</code></td>
                      <td>{d.reseller?.name || '—'}</td>
                      <td><span className={`status-pill ${STATUS_PILL[d.status]}`}>{STATUS_LABEL[d.status]}</span></td>
                      <td className="nowrap">{formatDate(d.createdAt)}</td>
                      <td className="table-actions">
                        {d.status !== 'LIVE' && (
                          <button
                            className="btn btn--sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/platform/admin/domains/${d.id}/setup`);
                            }}
                          >
                            Continue setup <ArrowRightIcon size={14} />
                          </button>
                        )}
                        {/* <button
                          className="icon-btn icon-btn--danger"
                          onClick={(e) => askRemove(e, d)}
                          aria-label="Remove domain"
                        >
                          <TrashIcon size={15} />
                        </button> */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="task-cards">
              {domains.map((d) => (
                <div
                  key={d.id}
                  className="tcard row-clickable"
                  onClick={() => navigate(`/platform/admin/domains/${d.id}`)}
                >
                  <div className="tcard__row">
                    <div className="tcard__title">{d.domain}</div>
                    <span className={`status-pill ${STATUS_PILL[d.status]} tcard__del`}>{STATUS_LABEL[d.status]}</span>
                  </div>
                  <div className="tcard__tags">
                    <span><code className="code-chip">{d.companyCode}</code></span>
                    <span>{d.reseller?.name || 'No reseller'}</span>
                    {d.status === 'LIVE' && (
                      <a
                        className="domain-open-link"
                        href={`https://${d.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLinkIcon size={12} /> Open
                      </a>
                    )}
                  </div>
                  <div className="tcard__foot">
                    <span className="nowrap muted">{formatDate(d.createdAt)}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {d.status !== 'LIVE' && (
                        <button
                          className="btn btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/platform/admin/domains/${d.id}/setup`);
                          }}
                        >
                          Continue <ArrowRightIcon size={14} />
                        </button>
                      )}
                      <button
                        className="icon-btn icon-btn--danger"
                        onClick={(e) => askRemove(e, d)}
                        aria-label="Remove domain"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {target && (
        <ConfirmModal
          title="Remove this domain?"
          confirmLabel="Remove domain"
          message={`${target.domain} will stop routing signups to ${target.reseller?.name || 'its reseller'}. Existing workspaces are unaffected. This can't be undone.`}
          busy={deleting}
          error={deleteError}
          onConfirm={remove}
          onClose={() => setTarget(null)}
        />
      )}

      <Fab onClick={() => navigate('/platform/admin/domains/new')} label="Add domain" raised />
    </div>
  );
}
