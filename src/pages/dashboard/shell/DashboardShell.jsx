import { Routes, Route } from 'react-router-dom';
import { DashboardProvider } from '../context/DashboardContext';
import DashboardSidebar from '../layout/DashboardSidebar';
import '../layout/DashboardLayout.css';
import DashboardHome from '../pages/DashboardHome';
import DashboardShellHeader from './DashboardShellHeader';
import ProtectedRoute from '../../../core/router/ProtectedRoute';

export default function DashboardShell() {
  return (
    <ProtectedRoute>
      <DashboardProvider>
        <div className="dashboard-layout">
          <DashboardSidebar />
          <div className="dashboard-main sidebar-open">
            <div className="dashboard-header">
              <h1>Dashboard</h1>
            </div>
            <div className="dashboard-content">
              <DashboardShellHeader />
              <Routes>
                <Route index element={<DashboardHome />} />
              </Routes>
            </div>
          </div>
        </div>
      </DashboardProvider>
    </ProtectedRoute>
  );
}
