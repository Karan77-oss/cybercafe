import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const user = await login(identifier.trim(), password);
      if (user.role !== 'ADMIN') {
        logout?.();
        setError('Access Denied: Only administrators are authorized to access the Admin Console.');
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        padding: '36px 32px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#ffffff',
            boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.4)'
          }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Admin Console
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
            Sign in with authorized administrator credentials
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            lineHeight: 1.4
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label className="form-label">
              Administrator ID or Email <span className="req">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. ADM-001 or admin@cybercafe.com"
                style={{ paddingLeft: '38px' }}
                value={identifier} 
                onChange={e => setIdentifier(e.target.value)} 
                required 
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Password <span className="req">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter administrator password"
                style={{ paddingLeft: '38px' }}
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
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
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: '8px',
              marginTop: '6px'
            }} 
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Access Admin Console'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{
          marginTop: '28px',
          padding: '12px 14px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '0.78rem',
          color: '#64748b',
          textAlign: 'center',
          lineHeight: 1.5
        }}>
          🔒 <strong>Restricted Security Zone:</strong> All login attempts, actions, and transactions within this console are monitored and permanently audited.
        </div>
      </div>
    </div>
  );
}
