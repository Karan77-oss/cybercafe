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

// Customer Pages
import CustomerLayout from './components/customer/CustomerLayout';
import Home from './pages/customer/Home';
import ServicesPage from './pages/customer/ServicesPage';
import ServiceForm from './pages/customer/ServiceForm';
import Checkout from './pages/customer/Checkout';
import MyOrders from './pages/customer/MyOrders';
import OrderTracking from './pages/customer/OrderTracking';
import Profile from './pages/customer/Profile';
import Wallet from './pages/customer/Wallet';
import CustomerNotifications from './pages/customer/CustomerNotifications';
import HowItWorks from './pages/customer/HowItWorks';
import CustomerHelp from './pages/customer/Help';
import CustomerDocuments from './pages/customer/CustomerDocuments';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Worker Pages
import WorkerLayout from './components/worker/WorkerLayout';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import AvailableRequests from './pages/worker/AvailableRequests';
import RequestDetails from './pages/worker/RequestDetails';
import MyJobs from './pages/worker/MyJobs';
import JobWorkspace from './pages/worker/JobWorkspace';
import Earnings from './pages/worker/Earnings';
import WorkerProfile from './pages/worker/WorkerProfile';
import Withdrawals from './pages/worker/Withdrawals';
import Performance from './pages/worker/Performance';
import Messages from './pages/worker/Messages';
import Notifications from './pages/worker/Notifications';
import WorkerDocuments from './pages/worker/WorkerDocuments';
import Settings from './pages/worker/Settings';
import Help from './pages/worker/Help';
import ProposeService from './pages/worker/ProposeService';


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

import { useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { role, loading, authenticated } = useAuth();
  if (loading) return <div style={{padding: 50}}><h1>Loading...</h1></div>;
  if (!authenticated) return <Navigate to="/login" state={{ returnTo: window.location.pathname }} replace />;
  if (allowedRole === 'ADMIN' && role !== 'ADMIN') return <div style={{padding: 50}}><h1>Access Denied: Admins Only</h1><a href='/login'>Login as Admin</a></div>;
  if (allowedRole === 'WORKER' && role !== 'WORKER' && role !== 'ADMIN') return <div style={{padding: 50}}><h1>Access Denied: Workers Only</h1><a href='/login'>Login as Worker</a></div>;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/:serviceId" element={<ServiceForm />} />
          <Route path="checkout" element={<ProtectedRoute allowedRole="CUSTOMER"><Checkout /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute allowedRole="CUSTOMER"><MyOrders /></ProtectedRoute>} />
          <Route path="orders/:orderId" element={<ProtectedRoute allowedRole="CUSTOMER"><OrderTracking /></ProtectedRoute>} />
          
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="profile" element={<ProtectedRoute allowedRole="CUSTOMER"><Profile /></ProtectedRoute>} />
          <Route path="wallet" element={<ProtectedRoute allowedRole="CUSTOMER"><Wallet /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute allowedRole="CUSTOMER"><CustomerNotifications /></ProtectedRoute>} />
          <Route path="payments" element={<ProtectedRoute allowedRole="CUSTOMER"><Wallet /></ProtectedRoute>} />
          <Route path="documents" element={<ProtectedRoute allowedRole="CUSTOMER"><CustomerDocuments /></ProtectedRoute>} />
          <Route path="help" element={<CustomerHelp />} />
        </Route>
        
        <Route path="/admin" element={<ProtectedRoute allowedRole="ADMIN"><AdminLayout /></ProtectedRoute>}>
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

          {/* Legacy route redirects */}
          <Route path="proposals" element={<Navigate to="/admin/services" replace />} />
          <Route path="payouts" element={<Navigate to="/admin/payments" replace />} />
          <Route path="commission" element={<Navigate to="/admin/payments" replace />} />
          <Route path="documents" element={<Navigate to="/admin/orders" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      
        <Route path="/worker" element={<ProtectedRoute allowedRole="WORKER"><WorkerLayout /></ProtectedRoute>}>
          <Route index element={<WorkerDashboard />} />
          <Route path="requests" element={<AvailableRequests />} />
          <Route path="requests/:requestId" element={<RequestDetails />} />
          <Route path="jobs" element={<MyJobs />} />
          <Route path="jobs/:jobId" element={<JobWorkspace />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="profile" element={<WorkerProfile />} />
          <Route path="withdrawals" element={<Withdrawals />} />
          <Route path="performance" element={<Performance />} />
          <Route path="messages" element={<Messages />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="documents" element={<WorkerDocuments />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
          <Route path="services/propose" element={<ProposeService />} />

        </Route>
        </Routes>
    </BrowserRouter>
  );
}

export default App;
