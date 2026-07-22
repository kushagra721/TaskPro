import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import BrandPanel from '../components/BrandPanel.jsx';
import { authApi } from '../api/client.js';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: location.state?.email || '' });
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
      const res = await authApi.signup(form);
      navigate('/verify', {
        state: { email: res.email, purpose: 'signup', devCode: res.devCode },
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

          <h2 className="auth__title">Create your account</h2>
          <p className="auth__subtitle">Start organising your work in minutes.</p>

          {error && <div className="alert alert--error">{error}</div>}
          {!error && location.state?.email && (
            <div className="alert alert--info">No account found for that email — finish signing up below.</div>
          )}

          <div className="field">
            <label className="field__label" htmlFor="name">Full name</label>
            <input
              id="name"
              className={`input ${fieldErrors.name ? 'input--error' : ''}`}
              type="text"
              placeholder="Ada Lovelace"
              autoComplete="name"
              value={form.name}
              onChange={update('name')}
            />
            {fieldErrors.name && <div className="field__error">{fieldErrors.name}</div>}
          </div>

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
            {loading ? <span className="spinner" /> : 'Create account'}
          </button>

          <p className="auth__foot">
            Already have an account? <Link className="link" to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
