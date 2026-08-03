import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { companyStore } from '../api/client.js';
import { resolveProject } from '../projects/registry.js';
import CompanyCodePage from '../pages/CompanyCodePage.jsx';

const EXPIRED_NOTICE = 'Your session has expired. Confirm your company code to sign in again.';

/**
 * Root of the **Android/iOS app**. Never rendered on web, where `main.jsx`'s
 * hostname/portal split decides what to mount instead.
 *
 * The native app has no marketing home screen and no hostname to identify a
 * tenant by, so launch is a three-step decision made here, before any product
 * UI renders:
 *
 *   1. **Company code** — not chosen yet? Show the code screen. Its answer
 *      picks both the tenant and, via `projects/registry.js`, which product
 *      this install is (Task Pro or Kamdhenu). Nothing product-specific is
 *      hardcoded here; adding a product is an entry in that registry.
 *   2. **Session** — ask the chosen product to restore and *verify* one. That
 *      is a real server round-trip, not a token-shaped-object check, so a
 *      revoked or expired session can't wave someone through to a dashboard
 *      that then 401s on every request.
 *   3. **Entry route** — a verified session lands on the dashboard; anything
 *      else lands on that product's login screen.
 *
 * The two failure modes are deliberately *not* treated alike:
 * - `'no-token'` — nobody has signed in on this device yet. Normal first run,
 *   so continue to login with the company code kept.
 * - `'invalid-token'` — there *was* a session and it is expired or refused.
 *   Return to the company code screen and restart the flow, per spec. The
 *   previous code is prefilled so it's one tap, not a re-typing exercise.
 *
 * Each product's `restoreSession` owns clearing its own credentials; this
 * shell deliberately touches no token store directly, so the Kamdhenu flow
 * can never disturb a Task Pro session or vice versa.
 */
export default function NativeApp() {
  const dispatch = useDispatch();
  const [company, setCompany] = useState(() => companyStore.get());
  // 'checking' until the session verdict is in — rendering product routes
  // before then would flash the login screen at an authenticated user.
  const [status, setStatus] = useState('checking');
  const [entryPath, setEntryPath] = useState(null);
  // Bumped on every code entry so re-confirming the *same* company still
  // re-runs the check below (the resolved project object is referentially
  // stable, so it alone can't retrigger the effect).
  const [attempt, setAttempt] = useState(0);

  const project = company ? resolveProject(company.companyCode) : null;

  const useCompany = (next) => {
    setCompany(next);
    setStatus('checking');
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    if (!project) return undefined;

    let cancelled = false;
    setStatus('checking');

    project
      .restoreSession(dispatch)
      .then(() => {
        if (cancelled) return;
        setEntryPath(project.dashboardPath);
        setStatus('ready');
      })
      .catch((reason) => {
        if (cancelled) return;
        if (reason === 'no-token') {
          setEntryPath(project.loginPath);
          setStatus('ready');
          return;
        }
        setStatus('expired');
      });

    return () => {
      cancelled = true;
    };
  }, [project, dispatch, attempt]);

  if (!company) return <CompanyCodePage onResolved={useCompany} />;

  if (status === 'expired') {
    return <CompanyCodePage defaultCode={company.companyCode} notice={EXPIRED_NOTICE} onResolved={useCompany} />;
  }

  if (status === 'checking') {
    return (
      <div className="screen-center">
        <span className="spinner" />
      </div>
    );
  }

  const { App } = project;
  return <App nativeEntryPath={entryPath} />;
}
