import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { kamdhenuApi } from '../../api/client.js';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtQty } from '../components/kamdhenuFormat.js';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '../../components/icons.jsx';

const EMPTY_ITEM = { materialId: '', quantity: '' };
const dateInput = (iso) => (iso ? String(iso).slice(0, 10) : '');
const today = () => new Date().toISOString().slice(0, 10);

/** One component for both `/material-out/new` and `/material-out/:id/edit`.
 *  Pick the work order (drives the site), then material + quantity rows with
 *  available-stock hints from the WO site's live stock. */
export default function KamdhenuMaterialOutFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useKamdhenuToast();

  const [pos, setPos] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');

  const [outDate, setOutDate] = useState(today());
  const [poId, setPoId] = useState('');
  const [stockByMaterial, setStockByMaterial] = useState(new Map()); // materialId → currentQty at WO site
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
        const res = await kamdhenuApi.materialOut.get(id);
        if (cancelled) return;
        const mo = res.materialOut;
        setOutDate(dateInput(mo.outDate));
        setPoId(mo.poId || '');
        setItems(
          (mo.items || []).length
            ? mo.items.map((it) => ({ materialId: it.materialId, quantity: String(it.quantity) }))
            : [{ ...EMPTY_ITEM }]
        );
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

  // The selected WO's siteId comes from the loaded PO list; whenever both are
  // known, load that site's live stock for the availability hints. (Runs after
  // either the WO pick or, in edit mode, whichever of voucher/PO-list loads
  // last — so the ordering never matters.)
  const selectedPo = pos.find((p) => p.id === poId) || null;
  useEffect(() => {
    let cancelled = false;
    setStockByMaterial(new Map());
    if (!selectedPo?.siteId) return undefined;
    (async () => {
      try {
        const stockRes = await kamdhenuApi.stock({ siteId: selectedPo.siteId });
        if (!cancelled) {
          setStockByMaterial(new Map((stockRes.stock || []).map((r) => [r.materialId, r.currentQty])));
        }
      } catch {
        /* hints just stay hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPo?.siteId]);

  const setItem = (index, patch) =>
    setItems((list) => list.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const addItem = () => setItems((list) => [...list, { ...EMPTY_ITEM }]);
  const removeItem = (index) => setItems((list) => list.filter((_, i) => i !== index));

  const completeItems = items.filter((it) => it.materialId && Number(it.quantity) > 0);
  const canSubmit = !saving && outDate && poId && completeItems.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setFormError('Pick a date and work order, and add at least one material row with a quantity.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      outDate,
      poId,
      items: completeItems.map((it) => ({ materialId: it.materialId, quantity: Number(it.quantity) })),
    };
    try {
      if (isEdit) {
        await kamdhenuApi.materialOut.update(id, payload);
        toast.success('Voucher updated');
      } else {
        const res = await kamdhenuApi.materialOut.create(payload);
        toast.success(`Voucher ${res.materialOut?.voucherNumber || ''} created`.trim());
      }
      navigate('/kamdhenu/material-out');
    } catch (err) {
      // Insufficient-stock guards come back with clear messages — toast + inline.
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
          <button type="button" className="btn btn--sm" onClick={() => navigate('/kamdhenu/material-out')}>
            Back to Material OUT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <button type="button" className="link-btn" onClick={() => navigate('/kamdhenu/material-out')}>
            <ArrowLeftIcon size={14} /> All OUT vouchers
          </button>
          <h1 className="page__title">{isEdit ? 'Edit Material OUT' : 'New Material OUT'}</h1>
          <p className="page__subtitle">
            Record outward material against a work order — the site comes from the work order automatically.
          </p>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Voucher details</h2>
          </div>
          {formError && <div className="alert alert--error">{formError}</div>}
          <div className="kerp-form-row">
            <div className="field">
              <label className="field__label">Date</label>
              <input className="input" type="date" value={outDate} onChange={(e) => setOutDate(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label">Select Work Order</label>
              <select className="input" value={poId} onChange={(e) => setPoId(e.target.value)}>
                <option value="">— Select Work Order —</option>
                {pos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.poNumber} — {p.siteName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Materials issued</h2>
          </div>
          <div className="table-wrap kerp-items-table">
            <table className="task-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Material</th>
                  <th>Quantity Issued</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const available = it.materialId ? stockByMaterial.get(it.materialId) ?? 0 : null;
                  const over = it.materialId && Number(it.quantity) > 0 && Number(it.quantity) > available;
                  return (
                    <tr key={i} className="kerp-table__row--static">
                      <td>
                        <select
                          className="input"
                          value={it.materialId}
                          onChange={(e) => setItem(i, { materialId: e.target.value })}
                          disabled={!poId}
                        >
                          <option value="">{poId ? '— Select material —' : 'Pick a work order first'}</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.materialName}
                            </option>
                          ))}
                        </select>
                        {it.materialId && available !== null && (
                          <span className={`kerp-stock-hint ${over ? 'kerp-stock-hint--warn' : ''}`}>
                            Available at site: {fmtQty(available)}
                          </span>
                        )}
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
                        {over && (
                          <span className="kerp-stock-hint kerp-stock-hint--warn">
                            Exceeds available stock — the server will reject if short.
                          </span>
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
            onClick={() => navigate('/kamdhenu/material-out')}
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
