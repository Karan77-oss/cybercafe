import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertCircle } from 'lucide-react';
import { ordersApi } from '../../api/orders';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getOrders();
      setOrders(res.orders || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);
  
  const filtered = orders.filter(o => {
    if (tab === 'all') return true;
    if (tab === 'progress') return o.status === 'ASSIGNED' || o.status === 'IN_PROGRESS';
    if (tab === 'completed') return o.status === 'COMPLETED';
    if (tab === 'cancelled') return o.status === 'CANCELLED';
    return true;
  });

  const getStatusClass = (status) => {
    if (status === 'COMPLETED') return 'completed';
    if (status === 'ASSIGNED' || status === 'IN_PROGRESS') return 'in-progress';
    if (status === 'CANCELLED') return 'cancelled';
    return 'pending'; // PAYMENT_PENDING, AVAILABLE
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center' }}><h2>Loading orders...</h2></div>;
  if (error) return <div style={{ padding: '60px', textAlign: 'center', color: 'red' }}><AlertCircle /> <h2>{error}</h2><button onClick={fetchOrders} className="btn btn-outline" style={{marginTop: '16px'}}>Retry</button></div>;

  return (
    <div>
      <h1 style={{ marginBottom: '8px' }}>My Orders</h1>
      <p className="text-muted" style={{ marginBottom: '32px' }}>View and track all your orders</p>
      
      <div className="category-tabs">
        <button className={`category-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Orders</button>
        <button className={`category-tab ${tab === 'progress' ? 'active' : ''}`} onClick={() => setTab('progress')}>In Progress</button>
        <button className={`category-tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>Completed</button>
        <button className={`category-tab ${tab === 'cancelled' ? 'active' : ''}`} onClick={() => setTab('cancelled')}>Cancelled</button>
      </div>
      
      {filtered.length > 0 ? (
        <div>
          {filtered.map(order => (
            <div key={order.id} className="order-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 2 }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(83, 100, 249, 0.1)', color: 'var(--brand-blue)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} />
                </div>
                <div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{order.id}</div>
                   <div style={{ fontWeight: '600' }}>{order.serviceSnapshot?.name || order.serviceName || 'Service Order'}</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                     Order Date: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                   </div>
                </div>
              </div>
              
              <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '12px' }}>
                {order.worker ? (
                  <>
                    <img src={`https://ui-avatars.com/api/?name=${order.worker.name}&background=random`} alt="worker" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <div>
                       <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{order.worker.name}</div>
                    </div>
                  </>
                ) : (
                  <span className="text-muted" style={{fontSize: '0.85rem'}}>Awaiting Assignment</span>
                )}
              </div>
              
              <div style={{ flex: 1, fontWeight: '600' }}>
                ₹{(((order.pricing?.pricePaise) || order.pricePaise || 0) / 100).toFixed(2)}
              </div>
              
              <div style={{ flex: 1 }}>
                <span className={`status-badge ${getStatusClass(order.status)}`}>{order.status}</span>
              </div>
              
              <div>
                 <Link to={`/orders/${order.id}`} className="btn btn-outline" style={{ padding: '6px 16px' }}>View</Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px' }}>
           <h3>No orders found</h3>
           <p className="text-muted">You have no orders in this category.</p>
           <Link to="/services" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: '16px' }}>Browse Services</Link>
        </div>
      )}
    </div>
  );
}
