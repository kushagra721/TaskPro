import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { PROJECTS, DEFAULT_PROJECT_KEY } from '../projects/registry.js';

/**
 * Root of the **Android/iOS app**. Never rendered on web, where `main.jsx`'s
 * hostname/portal split decides what to mount instead.
 *
 * The app no longer asks for a company code. The tenant is resolved
 * server-side instead: `api/client.js` already sends the WebView's hostname as
 * `X-App-Host`, and the API maps a local/native host onto its configured
 * default domain (`Test_domain` in the backend config). Launch is therefore two
 * decisions rather than three:
 *
 *   1. **Session** — ask the product to restore and *verify* one. That is a
 *      real server round-trip, not a token-shaped-object check, so a revoked or
 *      expired session can't wave someone through to a dashboard that then
 *      401s on every request.
 *   2. **Entry route** — a verified session lands on the dashboard; anything
 *      else lands on the login screen.
 *
 * With no company code there is nothing left to *choose* a product, so this
 * build is the registry's default product. The registry still maps codes to
 * products for any caller that has one; this shell simply no longer asks.
 *
 * Both restore failures ('no-token' and 'invalid-token') now lead to the same
 * place — login — because the screen they used to differ on (re-confirm your
 * company code) no longer exists. Each product's `restoreSession` still clears
 * its own credentials, so a refused token doesn't linger.
 */
export default function NativeApp() {
  const dispatch = useDispatch();
  // 'checking' until the session verdict is in — rendering product routes
  // before then would flash the login screen at an authenticated user.
  const [status, setStatus] = useState('checking');
  const [entryPath, setEntryPath] = useState(null);

  const project = PROJECTS[DEFAULT_PROJECT_KEY];

  useEffect(() => {
    let cancelled = false;
    setStatus('checking');

    project
      .restoreSession(dispatch)
      .then(() => {
        if (cancelled) return;
        setEntryPath(project.dashboardPath);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setEntryPath(project.loginPath);
        setStatus('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [project, dispatch]);

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
