import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectNeedsOnboarding, selectPlatformUser } from '../store/slices/platformAuthSlice.js';

/** Gates a platform route to a specific role. Unlike the normal app's
 *  `ProtectedRoute`, there's no async "loading" state — `bootstrapPlatform()`
 *  decodes the stored JWT synchronously on load, before first render. */
export default function PlatformProtectedRoute({ role, children }) {
  const platformUser = useSelector(selectPlatformUser);
  const needsOnboarding = useSelector(selectNeedsOnboarding);
  const { pathname } = useLocation();

  if (!platformUser) return <Navigate to="/platform/login" replace />;
  if (role && platformUser.role !== role) {
    return <Navigate to={platformUser.role === 'SUPER_ADMIN' ? '/platform/admin' : '/platform/reseller'} replace />;
  }
  // A self-signed-up reseller who hasn't picked a plan yet gets sent to finish
  // setup — except on the onboarding page itself, which would loop.
  if (needsOnboarding && pathname !== '/platform/onboarding') {
    return <Navigate to="/platform/onboarding" replace />;
  }
  return children;
}
