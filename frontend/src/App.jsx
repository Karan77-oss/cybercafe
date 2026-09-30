import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import { useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { loading, authenticated } = useAuth();
  if (loading) return <div style={{ padding: 50 }}><h1>Loading...</h1></div>;
  if (!authenticated) {
    return <Navigate to="/login" state={{ returnTo: window.location.pathname }} replace />;
  }
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
          <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
          <Route path="orders/:orderId" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
          
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute><CustomerNotifications /></ProtectedRoute>} />
          <Route path="payments" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="documents" element={<ProtectedRoute><CustomerDocuments /></ProtectedRoute>} />
          <Route path="help" element={<CustomerHelp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
