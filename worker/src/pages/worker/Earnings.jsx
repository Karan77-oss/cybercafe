import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  IndianRupee, 
  TrendingUp, 
  Clock, 
  Wallet, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { workerApi } from '../../api/worker';

export default function Earnings() {
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEarnings = async () => {
    try {
      const res = await workerApi.getEarnings();
      if (res?.earnings) {
        setEarningsData(res.earnings);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load earnings ledger');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading earnings and financial records...
      </div>
    );
  }

  if (error || !earningsData) {
    return (
      <div style={{ padding: '32px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', textAlign: 'center' }}>
        <AlertCircle size={24} style={{ marginBottom: 8 }} />
        <div>{error || 'Unable to load earnings data'}</div>
        <button onClick={loadEarnings} className="btn btn-outline" style={{ marginTop: 12 }}>Retry</button>
      </div>
    );
  }

  const walletPaise = earningsData.walletBalancePaise || 0;
  const todayPaise = earningsData.todayEarningsPaise || 0;
  const pendingPaise = earningsData.pendingEarningsPaise || 0;
  const onHoldPaise = earningsData.onHoldEarningsPaise || 0;
  const totalPaise = earningsData.totalEarningsPaise || 0;
  const transactions = earningsData.transactions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
            Earnings & Financial Ledger
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Section 17: Transparent payout records, daily summaries, and earnings breakdown.
          </p>
        </div>

        <Link to="/worker/withdrawals" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wallet size={18} />
          Go to Withdrawals
        </Link>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Available Wallet Balance</span>
            <Wallet size={20} color="#0284c7" />
          </div>
          <div className="stat-card-value" style={{ color: '#0284c7' }}>
            ₹{(walletPaise / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
            Ready for instant withdrawal
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Today's Earnings</span>
            <TrendingUp size={20} color="#059669" />
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            ₹{(todayPaise / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
            From {earningsData.todayCompletedJobs || 0} completed orders today
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Pending Earnings</span>
            <Clock size={20} color="#8b5cf6" />
          </div>
          <div className="stat-card-value" style={{ color: '#8b5cf6' }}>
            ₹{(pendingPaise / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
            In active queue / uncompleted
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">On-Hold Earnings</span>
            <ShieldAlert size={20} color="#ef4444" />
          </div>
          <div className="stat-card-value" style={{ color: onHoldPaise > 0 ? '#ef4444' : '#64748b' }}>
            ₹{(onHoldPaise / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
            Held during complaint / review
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Lifetime Earnings</span>
            <IndianRupee size={20} color="#10b981" />
          </div>
          <div className="stat-card-value" style={{ color: '#1e293b' }}>
            ₹{(totalPaise / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
            Across {earningsData.completedJobs || 0} lifetime jobs
          </div>
        </div>
      </div>

      {/* Commission Structure Explanation */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', color: '#1e293b' }}>
            Transparent 80/20 Payout Structure
          </h4>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
            You receive ~80% of the customer order price as direct worker earnings. Platform fee (20%) covers payment gateway charges, escrow protection, and customer acquisition.
          </p>
        </div>
        <Link to="/worker/help" style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
          Read Fee Policy &rarr;
        </Link>
      </div>

      {/* Transaction History Ledger */}
      <div className="form-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b' }}>
          Transaction & Settlement Ledger
        </h3>

        {transactions.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
            No financial transactions recorded yet. Completed orders and payouts will appear here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.82rem' }}>
                  <th style={{ padding: '12px 0' }}>DATE & TIME</th>
                  <th style={{ padding: '12px 0' }}>TRANSACTION / ORDER</th>
                  <th style={{ padding: '12px 0' }}>TYPE</th>
                  <th style={{ padding: '12px 0' }}>STATUS</th>
                  <th style={{ padding: '12px 0', textAlign: 'right' }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isCredit = tx.type === 'CREDIT';
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                      <td style={{ padding: '14px 0', color: '#64748b', fontSize: '0.83rem' }}>
                        {tx.date ? new Date(tx.date).toLocaleString() : 'Recent'}
                      </td>
                      <td style={{ padding: '14px 0', color: '#1e293b', fontWeight: 600 }}>
                        {tx.serviceName}
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'normal' }}>
                          Ref #{tx.orderId}
                        </div>
                      </td>
                      <td style={{ padding: '14px 0' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: isCredit ? '#ecfdf5' : '#fef2f2',
                          color: isCredit ? '#065f46' : '#991b1b'
                        }}>
                          {isCredit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 0' }}>
                        <span style={{
                          fontSize: '0.78rem',
                          color: tx.status === 'SETTLED' || tx.status === 'COMPLETED' ? '#166534' : '#854d0e',
                          background: tx.status === 'SETTLED' || tx.status === 'COMPLETED' ? '#f0fdf4' : '#fefce8',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 0', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: isCredit ? '#059669' : '#dc2626' }}>
                        {isCredit ? '+' : '-'}₹{(tx.amountPaise / 100).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
