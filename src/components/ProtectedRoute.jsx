import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth } from '../store/slices/authSlice.js';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useSelector(selectAuth);

  if (loading) {
    return (
      <div className="screen-center">
        <span className="spinner" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}
