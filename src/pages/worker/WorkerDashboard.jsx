import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Briefcase, 
  Clock, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { workerApi } from '../../api/worker';
import { useAuth } from '../../contexts/AuthContext';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = async () => {
    try {
      const [statsRes, jobsRes, reqsRes] = await Promise.all([
        workerApi.getStats(),
        workerApi.getMyJobs(),
        workerApi.getAvailableRequests()
      ]);

      if (statsRes?.stats) {
        setStats(statsRes.stats);
      }

      const allJobs = jobsRes?.jobs || [];
      const active = allJobs.filter(j => ['ACCEPTED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'].includes(j.status));
      const completed = allJobs.filter(j => j.status === 'COMPLETED');

      setActiveJobs(active);
      setCompletedJobs(completed);
      setAvailableCount((reqsRes?.orders || []).length);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load worker dashboard data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 20000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading your workspace dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', textAlign: 'center' }}>
        <AlertCircle size={24} style={{ marginBottom: 8 }} />
        <div>{error}</div>
        <button onClick={loadDashboardData} className="btn btn-outline" style={{ marginTop: 12 }}>Retry</button>
      </div>
    );
  }

  const walletPaise = stats?.walletBalancePaise || 0;
  const pendingPaise = stats?.pendingEarningsPaise || 0;
  const todayEarningsPaise = stats?.todayEarningsPaise || 0;
  const rating = stats?.rating || 4.9;
  const isOnline = stats?.isOnline !== false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
            Welcome back, {user?.name || 'Worker'}
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Monitor your operational queue, active job deadlines, and daily revenue.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/worker/requests" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} />
            Available Orders ({availableCount})
          </Link>
          <Link to="/worker/withdrawals" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={18} />
            Wallet & Withdraw
          </Link>
        </div>
      </div>

      {/* Section 5 & 20: Exactly 8 Dashboard Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        {/* Card 1: Available Orders */}
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Available Orders</span>
            <FileText size={20} color="#3b82f6" />
          </div>
          <div className="stat-card-value" style={{ color: '#1e293b' }}>{availableCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
            <Link to="/worker/requests" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
              View in Requests &rarr;
            </Link>
          </div>
        </div>

        {/* Card 2: Active Orders */}
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Active Orders</span>
            <Briefcase size={20} color="#f59e0b" />
          </div>
          <div className="stat-card-value" style={{ color: '#f59e0b' }}>{activeJobs.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>In progress or accepted</div>
        </div>

        {/* Card 3: Today's Work */}
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Today's Work</span>
            <CheckCircle2 size={20} color="#10b981" />
          </div>
          <div className="stat-card-value" style={{ color: '#10b981' }}>{stats?.todayCompletedJobs || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Orders completed today</div>
        </div>

        {/* Card 4: Today's Earnings */}
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Today's Earnings</span>
            <TrendingUp size={20} color="#059669" />
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            ₹{(todayEarningsPaise / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Net earnings credited</div>
        </div>

        {/* Card 5: Pending Earnings */}
        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Pending Earnings</span>
            <Clock size={20} color="#8b5cf6" />
          </div>
          <div className="stat-card-value" style={{ color: '#8b5cf6' }}>
            ₹{(pendingPaise / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Held until completion</div>
        </div>

        {/* Card 6: Wallet Balance */}
        <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Wallet Balance</span>
            <Wallet size={20} color="#0284c7" />
          </div>
          <div className="stat-card-value" style={{ color: '#0284c7' }}>
            ₹{(walletPaise / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
            <Link to="/worker/withdrawals" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
              Withdraw funds &rarr;
            </Link>
          </div>
        </div>

        {/* Card 7: Average Rating */}
        <div className="stat-card" style={{ borderLeft: '4px solid #eab308' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Average Rating</span>
            <Star size={20} color="#eab308" fill="#eab308" />
          </div>
          <div className="stat-card-value" style={{ color: '#ca8a04', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            {rating}
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>/ 5.0</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Based on verified reviews</div>
        </div>

        {/* Card 8: Online/Offline Status (Display Only on Dashboard) */}
        <div className="stat-card" style={{ borderLeft: `4px solid ${isOnline ? '#10b981' : '#94a3b8'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Availability Status</span>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: isOnline ? '#10b981' : '#94a3b8',
              boxShadow: isOnline ? '0 0 8px #10b981' : 'none'
            }} />
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.35rem', color: isOnline ? '#065f46' : '#64748b' }}>
            {isOnline ? '🟢 Online' : '⚪ Offline'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
            Toggle via top navigation bar
          </div>
        </div>
      </div>

      {/* Main Grid: Active Orders & Completed Orders Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Active Orders (Full list with remaining deadline) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="form-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem' }}>Active Orders ({activeJobs.length})</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Orders requiring your immediate work, time-slot scheduling, and deliverable submission.
                </p>
              </div>
              <Link to="/worker/jobs" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                Open Workspace
              </Link>
            </div>

            {activeJobs.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '10px' }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, color: '#475569', fontSize: '1rem' }}>No active orders in your queue</div>
                <div style={{ fontSize: '0.85rem', marginTop: 4 }}>Check Available Orders to pick up new customer requests.</div>
                <Link to="/worker/requests" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>
                  Browse Available Requests
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeJobs.map(job => (
                  <div 
                    key={job.id} 
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      transition: 'box-shadow 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                          {job.serviceName}
                        </span>
                        <span className={`w-badge ${job.status.toLowerCase().replace('_', '-')}`}>
                          {job.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span>Customer: <strong>{job.customerName || 'Customer'}</strong></span>
                        <span>Payout: <strong style={{ color: '#059669' }}>₹{((job.workerEarningsPaise || Math.round(job.pricePaise * 0.8)) / 100).toFixed(2)}</strong></span>
                        {job.timeSlot && (
                          <span style={{ color: '#3b82f6', fontWeight: 600 }}>
                            Slot: {job.timeSlot.startTime} - {job.timeSlot.endTime}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <Link 
                        to={`/worker/jobs/${job.id}`} 
                        className="btn btn-primary" 
                        style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        Workspace <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Orders List */}
          <div className="form-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem' }}>Completed Orders History</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Privacy applied: Customer personal records and contact info are strictly masked.
                </p>
              </div>
            </div>

            {completedJobs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                No completed orders yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.8rem' }}>
                      <th style={{ padding: '10px 0' }}>ORDER ID</th>
                      <th style={{ padding: '10px 0' }}>SERVICE</th>
                      <th style={{ padding: '10px 0' }}>COMPLETED AT</th>
                      <th style={{ padding: '10px 0' }}>PAYOUT</th>
                      <th style={{ padding: '10px 0', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedJobs.slice(0, 5).map(job => (
                      <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                        <td style={{ padding: '14px 0', fontWeight: 600, color: '#3b82f6' }}>#{job.id.slice(0, 10)}</td>
                        <td style={{ padding: '14px 0', color: '#1e293b' }}>{job.serviceName}</td>
                        <td style={{ padding: '14px 0', color: '#64748b', fontSize: '0.8rem' }}>
                          {job.completedAt ? new Date(job.completedAt).toLocaleDateString() : 'Recent'}
                        </td>
                        <td style={{ padding: '14px 0', fontWeight: 700, color: '#059669' }}>
                          ₹{((job.workerEarningsPaise || Math.round(job.pricePaise * 0.8)) / 100).toFixed(2)}
                        </td>
                        <td style={{ padding: '14px 0', textAlign: 'right' }}>
                          <Link to={`/worker/jobs/${job.id}`} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                            View Proof
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Deadlines, Verified Anonymous Reviews, Quick Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Actions & Policy reminders */}
          <div className="form-card" style={{ padding: '20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#1e293b' }}>Operational Rules</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.83rem', color: '#475569', lineHeight: 1.4 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Clock size={16} color="#3b82f6" style={{ marginTop: 2, flexShrink: 0 }} />
                <span><strong>10-Min Offer Window:</strong> Available orders must be accepted or rejected within 10 minutes.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={16} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                <span><strong>Mandatory Deliverable:</strong> Exactly 1 primary receipt/output is required before finishing.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertCircle size={16} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
                <span><strong>Post-Completion Privacy:</strong> Customer contact info and documents are wiped upon completion.</span>
              </div>
            </div>
          </div>

          {/* Section 14: Customer Ratings & Feedback (Anonymous) */}
          <div className="form-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>Customer Feedback</h4>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Anonymous</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(stats?.reviews && stats.reviews.length > 0) ? stats.reviews.slice(0, 3).map(rev => (
                <div key={rev.id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 4 }}>
                    {[...Array(rev.rating || 5)].map((_, i) => (
                      <Star key={i} size={13} color="#eab308" fill="#eab308" />
                    ))}
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 6 }}>
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.83rem', color: '#334155', fontStyle: 'italic' }}>
                    "{rev.comment}"
                  </p>
                </div>
              )) : (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>
                  No customer reviews yet.
                </div>
              )}
            </div>
          </div>

          {/* Proposal Shortcut */}
          <div className="form-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', border: '1px solid #bfdbfe' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#1e3a8a' }}>Offer Custom Services</h4>
            <p style={{ margin: '0 0 14px', fontSize: '0.83rem', color: '#3b82f6' }}>
              Have local expertise in a specialized form or service? Propose it to Admin for platform listing.
            </p>
            <Link to="/worker/services/propose" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block', fontSize: '0.85rem' }}>
              Propose New Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
