import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, CheckIcon } from './icons.jsx';

/**
 * Themed custom dropdown (replaces native <select> so the option list matches
 * the app theme). Props:
 * - value, onChange(value)
 * - options: [{ value, label }]
 * - placeholder
 */
export default function Select({ value, onChange, options, placeholder = 'Select…', disabled }) {
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

  const selected = options.find((o) => o.value === value);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className={`sel ${disabled ? 'sel--disabled' : ''}`} ref={ref}>
      <button
        type="button"
        className={`sel__btn ${open ? 'sel__btn--open' : ''}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className={`sel__value ${selected ? '' : 'sel__value--placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon size={16} />
      </button>

      {open && (
        <div className="sel__menu">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`sel__option ${o.value === value ? 'sel__option--active' : ''}`}
              onClick={() => pick(o.value)}
            >
              <span>{o.label}</span>
              {o.value === value && <CheckIcon size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
