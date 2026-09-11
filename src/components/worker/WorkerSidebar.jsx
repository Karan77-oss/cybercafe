import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Briefcase, IndianRupee, CreditCard, Activity, MessageSquare, Bell, User, Settings, HelpCircle, LogOut, Box } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function WorkerSidebar() {
  const getNavClass = ({isActive}) => isActive ? 'worker-nav-item active' : 'worker-nav-item';
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  return (
    <aside className="worker-sidebar">
      <div className="worker-sidebar-header">
        <Box size={24} color="var(--brand-blue)" />
        <div>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Cyber Cafe</h2>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Worker Portal</p>
        </div>
      </div>
      <nav className="worker-sidebar-nav">
        <NavLink to="/worker" className={getNavClass} end>
          <LayoutDashboard size={18}/> Dashboard
        </NavLink>
        <NavLink to="/worker/requests" className={getNavClass}>
          <FileText size={18}/> Available Requests
        </NavLink>
        <NavLink to="/worker/jobs" className={getNavClass}>
          <Briefcase size={18}/> My Jobs
        </NavLink>
        
        <NavLink to="/worker/services/propose" className={getNavClass}><FileText size={18}/> Propose Service</NavLink>
        <div className="worker-nav-section">BUSINESS</div>
        <NavLink to="/worker/earnings" className={getNavClass}>
          <IndianRupee size={18}/> Earnings
        </NavLink>
        <NavLink to="/worker/withdrawals" className={getNavClass}>
          <CreditCard size={18}/> Withdrawals
        </NavLink>
        <NavLink to="/worker/performance" className={getNavClass}>
          <Activity size={18}/> Performance
        </NavLink>
        
        <div className="worker-nav-section">COMMUNICATION</div>
        <NavLink to="/worker/messages" className={getNavClass}>
          <MessageSquare size={18}/> Messages
        </NavLink>
        <NavLink to="/worker/notifications" className={getNavClass}>
          <Bell size={18}/> Notifications
        </NavLink>
        
        <div className="worker-nav-section">ACCOUNT</div>
        <NavLink to="/worker/profile" className={getNavClass}>
          <User size={18}/> My Profile
        </NavLink>
        <NavLink to="/worker/documents" className={getNavClass}>
          <FileText size={18}/> Documents
        </NavLink>
        <NavLink to="/worker/settings" className={getNavClass}>
          <Settings size={18}/> Settings
        </NavLink>
        <NavLink to="/worker/help" className={getNavClass}>
          <HelpCircle size={18}/> Help & Support
        </NavLink>
        <button className="worker-nav-item" style={{ marginTop: '20px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }} onClick={() => { logout(); navigate('/'); }}>
          <LogOut size={18}/> Logout
        </button>
      </nav>
    </aside>
  );
}
