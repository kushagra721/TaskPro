import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import OtpInput from '../components/OtpInput.jsx';
import BrandPanel from '../components/BrandPanel.jsx';
import { useDispatch } from 'react-redux';
import { authApi } from '../api/client.js';
import { setCredentials } from '../store/slices/authSlice.js';

const RESEND_SECONDS = 30;
const OTP_LENGTH = 4;

export default function Verify() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  const email = state?.email;
  const purpose = state?.purpose || 'login';

  // Surface the verification code on-screen (shown in all environments).
  useEffect(() => {
    if (state?.devCode) setInfo(`Your verification code is ${state.devCode}`);
  }, [state]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // If the page was opened directly without going through login/signup.
  if (!email) return <Navigate to="/login" replace />;

  const submit = async (finalCode) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verify({ email, code: finalCode, purpose });
      dispatch(setCredentials({ token: res.token, user: res.user }));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length >= 4) submit(code);
  };

  const handleChange = (next) => {
    setCode(next);
    setError('');
    if (next.length === OTP_LENGTH) submit(next); // auto-submit when full
  };

  const resend = async () => {
    setError('');
    setInfo('');
    try {
      const res = await authApi.resend({ email, purpose });
      setInfo(res.devCode ? `Your new verification code is ${res.devCode}` : 'A new code has been sent.');
      setCooldown(RESEND_SECONDS);
      setCode('');
    } catch (err) {
      setError(err.message);
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

          <h2 className="auth__title">Check your email</h2>
          <p className="auth__subtitle">
            We sent a verification code to <span className="verify__email">{email}</span>.
          </p>

          {error && <div className="alert alert--error">{error}</div>}
          {info && <div className="alert alert--info">{info}</div>}

          <OtpInput value={code} onChange={handleChange} length={OTP_LENGTH} disabled={loading} />

          <div className="verify__meta">
            <button type="button" className="link-btn" onClick={() => navigate(-1)}>
              ← Change email
            </button>
            {cooldown > 0 ? (
              <span>Resend in {cooldown}s</span>
            ) : (
              <button type="button" className="link-btn" onClick={resend}>
                Resend code
              </button>
            )}
          </div>

          <div style={{ marginTop: 22 }}>
            <button className="btn" type="submit" disabled={loading || code.length < 4}>
              {loading ? <span className="spinner" /> : 'Verify & continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
