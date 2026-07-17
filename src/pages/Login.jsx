import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandPanel from '../components/BrandPanel.jsx';
import { authApi } from '../api/client.js';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(form);
      navigate('/verify', {
        state: { email: res.email, purpose: 'login', devCode: res.devCode },
      });
    } catch (err) {
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

  return (
    <div className="auth">
      <BrandPanel />
      <div className="auth__panel">
        <form className="auth__card" onSubmit={handleSubmit} noValidate>
          <div className="auth__mobile-logo">
            <span className="brand__logo-mark">✓</span> Task&nbsp;Pro
          </div>

          <h2 className="auth__title">Welcome back</h2>
          <p className="auth__subtitle">Enter your email and we'll send you a login code.</p>

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

          <button className="btn" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Continue'}
          </button>

          <p className="auth__foot">
            Don&apos;t have an account? <Link className="link" to="/signup">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
