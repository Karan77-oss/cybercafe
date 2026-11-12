import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';

// Route-level code splitting: pages load on-demand rather than delaying initial boot
const Home = lazy(() => import('./pages/Home'));
const ServiceForm = lazy(() => import('./pages/ServiceForm'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const CustomerWelfare = lazy(() => import('./pages/CustomerWelfare'));
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/Profile'));

const PageLoader = () => (
  <div className="p-5 space-y-3 animate-pulse">
    <div className="h-8 bg-slate-200 rounded-2xl w-2/5 mb-4" />
    <div className="h-28 bg-slate-200 rounded-3xl" />
    <div className="h-28 bg-slate-200 rounded-3xl" />
  </div>
);

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  if (!token) {
    localStorage.setItem('redirectAfterAuth', location.pathname);
    return <Navigate to="/auth" replace />;
  }
  return children;
}

function AppLayout() {
  const location = useLocation();
  // Show bottom navigation bar on all main screens
  const hideBottomNavRoutes = ['/auth'];
  const showBottomNav = !hideBottomNavRoutes.includes(location.pathname);

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-slate-900 flex flex-col font-sans overflow-x-hidden">
      <main className="flex-1 w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl min-h-screen mx-auto overflow-x-hidden bg-[#F8FAFC] md:border-x md:border-slate-200/80">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/service/:id" element={<ServiceForm />} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
            <Route path="/customer-welfare" element={<ProtectedRoute><CustomerWelfare /></ProtectedRoute>} />
            <Route path="/vault" element={<Navigate to="/customer-welfare" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            {/* Explicitly block Admin and Worker routes on public Customer Vercel deployment */}
            <Route path="/admin" element={<Navigate to="/" replace />} />
            <Route path="/admin/*" element={<Navigate to="/" replace />} />
            <Route path="/worker/*" element={<Navigate to="/" replace />} />
            {/* Catch-all: unknown/legacy paths fall back to the home screen instead of a blank page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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
