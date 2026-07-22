import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './icons.jsx';
import Select from './Select.jsx';

// Clients can't be created in the future, so cap the inputs at today.
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Filter drawer for the Manage Clients list. Mirrors ProjectFilterDrawer's
 * shape, plus a "Created by" filter.
 */
export default function ClientFilterDrawer({ open, onClose, value, onApply, onClear, members = [] }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const apply = () => {
    onApply(draft);
    onClose();
  };
  const clear = () => {
    setDraft({ createdById: '', createdFrom: '', createdTo: '' });
    onClear();
    onClose();
  };

  return createPortal(
    <div className="drawer-overlay" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="drawer__head">
          <h3 className="drawer__title">Filters</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>

        <div className="drawer__body">
          <div className="field">
            <label className="field__label">Created by</label>
            <Select
              value={draft.createdById || ''}
              onChange={setVal('createdById')}
              placeholder="Anyone"
              options={[
                { value: '', label: 'Anyone' },
                ...members.map((m) => ({ value: m.id, label: m.name || m.email })),
              ]}
            />
          </div>

          <div className="field">
            <label className="field__label">Created date</label>
            <div className="row2">
              <input className="input" type="date" max={TODAY} value={draft.createdFrom || ''} onChange={set('createdFrom')} />
              <input className="input" type="date" max={TODAY} value={draft.createdTo || ''} onChange={set('createdTo')} />
            </div>
          </div>
        </div>

        <div className="drawer__foot">
          <button className="btn btn--ghost" onClick={clear}>Clear all</button>
          <button className="btn" onClick={apply}>Apply filters</button>
        </div>
      </aside>
    </div>,
    document.body
  );
}
