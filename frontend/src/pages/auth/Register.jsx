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
    <div style={{ maxWidth: '440px', margin: '40px auto', padding: '32px', background: 'white', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <ShieldCheck size={48} color="var(--brand-blue)" style={{ margin: '0 auto 12px' }} />
        <h2>Create Account</h2>
        <p className="text-muted">Cyber Cafe Customer Registration</p>
      </div>

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label className="form-label">Full Name *</label>
          <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sharma" required />
        </div>
        <div>
          <label className="form-label">Email Address *</label>
          <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required />
        </div>
        <div>
          <label className="form-label">Mobile Number *</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="tel" 
              className="form-input" 
              value={phone} 
              onChange={e => { setPhone(e.target.value); setOtpVerified(false); }} 
              placeholder="10-digit mobile" 
              required 
              disabled={otpVerified}
            />
            {!otpVerified ? (
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={handleSendOtp}
                style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}
              >
                {otpSent ? 'Resend' : 'Send OTP'}
              </button>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--green)', fontSize: '0.85rem', fontWeight: 600 }}>
                Verified
              </span>
            )}
          </div>
        </div>

        {otpSent && !otpVerified && (
          <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Enter 6-Digit OTP</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="form-input" 
                value={otpCode} 
                onChange={e => setOtpCode(e.target.value)} 
                placeholder="123456" 
                maxLength={6}
              />
              <button type="button" className="btn btn-primary" onClick={handleVerifyOtp} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                Verify
              </button>
            </div>
            {otpMessage && <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)', marginTop: '4px' }}>{otpMessage}</div>}
          </div>
        )}

        {otpVerified && otpMessage && (
          <div style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 500 }}>
            {otpMessage}
          </div>
        )}

        <div>
          <label className="form-label">Complete Address *</label>
          <textarea 
            className="form-input" 
            rows={2} 
            value={address} 
            onChange={e => setAddress(e.target.value)} 
            placeholder="Street address, City, State, Pincode" 
            required 
          />
        </div>

        <div>
          <label className="form-label">Password *</label>
          <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        </div>
        <div>
          <label className="form-label">Confirm Password *</label>
          <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
        </div>
        
        {error && <div style={{ color: 'var(--red)', fontSize: '0.85rem', padding: '8px', background: 'rgba(231,76,60,0.1)', borderRadius: '8px' }}>{error}</div>}
        
        <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }} disabled={loading}>
          {loading ? 'Creating Account...' : 'Complete Registration'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem' }}>
        <span className="text-muted">Already have an account? </span>
        <Link to="/login" state={location.state} style={{ color: 'var(--brand-blue)', fontWeight: 500 }}>Sign In</Link>
      </div>
    </div>
  );
}
