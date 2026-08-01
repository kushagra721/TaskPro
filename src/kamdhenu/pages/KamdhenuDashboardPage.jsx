import { useEffect, useState } from 'react';
import { kamdhenuApi } from '../../api/client.js';
import KamdhenuProgress from '../components/KamdhenuProgress.jsx';
import { fmtDate, fmtQty } from '../components/kamdhenuFormat.js';

const CARDS = [
  { key: 'totalSites', label: 'Total Sites', accent: 'indigo' },
  { key: 'totalPurchaseOrders', label: 'Total Purchase Orders', accent: 'violet' },
  { key: 'totalEquipment', label: 'Total Equipment', accent: 'indigo' },
  { key: 'totalMaterials', label: 'Total Materials', accent: 'emerald' },
  { key: 'totalMembers', label: 'Total Members', accent: 'emerald' },
  { key: 'totalJobWorks', label: 'Total Job Works', accent: 'violet' },
  { key: 'lowStockMaterials', label: 'Low Stock Materials', accent: 'amber' },
  { key: 'pendingPoQty', label: 'Pending PO Quantity', accent: 'amber', format: fmtQty },
];

export default function KamdhenuDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await kamdhenuApi.dashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Could not load the dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="stat-grid">
          {CARDS.slice(0, 4).map((c) => (
            <div key={c.key} className={`stat-card stat-card--${c.accent}`}>
              <div className="stat-card__value">
                <span className="kerp-skel kerp-skel--stat" />
              </div>
              <div className="stat-card__label">{c.label}</div>
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="panel__empty">
            <span className="spinner" /> Loading dashboard…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="panel">
          <div className="alert alert--error">{error}</div>
          <button type="button" className="btn btn--sm" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const cards = data?.cards || {};
  const recentJobWorks = data?.recentJobWorks || [];
  const lowStockMaterials = data?.lowStockMaterials || [];
  const latestPoStatus = data?.latestPoStatus || [];
  const siteWiseProgress = data?.siteWiseProgress || [];

  return (
    <div className="page">
      <div className="page__head">
        <h1 className="page__title">Dashboard</h1>
        <p className="page__subtitle">Kamdhenu Construction — job work progress at a glance.</p>
      </div>

      <div className="stat-grid kerp-stat-grid">
        {CARDS.map((c) => (
          <div key={c.key} className={`stat-card stat-card--${c.accent}`}>
            <div className="stat-card__value">
              {c.format ? c.format(cards[c.key] ?? 0) : cards[c.key] ?? 0}
            </div>
            <div className="stat-card__label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Recent Job Works</h2>
          </div>
          {recentJobWorks.length === 0 ? (
            <div className="panel__empty">No job work entries yet.</div>
          ) : (
            <div className="table-wrap kerp-mini-table">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>JW No.</th>
                    <th>Date</th>
                    <th>Site</th>
                    <th>Equipment</th>
                    <th>Done Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobWorks.map((jw, i) => (
                    <tr key={jw.id || `${jw.jwNumber}-${i}`} className="kerp-table__row--static">
                      <td className="task-table__name">{jw.jwNumber}</td>
                      <td>{fmtDate(jw.workDate)}</td>
                      <td>{jw.siteName || '—'}</td>
                      <td>{jw.equipmentName || '—'}</td>
                      <td>{fmtQty(jw.doneQty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Low Stock Materials</h2>
          </div>
          {lowStockMaterials.length === 0 ? (
            <div className="panel__empty">All materials are above minimum stock.</div>
          ) : (
            <div className="table-wrap kerp-mini-table">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Site</th>
                    <th>Stock</th>
                    <th>Min</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockMaterials.map((r, i) => (
                    <tr key={`${r.materialId}-${r.siteId || i}`} className="kerp-table__row--static">
                      <td className="task-table__name">{r.materialName}</td>
                      <td>{r.siteName || 'All sites'}</td>
                      <td>{fmtQty(r.currentQty)}</td>
                      <td>{fmtQty(r.minQty)}</td>
                      <td>
                        <span
                          className={`tag ${r.status === 'OUT_OF_STOCK' ? 'kerp-tag--danger' : 'kerp-tag--warn'}`}
                        >
                          {r.status === 'OUT_OF_STOCK' ? 'OUT' : 'LOW'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Latest PO Status</h2>
          </div>
          {latestPoStatus.length === 0 ? (
            <div className="panel__empty">No purchase orders yet.</div>
          ) : (
            <div className="table-wrap kerp-mini-table">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>PO No.</th>
                    <th>Site</th>
                    <th>PO Qty</th>
                    <th>Done Qty</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {latestPoStatus.map((po, i) => (
                    <tr key={po.id || `${po.poNumber}-${i}`} className="kerp-table__row--static">
                      <td className="task-table__name">{po.poNumber}</td>
                      <td>{po.siteName || '—'}</td>
                      <td>{fmtQty(po.totalQty)}</td>
                      <td>{fmtQty(po.totalDoneQty)}</td>
                      <td>
                        <KamdhenuProgress percent={po.donePercent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Site Wise Progress</h2>
          </div>
          {siteWiseProgress.length === 0 ? (
            <div className="panel__empty">No site progress yet.</div>
          ) : (
            <div className="table-wrap kerp-mini-table">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Total Qty</th>
                    <th>Done Qty</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {siteWiseProgress.map((s, i) => (
                    <tr key={s.siteId || i} className="kerp-table__row--static">
                      <td className="task-table__name">{s.siteName || '—'}</td>
                      <td>{fmtQty(s.totalQty)}</td>
                      <td>{fmtQty(s.doneQty)}</td>
                      <td>
                        <KamdhenuProgress percent={s.donePercent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
