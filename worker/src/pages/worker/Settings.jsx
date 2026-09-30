import { useState } from 'react';
import { 
  Bell, 
  Volume2, 
  RefreshCw, 
  ShieldCheck, 
  Moon, 
  Save 
} from 'lucide-react';

export default function Settings() {
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState('15');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
          Portal Settings & Preferences
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Configure audio alerts for incoming orders, desktop notifications, and operational preferences.
        </p>
      </div>

      {saved && (
        <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.88rem' }}>
          Preferences updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="form-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        
        {/* Order Offer Alerts */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Volume2 size={18} color="#3b82f6" /> Audio Sound on New Order Offers
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
              Plays a chime alert when a 10-minute order offer is dispatched to your center.
            </div>
          </div>
          <input
            type="checkbox"
            checked={soundAlerts}
            onChange={e => setSoundAlerts(e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer' }}
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: 0 }} />

        {/* Desktop Notifications */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="#059669" /> Browser Desktop Notifications
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
              Show system notifications even when the browser tab is minimized.
            </div>
          </div>
          <input
            type="checkbox"
            checked={desktopNotifs}
            onChange={e => setDesktopNotifs(e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer' }}
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: 0 }} />

        {/* Dashboard Auto-Refresh Rate */}
        <div>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: 4 }}>
            <RefreshCw size={16} color="#8b5cf6" style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Dashboard Sync Frequency
          </label>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 8 }}>
            Interval at which your available orders and active deadlines poll for updates.
          </div>
          <select
            value={autoRefreshInterval}
            onChange={e => setAutoRefreshInterval(e.target.value)}
            style={{ width: '220px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', background: 'white' }}
          >
            <option value="10">Every 10 seconds (Fast)</option>
            <option value="15">Every 15 seconds (Standard)</option>
            <option value="30">Every 30 seconds</option>
          </select>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: 0 }} />

        {/* Inactivity Security Reminder */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="#10b981" /> 30-Minute Inactivity Protection Policy
          </div>
          <p style={{ margin: 0, fontSize: '0.83rem', color: '#64748b', lineHeight: 1.4 }}>
            Your portal will automatically set your status to Offline after 30 minutes of inactivity to safeguard against missed response windows. This policy is globally enforced.
          </p>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start', padding: '10px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Save size={16} /> Save Preferences
        </button>
      </form>
    </div>
  );
}