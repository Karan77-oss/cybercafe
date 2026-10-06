import { useState, useEffect } from 'react';
import { 
  Box, 
  Search, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  X, 
  UserCheck, 
  RotateCcw, 
  PauseCircle, 
  PlayCircle, 
  DollarSign, 
  FileText, 
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { adminApi } from '../api/admin';
import { buildUrl } from '../api/client';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [statusTab, setStatusTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Order Details Drawer
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Workers for Manual Assignment Override
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignWorkerId, setAssignWorkerId] = useState('');
  const [assignNote, setAssignNote] = useState('');

  // Action Modals (Correction, Hold, Refund)
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionInstruction, setCorrectionInstruction] = useState('');

  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReason, setHoldReason] = useState('');

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const loadOrders = () => {
    setLoading(true);
    adminApi.getOrders({
      status: (statusTab === 'ALL' || statusTab === 'All Orders') ? undefined : statusTab,
      search: searchTerm || undefined,
      q: searchTerm || undefined
    })
      .then(res => {
        setOrders(res.orders || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load orders');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders();
  }, [statusTab]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadOrders();
  };

  const openOrderDetail = (id) => {
    setSelectedOrderId(id);
    setDetailLoading(true);
    adminApi.getOrderDetails(id)
      .then(res => {
        setOrderDetail(res.order);
        setDetailLoading(false);
      })
      .catch(err => {
        console.error(err);
        setDetailLoading(false);
      });
  };

  const openManualAssign = async () => {
    try {
      const res = await adminApi.getWorkers({ status: 'ACTIVE' });
      setAvailableWorkers(res.workers || []);
      setShowAssignModal(true);
    } catch (err) {
      alert('Failed to load active workers for assignment');
    }
  };

  const handleAssignWorker = async () => {
    if (!orderDetail || !assignWorkerId) return;
    try {
      await adminApi.assignWorker(orderDetail.id, assignWorkerId, assignNote || 'Administrative worker assignment override');
      setShowAssignModal(false);
      setAssignWorkerId('');
      setAssignNote('');
      openOrderDetail(orderDetail.id);
      loadOrders();
    } catch (err) {
      alert(err.message || 'Worker assignment failed');
    }
  };

  const handleRequestCorrection = async () => {
    if (!orderDetail) return;
    try {
      await adminApi.requestCorrection(orderDetail.id, correctionReason || 'Correction required', correctionInstruction || 'Please revise order within 2 hours');
      setShowCorrectionModal(false);
      setCorrectionReason('');
      setCorrectionInstruction('');
      openOrderDetail(orderDetail.id);
      loadOrders();
    } catch (err) {
      alert(err.message || 'Failed to request correction');
    }
  };

  const handleHoldEarnings = async () => {
    if (!orderDetail) return;
    try {
      await adminApi.holdWorkerEarnings(orderDetail.id, holdReason || 'Earnings placed on hold by Admin investigation');
      setShowHoldModal(false);
      setHoldReason('');
      openOrderDetail(orderDetail.id);
      loadOrders();
    } catch (err) {
      alert(err.message || 'Failed to hold earnings');
    }
  };

  const handleReleaseEarnings = async () => {
    if (!orderDetail) return;
    try {
      await adminApi.releaseWorkerEarnings(orderDetail.id);
      openOrderDetail(orderDetail.id);
      loadOrders();
    } catch (err) {
      alert(err.message || 'Failed to release earnings');
    }
  };

  const handleRefundOrder = async () => {
    if (!orderDetail) return;
    try {
      await adminApi.refundOrder(orderDetail.id, refundReason || 'Full refund processed by Admin');
      setShowRefundModal(false);
      setRefundReason('');
      openOrderDetail(orderDetail.id);
      loadOrders();
    } catch (err) {
      alert(err.message || 'Failed to refund order');
    }
  };

  const exportCSV = () => {
    const headers = ['Order ID', 'Customer', 'Worker', 'Service', 'Price (Rs)', 'Worker Earning (Rs)', 'Status', 'Date'];
    const rows = orders.map(o => [
      o.id,
      `"${o.customer?.name || ''}"`,
      `"${o.job?.worker?.name || 'Unassigned'}"`,
      `"${o.serviceSnapshot?.name || ''}"`,
      ((o.pricing?.pricePaise || 0) / 100).toFixed(2),
      ((o.pricing?.workerEarningPaise || 0) / 100).toFixed(2),
      o.status,
      new Date(o.createdAt).toLocaleDateString()
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats calculation
  const totalCount = orders.length;
  const inProgressCount = orders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'ACCEPTED').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;
  const disputeHoldCount = orders.filter(o => o.status === 'CORRECTION_REQUESTED' || o.status === 'ON_HOLD' || o.earningsHold).length;

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Orders Management</h1>
          <p className="subtitle">Monitor order pipeline, documents, output files, manual assignment overrides, and disputes.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={exportCSV}>
            <Download size={16}/> Export CSV
          </button>
        </div>
      </div>

      <div className="stats-grid compact">
        <StatCard title="Total Orders" value={totalCount} icon={Box} color="purple" />
        <StatCard title="In Progress" value={inProgressCount} icon={Clock} color="blue" />
        <StatCard title="Completed" value={completedCount} icon={CheckCircle} color="green" />
        <StatCard title="Dispute / On Hold" value={disputeHoldCount} icon={AlertCircle} color="red" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', overflowX: 'auto' }}>
        {[
          { key: 'ALL', label: 'All Orders' },
          { key: 'PENDING', label: 'Pending' },
          { key: 'IN_PROGRESS', label: 'In Progress' },
          { key: 'COMPLETED', label: 'Completed' },
          { key: 'CORRECTION_REQUESTED', label: 'Correction Requested' },
          { key: 'ON_HOLD', label: 'On Hold' },
          { key: 'CANCELLED', label: 'Cancelled' },
          { key: 'REFUNDED', label: 'Refunded' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key)}
            style={{
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              borderBottom: statusTab === tab.key ? '2px solid var(--brand-blue)' : '2px solid transparent',
              color: statusTab === tab.key ? 'var(--brand-blue)' : 'var(--text-muted)',
              fontWeight: statusTab === tab.key ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="data-table-container">
        <div className="table-controls">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '440px' }}>
            <div className="search-box" style={{ width: '100%' }}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search by Order ID, Customer, Worker, Service..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-outline" style={{ whiteSpace: 'nowrap' }}>Search</button>
          </form>
        </div>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading orders...</div>
        ) : error ? (
          <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>{error}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Service Name</th>
                <th>Customer</th>
                <th>Assigned Worker</th>
                <th>Price & Earnings</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--brand-blue)', fontSize: '0.85rem' }}>
                      {o.orderNumber || o.id}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.serviceSnapshot?.name || 'Cyber Cafe Service'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.serviceSnapshot?.category || 'Service'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{o.customer?.name || 'Customer'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.customer?.email}</div>
                  </td>
                  <td>
                    {o.job?.worker ? (
                      <div className="user-cell">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(o.job.worker.name || 'W')}&background=6366f1&color=fff`} 
                          alt="" 
                          style={{ width: '26px', height: '26px' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{o.job.worker.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--brand-blue)' }}>{o.job.worker.workerId || 'Worker'}</div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#ea580c', fontSize: '0.8rem', background: '#fff7ed', padding: '2px 8px', borderRadius: '12px' }}>
                        Auto-matching
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>₹{((o.pricing?.pricePaise || 0) / 100).toFixed(2)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Worker: ₹{((o.pricing?.workerEarningPaise || 0) / 100).toFixed(2)}
                      {o.earningsHold && <span style={{ color: '#dc2626', marginLeft: '4px' }}>(HELD)</span>}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={() => openOrderDetail(o.id)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No orders found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ORDER DETAILS DRAWER */}
      {selectedOrderId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '720px',
            maxWidth: '92vw',
            height: '100%',
            backgroundColor: '#fff',
            padding: '28px',
            overflowY: 'auto',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setSelectedOrderId(null)}
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

            {detailLoading || !orderDetail ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>Loading order details...</div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{orderDetail.serviceSnapshot?.name}</h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-blue)' }}>
                        Order #{orderDetail.id}
                      </span>
                      <StatusBadge status={orderDetail.status} />
                      {orderDetail.earningsHold && (
                        <span style={{ color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                          Earnings On Hold
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Administrative Override Actions */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '10px', color: '#1e293b' }}>
                    Administrative Overrides & Interventions
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={openManualAssign}
                    >
                      <UserCheck size={15} /> Manual Assign Override
                    </button>

                    <button 
                      className="btn btn-outline" 
                      style={{ color: '#ca8a04', borderColor: '#fde047', fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => setShowCorrectionModal(true)}
                    >
                      <RotateCcw size={15} /> Request 2h Correction
                    </button>

                    {!orderDetail.earningsHold ? (
                      <button 
                        className="btn btn-outline" 
                        style={{ color: '#ea580c', borderColor: '#fdba74', fontSize: '0.8rem', padding: '6px 12px' }}
                        onClick={() => setShowHoldModal(true)}
                      >
                        <PauseCircle size={15} /> Hold Worker Earnings
                      </button>
                    ) : (
                      <button 
                        className="btn btn-outline" 
                        style={{ color: '#16a34a', borderColor: '#86efac', fontSize: '0.8rem', padding: '6px 12px' }}
                        onClick={handleReleaseEarnings}
                      >
                        <PlayCircle size={15} /> Release Worker Earnings
                      </button>
                    )}

                    {orderDetail.status !== 'REFUNDED' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.8rem', padding: '6px 12px' }}
                        onClick={() => setShowRefundModal(true)}
                      >
                        <DollarSign size={15} /> Refund 100% to Customer
                      </button>
                    )}
                  </div>
                </div>

                {/* Customer and Worker Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px', fontSize: '0.85rem' }}>
                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>CUSTOMER</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{orderDetail.customer?.name}</div>
                    <div>{orderDetail.customer?.email}</div>
                    <div>{orderDetail.customer?.phone || 'No phone'}</div>
                  </div>

                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>ASSIGNED WORKER</div>
                    {orderDetail.job?.worker ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{orderDetail.job.worker.name}</div>
                        <div>ID: {orderDetail.job.worker.workerId || orderDetail.job.worker.id}</div>
                        <div>{orderDetail.job.worker.phone || orderDetail.job.worker.email}</div>
                      </>
                    ) : (
                      <div style={{ color: '#ea580c', fontStyle: 'italic' }}>
                        No worker assigned yet (system auto-assignment pending).
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '24px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#15803d', marginBottom: '8px' }}>FINANCIAL BREAKDOWN</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>Customer Total Paid</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>
                        ₹{((orderDetail.pricing?.pricePaise || 0) / 100).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>Platform Commission (20%)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-blue)' }}>
                        ₹{((orderDetail.pricing?.commissionPaise || 0) / 100).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>Worker Earning (80%)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: orderDetail.earningsHold ? '#dc2626' : '#15803d' }}>
                        ₹{((orderDetail.pricing?.workerEarningPaise || 0) / 100).toFixed(2)}
                        {orderDetail.earningsHold && ' (Held)'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents & Files */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Documents & Deliverables
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Customer Uploads:</div>
                      {orderDetail.documents && orderDetail.documents.length > 0 ? (
                        orderDetail.documents.map((d, i) => {
                          const docUrl = buildUrl(d.url || `/documents/${d.id}/download`);
                          const token = localStorage.getItem('cybercafe:token');
                          const authUrl = `${docUrl}${token ? (docUrl.includes('?') ? `&token=${encodeURIComponent(token)}` : `?token=${encodeURIComponent(token)}`) : ''}`;
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', color: 'var(--brand-blue)', marginTop: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <FileText size={15} /> <span>{d.name || d.fileName || d.title || `Document_${i+1}.pdf`}</span>
                              </div>
                              <a href={authUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', textDecoration: 'underline', color: 'var(--brand-blue)' }}>View</a>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }}>Customer form responses recorded</div>
                      )}
                    </div>

                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Worker Output Deliverables:</div>
                      {orderDetail.job?.outputFileUrl || (orderDetail.job?.outputFiles && orderDetail.job.outputFiles.length > 0) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', marginTop: '4px' }}>
                          <CheckCircle size={15} /> <span>{orderDetail.job.outputFileUrl || 'Final_Completed_Output.pdf'}</span>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }}>Work has not been submitted yet.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline and Correction Deadline notice */}
                {orderDetail.correctionDeadline && (
                  <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '6px', marginBottom: '20px', border: '1px solid #fde047', fontSize: '0.85rem', color: '#92400e' }}>
                    <strong>⚠ 2-Hour Correction Deadline Active:</strong> Worker must submit revised deliverables by {new Date(orderDetail.correctionDeadline).toLocaleTimeString()} ({new Date(orderDetail.correctionDeadline).toLocaleDateString()}).
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Timeline & Audit History
                  </h3>
                  <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <strong>Created:</strong> {new Date(orderDetail.createdAt).toLocaleString()}
                    </div>
                    {orderDetail.job?.startedAt && (
                      <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <strong>Worker Accepted:</strong> {new Date(orderDetail.job.startedAt).toLocaleString()}
                      </div>
                    )}
                    {orderDetail.job?.completedAt && (
                      <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <strong>Work Delivered:</strong> {new Date(orderDetail.job.completedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* MANUAL ASSIGN OVERRIDE MODAL */}
      {showAssignModal && (
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
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '480px', width: '100%' }}>
            <h3 style={{ margin: '0 0 8px 0' }}>Manual Worker Assignment Override</h3>
            <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '6px', fontSize: '0.8rem', color: '#1e40af', marginBottom: '14px' }}>
              <strong>Notice:</strong> Normal worker assignment is system-controlled by order proximity & availability. Manual assignment is strictly an administrative override.
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Select Active Worker *</label>
              <select 
                className="status-filter" 
                style={{ width: '100%' }}
                value={assignWorkerId}
                onChange={e => setAssignWorkerId(e.target.value)}
              >
                <option value="">-- Choose active worker --</option>
                {availableWorkers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.workerId || w.id.slice(0,8)}) - {w.workerProfile?.city || 'Jaipur'}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Administrative Note / Reason</label>
              <input 
                type="text" 
                className="search-box" 
                style={{ width: '100%' }}
                placeholder="e.g. Previous worker unreachable, assigned to senior worker"
                value={assignNote}
                onChange={e => setAssignNote(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignWorker} disabled={!assignWorkerId}>
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-HOUR CORRECTION MODAL */}
      {showCorrectionModal && (
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
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '480px', width: '100%' }}>
            <h3 style={{ margin: '0 0 8px 0' }}>Request Order Correction (2h Deadline)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              The worker will be notified immediately and assigned an administrative 2-hour deadline to upload corrected output.
            </p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Issue Reason *</label>
              <input 
                type="text" 
                className="search-box" 
                style={{ width: '100%' }}
                placeholder="e.g. Name misspelled on form, blurred stamp"
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Specific Instructions for Worker</label>
              <textarea 
                style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                placeholder="Specific guidance for the worker to fix the output..."
                value={correctionInstruction}
                onChange={e => setCorrectionInstruction(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setShowCorrectionModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#ca8a04' }} onClick={handleRequestCorrection}>
                Dispatch 2h Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOLD EARNINGS MODAL */}
      {showHoldModal && (
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
            <h3 style={{ margin: '0 0 8px 0' }}>Hold Worker Earnings</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Holding worker earnings prevents payout withdrawal during active investigation or customer dispute.
            </p>
            <textarea 
              style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '14px' }}
              placeholder="Reason for holding earnings..."
              value={holdReason}
              onChange={e => setHoldReason(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setShowHoldModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#ea580c' }} onClick={handleHoldEarnings}>
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {showRefundModal && (
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
            <h3 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Issue Full 100% Refund</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              This will refund ₹{orderDetail ? ((orderDetail.pricing?.pricePaise || 0)/100).toFixed(2) : '0.00'} back to the customer wallet/source and mark order as REFUNDED.
            </p>
            <textarea 
              style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '14px' }}
              placeholder="Reason for full refund..."
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setShowRefundModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#dc2626' }} onClick={handleRefundOrder}>
                Process 100% Refund
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}