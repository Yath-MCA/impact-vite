import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../middleware/redux/store.js';
import { AuthProvider } from '../middleware/providers/AuthProvider';
import Login from '../pages/auth/pages/Login';
import DashboardShell from '../pages/dashboard/shell/DashboardShell';

export default function ReactApp() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard/*" element={<DashboardShell />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </Provider>
  );
}
