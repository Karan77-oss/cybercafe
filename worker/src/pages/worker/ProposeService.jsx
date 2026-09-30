import { useState, useEffect } from 'react';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  FileText, 
  IndianRupee, 
  Send,
  AlertCircle
} from 'lucide-react';
import { workerApi } from '../../api/worker';

export default function ProposeService() {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Government forms');
  const [price, setPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('24 Hours');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await workerApi.proposeService({
        name: name.trim(),
        description: desc.trim(),
        category,
        suggestedPricePaise: Math.round(parseFloat(price) * 100),
        estimatedTime
      });

      if (res?.success) {
        setSuccessMsg('Service proposal submitted successfully! Admin review usually takes 24-48 hours.');
        setName('');
        setDesc('');
        setPrice('');
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
          Section 20: Suggest custom local documentation services to expand your cyber cafe's customer reach.
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* Proposal Submission Form */}
        <div className="form-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b' }}>
            Submit Proposal
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
                  Suggested Price (₹) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="e.g. 199"
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                />
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

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Detailed Scope & Process Description
              </label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Describe what documents customer needs to bring, what portal is accessed, and final deliverable output..."
                rows={4}
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
                      {p.name}
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
                    Category: {p.category} • Suggested Price: ₹{((p.suggestedPricePaise || 0) / 100).toFixed(2)}
                  </div>
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
