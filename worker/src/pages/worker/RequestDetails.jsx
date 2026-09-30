import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  XCircle, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { workerApi } from '../../api/worker';

export default function RequestDetails() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [remainingSecs, setRemainingSecs] = useState(600);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  useEffect(() => {
    workerApi.getAvailableRequests()
      .then(res => {
        const order = (res.orders || []).find(r => r.id === requestId);
        if (order) {
          setReq(order);
          setRemainingSecs(order.remainingSeconds || 600);
        } else {
          setError('Order offer not found or 10-minute response window has expired.');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load request details');
        setLoading(false);
      });
  }, [requestId]);

  // Countdown ticker
  useEffect(() => {
    if (remainingSecs <= 0) return;
    const ticker = setInterval(() => {
      setRemainingSecs(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(ticker);
  }, [remainingSecs]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await workerApi.acceptJob(req.id);
      if (res?.success) {
        navigate(`/worker/jobs/${req.id}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to accept order. It may have expired.');
      navigate('/worker/requests');
    } finally {
      setAccepting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason) {
      alert('Please select a mandatory rejection reason.');
      return;
    }

    setSubmittingReject(true);
    try {
      await workerApi.rejectJob(req.id, rejectionReason, rejectionNote);
      alert('Order declined and returned to available pool.');
      navigate('/worker/requests');
    } catch (err) {
      alert(err.message || 'Failed to decline order');
    } finally {
      setSubmittingReject(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading request details...
      </div>
    );
  }

  if (error || !req) {
    return (
      <div style={{ padding: '32px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', textAlign: 'center' }}>
        <div>{error || 'Request not found'}</div>
        <button onClick={() => navigate('/worker/requests')} className="btn btn-outline" style={{ marginTop: 12 }}>
          Back to Available Requests
        </button>
      </div>
    );
  }

  const workerPayout = (req.workerEarningsPaise || Math.round(req.pricePaise * 0.8)) / 100;
  const mins = Math.floor(remainingSecs / 60);
  const secs = remainingSecs % 60;
  const timerFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <button
        className="btn icon-btn"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#f1f5f9', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 600, alignSelf: 'flex-start' }}
        onClick={() => navigate('/worker/requests')}
      >
        <ArrowLeft size={18} /> Back to Available Requests
      </button>

      {/* 10-Minute Response Window Banner */}
      <div style={{
        background: '#eff6ff',
        border: '1.5px solid #3b82f6',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={24} color="#3b82f6" />
          <div>
            <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.95rem' }}>
              10-Minute Response Window Active (Section 6 & 8)
            </div>
            <div style={{ fontSize: '0.84rem', color: '#1d4ed8' }}>
              Please review the service requirements and either Accept or Decline before the timer expires.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.3rem', fontWeight: 800, color: mins < 3 ? '#dc2626' : '#1e3a8a' }}>
          {timerFormatted} remaining
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Service Details & Pre-Acceptance Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="form-card" style={{ padding: '28px', margin: 0 }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
              {req.category || 'Documentation Service'}
            </span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '8px 0 6px', color: '#0f172a' }}>
              {req.serviceName}
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
              Order Reference #{req.id} • Posted {new Date(req.createdAt).toLocaleTimeString()}
            </p>

            <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '20px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.98rem', color: '#1e293b' }}>
                  Customer Identification
                </h4>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Applicant / Customer:</span>
                  <strong style={{ color: '#1e293b' }}>{req.customerName || 'Customer'}</strong>
                </div>
              </div>

              {/* Pre-acceptance privacy notice */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <ShieldAlert size={18} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: '0.84rem', color: '#92400e', lineHeight: 1.4 }}>
                  <strong>Privacy Rule (Section 6):</strong> Customer mobile number, full address, and personal verification files remain encrypted and concealed until you formally accept this order.
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.98rem', color: '#1e293b' }}>
                  Required Deliverables Checklist
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: '#334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Official portal application entry & verification
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Exactly 1 mandatory final receipt/acknowledgement slip upload (Section 12)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Timely submission within agreed working time-slot
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Acceptance Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-card" style={{ padding: '24px', margin: 0, position: 'sticky', top: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b' }}>
              Order Payout Summary
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Your Assigned Payout</span>
              <span style={{ fontWeight: 800, fontSize: '1.35rem', color: '#059669' }}>
                ₹{workerPayout.toFixed(2)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleAccept}
                disabled={accepting || remainingSecs <= 0}
                className="btn btn-primary"
                style={{ padding: '12px', fontWeight: 700, fontSize: '0.95rem' }}
              >
                {accepting ? 'Accepting & Unlocking...' : 'Accept Order'}
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                className="btn btn-outline"
                style={{ padding: '10px', color: '#dc2626', borderColor: '#fecaca', fontSize: '0.88rem' }}
              >
                Decline Offer
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '14px', lineHeight: 1.4 }}>
              Accepting binds this order to your active queue and unlocks full customer documentation and contact channels.
            </p>
          </div>
        </div>

      </div>

      {/* Mandatory Rejection Reason Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Decline Order Offer
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.4, margin: '0 0 16px' }}>
              Declining will immediately return this order to the marketplace queue. A mandatory reason is required by Section 9 rules.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Select Mandatory Reason <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: 'white' }}
                >
                  <option value="">-- Choose mandatory reason --</option>
                  <option value="Current workload / capacity is full">Current workload / capacity is full</option>
                  <option value="Outside my service domain / skill expertise">Outside my service domain / skill expertise</option>
                  <option value="Offered payout is not acceptable for the complexity">Offered payout is not acceptable for the complexity</option>
                  <option value="Required time slot is unavailable">Required time slot is unavailable</option>
                  <option value="Technical or equipment constraint">Technical or equipment constraint</option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Additional Note (Optional)
                </label>
                <textarea
                  value={rejectionNote}
                  onChange={e => setRejectionNote(e.target.value)}
                  placeholder="Optional context for operations team..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!rejectionReason || submittingReject}
                  className="btn btn-primary"
                  style={{ background: '#dc2626', borderColor: '#dc2626' }}
                >
                  {submittingReject ? 'Submitting...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
