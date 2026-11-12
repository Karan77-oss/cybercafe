import { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';
import { ShieldCheck, XCircle, X, CheckCircle, Tag, Clock } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function ServiceProposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review & Edit Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
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

  // Reject Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadProposals = () => {
    setLoading(true);
    adminApi.getProposals()
      .then(res => {
        setProposals(res.proposals || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load proposals');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const openReviewModal = (prop) => {
    setEditingProposal(prop);
    const workerAmt = prop.requestedWorkerAmountPaise || prop.workerPayoutPaise || prop.workerAmountPaise || prop.suggestedPricePaise || 0;
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
    setShowReviewModal(true);
  };

  const handleApprove = async (e) => {
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
      setShowReviewModal(false);
      setEditingProposal(null);
      loadProposals();
      alert('Proposal approved and published to Service Catalog!');
    } catch (err) {
      alert(err.message || 'Failed to approve proposal');
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await adminApi.rejectProposal(rejectId, rejectReason || 'Administrative rejection');
      setShowRejectModal(false);
      setRejectId(null);
      setRejectReason('');
      loadProposals();
    } catch (err) {
      alert(err.message || 'Failed to reject proposal');
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading proposals...</div>;
  if (error) return <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>{error}</div>;

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Worker Service Proposals</h1>
          <p className="subtitle">Review worker proposals, customize the Admin markup, and approve offerings to the live catalog.</p>
        </div>
      </div>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID & Name</th>
              <th>Submitted By</th>
              <th>Worker Requested Base</th>
              <th>Turnaround</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map(p => {
              const isPending = p.status === 'PENDING' || p.status === 'PENDING_APPROVAL';
              const workerAmt = p.requestedWorkerAmountPaise || p.workerPayoutPaise || p.workerAmountPaise || p.suggestedPricePaise || 0;
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.title || p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)' }}>{p.id.slice(0,8)}</div>
                    {Array.isArray(p.applicationTypes) && p.applicationTypes.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {p.applicationTypes.map((t, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '4px', padding: '1px 6px' }}>
                            {t.title || t.name || t.id}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.worker?.name || 'Worker'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.worker?.email || p.workerId}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#16a34a' }}>
                      ₹{(workerAmt / 100).toFixed(2)}
                    </div>
                  </td>
                  <td>{p.deliveryDays || p.turnaroundTime || '24-48 Hours'}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    {isPending ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {/* No Quick Approve button: enforces Admin review and custom markup */}
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => openReviewModal(p)}
                        >
                          <ShieldCheck size={14}/> Review & Set Admin Fee
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.82rem', padding: '6px 10px' }}
                          onClick={() => { setRejectId(p.id); setShowRejectModal(true); }}
                        >
                          <XCircle size={14}/> Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Processed</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {proposals.length === 0 && <tr><td colSpan="6" style={{textAlign:'center', padding: '30px'}}>No worker proposals available</td></tr>}
          </tbody>
        </table>
      </div>

      {/* REVIEW & APPROVE MODAL */}
      {showReviewModal && editingProposal && (
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
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Review Worker Proposal</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Submitted by: <strong>{editingProposal.worker?.name || 'Worker'}</strong>
                </p>
              </div>
              <button onClick={() => { setShowReviewModal(false); setEditingProposal(null); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleApprove}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Service Name *</label>
                <input required type="text" className="search-box" style={{ width: '100%' }} value={proposalForm.name} onChange={e => setProposalForm({...proposalForm, name: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Category *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={proposalForm.category} onChange={e => setProposalForm({...proposalForm, category: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Turnaround SLA Time *</label>
                  <input required type="text" className="search-box" style={{ width: '100%' }} value={proposalForm.estimatedTime} onChange={e => setProposalForm({...proposalForm, estimatedTime: e.target.value})} />
                </div>
              </div>

              {/* Pricing breakdown */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="#16a34a" /> Customer Price = Worker Base Rate + Custom Admin Markup (No 80/20 split)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#16a34a' }}>Worker Base (₹) *</label>
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
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--brand-blue)' }}>Admin Markup (₹) *</label>
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
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: '#1e293b' }}>Customer Price (₹)</label>
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

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Description</label>
                <textarea style={{ width: '100%', height: '65px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={proposalForm.description} onChange={e => setProposalForm({...proposalForm, description: e.target.value})} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Required Documents</label>
                <input type="text" className="search-box" style={{ width: '100%' }} value={proposalForm.requiredDocuments} onChange={e => setProposalForm({...proposalForm, requiredDocuments: e.target.value})} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowReviewModal(false); setEditingProposal(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }}>
                  <CheckCircle size={14} /> Approve & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
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
            <textarea 
              style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '14px' }}
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#dc2626' }} onClick={handleReject}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
