import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import WorkerLayout from './components/worker/WorkerLayout';
import { useAuth } from './contexts/AuthContext';

// Route-level code splitting: pages load on-demand for instant boot speed
const WorkerDashboard = lazy(() => import('./pages/worker/WorkerDashboard'));
const AvailableRequests = lazy(() => import('./pages/worker/AvailableRequests'));
const RequestDetails = lazy(() => import('./pages/worker/RequestDetails'));
const MyJobs = lazy(() => import('./pages/worker/MyJobs'));
const JobWorkspace = lazy(() => import('./pages/worker/JobWorkspace'));
const Earnings = lazy(() => import('./pages/worker/Earnings'));
const WorkerProfile = lazy(() => import('./pages/worker/WorkerProfile'));
const Withdrawals = lazy(() => import('./pages/worker/Withdrawals'));
const Performance = lazy(() => import('./pages/worker/Performance'));
const Messages = lazy(() => import('./pages/worker/Messages'));
const Notifications = lazy(() => import('./pages/worker/Notifications'));
const WorkerDocuments = lazy(() => import('./pages/worker/WorkerDocuments'));
const Settings = lazy(() => import('./pages/worker/Settings'));
const Help = lazy(() => import('./pages/worker/Help'));
const ProposeService = lazy(() => import('./pages/worker/ProposeService'));
const WorkerLogin = lazy(() => import('./pages/auth/WorkerLogin'));

const WorkerPageSkeleton = () => (
  <div style={{ padding: '24px', opacity: 0.6 }}>
    <div style={{ height: '32px', width: '200px', backgroundColor: '#e2e8f0', borderRadius: '8px', marginBottom: '16px' }} />
    <div style={{ height: '140px', backgroundColor: '#f1f5f9', borderRadius: '12px', marginBottom: '16px' }} />
    <div style={{ height: '260px', backgroundColor: '#f1f5f9', borderRadius: '12px' }} />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { role, loading, authenticated } = useAuth();
  if (loading) return <WorkerPageSkeleton />;
  if (!authenticated) {
    return <Navigate to="/login" state={{ returnTo: window.location.pathname }} replace />;
  }
  if (role !== 'WORKER' && role !== 'ADMIN') {
    return (
      <div style={{ padding: 50 }}>
        <h1>Access Denied: Workers Only</h1>
        <p>You do not have a verified worker profile.</p>
        <a href="/login">Login as Worker</a>
      </div>
    );
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<WorkerPageSkeleton />}>
        <Routes>
          <Route path="/login" element={<WorkerLogin />} />
          <Route path="/worker/login" element={<WorkerLogin />} />
          
          <Route path="/worker" element={<ProtectedRoute><WorkerLayout /></ProtectedRoute>}>
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

          {/* Explicitly block Admin routes on public Worker Vercel deployment */}
          <Route path="/admin" element={<Navigate to="/worker" replace />} />
          <Route path="/admin/*" element={<Navigate to="/worker" replace />} />

          <Route path="/" element={<Navigate to="/worker" replace />} />
          <Route path="*" element={<Navigate to="/worker" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
