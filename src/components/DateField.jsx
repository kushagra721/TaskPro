import { useRef } from 'react';
import { formatDate } from '../utils/status.js';

/**
 * Date input that displays "21 Jul 2026" instead of the browser's locale
 * format. A real `<input type="date">` sits transparently on top of the
 * styled display so the native picker still opens on click/tap and full
 * keyboard/accessibility behavior is preserved — only the visible text differs.
 */
export default function DateField({ value, onChange, min, max, placeholder = 'Select date', id }) {
  const inputRef = useRef(null);

  const openPicker = () => {
    if (inputRef.current?.showPicker) {
      try {
        inputRef.current.showPicker();
        return;
      } catch {
        /* fall through to focus */
      }
    }
    inputRef.current?.focus();
  };

  return (
    <div className="date-field" onClick={openPicker}>
      <span className={`date-field__text ${value ? '' : 'date-field__text--placeholder'}`}>
        {value ? formatDate(value) : placeholder}
      </span>
      <input
        ref={inputRef}
        id={id}
        className="date-field__native"
        type="date"
        min={min}
        max={max}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
