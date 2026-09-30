import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
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
      const user = await login(email, password);
      // Route based on role
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'WORKER') navigate('/worker');
      else navigate(location.state?.returnTo || '/');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '32px', background: 'white', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <ShieldCheck size={48} color="var(--brand-blue)" style={{ margin: '0 auto 16px' }} />
        <h2>Welcome Back</h2>
        <p className="text-muted">Sign in to your Cyber Cafe account</p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label className="form-label">User ID, Username, or Email</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Enter your User ID, Username, or Email"
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label className="form-label">Password</label>
          <input type="password" className="form-input" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        
        {error && <div style={{ color: 'var(--red)', fontSize: '0.9rem', padding: '8px', background: 'rgba(231,76,60,0.1)', borderRadius: '8px' }}>{error}</div>}
        
        <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: '16px' }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: 'rgba(30, 58, 138, 0.06)',
        borderRadius: '8px',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: 'var(--text-muted)' }}>Are you a hired worker?</span>
        <Link to="/worker/login" style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>
          Worker Portal Login →
        </Link>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
        <span className="text-muted">Don't have an account? </span>
        <Link to="/register" state={location.state} style={{ color: 'var(--brand-blue)', fontWeight: 500 }}>Create Account</Link>
      </div>
    </div>
  );
}
