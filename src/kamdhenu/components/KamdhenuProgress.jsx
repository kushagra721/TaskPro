/** Slim progress bar + percent label used on PO rows, PO detail and the
 *  dashboard. `percent` is 0–100 (values are clamped for display). */
export default function KamdhenuProgress({ percent }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <span className="kerp-progress" title={`${p}% done`}>
      <span className="kerp-progress__track">
        <span
          className={`kerp-progress__fill ${p >= 100 ? 'kerp-progress__fill--done' : ''}`}
          style={{ width: `${p}%` }}
        />
      </span>
      <span className="kerp-progress__pct">{p}%</span>
    </span>
  );
}
