import { useEffect, useRef, useState } from 'react';
import { ChevronRightIcon } from './icons.jsx';

const fmt = (x) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

const monthRange = (d) => ({
  from: fmt(new Date(d.getFullYear(), d.getMonth(), 1)),
  to: fmt(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
});

const thisMonth = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1);
};

const today = () => fmt(new Date());

// Is `d` (a first-of-month Date) at or before the current month?
const isCurrentOrPastMonth = (d) => {
  const n = thisMonth();
  return d.getFullYear() < n.getFullYear() || (d.getFullYear() === n.getFullYear() && d.getMonth() <= n.getMonth());
};

// Detect the starting mode/month from a seeded {from,to}.
const seedState = (initial, defaultMode) => {
  const from = initial?.from;
  const to = initial?.to;
  if (from && to) {
    const f = new Date(from);
    const t = new Date(to);
    const isFullMonth =
      f.getDate() === 1 &&
      f.getFullYear() === t.getFullYear() &&
      f.getMonth() === t.getMonth() &&
      t.getDate() === new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    if (isFullMonth) return { mode: 'month', month: new Date(f.getFullYear(), f.getMonth(), 1), range: { from: '', to: '' } };
    return { mode: 'range', month: thisMonth(), range: { from, to } };
  }
  if (from || to) return { mode: 'range', month: thisMonth(), range: { from: from || '', to: to || '' } };
  return { mode: defaultMode, month: thisMonth(), range: { from: '', to: '' } };
};

/**
 * Period selector: Month (with ‹ month ›), All, or a custom Range.
 * Emits { from, to } (YYYY-MM-DD; empty = unbounded) via onChange.
 * Defaults to the current month and never allows selecting a future month/date.
 */
export default function DateRangeControl({ onChange, initial, defaultMode = 'month' }) {
  const seed = useRef(seedState(initial, defaultMode)).current;
  const [mode, setMode] = useState(seed.mode);
  const [month, setMonth] = useState(seed.month);
  const [range, setRange] = useState(seed.range);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (mode === 'month') onChangeRef.current(monthRange(month));
    else if (mode === 'all') onChangeRef.current({ from: '', to: '' });
    else onChangeRef.current({ from: range.from, to: range.to });
  }, [mode, month, range]);

  const shiftMonth = (delta) => {
    setMonth((m) => {
      const next = new Date(m.getFullYear(), m.getMonth() + delta, 1);
      return delta > 0 && !isCurrentOrPastMonth(next) ? m : next; // block future
    });
  };

  const canGoNext = !isCurrentOrPastMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const max = today();

  return (
    <div className="daterange">
      <div className="daterange__seg">
        {['month', 'all', 'range'].map((m) => (
          <button
            key={m}
            className={`daterange__seg-btn ${mode === m ? 'daterange__seg-btn--active' : ''}`}
            onClick={() => setMode(m)}
          >
            {m === 'month' ? 'Month' : m === 'all' ? 'All' : 'Range'}
          </button>
        ))}
      </div>

      {mode === 'month' && (
        <div className="daterange__month">
          <button className="pager-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronRightIcon size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <span className="daterange__label">{monthLabel}</span>
          <button className="pager-btn" onClick={() => shiftMonth(1)} disabled={!canGoNext} aria-label="Next month">
            <ChevronRightIcon size={16} />
          </button>
        </div>
      )}

      {mode === 'range' && (
        <div className="daterange__range">
          <input
            className="input"
            type="date"
            max={max}
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
          <span className="daterange__dash">–</span>
          <input
            className="input"
            type="date"
            max={max}
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </div>
      )}
    </div>
  );
}
