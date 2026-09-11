import { useState, useEffect } from 'react';
import { 
  Users, 
  UserCog, 
  Radio, 
  Box, 
  Layers, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Wallet, 
  ArrowDownToLine, 
  AlertTriangle, 
  IndianRupee, 
  Calendar, 
  Plus, 
  TrendingUp, 
  ExternalLink,
  Check,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalWorkers: 0,
    onlineWorkers: 0,
    activeOrders: 0,
    availableOrders: 0,
    completedOrders: 0,
    pendingServiceApprovals: 0,
    pendingWorkerVerification: 0,
    pendingEarningsPaise: 0,
    pendingWithdrawals: 0,
    complaintsDisputes: 0,
    totalRevenuePaise: 0,
    totalCommissionPaise: 0,
    todayOrdersCount: 0,
    todayEarningsPaise: 0
  });
  const [topWorkers, setTopWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showAddService, setShowAddService] = useState(false);
  const [showHireWorker, setShowHireWorker] = useState(false);

  // Add Service Form
  const [newService, setNewService] = useState({
    name: '',
    category: 'Government forms',
    pricePaise: 19900,
    estimatedTime: '24-48 Hours',
    description: '',
    requiredDocuments: 'Aadhaar Card, Passport Photo'
  });

  // Hire Worker Form (Required 11 Fields)
  const [newWorker, setNewWorker] = useState({
    workerName: '',
    workerId: '',
    mobile: '',
    email: '',
    businessName: '',
    address: '',
    city: '',
    skills: 'PAN Card, Voter ID',
    idProof: 'Aadhaar_Document.pdf',
    photo: 'Photo.jpg',
    accountNumber: '',
    ifsc: '',
    accountHolderName: '',
    upiId: ''
  });

  const loadData = () => {
    Promise.all([
      adminApi.getDashboardStats(),
      adminApi.getTopEarningWorkers('monthly')
    ])
      .then(([statsRes, workersRes]) => {
        if (statsRes.stats) setStats(statsRes.stats);
        if (workersRes.rankings) setTopWorkers(workersRes.rankings.slice(0, 5));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load dashboard data');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createService({
        name: newService.name,
        category: newService.category,
        pricePaise: Number(newService.pricePaise),
        estimatedTime: newService.estimatedTime,
        description: newService.description,
        requiredDocuments: newService.requiredDocuments.split(',').map(s => s.trim())
      });
      setShowAddService(false);
      loadData();
      alert('New service created successfully');
    } catch (err) {
      alert(err.message || 'Failed to create service');
    }
  };

  const handleHireWorkerSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createWorker({
        workerName: newWorker.workerName,
        workerId: newWorker.workerId,
        mobile: newWorker.mobile,
        email: newWorker.email,
        businessName: newWorker.businessName,
        address: newWorker.address,
        city: newWorker.city,
        skills: newWorker.skills.split(',').map(s => s.trim()),
        idProof: newWorker.idProof,
        photo: newWorker.photo,
        bankDetails: {
          accountNumber: newWorker.accountNumber,
          ifsc: newWorker.ifsc,
          accountHolderName: newWorker.accountHolderName || newWorker.workerName,
          upiId: newWorker.upiId
        }
      });
      setShowHireWorker(false);
      loadData();
      alert('Worker hired/created successfully in PENDING verification status.');
    } catch (err) {
      alert(err.message || 'Failed to hire worker');
    }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center' }}>Loading Admin Dashboard...</div>;
  if (error) return <div style={{ padding: '60px', color: 'red', textAlign: 'center' }}>{error}</div>;

  return (
    <div className="view-content">
      {/* Header with Quick Actions */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Operations Dashboard</h1>
          <p className="subtitle">Central management overview of Cyber Cafe Marketplace.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={() => setShowHireWorker(true)}>
            <Plus size={16} /> Create/Hire Worker
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddService(true)}>
            <Plus size={16} /> Add New Service
          </button>
        </div>
      </div>

      {/* 13 Summary Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* 1. Total Customers */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/customers')}>
          <div className="stat-icon purple"><Users size={20}/></div>
          <div className="stat-info">
            <h3>Total Customers</h3>
            <div className="value">{stats.totalCustomers}</div>
            <div className="trend" style={{ color: 'var(--text-muted)' }}>Registered accounts</div>
          </div>
        </div>

        {/* 2. Total Workers */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/workers')}>
          <div className="stat-icon blue"><UserCog size={20}/></div>
          <div className="stat-info">
            <h3>Total Workers</h3>
            <div className="value">{stats.totalWorkers}</div>
            <div className="trend" style={{ color: 'var(--text-muted)' }}>Registered operators</div>
          </div>
        </div>

        {/* 3. Online Workers */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/workers?status=ACTIVE')}>
          <div className="stat-icon green"><Radio size={20}/></div>
          <div className="stat-info">
            <h3>Online Workers</h3>
            <div className="value">{stats.onlineWorkers}</div>
            <div className="trend" style={{ color: 'var(--green)' }}>Active & available now</div>
          </div>
        </div>

        {/* 4. Active Orders */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/orders?status=IN_PROGRESS')}>
          <div className="stat-icon blue"><Box size={20}/></div>
          <div className="stat-info">
            <h3>Active Orders</h3>
            <div className="value">{stats.activeOrders}</div>
            <div className="trend" style={{ color: 'var(--blue)' }}>Assigned / In Progress</div>
          </div>
        </div>

        {/* 5. Available Orders */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/orders?status=AVAILABLE')}>
          <div className="stat-icon orange"><Clock size={20}/></div>
          <div className="stat-info">
            <h3>Available Orders</h3>
            <div className="value">{stats.availableOrders}</div>
            <div className="trend" style={{ color: 'var(--orange)' }}>Awaiting worker accept</div>
          </div>
        </div>

        {/* 6. Completed Orders */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/orders?status=COMPLETED')}>
          <div className="stat-icon green"><CheckCircle size={20}/></div>
          <div className="stat-info">
            <h3>Completed Orders</h3>
            <div className="value">{stats.completedOrders}</div>
            <div className="trend" style={{ color: 'var(--green)' }}>Fulfilled successfully</div>
          </div>
        </div>

        {/* 7. Pending Service Approvals */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/services')}>
          <div className="stat-icon yellow"><Layers size={20}/></div>
          <div className="stat-info">
            <h3>Pending Proposals</h3>
            <div className="value">{stats.pendingServiceApprovals}</div>
            <div className="trend" style={{ color: stats.pendingServiceApprovals > 0 ? 'var(--orange)' : 'var(--text-muted)' }}>Worker proposed services</div>
          </div>
        </div>

        {/* 8. Pending Worker Verification */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/workers?status=PENDING')}>
          <div className="stat-icon red"><AlertCircle size={20}/></div>
          <div className="stat-info">
            <h3>Pending Verifications</h3>
            <div className="value">{stats.pendingWorkerVerification}</div>
            <div className="trend" style={{ color: stats.pendingWorkerVerification > 0 ? 'var(--red)' : 'var(--text-muted)' }}>Requires ID approval</div>
          </div>
        </div>

        {/* 9. Pending Earnings */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/payments')}>
          <div className="stat-icon orange"><Wallet size={20}/></div>
          <div className="stat-info">
            <h3>Pending Earnings</h3>
            <div className="value">₹{((stats.pendingEarningsPaise || 0) / 100).toLocaleString('en-IN')}</div>
            <div className="trend" style={{ color: 'var(--orange)' }}>Active in worker pipelines</div>
          </div>
        </div>

        {/* 10. Pending Withdrawals */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/payments')}>
          <div className="stat-icon purple"><ArrowDownToLine size={20}/></div>
          <div className="stat-info">
            <h3>Pending Withdrawals</h3>
            <div className="value">{stats.pendingWithdrawals}</div>
            <div className="trend" style={{ color: stats.pendingWithdrawals > 0 ? 'var(--purple)' : 'var(--text-muted)' }}>Awaiting bank payout</div>
          </div>
        </div>

        {/* 11. Complaints / Disputes */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/complaints')}>
          <div className="stat-icon red"><AlertTriangle size={20}/></div>
          <div className="stat-info">
            <h3>Complaints / Disputes</h3>
            <div className="value">{stats.complaintsDisputes}</div>
            <div className="trend" style={{ color: stats.complaintsDisputes > 0 ? 'var(--red)' : 'var(--green)' }}>Open cases needing review</div>
          </div>
        </div>

        {/* 12. Total Revenue */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/payments')}>
          <div className="stat-icon green"><IndianRupee size={20}/></div>
          <div className="stat-info">
            <h3>Total Revenue</h3>
            <div className="value">₹{((stats.totalRevenuePaise || 0) / 100).toLocaleString('en-IN')}</div>
            <div className="trend" style={{ color: 'var(--green)' }}>Platform GMV</div>
          </div>
        </div>

        {/* 13. Today's Orders / Earnings */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/orders')}>
          <div className="stat-icon blue"><Calendar size={20}/></div>
          <div className="stat-info">
            <h3>Today's Orders / Payout</h3>
            <div className="value">{stats.todayOrdersCount} Orders</div>
            <div className="trend" style={{ color: 'var(--blue)' }}>₹{((stats.todayEarningsPaise || 0) / 100).toFixed(0)} worker earnings</div>
          </div>
        </div>
      </div>

      {/* Worker Performance Overview */}
      <div className="data-table-container">
        <div className="table-controls">
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Worker Performance Leaderboard</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Top performing cyber cafe operators based on completed jobs and verified customer ratings.</p>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/admin/workers')}>
            View All Workers <ExternalLink size={14} />
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Operator Name</th>
              <th>Business / Center</th>
              <th>Completed Orders</th>
              <th>Total Earnings</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {topWorkers.map((w, index) => (
              <tr key={w.workerId}>
                <td>
                  <span style={{ 
                    fontWeight: 700, 
                    display: 'inline-flex', 
                    width: 24, 
                    height: 24, 
                    borderRadius: '50%', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    background: index === 0 ? 'rgba(241, 196, 15, 0.2)' : 'rgba(0,0,0,0.05)',
                    color: index === 0 ? '#b7791f' : 'inherit'
                  }}>
                    #{w.rank || index + 1}
                  </span>
                </td>
                <td>
                  <div className="user-cell">
                    <img src={`https://ui-avatars.com/api/?name=${w.workerName.replace(' ', '+')}&background=random`} alt="" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{w.workerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {w.workerId}</div>
                    </div>
                  </div>
                </td>
                <td>{w.businessName || 'Cyber Cafe Kendra'}</td>
                <td><span style={{ fontWeight: 600 }}>{w.completedOrders}</span> orders</td>
                <td style={{ fontWeight: 600, color: 'var(--green)' }}>₹{(w.totalEarningsPaise / 100).toLocaleString('en-IN')}</td>
                <td>
                  <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => navigate(`/admin/workers?id=${w.workerId}`)}>
                    Inspect Profile
                  </button>
                </td>
              </tr>
            ))}
            {topWorkers.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No worker activity recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add New Service */}
      {showAddService && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '540px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Add New Marketplace Service</h3>
              <button onClick={() => setShowAddService(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateServiceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Service Name *</label>
                <input type="text" className="form-input" required value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} placeholder="e.g. Birth Certificate Online Registration" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Category *</label>
                  <select className="form-input" value={newService.category} onChange={e => setNewService({...newService, category: e.target.value})}>
                    <option value="Government forms">Government forms</option>
                    <option value="PAN-related services">PAN-related services</option>
                    <option value="Passport-related application assistance">Passport-related</option>
                    <option value="Income/caste/residence certificate assistance">Certificate Assistance</option>
                    <option value="Scholarship forms">Scholarship forms</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Customer Price (in ₹) *</label>
                  <input type="number" className="form-input" required value={newService.pricePaise / 100} onChange={e => setNewService({...newService, pricePaise: Number(e.target.value) * 100})} />
                </div>
              </div>
              <div>
                <label className="form-label">Estimated Completion SLA *</label>
                <input type="text" className="form-input" required value={newService.estimatedTime} onChange={e => setNewService({...newService, estimatedTime: e.target.value})} placeholder="e.g. 24 Hours or 2-3 Working Days" />
              </div>
              <div>
                <label className="form-label">Required Documents (comma-separated)</label>
                <input type="text" className="form-input" value={newService.requiredDocuments} onChange={e => setNewService({...newService, requiredDocuments: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Service Description</label>
                <textarea className="form-input" rows="3" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} placeholder="Detailed description of the application assistance provided..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddService(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish Service</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create / Hire New Worker (Exact 11 Required Fields) */}
      {showHireWorker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '640px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3>Create / Hire New Worker</h3>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>All 11 required fields defined in Context Section 4.</p>
              </div>
              <button onClick={() => setShowHireWorker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleHireWorkerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* 1. Worker Name */}
                <div>
                  <label className="form-label">1. Worker Name *</label>
                  <input type="text" className="form-input" required value={newWorker.workerName} onChange={e => setNewWorker({...newWorker, workerName: e.target.value})} placeholder="Full name" />
                </div>
                {/* 2. Worker ID */}
                <div>
                  <label className="form-label">2. Worker ID *</label>
                  <input type="text" className="form-input" required value={newWorker.workerId} onChange={e => setNewWorker({...newWorker, workerId: e.target.value})} placeholder="e.g. worker-03" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* 3. Mobile */}
                <div>
                  <label className="form-label">3. Mobile Number *</label>
                  <input type="tel" className="form-input" required value={newWorker.mobile} onChange={e => setNewWorker({...newWorker, mobile: e.target.value})} placeholder="10-digit mobile" />
                </div>
                {/* 4. Email */}
                <div>
                  <label className="form-label">4. Email Address *</label>
                  <input type="email" className="form-input" required value={newWorker.email} onChange={e => setNewWorker({...newWorker, email: e.target.value})} placeholder="worker@email.com" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* 5. Business Name */}
                <div>
                  <label className="form-label">5. Cyber Cafe / Business Name *</label>
                  <input type="text" className="form-input" required value={newWorker.businessName} onChange={e => setNewWorker({...newWorker, businessName: e.target.value})} placeholder="Kendra / Cafe name" />
                </div>
                {/* 7. City */}
                <div>
                  <label className="form-label">7. City *</label>
                  <input type="text" className="form-input" required value={newWorker.city} onChange={e => setNewWorker({...newWorker, city: e.target.value})} placeholder="e.g. Patna, Ranchi, Delhi" />
                </div>
              </div>

              {/* 6. Address */}
              <div>
                <label className="form-label">6. Physical Address *</label>
                <input type="text" className="form-input" required value={newWorker.address} onChange={e => setNewWorker({...newWorker, address: e.target.value})} placeholder="Shop address, Street, Landmark" />
              </div>

              {/* 8. Services/Skills */}
              <div>
                <label className="form-label">8. Services / Skills *</label>
                <input type="text" className="form-input" required value={newWorker.skills} onChange={e => setNewWorker({...newWorker, skills: e.target.value})} placeholder="PAN, Aadhaar, Voter, Passport, Scholarship" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* 9. ID Proof */}
                <div>
                  <label className="form-label">9. ID Proof Document Name/File *</label>
                  <input type="text" className="form-input" required value={newWorker.idProof} onChange={e => setNewWorker({...newWorker, idProof: e.target.value})} placeholder="Aadhaar_or_PAN.pdf" />
                </div>
                {/* 10. Photo */}
                <div>
                  <label className="form-label">10. Operator Photo File *</label>
                  <input type="text" className="form-input" required value={newWorker.photo} onChange={e => setNewWorker({...newWorker, photo: e.target.value})} placeholder="Worker_Photo.jpg" />
                </div>
              </div>

              {/* 11. Bank Details */}
              <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>11. Bank & Payout Details *</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input type="text" className="form-input" required placeholder="Bank Account Number" value={newWorker.accountNumber} onChange={e => setNewWorker({...newWorker, accountNumber: e.target.value})} />
                  <input type="text" className="form-input" required placeholder="IFSC Code" value={newWorker.ifsc} onChange={e => setNewWorker({...newWorker, ifsc: e.target.value})} />
                  <input type="text" className="form-input" placeholder="Account Holder Name" value={newWorker.accountHolderName} onChange={e => setNewWorker({...newWorker, accountHolderName: e.target.value})} />
                  <input type="text" className="form-input" placeholder="UPI ID (e.g. name@upi)" value={newWorker.upiId} onChange={e => setNewWorker({...newWorker, upiId: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowHireWorker(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Hire & Submit for Verification</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}