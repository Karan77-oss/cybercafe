import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const user = await login(identifier.trim(), password);
      
      // Portal Isolation Routing
      if (user.role === 'ADMIN') {
        window.location.href = 'http://localhost:5174/admin';
        return;
      }
      if (user.role === 'WORKER') {
        window.location.href = 'http://localhost:5175/worker';
        return;
      }
      
      navigate(location.state?.returnTo || '/');
    } catch (err) {
      setError(err.message || 'Invalid login credentials. Please check your email, phone, or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '440px',
      margin: '60px auto',
      padding: '36px 32px',
      background: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(83, 100, 249, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--brand-blue)'
        }}>
          <ShieldCheck size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          Customer Sign In
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Access your digital services, applications, and documents
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
            Mobile Number, Email, or User ID <span className="req">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. 9876543210 or your email"
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
              placeholder="Enter your account password"
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
            fontWeight: 600,
            borderRadius: '8px',
            marginTop: '4px'
          }} 
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <div style={{
        marginTop: '22px',
        padding: '12px 14px',
        background: '#f8fafc',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: '#64748b' }}>Are you a service operator?</span>
        <a 
          href="http://localhost:5175/login" 
          style={{ color: 'var(--brand-blue)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          Worker Portal →
        </a>
      </div>

      <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.9rem' }}>
        <span style={{ color: '#64748b' }}>Don't have an account yet? </span>
        <Link to="/register" state={location.state} style={{ color: 'var(--brand-blue)', fontWeight: 600, textDecoration: 'none' }}>
          Create Customer Account
        </Link>
      </div>
    </div>
  );
}
