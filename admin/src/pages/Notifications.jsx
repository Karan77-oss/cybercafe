import { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Filter, 
  ExternalLink,
  ShoppingBag,
  UserCheck,
  FileCheck,
  Wallet,
  Layers,
  Star,
  UserX,
  CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | UNREAD | READ
  const [severityFilter, setSeverityFilter] = useState('ALL'); // ALL | INFO | WARNING | CRITICAL | SUCCESS

  const loadNotifications = () => {
    setLoading(true);
    adminApi.getNotifications()
      .then(res => {
        setNotifications(res.notifications || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load notifications');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await adminApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await adminApi.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      alert('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type, severity) => {
    switch (type) {
      case 'ORDER_NEW':
        return <ShoppingBag size={20} color="#3b82f6" />;
      case 'ORDER_ACCEPTED':
        return <UserCheck size={20} color="#10b981" />;
      case 'ORDER_SUBMITTED':
        return <FileCheck size={20} color="#6366f1" />;
      case 'REVISION_REQUESTED':
      case 'CORRECTION_DEADLINE':
        return <Clock size={20} color="#f59e0b" />;
      case 'WITHDRAWAL_REQUEST':
        return <Wallet size={20} color="#8b5cf6" />;
      case 'SERVICE_PROPOSAL':
        return <Layers size={20} color="#06b6d4" />;
      case 'COMPLAINT_HIGH':
        return <AlertTriangle size={20} color="#ef4444" />;
      case 'WORKER_LOW_RATING':
        return <Star size={20} color="#f59e0b" />;
      case 'WORKER_INACTIVE':
        return <UserX size={20} color="#94a3b8" />;
      case 'PAYMENT_FAILED':
        return <CreditCard size={20} color="#ef4444" />;
      case 'DAILY_SUMMARY':
        return <Info size={20} color="#3b82f6" />;
      default:
        return severity === 'CRITICAL' ? <AlertCircle size={20} color="#ef4444" /> : <Bell size={20} color="#64748b" />;
    }
  };

  const filtered = notifications.filter(n => {
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'UNREAD' ? !n.read : n.read);
    const matchesSeverity = severityFilter === 'ALL' || n.severity === severityFilter;
    return matchesStatus && matchesSeverity;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>System Notifications</h1>
          <p className="subtitle">Real-time alerts for orders, worker submissions, revision deadlines, payouts, and disputes.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {unreadCount > 0 && (
            <button className="btn btn-primary" onClick={handleMarkAllRead}>
              <CheckCheck size={16} /> Mark All as Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['ALL', 'UNREAD', 'READ'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`btn ${statusFilter === f ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.85rem', padding: '6px 14px' }}
            >
              {f === 'ALL' ? 'All Notifications' : f === 'UNREAD' ? `Unread (${unreadCount})` : 'Read'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Severity:</span>
          <select 
            className="status-filter" 
            value={severityFilter} 
            onChange={e => setSeverityFilter(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '6px 12px' }}
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
            <option value="SUCCESS">Success</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="data-table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading notification stream...</div>
        ) : error ? (
          <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Bell size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <div>No notifications found in this view.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(n => (
              <div 
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '16px',
                  borderRadius: '8px',
                  background: n.read ? '#ffffff' : '#f0f7ff',
                  border: n.read ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    padding: '10px', 
                    borderRadius: '10px', 
                    background: n.read ? '#f8fafc' : '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getNotificationIcon(n.type, n.severity)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{n.title}</span>
                      {!n.read && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-blue)', display: 'inline-block' }} />
                      )}
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 600, 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: n.severity === 'CRITICAL' ? '#fee2e2' : n.severity === 'WARNING' ? '#fef3c7' : '#f1f5f9',
                        color: n.severity === 'CRITICAL' ? '#b91c1c' : n.severity === 'WARNING' ? '#b45309' : '#475569'
                      }}>
                        {n.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '6px' }}>{n.message}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} /> {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {!n.read && (
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      title="Mark as read"
                      onClick={() => handleMarkRead(n.id)}
                    >
                      <Check size={14} /> Mark Read
                    </button>
                  )}
                  {n.orderId && (
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => navigate('/admin/orders')}
                    >
                      View Order
                    </button>
                  )}
                  {n.complaintId && (
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => navigate('/admin/complaints')}
                    >
                      View Dispute
                    </button>
                  )}
                  {n.withdrawalId && (
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => navigate('/admin/payments')}
                    >
                      View Payout
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
