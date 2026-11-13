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
  X,
  ExternalLink
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { adminApi } from '../api/admin';

const isPendingWithdrawal = (status) => {
  return ['PENDING', 'REQUESTED', 'UNDER_REVIEW', 'PROCESSING'].includes(String(status || '').toUpperCase());
};

export default function Payments() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab')?.toUpperCase() === 'WITHDRAWALS' ? 'WITHDRAWALS' : 'PAYMENTS';
  });
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

  // Approve Withdrawal Modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveWithdrawalTarget, setApproveWithdrawalTarget] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [approving, setApproving] = useState(false);

  // Reject Withdrawal Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectWithdrawalId, setRejectWithdrawalId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      adminApi.getFinancialSummary(),
      adminApi.getPayments(),
      adminApi.getWithdrawals(),
      adminApi.getTopEarningWorkers(leaderboardPeriod)
    ])
      .then(([sumRes, payRes, wthRes, topRes]) => {
        if (sumRes?.summary) setSummary(sumRes.summary);
        setPayments(payRes?.payments || []);
        setWithdrawals(wthRes?.withdrawals || wthRes?.payouts || []);
        setTopWorkers(topRes?.rankings || []);
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

  // Synchronize tab if search params change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam.toUpperCase() === 'WITHDRAWALS') {
      setActiveTab('WITHDRAWALS');
    }
  }, [searchParams]);

  const handleApproveSubmit = async () => {
    if (!approveWithdrawalTarget) return;
    setApproving(true);
    try {
      await adminApi.approveWithdrawal(approveWithdrawalTarget.id, {
        paymentReference: paymentReference.trim() || undefined
      });
      setShowApproveModal(false);
      setApproveWithdrawalTarget(null);
      setPaymentReference('');
      loadData();
      alert('Withdrawal approved and marked as transferred successfully!');
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('already completed')) {
        setShowApproveModal(false);
        setApproveWithdrawalTarget(null);
        setPaymentReference('');
        loadData();
        alert('Withdrawal has been confirmed and marked as transferred!');
      } else {
        alert(err.message || 'Failed to approve withdrawal');
      }
    } finally {
      setApproving(false);
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!rejectWithdrawalId) return;
    setRejecting(true);
    try {
      await adminApi.rejectWithdrawal(rejectWithdrawalId, rejectReason.trim() || 'Administrative payout rejection');
      setShowRejectModal(false);
      setRejectWithdrawalId(null);
      setRejectReason('');
      loadData();
      alert('Withdrawal rejected successfully. Reserved balance restored to worker.');
    } catch (err) {
      alert(err.message || 'Failed to reject withdrawal');
    } finally {
      setRejecting(false);
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
        `"${w.workerName || w.worker?.name || 'Worker'}"`,
        ((w.amountPaise || 0) / 100).toFixed(2),
        `"${w.payoutDetails?.upiId || w.payoutDetails?.accountNumber || w.method || 'Bank'}"`,
        w.status,
        w.requestedAt || w.createdAt ? new Date(w.requestedAt || w.createdAt).toLocaleDateString() : 'N/A'
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

  const pendingWithdrawalsCount = withdrawals.filter(w => isPendingWithdrawal(w.status)).length;

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
          value={`₹${(((summary.totalRevenuePaise || summary.grossRevenuePaise || (summary.totalRevenue ? Number(summary.totalRevenue) * 100 : 0)) || 0) / 100).toFixed(2)}`} 
          icon={Wallet} 
          color="purple" 
        />
        <StatCard 
          title="Platform Commission (Markup)" 
          value={`₹${((summary.totalCommissionPaise || 0) / 100).toFixed(2)}`} 
          icon={TrendingUp} 
          color="blue" 
        />
        <StatCard 
          title="Worker Payouts" 
          value={`₹${(((summary.workerPayoutsPaise || summary.completedWithdrawalsPaise || summary.totalWorkerEarningsPaise || summary.totalWorkerPayoutsPaise) || 0) / 100).toFixed(2)}`} 
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
            fontWeight: activeTab === 'WITHDRAWALS' ? 600 : 500, cursor: 'pointer', fontSize: '0.9rem',
            display: 'inline-flex', alignItems: 'center', gap: '6px'
          }}
        >
          Withdrawal Requests ({pendingWithdrawalsCount} Pending)
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
                    <div style={{ fontSize: '0.85rem' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                    </div>
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
                    <span style={{ fontWeight: 600, color: 'var(--brand-blue)', fontSize: '0.85rem' }} title={w.id}>
                      {w.id.slice(0, 10)}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{w.workerName || w.worker?.name || 'Worker'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {w.workerId || w.worker?.workerId || w.worker?.phone || w.workerEmail || ''}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: '1rem', color: '#16a34a' }}>
                    ₹{((w.amountPaise || 0) / 100).toFixed(2)}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      {w.payoutDetails?.upiId 
                        ? `UPI: ${w.payoutDetails.upiId}` 
                        : w.payoutDetails?.accountNumber 
                          ? `A/C: ${w.payoutDetails.accountNumber}`
                          : w.method === 'UPI' ? 'UPI Transfer' : 'Bank Transfer'}
                    </div>
                    {(w.payoutDetails?.ifsc || w.payoutDetails?.accountHolderName) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {w.payoutDetails?.ifsc ? `IFSC: ${w.payoutDetails.ifsc}` : ''}
                        {w.payoutDetails?.accountHolderName ? ` (${w.payoutDetails.accountHolderName})` : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={w.status} />
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      {w.requestedAt || w.createdAt ? new Date(w.requestedAt || w.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                    </div>
                    {(w.requestedAt || w.createdAt) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(w.requestedAt || w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </td>
                  <td>
                    {isPendingWithdrawal(w.status) ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ background: '#16a34a', fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => {
                            setApproveWithdrawalTarget(w);
                            setPaymentReference('');
                            setShowApproveModal(true);
                          }}
                        >
                          <CheckCircle size={14} /> Approve / Pay
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => { 
                            setRejectWithdrawalId(w.id); 
                            setRejectReason('');
                            setShowRejectModal(true); 
                          }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    ) : (w.status === 'COMPLETED' || w.status === 'APPROVED') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={14} /> Transferred
                        </span>
                        {w.paymentReference && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} title={w.paymentReference}>
                            Ref: {w.paymentReference}
                          </span>
                        )}
                      </div>
                    ) : w.status === 'REJECTED' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={14} /> Rejected
                        </span>
                        {w.adminNote && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{w.adminNote}</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{w.status}</span>
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

      {/* APPROVE & PAY WITHDRAWAL MODAL */}
      {showApproveModal && approveWithdrawalTarget && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={20} /> Approve Worker Payout
              </h3>
              <button 
                onClick={() => setShowApproveModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Worker:</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {approveWithdrawalTarget.workerName || approveWithdrawalTarget.worker?.name || 'Worker'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Payout Amount:</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#16a34a' }}>
                  ₹{((approveWithdrawalTarget.amountPaise || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Method:</span>
                <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                  {approveWithdrawalTarget.method || 'BANK'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Destination:</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {approveWithdrawalTarget.payoutDetails?.upiId 
                      ? `UPI: ${approveWithdrawalTarget.payoutDetails.upiId}` 
                      : approveWithdrawalTarget.payoutDetails?.accountNumber 
                        ? `A/C: ${approveWithdrawalTarget.payoutDetails.accountNumber}`
                        : 'Registered Bank Account'}
                  </div>
                  {approveWithdrawalTarget.payoutDetails?.ifsc && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      IFSC: {approveWithdrawalTarget.payoutDetails.ifsc}
                    </div>
                  )}
                  {approveWithdrawalTarget.payoutDetails?.accountHolderName && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Holder: {approveWithdrawalTarget.payoutDetails.accountHolderName}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Bank Reference / UTR / Transaction ID (Optional)
              </label>
              <input 
                type="text"
                className="form-input"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                placeholder="e.g. UTR12345678, UPI-99887766, IMPS-5544"
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Enter the bank/UPI reference ID after transferring funds to the worker.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowApproveModal(false)}
                disabled={approving}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
                onClick={handleApproveSubmit}
                disabled={approving}
              >
                {approving ? 'Processing...' : 'Confirm Payout Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT WITHDRAWAL MODAL */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={20} /> Reject Worker Withdrawal
              </h3>
              <button 
                onClick={() => setShowRejectModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
              Please provide the administrative reason for rejecting this withdrawal request. The reserved funds will immediately be returned to the worker's wallet balance.
            </p>

            <textarea 
              style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '16px', fontSize: '0.875rem' }}
              placeholder="Reason for rejection (e.g. Invalid IFSC, Bank account details mismatch, UPI inactive)..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setShowRejectModal(false)}
                disabled={rejecting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                style={{ background: '#dc2626', borderColor: '#dc2626' }} 
                onClick={handleRejectWithdrawal}
                disabled={rejecting}
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}