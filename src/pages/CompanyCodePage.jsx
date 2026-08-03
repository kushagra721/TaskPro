import { useState } from 'react';
import BrandPanel from '../components/BrandPanel.jsx';
import { authApi, companyStore } from '../api/client.js';

/**
 * Step 1 of the **mobile** login flow, shown before anything else on first
 * launch of the Android/iOS app.
 *
 * The web app knows which company it belongs to from the domain it was served
 * on. A native app has no such hostname, so the user identifies their company
 * once with a short code; from then on `api/client.js` sends it as
 * `X-Company-Code` and every request — login included — resolves to the right
 * tenant. This screen never authenticates anybody: it only picks the tenant,
 * and hands straight over to the unchanged email/password (or OTP) login.
 *
 * It is also where the app decides **which product** it is: the resolved code
 * is fed to `projects/registry.js`, so this screen precedes not just login but
 * routing and branding too. It therefore carries the group brand, DialERP,
 * rather than any one product's name.
 *
 * Deliberately mirrors `Login.jsx`'s markup and classes (`.auth`,
 * `.auth__card`, `.field`, `.alert`) so the two screens read as one flow.
 *
 * `defaultCode` prefills the field (a re-confirmation after an expired
 * session, or the "Change" link on the login screen); `notice` explains why
 * the user is being asked again; `onCancel` — when given — offers a way back.
 */
export default function CompanyCodePage({ onResolved, defaultCode, notice, onCancel }) {
  const [code, setCode] = useState(defaultCode || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { company } = await authApi.company(code);
      // Persist before handing over — the very next request (the login POST)
      // has to carry the header, and a reload mid-login must not lose it.
      companyStore.set(company);
      onResolved(company);
    } catch (err) {
      // The backend distinguishes "no such code" (404) from "company is
      // inactive" (403) and both messages are written for an end user, so
      // they're shown as-is rather than flattened into one generic line.
      setError(err.message || 'Could not check that company code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <BrandPanel />
      <div className="auth__panel">
        <form className="auth__card" onSubmit={submit} noValidate>
          {/* The group brand, not a product's — which product this is hasn't
              been decided yet at this point in the flow; the code decides it. */}
          <div className="auth__mobile-logo">
            <span className="brand__logo-mark">✓</span> DialERP
          </div>

          <h2 className="auth__title">Enter your company code</h2>
          <p className="auth__subtitle">
            Your administrator gives you this code. It tells the app which company you belong to — you only need to
            enter it once.
          </p>

          {notice && !error && <div className="alert alert--warn">{notice}</div>}
          {error && <div className="alert alert--error">{error}</div>}

          <div className="field">
            <label className="field__label" htmlFor="companyCode">Company code</label>
            <input
              id="companyCode"
              className={`input input--code ${error ? 'input--error' : ''}`}
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              // Normalised as you type so what's on screen is exactly what
              // gets checked — people type spaces and dashes into code fields.
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase());
                setError('');
              }}
              placeholder="COMPANY"
              maxLength={20}
            />
          </div>

          <button className="btn" type="submit" disabled={loading || code.length < 4}>
            {loading ? <span className="spinner" /> : 'Continue'}
          </button>

          {/* Only offered when there is somewhere to go back to — on first
              launch, and after an expired session, there isn't. */}
          {onCancel && (
            <p className="auth__foot">
              <button type="button" className="link-btn" onClick={onCancel} disabled={loading}>
                Cancel
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
