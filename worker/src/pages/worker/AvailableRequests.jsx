import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight,
  Radio
} from 'lucide-react';
import { workerApi } from '../../api/worker';

export default function AvailableRequests() {
  const [requests, setRequests] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Rejection modal state
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  const navigate = useNavigate();

  const loadRequests = async () => {
    try {
      const res = await workerApi.getAvailableRequests();
      const rawOrders = res?.orders || [];
      const uniqueOrders = Array.from(new Map(rawOrders.map(o => [o.id, o])).values());
      setRequests(uniqueOrders);
      setIsOnline(res?.isOnline !== false);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load available requests');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  // Accept job
  const handleAccept = async (orderId) => {
    if (!isOnline) {
      alert('You must be Online to accept orders. Please turn Online from the header switch.');
      return;
    }
    setAcceptingId(orderId);
    try {
      const res = await workerApi.acceptJob(orderId);
      if (res?.success) {
        navigate(`/worker/jobs/${orderId}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to accept order. It may have expired or been reassigned.');
      loadRequests();
    } finally {
      setAcceptingId(null);
    }
  };

  // Submit rejection
  const handleConfirmReject = async () => {
    if (!rejectionReason) {
      alert('Please select a rejection reason.');
      return;
    }
    setSubmittingReject(true);
    try {
      await workerApi.rejectJob(rejectingOrder.id, rejectionReason, rejectionNote);
      setRejectingOrder(null);
      setRejectionReason('');
      setRejectionNote('');
      loadRequests();
    } catch (err) {
      alert(err.message || 'Failed to reject order.');
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleGoOnline = async () => {
    try {
      await workerApi.toggleAvailability(true);
      setIsOnline(true);
      loadRequests();
    } catch (err) {
      alert('Could not update status.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading available orders...
      </div>
    );
  }

  const filteredRequests = requests.filter(r => {
    const nameMatch = (r.serviceName || '').toLowerCase().includes(search.toLowerCase()) || 
                      r.id.toLowerCase().includes(search.toLowerCase());
    const catMatch = filterCategory === 'ALL' || r.category === filterCategory;
    return nameMatch && catMatch;
  });

  const categories = ['ALL', ...Array.from(new Set(requests.map(r => r.category).filter(Boolean)))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Offline Alert Banner (Section 4 & 6) */}
      {!isOnline && (
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="#d97706" />
            <div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>
                You are currently OFFLINE
              </div>
              <div style={{ fontSize: '0.85rem', color: '#b45309' }}>
                You will not receive direct order assignments or be able to accept customer requests until you switch to Online.
              </div>
            </div>
          </div>
          <button
            onClick={handleGoOnline}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Radio size={16} /> Go Online Now
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
            Available Orders ({filteredRequests.length})
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
            Orders currently waiting for your acceptance. Section 6 privacy applies: Sensitive documents unlock upon acceptance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 12px',
            background: 'white',
            width: '260px'
          }}>
            <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Search service, order ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.88rem' }}
            />
          </div>

          {categories.length > 2 && (
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px',
                background: 'white',
                fontSize: '0.88rem',
                color: '#334155'
              }}
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* List of Requests */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredRequests.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            border: '1px dashed #cbd5e1',
            color: '#64748b'
          }}>
            <CheckCircle2 size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#334155' }}>No available requests matching your criteria</div>
            <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
              When customers place new orders matching your profile, they will appear here with a 10-minute response window.
            </div>
          </div>
        ) : (
          filteredRequests.map(req => {
            const workerPayout = (req.workerEarningsPaise || Math.round(req.pricePaise * 0.8)) / 100;
            const remainingMins = Math.floor((req.remainingSeconds || 600) / 60);
            const remainingSecs = (req.remainingSeconds || 600) % 60;
            const timerFormatted = `${String(remainingMins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;

            return (
              <div
                key={req.id}
                className="form-card"
                style={{
                  padding: '20px 24px',
                  margin: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '20px',
                  borderLeft: '4px solid #3b82f6',
                  transition: 'box-shadow 0.2s ease'
                }}
              >
                {/* Service Details & Pre-Acceptance Privacy Info */}
                <div style={{ flex: '2 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                      #{req.orderNumber || req.id}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                      {req.category || 'Standard Service'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                    {req.serviceName}
                  </h3>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap' }}>
                    <span>Customer: <strong style={{ color: '#334155' }}>{req.customerName || 'Customer'}</strong></span>
                    <span>Deadline: <strong style={{ color: '#334155' }}>{req.deadline ? new Date(req.deadline).toLocaleDateString() : 'Today'}</strong></span>
                    <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldAlert size={14} /> Personal documents masked until accepted
                    </span>
                  </div>
                </div>

                {/* Section 6 & 8: 10-Minute Response Timer */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: remainingMins < 3 ? '#dc2626' : '#d97706', fontWeight: 700, fontSize: '1.1rem' }}>
                    <Clock size={18} />
                    {timerFormatted}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Response Window
                  </span>
                </div>

                {/* Payout & Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669' }}>
                      ₹{workerPayout.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Your Net Payout</div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setRejectingOrder(req)}
                      className="btn btn-outline"
                      style={{ padding: '8px 14px', fontSize: '0.85rem', color: '#dc2626', borderColor: '#fecaca' }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={acceptingId === req.id || !isOnline}
                      className="btn btn-primary"
                      style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {acceptingId === req.id ? 'Accepting...' : 'Accept Order'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Section 9: Mandatory Rejection Reason Modal */}
      {rejectingOrder && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Decline Order Offer
              </h3>
              <button
                onClick={() => setRejectingOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.4, margin: '0 0 18px' }}>
              Declining will immediately return this order for #{rejectingOrder.orderNumber || rejectingOrder.id} ({rejectingOrder.serviceName}) to the marketplace pool. A reason is required by platform rules.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Select Rejection Reason <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
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
                  placeholder="Optional context for admin review..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRejectingOrder(null)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!rejectionReason || submittingReject}
                  className="btn btn-primary"
                  style={{
                    background: '#dc2626',
                    borderColor: '#dc2626',
                    fontSize: '0.85rem',
                    opacity: (!rejectionReason || submittingReject) ? 0.6 : 1
                  }}
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
