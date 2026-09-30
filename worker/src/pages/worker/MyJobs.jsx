import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { workerApi } from '../../api/worker';

export default function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  const loadJobs = async () => {
    try {
      const res = await workerApi.getMyJobs();
      setJobs(res?.jobs || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load your jobs');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading your assigned jobs...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', textAlign: 'center' }}>
        <div>{error}</div>
        <button onClick={loadJobs} className="btn btn-outline" style={{ marginTop: 12 }}>Retry</button>
      </div>
    );
  }

  const filteredJobs = jobs.filter(j => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return ['ACCEPTED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'].includes(j.status);
    if (activeTab === 'COMPLETED') return j.status === 'COMPLETED';
    return true;
  });

  const activeCount = jobs.filter(j => ['ACCEPTED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'].includes(j.status)).length;
  const completedCount = jobs.filter(j => j.status === 'COMPLETED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
            My Orders & Jobs ({jobs.length})
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
            Manage your active queue, schedule time slots, upload receipts, and review deliverables.
          </p>
        </div>

        <Link to="/worker/requests" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          + Accept New Orders
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('ALL')}
          style={{
            background: activeTab === 'ALL' ? '#3b82f6' : 'transparent',
            color: activeTab === 'ALL' ? 'white' : '#475569',
            border: 'none',
            borderRadius: '9999px',
            padding: '6px 16px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          All ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('ACTIVE')}
          style={{
            background: activeTab === 'ACTIVE' ? '#f59e0b' : 'transparent',
            color: activeTab === 'ACTIVE' ? 'white' : '#475569',
            border: 'none',
            borderRadius: '9999px',
            padding: '6px 16px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          Active Work ({activeCount})
        </button>
        <button
          onClick={() => setActiveTab('COMPLETED')}
          style={{
            background: activeTab === 'COMPLETED' ? '#10b981' : 'transparent',
            color: activeTab === 'COMPLETED' ? 'white' : '#475569',
            border: 'none',
            borderRadius: '9999px',
            padding: '6px 16px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Job Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredJobs.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: '1px dashed #cbd5e1',
            color: '#64748b'
          }}>
            <Briefcase size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, color: '#334155' }}>No orders found in this tab</div>
            <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
              Switch tabs or check Available Orders to add work to your active queue.
            </div>
          </div>
        ) : (
          filteredJobs.map(job => {
            const isCompleted = job.status === 'COMPLETED';
            const isCorrection = job.status === 'CORRECTION_REQUIRED';
            const payout = (job.workerEarningsPaise || Math.round(job.pricePaise * 0.8)) / 100;

            return (
              <div
                key={job.id}
                className="form-card"
                style={{
                  padding: '18px 24px',
                  margin: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  borderLeft: `4px solid ${isCompleted ? '#10b981' : isCorrection ? '#ef4444' : '#f59e0b'}`
                }}
              >
                {/* Left info */}
                <div style={{ flex: '2 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                      #{job.orderNumber || job.id}
                    </span>
                    <span className={`w-badge ${job.status.toLowerCase().replace('_', '-')}`}>
                      {job.status}
                    </span>
                    {job.timeSlot && (
                      <span style={{ fontSize: '0.78rem', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        Slot: {job.timeSlot.startTime} - {job.timeSlot.endTime}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                    {job.serviceName}
                  </h3>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.84rem', color: '#64748b', flexWrap: 'wrap' }}>
                    <span>Customer: <strong style={{ color: '#334155' }}>{job.customerName || 'Customer'}</strong></span>
                    <span>
                      {isCompleted ? 'Completed:' : 'Deadline:'} <strong style={{ color: '#334155' }}>
                        {isCompleted 
                          ? (job.completedAt ? new Date(job.completedAt).toLocaleString() : 'Done')
                          : (job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Today')}
                      </strong>
                    </span>
                    {job.deliverables && job.deliverables.length > 0 && (
                      <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> Output Uploaded
                      </span>
                    )}
                  </div>
                </div>

                {/* Right payout & CTA */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                      ₹{payout.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {isCompleted ? 'Settled to Wallet' : 'Pending Completion'}
                    </div>
                  </div>

                  <Link
                    to={`/worker/jobs/${job.id}`}
                    className="btn btn-primary"
                    style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isCompleted ? 'View Order Proof' : 'Open Workspace'} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
