import { useState, useEffect } from 'react';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  FileText, 
  IndianRupee, 
  Send,
  AlertCircle,
  Tag,
  X,
  ShieldCheck
} from 'lucide-react';
import { workerApi } from '../../api/worker';

export default function ProposeService() {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Government forms');
  const [price, setPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('24 Hours');
  const [requiredDocuments, setRequiredDocuments] = useState('');
  const [applicationTypes, setApplicationTypes] = useState([
    { id: 'fresh', title: 'Fresh Application', badge: 'Standard' },
    { id: 'correction', title: 'Correction / Update', badge: 'Popular' }
  ]);
  const [newTypeTitle, setNewTypeTitle] = useState('');
  const [newTypeBadge, setNewTypeBadge] = useState('');
  const [isAddingType, setIsAddingType] = useState(false);

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingProposals, setFetchingProposals] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadProposals = async () => {
    try {
      const res = await workerApi.getProposals();
      if (res?.proposals) {
        setProposals(res.proposals);
      }
      setFetchingProposals(false);
    } catch {
      setFetchingProposals(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const handleAddType = () => {
    if (!newTypeTitle.trim()) return;
    const item = {
      id: newTypeTitle.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      title: newTypeTitle.trim(),
      badge: newTypeBadge.trim() || undefined
    };
    setApplicationTypes(prev => [...prev, item]);
    setNewTypeTitle('');
    setNewTypeBadge('');
    setIsAddingType(false);
  };

  const handleRemoveType = (index) => {
    setApplicationTypes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const paise = Math.round(parseFloat(price) * 100);
      const docsArray = requiredDocuments
        ? requiredDocuments.split(',').map(d => d.trim()).filter(Boolean)
        : [];

      const res = await workerApi.proposeService({
        name: name.trim(),
        description: desc.trim(),
        category,
        requestedWorkerAmountPaise: paise,
        suggestedPricePaise: paise,
        estimatedTime,
        requiredDocuments: docsArray,
        applicationTypes: applicationTypes
      });

      if (res?.success) {
        setSuccessMsg('Service proposal submitted successfully! Admin will review your base rate, set custom platform markup, and publish it to the catalog.');
        setName('');
        setDesc('');
        setPrice('');
        setRequiredDocuments('');
        setApplicationTypes([
          { id: 'fresh', title: 'Fresh Application', badge: 'Standard' },
          { id: 'correction', title: 'Correction / Update', badge: 'Popular' }
        ]);
        loadProposals();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit service proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
          Propose New Catalog Service
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Suggest new online documentation services. Set your guaranteed base payout rate, dynamic application types, and required document checklist.
        </p>
      </div>

      {successMsg && (
        <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.9rem' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Proposal Submission Form */}
        <div className="form-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b' }}>
            Submit Service Proposal
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Service Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. State Land Registry (Bhulekh) Record Extraction"
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Category <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', background: 'white' }}
                >
                  <option value="Government forms">Government forms</option>
                  <option value="Certificate applications">Certificate applications</option>
                  <option value="PAN-related services">PAN-related services</option>
                  <option value="Passport-related application assistance">Passport assistance</option>
                  <option value="Scholarship forms">Scholarship forms</option>
                  <option value="Online payment/recharge">Online payment / recharge</option>
                  <option value="State Portal Services">State Portal Services</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Your Proposed Payout (₹) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="e.g. 150"
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                />
                <span style={{ display: 'block', fontSize: '0.74rem', color: '#16a34a', marginTop: '4px', fontWeight: 500 }}>
                  Guaranteed base payout you receive per order (Zero 80/20 deductions).
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Estimated SLA Completion Time
              </label>
              <select
                value={estimatedTime}
                onChange={e => setEstimatedTime(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', background: 'white' }}
              >
                <option value="30 Minutes">30 Minutes (Instant online bill / recharge)</option>
                <option value="2-4 Hours">2-4 Hours (Express filing)</option>
                <option value="24 Hours">24 Hours (Standard 1 Day)</option>
                <option value="2-3 Working Days">2-3 Working Days</option>
                <option value="5 Working Days">5 Working Days (Complex revenue department)</option>
              </select>
            </div>

            {/* Dynamic Application Types Builder */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={14} /> Application Types (e.g. Fresh, Correction, Renewal)
                </label>
                {!isAddingType && (
                  <button 
                    type="button" 
                    onClick={() => setIsAddingType(true)} 
                    style={{ background: 'none', border: 'none', color: 'var(--brand-blue, #2563eb)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Plus size={12} /> Add Type
                  </button>
                )}
              </div>

              {isAddingType && (
                <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid #cbd5e1' }}>
                  <input 
                    type="text" 
                    placeholder="Type name (e.g. Tatkaal, Renewal)" 
                    value={newTypeTitle} 
                    onChange={e => setNewTypeTitle(e.target.value)}
                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Badge (Optional)" 
                    value={newTypeBadge} 
                    onChange={e => setNewTypeBadge(e.target.value)}
                    style={{ width: '100px', padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <button type="button" onClick={handleAddType} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Add</button>
                  <button type="button" onClick={() => setIsAddingType(false)} style={{ background: 'none', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {applicationTypes.map((type, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 600, color: '#0369a1' }}>{type.title}</span>
                    {type.badge && <span style={{ fontSize: '0.68rem', background: '#bae6fd', color: '#0284c7', padding: '1px 4px', borderRadius: '3px' }}>{type.badge}</span>}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveType(idx)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0369a1', padding: '0 2px' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Required Customer Documents (comma separated)
              </label>
              <input
                type="text"
                value={requiredDocuments}
                onChange={e => setRequiredDocuments(e.target.value)}
                placeholder="e.g. Aadhaar Card, Passport Photo, Marksheet"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Detailed Scope & Process Description
              </label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Describe what documents customer needs to provide, what portal is accessed, and final deliverable output..."
                rows={3}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '12px', fontWeight: 700, fontSize: '0.95rem' }}
            >
              {loading ? 'Submitting...' : 'Submit Service Proposal'}
            </button>
          </form>
        </div>

        {/* Existing Proposals List */}
        <div className="form-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b' }}>
            Your Proposed Services ({proposals.length})
          </h3>

          {fetchingProposals ? (
            <div style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Loading proposals...</div>
          ) : proposals.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
              You haven't proposed any custom services yet. When approved by admin, they are added to the official catalog with your provider attribution.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {proposals.map(p => (
                <div
                  key={p.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    background: '#f8fafc'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                      {p.name || p.title}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      background: p.status === 'APPROVED' ? '#ecfdf5' : p.status === 'REJECTED' ? '#fef2f2' : '#fefce8',
                      color: p.status === 'APPROVED' ? '#065f46' : p.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                    }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '4px' }}>
                    Category: {p.category} • Proposed Base: ₹{((p.requestedWorkerAmountPaise || p.suggestedPricePaise || 0) / 100).toFixed(2)}
                  </div>
                  {Array.isArray(p.applicationTypes) && p.applicationTypes.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                      {p.applicationTypes.map((t, idx) => (
                        <span key={idx} style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px' }}>
                          {t.title || t.name || t.id}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                    {p.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
