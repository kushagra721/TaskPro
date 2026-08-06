import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './icons.jsx';
import Select from './Select.jsx';

const ROLES = [
  { value: '', label: 'Anyone' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'CLIENT', label: 'Client' },
];

/** Filter drawer for the Members list — just role, mirrors the other drawers' shape. */
export default function MemberFilterDrawer({ open, onClose, value, onApply, onClear }) {
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

  const apply = () => {
    onApply(draft);
    onClose();
  };
  const clear = () => {
    setDraft({ role: '' });
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
            <label className="field__label">Role</label>
            <Select
              value={draft.role || ''}
              onChange={(v) => setDraft((d) => ({ ...d, role: v }))}
              placeholder="Anyone"
              options={ROLES}
            />
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
