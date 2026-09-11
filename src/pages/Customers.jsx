import { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  ShoppingBag, 
  Search, 
  Download, 
  ShieldAlert, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  X, 
  Star, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { adminApi } from '../api/admin';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Customer Details Drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status Action Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState('BLOCKED');
  const [actionReason, setActionReason] = useState('');

  const loadCustomers = () => {
    setLoading(true);
    adminApi.getCustomers({ status: statusFilter === 'ALL' ? undefined : statusFilter, q: searchTerm || undefined })
      .then(res => {
        setCustomers(res.customers || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load customers');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCustomers();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadCustomers();
  };

  const openCustomerDetail = (id) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    adminApi.getCustomerDetails(id)
      .then(res => {
        setCustomerDetail(res);
        setDetailLoading(false);
      })
      .catch(err => {
        console.error(err);
        setDetailLoading(false);
      });
  };

  const handleStatusChange = async () => {
    if (!customerDetail) return;
    try {
      await adminApi.setCustomerStatus(customerDetail.customer.id, targetStatus, actionReason || `Admin set status to ${targetStatus}`);
      setShowStatusModal(false);
      setActionReason('');
      openCustomerDetail(customerDetail.customer.id);
      loadCustomers();
    } catch (err) {
      alert(err.message || 'Failed to update customer status');
    }
  };

  const exportCSV = () => {
    const headers = ['Customer ID', 'Name', 'Email', 'Mobile', 'Status', 'Total Orders', 'Total Spent (Rs)', 'Joined Date'];
    const rows = customers.map(c => [
      c.id,
      `"${c.name || ''}"`,
      c.email || '',
      c.phone || '',
      c.status || 'ACTIVE',
      c.ordersCount || 0,
      ((c.totalSpentPaise || 0) / 100).toFixed(2),
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customers_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats calculation
  const totalCount = customers.length;
  const activeCount = customers.filter(c => c.status === 'ACTIVE' || !c.status).length;
  const blockedCount = customers.filter(c => c.status === 'BLOCKED' || c.status === 'SUSPENDED').length;
  const totalOrdersSum = customers.reduce((sum, c) => sum + (c.ordersCount || 0), 0);

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Customers Management</h1>
          <p className="subtitle">Inspect customer accounts, orders history, raised complaints, and manage access.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={exportCSV}>
            <Download size={16}/> Export CSV
          </button>
        </div>
      </div>
      
      <div className="stats-grid compact">
        <StatCard title="Total Customers" value={totalCount} icon={Users} color="purple" />
        <StatCard title="Active Accounts" value={activeCount} icon={UserCheck} color="green" />
        <StatCard title="Blocked / Suspended" value={blockedCount} icon={UserX} color="red" />
        <StatCard title="Total Orders Placed" value={totalOrdersSum} icon={ShoppingBag} color="blue" />
      </div>

      <div className="data-table-container">
        <div className="table-controls">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '420px' }}>
            <div className="search-box" style={{ width: '100%' }}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search by customer ID, name, email, phone..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-outline" style={{ whiteSpace: 'nowrap' }}>Search</button>
          </form>

          <div className="actions">
            <select 
              className="status-filter" 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading customers...</div>
        ) : error ? (
          <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>{error}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name & ID</th>
                <th>Contact Info</th>
                <th>Status</th>
                <th>Orders Placed</th>
                <th>Total Spent</th>
                <th>Joined Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="user-cell">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'Customer')}&background=0284c7&color=fff`} 
                        alt="" 
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)', fontWeight: 500 }}>
                          {c.id.slice(0, 10)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{c.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.phone || 'No phone recorded'}</div>
                  </td>
                  <td>
                    <StatusBadge status={c.status || 'ACTIVE'} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.ordersCount || 0} orders</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#16a34a' }}>
                      ₹{((c.totalSpentPaise || 0) / 100).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={() => openCustomerDetail(c.id)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* CUSTOMER DETAIL DRAWER */}
      {selectedCustomerId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '680px',
            maxWidth: '90vw',
            height: '100%',
            backgroundColor: '#fff',
            padding: '28px',
            overflowY: 'auto',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setSelectedCustomerId(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                border: 'none',
                background: '#f1f5f9',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>

            {detailLoading || !customerDetail ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>Loading customer details...</div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(customerDetail.customer?.name || 'Customer')}&background=0284c7&color=fff`} 
                    alt="" 
                    style={{ width: '64px', height: '64px', borderRadius: '50%' }}
                  />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{customerDetail.customer?.name}</h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-blue)' }}>
                        {customerDetail.customer?.id}
                      </span>
                      <StatusBadge status={customerDetail.customer?.status || 'ACTIVE'} />
                    </div>
                  </div>
                </div>

                {/* Status Actions */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px' }}>Account Status Controls</div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {customerDetail.customer?.status !== 'ACTIVE' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ color: '#16a34a', borderColor: '#86efac', fontSize: '0.85rem' }}
                        onClick={() => { setTargetStatus('ACTIVE'); setShowStatusModal(true); }}
                      >
                        Activate Account
                      </button>
                    )}
                    {customerDetail.customer?.status !== 'SUSPENDED' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ color: '#ca8a04', borderColor: '#fde047', fontSize: '0.85rem' }}
                        onClick={() => { setTargetStatus('SUSPENDED'); setShowStatusModal(true); }}
                      >
                        Suspend Account
                      </button>
                    )}
                    {customerDetail.customer?.status !== 'BLOCKED' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.85rem' }}
                        onClick={() => { setTargetStatus('BLOCKED'); setShowStatusModal(true); }}
                      >
                        Block Customer
                      </button>
                    )}
                  </div>
                </div>

                {/* Profile Information */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px', fontSize: '0.85rem' }}>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>CONTACT</div>
                    <div><strong>Email:</strong> {customerDetail.customer?.email}</div>
                    <div><strong>Mobile:</strong> {customerDetail.customer?.phone || 'Not provided'}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>ACCOUNT INFO</div>
                    <div><strong>Joined:</strong> {customerDetail.customer?.createdAt ? new Date(customerDetail.customer.createdAt).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Role:</strong> Platform Customer</div>
                  </div>
                </div>

                {/* Orders History */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Order History ({customerDetail.orders?.length || 0})
                  </h3>
                  {customerDetail.orders && customerDetail.orders.length > 0 ? (
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Service</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerDetail.orders.map(o => (
                            <tr key={o.id}>
                              <td>{o.id.slice(0, 8)}</td>
                              <td>{o.serviceSnapshot?.name || 'Service'}</td>
                              <td><StatusBadge status={o.status} /></td>
                              <td>₹{((o.pricing?.pricePaise || 0) / 100).toFixed(2)}</td>
                              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                      No orders placed by this customer yet.
                    </div>
                  )}
                </div>

                {/* Customer Complaints Raised */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Complaints Filed ({customerDetail.complaints?.length || 0})
                  </h3>
                  {customerDetail.complaints && customerDetail.complaints.length > 0 ? (
                    <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                      {customerDetail.complaints.map(c => (
                        <div key={c.id} style={{ padding: '10px', background: '#fff1f2', borderRadius: '6px', marginBottom: '8px', border: '1px solid #fecdd3', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span>{c.subject}</span>
                            <StatusBadge status={c.status} />
                          </div>
                          <div style={{ color: '#4b5563', marginTop: '4px' }}>{c.description}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', color: '#16a34a', fontSize: '0.85rem', background: '#f0fdf4', borderRadius: '6px' }}>
                      ✓ No disputes or complaints filed by this customer.
                    </div>
                  )}
                </div>

                {/* Customer Reviews & Feedback */}
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Service Reviews ({customerDetail.reviews?.length || 0})
                  </h3>
                  {customerDetail.reviews && customerDetail.reviews.length > 0 ? (
                    <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                      {customerDetail.reviews.map((r, idx) => (
                        <div key={idx} style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', marginBottom: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', gap: '4px', color: '#eab308', marginBottom: '4px' }}>
                            {[...Array(r.rating || 5)].map((_, i) => <Star key={i} size={14} fill="#eab308" />)}
                          </div>
                          <div>{r.comment || 'Good service delivered on time.'}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem', background: '#f8fafc', borderRadius: '6px' }}>
                      No reviews submitted yet.
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* STATUS CHANGE MODAL */}
      {showStatusModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>Change Customer Status to {targetStatus}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Specify the reason for this account status update.
            </p>
            <textarea
              style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '14px' }}
              placeholder="Reason for status change..."
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setShowStatusModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStatusChange}>
                Confirm Status
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}