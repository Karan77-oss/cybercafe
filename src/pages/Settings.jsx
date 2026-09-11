import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Lock, 
  Save, 
  Check, 
  AlertCircle, 
  Search, 
  FileText, 
  KeyRound, 
  SlidersHorizontal 
} from 'lucide-react';
import { adminApi } from '../api/admin';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('PROFILE'); // PROFILE | PLATFORM | AUDIT
  const [loading, setLoading] = useState(true);

  // Admin Profile State
  const [profile, setProfile] = useState({
    name: 'Karan Kumar',
    adminId: 'Karan Kumar',
    email: 'rajkaran969355@gmail.com',
    phone: '',
    avatar: ''
  });
  const [profileSaved, setProfileSaved] = useState('');

  // Change Password State
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState({
    platformName: 'Cyber Cafe Marketplace',
    supportEmail: 'support@cybercafe.com',
    supportPhone: '+91 98765 43210',
    commissionRatePercent: 20,
    correctionWindowHours: 2,
    customerRefundPercent: 100,
    emailAlertsEnabled: true,
    inAppAlertsEnabled: true
  });
  const [settingsSaved, setSettingsSaved] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');

  const loadSettingsAndLogs = () => {
    setLoading(true);
    Promise.all([
      adminApi.getSettings(),
      adminApi.getAuditLogs()
    ])
      .then(([setRes, auditRes]) => {
        if (setRes.settings) {
          setPlatformSettings(prev => ({ ...prev, ...setRes.settings }));
        }
        if (auditRes.logs) {
          setAuditLogs(auditRes.logs);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSettingsAndLogs();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await adminApi.updateProfile(profile);
      setProfileSaved('Admin profile updated successfully.');
      setTimeout(() => setProfileSaved(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: '', isError: false });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters.', isError: true });
      return;
    }

    try {
      await adminApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      setPasswordMsg({ text: 'Password successfully updated!', isError: false });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordMsg({ text: '', isError: false }), 3000);
    } catch (err) {
      setPasswordMsg({ text: err.message || 'Failed to update password', isError: true });
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      await adminApi.updateSettings({
        ...platformSettings,
        commissionRatePercent: Number(platformSettings.commissionRatePercent),
        correctionWindowHours: Number(platformSettings.correctionWindowHours),
        customerRefundPercent: Number(platformSettings.customerRefundPercent)
      });
      setSettingsSaved('Platform configurations saved successfully.');
      setTimeout(() => setSettingsSaved(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    }
  };

  const filteredLogs = auditLogs.filter(log => 
    (log.action || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
    (log.target || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
    (log.notes || '').toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Profile & Platform Settings</h1>
          <p className="subtitle">Configure admin credentials, commission rates, correction timers, and review security audit logs.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('PROFILE')}
          style={{
            padding: '10px 16px', background: 'none', border: 'none',
            borderBottom: activeTab === 'PROFILE' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'PROFILE' ? 'var(--brand-blue)' : 'var(--text-muted)',
            fontWeight: activeTab === 'PROFILE' ? 600 : 500, cursor: 'pointer', fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <User size={16} /> Admin Profile & Security
        </button>

        <button
          onClick={() => setActiveTab('PLATFORM')}
          style={{
            padding: '10px 16px', background: 'none', border: 'none',
            borderBottom: activeTab === 'PLATFORM' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'PLATFORM' ? 'var(--brand-blue)' : 'var(--text-muted)',
            fontWeight: activeTab === 'PLATFORM' ? 600 : 500, cursor: 'pointer', fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <SlidersHorizontal size={16} /> Platform Business Rules
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          style={{
            padding: '10px 16px', background: 'none', border: 'none',
            borderBottom: activeTab === 'AUDIT' ? '2px solid var(--brand-blue)' : '2px solid transparent',
            color: activeTab === 'AUDIT' ? 'var(--brand-blue)' : 'var(--text-muted)',
            fontWeight: activeTab === 'AUDIT' ? 600 : 500, cursor: 'pointer', fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Shield size={16} /> Security & Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: ADMIN PROFILE & SECURITY */}
      {activeTab === 'PROFILE' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Profile Form */}
          <div className="data-table-container">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} /> Admin Information
            </h2>

            {profileSaved && (
              <div style={{ padding: '10px 14px', background: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
                ✓ {profileSaved}
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Admin ID Code</label>
                <input type="text" className="search-box" style={{ width: '100%', background: '#f8fafc' }} value={profile.adminId} disabled />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Full Name</label>
                <input type="text" className="search-box" style={{ width: '100%' }} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Email Address</label>
                <input type="email" className="search-box" style={{ width: '100%' }} value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} required />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Mobile Phone</label>
                <input type="tel" className="search-box" style={{ width: '100%' }} value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
              </div>

              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Update Profile
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="data-table-container">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} /> Change Password
            </h2>

            {passwordMsg.text && (
              <div style={{
                padding: '10px 14px',
                background: passwordMsg.isError ? '#fee2e2' : '#dcfce7',
                color: passwordMsg.isError ? '#b91c1c' : '#15803d',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Current Password *</label>
                <input 
                  type="password" 
                  className="search-box" 
                  style={{ width: '100%' }} 
                  value={passwordForm.oldPassword} 
                  onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} 
                  required 
                  placeholder="Enter current password (default: password123)"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>New Password *</label>
                <input 
                  type="password" 
                  className="search-box" 
                  style={{ width: '100%' }} 
                  value={passwordForm.newPassword} 
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                  required 
                  placeholder="At least 6 characters"
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Confirm New Password *</label>
                <input 
                  type="password" 
                  className="search-box" 
                  style={{ width: '100%' }} 
                  value={passwordForm.confirmPassword} 
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                  required 
                  placeholder="Repeat new password"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                <KeyRound size={16} /> Save New Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: PLATFORM BUSINESS RULES */}
      {activeTab === 'PLATFORM' && (
        <div className="data-table-container" style={{ maxWidth: '720px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>
            Core Platform Business Parameters
          </h2>

          {settingsSaved && (
            <div style={{ padding: '10px 14px', background: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
              ✓ {settingsSaved}
            </div>
          )}

          <form onSubmit={handleUpdateSettings}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Platform Name</label>
                <input 
                  type="text" 
                  className="search-box" 
                  style={{ width: '100%' }} 
                  value={platformSettings.platformName} 
                  onChange={e => setPlatformSettings({ ...platformSettings, platformName: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Platform Commission Rate (%)</label>
                <input 
                  type="number" 
                  className="search-box" 
                  style={{ width: '100%' }} 
                  value={platformSettings.commissionRatePercent} 
                  onChange={e => setPlatformSettings({ ...platformSettings, commissionRatePercent: e.target.value })} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Support Email</label>
                <input 
                  type="email" 
                  className="search-box" 
                  style={{ width: '100%' }} 
                  value={platformSettings.supportEmail} 
                  onChange={e => setPlatformSettings({ ...platformSettings, supportEmail: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Support Phone</label>
                <input 
                  type="text" 
                  className="search-box" 
                  style={{ width: '100%' }} 
                  value={platformSettings.supportPhone} 
                  onChange={e => setPlatformSettings({ ...platformSettings, supportPhone: e.target.value })} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Correction Deadline Window (Hours)
                </label>
                <input 
                  type="number" 
                  className="search-box" 
                  style={{ width: '100%' }} 
                  value={platformSettings.correctionWindowHours} 
                  onChange={e => setPlatformSettings({ ...platformSettings, correctionWindowHours: e.target.value })} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Default: 2 hours strictly enforced per guidelines.</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Customer Refund Guarantee (%)
                </label>
                <input 
                  type="number" 
                  className="search-box" 
                  style={{ width: '100%' }} 
                  value={platformSettings.customerRefundPercent} 
                  onChange={e => setPlatformSettings({ ...platformSettings, customerRefundPercent: e.target.value })} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Default: 100% full refund on unresolved dispute.</span>
              </div>
            </div>

            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '10px' }}>Notification Channels</div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={platformSettings.emailAlertsEnabled} 
                    onChange={e => setPlatformSettings({ ...platformSettings, emailAlertsEnabled: e.target.checked })} 
                  />
                  Enable Email Dispatch
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={platformSettings.inAppAlertsEnabled} 
                    onChange={e => setPlatformSettings({ ...platformSettings, inAppAlertsEnabled: e.target.checked })} 
                  />
                  Enable Live In-App Alerts
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Configuration Rules
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: SECURITY & AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="data-table-container">
          <div className="table-controls">
            <div className="search-box">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search audit actions, entities, notes..." 
                value={auditSearch} 
                onChange={e => setAuditSearch(e.target.value)} 
              />
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin / Actor</th>
                <th>Action Type</th>
                <th>Target Entity</th>
                <th>Details / Execution Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr key={log.id || idx}>
                  <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt || log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--brand-blue)', fontSize: '0.85rem' }}>
                      {log.adminId || log.actorUserId || 'ADMIN'}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: log.action?.includes('REFUND') ? '#fee2e2' : log.action?.includes('ASSIGN') ? '#eff6ff' : '#f1f5f9',
                      color: log.action?.includes('REFUND') ? '#b91c1c' : log.action?.includes('ASSIGN') ? '#1d4ed8' : '#334155'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {log.target || 'System'}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                    {log.notes || log.details || 'Administrative intervention executed'}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No audit events logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
