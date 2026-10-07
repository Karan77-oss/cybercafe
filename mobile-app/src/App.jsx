import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import ServiceForm from './pages/ServiceForm';
import Orders from './pages/Orders';
import OrderTracking from './pages/OrderTracking';
import CustomerWelfare from './pages/CustomerWelfare';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import BottomNav from './components/BottomNav';

function AppLayout() {
  const location = useLocation();
  // Show bottom navigation bar on all main screens
  const hideBottomNavRoutes = ['/auth'];
  const showBottomNav = !hideBottomNavRoutes.includes(location.pathname);

  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 flex flex-col font-sans">
      <main className="flex-1 w-full max-w-lg mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/service/:id" element={<ServiceForm />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderTracking />} />
          <Route path="/customer-welfare" element={<CustomerWelfare />} />
          <Route path="/vault" element={<Navigate to="/customer-welfare" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
