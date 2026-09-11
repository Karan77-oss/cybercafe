import { useState, useEffect } from 'react';
import { Search, Bell, Menu, LogOut, CheckCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';
import './Topbar.css';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifs = () => {
    adminApi.getNotifications()
      .then(res => {
        if (res.success) {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await adminApi.markAllNotificationsRead();
      fetchNotifs();
    } catch (e) {}
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-toggle"><Menu size={20}/></button>
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search across workers, customers, orders..." 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                navigate(`/admin/orders?search=${encodeURIComponent(e.target.value.trim())}`);
              }
            }}
          />
        </div>
      </div>
      <div className="topbar-right">
        <div style={{ position: 'relative' }}>
          <div 
            className="notifications" 
            style={{ cursor: 'pointer' }}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </div>

          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '40px',
              right: 0,
              width: '320px',
              background: 'white',
              boxShadow: 'var(--shadow-md)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              zIndex: 1000,
              padding: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Admin Alerts ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {notifications.slice(0, 4).map(n => (
                  <div 
                    key={n.id}
                    onClick={() => {
                      adminApi.markNotificationRead(n.id);
                      setShowDropdown(false);
                      navigate('/admin/notifications');
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      marginBottom: '6px',
                      background: n.isRead ? 'transparent' : 'rgba(83, 100, 249, 0.05)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{n.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.message}</div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No alerts</div>
                )}
              </div>
              <button 
                onClick={() => { setShowDropdown(false); navigate('/admin/notifications'); }}
                style={{ width: '100%', marginTop: '8px', padding: '6px', background: 'var(--bg-main)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>

        <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div 
            onClick={() => navigate('/admin/settings')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <img src={`https://ui-avatars.com/api/?name=${user?.name || 'Admin'}&background=random`} alt="Admin" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            <div className="user-info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="name" style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name || 'Admin'}</span>
              <span className="role" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {user?.adminId || user?.id || 'ADMIN'}</span>
            </div>
          </div>
          <button 
            onClick={() => { logout(); navigate('/login'); }} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}