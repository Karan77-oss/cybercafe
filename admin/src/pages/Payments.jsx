import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Wallet, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Search, 
  Award, 
  ArrowUpRight, 
  TrendingUp, 
  X 
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { adminApi } from '../api/admin';

export default function Payments() {
  const [activeTab, setActiveTab] = useState('PAYMENTS'); // PAYMENTS | LEDGER | WITHDRAWALS | LEADERBOARD
  const [summary, setSummary] = useState({
    totalRevenuePaise: 0,
    totalCommissionPaise: 0,
    totalWorkerEarningsPaise: 0,
    heldEarningsPaise: 0,
    totalRefundsPaise: 0
  });
  const [payments, setPayments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [topWorkers, setTopWorkers] = useState([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reject Withdrawal Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectWithdrawalId, setRejectWithdrawalId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      adminApi.getFinancialSummary(),
      adminApi.getPayments(),
      adminApi.getWithdrawals(),
      adminApi.getTopEarningWorkers(leaderboardPeriod)
    ])
      .then(([sumRes, payRes, wthRes, topRes]) => {
        if (sumRes.summary) setSummary(sumRes.summary);
        setPayments(payRes.payments || []);
        setWithdrawals(wthRes.withdrawals || []);
        setTopWorkers(topRes.rankings || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load financial data');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [leaderboardPeriod]);

  const handleApproveWithdrawal = async (id) => {
    if (!window.confirm('Approve and mark this worker payout as transferred?')) return;
    try {
      await adminApi.approveWithdrawal(id);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to approve withdrawal');
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!rejectWithdrawalId) return;
    try {
      await adminApi.rejectWithdrawal(rejectWithdrawalId, rejectReason || 'Administrative payout rejection');
      setShowRejectModal(false);
      setRejectWithdrawalId(null);
      setRejectReason('');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to reject withdrawal');
    }
  };

  const exportCSV = () => {
    let headers = [];
    let rows = [];
    let filename = 'financials_export.csv';

    if (activeTab === 'PAYMENTS') {
      headers = ['Order ID', 'Customer', 'Amount (Rs)', 'Method', 'Status', 'Date'];
      rows = payments.map(p => [
        p.orderId || p.id,
        `"${p.customer?.name || 'Customer'}"`,
        ((p.amountPaise || 0) / 100).toFixed(2),
        p.method || 'ONLINE',
        p.status,
        new Date(p.createdAt).toLocaleDateString()
      ]);
      filename = `customer_payments_${new Date().toISOString().slice(0,10)}.csv`;
    } else if (activeTab === 'WITHDRAWALS') {
      headers = ['Withdrawal ID', 'Worker', 'Amount (Rs)', 'Method/UPI', 'Status', 'Requested Date'];
      rows = withdrawals.map(w => [
        w.id,
        `"${w.worker?.name || 'Worker'}"`,
        ((w.amountPaise || 0) / 100).toFixed(2),
        `"${w.payoutDetails?.upiId || w.payoutDetails?.accountNumber || 'UPI'}"`,
        w.status,
        new Date(w.createdAt).toLocaleDateString()
      ]);
      filename = `worker_withdrawals_${new Date().toISOString().slice(0,10)}.csv`;
    } else {
      headers = ['Rank', 'Worker ID', 'Name', 'Completed Orders', 'Total Earnings (Rs)'];
      rows = topWorkers.map((w, idx) => [
        idx + 1,
        w.workerId,
        `"${w.name || w.workerName || 'Worker'}"`,
        w.completedOrders,
        ((w.totalEarningsPaise || 0) / 100).toFixed(2)
      ]);
      filename = `top_workers_leaderboard_${new Date().toISOString().slice(0,10)}.csv`;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Payments & Earnings</h1>
          <p className="subtitle">Audit revenue, platform commission, worker payouts, and pending withdrawal requests.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <StatCard 
          title="Total Platform Revenue" 
          value={`₹${((summary.totalRevenuePaise || 0) / 100).toFixed(2)}`} 
          icon={Wallet} 
          color="purple" 
        />
        <StatCard 
          title="Platform Commission (20%)" 
          value={`₹${((summary.totalCommissionPaise || 0) / 100).toFixed(2)}`} 
          icon={TrendingUp} 
          color="blue" 
        />
        <StatCard 
          title="Worker Earnings (80%)" 
          value={`₹${((summary.totalWorkerEarningsPaise || 0) / 100).toFixed(2)}`} 
          icon={CheckCircle} 
          color="green" 
        />
        <StatCard 
          title="Earnings On Hold" 
          value={`₹${((summary.heldEarningsPaise || 0) / 100).toFixed(2)}`} 
          icon={Clock} 
          color="yellow" 
        />
        <StatCard 
          title="Total Customer Refunds" 
          value={`₹${((summary.totalRefundsPaise || 0) / 100).toFixed(2)}`} 
          icon={AlertTriangle} 
          color="red" 
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('PAYMENTS')}
          style={{
            padding: '10px 14px', background: 'none', border: 'none',
            borderBottom: activeTab === 'PAYMENTS' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'PAYMENTS' ? 'var(--brand-blue)' : 'var(--text-muted)',
            fontWeight: activeTab === 'PAYMENTS' ? 600 : 500, cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Customer Payments ({payments.length})
        </button>

        <button
          onClick={() => setActiveTab('WITHDRAWALS')}
          style={{
            padding: '10px 14px', background: 'none', border: 'none',
            borderBottom: activeTab === 'WITHDRAWALS' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'WITHDRAWALS' ? 'var(--brand-blue)' : 'var(--text-muted)',
            fontWeight: activeTab === 'WITHDRAWALS' ? 600 : 500, cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Withdrawal Requests ({withdrawals.filter(w => w.status === 'PENDING').length} Pending)
        </button>

        <button
          onClick={() => setActiveTab('LEADERBOARD')}
          style={{
            padding: '10px 14px', background: 'none', border: 'none',
            borderBottom: activeTab === 'LEADERBOARD' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'LEADERBOARD' ? 'var(--brand-blue)' : 'var(--text-muted)',
            fontWeight: activeTab === 'LEADERBOARD' ? 600 : 500, cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Top Earning Workers Leaderboard
        </button>
      </div>

      {/* TAB 1: CUSTOMER PAYMENTS */}
      {activeTab === 'PAYMENTS' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order / Payment ID</th>
                <th>Customer</th>
                <th>Amount Paid</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--brand-blue)', fontSize: '0.85rem' }}>
                      {p.orderId || p.id}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.customer?.name || 'Customer'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.customer?.email}</div>
                  </td>
                  <td style={{ fontWeight: 600, color: '#16a34a' }}>
                    ₹{((p.amountPaise || 0) / 100).toFixed(2)}
                  </td>
                  <td>
                    <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                      {p.method || 'UPI / Gateway'}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={p.status || 'PAID'} />
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{new Date(p.createdAt).toLocaleDateString()}</div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No payments recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: WITHDRAWAL REQUESTS */}
      {activeTab === 'WITHDRAWALS' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Withdrawal ID</th>
                <th>Worker Name</th>
                <th>Requested Amount</th>
                <th>Payout Destination</th>
                <th>Status</th>
                <th>Requested Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map(w => (
                <tr key={w.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--brand-blue)', fontSize: '0.85rem' }}>
                      {w.id.slice(0, 10)}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{w.worker?.name || 'Worker'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.worker?.workerId || w.worker?.phone}</div>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: '1rem', color: '#16a34a' }}>
                    ₹{((w.amountPaise || 0) / 100).toFixed(2)}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      {w.payoutDetails?.upiId ? `UPI: ${w.payoutDetails.upiId}` : `A/C: ${w.payoutDetails?.accountNumber || '9876543210'}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      IFSC: {w.payoutDetails?.ifsc || 'HDFC0001234'}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={w.status} />
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{new Date(w.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td>
                    {w.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ background: '#16a34a', fontSize: '0.8rem', padding: '4px 10px' }}
                          onClick={() => handleApproveWithdrawal(w.id)}
                        >
                          <CheckCircle size={14} /> Approve Payout
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.8rem', padding: '4px 10px' }}
                          onClick={() => { setRejectWithdrawalId(w.id); setShowRejectModal(true); }}
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
              {withdrawals.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>No withdrawal requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: TOP EARNING WORKERS LEADERBOARD */}
      {activeTab === 'LEADERBOARD' && (
        <div className="data-table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#eab308" /> Worker Earnings Leaderboard
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['daily', 'monthly', 'lifetime'].map(p => (
                <button
                  key={p}
                  onClick={() => setLeaderboardPeriod(p)}
                  className={`btn ${leaderboardPeriod === p ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.8rem', padding: '4px 10px', textTransform: 'capitalize' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Worker</th>
                <th>Completed Orders</th>
                <th>Rating Score</th>
                <th>Total Earned</th>
              </tr>
            </thead>
            <tbody>
              {topWorkers.map((w, idx) => (
                <tr key={w.workerId || idx}>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      width: '28px', height: '28px',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%',
                      background: idx === 0 ? '#fef08a' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#fed7aa' : '#f8fafc',
                      color: idx === 0 ? '#854d0e' : '#334155'
                    }}>
                      #{idx + 1}
                    </span>
                  </td>
                  <td>
                    <div className="user-cell">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(w.name || w.workerName || 'Worker')}&background=6366f1&color=fff`} 
                        alt="" 
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{w.name || w.workerName || 'Worker'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)' }}>{w.workerId}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{w.completedOrders} orders</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#eab308', fontWeight: 600 }}>
                      ★ {w.rating || 4.9}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#16a34a' }}>
                      ₹{((w.totalEarningsPaise || 0) / 100).toFixed(2)}
                    </div>
                  </td>
                </tr>
              ))}
              {topWorkers.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No workers recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* REJECT WITHDRAWAL MODAL */}
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
            <h3 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Reject Worker Withdrawal</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Please provide the administrative reason for rejecting this withdrawal request. The funds will remain in the worker's balance.
            </p>
            <textarea 
              style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '14px' }}
              placeholder="Reason for rejection (e.g. UPI ID inactive, account number mismatch)..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#dc2626' }} onClick={handleRejectWithdrawal}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}