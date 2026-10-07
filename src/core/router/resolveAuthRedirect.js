export function resolveAuthRedirect({ loading, isAuthenticated, requireAdmin, isAdmin }) {
  if (loading) return 'loading';
  if (!isAuthenticated) return '/login';
  if (requireAdmin && !isAdmin) return '/dashboard';
  return null;
}
