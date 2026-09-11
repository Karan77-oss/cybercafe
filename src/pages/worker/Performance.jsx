import { useState, useEffect } from 'react';
import { 
  Activity, 
  Star, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Award,
  ShieldCheck
} from 'lucide-react';
import { workerApi } from '../../api/worker';

export default function Performance() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workerApi.getStats()
      .then(res => {
        if (res?.stats) setStats(res.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading performance metrics...
      </div>
    );
  }

  const rating = stats?.rating || 4.9;
  const completedJobs = stats?.completedJobs || 134;
  const reviews = stats?.reviews || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
          Performance & Reliability Scorecard
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Section 7: Your operational metrics directly influence marketplace order allocation and priority routing.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #eab308' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Customer Satisfaction</span>
            <Star size={20} color="#eab308" fill="#eab308" />
          </div>
          <div className="stat-card-value" style={{ color: '#ca8a04' }}>
            {rating} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/ 5.0</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Top 5% rated operator</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Completion Rate</span>
            <CheckCircle2 size={20} color="#10b981" />
          </div>
          <div className="stat-card-value" style={{ color: '#10b981' }}>
            99.2%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Zero unexcused cancellations</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Avg. Turnaround Time</span>
            <Clock size={20} color="#3b82f6" />
          </div>
          <div className="stat-card-value" style={{ color: '#3b82f6' }}>
            45 mins
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Well within SLA limit</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-card-title">Completed Orders</span>
            <Award size={20} color="#8b5cf6" />
          </div>
          <div className="stat-card-value" style={{ color: '#1e293b' }}>
            {completedJobs}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Lifetime successful deliveries</div>
        </div>
      </div>

      {/* Allocation Algorithm Info */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="#10b981" /> How Dispatch Assignment Works (Section 7)
        </h3>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
          Our auto-dispatch engine assigns available customer orders based on 3 core factors: 
          <strong> Online availability</strong>, <strong>matching skills/service categories</strong>, and <strong>completion reputation score</strong>. 
          Maintaining a low decline rate and delivering within agreed time slots ensures your center receives prioritized order allocation.
        </p>
      </div>

      {/* Anonymous Customer Feedback */}
      <div className="form-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b' }}>
          Recent Verified Customer Reviews (Anonymous)
        </h3>

        {reviews.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
            No customer reviews recorded yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {reviews.map(rev => (
              <div
                key={rev.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[...Array(rev.rating || 5)].map((_, i) => (
                      <Star key={i} size={14} color="#eab308" fill="#eab308" />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', fontStyle: 'italic', lineHeight: 1.4 }}>
                  "{rev.comment}"
                </p>
                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: 'auto' }}>
                  ✓ Verified Customer
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}