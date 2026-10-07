import { useAuth } from '../../../middleware/providers/AuthProvider';

/** Lightweight header for Phase 3 shell (no docs fetch / AG Grid). */
export default function DashboardShellHeader() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-shell-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
      <span>{user?.username || 'User'}</span>
      <button type="button" onClick={() => logout()}>
        Log out
      </button>
    </div>
  );
}
