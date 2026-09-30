import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import WorkerLogin from './pages/auth/WorkerLogin';
import { useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { role, loading, authenticated } = useAuth();
  if (loading) return <div style={{ padding: 50 }}><h1>Loading...</h1></div>;
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

        <Route path="/" element={<Navigate to="/worker" replace />} />
        <Route path="*" element={<Navigate to="/worker" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
