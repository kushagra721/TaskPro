import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kamdhenuApi } from '../../api/client.js';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtQty } from '../components/kamdhenuFormat.js';
import { ArrowLeftIcon, TrashIcon } from '../../components/icons.jsx';

const today = () => new Date().toISOString().slice(0, 10);

const IMAGE_TYPES = ['image/jpeg', 'image/png'];

const emptyUnit = () => ({ serialNumber: '', beforeImageUrl: '' });

/**
 * Create Job Work — two-step wizard (v3 lifecycle: create → IN_PROGRESS; each
 * unit's after picture on the view page completes that unit, so there is no
 * edit mode here).
 *
 * Step 1: work date, work order → equipment (manual pick) → start quantity
 *         (whole number of units, validated against the line's availableQty)
 *         → assign workers (at least one). Everything mandatory.
 * Step 2: one row PER UNIT (startQty rows) — before picture (single JPEG/PNG;
 *         camera on mobile via `capture`) + serial number for each unit.
 * Navigation is free both ways: unit entries survive step switches, and if
 * startQty changes the unit array is extended/trimmed, preserving what exists.
 */
export default function KamdhenuJobWorkFormPage() {
  const navigate = useNavigate();
  const toast = useKamdhenuToast();

  const [pos, setPos] = useState([]);
  const [allMembers, setAllMembers] = useState([]);

  const [step, setStep] = useState(1);

  // Step 1 state
  const [workDate, setWorkDate] = useState(today());
  const [poId, setPoId] = useState('');
  const [poDetail, setPoDetail] = useState(null); // full WO with items (availableQty per line)
  const [equipmentId, setEquipmentId] = useState('');
  const [startQty, setStartQty] = useState('');
  const [memberIds, setMemberIds] = useState([]);

  // Step 2 state — one entry per equipment unit; lives here (in the parent of
  // both steps) so it survives Back/Next switches.
  const [units, setUnits] = useState([]);
  const [uploadingIdx, setUploadingIdx] = useState(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [unitErrors, setUnitErrors] = useState([]); // indexes of incomplete units

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [poRes, memRes] = await Promise.all([
          kamdhenuApi.purchaseOrders.listAll(),
          kamdhenuApi.members.listAll(),
        ]);
        if (cancelled) return;
        setPos(poRes.purchaseOrders || []);
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

  // Picking a work order loads its detail (per-line availableQty) and resets
  // the downstream choices. Unit entries are kept — the array is resized to
  // the (new) start quantity when moving to step 2.
  const pickPo = async (nextPoId) => {
    setPoId(nextPoId);
    setPoDetail(null);
    setEquipmentId('');
    setStartQty('');
    setMemberIds([]);
    if (!nextPoId) return;
    try {
      const res = await kamdhenuApi.purchaseOrders.get(nextPoId);
      setPoDetail(res.purchaseOrder || null);
    } catch (err) {
      toast.error(err.message || 'Could not load the work order');
    }
  };

  const poItems = poDetail?.items || [];
  const pickedItem = poItems.find((it) => it.equipmentId === equipmentId) || null;
  const availableQty = pickedItem ? Number(pickedItem.availableQty) || 0 : 0;

  const siteMembers = useMemo(
    () => allMembers.filter((m) => m.siteId && poDetail?.siteId && m.siteId === poDetail.siteId),
    [allMembers, poDetail]
  );

  const toggleMember = (memberId) =>
    setMemberIds((list) =>
      list.includes(memberId) ? list.filter((id) => id !== memberId) : [...list, memberId]
    );

  const qtyNumber = Number(startQty);
  const qtyEntered = startQty !== '' && Number.isInteger(qtyNumber) && qtyNumber > 0;
  const qtyTooHigh = qtyEntered && pickedItem && qtyNumber > availableQty;

  const validateStep1 = () => {
    const errors = {};
    if (!workDate) errors.workDate = 'Work date is required.';
    if (!poId || !poDetail) errors.poId = 'Select a work order.';
    if (poDetail && !equipmentId) errors.equipmentId = 'Select the equipment.';
    if (equipmentId) {
      if (startQty === '') errors.startQty = 'Enter the start quantity (number of units).';
      else if (!qtyEntered) errors.startQty = 'Start quantity must be a whole number greater than 0.';
      else if (qtyTooHigh)
        errors.startQty = `Start quantity cannot exceed the pending quantity (${fmtQty(availableQty)}).`;
    }
    if (poDetail && memberIds.length === 0) errors.memberIds = 'Assign at least one worker.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Resize the unit array to `count`, PRESERVING existing entries (their
  // uploaded pictures and serials) — extend with empties or trim the tail.
  const syncUnits = (count) =>
    setUnits((prev) => {
      if (prev.length === count) return prev;
      if (prev.length > count) return prev.slice(0, count);
      return [...prev, ...Array.from({ length: count - prev.length }, emptyUnit)];
    });

  const goNext = () => {
    if (!validateStep1()) return;
    setFormError('');
    syncUnits(qtyNumber);
    setStep(2);
  };

  const goBack = () => {
    setFormError('');
    setUnitErrors([]);
    setStep(1);
  };

  const setUnitField = (idx, patch) => {
    setUnits((list) => list.map((u, i) => (i === idx ? { ...u, ...patch } : u)));
    setUnitErrors((list) => list.filter((i) => i !== idx));
  };

  const onPickUnitFile = async (idx, e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after remove
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPEG or PNG images are allowed');
      return;
    }
    setUploadingIdx(idx);
    try {
      const res = await kamdhenuApi.upload([file]);
      const url = res.files?.[0]?.url;
      if (!url) throw new Error('Upload failed');
      setUnitField(idx, { beforeImageUrl: url });
    } catch (err) {
      toast.error(err.message || 'Could not upload the picture');
    } finally {
      setUploadingIdx(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (step !== 2 || saving || uploadingIdx !== null) return;

    // Every unit row must be complete: before picture uploaded + serial filled.
    const incomplete = units
      .map((u, i) => (!u.beforeImageUrl || !u.serialNumber.trim() ? i : -1))
      .filter((i) => i >= 0);
    if (incomplete.length) {
      setUnitErrors(incomplete);
      setFormError(
        `Complete ${incomplete.map((i) => `Unit ${i + 1}`).join(', ')} — every unit needs a before picture and a serial number.`
      );
      return;
    }

    setSaving(true);
    setFormError('');
    const payload = {
      poId,
      equipmentId,
      workDate,
      startQty: qtyNumber,
      memberIds,
      units: units.map((u) => ({
        serialNumber: u.serialNumber.trim(),
        beforeImageUrl: u.beforeImageUrl,
      })),
    };
    try {
      const res = await kamdhenuApi.jobWorks.create(payload);
      toast.success(`Job work ${res.jobWork?.jwNumber || ''} created`.trim());
      navigate('/kamdhenu/job-works');
    } catch (err) {
      // Server guards (start qty > pending, member from another site…) come
      // back with clear messages — toast + inline.
      toast.error(err.message || 'Could not create the job work');
      setFormError(err.message || 'Could not create the job work');
      setSaving(false);
    }
  };

  const fieldError = (key) =>
    fieldErrors[key] ? (
      <span className="kerp-stock-hint kerp-stock-hint--warn">{fieldErrors[key]}</span>
    ) : null;

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <button type="button" className="link-btn" onClick={() => navigate('/kamdhenu/job-works')}>
            <ArrowLeftIcon size={14} /> All job works
          </button>
          <h1 className="page__title">Create Job Work</h1>
          <p className="page__subtitle">
            Start a job — pick the work order, equipment and workers, then attach each unit's serial
            number and before picture.
          </p>
        </div>
      </div>

      {/* Stepper — both chips are clickable so users can move freely; entered
          data is preserved in both directions. */}
      <div className="kerp-stepper" aria-label={`Step ${step} of 2`}>
        <div
          className={`kerp-stepper__step ${step === 1 ? 'kerp-stepper__step--active' : 'kerp-stepper__step--done'}`}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
          onClick={() => step === 2 && goBack()}
          onKeyDown={(e) => e.key === 'Enter' && step === 2 && goBack()}
        >
          <span className="kerp-stepper__num">1</span>
          <span className="kerp-stepper__label">Work details</span>
        </div>
        <span className="kerp-stepper__bar" />
        <div
          className={`kerp-stepper__step ${step === 2 ? 'kerp-stepper__step--active' : ''}`}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
          onClick={() => step === 1 && goNext()}
          onKeyDown={(e) => e.key === 'Enter' && step === 1 && goNext()}
        >
          <span className="kerp-stepper__num">2</span>
          <span className="kerp-stepper__label">Units — before pictures &amp; serials</span>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        {step === 1 && (
          <div className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Step 1 — Work details</h2>
            </div>
            {formError && <div className="alert alert--error">{formError}</div>}

            <div className="kerp-form-row">
              <div className="field">
                <label className="field__label">Work Date *</label>
                <input
                  className="input"
                  type="date"
                  required
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                />
                {fieldError('workDate')}
              </div>
              <div className="field">
                <label className="field__label">Select Work Order *</label>
                <select className="input" value={poId} onChange={(e) => pickPo(e.target.value)}>
                  <option value="">— Select Work Order —</option>
                  {pos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.poNumber} — {p.siteName}
                    </option>
                  ))}
                </select>
                {fieldError('poId')}
              </div>
            </div>

            <div className="kerp-form-row">
              <div className="field">
                <label className="field__label">Select Equipment *</label>
                <select
                  className="input"
                  value={equipmentId}
                  onChange={(e) => {
                    setEquipmentId(e.target.value);
                    setStartQty('');
                  }}
                  disabled={!poDetail}
                >
                  <option value="">{poDetail ? '— Select Equipment —' : 'Pick a work order first'}</option>
                  {poItems.map((it) => (
                    <option key={it.equipmentId} value={it.equipmentId}>
                      {it.equipmentName}
                    </option>
                  ))}
                </select>
                {fieldError('equipmentId')}
              </div>
              <div className="field">
                <label className="field__label">Start Quantity (number of units) *</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={startQty}
                  onChange={(e) => setStartQty(e.target.value)}
                  disabled={!equipmentId}
                />
                {pickedItem && (
                  <span className="kerp-stock-hint">Pending Quantity: {fmtQty(availableQty)}</span>
                )}
                {qtyTooHigh && (
                  <span className="kerp-stock-hint kerp-stock-hint--warn">
                    Start quantity cannot exceed the pending quantity ({fmtQty(availableQty)}).
                  </span>
                )}
                {fieldError('startQty')}
              </div>
            </div>

            <div className="field">
              <label className="field__label">Assign Workers *</label>
              {!poDetail ? (
                <span className="kerp-stock-hint">Pick a work order first.</span>
              ) : siteMembers.length === 0 ? (
                <span className="kerp-stock-hint">No members at this work order's site.</span>
              ) : (
                <div className="kerp-worker-checks">
                  {siteMembers.map((m) => (
                    <label key={m.id} className="kerp-worker-check">
                      <input
                        type="checkbox"
                        checked={memberIds.includes(m.id)}
                        onChange={() => toggleMember(m.id)}
                      />
                      <span>
                        {m.name} <span className="kerp-worker-check__role">({m.role})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {fieldError('memberIds')}
            </div>

            <div className="kerp-head-actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => navigate('/kamdhenu/job-works')}
              >
                Cancel
              </button>
              <button type="button" className="btn btn--sm" onClick={goNext}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="panel">
            <div className="panel__head">
              <h2 className="panel__title">
                Step 2 — {units.length} unit{units.length === 1 ? '' : 's'}: before picture &amp;
                serial number
              </h2>
            </div>
            {formError && <div className="alert alert--error">{formError}</div>}

            {units.map((unit, idx) => (
              <div
                key={idx}
                className="panel"
                style={{
                  marginBottom: 12,
                  ...(unitErrors.includes(idx) ? { borderColor: '#e5484d' } : {}),
                }}
              >
                <div className="panel__head">
                  <h3 className="panel__title">Unit {idx + 1}</h3>
                </div>
                <div className="kerp-form-row">
                  <div className="field">
                    <label className="field__label">Before Picture (JPEG/PNG) *</label>
                    {unit.beforeImageUrl ? (
                      <div className="kerp-photo-preview">
                        <a href={unit.beforeImageUrl} target="_blank" rel="noreferrer">
                          <img
                            src={unit.beforeImageUrl}
                            alt={`Unit ${idx + 1} before`}
                            className="kerp-photo-preview__img"
                          />
                        </a>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          title="Change picture"
                          onClick={() => setUnitField(idx, { beforeImageUrl: '' })}
                        >
                          <TrashIcon size={15} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          className="input kerp-file-input"
                          type="file"
                          accept="image/jpeg,image/png"
                          capture="environment"
                          onChange={(e) => onPickUnitFile(idx, e)}
                          disabled={uploadingIdx !== null}
                        />
                        <span className="kerp-stock-hint">
                          One image only — the camera opens on mobile; pick a file on desktop.
                        </span>
                      </>
                    )}
                    {uploadingIdx === idx && (
                      <span className="kerp-stock-hint">
                        <span className="spinner" /> Uploading picture…
                      </span>
                    )}
                  </div>
                  <div className="field">
                    <label className="field__label">Serial Number *</label>
                    <input
                      className="input"
                      type="text"
                      value={unit.serialNumber}
                      onChange={(e) => setUnitField(idx, { serialNumber: e.target.value })}
                      placeholder="e.g. SN-1024"
                    />
                  </div>
                </div>
                {unitErrors.includes(idx) && (
                  <span className="kerp-stock-hint kerp-stock-hint--warn">
                    This unit needs {!unit.beforeImageUrl ? 'a before picture' : ''}
                    {!unit.beforeImageUrl && !unit.serialNumber.trim() ? ' and ' : ''}
                    {!unit.serialNumber.trim() ? 'a serial number' : ''}.
                  </span>
                )}
              </div>
            ))}

            <div className="kerp-head-actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={goBack}
                disabled={saving}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn--sm"
                disabled={saving || uploadingIdx !== null}
              >
                {saving ? <span className="spinner" /> : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
