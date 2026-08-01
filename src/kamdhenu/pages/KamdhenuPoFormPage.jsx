import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { kamdhenuApi } from '../../api/client.js';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtQty } from '../components/kamdhenuFormat.js';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '../../components/icons.jsx';

const EMPTY_ITEM = { equipmentId: '', quantity: '' };

const dateInput = (iso) => (iso ? String(iso).slice(0, 10) : '');
const today = () => new Date().toISOString().slice(0, 10);

/** One component for both `/purchase-orders/new` and `/purchase-orders/:id/edit`. */
export default function KamdhenuPoFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useKamdhenuToast();

  const [sites, setSites] = useState([]);
  const [equipment, setEquipment] = useState([]);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState({ siteId: '', poDate: today(), deliveryDate: '' });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  // equipmentId → already-done qty (edit mode) so the guard is visible up front.
  const [doneByEquipment, setDoneByEquipment] = useState(new Map());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRes, eRes] = await Promise.all([
          kamdhenuApi.sites.listAll(),
          kamdhenuApi.equipment.listAll(),
        ]);
        if (cancelled) return;
        setSites(sRes.sites || []);
        setEquipment(eRes.equipment || []);
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Could not load sites / equipment');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Edit mode: load the PO.
  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await kamdhenuApi.purchaseOrders.get(id);
        if (cancelled) return;
        const po = res.purchaseOrder; // API keeps the historical PO naming; UI says Work Order
        setForm({
          siteId: po.siteId || '',
          poDate: dateInput(po.poDate),
          deliveryDate: dateInput(po.deliveryDate),
        });
        setItems(
          (po.items || []).map((it) => ({ equipmentId: it.equipmentId, quantity: String(it.quantity) }))
        );
        setDoneByEquipment(new Map((po.items || []).map((it) => [it.equipmentId, it.doneQty])));
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load the work order');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setItem = (index, patch) =>
    setItems((list) => list.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const addItem = () => setItems((list) => [...list, { ...EMPTY_ITEM }]);
  const removeItem = (index) => setItems((list) => list.filter((_, i) => i !== index));

  const completeItems = items.filter((it) => it.equipmentId && Number(it.quantity) > 0);
  const canSubmit = !saving && form.siteId && form.poDate && completeItems.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setFormError('Pick a site and WO date, and add at least one equipment row with a quantity.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      siteId: form.siteId,
      poDate: form.poDate,
      deliveryDate: form.deliveryDate || undefined,
      items: completeItems.map((it) => ({ equipmentId: it.equipmentId, quantity: Number(it.quantity) })),
    };
    try {
      if (isEdit) {
        await kamdhenuApi.purchaseOrders.update(id, payload);
        toast.success('Work order updated');
        navigate(`/kamdhenu/purchase-orders/${id}`);
      } else {
        const res = await kamdhenuApi.purchaseOrders.create(payload);
        toast.success(`Work order ${res.purchaseOrder?.poNumber || ''} created`.trim());
        navigate(
          res.purchaseOrder?.id
            ? `/kamdhenu/purchase-orders/${res.purchaseOrder.id}`
            : '/kamdhenu/purchase-orders'
        );
      }
    } catch (err) {
      // Server guards (e.g. "cannot be reduced below the already-done
      // quantity") surface both inline and as a toast.
      toast.error(err.message || 'Could not save the work order');
      setFormError(err.message || 'Could not save the work order');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="panel">
          <div className="panel__empty">
            <span className="spinner" /> Loading work order…
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page">
        <div className="panel">
          <div className="alert alert--error">{loadError}</div>
          <button type="button" className="btn btn--sm" onClick={() => navigate('/kamdhenu/purchase-orders')}>
            Back to Work Order list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <button type="button" className="link-btn" onClick={() => navigate('/kamdhenu/purchase-orders')}>
            <ArrowLeftIcon size={14} /> All work orders
          </button>
          <h1 className="page__title">{isEdit ? 'Edit Work Order' : 'Create Work Order'}</h1>
          <p className="page__subtitle">
            {isEdit ? 'Update the work order header and work-type quantities.' : 'Order work-type quantities for a site.'}
          </p>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Work order details</h2>
          </div>
          {formError && <div className="alert alert--error">{formError}</div>}
          <div className="field">
            <label className="field__label">Site</label>
            <select className="input" value={form.siteId} onChange={setField('siteId')}>
              <option value="">— Select site —</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.siteName}
                </option>
              ))}
            </select>
          </div>
          <div className="kerp-form-row">
            <div className="field">
              <label className="field__label">WO date</label>
              <input className="input" type="date" value={form.poDate} onChange={setField('poDate')} />
            </div>
            <div className="field">
              <label className="field__label">Delivery date</label>
              <input className="input" type="date" value={form.deliveryDate} onChange={setField('deliveryDate')} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Items</h2>
          </div>
          <div className="table-wrap kerp-items-table">
            <table className="task-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Equipment (work type)</th>
                  <th>WO Quantity</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const done = doneByEquipment.get(it.equipmentId) || 0;
                  return (
                    <tr key={i} className="kerp-table__row--static">
                      <td>
                        <select
                          className="input"
                          value={it.equipmentId}
                          onChange={(e) => setItem(i, { equipmentId: e.target.value })}
                        >
                          <option value="">— Select equipment —</option>
                          {equipment.map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              {eq.equipmentName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="any"
                          value={it.quantity}
                          onChange={(e) => setItem(i, { quantity: e.target.value })}
                        />
                        {isEdit && done > 0 && (
                          <span className="kerp-stock-hint">Already done: {fmtQty(done)}</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          title="Remove item"
                          onClick={() => removeItem(i)}
                          disabled={items.length === 1}
                        >
                          <TrashIcon size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={addItem}>
            <PlusIcon size={15} /> Add item
          </button>
        </div>

        <div className="kerp-head-actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => navigate('/kamdhenu/purchase-orders')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn--sm" disabled={!canSubmit}>
            {saving ? <span className="spinner" /> : isEdit ? 'Save changes' : 'Create Work Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
