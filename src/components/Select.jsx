import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon, CheckIcon, SearchIcon, PlusIcon } from './icons.jsx';

/**
 * Themed custom dropdown (replaces native <select> so the option list matches
 * the app theme). Opens to a searchable list. Props:
 * - value, onChange(value)
 * - options: [{ value, label }]
 * - placeholder
 * - searchable: show the search box (default true)
 * - onCreateNew(query): when provided, a search that matches nothing shows an
 *   "+ Add <query>" row instead of just "No matches" (e.g. Project/Group
 *   fields on the task form — search for something that doesn't exist yet,
 *   then create it without leaving the dropdown).
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled,
  searchable = true,
  onCreateNew,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const searchRef = useRef(null);

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

  // Reset + focus the search each time the menu opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      const id = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const showSearch = searchable;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };

  const createNew = () => {
    const q = query.trim();
    if (!q) return;
    onCreateNew(q);
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
          {showSearch && (
            <div className="sel__search">
              <SearchIcon size={15} />
              <input
                ref={searchRef}
                className="sel__search-input"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          <div className="sel__list">
            {filtered.length === 0 ? (
              <div className="sel__empty">
                No matches
                {onCreateNew && query.trim() && (
                  <button type="button" className="sel__create" onClick={createNew}>
                    <PlusIcon size={13} /> Add &ldquo;{query.trim()}&rdquo;
                  </button>
                )}
              </div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`sel__option ${o.value === value ? 'sel__option--active' : ''}`}
                  onClick={() => pick(o.value)}
                >
                  <span>{o.label}</span>
                  {o.value === value && <CheckIcon size={15} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
