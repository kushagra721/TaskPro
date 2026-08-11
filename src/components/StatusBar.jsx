import { STATUS_META } from '../utils/status.js';

/** Below this share a segment is too narrow to hold "12%" without the text
 *  spilling over its neighbours, so the label is dropped and the `title`
 *  tooltip carries the number instead. Chosen for the narrower of the two
 *  columns the bar appears in, not the wider. */
const LABEL_MIN_PERCENT = 12;

/**
 * A task mix as one bar: open, completed and cancelled side by side, each
 * segment sized by its share and labelled with that share.
 *
 * Deliberately NOT the single-fill `ProgressRow` bar, which plots one number
 * (completion rate) and so cannot distinguish a group that finished 8 of 10
 * from one that finished 8 and cancelled 2 — very different states that both
 * read as 80%. Here cancellation is visible rather than folded into "not done".
 *
 * `emphasis` dims the segments that are not the currently selected status, so
 * the bar answers the question the page is actually asking ("where is the open
 * work?") while still showing the whole for context. Omitted, all three are
 * shown at full strength.
 */
export default function StatusBar({ open = 0, completed = 0, cancelled = 0, emphasis }) {
  const total = open + completed + cancelled;

  // An entity with no tasks in range gets an empty track rather than nothing at
  // all — a missing bar mid-list reads as a rendering fault, a flat one reads
  // as "no work here", which is the truth.
  if (!total) return <div className="statusbar statusbar--empty" aria-hidden="true" />;

  const segments = [
    { key: 'OPEN', value: open },
    { key: 'COMPLETED', value: completed },
    { key: 'CANCELLED', value: cancelled },
  ]
    .filter((s) => s.value > 0)
    .map((s) => ({ ...s, percent: Math.round((s.value / total) * 100) }));

  return (
    <div
      className="statusbar"
      role="img"
      aria-label={segments
        .map((s) => `${STATUS_META[s.key].label} ${s.value} (${s.percent}%)`)
        .join(', ')}
    >
      {segments.map((s) => (
        <span
          key={s.key}
          className={`statusbar__seg${emphasis && emphasis !== s.key ? ' statusbar__seg--muted' : ''}`}
          /* Width is the EXACT share, while the label is rounded — so three
             segments always fill the bar even when their rounded percentages
             sum to 99 or 101. Sizing by the rounded figure instead would leave
             a visible sliver of track showing at the end of some rows. */
          style={{ width: `${(s.value / total) * 100}%`, background: STATUS_META[s.key].color }}
          title={`${STATUS_META[s.key].label}: ${s.value} (${s.percent}%)`}
        >
          {s.percent >= LABEL_MIN_PERCENT && <span className="statusbar__pct">{s.percent}%</span>}
        </span>
      ))}
    </div>
  );
}
