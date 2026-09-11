import React, { useState, useEffect } from 'react';
import { Banknote, Banknote as MoneyBill, Hourglass, Loader, Search, Download } from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { adminApi } from '../api/admin';

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getPayouts()
      .then(res => {
        setPayouts(res.payouts || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load payouts');
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading payouts...</div>;
  if (error) return <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>{error}</div>;

  const totalPaise = payouts.reduce((sum, p) => sum + p.amountPaise, 0);
  const paidPaise = payouts.filter(p => p.status === 'RELEASED').reduce((sum, p) => sum + p.amountPaise, 0);
  const pendingPaise = payouts.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amountPaise, 0);
  const processingPaise = payouts.filter(p => p.status === 'PROCESSING').reduce((sum, p) => sum + p.amountPaise, 0);

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Payouts</h1>
          <p className="subtitle">Manage payouts to workers.</p>
        </div>
      </div>
      
      <div className="stats-grid compact">
        <StatCard title="Total Payouts" value={`Rs. ${(totalPaise / 100).toFixed(2)}`} icon={Banknote} color="purple" />
        <StatCard title="Paid" value={`Rs. ${(paidPaise / 100).toFixed(2)}`} icon={MoneyBill} color="green" />
        <StatCard title="Pending" value={`Rs. ${(pendingPaise / 100).toFixed(2)}`} icon={Hourglass} color="orange" />
        <StatCard title="Processing" value={`Rs. ${(processingPaise / 100).toFixed(2)}`} icon={Loader} color="red" />
      </div>

      <div className="data-table-container">
        <div className="table-controls">
          <div className="search-box">
            <Search size={18} />
            <input type="text" placeholder="Search by worker..." disabled />
          </div>
          <div className="actions">
            <select className="status-filter" disabled><option>All Status</option></select>
            <button className="btn btn-outline" disabled><Download size={16}/> Export</button>
          </div>
        </div>
        
        <table className="data-table">
          <thead>
            <tr>
              <th>Payout ID</th>
              <th>Worker</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Requested On</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td>{p.id.slice(0,8)}</td>
                <td>{p.worker?.name || 'Worker'}</td>
                <td>Rs. {(p.amountPaise / 100).toFixed(2)}</td>
                <td><StatusBadge status={p.status} /></td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {payouts.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding: '20px'}}>No payouts recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}