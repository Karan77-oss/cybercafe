import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { useAuth } from './contexts/AuthContext';
import { env } from './config/env';

// Enterprise Security: Restrict Admin Portal to localhost for maximum security
const isLocalhostAuthorized = () => {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    import.meta.env.VITE_ALLOW_REMOTE_ADMIN === 'true'
  );
};

// Route-level code splitting: chunk admin pages so they load on-demand in <50ms
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Workers = lazy(() => import('./pages/Workers'));
const Services = lazy(() => import('./pages/Services'));
const Orders = lazy(() => import('./pages/Orders'));
const Payments = lazy(() => import('./pages/Payments'));
const Complaints = lazy(() => import('./pages/Complaints'));
const AdminNotifications = lazy(() => import('./pages/Notifications'));
const Reports = lazy(() => import('./pages/Reports'));
const HelpSupport = lazy(() => import('./pages/HelpSupport'));
const AdminSettings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/auth/Login'));

const AdminPageSkeleton = () => (
  <div style={{ padding: '24px', opacity: 0.6 }}>
    <div style={{ height: '36px', width: '220px', backgroundColor: '#e2e8f0', borderRadius: '8px', marginBottom: '20px' }} />
    <div style={{ height: '180px', backgroundColor: '#f1f5f9', borderRadius: '12px', marginBottom: '16px' }} />
    <div style={{ height: '300px', backgroundColor: '#f1f5f9', borderRadius: '12px' }} />
  </div>
);

function AdminLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        <Suspense fallback={<AdminPageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

const ProtectedRoute = ({ children }) => {
  const { role, loading, authenticated } = useAuth();
  if (loading) return <AdminPageSkeleton />;
  if (!authenticated) {
    return <Navigate to="/login" state={{ returnTo: window.location.pathname }} replace />;
  }
  if (role !== 'ADMIN') {
    return (
      <div style={{ padding: 50 }}>
        <h1>Access Denied: Admins Only</h1>
        <p>You do not have administrative privileges.</p>
        <a href="/login">Login as Admin</a>
      </div>
    );
  }
  return children;
};

function App() {
  if (!isLocalhostAuthorized()) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '500px',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛡️</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px', color: '#f1f5f9' }}>
            Localhost-Only Admin Security
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
            The Cyber Cafe Admin Control Panel is strictly isolated to run on your local machine (<code style={{ color: '#38bdf8' }}>http://localhost:5174</code>) to prevent public credential exposure.
          </p>
          <div style={{
            background: '#0f172a',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: '#cbd5e1',
            textAlign: 'left'
          }}>
            <div><strong>Backend Target:</strong> {env.API_URL || 'Railway Production'}</div>
            <div style={{ marginTop: '4px' }}><strong>Local Command:</strong> <code>npm run dev:admin</code></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<AdminPageSkeleton />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="workers" element={<Workers />} />
            <Route path="customers" element={<Customers />} />
            <Route path="orders" element={<Orders />} />
            <Route path="services" element={<Services />} />
            <Route path="payments" element={<Payments />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="reports" element={<Reports />} />
            <Route path="support" element={<HelpSupport />} />
            <Route path="settings" element={<AdminSettings />} />

            {/* Legacy redirects */}
            <Route path="proposals" element={<Navigate to="/admin/services" replace />} />
            <Route path="payouts" element={<Navigate to="/admin/payments" replace />} />
            <Route path="commission" element={<Navigate to="/admin/payments" replace />} />
            <Route path="documents" element={<Navigate to="/admin/orders" replace />} />
          </Route>

          {/* Redirect root to /admin */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
