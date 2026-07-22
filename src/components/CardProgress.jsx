/** A thin progress bar + percentage, meant to sit inline under a list card
 *  (group/project/member row) — just the completion rate, no completed/total
 *  fraction repeated (the card above it already shows the counts). */
export default function CardProgress({ rate }) {
  if (rate == null) return null;
  return (
    <div className="card-progress">
      <div className="progress-bar"><span className="progress-bar__fill" style={{ width: `${rate}%` }} /></div>
      <span className="card-progress__pct">{rate}%</span>
    </div>
  );
}
