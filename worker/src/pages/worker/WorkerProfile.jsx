import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Lock, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  ShieldCheck, 
  Save, 
  AlertCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { workerApi } from '../../api/worker';

export default function WorkerProfile() {
  const [profile, setProfile] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadProfile = async () => {
    try {
      const res = await workerApi.getProfile();
      if (res?.profile) {
        setProfile(res.profile);
        setBusinessName(res.profile.businessName || '');
        setPhone(res.profile.phone || '');
        setAddress(res.profile.address || '');
        setCity(res.profile.city || '');
        setSkills(res.profile.skills || ['Government forms', 'PAN-related services']);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load worker profile');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!skills.includes(newSkill.trim())) {
      setSkills(prev => [...prev, newSkill.trim()]);
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(prev => prev.filter(s => s !== skillToRemove));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await workerApi.updateProfile({
        businessName,
        phone,
        address,
        city,
        skills
      });
      if (res?.success) {
        setSuccessMsg('Profile information updated successfully.');
        setProfile(res.profile);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading worker profile...
      </div>
    );
  }

  const bankDetails = profile?.bankDetails || {};
  const workerStatus = profile?.status || profile?.accountStatus || 'ACTIVE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
          Worker Profile & Center Details
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Manage your cyber cafe business information, active skills, and view verified status.
        </p>
      </div>

      {workerStatus === 'PAUSED' && (
        <div style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#b45309', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Account Paused:</strong> Your account is currently paused by the administrator. You will not receive new customer orders or automatic assignment offers until your account is resumed.
          </div>
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.9rem' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Editable Profile Details */}
        <form onSubmit={handleSaveProfile} className="form-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--brand-blue)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              fontWeight: 700
            }}>
              {profile?.name?.[0] || 'W'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#1e293b' }}>
                  {profile?.name || 'Worker'}
                </h2>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: workerStatus === 'ACTIVE' ? '#dcfce7' : (workerStatus === 'PAUSED' ? '#fef3c7' : '#fee2e2'),
                  color: workerStatus === 'ACTIVE' ? '#166534' : (workerStatus === 'PAUSED' ? '#92400e' : '#991b1b')
                }}>
                  {workerStatus}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
                <ShieldCheck size={16} /> Verified Official Provider
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Worker User ID / Username
              </label>
              <input
                type="text"
                disabled
                value={profile?.workerId || profile?.id || ''}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: 'var(--brand-blue)', fontWeight: 700, fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Login Email (Read-Only)
              </label>
              <input
                type="text"
                disabled
                value={profile?.email || ''}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#64748b', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Business / Center Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="e.g. Amit Digital Seva"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Mobile Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="10-digit number"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Center Address
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Shop / Building, Street, Area"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              City / State
            </label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="City, State"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Skills Management */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Service Expertise & Skills
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {skills.map(s => (
                <span
                  key={s}
                  style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontSize: '1rem', lineHeight: 1 }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                placeholder="Add skill (e.g. Voter ID, Domicile)"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="btn btn-outline"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                + Add
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, marginTop: '8px' }}
          >
            <Save size={18} /> {saving ? 'Saving Profile...' : 'Save Profile Changes'}
          </button>
        </form>

        {/* Right Column: Verification & Bank Account Security Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Verification Badge & Stats Card */}
          <div className="form-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#1e293b' }}>
              Worker Accreditation
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color="#10b981" />
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>Identity Verification Approved</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Aadhaar & Operator Certificate on file</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color={workerStatus === 'ACTIVE' ? '#10b981' : '#f59e0b'} />
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>
                    Marketplace Status: {workerStatus}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {workerStatus === 'ACTIVE' ? 'Eligible to receive and accept orders' : (workerStatus === 'PAUSED' ? 'Paused by Admin (no new orders)' : 'Account Inactive')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color="#10b981" />
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>Average Rating: {profile?.rating || 5.0} ⭐</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Across {profile?.completedJobs || 0} completed orders</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 18: Bank Account Details Card (Read-Only) */}
          <div className="form-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="#0284c7" /> Linked Payout Account
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                Locked
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              Linked payout credentials configured during registration. Contact Admin or Support to request changes.
            </p>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Beneficiary</span>
                <strong>{bankDetails?.accountHolderName || profile?.name || 'Not configured'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Account No.</span>
                <strong>{bankDetails?.accountNumber ? `••••••••${bankDetails.accountNumber.slice(-4)}` : 'Not linked'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>IFSC Code</span>
                <strong>{bankDetails?.ifsc || 'Not configured'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>UPI ID</span>
                <strong>{bankDetails?.upiId || 'Not configured'}</strong>
              </div>
            </div>

            <Link
              to="/worker/help"
              className="btn btn-outline"
              style={{ textAlign: 'center', fontSize: '0.85rem' }}
            >
              Request Bank Detail Change
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
