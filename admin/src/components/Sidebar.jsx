import { NavLink } from 'react-router-dom';
import { 
  Home, 
  UserCog, 
  Users, 
  Box, 
  Layers, 
  CreditCard, 
  AlertTriangle, 
  Bell, 
  BarChart3, 
  HelpCircle, 
  Settings 
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo"><Box size={20} /></div>
        <div className="brand">
          <h2>Cyber Cafe</h2>
          <p>Admin Portal</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/admin" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end>
          <Home size={18}/> Dashboard
        </NavLink>
        
        <div className="nav-section">OPERATIONS</div>
        <NavLink to="/admin/workers" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <UserCog size={18}/> Workers
        </NavLink>
        <NavLink to="/admin/customers" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Users size={18}/> Customers
        </NavLink>
        <NavLink to="/admin/orders" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Box size={18}/> Orders
        </NavLink>
        <NavLink to="/admin/services" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Layers size={18}/> Services
        </NavLink>

        <div className="nav-section">FINANCE & DISPUTES</div>
        <NavLink to="/admin/payments" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <CreditCard size={18}/> Payments & Earnings
        </NavLink>
        <NavLink to="/admin/complaints" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <AlertTriangle size={18}/> Complaints & Disputes
        </NavLink>

        <div className="nav-section">INSIGHTS & SUPPORT</div>
        <NavLink to="/admin/notifications" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Bell size={18}/> Notifications
        </NavLink>
        <NavLink to="/admin/reports" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <BarChart3 size={18}/> Reports & Analytics
        </NavLink>
        <NavLink to="/admin/support" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <HelpCircle size={18}/> Help & Support
        </NavLink>
        <NavLink to="/admin/settings" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Settings size={18}/> Profile & Settings
        </NavLink>
      </nav>
    </aside>
  );
}