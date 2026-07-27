import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { requestPlatformOtp, verifyPlatformOtp } from '../store/slices/platformAuthSlice.js';

/** Mirrors BrandPanel's look (same `.auth__brand`/`.brand__*` classes) with
 *  copy accurate to this being the mobile+OTP platform login, not the normal
 *  email-based client login. */
function PlatformBrandPanel() {
  return (
    <aside className="auth__brand">
      <div className="brand__logo">
        <span className="brand__logo-mark">✓</span>
        Task&nbsp;Pro
      </div>
      <div className="brand__hero">
        <h1>Platform access</h1>
        <p>Super Admin and Reseller accounts sign in with their mobile number and a one-time code.</p>
      </div>
    </aside>
  );
}

export default function PlatformLogin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [step, setStep] = useState('mobile'); // 'mobile' | 'otp'
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await dispatch(requestPlatformOtp(mobile.trim())).unwrap();
      setDevCode(res.devCode || '');
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Could not send the code');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await dispatch(verifyPlatformOtp({ mobile: mobile.trim(), code: code.trim() })).unwrap();
      navigate(res.platformUser.role === 'SUPER_ADMIN' ? '/platform/admin' : '/platform/reseller', {
        replace: true,
      });
    } catch (err) {
      setError(err.message || 'Incorrect code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <PlatformBrandPanel />
      <div className="auth__panel">
        <form className="auth__card" onSubmit={step === 'mobile' ? requestCode : verify} noValidate>
          <div className="auth__mobile-logo">
            <span className="brand__logo-mark">✓</span> Task&nbsp;Pro Platform
          </div>

          <h2 className="auth__title">{step === 'mobile' ? 'Platform sign in' : 'Enter the code'}</h2>
          <p className="auth__subtitle">
            {step === 'mobile'
              ? 'Super Admin and Reseller sign-in — enter your registered mobile number.'
              : `We sent a code to ${mobile}.`}
          </p>

          {error && <div className="alert alert--error">{error}</div>}
          {step === 'otp' && devCode && (
            <div className="alert">Dev code: <strong>{devCode}</strong></div>
          )}

          {step === 'mobile' ? (
            <div className="field">
              <label className="field__label" htmlFor="mobile">Mobile number</label>
              <input
                id="mobile"
                className="input"
                type="tel"
                placeholder="9812345678"
                autoFocus
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
          ) : (
            <div className="field">
              <label className="field__label" htmlFor="code">Verification code</label>
              <input
                id="code"
                className="input"
                inputMode="numeric"
                placeholder="0000"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          )}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : step === 'mobile' ? 'Send code' : 'Verify & sign in'}
          </button>

          {step === 'otp' && (
            <p className="auth__foot">
              <button type="button" className="link-btn" onClick={() => setStep('mobile')}>
                Use a different mobile number
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
