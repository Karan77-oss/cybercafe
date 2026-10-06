import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Mobile OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { register, login } = useAuth();

  const handleSendOtp = () => {
    if (!phone || phone.length < 10) {
      return setError('Please enter a valid 10-digit mobile number first');
    }
    setError('');
    setOtpSent(true);
    setOtpCode('123456');
    setOtpVerified(true);
    setOtpMessage('✓ Mobile number auto-verified with demo code 123456');
  };

  const handleVerifyOtp = () => {
    if (otpCode === '123456' || otpCode.length >= 4) {
      setOtpVerified(true);
      setOtpMessage('✓ Mobile number verified');
      setError('');
    } else {
      setError('Invalid OTP code. Please enter 123456');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      return setError('Please enter a valid 10-digit mobile number');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setLoading(true);
    setError('');
    
    try {
      await register(email, password, name, phone, address);
      // Registration already stores token, role, and dispatches auth_change
      navigate(location.state?.returnTo || '/services');
    } catch (err) {
      setError(err.message || 'Failed to register account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '480px',
      margin: '40px auto',
      padding: '36px 32px',
      background: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(83, 100, 249, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          color: 'var(--brand-blue)'
        }}>
          <ShieldCheck size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          Create Customer Account
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
          Register to apply for government schemes, certificates, and cafe services
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
          marginBottom: '18px',
          lineHeight: 1.4
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label className="form-label">
            Full Name <span className="req">*</span>
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="e.g. Rahul Sharma" 
            required 
          />
        </div>

        <div>
          <label className="form-label">
            Email Address <span className="req">*</span>
          </label>
          <input 
            type="email" 
            className="form-input" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="name@example.com" 
            required 
          />
        </div>

        <div>
          <label className="form-label">
            Mobile Number <span className="req">*</span>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="tel" 
              className="form-input" 
              value={phone} 
              onChange={e => { setPhone(e.target.value); setOtpVerified(false); }} 
              placeholder="10-digit mobile number" 
              required 
              disabled={otpVerified}
            />
            {!otpVerified ? (
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={handleSendOtp}
                style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', padding: '0 16px', borderRadius: '8px' }}
              >
                {otpSent ? 'Resend' : 'Send OTP'}
              </button>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', color: '#16a34a', fontSize: '0.85rem', fontWeight: 600, padding: '0 12px' }}>
                ✓ Verified
              </span>
            )}
          </div>
        </div>

        {otpSent && !otpVerified && (
          <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Enter Verification OTP</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="form-input" 
                value={otpCode} 
                onChange={e => setOtpCode(e.target.value)} 
                placeholder="123456" 
                maxLength={6}
              />
              <button type="button" className="btn btn-primary" onClick={handleVerifyOtp} style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px' }}>
                Verify
              </button>
            </div>
            {otpMessage && <div style={{ fontSize: '0.78rem', color: 'var(--brand-blue)', marginTop: '6px' }}>{otpMessage}</div>}
          </div>
        )}

        <div>
          <label className="form-label">
            Complete Communication Address <span className="req">*</span>
          </label>
          <textarea 
            className="form-input" 
            rows={2} 
            value={address} 
            onChange={e => setAddress(e.target.value)} 
            placeholder="House/Street, Landmark, City, State, PIN" 
            required 
          />
        </div>

        <div className="grid-2">
          <div>
            <label className="form-label">
              Password <span className="req">*</span>
            </label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Min 6 characters" 
              required 
              minLength={6} 
            />
          </div>
          <div>
            <label className="form-label">
              Confirm Password <span className="req">*</span>
            </label>
            <input 
              type="password" 
              className="form-input" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Repeat password" 
              required 
              minLength={6} 
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
            marginTop: '8px'
          }} 
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Complete Registration'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem' }}>
        <span style={{ color: '#64748b' }}>Already have an account? </span>
        <Link to="/login" state={location.state} style={{ color: 'var(--brand-blue)', fontWeight: 600, textDecoration: 'none' }}>
          Sign In
        </Link>
      </div>
    </div>
  );
}
