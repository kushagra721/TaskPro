import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons.jsx';

/**
 * A password field with a show/hide toggle.
 *
 * One component rather than the toggle inlined per form, because there are four
 * password fields across the app (login, signup, and two on the reset page) and
 * a reveal control that behaves differently on one of them is the kind of thing
 * nobody notices until they are locked out.
 *
 * Details that matter:
 *
 * - **The toggle is `type="button"`.** A bare <button> inside a form defaults to
 *   `submit`, so revealing the password would submit the login form instead.
 * - **It carries `tabIndex={-1}`.** Tabbing from the password field should reach
 *   the sign-in button, not a decoration in between.
 * - **`aria-pressed` + a label**, because to a screen reader the icon alone says
 *   nothing about which state you are in.
 * - **Revealed state is never the default and is not remembered** — it resets
 *   with the component, so a password is not left on screen after navigation.
 * - The visible text is `type="text"`, which means browsers will not offer to
 *   autofill it while revealed; that is the standard trade and the reason
 *   `autoComplete` is passed through by the caller rather than fixed here.
 */
export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder = 'Your password',
  autoComplete = 'current-password',
  invalid = false,
  ...rest
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="pw-input">
      <input
        id={id}
        className={`input pw-input__field ${invalid ? 'input--error' : ''}`}
        type={shown ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        {...rest}
      />
      <button
        type="button"
        tabIndex={-1}
        className="pw-input__toggle"
        aria-pressed={shown}
        aria-label={shown ? 'Hide password' : 'Show password'}
        title={shown ? 'Hide password' : 'Show password'}
        onClick={() => setShown((s) => !s)}
      >
        {shown ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  );
}
