import { useAuth } from '../../../middleware/providers/AuthProvider';

export default function DashboardHome() {
  const { user } = useAuth();
  return (
    <div className="dashboard-home p-4">
      <h2>Welcome{user?.username ? `, ${user.username}` : ''}</h2>
      <p>Dashboard shell — grid configuration comes later.</p>
    </div>
  );
}
