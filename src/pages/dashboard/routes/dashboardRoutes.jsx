import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import ProtectedRoute from '../../../core/router/ProtectedRoute';
import AdminDashboard from '../pages/AdminDashboard';
import DevDashboard from '../pages/DevDashboard';
import DocDashboard from '../pages/DocDashboard';
import MigrationStatusPage from '../migrationStatus/MigrationStatusPage';
import CapabilityCatalogAdmin from '../config-manager/CapabilityCatalogAdmin.jsx';

const DashboardRoutes = () => {
  const location = useLocation();
  const isDocDashboardBase = location.pathname.startsWith('/doc-dashboard');

  if (isDocDashboardBase) {
    return (
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DocDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/doc-dashboard" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dev" replace />} />
        <Route path="dev" element={<DevDashboard />} />
        <Route path="migration-status" element={<MigrationStatusPage />} />
      </Route>

      <Route
        path="admin"
        element={
          <ProtectedRoute requireAdmin={true}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="capability-catalog" element={<CapabilityCatalogAdmin />} />
      </Route>

      <Route path="config-manager/*" element={<Navigate to="/config-manager" replace />} />
      <Route path="admin-dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default DashboardRoutes;
