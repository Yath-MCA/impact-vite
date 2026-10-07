import { Navigate } from 'react-router-dom';
import { useAuth } from '../../middleware/providers/AuthProvider';
import { resolveAuthRedirect } from './resolveAuthRedirect.js';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const redirect = resolveAuthRedirect({
    loading,
    isAuthenticated,
    requireAdmin,
    isAdmin,
  });
  if (redirect === 'loading') return <div className="auth-loading">Loading…</div>;
  if (redirect) return <Navigate to={redirect} replace />;
  return children;
}
