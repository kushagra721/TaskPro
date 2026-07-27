import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectPlatformUser } from '../store/slices/platformAuthSlice.js';

/** Gates a platform route to a specific role. Unlike the normal app's
 *  `ProtectedRoute`, there's no async "loading" state — `bootstrapPlatform()`
 *  decodes the stored JWT synchronously on load, before first render. */
export default function PlatformProtectedRoute({ role, children }) {
  const platformUser = useSelector(selectPlatformUser);

  if (!platformUser) return <Navigate to="/platform/login" replace />;
  if (role && platformUser.role !== role) {
    return <Navigate to={platformUser.role === 'SUPER_ADMIN' ? '/platform/admin' : '/platform/reseller'} replace />;
  }
  return children;
}
