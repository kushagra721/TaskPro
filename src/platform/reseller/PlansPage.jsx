import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import Fab from '../../components/Fab.jsx';
import Switch from '../../components/Switch.jsx';
import { PlusIcon, FolderIcon, RotateIcon, EditIcon, CopyIcon, TrashIcon, CheckIcon, XIcon } from '../../components/icons.jsx';

const limitLabel = (n) => (n === -1 ? 'Unlimited' : n.toLocaleString());
const storageLabel = (mb) => (mb === -1 ? 'Unlimited' : mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 ? 1 : 0)} GB` : `${mb} MB`);
const money = (n) => `₹${n.toLocaleString('en-IN')}`;

const ADD_ONS = [
  { key: 'prioritySupport', label: 'Priority support' },
  { key: 'advancedReports', label: 'Advanced reports' },
  { key: 'stickerSearch', label: 'GIPHY stickers' },
  { key: 'customBranding', label: 'Custom branding' },
];

/** Reseller's "Plans" tab — a real subscription-plan builder for their own
 *  client workspaces (Super Admin has no equivalent; this is Reseller-only,
 *  both in the UI and server-side via requireReseller). Table + edit actions
 *  up top, a public-facing "Plan comparison" card grid below, matching the
 *  reference design's two-section layout. */
export default function PlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  const load = (spinner) => {
    spinner(true);
    platformApi.plans
      .list()
      .then((res) => setPlans(res.plans))
      .finally(() => spinner(false));
  };

  useEffect(() => {
    load(setLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleActive = (plan) => {
    const next = !plan.isActive;
    setPlans((ps) => ps.map((p) => (p.id === plan.id ? { ...p, isActive: next } : p)));
    platformApi.plans.update(plan.id, { isActive: next }).catch(() => load(setLoading));
  };

  const duplicate = (plan) => {
    platformApi.plans.duplicate(plan.id).then(() => load(setLoading));
  };

  const remove = (plan) => {
    platformApi.plans.remove(plan.id).then(() => load(setLoading));
  };

  const comparisonPlans = plans.filter((p) => p.isPublic && p.isActive);

  return (
    <div className="page">
      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h2 className="platform-list-card__title">Plans</h2>
            <p className="platform-list-card__subtitle">Create and manage subscription plans.</p>
          </div>
          <div className="platform-list-card__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => load(setReloading)} disabled={loading || reloading}>
              <RotateIcon size={15} className={reloading ? 'spin' : ''} /> Reload
            </button>
            <button className="btn btn--sm hide-mobile" onClick={() => navigate('/platform/reseller/plans/new')}>
              <PlusIcon size={16} /> New plan
            </button>
          </div>
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={<FolderIcon size={30} />}
            title="No plans yet"
            description="Create your first subscription plan — it'll show up here and on the comparison cards below."
          />
        ) : (
          <>
            <div className="table-wrap task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Monthly</th>
                    <th>Yearly</th>
                    {/* <th>Users</th> */}
                    <th>Tasks / Active user</th>
                    <th>Storage / Active user</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="task-table__name">{p.name}</div>
                        {p.description && <div className="muted" style={{ fontSize: 12.5 }}>{p.description}</div>}
                      </td>
                      <td>{money(p.monthlyPrice)}</td>
                      <td>{money(p.yearlyPrice)}</td>
                      {/* <td>{limitLabel(p.maxUsers)}</td> */}
                      <td>{limitLabel(p.maxTasksPerUser)}</td>
                      <td>{storageLabel(p.maxStorageMbPerUser)}</td>
                      <td>
                        <span className={`status-pill ${p.isActive ? 'status-pill--completed' : 'status-pill--neutral'}`}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-actions">
                        <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/platform/reseller/plans/${p.id}/edit`)}>
                          <EditIcon size={14} /> Edit
                        </button>
                        <button className="icon-btn" onClick={() => duplicate(p)} aria-label="Duplicate plan">
                          <CopyIcon size={15} />
                        </button>
                        <Switch checked={p.isActive} onChange={() => toggleActive(p)} />
                        <button className="icon-btn icon-btn--danger" onClick={() => remove(p)} aria-label="Delete plan">
                          <TrashIcon size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="task-cards">
              {plans.map((p) => (
                <div key={p.id} className="tcard">
                  <div className="tcard__row">
                    <div className="tcard__title">{p.name}</div>
                    <span className={`status-pill ${p.isActive ? 'status-pill--completed' : 'status-pill--neutral'} tcard__del`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="tcard__sub">{p.description || ' '}</div>
                  <div className="tcard__tags">
                    <span>{money(p.monthlyPrice)}/mo</span>
                    <span>{money(p.yearlyPrice)}/yr</span>
                    <span>{limitLabel(p.maxUsers)} users</span>
                  </div>
                  <div className="tcard__foot">
                    <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/platform/reseller/plans/${p.id}/edit`)}>
                      <EditIcon size={14} /> Edit
                    </button>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button className="icon-btn" onClick={() => duplicate(p)} aria-label="Duplicate plan">
                        <CopyIcon size={15} />
                      </button>
                      <Switch checked={p.isActive} onChange={() => toggleActive(p)} />
                      <button className="icon-btn icon-btn--danger" onClick={() => remove(p)} aria-label="Delete plan">
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

      {comparisonPlans.length > 0 && (
        <div className="plan-compare">
          <h3 className="plan-compare__title">Plan comparison</h3>
          <div className="plan-compare__grid">
            {comparisonPlans.map((p) => {
              const bullets = (p.featureBullets || '').split('\n').map((l) => l.trim()).filter(Boolean);
              const addOns = ADD_ONS.filter((a) => p[a.key]).map((a) => a.label);
              return (
                <div key={p.id} className="landing__pricing-card">
                  <div className="landing__pricing-card-name">{p.name}</div>
                  <div className="landing__pricing-card-price">
                    {money(p.monthlyPrice)}
                    <span>/mo</span>
                  </div>
                  {bullets.length > 0 && (
                    <ul className="landing__pricing-list">
                      {bullets.map((b, i) => (
                        <li key={i}>
                          <span className="landing__pricing-check">
                            <CheckIcon size={14} />
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  <dl className="plan-spec-table">
                    {/* <div className="plan-spec-table__row">
                      <dt>Users</dt>
                      <dd>{limitLabel(p.maxUsers)}</dd>
                    </div> */}
                    <div className="plan-spec-table__row">
                      <dt>Tasks / Active user</dt>
                      <dd>{limitLabel(p.maxTasksPerUser)}</dd>
                    </div>
                    <div className="plan-spec-table__row">
                      <dt>Storage / Active user</dt>
                      <dd>{storageLabel(p.maxStorageMbPerUser)}</dd>
                    </div>
                    <div className="plan-spec-table__row">
                      <dt>Data export</dt>
                      <dd>
                        {p.dataExport ? (
                          <CheckIcon size={14} className="plan-spec-table__check" />
                        ) : (
                          <XIcon size={14} className="plan-spec-table__x" />
                        )}
                      </dd>
                    </div>
                    <div className="plan-spec-table__row">
                      <dt>API access</dt>
                      <dd>
                        {p.apiAccess ? (
                          <CheckIcon size={14} className="plan-spec-table__check" />
                        ) : (
                          <XIcon size={14} className="plan-spec-table__x" />
                        )}
                      </dd>
                    </div>
                    <div className="plan-spec-table__row">
                      <dt>Add-ons</dt>
                      <dd>{addOns.length > 0 ? addOns.join(', ') : '—'}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Fab onClick={() => navigate('/platform/reseller/plans/new')} label="New plan" raised />
    </div>
  );
}
