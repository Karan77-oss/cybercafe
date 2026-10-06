import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import WorkerSidebar from './WorkerSidebar';
import { User, LogOut, Bell, Radio, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { workerApi } from '../../api/worker';

export default function WorkerLayout() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showAutoOfflineModal, setShowAutoOfflineModal] = useState(false);

  const dropdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // Load initial worker status and notifications
  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const [profileRes, notifRes] = await Promise.all([
          workerApi.getProfile().catch(() => null),
          workerApi.getNotifications().catch(() => null)
        ]);

        if (mounted) {
          if (profileRes?.profile) {
            setIsOnline(profileRes.profile.isOnline !== false);
          }
          if (notifRes?.notifications) {
            const unread = notifRes.notifications.filter(n => !n.isRead).length;
            setUnreadNotifs(unread);
          }
        }
      } catch (err) {
        console.error('Error fetching worker status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // 30-minute inactivity tracker
  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleUserActivity, { passive: true }));

    // Check inactivity every 30 seconds
    const inactivityChecker = setInterval(async () => {
      const inactiveMinutes = (Date.now() - lastActivityRef.current) / (1000 * 60);

      // Section 4: If inactive for >= 30 minutes and worker was online
      if (inactiveMinutes >= 30 && isOnline) {
        try {
          await workerApi.toggleAvailability(false);
          setIsOnline(false);
          setShowAutoOfflineModal(true);
        } catch (err) {
          console.error('Auto-offline error:', err);
        }
      }
    }, 30000);

    // Heartbeat every 5 minutes if worker is active
    const heartbeatInterval = setInterval(() => {
      const inactiveMinutes = (Date.now() - lastActivityRef.current) / (1000 * 60);
      if (inactiveMinutes < 5 && isOnline) {
        workerApi.recordActivity().catch(() => {});
      }
    }, 5 * 60 * 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      clearInterval(inactivityChecker);
      clearInterval(heartbeatInterval);
    };
  }, [isOnline, handleUserActivity]);

  // Dropdown close handling
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleToggleAvailability = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const targetState = !isOnline;
      const res = await workerApi.toggleAvailability(targetState);
      if (res?.success) {
        setIsOnline(res.isOnline);
        lastActivityRef.current = Date.now();
      }
    } catch (err) {
      console.error('Failed to toggle availability:', err);
      alert('Could not update status. Please try again.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="worker-layout">
      <WorkerSidebar />
      <main className="worker-main">
        <header className="worker-topbar">
          {/* Section 4 & 20: Online / Offline Toggle Pill in Topbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: isOnline ? '#ecfdf5' : '#f8fafc',
                border: `1.5px solid ${isOnline ? '#10b981' : '#cbd5e1'}`,
                padding: '6px 14px',
                borderRadius: '9999px',
                cursor: toggling ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isOnline ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none'
              }}
              onClick={handleToggleAvailability}
              title="Click to toggle Online / Offline status"
            >
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: isOnline ? '#10b981' : '#94a3b8',
                boxShadow: isOnline ? '0 0 8px #10b981' : 'none'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ 
                  fontWeight: 700, 
                  fontSize: '0.85rem', 
                  color: isOnline ? '#065f46' : '#64748b',
                  lineHeight: 1.1
                }}>
                  {isOnline ? 'Online (Accepting Orders)' : 'Offline (Paused)'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {toggling ? 'Updating...' : 'Click to switch'}
                </span>
              </div>
              <Radio size={16} color={isOnline ? '#10b981' : '#94a3b8'} style={{ marginLeft: 4 }} />
            </div>
          </div>

          {/* Right Header Actions: Notifications & Worker Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <Link 
              to="/worker/notifications" 
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#f1f5f9',
                color: '#475569',
                textDecoration: 'none'
              }}
              title="View Notifications"
            >
              <Bell size={20} />
              {unreadNotifs > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </Link>

            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  cursor: 'pointer', 
                  padding: '6px 10px', 
                  borderRadius: '8px', 
                  background: dropdownOpen ? '#f1f5f9' : 'transparent' 
                }} 
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name || 'Worker'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified Worker</div>
                </div>
                {user?.photo || user?.profileImage || user?.profilePic ? (
                  <img 
                    src={user.photo || user.profileImage || user.profilePic} 
                    alt="" 
                    style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--brand-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} />
                  </div>
                )}
              </div>
              
              {dropdownOpen && (
                <div style={{ position: 'absolute', top: '55px', right: 0, width: '220px', background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)', zIndex: 1000, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                    <div style={{ fontWeight: 600 }}>{user?.name || 'Worker'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    <Link to="/worker/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>My Profile</Link>
                    <Link to="/worker/jobs" className="dropdown-item" onClick={() => setDropdownOpen(false)}>My Jobs</Link>
                    <Link to="/worker/earnings" className="dropdown-item" onClick={() => setDropdownOpen(false)}>Earnings & Wallet</Link>
                    <Link to="/worker/withdrawals" className="dropdown-item" onClick={() => setDropdownOpen(false)}>Withdrawals</Link>
                    <Link to="/worker/notifications" className="dropdown-item" onClick={() => setDropdownOpen(false)}>Notifications</Link>
                    <Link to="/worker/help" className="dropdown-item" onClick={() => setDropdownOpen(false)}>Help & Support</Link>
                  </div>
                  <div style={{ padding: '8px 0', borderTop: '1px solid var(--border-color)' }}>
                    <button 
                      className="dropdown-item" 
                      style={{ width: '100%', textAlign: 'left', color: '#ef4444', background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }} 
                      onClick={() => { setDropdownOpen(false); logout(); navigate('/'); }}
                    >
                      <LogOut size={16}/> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="worker-content">
          <Outlet />
        </div>
      </main>

      {/* Inactivity Auto-Offline Alert Modal */}
      {showAutoOfflineModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 10px', color: '#1e293b' }}>
              Auto-Offline Triggered
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 24px' }}>
              You were automatically switched to <strong>Offline</strong> due to 30 minutes of inactivity. Switch back to Online when you are ready to receive new customer orders.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={() => setShowAutoOfflineModal(false)}
              >
                Stay Offline
              </button>
              <button
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)'
                }}
                onClick={async () => {
                  await workerApi.toggleAvailability(true);
                  setIsOnline(true);
                  lastActivityRef.current = Date.now();
                  setShowAutoOfflineModal(false);
                }}
              >
                Go Online Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
