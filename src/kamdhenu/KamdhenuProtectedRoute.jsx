import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectKamdhenuAdmin } from '../store/slices/kamdhenuAuthSlice.js';

/** Gates a Kamdhenu portal route. Mirrors `PlatformProtectedRoute` —
 *  `bootstrapKamdhenu()` decodes the stored JWT synchronously on load, before
 *  first render, so there's no async "loading" state to handle.
 *
 *  Optional `roles` (array) restricts the route further: a signed-in account
 *  whose role isn't listed is bounced to the dashboard instead of login. */
export default function KamdhenuProtectedRoute({ children, roles }) {
  const kamdhenuAdmin = useSelector(selectKamdhenuAdmin);
  if (!kamdhenuAdmin) return <Navigate to="/kamdhenu/login" replace />;
  if (roles && !roles.includes(kamdhenuAdmin.role || 'ADMIN')) {
    return <Navigate to="/kamdhenu/dashboard" replace />;
  }
  return children;
}
