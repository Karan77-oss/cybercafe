import { useState, useEffect } from 'react';
import { 
  UserCog, 
  UserCheck, 
  UserX, 
  Clock, 
  Search, 
  Download, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  CreditCard, 
  Star, 
  X, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { adminApi } from '../api/admin';

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Worker for Detail Drawer
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Hire / Create Worker Modal (11 required fields)
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireForm, setHireForm] = useState({
    workerName: '',
    workerId: '',
    mobile: '',
    email: '',
    businessName: '',
    address: '',
    city: '',
    skills: 'PAN Card, Voter ID, Aadhaar Print',
    idProof: 'Aadhaar_Document.pdf',
    photo: 'Photo.jpg',
    accountNumber: '',
    ifsc: '',
    accountHolderName: '',
    upiId: ''
  });
  const [hireSubmitting, setHireSubmitting] = useState(false);
  const [hireSuccess, setHireSuccess] = useState('');

  // Status / Verification action modals
  const [actionReason, setActionReason] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyType, setVerifyType] = useState('approve'); // approve | reject
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState('SUSPENDED');

  const loadWorkers = () => {
    setLoading(true);
    adminApi.getWorkers({ status: statusFilter === 'ALL' ? undefined : statusFilter, q: searchTerm || undefined })
      .then(res => {
        setWorkers(res.workers || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load workers');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadWorkers();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadWorkers();
  };

  const openWorkerDetail = (id) => {
    setSelectedWorkerId(id);
    setDetailLoading(true);
    adminApi.getWorkerDetails(id)
      .then(res => {
        setWorkerDetail(res);
        setDetailLoading(false);
      })
      .catch(err => {
        console.error(err);
        setDetailLoading(false);
      });
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    setHireSubmitting(true);
    setHireSuccess('');
    try {
      await adminApi.createWorker(hireForm);
      setHireSuccess('Worker created successfully and added to platform.');
      setTimeout(() => {
        setShowHireModal(false);
        setHireSuccess('');
        loadWorkers();
      }, 1200);
    } catch (err) {
      alert(err.message || 'Failed to create worker');
    } finally {
      setHireSubmitting(false);
    }
  };

  const handleVerification = async () => {
    if (!workerDetail) return;
    const approved = verifyType === 'approve';
    try {
      await adminApi.verifyWorker(workerDetail.worker.id, approved, actionReason || (approved ? 'ID Proof Approved by Admin' : 'ID Proof Rejected by Admin'));
      setShowVerifyModal(false);
      setActionReason('');
      openWorkerDetail(workerDetail.worker.id);
      loadWorkers();
    } catch (err) {
      alert(err.message || 'Verification update failed');
    }
  };

  const handleStatusChange = async () => {
    if (!workerDetail) return;
    try {
      await adminApi.setWorkerStatus(workerDetail.worker.id, targetStatus, actionReason || `Admin set status to ${targetStatus}`);
      setShowStatusModal(false);
      setActionReason('');
      openWorkerDetail(workerDetail.worker.id);
      loadWorkers();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const exportCSV = () => {
    const headers = ['Worker ID', 'Name', 'Email', 'Mobile', 'City', 'Status', 'Verified', 'Total Orders', 'Total Earnings'];
    const rows = workers.map(w => [
      w.workerId || w.id,
      `"${w.name || ''}"`,
      w.email || '',
      w.phone || '',
      `"${w.workerProfile?.city || ''}"`,
      w.status || 'ACTIVE',
      w.workerProfile?.idVerified ? 'YES' : 'NO',
      w.workerProfile?.completedOrders || 0,
      ((w.workerProfile?.totalEarningsPaise || 0) / 100).toFixed(2)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `workers_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats calculation
  const totalCount = workers.length;
  const activeCount = workers.filter(w => w.status === 'ACTIVE').length;
  const pendingCount = workers.filter(w => w.status === 'PENDING_APPROVAL' || (w.workerProfile && !w.workerProfile.idVerified)).length;
  const blockedCount = workers.filter(w => w.status === 'BLOCKED' || w.status === 'SUSPENDED').length;

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Workers Management</h1>
          <p className="subtitle">Search, verify documents, track performance, and hire platform workers.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={exportCSV}>
            <Download size={16}/> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowHireModal(true)}>
            <Plus size={16}/> Hire / Add Worker
          </button>
        </div>
      </div>
      
      <div className="stats-grid compact">
        <StatCard title="Total Workers" value={totalCount} icon={UserCog} color="purple" />
        <StatCard title="Active Workers" value={activeCount} icon={UserCheck} color="green" />
        <StatCard title="Pending Approval / ID" value={pendingCount} icon={Clock} color="yellow" />
        <StatCard title="Suspended / Blocked" value={blockedCount} icon={UserX} color="red" />
      </div>

      <div className="data-table-container">
        <div className="table-controls">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '420px' }}>
            <div className="search-box" style={{ width: '100%' }}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search by ID, name, phone, city, skills..." 
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
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading workers catalog...</div>
        ) : error ? (
          <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>{error}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Worker ID & Name</th>
                <th>Contact</th>
                <th>Location & Skills</th>
                <th>ID Verification</th>
                <th>Status</th>
                <th>Orders / Earnings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const profile = w.workerProfile || {};
                const isVerified = profile.idVerified;
                return (
                  <tr key={w.id}>
                    <td>
                      <div className="user-cell">
                        <img 
                          src={w.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name || 'Worker')}&background=6366f1&color=fff`} 
                          alt="" 
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{w.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)', fontWeight: 500 }}>
                            {w.workerId || w.id.slice(0, 10)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{w.phone || 'No phone'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.email}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{profile.city || 'Remote'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {profile.skills ? profile.skills.slice(0, 26) + '...' : 'General Services'}
                      </div>
                    </td>
                    <td>
                      {isVerified ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.8rem', fontWeight: 600, background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                          <ShieldCheck size={14} /> Verified
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ca8a04', fontSize: '0.8rem', fontWeight: 600, background: '#fef9c3', padding: '2px 8px', borderRadius: '12px' }}>
                          <ShieldAlert size={14} /> Pending
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={w.status || 'ACTIVE'} />
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        ₹{((profile.totalEarningsPaise || 0) / 100).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {profile.completedOrders || 0} completed
                      </div>
                    </td>
                    <td>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => openWorkerDetail(w.id)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
              {workers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No workers found matching the query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* WORKER DETAIL DRAWER / MODAL */}
      {selectedWorkerId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
              onClick={() => setSelectedWorkerId(null)}
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

            {detailLoading || !workerDetail ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>Loading worker profile details...</div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <img 
                    src={workerDetail.worker?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(workerDetail.worker?.name || 'Worker')}&background=6366f1&color=fff`} 
                    alt="" 
                    style={{ width: '64px', height: '64px', borderRadius: '50%' }}
                  />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{workerDetail.worker?.name}</h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-blue)' }}>
                        {workerDetail.worker?.workerId || workerDetail.worker?.id}
                      </span>
                      <StatusBadge status={workerDetail.worker?.status || 'ACTIVE'} />
                      {workerDetail.worker?.workerProfile?.idVerified ? (
                        <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}>✓ Verified</span>
                      ) : (
                        <span style={{ color: '#ca8a04', fontSize: '0.8rem', fontWeight: 600 }}>⚠ ID Pending</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status and Verification Action Bar */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px' }}>Administrative Controls</div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {!workerDetail.worker?.workerProfile?.idVerified ? (
                      <button 
                        className="btn btn-primary" 
                        style={{ background: '#16a34a', fontSize: '0.85rem', padding: '6px 12px' }}
                        onClick={() => { setVerifyType('approve'); setShowVerifyModal(true); }}
                      >
                        <ShieldCheck size={16} /> Approve ID Proof
                      </button>
                    ) : (
                      <button 
                        className="btn btn-outline" 
                        style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.85rem', padding: '6px 12px' }}
                        onClick={() => { setVerifyType('reject'); setShowVerifyModal(true); }}
                      >
                        <ShieldAlert size={16} /> Revoke / Reject ID
                      </button>
                    )}

                    {workerDetail.worker?.status !== 'ACTIVE' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ color: '#16a34a', borderColor: '#86efac', fontSize: '0.85rem', padding: '6px 12px' }}
                        onClick={() => { setTargetStatus('ACTIVE'); setShowStatusModal(true); }}
                      >
                        Activate Worker
                      </button>
                    )}
                    {workerDetail.worker?.status !== 'SUSPENDED' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ color: '#ca8a04', borderColor: '#fde047', fontSize: '0.85rem', padding: '6px 12px' }}
                        onClick={() => { setTargetStatus('SUSPENDED'); setShowStatusModal(true); }}
                      >
                        Suspend Worker
                      </button>
                    )}
                    {workerDetail.worker?.status !== 'BLOCKED' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.85rem', padding: '6px 12px' }}
                        onClick={() => { setTargetStatus('BLOCKED'); setShowStatusModal(true); }}
                      >
                        Block Worker
                      </button>
                    )}
                  </div>
                </div>

                {/* Worker Profile Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px', fontSize: '0.85rem' }}>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>CONTACT</div>
                    <div><strong>Mobile:</strong> {workerDetail.worker?.phone || 'N/A'}</div>
                    <div><strong>Email:</strong> {workerDetail.worker?.email}</div>
                    <div><strong>Business:</strong> {workerDetail.worker?.workerProfile?.businessName || 'Cyber Cafe Outlet'}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>LOCATION & SKILLS</div>
                    <div><strong>City/State:</strong> {workerDetail.worker?.workerProfile?.city || 'N/A'}, {workerDetail.worker?.workerProfile?.state || ''}</div>
                    <div><strong>Address:</strong> {workerDetail.worker?.workerProfile?.address || 'N/A'}</div>
                    <div><strong>Skills:</strong> {workerDetail.worker?.workerProfile?.skills || 'General Cyber Cafe'}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>PAYOUT & BANK DETAILS</div>
                    <div><strong>UPI ID:</strong> {workerDetail.worker?.workerProfile?.upiId || 'N/A'}</div>
                    <div><strong>Account No:</strong> {workerDetail.worker?.workerProfile?.accountNumber || 'N/A'}</div>
                    <div><strong>IFSC:</strong> {workerDetail.worker?.workerProfile?.ifsc || 'N/A'}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>DOCUMENT SUBMITTED</div>
                    <div><strong>ID Type:</strong> Aadhaar / PAN Card</div>
                    <div><strong>File:</strong> <span style={{ color: 'var(--brand-blue)' }}>{workerDetail.worker?.workerProfile?.idProof || 'Identity_Proof.pdf'}</span></div>
                    <div><strong>Verified:</strong> {workerDetail.worker?.workerProfile?.idVerified ? 'YES' : 'PENDING'}</div>
                  </div>
                </div>

                {/* Earnings & Performance KPI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px', textAlign: 'center' }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Earnings</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>
                      ₹{((workerDetail.earnings?.totalEarnedPaise || 0) / 100).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending / Held</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ea580c' }}>
                      ₹{(((workerDetail.earnings?.heldBalancePaise || 0) + (workerDetail.earnings?.availableBalancePaise || 0)) / 100).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed Orders</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {workerDetail.performance?.completedOrders || 0}
                    </div>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rating Score</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Star size={16} fill="#eab308" color="#eab308" /> {workerDetail.performance?.rating || 4.8}
                    </div>
                  </div>
                </div>

                {/* Assigned Orders List */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Recent Assigned Orders ({workerDetail.orders?.length || 0})
                  </h3>
                  {workerDetail.orders && workerDetail.orders.length > 0 ? (
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Service</th>
                            <th>Status</th>
                            <th>Earnings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workerDetail.orders.map(o => (
                            <tr key={o.id}>
                              <td>{o.id.slice(0, 8)}</td>
                              <td>{o.customer?.name || 'Customer'}</td>
                              <td>{o.serviceSnapshot?.name || 'Service'}</td>
                              <td><StatusBadge status={o.status} /></td>
                              <td>₹{((o.pricing?.workerEarningPaise || 0) / 100).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                      No orders assigned to this worker yet.
                    </div>
                  )}
                </div>

                {/* Complaints against this worker */}
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Complaints / Disputes ({workerDetail.complaints?.length || 0})
                  </h3>
                  {workerDetail.complaints && workerDetail.complaints.length > 0 ? (
                    <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                      {workerDetail.complaints.map(c => (
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
                      ✓ Clean track record. No complaints filed against this worker.
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* HIRE / ADD WORKER MODAL (11 Required Fields) */}
      {showHireModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Hire / Register New Worker</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Complete all 11 required worker details per platform guidelines.</p>
              </div>
              <button onClick={() => setShowHireModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {hireSuccess && (
              <div style={{ padding: '12px', background: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '16px', fontWeight: 500 }}>
                ✓ {hireSuccess}
              </div>
            )}

            <form onSubmit={handleCreateWorker}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>1. Full Name *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={hireForm.workerName} onChange={e => setHireForm({...hireForm, workerName: e.target.value})} placeholder="e.g. Ramesh Kumar" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>2. Worker ID / Code *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={hireForm.workerId} onChange={e => setHireForm({...hireForm, workerId: e.target.value})} placeholder="e.g. WRK-108" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>3. Mobile Number *</label>
                  <input required type="tel" className="search-box" style={{ width: '100%' }} value={hireForm.mobile} onChange={e => setHireForm({...hireForm, mobile: e.target.value})} placeholder="e.g. 9876543210" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>4. Email Address *</label>
                  <input required type="email" className="search-box" style={{ width: '100%' }} value={hireForm.email} onChange={e => setHireForm({...hireForm, email: e.target.value})} placeholder="e.g. ramesh@cybercafe.com" />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>5. Business / Cyber Cafe Outlet Name *</label>
                <input required type="text" className="search-box" style={{ width: '100%' }} value={hireForm.businessName} onChange={e => setHireForm({...hireForm, businessName: e.target.value})} placeholder="e.g. Ramesh Digital Seva Kendra" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>6. Complete Address *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={hireForm.address} onChange={e => setHireForm({...hireForm, address: e.target.value})} placeholder="Shop 4, Main Market, Station Road" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>7. City / District *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={hireForm.city} onChange={e => setHireForm({...hireForm, city: e.target.value})} placeholder="e.g. Jaipur" />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>8. Skills / Specialization *</label>
                <input required type="text" className="search-box" style={{ width: '100%' }} value={hireForm.skills} onChange={e => setHireForm({...hireForm, skills: e.target.value})} placeholder="e.g. PAN Card, Voter ID, Aadhaar, Passport, Police Verification" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>9. ID Proof Document File *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={hireForm.idProof} onChange={e => setHireForm({...hireForm, idProof: e.target.value})} placeholder="e.g. Aadhaar_Ramesh.pdf" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>10. Passport Photo File *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={hireForm.photo} onChange={e => setHireForm({...hireForm, photo: e.target.value})} placeholder="e.g. Ramesh_Photo.jpg" />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>11. Bank Account & UPI Details *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input type="text" className="search-box" style={{ width: '100%' }} placeholder="Account Holder Name" value={hireForm.accountHolderName} onChange={e => setHireForm({...hireForm, accountHolderName: e.target.value})} />
                  <input type="text" className="search-box" style={{ width: '100%' }} placeholder="Account Number" value={hireForm.accountNumber} onChange={e => setHireForm({...hireForm, accountNumber: e.target.value})} />
                  <input type="text" className="search-box" style={{ width: '100%' }} placeholder="IFSC Code" value={hireForm.ifsc} onChange={e => setHireForm({...hireForm, ifsc: e.target.value})} />
                  <input type="text" className="search-box" style={{ width: '100%' }} placeholder="UPI ID (e.g. name@okhdfcbank)" value={hireForm.upiId} onChange={e => setHireForm({...hireForm, upiId: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowHireModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={hireSubmitting}>
                  {hireSubmitting ? 'Creating Worker...' : 'Submit & Hire Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERIFY MODAL */}
      {showVerifyModal && (
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
            <h3 style={{ margin: '0 0 12px 0' }}>
              {verifyType === 'approve' ? 'Approve Worker ID Verification' : 'Reject Worker ID Verification'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              {verifyType === 'approve' 
                ? 'Confirming this will mark the worker as verified and eligible for high-priority order assignments.'
                : 'Please state the reason for rejecting or revoking ID verification.'}
            </p>
            <textarea
              style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '14px' }}
              placeholder={verifyType === 'approve' ? 'Optional verification note...' : 'Reason for rejection (e.g. blurry document, mismatch in DOB)...'}
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setShowVerifyModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ background: verifyType === 'approve' ? '#16a34a' : '#dc2626' }}
                onClick={handleVerification}
              >
                Confirm {verifyType === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
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
            <h3 style={{ margin: '0 0 12px 0' }}>Change Worker Status to {targetStatus}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Provide the administrative reason for changing this worker's status.
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
                Apply Status
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}