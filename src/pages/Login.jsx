import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import BrandPanel from '../components/BrandPanel.jsx';
import { authApi, domainStore } from '../api/client.js';
import { setCredentials } from '../store/slices/authSlice.js';
import { isNativeApp } from '../utils/native.js';
import DomainPicker from '../components/DomainPicker.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mode, setMode] = useState('password'); // 'password' | 'otp'
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Native only: the domains this email can sign in on, once there is more than
  // one. Null means "not asked / nothing to choose" and the form renders as
  // normal — which is every web session and most native ones.
  const [domainChoices, setDomainChoices] = useState(null);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setFieldErrors({});
  };

  const goToVerify = (res, purpose) => {
    navigate('/verify', { state: { email: res.email, purpose, devCode: res.devCode } });
  };

  /**
   * Native pre-step: settle which domain this login is for.
   *
   * Runs BEFORE the credential check, not after, because the domain decides
   * which account is being authenticated — two accounts on two domains can have
   * different passwords. Returns true when the caller should stop and let the
   * user pick.
   *
   * Web skips this entirely: the browser is already on a domain.
   * Zero or one domain also skips it — one option is not a choice, and an
   * unknown email falls through to the normal "no account" handling.
   */
  /**
   * Native pre-step: settle which domain this login is for.
   *
   * Runs BEFORE the credential check because the domain decides WHICH account
   * is being authenticated — the same email on two domains is two accounts and
   * can have two different passwords (kushagra@dialerp.in has a password on one
   * and none on the other).
   *
   * Returns the domain list only when there is a real choice to make. Web skips
   * it entirely (the browser is already on a domain); zero or one domain skips
   * it too, since one option is not a choice.
   */
  const resolveDomains = async () => {
    if (!isNativeApp()) return null;
    const res = await authApi.loginDomains(form.email);
    const list = res.domains || [];
    if (list.length > 1) return list;
    // Pin the single domain so every later request is scoped to it; without
    // this the app falls back to the server's default-host mapping.
    if (list.length === 1) domainStore.set(list[0].id);
    else domainStore.clear();
    return null;
  };

  /**
   * The actual sign-in, split out so it can be driven from two places: the form
   * submit, and the domain picker once a domain has been chosen.
   *
   * Separating these is what fixes the loop this originally shipped with. The
   * gate used to live inside the submit handler and re-ran on every submit with
   * no memory of the choice, so picking a domain returned to the form and the
   * next submit showed the picker again — no way forward.
   */
  const performLogin = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'otp') {
        const res = await authApi.login({ email: form.email });
        goToVerify(res, 'login');
        return;
      }

      const res = await authApi.loginWithPassword({ email: form.email, password: form.password });
      if (res.requiresVerification) {
        goToVerify(res, res.purpose);
        return;
      }
      dispatch(setCredentials({ token: res.token, user: res.user }));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.status === 404) {
        navigate('/signup', { state: { email: form.email } });
        return;
      }
      if (err.fields) {
        const map = {};
        err.fields.forEach((f) => (map[f.field] = f.message));
        setFieldErrors(map);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /** Pin the chosen domain and CONTINUE — not back to the form. The credentials
   *  were already entered; sending the user back to re-enter them is what made
   *  this look broken. */
  const chooseDomain = async (domain) => {
    domainStore.set(domain.id);
    setDomainChoices(null);
    await performLogin();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let choices;
    try {
      choices = await resolveDomains();
    } catch (err) {
      /**
       * ⚠️ A FAILED DOMAIN LOOKUP MUST STOP, NOT FALL THROUGH.
       *
       * This used to `catch { return null }`, which made every failure —
       * unreachable API, blocked cleartext, rate limit — indistinguishable
       * from "this email has one domain". The picker then never appeared and
       * the login went out with no `X-Domain-Id`, so the server resolved the
       * default tenant, found no account there, and the 404 handler below
       * bounced the user to the SIGNUP page. Reproduced here by pointing the
       * app at an unreachable host: on a two-domain account the picker simply
       * did not appear and the form sat there.
       *
       * Stopping with the reason is the whole fix: the user sees what went
       * wrong instead of being quietly signed in to the wrong tenant, or sent
       * to sign up for an account they already have.
       *
       * Native only — the web build returns before this can throw.
       */
      setLoading(false);
      setError(
        `${err.message || 'Could not check which workspace this email belongs to.'} Please try again.`
      );
      return;
    }
    setLoading(false);
    // More than one account for this address — let the user say which, then
    // `chooseDomain` resumes from here.
    if (choices) {
      setDomainChoices(choices);
      return;
    }
    await performLogin();
  };

  return (
    <div className="auth">
      <BrandPanel />
      <div className="auth__panel">
        {/* Native only, and only when the email really has more than one
            account. Replaces the form rather than stacking above it — the
            credential fields are meaningless until the tenant is settled. */}
        {domainChoices ? (
          <div className="auth__card">
            <DomainPicker
              email={form.email}
              domains={domainChoices}
              busy={loading}
              onSelect={chooseDomain}
              onBack={() => {
                setDomainChoices(null);
                domainStore.clear();
              }}
            />
          </div>
        ) : (
        <form className="auth__card" onSubmit={handleSubmit} noValidate>
          <div className="auth__mobile-logo">
            <span className="brand__logo-mark">✓</span> Task&nbsp;Pro
          </div>

          <h2 className="auth__title">Welcome back</h2>
          <p className="auth__subtitle">
            {mode === 'password'
              ? 'Enter your email and password to sign in.'
              : "Enter your email and we'll send you a login code."}
          </p>

          {error && <div className="alert alert--error">{error}</div>}

          <div className="field">
            <label className="field__label" htmlFor="email">Email</label>
            <input
              id="email"
              className={`input ${fieldErrors.email ? 'input--error' : ''}`}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
            />
            {fieldErrors.email && <div className="field__error">{fieldErrors.email}</div>}
          </div>

          {mode === 'password' && (
            <div className="field">
              <label className="field__label" htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                value={form.password}
                onChange={update('password')}
                invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password && <div className="field__error">{fieldErrors.password}</div>}
              {/* Only on the password lane. On the OTP lane there is no password
                  to have forgotten — the code IS the credential — so offering a
                  reset there would answer a question nobody asked. The email
                  already typed is carried across so the reset page does not ask
                  for it twice. */}
              <p className="auth__forgot">
                <Link className="link-btn" to="/forgot-password" state={{ email: form.email }}>
                  Forgot password?
                </Link>
              </p>
            </div>
          )}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Continue'}
          </button>

          <p className="auth__foot">
            {mode === 'password' ? (
              <button type="button" className="link-btn" onClick={() => switchMode('otp')}>
                Login with OTP instead
              </button>
            ) : (
              <button type="button" className="link-btn" onClick={() => switchMode('password')}>
                Login with password instead
              </button>
            )}
          </p>

          <p className="auth__foot">
            Don&apos;t have an account? <Link className="link" to="/signup">Sign up</Link>
          </p>
        </form>
        )}
      </div>
    </div>
  );
}
