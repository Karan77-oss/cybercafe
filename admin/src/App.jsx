import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Workers from './pages/Workers';
import Services from './pages/Services';
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import Complaints from './pages/Complaints';
import AdminNotifications from './pages/Notifications';
import Reports from './pages/Reports';
import HelpSupport from './pages/HelpSupport';
import AdminSettings from './pages/Settings';
import Login from './pages/auth/Login';
import { useAuth } from './contexts/AuthContext';

function AdminLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        <Outlet />
      </main>
    </div>
  );
}

const ProtectedRoute = ({ children }) => {
  const { role, loading, authenticated } = useAuth();
  if (loading) return <div style={{ padding: 50 }}><h1>Loading...</h1></div>;
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
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
