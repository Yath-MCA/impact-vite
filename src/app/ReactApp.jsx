import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../middleware/redux/store.js';
import { AuthProvider } from '../middleware/providers/AuthProvider';
import Login from '../pages/login';

const DashboardShell = lazy(() => import('../pages/dashboard/shell/DashboardShell.jsx'));
const ValidateUrlPage = lazy(() => import('../pages/landing/ValidateUrlPage.jsx'));

function RouteFallback() {
  return (
    <div className="tw:min-h-screen tw:flex tw:items-center tw:justify-center tw:text-slate-600" role="status">
      Loading…
    </div>
  );
}

export default function ReactApp() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <HashRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard/*" element={<DashboardShell />} />
              <Route path="/validateurl" element={<ValidateUrlPage />} />
              <Route path="/validateurl/:client" element={<ValidateUrlPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </AuthProvider>
    </Provider>
  );
}
