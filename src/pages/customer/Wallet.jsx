import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet as WalletIcon, ArrowDownLeft, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { ordersApi } from '../../api/orders';

export default function Wallet() {
  const [wallet, setWallet] = useState({ balancePaise: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getWallet();
      setWallet(res.wallet || { balancePaise: 0, transactions: [] });
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const balanceRupees = ((wallet.balancePaise || 0) / 100).toFixed(2);

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px' }}>Customer Wallet</h1>
      <p className="text-muted" style={{ marginBottom: '32px' }}>
        Manage your platform balance and view refund credits from eligible expired or cancelled orders.
      </p>

      {/* Balance Card */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
          color: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.9, marginBottom: '8px', fontSize: '0.9rem' }}>
            <WalletIcon size={20} />
            <span>Available Platform Balance</span>
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            ₹{balanceRupees}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '8px' }}>
            Automatic credits applied instantly on eligible order cancellation / 24-hour expiry
          </div>
        </div>

        <Link 
          to="/services" 
          className="btn" 
          style={{ 
            background: 'white', 
            color: '#4f46e5', 
            fontWeight: 600, 
            padding: '12px 24px', 
            borderRadius: '10px',
            textDecoration: 'none'
          }}
        >
          Use for Services →
        </Link>
      </div>

      {/* 24-Hour Policy Card */}
      <div 
        style={{
          background: 'rgba(83, 100, 249, 0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px'
        }}
      >
        <ShieldCheck size={24} color="var(--brand-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>24-Hour Expiry & Refund Guarantee</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            To ensure rapid service delivery, normal orders do not remain pending beyond 24 hours. If an order is not completed within the allowed 24-hour window, the system automatically closes the order and credits a full refund to your Platform Wallet.
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="form-card" style={{ margin: 0 }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Wallet Refund History</h3>

        {loading && <div style={{ textAlign: 'center', padding: '30px' }}>Loading wallet transactions...</div>}
        {error && (
          <div style={{ color: 'var(--red)', padding: '20px', textAlign: 'center' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && wallet.transactions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <Clock size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h4>No Wallet Transactions Yet</h4>
            <p style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '8px auto 0' }}>
              When an eligible order expires or is cancelled, your refund credit will be listed here automatically.
            </p>
          </div>
        )}

        {!loading && !error && wallet.transactions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {wallet.transactions.map((txn) => (
              <div 
                key={txn.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: 'var(--bg-main)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div 
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'rgba(46, 204, 113, 0.15)',
                      color: 'var(--green)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ArrowDownLeft size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{txn.serviceName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {txn.description} | {new Date(txn.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: '1.05rem' }}>
                    +₹{(txn.amountPaise / 100).toFixed(2)}
                  </div>
                  <Link 
                    to={`/orders/${txn.orderId}`} 
                    style={{ fontSize: '0.75rem', color: 'var(--brand-blue)', textDecoration: 'none' }}
                  >
                    View Order #{txn.orderId.slice(-6)} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
