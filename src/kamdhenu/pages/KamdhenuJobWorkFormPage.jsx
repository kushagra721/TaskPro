import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { kamdhenuApi } from '../../api/client.js';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtQty } from '../components/kamdhenuFormat.js';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '../../components/icons.jsx';

const EMPTY_MATERIAL = { materialId: '', quantity: '' };
const EMPTY_MEMBER = { memberId: '', hours: '' };

const dateInput = (iso) => (iso ? String(iso).slice(0, 10) : '');
const today = () => new Date().toISOString().slice(0, 10);

/**
 * One component for `/job-works/new` and `/job-works/:id/edit` — the 4-step
 * flow as sequential sections in a single form:
 *   1. Select PO (drives the site; shows the PO's equipment progress)
 *   2. Equipment (only the PO's lines) + Done Quantity
 *   3. Materials used (with available-stock hints; server is authoritative)
 *   4. Manpower (the PO site's members) + working hours
 */
export default function KamdhenuJobWorkFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useKamdhenuToast();

  const [pos, setPos] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [allMembers, setAllMembers] = useState([]);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');

  const [workDate, setWorkDate] = useState(today());
  const [poId, setPoId] = useState('');
  const [poDetail, setPoDetail] = useState(null); // full PO with items + progress
  const [stockByMaterial, setStockByMaterial] = useState(new Map()); // materialId → currentQty at PO site
  const [equipmentId, setEquipmentId] = useState('');
  const [doneQty, setDoneQty] = useState('');
  const [materialRows, setMaterialRows] = useState([{ ...EMPTY_MATERIAL }]);
  const [memberRows, setMemberRows] = useState([{ ...EMPTY_MEMBER }]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [poRes, mRes, memRes] = await Promise.all([
          kamdhenuApi.purchaseOrders.listAll(),
          kamdhenuApi.materials.listAll(),
          kamdhenuApi.members.listAll(),
        ]);
        if (cancelled) return;
        setPos(poRes.purchaseOrders || []);
        setAllMaterials(mRes.materials || []);
        setAllMembers(memRes.members || []);
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Could not load form data');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1 — picking a PO loads its detail (equipment + progress) and the PO
  // site's live stock for the material hints.
  const pickPo = async (nextPoId, keepSelections = false) => {
    setPoId(nextPoId);
    setPoDetail(null);
    setStockByMaterial(new Map());
    if (!keepSelections) {
      setEquipmentId('');
      setDoneQty('');
    }
    if (!nextPoId) return;
    try {
      const res = await kamdhenuApi.purchaseOrders.get(nextPoId);
      const po = res.purchaseOrder || null;
      setPoDetail(po);
      if (po?.siteId) {
        try {
          const stockRes = await kamdhenuApi.stock({ siteId: po.siteId });
          setStockByMaterial(new Map((stockRes.stock || []).map((r) => [r.materialId, r.currentQty])));
        } catch {
          /* hints just stay hidden */
        }
      }
    } catch (err) {
      toast.error(err.message || 'Could not load the purchase order');
    }
  };

  // Edit mode: pre-load the entry, then hydrate the PO context around it.
  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await kamdhenuApi.jobWorks.get(id);
        if (cancelled) return;
        const jw = res.jobWork;
        setWorkDate(dateInput(jw.workDate));
        setEquipmentId(jw.equipmentId || '');
        setDoneQty(String(jw.doneQty ?? ''));
        setMaterialRows(
          jw.materials?.length
            ? jw.materials.map((m) => ({ materialId: m.materialId, quantity: String(m.quantity) }))
            : [{ ...EMPTY_MATERIAL }]
        );
        setMemberRows(
          jw.members?.length
            ? jw.members.map((m) => ({ memberId: m.memberId, hours: String(m.hours) }))
            : [{ ...EMPTY_MEMBER }]
        );
        await pickPo(jw.poId, true);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load the job work entry');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const poItems = poDetail?.items || [];
  const pickedItem = poItems.find((it) => it.equipmentId === equipmentId) || null;
  const siteMembers = useMemo(
    () => allMembers.filter((m) => m.siteId && poDetail?.siteId && m.siteId === poDetail.siteId),
    [allMembers, poDetail]
  );

  const setMaterialRow = (index, patch) =>
    setMaterialRows((list) => list.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const setMemberRow = (index, patch) =>
    setMemberRows((list) => list.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const completeMaterials = materialRows.filter((it) => it.materialId && Number(it.quantity) > 0);
  const completeMembers = memberRows.filter((it) => it.memberId && Number(it.hours) > 0);
  const canSubmit = !saving && workDate && poId && equipmentId && Number(doneQty) > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setFormError('Pick a PO, equipment and work date, and enter the done quantity.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      poId,
      equipmentId,
      workDate,
      doneQty: Number(doneQty),
      materials: completeMaterials.map((it) => ({ materialId: it.materialId, quantity: Number(it.quantity) })),
      members: completeMembers.map((it) => ({ memberId: it.memberId, hours: Number(it.hours) })),
    };
    try {
      if (isEdit) {
        const res = await kamdhenuApi.jobWorks.update(id, payload);
        toast.success(`Job work ${res.jobWork?.jwNumber || ''} updated`.trim());
      } else {
        const res = await kamdhenuApi.jobWorks.create(payload);
        toast.success(`Job work ${res.jobWork?.jwNumber || ''} created`.trim());
      }
      navigate('/kamdhenu/job-works');
    } catch (err) {
      // Server guards (insufficient stock, member from another site…) come
      // back with clear messages — toast + inline.
      toast.error(err.message || 'Could not save the job work entry');
      setFormError(err.message || 'Could not save the job work entry');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="panel">
          <div className="panel__empty">
            <span className="spinner" /> Loading job work…
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
          <button type="button" className="btn btn--sm" onClick={() => navigate('/kamdhenu/job-works')}>
            Back to Job Work
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <button type="button" className="link-btn" onClick={() => navigate('/kamdhenu/job-works')}>
            <ArrowLeftIcon size={14} /> All job works
          </button>
          <h1 className="page__title">{isEdit ? 'Edit Job Work' : 'New Job Work'}</h1>
          <p className="page__subtitle">
            Record a day's work — done quantity, materials consumed and manpower hours.
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
              <label className="field__label">Work date</label>
              <input
                className="input"
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
              />
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
              <div className="kerp-po-context__title">Site: {poDetail.siteName}</div>
              <div className="table-wrap kerp-mini-table">
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>PO Qty</th>
                      <th>Done Qty</th>
                      <th>Pending Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((it) => (
                      <tr key={it.id} className="kerp-table__row--static">
                        <td>{it.equipmentName}</td>
                        <td>{fmtQty(it.quantity)}</td>
                        <td>{fmtQty(it.doneQty)}</td>
                        <td>{fmtQty(it.pendingQty)}</td>
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
            <h2 className="panel__title">Step 2 — Equipment &amp; done quantity</h2>
          </div>
          <div className="kerp-form-row">
            <div className="field">
              <label className="field__label">Equipment (work type)</label>
              <select
                className="input"
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                disabled={!poDetail}
              >
                <option value="">{poDetail ? '— Select equipment —' : 'Pick a PO first'}</option>
                {poItems.map((it) => (
                  <option key={it.equipmentId} value={it.equipmentId}>
                    {it.equipmentName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label">Done quantity</label>
              <input
                className="input"
                type="number"
                min="0"
                step="any"
                value={doneQty}
                onChange={(e) => setDoneQty(e.target.value)}
                disabled={!equipmentId}
              />
              {pickedItem && (
                <span className="kerp-stock-hint">
                  Pending on this PO: {fmtQty(pickedItem.pendingQty)} of {fmtQty(pickedItem.quantity)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Step 3 — Materials used</h2>
          </div>
          <div className="table-wrap kerp-items-table">
            <table className="task-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Material</th>
                  <th>Quantity Used</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {materialRows.map((it, i) => {
                  const available = it.materialId ? stockByMaterial.get(it.materialId) ?? 0 : null;
                  const over = it.materialId && Number(it.quantity) > 0 && Number(it.quantity) > available;
                  return (
                    <tr key={i} className="kerp-table__row--static">
                      <td>
                        <select
                          className="input"
                          value={it.materialId}
                          onChange={(e) => setMaterialRow(i, { materialId: e.target.value })}
                          disabled={!poDetail}
                        >
                          <option value="">{poDetail ? '— Select material —' : 'Pick a PO first'}</option>
                          {allMaterials.map((m) => (
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
                          onChange={(e) => setMaterialRow(i, { quantity: e.target.value })}
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
                          title="Remove row"
                          onClick={() => setMaterialRows((list) => list.filter((_, j) => j !== i))}
                          disabled={materialRows.length === 1}
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
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setMaterialRows((list) => [...list, { ...EMPTY_MATERIAL }])}
          >
            <PlusIcon size={15} /> Add material
          </button>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Step 4 — Manpower</h2>
          </div>
          <div className="table-wrap kerp-items-table">
            <table className="task-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Member</th>
                  <th>Working Hours</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {memberRows.map((it, i) => (
                  <tr key={i} className="kerp-table__row--static">
                    <td>
                      <select
                        className="input"
                        value={it.memberId}
                        onChange={(e) => setMemberRow(i, { memberId: e.target.value })}
                        disabled={!poDetail}
                      >
                        <option value="">
                          {poDetail
                            ? siteMembers.length
                              ? '— Select member —'
                              : 'No members at this site'
                            : 'Pick a PO first'}
                        </option>
                        {siteMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role})
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
                        value={it.hours}
                        onChange={(e) => setMemberRow(i, { hours: e.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        title="Remove row"
                        onClick={() => setMemberRows((list) => list.filter((_, j) => j !== i))}
                        disabled={memberRows.length === 1}
                      >
                        <TrashIcon size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setMemberRows((list) => [...list, { ...EMPTY_MEMBER }])}
          >
            <PlusIcon size={15} /> Add member
          </button>
        </div>

        <div className="kerp-head-actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => navigate('/kamdhenu/job-works')}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn--sm" disabled={!canSubmit}>
            {saving ? <span className="spinner" /> : isEdit ? 'Save changes' : 'Save job work'}
          </button>
        </div>
      </form>
    </div>
  );
}
