import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../middleware/redux/store.js';
import { AuthProvider } from '../middleware/providers/AuthProvider';
import Login from '../pages/login';
import { DashboardShell } from '../pages/dashboard';
import ValidateUrlPage from '../pages/landing/ValidateUrlPage.jsx';

export default function ReactApp() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard/*" element={<DashboardShell />} />
            <Route path="/validateurl" element={<ValidateUrlPage />} />
            <Route path="/validateurl/:client" element={<ValidateUrlPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </Provider>
  );
}
