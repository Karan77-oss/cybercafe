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
  UserCheck,
  Tag,
  ShieldCheck,
  ListPlus
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
    workerAmountPaise: 14000,
    adminCommissionPaise: 5900,
    platformFeePaise: 0,
    pricePaise: 19900,
    estimatedTime: '24-48 Hours',
    description: '',
    requiredDocuments: 'Aadhaar Card, Passport Photo',
    applicationTypes: []
  });

  // Edit & Review Proposal Modal (No Quick Approve bypass)
  const [showEditProposalModal, setShowEditProposalModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [proposalForm, setProposalForm] = useState({
    name: '',
    category: 'Government forms',
    workerAmountPaise: 14000,
    adminCommissionPaise: 5000,
    platformFeePaise: 0,
    pricePaise: 19000,
    estimatedTime: '24-48 Hours',
    description: '',
    requiredDocuments: 'Aadhaar Card, Passport Photo',
    applicationTypes: []
  });

  // Temp state for adding a dynamic application type in modals
  const [newTypeTitle, setNewTypeTitle] = useState('');
  const [newTypeBadge, setNewTypeBadge] = useState('');
  const [newTypeSla, setNewTypeSla] = useState('');
  const [isAddingType, setIsAddingType] = useState(false);

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
      workerAmountPaise: 14000,
      adminCommissionPaise: 5900,
      platformFeePaise: 0,
      pricePaise: 19900,
      estimatedTime: '24-48 Hours',
      description: '',
      requiredDocuments: 'Aadhaar Card, Passport Photo',
      applicationTypes: [
        { id: 'new_application', title: 'New Application', badge: 'Standard', estimatedTime: '24-48 Hours' },
        { id: 'correction_update', title: 'Update / Correction', badge: 'Popular', estimatedTime: '24-48 Hours' }
      ]
    });
    setIsAddingType(false);
    setShowServiceModal(true);
  };

  const openEditModal = (service) => {
    setIsEditing(true);
    setEditServiceId(service.id);
    const workerAmt = service.workerAmountPaise ?? (service.pricePaise ? Math.max(0, service.pricePaise - (service.adminCommissionPaise || service.platformFeePaise || 0)) : 14000);
    const adminComm = service.adminCommissionPaise ?? service.platformFeePaise ?? Math.max(0, (service.pricePaise || 19900) - workerAmt);
    
    // Normalize existing applicationTypes
    let appTypes = [];
    if (Array.isArray(service.applicationTypes) && service.applicationTypes.length > 0) {
      appTypes = service.applicationTypes;
    } else if (service.subCategories && Array.isArray(service.subCategories)) {
      appTypes = service.subCategories.map((sc, idx) => typeof sc === 'string' ? { id: `type_${idx}`, title: sc } : sc);
    }

    setServiceForm({
      name: service.name || '',
      category: service.category || 'Government forms',
      workerAmountPaise: workerAmt,
      adminCommissionPaise: adminComm,
      platformFeePaise: 0, // Strict zero hidden fees
      pricePaise: workerAmt + adminComm,
      estimatedTime: service.estimatedTime || '24-48 Hours',
      description: service.description || '',
      requiredDocuments: service.requiredDocuments ? (Array.isArray(service.requiredDocuments) ? service.requiredDocuments.join(', ') : service.requiredDocuments) : '',
      applicationTypes: appTypes
    });
    setIsAddingType(false);
    setShowServiceModal(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      const requiredDocsArray = serviceForm.requiredDocuments
        ? (Array.isArray(serviceForm.requiredDocuments)
            ? serviceForm.requiredDocuments
            : serviceForm.requiredDocuments.split(',').map(s => s.trim()).filter(Boolean))
        : [];

      const workerPaise = Number(serviceForm.workerAmountPaise) || 0;
      const adminPaise = Number(serviceForm.adminCommissionPaise) || 0;
      const totalPaise = workerPaise + adminPaise;

      const payload = {
        name: serviceForm.name,
        category: serviceForm.category,
        description: serviceForm.description,
        workerAmountPaise: workerPaise,
        adminCommissionPaise: adminPaise,
        platformFeePaise: 0,
        pricePaise: totalPaise,
        estimatedTime: serviceForm.estimatedTime,
        requiredDocuments: requiredDocsArray,
        applicationTypes: serviceForm.applicationTypes || []
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

  // Review & Edit Worker Proposal Modal
  const openEditProposalModal = (prop) => {
    setEditingProposal(prop);
    const workerAmt = prop.requestedWorkerAmountPaise || prop.workerPayoutPaise || prop.workerAmountPaise || prop.suggestedPricePaise || 0;
    // Default admin markup if unset: e.g. 5000 paise (₹50) or existing adminCommissionPaise
    const adminComm = prop.adminCommissionPaise || prop.platformFeePaise || 5000;
    const propPrice = workerAmt + adminComm;

    let appTypes = [];
    if (Array.isArray(prop.applicationTypes) && prop.applicationTypes.length > 0) {
      appTypes = prop.applicationTypes;
    } else {
      appTypes = [
        { id: 'standard', title: 'Standard Processing', badge: 'Default', estimatedTime: prop.deliveryDays || '24-48 Hours' }
      ];
    }

    setProposalForm({
      name: prop.title || prop.name || '',
      category: prop.category || 'Government forms',
      workerAmountPaise: workerAmt,
      adminCommissionPaise: adminComm,
      platformFeePaise: 0,
      pricePaise: propPrice,
      estimatedTime: prop.deliveryDays || prop.turnaroundTime || prop.estimatedTime || '24-48 Hours',
      description: prop.description || '',
      requiredDocuments: prop.requiredDocuments ? (Array.isArray(prop.requiredDocuments) ? prop.requiredDocuments.join(', ') : prop.requiredDocuments) : 'Aadhaar Card, Passport Photo',
      applicationTypes: appTypes
    });
    setIsAddingType(false);
    setShowEditProposalModal(true);
  };

  const handleApproveModifiedProposal = async (e) => {
    e.preventDefault();
    if (!editingProposal) return;
    try {
      const requiredDocsArray = proposalForm.requiredDocuments
        ? (Array.isArray(proposalForm.requiredDocuments)
            ? proposalForm.requiredDocuments
            : proposalForm.requiredDocuments.split(',').map(s => s.trim()).filter(Boolean))
        : [];

      const workerPaise = Number(proposalForm.workerAmountPaise) || 0;
      const adminPaise = Number(proposalForm.adminCommissionPaise) || 0;
      const totalPaise = workerPaise + adminPaise;

      const payload = {
        name: proposalForm.name,
        category: proposalForm.category,
        description: proposalForm.description,
        workerAmountPaise: workerPaise,
        adminCommissionPaise: adminPaise,
        platformFeePaise: 0,
        pricePaise: totalPaise,
        estimatedTime: proposalForm.estimatedTime,
        requiredDocuments: requiredDocsArray,
        applicationTypes: proposalForm.applicationTypes || []
      };

      await adminApi.approveProposal(editingProposal.id, payload);
      setShowEditProposalModal(false);
      setEditingProposal(null);
      loadAll();
      alert('Proposal approved and successfully published to official Service Catalog!');
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

  // Helper for adding dynamic application types in forms
  const addApplicationType = (isProposal = false) => {
    if (!newTypeTitle.trim()) return;
    const item = {
      id: newTypeTitle.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      title: newTypeTitle.trim(),
      badge: newTypeBadge.trim() || undefined,
      estimatedTime: newTypeSla.trim() || undefined
    };

    if (isProposal) {
      setProposalForm(prev => ({
        ...prev,
        applicationTypes: [...(prev.applicationTypes || []), item]
      }));
    } else {
      setServiceForm(prev => ({
        ...prev,
        applicationTypes: [...(prev.applicationTypes || []), item]
      }));
    }
    setNewTypeTitle('');
    setNewTypeBadge('');
    setNewTypeSla('');
    setIsAddingType(false);
  };

  const removeApplicationType = (index, isProposal = false) => {
    if (isProposal) {
      setProposalForm(prev => ({
        ...prev,
        applicationTypes: prev.applicationTypes.filter((_, i) => i !== index)
      }));
    } else {
      setServiceForm(prev => ({
        ...prev,
        applicationTypes: prev.applicationTypes.filter((_, i) => i !== index)
      }));
    }
  };

  const categories = ['ALL', ...Array.from(new Set(servicesData.map(s => s.category).filter(Boolean)))];

  const filteredServices = servicesData.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const pendingProposalsCount = proposalsData.filter(p => p.status === 'PENDING' || p.status === 'PENDING_APPROVAL').length;

  const exportCSV = () => {
    const headers = ['Service ID', 'Name', 'Category', 'Customer Price (Rs)', 'Worker Base (Rs)', 'Admin Fee (Rs)', 'Estimated Time', 'Status'];
    const rows = filteredServices.map(s => [
      s.id,
      `"${s.name || ''}"`,
      `"${s.category || ''}"`,
      ((s.pricePaise || 0) / 100).toFixed(2),
      ((s.workerAmountPaise || 0) / 100).toFixed(2),
      ((s.adminCommissionPaise || 0) / 100).toFixed(2),
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
          <p className="subtitle">Manage dynamic application types, custom proposal markups, and catalog offerings.</p>
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
          Worker Service Proposals ({pendingProposalsCount} Pending)
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
                  <th>Service & Application Types</th>
                  <th>Category</th>
                  <th>Customer Price Breakdown</th>
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)', marginBottom: '4px' }}>{service.id.slice(0, 10)}</div>
                      {/* Dynamic Application Types preview */}
                      {Array.isArray(service.applicationTypes) && service.applicationTypes.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                          {service.applicationTypes.map((t, idx) => (
                            <span key={idx} style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px' }}>
                              {t.title || t.name || t.id}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {service.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--brand-blue)' }}>
                        ₹{((service.pricePaise || 0) / 100).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Worker: ₹{((service.workerAmountPaise || 0) / 100).toFixed(2)} + Admin: ₹{((service.adminCommissionPaise || 0) / 100).toFixed(2)}
                      </div>
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
                  <th>Proposed Service & Types</th>
                  <th>Submitted By</th>
                  <th>Worker Base Request</th>
                  <th>Turnaround</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposalsData.map(prop => {
                  const isPending = prop.status === 'PENDING' || prop.status === 'PENDING_APPROVAL';
                  const workerAmt = prop.requestedWorkerAmountPaise || prop.workerPayoutPaise || prop.workerAmountPaise || prop.suggestedPricePaise || 0;
                  return (
                    <tr key={prop.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{prop.title || prop.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{prop.description}</div>
                        {Array.isArray(prop.applicationTypes) && prop.applicationTypes.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {prop.applicationTypes.map((t, idx) => (
                              <span key={idx} style={{ fontSize: '0.7rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '4px', padding: '1px 6px' }}>
                                {t.title || t.name || t.id}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{prop.worker?.name || 'Worker'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)' }}>{prop.worker?.workerId || prop.workerId}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#16a34a' }}>
                          ₹{(workerAmt / 100).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Base Rate Proposed
                        </div>
                      </td>
                      <td>{prop.deliveryDays || prop.turnaroundTime || '2 Days'}</td>
                      <td>
                        <StatusBadge status={prop.status} />
                      </td>
                      <td>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {/* NOTE: Quick Approve is completely removed per spec. Every approval must review base rate and set Admin markup explicitly */}
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                              onClick={() => openEditProposalModal(prop)}
                              title="Review base rate, set custom Admin markup & publish"
                            >
                              <ShieldCheck size={14} /> Review & Set Admin Fee
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.82rem', padding: '6px 10px' }}
                              onClick={() => { setRejectProposalId(prop.id); setShowRejectModal(true); }}
                              title="Reject Proposal"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '620px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Estimated SLA Time *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={serviceForm.estimatedTime} onChange={e => setServiceForm({...serviceForm, estimatedTime: e.target.value})} placeholder="e.g. 24-48 Hours" />
                </div>
              </div>

              {/* Explicit Pricing Formula: Total Price = Worker Base + Admin Custom Markup (Zero Hidden Platform Fees) */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="var(--brand-blue)" /> Strict Pricing: Price = Worker Base + Admin Custom Fee (Zero 80/20 split)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#16a34a' }}>Worker Payout (₹) *</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0"
                      className="search-box" 
                      style={{ width: '100%' }} 
                      value={(serviceForm.workerAmountPaise / 100).toFixed(2)} 
                      onChange={e => {
                        const workerPaise = Math.round(Number(e.target.value || 0) * 100);
                        const total = workerPaise + Number(serviceForm.adminCommissionPaise || 0);
                        setServiceForm({...serviceForm, workerAmountPaise: workerPaise, pricePaise: total});
                      }} 
                      placeholder="140.00" 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--brand-blue)' }}>Admin Fee (₹) *</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0"
                      className="search-box" 
                      style={{ width: '100%' }} 
                      value={(serviceForm.adminCommissionPaise / 100).toFixed(2)} 
                      onChange={e => {
                        const feePaise = Math.round(Number(e.target.value || 0) * 100);
                        const total = Number(serviceForm.workerAmountPaise || 0) + feePaise;
                        setServiceForm({...serviceForm, adminCommissionPaise: feePaise, pricePaise: total});
                      }} 
                      placeholder="59.00" 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#1e293b' }}>Customer Price (₹)</label>
                    <input 
                      disabled
                      type="number" 
                      step="0.01" 
                      className="search-box" 
                      style={{ width: '100%', fontWeight: 700, color: 'var(--brand-blue)', background: '#e2e8f0', cursor: 'not-allowed' }} 
                      value={((serviceForm.workerAmountPaise + serviceForm.adminCommissionPaise) / 100).toFixed(2)} 
                      placeholder="199.00" 
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Application Types Builder */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '14px', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={14} /> Universal Application Types
                  </label>
                  {!isAddingType && (
                    <button 
                      type="button" 
                      onClick={() => setIsAddingType(true)} 
                      className="btn btn-outline" 
                      style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={12} /> Add Type
                    </button>
                  )}
                </div>

                {isAddingType && (
                  <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      placeholder="Type title (e.g. Renewal, Fresh, Tatkaal)" 
                      value={newTypeTitle} 
                      onChange={e => setNewTypeTitle(e.target.value)}
                      style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Badge (Optional, e.g. Urgent)" 
                      value={newTypeBadge} 
                      onChange={e => setNewTypeBadge(e.target.value)}
                      style={{ width: '120px', padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <button type="button" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => addApplicationType(false)}>Save</button>
                    <button type="button" className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setIsAddingType(false)}>Cancel</button>
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(serviceForm.applicationTypes || []).map((type, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 500 }}>{type.title || type.name || type.id}</span>
                      {type.badge && <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '1px 4px', borderRadius: '3px' }}>{type.badge}</span>}
                      <button 
                        type="button" 
                        onClick={() => removeApplicationType(idx, false)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 2px' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {(!serviceForm.applicationTypes || serviceForm.applicationTypes.length === 0) && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No application types defined yet. Click Add Type above.</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Description</label>
                <textarea style={{ width: '100%', height: '65px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} placeholder="Brief service instructions and details..." />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Required Customer Documents (comma separated checklist)</label>
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

      {/* EDIT & REVIEW PROPOSAL MODAL (No quick approve bypass) */}
      {showEditProposalModal && editingProposal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1250,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '640px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Review Proposal & Set Custom Markup</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Submitted by: <strong>{editingProposal.worker?.name || 'Worker'}</strong> ({editingProposal.worker?.workerId || editingProposal.workerId})
                </p>
              </div>
              <button onClick={() => { setShowEditProposalModal(false); setEditingProposal(null); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleApproveModifiedProposal}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Official Service Name *</label>
                <input required type="text" className="search-box" style={{ width: '100%' }} value={proposalForm.name} onChange={e => setProposalForm({...proposalForm, name: e.target.value})} placeholder="Official service title" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Category *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={proposalForm.category} onChange={e => setProposalForm({...proposalForm, category: e.target.value})} placeholder="Government forms" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Turnaround SLA Time *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={proposalForm.estimatedTime} onChange={e => setProposalForm({...proposalForm, estimatedTime: e.target.value})} placeholder="24-48 Hours" />
                </div>
              </div>

              {/* Strict Proposal Pricing Formula */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="#16a34a" /> 100% Transparent Pricing: Customer Pays = Worker Base Rate + Custom Admin Markup
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#16a34a' }}>Worker Base Payout (₹) *</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0"
                      className="search-box" 
                      style={{ width: '100%' }} 
                      value={(proposalForm.workerAmountPaise / 100).toFixed(2)} 
                      onChange={e => {
                        const workerPaise = Math.round(Number(e.target.value || 0) * 100);
                        const total = workerPaise + Number(proposalForm.adminCommissionPaise || 0);
                        setProposalForm({...proposalForm, workerAmountPaise: workerPaise, pricePaise: total});
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--brand-blue)' }}>Custom Admin Fee (₹) *</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0"
                      className="search-box" 
                      style={{ width: '100%' }} 
                      value={(proposalForm.adminCommissionPaise / 100).toFixed(2)} 
                      onChange={e => {
                        const feePaise = Math.round(Number(e.target.value || 0) * 100);
                        const total = Number(proposalForm.workerAmountPaise || 0) + feePaise;
                        setProposalForm({...proposalForm, adminCommissionPaise: feePaise, pricePaise: total});
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#1e293b' }}>Total Customer Price (₹)</label>
                    <input 
                      disabled
                      type="number" 
                      step="0.01" 
                      className="search-box" 
                      style={{ width: '100%', fontWeight: 700, color: 'var(--brand-blue)', background: '#e2e8f0', cursor: 'not-allowed' }} 
                      value={((proposalForm.workerAmountPaise + proposalForm.adminCommissionPaise) / 100).toFixed(2)} 
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Application Types for Proposal */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '14px', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={14} /> Application Types Included in this Service
                  </label>
                  {!isAddingType && (
                    <button 
                      type="button" 
                      onClick={() => setIsAddingType(true)} 
                      className="btn btn-outline" 
                      style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={12} /> Add Type
                    </button>
                  )}
                </div>

                {isAddingType && (
                  <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      placeholder="Type title (e.g. Fresh, Correction, Tatkaal)" 
                      value={newTypeTitle} 
                      onChange={e => setNewTypeTitle(e.target.value)}
                      style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input 
                      type="text" 
                      placeholder="Badge (Optional)" 
                      value={newTypeBadge} 
                      onChange={e => setNewTypeBadge(e.target.value)}
                      style={{ width: '120px', padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <button type="button" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => addApplicationType(true)}>Save</button>
                    <button type="button" className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setIsAddingType(false)}>Cancel</button>
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(proposalForm.applicationTypes || []).map((type, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 500 }}>{type.title || type.name || type.id}</span>
                      {type.badge && <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '1px 4px', borderRadius: '3px' }}>{type.badge}</span>}
                      <button 
                        type="button" 
                        onClick={() => removeApplicationType(idx, true)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 2px' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Description</label>
                <textarea style={{ width: '100%', height: '65px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={proposalForm.description} onChange={e => setProposalForm({...proposalForm, description: e.target.value})} placeholder="Detailed instructions for applicants..." />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Required Customer Documents (comma separated checklist)</label>
                <input type="text" className="search-box" style={{ width: '100%' }} value={proposalForm.requiredDocuments} onChange={e => setProposalForm({...proposalForm, requiredDocuments: e.target.value})} placeholder="e.g. Aadhaar Card, Passport Photo, Land Record Copy" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowEditProposalModal(false); setEditingProposal(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }}>
                  <CheckCircle size={14} /> Approve & Publish to Catalog
                </button>
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
              placeholder="Reason for rejection (e.g. Duplicate offering, incomplete document checklist)..."
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
