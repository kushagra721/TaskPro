import { useEffect, useRef, useState } from 'react';
import { MoreIcon } from './icons.jsx';

/**
 * Small "..." icon button that opens a dropdown of actions (Edit/Delete etc.).
 * `items`: [{ label, icon, onClick, danger }]
 */
export default function MoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="more-menu" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="More options"
        title="More options"
      >
        <MoreIcon size={17} />
      </button>
      {open && (
        <div className="more-menu__list">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              className={`more-menu__item ${it.danger ? 'more-menu__item--danger' : ''}`}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
