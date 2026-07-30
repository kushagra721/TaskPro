import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { platformApi } from '../api/client.js';
import { plansBase } from './plansBase.js';
import Switch from '../components/Switch.jsx';
import { ArrowLeftIcon, PlusIcon } from '../components/icons.jsx';

const DEFAULT_FORM = {
  name: '',
  displayOrder: 0,
  description: '',
  monthlyPrice: 0,
  yearlyPrice: 0,
  maxTasksPerUser: -1,
  maxStorageMbPerUser: -1,
  dataExport: false,
  apiAccess: false,
  prioritySupport: false,
  advancedReports: false,
  stickerSearch: false,
  customBranding: false,
  featureBullets: '',
  isPublic: true,
  isActive: true,
};

const ADD_ONS = [
  { key: 'prioritySupport', label: 'Priority support' },
  { key: 'advancedReports', label: 'Advanced reports' },
  { key: 'stickerSearch', label: 'GIPHY stickers' },
  { key: 'customBranding', label: 'Custom branding' },
];

/** Full-page create/edit form — deliberately not a modal (per explicit
 *  instruction), mirroring the platform's other full-page forms
 *  (`CreateResellerPage.jsx`). Serves **four** routes: `plans/new` and
 *  `plans/:planId/edit` under each of the two portals (a Super Admin editing a
 *  global plan, a Reseller editing their own). The fields are identical and the
 *  API scopes by role, so the only difference is the URL prefix, derived from
 *  the pathname via `plansBase`. In edit mode the plan is loaded via the list
 *  endpoint (no dedicated get-by-id route, same convention `AddDomainPage.jsx`
 *  already uses) and pre-fills the form. */
export default function CreatePlanPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = plansBase(pathname);
  const { planId } = useParams();
  const isEdit = Boolean(planId);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    platformApi.plans
      .list()
      .then((res) => {
        const plan = res.plans.find((p) => p.id === planId);
        if (!plan) {
          setError('Plan not found');
          return;
        }
        setForm({
          name: plan.name,
          displayOrder: plan.displayOrder,
          description: plan.description || '',
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          maxTasksPerUser: plan.maxTasksPerUser,
          maxStorageMbPerUser: plan.maxStorageMbPerUser,
          dataExport: plan.dataExport,
          apiAccess: plan.apiAccess,
          prioritySupport: plan.prioritySupport,
          advancedReports: plan.advancedReports,
          stickerSearch: plan.stickerSearch,
          customBranding: plan.customBranding,
          featureBullets: plan.featureBullets || '',
          isPublic: plan.isPublic,
          isActive: plan.isActive,
        });
      })
      .finally(() => setLoading(false));
  }, [isEdit, planId]);

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const upNum = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value === '' ? 0 : Number(e.target.value) }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { ...form, description: form.description.trim(), featureBullets: form.featureBullets.trim() };
      if (isEdit) {
        await platformApi.plans.update(planId, payload);
      } else {
        await platformApi.plans.create(payload);
      }
      navigate(base);
    } catch (err) {
      setError(err.message || 'Could not save the plan');
    } finally {
      setBusy(false);
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

  return (
    <div className="page">
      <button className="btn btn--ghost btn--sm back-btn" onClick={() => navigate(base)}>
        <ArrowLeftIcon size={15} /> Back to plans
      </button>

      <form className="reseller-create plan-form" onSubmit={submit}>
        <div className="reseller-create__head">
          <h1 className="reseller-create__title">{isEdit ? 'Edit plan' : 'New plan'}</h1>
          <p className="reseller-create__sub">Prices are in rupees; usage limits use -1 for unlimited.</p>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="row2">
          <div className="field">
            <label className="field__label">
              Name <span className="req">*</span>
            </label>
            <input className="input" autoFocus value={form.name} onChange={up('name')} placeholder="Standard" />
          </div>
          <div className="field">
            <label className="field__label">Display order</label>
            <input className="input" type="number" value={form.displayOrder} onChange={upNum('displayOrder')} />
          </div>
        </div>

        <div className="field">
          <label className="field__label">Description</label>
          <textarea
            className="input textarea"
            rows={2}
            value={form.description}
            onChange={up('description')}
            placeholder="Unlimited users with import, export…"
          />
        </div>

        <div className="row2">
          <div className="field">
            <label className="field__label">Monthly price (₹)</label>
            <input className="input" type="number" min="0" value={form.monthlyPrice} onChange={upNum('monthlyPrice')} />
          </div>
          <div className="field">
            <label className="field__label">Yearly price (₹)</label>
            <input className="input" type="number" min="0" value={form.yearlyPrice} onChange={upNum('yearlyPrice')} />
          </div>
        </div>

        <div className="reseller-create__section">Usage limits</div>
        {/* There is deliberately NO seat cap — a plan never limits how many
            members a workspace may have. Both allowances below are per active
            member, so a bigger team simply gets more. */}
        <p className="field__hint">
          Per active member — a workspace&apos;s allowance grows with its team. Use -1 for unlimited. Plans don&apos;t
          cap how many members a workspace can have.
        </p>
        <div className="row2">
          <div className="field">
            <label className="field__label">Tasks / active member</label>
            <input className="input" type="number" value={form.maxTasksPerUser} onChange={upNum('maxTasksPerUser')} />
            <p className="field__hint">-1 = unlimited</p>
          </div>
          <div className="field">
            <label className="field__label">Storage / active member (MB)</label>
            <input
              className="input"
              type="number"
              value={form.maxStorageMbPerUser}
              onChange={upNum('maxStorageMbPerUser')}
            />
            <p className="field__hint">-1 = unlimited</p>
          </div>
        </div>

        <div className="reseller-create__section">Feature access</div>
        <div className="plan-form__switch-grid">
          <Switch checked={form.dataExport} onChange={(v) => set('dataExport', v)} label="Data export (CSV)" />
          <Switch checked={form.apiAccess} onChange={(v) => set('apiAccess', v)} label="API access" />
        </div>

        <div className="reseller-create__section">Add-ons</div>
        <div className="plan-form__switch-grid">
          {ADD_ONS.map((a) => (
            <Switch key={a.key} checked={form[a.key]} onChange={(v) => set(a.key, v)} label={a.label} />
          ))}
        </div>

        <div className="reseller-create__section">Presentation</div>
        {/* <div className="field">
          <label className="field__label">Feature bullets</label>
          <textarea
            className="input textarea"
            rows={4}
            value={form.featureBullets}
            onChange={up('featureBullets')}
            placeholder={'Unlimited users\n5,000 tasks / user\n2 GB storage / user'}
          />
          <p className="field__hint">One line per feature — shown on the pricing cards.</p>
        </div> */}
        <div className="plan-form__switch-grid">
          <Switch checked={form.isPublic} onChange={(v) => set('isPublic', v)} label="Public (show on comparison cards)" />
          <Switch checked={form.isActive} onChange={(v) => set('isActive', v)} label="Active" />
        </div>

        <div className="reseller-create__actions">
          <button type="button" className="btn btn--ghost" onClick={() => navigate(base)} disabled={busy}>
            Cancel
          </button>
          <button className="btn" type="submit" disabled={busy || !form.name.trim()}>
            {busy ? <span className="spinner" /> : <><PlusIcon size={15} /> {isEdit ? 'Save changes' : 'Create plan'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}
