import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Wallet, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Smartphone,
  Lock
} from 'lucide-react';
import { workerApi } from '../../api/worker';
import { Link } from 'react-router-dom';

export default function Withdrawals() {
  const [profile, setProfile] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [amountRupees, setAmountRupees] = useState('');
  const [method, setMethod] = useState('BANK');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      const [profileRes, withdrawalsRes] = await Promise.all([
        workerApi.getProfile(),
        workerApi.getWithdrawals()
      ]);

      if (profileRes?.profile) {
        setProfile(profileRes.profile);
      }
      if (withdrawalsRes?.withdrawals) {
        setWithdrawals(withdrawalsRes.withdrawals);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load withdrawal information');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestWithdrawal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const amt = parseFloat(amountRupees);
    if (isNaN(amt) || amt < 100) {
      setError('Minimum withdrawal amount is ₹100.00');
      return;
    }

    const walletRupees = (profile?.walletBalancePaise || 0) / 100;
    if (amt > walletRupees) {
      setError(`Insufficient wallet balance. You have ₹${walletRupees.toFixed(2)} available.`);
      return;
    }

    setSubmitting(true);
    try {
      const amountPaise = Math.round(amt * 100);
      const res = await workerApi.requestWithdrawal(amountPaise, method, profile?.bankDetails);
      if (res?.success) {
        setSuccessMsg(`Withdrawal request for ₹${amt.toFixed(2)} submitted successfully. Funds will be settled to your ${method}.`);
        setAmountRupees('');
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading withdrawal dashboard...
      </div>
    );
  }

  const walletRupees = (profile?.walletBalancePaise || 0) / 100;
  const bankDetails = profile?.bankDetails || {
    accountNumber: '918237461928',
    ifsc: 'SBIN0001234',
    accountHolderName: profile?.name || 'Verified Worker',
    upiId: 'worker@okhdfcbank'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
          Payout Withdrawals
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Transfer your earned wallet balance directly to your verified bank account or UPI ID.
        </p>
      </div>

      {/* Wallet Balance Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        borderRadius: '16px',
        padding: '28px 32px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.25)'
      }}>
        <div>
          <div style={{ fontSize: '0.9rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Current Withdrawable Balance
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: '4px' }}>
            ₹{walletRupees.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '4px' }}>
            Minimum withdrawal limit: ₹100.00 • No processing deductions
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setAmountRupees(walletRupees > 0 ? walletRupees.toFixed(2) : '')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            Withdraw Full Balance
          </button>
        </div>
      </div>

      {/* Grid: Withdrawal Form & Bank Details Security Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* Form: Request Withdrawal */}
        <div className="form-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b' }}>
            Request New Withdrawal
          </h3>

          {error && (
            <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.85rem', marginBottom: '16px' }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleRequestWithdrawal} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Method Select */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Select Payout Channel
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  onClick={() => setMethod('BANK')}
                  style={{
                    border: `1.5px solid ${method === 'BANK' ? '#0284c7' : '#cbd5e1'}`,
                    background: method === 'BANK' ? '#f0f9ff' : 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <Building2 size={20} color={method === 'BANK' ? '#0284c7' : '#64748b'} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: method === 'BANK' ? '#0284c7' : '#1e293b' }}>
                      Bank Account
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>NEFT / IMPS (24h)</div>
                  </div>
                </div>

                <div
                  onClick={() => setMethod('UPI')}
                  style={{
                    border: `1.5px solid ${method === 'UPI' ? '#0284c7' : '#cbd5e1'}`,
                    background: method === 'UPI' ? '#f0f9ff' : 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <Smartphone size={20} color={method === 'UPI' ? '#0284c7' : '#64748b'} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: method === 'UPI' ? '#0284c7' : '#1e293b' }}>
                      UPI Handle
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Instant Settlement</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Amount to Withdraw (in INR ₹)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="100"
                  max={walletRupees}
                  value={amountRupees}
                  onChange={e => setAmountRupees(e.target.value)}
                  placeholder="Enter amount (min ₹100.00)"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 28px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#0f172a'
                  }}
                />
              </div>
            </div>

            {/* Target Destination Preview */}
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', fontSize: '0.84rem' }}>
              <div style={{ color: '#64748b', marginBottom: '4px' }}>Receiving Account:</div>
              {method === 'BANK' ? (
                <div style={{ fontWeight: 600, color: '#1e293b' }}>
                  {bankDetails.accountHolderName} • A/C: ••••••••{bankDetails.accountNumber.slice(-4)} ({bankDetails.ifsc})
                </div>
              ) : (
                <div style={{ fontWeight: 600, color: '#1e293b' }}>
                  UPI ID: {bankDetails.upiId}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || walletRupees < 100 || !amountRupees}
              className="btn btn-primary"
              style={{
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: walletRupees < 100 || !amountRupees ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Submitting Withdrawal...' : 'Request Withdrawal'}
            </button>
          </form>
        </div>

        {/* Bank Details Security Card (Section 3 & 18) */}
        <div className="form-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>Verified Payout Credentials</h4>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Active & Verified</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Account Holder</span>
              <strong>{bankDetails.accountHolderName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Bank Account Number</span>
              <strong>••••••••{bankDetails.accountNumber.slice(-4)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>IFSC Code</span>
              <strong>{bankDetails.ifsc}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>UPI Virtual Address</span>
              <strong>{bankDetails.upiId}</strong>
            </div>
          </div>

          {/* Section 18: Security Policy Alert */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: '8px', fontSize: '0.82rem', color: '#92400e', lineHeight: 1.4 }}>
            <strong>Security Notice (Section 18):</strong> Direct modification of bank details is locked to prevent unauthorized account takeovers. To update your bank account or IFSC, please submit a verification ticket to Support Desk.
          </div>

          <Link
            to="/worker/help"
            className="btn btn-outline"
            style={{ textAlign: 'center', display: 'block', fontSize: '0.85rem' }}
          >
            Request Bank Detail Update via Support
          </Link>
        </div>

      </div>

      {/* Withdrawal History Table */}
      <div className="form-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b' }}>
          Withdrawal Request History
        </h3>

        {withdrawals.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
            No past withdrawals found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.82rem' }}>
                  <th style={{ padding: '12px 0' }}>REQUEST ID</th>
                  <th style={{ padding: '12px 0' }}>DATE</th>
                  <th style={{ padding: '12px 0' }}>METHOD</th>
                  <th style={{ padding: '12px 0' }}>STATUS</th>
                  <th style={{ padding: '12px 0', textAlign: 'right' }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                    <td style={{ padding: '14px 0', fontWeight: 600, color: '#3b82f6' }}>
                      #{w.id}
                    </td>
                    <td style={{ padding: '14px 0', color: '#64748b', fontSize: '0.84rem' }}>
                      {new Date(w.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 0', color: '#1e293b' }}>
                      {w.method === 'BANK' ? 'Bank NEFT/IMPS' : 'UPI Transfer'}
                    </td>
                    <td style={{ padding: '14px 0' }}>
                      <span style={{
                        fontSize: '0.78rem',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        background: w.status === 'COMPLETED' ? '#ecfdf5' : w.status === 'PENDING' ? '#fefce8' : '#fef2f2',
                        color: w.status === 'COMPLETED' ? '#065f46' : w.status === 'PENDING' ? '#854d0e' : '#991b1b'
                      }}>
                        {w.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 0', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      ₹{(w.amountPaise / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}