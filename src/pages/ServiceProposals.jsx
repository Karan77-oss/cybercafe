import { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';
import { Check, X } from 'lucide-react';

export default function ServiceProposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProposals = () => {
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

  const handleApprove = (id) => {
    adminApi.approveProposal(id).then(() => loadProposals()).catch(err => alert(err.message));
  };
  
  const handleReject = (id) => {
    adminApi.rejectProposal(id).then(() => loadProposals()).catch(err => alert(err.message));
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading proposals...</div>;
  if (error) return <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>{error}</div>;

  return (
    <div className="view-content">
      <div className="view-header">
        <h1>Service Proposals</h1>
      </div>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Worker</th>
              <th>Suggested Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map(p => (
              <tr key={p.id}>
                <td>{p.id.slice(0,8)}</td>
                <td>{p.name}</td>
                <td>{p.worker?.name || 'Unknown'}</td>
                <td>Rs. {((p.suggestedPricePaise || 0) / 100).toFixed(2)}</td>
                <td>{p.status}</td>
                <td>
                  {p.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={() => handleApprove(p.id)}><Check size={16}/></button>
                      <button className="btn btn-outline" onClick={() => handleReject(p.id)}><X size={16}/></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {proposals.length === 0 && <tr><td colSpan="6" style={{textAlign:'center', padding: '20px'}}>No proposals</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
