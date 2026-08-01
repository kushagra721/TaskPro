import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { kamdhenuApi } from '../../api/client.js';
import KamdhenuConfirmDialog from '../components/KamdhenuConfirmDialog.jsx';
import KamdhenuProgress from '../components/KamdhenuProgress.jsx';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtDate, fmtQty } from '../components/kamdhenuFormat.js';
import { printSection } from '../components/kamdhenuExport.js';
import { ArrowLeftIcon, EditIcon, TrashIcon } from '../../components/icons.jsx';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default function KamdhenuPoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useKamdhenuToast();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [materialIns, setMaterialIns] = useState([]);
  const [jobWorks, setJobWorks] = useState([]);
  const [busy, setBusy] = useState(''); // '' | 'delete' | 'print'
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await kamdhenuApi.purchaseOrders.get(id);
        if (cancelled) return;
        setPo(res.purchaseOrder);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load the work order');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    // Context lists — non-fatal when they fail.
    (async () => {
      try {
        const [miRes, jwRes] = await Promise.all([
          kamdhenuApi.materialIn.listAll({ poId: id }),
          kamdhenuApi.jobWorks.listAll({ poId: id }),
        ]);
        if (cancelled) return;
        setMaterialIns(miRes.materialIns || []);
        setJobWorks(jwRes.jobWorks || []);
      } catch {
        /* the context panels just stay empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const doDelete = async () => {
    setBusy('delete');
    try {
      await kamdhenuApi.purchaseOrders.remove(id);
      toast.success('Work order deleted');
      navigate('/kamdhenu/purchase-orders');
    } catch (err) {
      toast.error(err.message || 'Could not delete the work order');
      setBusy('');
      setConfirmDelete(false);
    }
  };

  const doPrint = async () => {
    setBusy('print');
    try {
      let company = {};
      try {
        company = (await kamdhenuApi.settings()).settings || {};
      } catch {
        /* print without the company header if settings are unavailable */
      }
      const itemsRows = (po.items || [])
        .map(
          (it, i) =>
            `<tr><td>${i + 1}</td><td>${esc(it.equipmentName)}</td><td>${fmtQty(it.quantity)}</td>` +
            `<td>${fmtQty(it.doneQty)}</td><td>${it.donePercent}%</td>` +
            `<td>${fmtQty(it.pendingQty)}</td><td>${it.pendingPercent}%</td></tr>`
        )
        .join('');
      const html =
        `<div style="margin-bottom:16px">` +
        `<div style="font-size:16px;font-weight:800">${esc(company.companyName || 'Kamdhenu Construction')}</div>` +
        (company.address ? `<div style="font-size:12px">${esc(company.address)}</div>` : '') +
        `</div>` +
        `<table style="margin-bottom:16px"><tbody>` +
        `<tr><th>Work Order No</th><td>${esc(po.poNumber)}</td><th>Site</th><td>${esc(po.siteName)}</td></tr>` +
        `<tr><th>WO Date</th><td>${esc(fmtDate(po.poDate))}</td><th>Delivery Date</th><td>${esc(
          fmtDate(po.deliveryDate)
        )}</td></tr>` +
        `</tbody></table>` +
        `<table><thead><tr><th>#</th><th>Equipment</th><th>WO Qty</th><th>Done Qty</th><th>Done %</th>` +
        `<th>Pending Qty</th><th>Pending %</th></tr></thead>` +
        `<tbody>${itemsRows}</tbody><tfoot>` +
        `<tr><td colspan="2" style="font-weight:800">Total</td>` +
        `<td style="font-weight:800">${fmtQty(po.totalQty)}</td>` +
        `<td style="font-weight:800">${fmtQty(po.totalDoneQty)}</td>` +
        `<td style="font-weight:800">${po.donePercent}%</td>` +
        `<td style="font-weight:800">${fmtQty(po.totalPendingQty)}</td><td></td></tr>` +
        `</tfoot></table>` +
        (company.invoiceNotes ? `<p style="font-size:11px;margin-top:16px">${esc(company.invoiceNotes)}</p>` : '');
      printSection(`Work Order ${po.poNumber}`, html);
    } finally {
      setBusy('');
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

  if (error || !po) {
    return (
      <div className="page">
        <div className="panel">
          <div className="alert alert--error">{error || 'Work order not found'}</div>
          <button type="button" className="btn btn--sm" onClick={() => navigate('/kamdhenu/purchase-orders')}>
            Back to Work Order list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <button type="button" className="link-btn" onClick={() => navigate('/kamdhenu/purchase-orders')}>
            <ArrowLeftIcon size={14} /> All work orders
          </button>
          <h1 className="page__title">{po.poNumber}</h1>
          <p className="page__subtitle">
            {po.siteName} · WO {fmtDate(po.poDate)}
            {po.deliveryDate ? ` · Delivery ${fmtDate(po.deliveryDate)}` : ''}
          </p>
        </div>
        <div className="kerp-head-actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!!busy}
            onClick={() => navigate(`/kamdhenu/purchase-orders/${id}/edit`)}
          >
            <EditIcon size={15} /> Edit
          </button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={!!busy} onClick={doPrint}>
            Print / PDF
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!!busy}
            onClick={() => setConfirmDelete(true)}
          >
            <TrashIcon size={15} /> Delete
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Work Order Details</h2>
          <KamdhenuProgress percent={po.donePercent} />
        </div>
        <div className="table-wrap kerp-mini-table">
          <table className="task-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>WO Quantity</th>
                <th>Done Quantity</th>
                <th>Done %</th>
                <th>Pending Quantity</th>
                <th>Pending %</th>
              </tr>
            </thead>
            <tbody>
              {(po.items || []).map((it) => (
                <tr key={it.id} className="kerp-table__row--static">
                  <td className="task-table__name">{it.equipmentName}</td>
                  <td>{fmtQty(it.quantity)}</td>
                  <td>{fmtQty(it.doneQty)}</td>
                  <td>
                    <KamdhenuProgress percent={it.donePercent} />
                  </td>
                  <td>{fmtQty(it.pendingQty)}</td>
                  <td>{it.pendingPercent}%</td>
                </tr>
              ))}
              <tr className="kerp-table__row--static kerp-rollup-row">
                <td className="task-table__name">Total</td>
                <td>{fmtQty(po.totalQty)}</td>
                <td>{fmtQty(po.totalDoneQty)}</td>
                <td>
                  <KamdhenuProgress percent={po.donePercent} />
                </td>
                <td>{fmtQty(po.totalPendingQty)}</td>
                <td>{po.totalQty > 0 ? Math.round((po.totalPendingQty / po.totalQty) * 1000) / 10 : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Material IN against this Work Order</h2>
        </div>
        {materialIns.length === 0 ? (
          <div className="panel__empty">No material IN vouchers yet.</div>
        ) : (
          <div className="table-wrap kerp-mini-table">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Voucher</th>
                  <th>Date</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {materialIns.map((mi) => (
                  <tr key={mi.id} className="kerp-table__row--static">
                    <td className="task-table__name">{mi.voucherNumber}</td>
                    <td>{fmtDate(mi.inDate)}</td>
                    <td>{(mi.items || []).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Job Works against this Work Order</h2>
        </div>
        {jobWorks.length === 0 ? (
          <div className="panel__empty">No job work entries yet.</div>
        ) : (
          <div className="table-wrap kerp-mini-table">
            <table className="task-table">
              <thead>
                <tr>
                  <th>JW No</th>
                  <th>Date</th>
                  <th>Equipment</th>
                  <th>Start Qty</th>
                  <th>Done Qty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {jobWorks.map((jw) => (
                  <tr key={jw.id} className="kerp-table__row--static">
                    <td className="task-table__name">{jw.jwNumber}</td>
                    <td>{fmtDate(jw.workDate)}</td>
                    <td>{jw.equipmentName}</td>
                    <td>{fmtQty(jw.startQty)}</td>
                    <td>{fmtQty(jw.doneQty)}</td>
                    <td>
                      {jw.status === 'DONE' ? (
                        <span className="tag tag--success">Done</span>
                      ) : (
                        <span className="tag kerp-tag--warn">In Progress</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <KamdhenuConfirmDialog
        open={confirmDelete}
        title="Delete work order"
        message={`Delete ${po.poNumber} permanently? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy === 'delete'}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
