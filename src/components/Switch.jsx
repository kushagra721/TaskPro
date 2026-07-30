/** A small on/off pill toggle — used for the Plans list's Active column and
 *  the Create/Edit Plan page's boolean feature flags. Plain checkbox under
 *  the hood (keyboard/screen-reader accessible for free), styled via
 *  sibling selectors on `.switch__track`. */
export default function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`switch ${disabled ? 'switch--disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="switch__track">
        <span className="switch__thumb" />
      </span>
      {label && <span className="switch__label">{label}</span>}
    </label>
  );
}
