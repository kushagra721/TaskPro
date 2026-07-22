/** One row of a progress list (Reports' Progress by member/group, and the
 *  Groups page's Progress by group panel) — a label, a completed/open/rate
 *  summary line, and a fill bar. Just the rate is called out numerically;
 *  the raw completed/total fraction is redundant next to the bar itself. */
export default function ProgressRow({ label, sub, avatar, rate }) {
  return (
    <li className="progress-row">
      <div className="progress-row__head">
        <div className="progress-row__label">
          {avatar}
          <div>
            <div className="progress-row__name">{label}</div>
            {sub && <div className="progress-row__sub">{sub}</div>}
          </div>
        </div>
        <div className="progress-row__stat">{rate}%</div>
      </div>
      <div className="progress-bar">
        <span className="progress-bar__fill" style={{ width: `${rate}%` }} />
      </div>
    </li>
  );
}
