import { useRef } from 'react';

/**
 * Segmented one-time-code input. Renders `length` boxes, supports paste,
 * arrow-key navigation and backspace. `value` is the full string; `onChange`
 * receives the updated string.
 */
export default function OtpInput({ value, onChange, length = 6, disabled }) {
  const refs = useRef([]);

  const chars = value.split('').slice(0, length);
  while (chars.length < length) chars.push('');

  const setChar = (index, char) => {
    const next = chars.slice();
    next[index] = char;
    onChange(next.join('').slice(0, length));
  };

  const handleChange = (index, raw) => {
    const digit = raw.replace(/\D/g, '');
    if (!digit) {
      setChar(index, '');
      return;
    }
    // Support typing/pasting multiple digits at once.
    const digits = digit.split('');
    const next = chars.slice();
    let i = index;
    for (const d of digits) {
      if (i >= length) break;
      next[i] = d;
      i += 1;
    }
    onChange(next.join('').slice(0, length));
    const focusAt = Math.min(i, length - 1);
    refs.current[focusAt]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className="otp">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className={`otp__box ${c ? 'otp__box--filled' : ''}`}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={c}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
