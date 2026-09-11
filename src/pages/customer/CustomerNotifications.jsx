import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { ordersApi } from '../../api/orders';

export default function CustomerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getNotifications();
      setNotifications(res.notifications || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getIcon = (type) => {
    if (type === 'SUCCESS') return <CheckCircle size={20} color="var(--green)" />;
    if (type === 'ALERT') return <AlertTriangle size={20} color="var(--red)" />;
    return <Clock size={20} color="var(--brand-blue)" />;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ marginBottom: '6px' }}>Notifications</h1>
          <p className="text-muted">Updates regarding your order assignments, time slots, deliverables, and wallet</p>
        </div>
        <button className="btn btn-outline" onClick={fetchNotifications} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
          Refresh
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '40px' }}>Loading notifications...</div>}
      {error && <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>{error}</div>}

      {!loading && !error && notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <Bell size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3>No notifications right now</h3>
          <p className="text-muted" style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '8px auto 20px' }}>
            When a worker accepts your request, proposes a work time slot, or finishes your documents, you will receive updates here.
          </p>
          <Link to="/services" className="btn btn-primary">Browse Services</Link>
        </div>
      )}

      {!loading && !error && notifications.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map(notif => (
            <Link 
              key={notif.id}
              to={`/orders/${notif.orderId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'box-shadow 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ marginTop: '2px' }}>
                  {getIcon(notif.type)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                    {notif.title}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {new Date(notif.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '16px' }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
