import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  IndianRupee, 
  Info,
  ArrowRight
} from 'lucide-react';
import { workerApi } from '../../api/worker';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const loadNotifications = async () => {
    try {
      const res = await workerApi.getNotifications();
      if (res?.notifications) {
        setNotifications(res.notifications);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await workerApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading notifications...
      </div>
    );
  }

  const filtered = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type) => {
    switch (type) {
      case 'ORDER_OFFER': return <Clock size={20} color="#f59e0b" />;
      case 'ORDER_COMPLETED': return <CheckCircle2 size={20} color="#10b981" />;
      case 'WITHDRAWAL_REQUESTED': return <IndianRupee size={20} color="#0284c7" />;
      case 'INACTIVITY_OFFLINE': return <AlertTriangle size={20} color="#ef4444" />;
      default: return <Info size={20} color="#3b82f6" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
            Notifications & System Alerts
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Section 19: Order offers, schedule confirmations, earnings deposits, and security notices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilter('ALL')}
            style={{
              background: filter === 'ALL' ? '#3b82f6' : 'white',
              color: filter === 'ALL' ? 'white' : '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 14px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('UNREAD')}
            style={{
              background: filter === 'UNREAD' ? '#3b82f6' : 'white',
              color: filter === 'UNREAD' ? 'white' : '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 14px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: '1px dashed #cbd5e1',
            color: '#64748b'
          }}>
            <Bell size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, color: '#334155' }}>You are completely caught up!</div>
            <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
              New notifications will be delivered here in real-time.
            </div>
          </div>
        ) : (
          filtered.map(notif => (
            <div
              key={notif.id}
              className="form-card"
              style={{
                padding: '16px 20px',
                margin: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                background: notif.isRead ? 'white' : '#f0f9ff',
                borderLeft: `4px solid ${notif.isRead ? '#cbd5e1' : '#3b82f6'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
                <div style={{ marginTop: 2 }}>{getIcon(notif.type)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: 2 }}>
                    {notif.title}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.4 }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 6 }}>
                    {new Date(notif.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {notif.orderId && (
                  <Link
                    to={`/worker/jobs/${notif.orderId}`}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    View Order <ArrowRight size={12} />
                  </Link>
                )}
                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}