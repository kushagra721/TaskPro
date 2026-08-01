import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { kamdhenuApi } from '../../api/client.js';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtDate, fmtQty } from '../components/kamdhenuFormat.js';
import { ArrowLeftIcon } from '../../components/icons.jsx';

const IMAGE_TYPES = ['image/jpeg', 'image/png'];

const thumb = (url, alt) =>
  url ? (
    <a href={url} target="_blank" rel="noreferrer" title="Open full size">
      <img src={url} alt={alt} className="kerp-jw-thumb" />
    </a>
  ) : (
    '—'
  );

/** Job Work details — header info plus one row PER EQUIPMENT UNIT (serial,
 *  before/after pictures, status, done date and that serial's last done date).
 *  Each pending unit has its own "Upload After Picture" control; the unit
 *  completes individually and the header flips to DONE once every unit is. */
export default function KamdhenuJobWorkViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useKamdhenuToast();

  const [jw, setJw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingUnitId, setUploadingUnitId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await kamdhenuApi.jobWorks.get(id);
        if (!cancelled) setJw(res.jobWork);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load the job work entry');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onPickAfterFile = async (unit, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPEG or PNG images are allowed');
      return;
    }
    setUploadingUnitId(unit.id);
    try {
      const up = await kamdhenuApi.upload([file]);
      const url = up.files?.[0]?.url;
      if (!url) throw new Error('Upload failed');
      const res = await kamdhenuApi.jobWorks.uploadUnitAfter(id, unit.id, url);
      setJw(res.jobWork);
      if (res.jobWork?.status === 'DONE') {
        toast.success(`Job work ${res.jobWork?.jwNumber || ''} completed`.trim());
      } else {
        toast.success(`Unit ${unit.serialNumber} marked done`);
      }
    } catch (err) {
      toast.error(err.message || 'Could not upload the after picture');
    } finally {
      setUploadingUnitId(null);
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

  if (error || !jw) {
    return (
      <div className="page">
        <div className="panel">
          <div className="alert alert--error">{error || 'Job work entry not found'}</div>
          <button type="button" className="btn btn--sm" onClick={() => navigate('/kamdhenu/job-works')}>
            Back to Job Work
          </button>
        </div>
      </div>
    );
  }

  const units = jw.units || [];

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <button type="button" className="link-btn" onClick={() => navigate('/kamdhenu/job-works')}>
            <ArrowLeftIcon size={14} /> All job works
          </button>
          <h1 className="page__title">Job Work {jw.jwNumber}</h1>
          <p className="page__subtitle">
            {jw.siteName || '—'} · Work Order {jw.poNumber || '—'} · {jw.equipmentName || '—'}
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Details</h2>
        </div>
        <div className="kerp-detail-grid">
          <div>
            <div className="field__label">JW No</div>
            <div>{jw.jwNumber}</div>
          </div>
          <div>
            <div className="field__label">Work Order No</div>
            <div>{jw.poNumber || '—'}</div>
          </div>
          <div>
            <div className="field__label">Site</div>
            <div>{jw.siteName || '—'}</div>
          </div>
          <div>
            <div className="field__label">Equipment</div>
            <div>{jw.equipmentName || '—'}</div>
          </div>
          <div>
            <div className="field__label">Work Date</div>
            <div>{fmtDate(jw.workDate)}</div>
          </div>
          <div>
            <div className="field__label">Done Date</div>
            <div>{jw.doneDate ? fmtDate(jw.doneDate) : '—'}</div>
          </div>
          <div>
            <div className="field__label">Start Qty</div>
            <div>{fmtQty(jw.startQty)}</div>
          </div>
          <div>
            <div className="field__label">Done Qty</div>
            <div>{fmtQty(jw.doneQty)}</div>
          </div>
          <div>
            <div className="field__label">Status</div>
            <div>
              {jw.status === 'DONE' ? (
                <span className="tag tag--success">Done</span>
              ) : (
                <span className="tag kerp-tag--warn">In Progress</span>
              )}
            </div>
          </div>
          <div>
            <div className="field__label">Days</div>
            <div>{jw.days ?? '—'}</div>
          </div>
          <div className="kerp-detail-grid__wide">
            <div className="field__label">Workers</div>
            <div>
              {(jw.members || []).length === 0
                ? '—'
                : jw.members.map((m) => `${m.memberName || '—'}${m.role ? ` (${m.role})` : ''}`).join(', ')}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">
            Units ({units.filter((u) => u.status === 'DONE').length}/{units.length} done)
          </h2>
        </div>
        <div className="table-wrap kerp-mini-table">
          <table className="task-table">
            <thead>
              <tr>
                <th>Serial No</th>
                <th>Before Picture</th>
                <th>After Picture</th>
                <th>Status</th>
                <th>Done Date</th>
                <th>Last Done Date</th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 ? (
                <tr className="kerp-table__row--static">
                  <td colSpan={6}>No units on this job work.</td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id} className="kerp-table__row--static">
                    <td className="task-table__name">{unit.serialNumber || '—'}</td>
                    <td>{thumb(unit.beforeImageUrl, `${unit.serialNumber} before`)}</td>
                    <td>
                      {unit.status === 'DONE' ? (
                        thumb(unit.afterImageUrl, `${unit.serialNumber} after`)
                      ) : (
                        <div className="field" style={{ maxWidth: 240 }}>
                          <input
                            className="input kerp-file-input"
                            type="file"
                            accept="image/jpeg,image/png"
                            capture="environment"
                            title="Upload After Picture (JPEG/PNG)"
                            onChange={(e) => onPickAfterFile(unit, e)}
                            disabled={uploadingUnitId !== null}
                          />
                          {uploadingUnitId === unit.id ? (
                            <span className="kerp-stock-hint">
                              <span className="spinner" /> Uploading &amp; completing…
                            </span>
                          ) : (
                            <span className="kerp-stock-hint">
                              Uploading the after picture marks this unit as Done.
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {unit.status === 'DONE' ? (
                        <span className="tag tag--success">Done</span>
                      ) : (
                        <span className="tag kerp-tag--warn">Pending</span>
                      )}
                    </td>
                    <td>{unit.doneDate ? fmtDate(unit.doneDate) : '—'}</td>
                    <td>{unit.lastDoneDate ? fmtDate(unit.lastDoneDate) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
