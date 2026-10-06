import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Briefcase, KeyRound, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function WorkerLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleWorkerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setError('Please enter your Worker User ID or Username');
      setLoading(false);
      return;
    }

    try {
      const user = await login(trimmedId, password);

      if (user.role === 'WORKER') {
        navigate('/worker', { replace: true });
      } else {
        await logout?.();
        setError('Access Denied: This portal is exclusively for registered cyber cafe operators and workers.');
      }
    } catch (err) {
      setError(err.message || 'Invalid Worker User ID or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '440px',
      margin: '60px auto',
      padding: '36px 32px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: 'var(--shadow-md)',
      border: '1px solid var(--border-color)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'rgba(30, 58, 138, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--brand-blue)'
        }}>
          <Briefcase size={28} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
          Worker & Operator Login
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Sign in using the User ID and password assigned by Admin
        </p>
      </div>

      {error && (
        <div style={{
          padding: '12px 14px',
          background: '#fee2e2',
          color: '#b91c1c',
          borderRadius: '8px',
          fontSize: '0.875rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleWorkerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
            Worker User ID / Username *
          </label>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              required
              className="form-input"
              style={{ width: '100%', paddingLeft: '38px' }}
              placeholder="e.g. WRK-108 or your username"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
            Password *
          </label>
          <div style={{ position: 'relative' }}>
            <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              required
              className="form-input"
              style={{ width: '100%', paddingLeft: '38px' }}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            marginTop: '8px'
          }}
          disabled={loading}
        >
          {loading ? 'Authenticating...' : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Sign In to Worker Dashboard <ArrowRight size={18} />
            </span>
          )}
        </button>
      </form>

      {/* Demo Worker Credentials Helper */}
      <div style={{
        marginTop: '20px',
        padding: '14px',
        background: '#f8fafc',
        borderRadius: '10px',
        border: '1px dashed #cbd5e1',
        fontSize: '0.8rem'
      }}>
        <div style={{ fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🔑 Quick Test Logins:</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            type="button"
            onClick={() => {
              setIdentifier('amit.cyber@gmail.com');
              setPassword('password123');
            }}
            style={{
              padding: '6px 10px',
              background: '#e0e7ff',
              color: '#3730a3',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.8rem',
              fontWeight: 500
            }}
          >
            👤 Amit Cyber Cafe (Patna) — <code style={{ fontSize: '0.75rem' }}>password123</code>
          </button>
          <button
            type="button"
            onClick={() => {
              setIdentifier('neha.cyber@gmail.com');
              setPassword('password123');
            }}
            style={{
              padding: '6px 10px',
              background: '#f3e8ff',
              color: '#6b21a8',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.8rem',
              fontWeight: 500
            }}
          >
            👤 Neha Documentation Hub — <code style={{ fontSize: '0.75rem' }}>password123</code>
          </button>
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.875rem'
      }}>
        <span className="text-muted">Not a worker? </span>
        <Link to="/login" style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>
          Go to Customer / Admin Login
        </Link>
      </div>
    </div>
  );
}
