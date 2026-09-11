import { useState, useEffect } from 'react';
import { 
  Layers, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Power, 
  CheckCircle, 
  XCircle, 
  Download, 
  X, 
  Clock, 
  UserCheck 
} from 'lucide-react';
import { adminApi } from '../api/admin';
import StatusBadge from '../components/StatusBadge';

export default function Services() {
  const [activeTab, setActiveTab] = useState('CATALOG'); // CATALOG | PROPOSALS
  const [servicesData, setServicesData] = useState([]);
  const [proposalsData, setProposalsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Add / Edit Service Modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editServiceId, setEditServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'Government forms',
    pricePaise: 19900,
    estimatedTime: '24-48 Hours',
    description: '',
    requiredDocuments: 'Aadhaar Card, Passport Photo'
  });

  // Reject Proposal Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectProposalId, setRejectProposalId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      adminApi.getServices(),
      adminApi.getProposals()
    ])
      .then(([srvRes, propRes]) => {
        setServicesData(srvRes.services || []);
        setProposalsData(propRes.proposals || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load services data');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setEditServiceId(null);
    setServiceForm({
      name: '',
      category: 'Government forms',
      pricePaise: 19900,
      estimatedTime: '24-48 Hours',
      description: '',
      requiredDocuments: 'Aadhaar Card, Passport Photo'
    });
    setShowServiceModal(true);
  };

  const openEditModal = (service) => {
    setIsEditing(true);
    setEditServiceId(service.id);
    setServiceForm({
      name: service.name,
      category: service.category,
      pricePaise: service.pricePaise || 19900,
      estimatedTime: service.estimatedTime || '24-48 Hours',
      description: service.description || '',
      requiredDocuments: service.requiredDocuments ? (Array.isArray(service.requiredDocuments) ? service.requiredDocuments.join(', ') : service.requiredDocuments) : ''
    });
    setShowServiceModal(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...serviceForm,
        pricePaise: Number(serviceForm.pricePaise),
        requiredDocuments: serviceForm.requiredDocuments ? serviceForm.requiredDocuments.split(',').map(s => s.trim()) : []
      };

      if (isEditing) {
        await adminApi.updateService(editServiceId, payload);
      } else {
        await adminApi.createService(payload);
      }
      setShowServiceModal(false);
      loadAll();
    } catch (err) {
      alert(err.message || 'Failed to save service');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await adminApi.toggleServiceStatus(id);
      loadAll();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service from the catalog?')) return;
    try {
      await adminApi.deleteService(id);
      loadAll();
    } catch (err) {
      alert(err.message || 'Failed to delete service');
    }
  };

  const handleApproveProposal = async (id) => {
    if (!window.confirm('Approve this worker proposal and add it to official services catalog?')) return;
    try {
      await adminApi.approveProposal(id);
      loadAll();
    } catch (err) {
      alert(err.message || 'Failed to approve proposal');
    }
  };

  const handleRejectProposal = async () => {
    if (!rejectProposalId) return;
    try {
      await adminApi.rejectProposal(rejectProposalId, rejectReason || 'Administrative rejection');
      setShowRejectModal(false);
      setRejectProposalId(null);
      setRejectReason('');
      loadAll();
    } catch (err) {
      alert(err.message || 'Failed to reject proposal');
    }
  };

  const categories = ['ALL', ...Array.from(new Set(servicesData.map(s => s.category).filter(Boolean)))];

  const filteredServices = servicesData.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const exportCSV = () => {
    const headers = ['Service ID', 'Name', 'Category', 'Price (Rs)', 'Estimated Time', 'Status'];
    const rows = filteredServices.map(s => [
      s.id,
      `"${s.name || ''}"`,
      `"${s.category || ''}"`,
      ((s.pricePaise || 0) / 100).toFixed(2),
      `"${s.estimatedTime || ''}"`,
      s.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `services_catalog_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Services & Proposals</h1>
          <p className="subtitle">Manage customer-facing service offerings, pricing, and approve worker proposals.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'CATALOG' && (
            <>
              <button className="btn btn-outline" onClick={exportCSV}><Download size={16} /> Export</button>
              <button className="btn btn-primary" onClick={openAddModal}><Plus size={16} /> Add New Service</button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('CATALOG')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'CATALOG' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'CATALOG' ? 'var(--brand-blue)' : 'var(--text-muted)',
            fontWeight: activeTab === 'CATALOG' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          Official Service Catalog ({servicesData.length})
        </button>
        <button
          onClick={() => setActiveTab('PROPOSALS')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'PROPOSALS' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'PROPOSALS' ? 'var(--brand-blue)' : 'var(--text-muted)',
            fontWeight: activeTab === 'PROPOSALS' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Worker Service Proposals ({proposalsData.filter(p => p.status === 'PENDING').length} Pending)
        </button>
      </div>

      {/* TAB 1: SERVICE CATALOG */}
      {activeTab === 'CATALOG' && (
        <div className="data-table-container">
          <div className="table-controls">
            <div className="search-box">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search services by name or category..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            <div className="actions">
              <select 
                className="status-filter"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading catalog...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service ID & Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Turnaround Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{service.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)' }}>{service.id.slice(0, 10)}</div>
                    </td>
                    <td>
                      <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {service.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ₹{((service.pricePaise || 0) / 100).toFixed(2)}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} /> {service.estimatedTime || '24-48 Hours'}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={service.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          title="Edit Service"
                          onClick={() => openEditModal(service)}
                        >
                          <Edit size={14} /> Edit
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', color: service.status === 'ACTIVE' ? '#ca8a04' : '#16a34a' }}
                          title="Toggle Status"
                          onClick={() => handleToggleStatus(service.id)}
                        >
                          <Power size={14} /> {service.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#dc2626' }}
                          title="Delete Service"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: WORKER PROPOSALS */}
      {activeTab === 'PROPOSALS' && (
        <div className="data-table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading proposals...</div>
          ) : proposalsData.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No worker service proposals submitted yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Proposed Service</th>
                  <th>Submitted By</th>
                  <th>Proposed Price</th>
                  <th>Turnaround</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposalsData.map(prop => (
                  <tr key={prop.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{prop.title || prop.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{prop.description}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{prop.worker?.name || 'Worker'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)' }}>{prop.worker?.workerId || prop.workerId}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ₹{((prop.pricePaise || 0) / 100).toFixed(2)}
                    </td>
                    <td>{prop.deliveryDays || prop.turnaroundTime || '2 Days'}</td>
                    <td>
                      <StatusBadge status={prop.status} />
                    </td>
                    <td>
                      {prop.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ background: '#16a34a', fontSize: '0.8rem', padding: '4px 10px' }}
                            onClick={() => handleApproveProposal(prop.id)}
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button 
                            className="btn btn-outline" 
                            style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.8rem', padding: '4px 10px' }}
                            onClick={() => { setRejectProposalId(prop.id); setShowRejectModal(true); }}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ADD / EDIT SERVICE MODAL */}
      {showServiceModal && (
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
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '520px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{isEditing ? 'Edit Service' : 'Add New Service'}</h3>
              <button onClick={() => setShowServiceModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveService}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Service Name *</label>
                <input required type="text" className="search-box" style={{ width: '100%' }} value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} placeholder="e.g. Income Certificate Application" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Category *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})} placeholder="Government forms" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Price in Paise (100 Paise = ₹1) *</label>
                  <input required type="number" className="search-box" style={{ width: '100%' }} value={serviceForm.pricePaise} onChange={e => setServiceForm({...serviceForm, pricePaise: e.target.value})} placeholder="19900" />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Estimated Turnaround Time *</label>
                <input required type="text" className="search-box" style={{ width: '100%' }} value={serviceForm.estimatedTime} onChange={e => setServiceForm({...serviceForm, estimatedTime: e.target.value})} placeholder="e.g. 24-48 Hours" />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Description</label>
                <textarea style={{ width: '100%', height: '70px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} placeholder="Brief service instructions and details..." />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Required Customer Documents (comma separated)</label>
                <input type="text" className="search-box" style={{ width: '100%' }} value={serviceForm.requiredDocuments} onChange={e => setServiceForm({...serviceForm, requiredDocuments: e.target.value})} placeholder="Aadhaar Card, Passport Photo, Ration Card" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowServiceModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Save Changes' : 'Create Service'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT PROPOSAL MODAL */}
      {showRejectModal && (
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
            <h3 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Reject Worker Proposal</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Please provide feedback or the reason for rejecting this service proposal.
            </p>
            <textarea 
              style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '14px' }}
              placeholder="Reason for rejection (e.g. Duplicate offering, incorrect pricing format)..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#dc2626' }} onClick={handleRejectProposal}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

