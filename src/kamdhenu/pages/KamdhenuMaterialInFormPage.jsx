import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { kamdhenuApi } from '../../api/client.js';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtQty } from '../components/kamdhenuFormat.js';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '../../components/icons.jsx';

const EMPTY_ITEM = { materialId: '', quantity: '' };
const dateInput = (iso) => (iso ? String(iso).slice(0, 10) : '');
const today = () => new Date().toISOString().slice(0, 10);

/** One component for both `/material-in/new` and `/material-in/:id/edit`.
 *  Step 1: pick the PO (drives the site). Step 2: materials received. */
export default function KamdhenuMaterialInFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useKamdhenuToast();

  const [pos, setPos] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');

  const [inDate, setInDate] = useState(today());
  const [poId, setPoId] = useState('');
  const [poDetail, setPoDetail] = useState(null); // full PO (items + progress) for context
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [poRes, mRes] = await Promise.all([
          kamdhenuApi.purchaseOrders.listAll(),
          kamdhenuApi.materials.listAll(),
        ]);
        if (cancelled) return;
        setPos(poRes.purchaseOrders || []);
        setMaterials(mRes.materials || []);
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Could not load form data');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Edit mode: pre-load the voucher.
  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await kamdhenuApi.materialIn.get(id);
        if (cancelled) return;
        const mi = res.materialIn;
        setInDate(dateInput(mi.inDate));
        setItems(
          (mi.items || []).map((it) => ({ materialId: it.materialId, quantity: String(it.quantity) }))
        );
        if (mi.poId) pickPo(mi.poId);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load the voucher');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Step 1 — picking the PO loads its equipment lines as read-only context.
  const pickPo = async (nextPoId) => {
    setPoId(nextPoId);
    setPoDetail(null);
    if (!nextPoId) return;
    try {
      const res = await kamdhenuApi.purchaseOrders.get(nextPoId);
      setPoDetail(res.purchaseOrder || null);
    } catch (err) {
      toast.error(err.message || 'Could not load the purchase order');
    }
  };

  const setItem = (index, patch) =>
    setItems((list) => list.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const addItem = () => setItems((list) => [...list, { ...EMPTY_ITEM }]);
  const removeItem = (index) => setItems((list) => list.filter((_, i) => i !== index));

  const completeItems = items.filter((it) => it.materialId && Number(it.quantity) > 0);
  const canSubmit = !saving && inDate && poId && completeItems.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setFormError('Pick a date and PO, and add at least one material row with a quantity.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      inDate,
      poId,
      items: completeItems.map((it) => ({ materialId: it.materialId, quantity: Number(it.quantity) })),
    };
    try {
      if (isEdit) {
        await kamdhenuApi.materialIn.update(id, payload);
        toast.success('Voucher updated');
      } else {
        const res = await kamdhenuApi.materialIn.create(payload);
        toast.success(`Voucher ${res.materialIn?.voucherNumber || ''} created`.trim());
      }
      navigate('/kamdhenu/material-in');
    } catch (err) {
      toast.error(err.message || 'Could not save the voucher');
      setFormError(err.message || 'Could not save the voucher');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="panel">
          <div className="panel__empty">
            <span className="spinner" /> Loading voucher…
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
          <button type="button" className="btn btn--sm" onClick={() => navigate('/kamdhenu/material-in')}>
            Back to Material IN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <button type="button" className="link-btn" onClick={() => navigate('/kamdhenu/material-in')}>
            <ArrowLeftIcon size={14} /> All IN vouchers
          </button>
          <h1 className="page__title">{isEdit ? 'Edit Material IN' : 'New Material IN'}</h1>
          <p className="page__subtitle">
            Record inward material against a PO — the site comes from the PO automatically.
          </p>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Step 1 — Purchase order</h2>
          </div>
          {formError && <div className="alert alert--error">{formError}</div>}
          <div className="kerp-form-row">
            <div className="field">
              <label className="field__label">Date</label>
              <input className="input" type="date" value={inDate} onChange={(e) => setInDate(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label">Purchase order</label>
              <select className="input" value={poId} onChange={(e) => pickPo(e.target.value)}>
                <option value="">— Select PO —</option>
                {pos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.poNumber} — {p.siteName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {poDetail && (
            <div className="kerp-po-context">
              <div className="kerp-po-context__title">
                {poDetail.poNumber} · {poDetail.siteName}
              </div>
              <div className="table-wrap kerp-mini-table">
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>PO Qty</th>
                      <th>Done Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(poDetail.items || []).map((it) => (
                      <tr key={it.id} className="kerp-table__row--static">
                        <td>{it.equipmentName}</td>
                        <td>{fmtQty(it.quantity)}</td>
                        <td>{fmtQty(it.doneQty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Step 2 — Materials received</h2>
          </div>
          <div className="table-wrap kerp-items-table">
            <table className="task-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Material</th>
                  <th>Quantity Received</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="kerp-table__row--static">
                    <td>
                      <select
                        className="input"
                        value={it.materialId}
                        onChange={(e) => setItem(i, { materialId: e.target.value })}
                      >
                        <option value="">— Select material —</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.materialName}
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
                ))}
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
            onClick={() => navigate('/kamdhenu/material-in')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn--sm" disabled={!canSubmit}>
            {saving ? <span className="spinner" /> : isEdit ? 'Save changes' : 'Save voucher'}
          </button>
        </div>
      </form>
    </div>
  );
}
