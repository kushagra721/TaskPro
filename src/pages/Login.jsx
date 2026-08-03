import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import BrandPanel from '../components/BrandPanel.jsx';
import CompanyCodePage from './CompanyCodePage.jsx';
import { authApi, companyStore } from '../api/client.js';
import { isNativeApp } from '../utils/native.js';
import { setCredentials } from '../store/slices/authSlice.js';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // Mobile only: which company this device is signed in to, and the escape
  // hatch for someone who entered the wrong code. Null on web, where the
  // tenant comes from the hostname and there is nothing to switch.
  const [company, setCompany] = useState(() => (isNativeApp() ? companyStore.get() : null));
  const [changingCompany, setChangingCompany] = useState(false);
  const [mode, setMode] = useState('password'); // 'password' | 'otp'
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  if (changingCompany) {
    return (
      <CompanyCodePage
        defaultCode={company?.companyCode}
        onCancel={() => setChangingCompany(false)}
        onResolved={(next) => {
          setCompany(next);
          setChangingCompany(false);
        }}
      />
    );
  }

  return (
    <div className="auth">
      <BrandPanel />
      <div className="auth__panel">
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

          {company && (
            <div className="company-strip">
              <span className="company-strip__text">
                Signing in to <strong>{company.name}</strong> <code className="code-chip">{company.companyCode}</code>
              </span>
              <button type="button" className="link-btn" onClick={() => setChangingCompany(true)}>
                Change
              </button>
            </div>
          )}

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
              <input
                id="password"
                className={`input ${fieldErrors.password ? 'input--error' : ''}`}
                type="password"
                placeholder="Your password"
                autoComplete="current-password"
                value={form.password}
                onChange={update('password')}
              />
              {fieldErrors.password && <div className="field__error">{fieldErrors.password}</div>}
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
      </div>
    </div>
  );
}
