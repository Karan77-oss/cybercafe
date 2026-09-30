import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, Clock, FileText, MessageCircle, AlertCircle, 
  Calendar, Star, Download, Copy, Shield, CheckCircle2 
} from 'lucide-react';
import { ordersApi } from '../../api/orders';

export default function OrderTracking() {
  const params = useParams();
  const effectiveId = params.orderId || params.id;
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Reschedule modal/state
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Review state
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Expiry countdown state
  const [timeLeft, setTimeLeft] = useState('');

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getOrder(effectiveId);
      setOrder(res.order);
      if (res.order?.serviceSnapshot?.review) {
        setReviewSubmitted(true);
      }
    } catch (e) {
      setError(e.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveId) {
      fetchOrder();
    }
  }, [effectiveId]);

  // Auto-poll every 10 seconds so customer sees receipt without manual refresh
  useEffect(() => {
    if (!effectiveId) return;
    const interval = setInterval(() => {
      fetchOrder();
    }, 10000);
    return () => clearInterval(interval);
  }, [effectiveId]);

  // 24-Hour Expiry Timer
  useEffect(() => {
    if (!order) return;

    const calculateTimeLeft = () => {
      const expiresAtStr = order.serviceSnapshot?.expiresAt;
      const expireTime = expiresAtStr 
        ? new Date(expiresAtStr).getTime() 
        : (order.createdAt ? new Date(order.createdAt).getTime() + (24 * 60 * 60 * 1000) : NaN);
      
      if (isNaN(expireTime)) {
        setTimeLeft('24h 00m 00s');
        return;
      }

      const diff = expireTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('00h 00m 00s (Expired)');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [order]);

  const handleAcceptSlot = async () => {
    setActionLoading(true);
    try {
      const res = await ordersApi.acceptTimeSlot(effectiveId);
      setOrder(res.order);
    } catch (e) {
      alert(e.message || 'Failed to accept time slot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReschedule = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await ordersApi.rescheduleTimeSlot(effectiveId, {
        rescheduleNote,
        requestedTime
      });
      setOrder(res.order);
      setShowReschedule(false);
    } catch (e) {
      alert(e.message || 'Failed to request reschedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await ordersApi.submitReview(effectiveId, {
        rating,
        comment: reviewComment
      });
      setOrder(res.order);
      setReviewSubmitted(true);
    } catch (e) {
      alert(e.message || 'Failed to submit review');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !order) return <div style={{ padding: '60px', textAlign: 'center' }}><h2>Loading order details...</h2></div>;
  if (error) return (
    <div style={{ padding: '60px', textAlign: 'center', color: 'red' }}>
      <AlertCircle size={40} style={{ margin: '0 auto 16px' }} />
      <h2>{error}</h2>
      <button className="btn btn-outline" style={{ marginTop: '16px' }} onClick={() => navigate('/orders')}>Back to Orders</button>
    </div>
  );
  if (!order) return <div style={{ padding: '60px', textAlign: 'center' }}><h2>Order Not Found</h2></div>;

  const snapshot = order.serviceSnapshot || {};
  const scheduling = snapshot.scheduling || { status: 'NONE' };
  const completion = snapshot.completion || {};
  const review = snapshot.review || null;

  const getStatusClass = (status) => {
    if (status === 'COMPLETED') return 'completed';
    if (status === 'ASSIGNED' || status === 'IN_PROGRESS') return 'in-progress';
    if (status === 'CANCELLED') return 'cancelled';
    return 'pending';
  };

  const copyReferenceNumber = (ref) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleDownloadDeliverable = async (deliv) => {
    try {
      const token = localStorage.getItem('cybercafe:token');
      const targetUrl = deliv.url || `/api/orders/${order.id}/deliverables/${deliv.id || 0}/download`;
      
      const res = await fetch(targetUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = deliv.fileName || deliv.name || `Order_${order.id}_Receipt.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        const authParam = token ? `?token=${encodeURIComponent(token)}` : '';
        const fallbackUrl = targetUrl.includes('?') ? `${targetUrl}&token=${encodeURIComponent(token || '')}` : `${targetUrl}${authParam}`;
        window.open(fallbackUrl, '_blank');
      }
    } catch (err) {
      console.error('Download error:', err);
      const token = localStorage.getItem('cybercafe:token');
      const targetUrl = deliv.url || `/api/orders/${order.id}/deliverables/0/download`;
      window.open(`${targetUrl}?token=${encodeURIComponent(token || '')}`, '_blank');
    }
  };

  return (
    <div>
      <button className="btn icon-btn" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => navigate('/orders')}>
        <ArrowLeft size={18}/> Back to Orders
      </button>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
             <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Order #{order.orderNumber || order.id}</h1>
             <span className={`status-badge ${getStatusClass(order.status)}`}>{order.status}</span>
          </div>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>{snapshot.name}</h3>
          <p className="text-muted" style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>
            Created: {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'} | Amount Paid: ₹{(((order.pricing?.pricePaise) || order.pricePaise || 0) / 100).toFixed(2)}
          </p>
        </div>

        {/* 24-Hour Expiry Window Countdown */}
        {order.status !== 'COMPLETED' && (
          <div style={{
            background: order.status === 'CANCELLED' ? 'rgba(231,76,60,0.1)' : 'rgba(83,100,249,0.08)',
            border: order.status === 'CANCELLED' ? '1px solid var(--red)' : '1px solid var(--brand-blue)',
            padding: '12px 20px',
            borderRadius: '12px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              24-Hour Expiry Window
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: order.status === 'CANCELLED' ? 'var(--red)' : 'var(--brand-blue)' }}>
              {order.status === 'CANCELLED' ? 'Expired / Cancelled' : timeLeft}
            </div>
            {order.status === 'CANCELLED' && (
              <div style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: '4px' }}>
                Full refund credited to your Platform Wallet
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1.6, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Section A1: Available / Unassigned Order State */}
          {(!order.worker || order.status === 'AVAILABLE') && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <div className="form-card" style={{ margin: 0, border: '1px solid #93c5fd', background: 'rgba(59, 130, 246, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock size={20} color="var(--brand-blue)" />
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--brand-blue)' }}>Order Placed • Waiting for Operator Acceptance</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: '0 0 8px', lineHeight: 1.5 }}>
                Your payment was successful. Your order is available in our verified operator queue.
              </p>
              <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Next Step:</strong> As soon as an operator accepts your order, they will directly select and provide your working time slot.
              </div>
            </div>
          )}

          {/* Section A2: Worker Assigned, but time slot pending */}
          {order.worker && order.status !== 'AVAILABLE' && !scheduling.timeSlot && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <div className="form-card" style={{ margin: 0, border: '1px solid #bfdbfe', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={20} color="var(--brand-blue)" />
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Work Time Slot</h3>
                </div>
                <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, background: '#eff6ff', color: 'var(--brand-blue)' }}>
                  Pending Operator Scheduling
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
                Operator <strong>{order.worker.name}</strong> has accepted your order and will select and provide your working time slot shortly.
              </p>
            </div>
          )}

          {/* Section A3: Work Time Slot & Mutual Scheduling (Only shown after worker provides time slot) */}
          {order.worker && order.status !== 'AVAILABLE' && scheduling.timeSlot && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <div className="form-card" style={{ margin: 0, border: '1px solid var(--brand-blue)', background: 'rgba(83, 100, 249, 0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={20} color="var(--brand-blue)" />
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Work Time Slot</h3>
                </div>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontWeight: 600,
                  background: scheduling.status === 'ACCEPTED' ? 'rgba(46,204,113,0.15)' : (scheduling.status === 'RESCHEDULE_REQUESTED' ? 'rgba(230,126,34,0.15)' : 'rgba(59,130,246,0.15)'),
                  color: scheduling.status === 'ACCEPTED' ? 'var(--green)' : (scheduling.status === 'RESCHEDULE_REQUESTED' ? '#d35400' : 'var(--brand-blue)')
                }}>
                  {scheduling.status === 'ACCEPTED' ? 'Time Slot Confirmed' : (scheduling.status === 'RESCHEDULE_REQUESTED' ? 'Reschedule Requested' : 'Proposed by Operator')}
                </span>
              </div>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                This service includes dedicated operator coordination. Please review or adjust your working window below.
              </p>

              <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {scheduling.status === 'ACCEPTED' ? 'Agreed Working Window:' : 'Working Window:'}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>
                  {scheduling.timeSlot}
                </div>
                {scheduling.rescheduleNote && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--brand-blue)', marginTop: '6px' }}>
                    Note: {scheduling.rescheduleNote}
                  </div>
                )}
              </div>

              {scheduling.status !== 'ACCEPTED' ? (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleAcceptSlot} 
                    disabled={actionLoading}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Check size={16} /> Accept Proposed Slot
                  </button>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => setShowReschedule(!showReschedule)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Request Reschedule
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green)', fontSize: '0.9rem', fontWeight: 500 }}>
                    <CheckCircle2 size={18} /> You and the operator have agreed on this work slot.
                  </div>
                  <div>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => setShowReschedule(!showReschedule)}
                      style={{ fontSize: '0.8rem', padding: '4px 10px', marginTop: '4px' }}
                    >
                      Need to Change Time? Request Reschedule
                    </button>
                  </div>
                </div>
              )}

              {/* Reschedule Form */}
              {showReschedule && (
                <form onSubmit={handleRequestReschedule} style={{ marginTop: '16px', padding: '16px', background: 'white', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Mutual Rescheduling</h4>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="form-label">Convenient Time / Duration</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Tomorrow 10:00 AM – 11:00 AM" 
                      value={requestedTime} 
                      onChange={e => setRequestedTime(e.target.value)}
                      required 
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="form-label">Reason / Instructions</label>
                    <textarea 
                      className="form-input" 
                      rows={2} 
                      placeholder="e.g. In office until 6 PM; please call after 7:30 PM" 
                      value={rescheduleNote} 
                      onChange={e => setRescheduleNote(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setShowReschedule(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ flex: 1, justifyContent: 'center' }}>
                      {actionLoading ? 'Sending...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Section B: Receipt Ready / Completed Work Delivery */}
          {/* Show whenever worker has submitted receipt, regardless of exact status */}
          {(order.status === 'COMPLETED' || order.status === 'RECEIPT_SUBMITTED' || order.status === 'WAITING_FOR_CUSTOMER') && (
            <div className="form-card" style={{ margin: 0, border: '2px solid var(--green)', background: 'rgba(46, 204, 113, 0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <CheckCircle2 size={28} color={order.status === 'COMPLETED' ? 'var(--green)' : 'var(--brand-blue)'} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: order.status === 'COMPLETED' ? 'var(--green)' : 'var(--brand-blue)' }}>
                    {order.status === 'COMPLETED' ? 'Work Completed & Verified' : '📥 Receipt Ready — Download Now!'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {order.status === 'COMPLETED'
                      ? 'Your service has been finalized. Final receipt and application proofs are ready for download.'
                      : 'The operator has uploaded your receipt and deliverables. Please download to confirm and release their payment.'}
                  </p>
                </div>
              </div>

              {/* Reference / Application Number */}
              <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official Application / Reference Number:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '1px' }}>
                    {completion.referenceNumber || 'CCM-APP-' + order.id.slice(-6).toUpperCase()}
                  </span>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => copyReferenceNumber(completion.referenceNumber || 'CCM-APP-' + order.id.slice(-6).toUpperCase())}
                  >
                    <Copy size={12} /> {copiedRef ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Worker Completion Message */}
              <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Worker Completion Note:</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px', fontStyle: 'italic' }}>
                  "{completion.completionMessage || 'Application submitted successfully on the official portal. Payment acknowledged and acknowledgment slip attached.'}"
                </div>
              </div>

              {/* Deliverable Downloads */}
              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Deliverable Documents & Receipts</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {order.deliverables && order.deliverables.length > 0 ? (
                    order.deliverables.map((deliv, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={18} color="var(--brand-blue)" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{deliv.name || deliv.fileName || `Deliverable Document #${idx + 1}`}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{deliv.size || 'Verified Output'} • {deliv.isMandatory ? '★ Official Final Receipt' : 'Submission Proof'}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <a
                            href={deliv.url ? (deliv.url.startsWith('http') ? deliv.url : `${deliv.url}?token=${localStorage.getItem('cybercafe:token') || ''}`) : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                          >
                            View
                          </a>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => handleDownloadDeliverable(deliv)}
                          >
                            <Download size={14} /> Download
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={18} color="var(--brand-blue)" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Official Final Receipt</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Digitally Verified PDF Receipt & Acknowledgement</div>
                        </div>
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleDownloadDeliverable({ name: 'Official_Receipt.pdf', url: `/api/orders/${order.id}/deliverables/latest/download` })}
                      >
                        <Download size={14} /> Download Receipt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section C: Customer Rating & Review (Section 15) */}
          {order.status === 'COMPLETED' && (
            <div className="form-card" style={{ margin: 0 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Worker Rating & Feedback</h3>
              {reviewSubmitted || review ? (
                <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        size={18} 
                        fill={star <= ((review?.rating) || rating) ? '#f39c12' : 'none'} 
                        color="#f39c12" 
                      />
                    ))}
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: '8px' }}>
                      {((review?.rating) || rating)} / 5 Stars
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    "{review?.comment || reviewComment || 'Great service and quick completion!'}"
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Submitted on {review?.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Today'}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview}>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                    How was your experience with {order.worker?.name || 'the cyber cafe worker'}?
                  </p>
                  
                  {/* Star picker */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        <Star 
                          size={24} 
                          fill={star <= rating ? '#f39c12' : 'none'} 
                          color="#f39c12" 
                        />
                      </button>
                    ))}
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label className="form-label">Written Feedback (Optional)</label>
                    <textarea 
                      className="form-input" 
                      rows={3} 
                      placeholder="Share your experience (speed, communication, accuracy)..."
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ padding: '8px 20px' }}>
                    {actionLoading ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Section D: Tracking Timeline (Section 11) */}
          <div className="form-card" style={{ margin: 0 }}>
             <h3 style={{ marginBottom: '20px' }}>Lifecycle Timeline</h3>
             
             <div className="timeline">
               {/* 1. Payment Successful */}
               <div className="timeline-item completed">
                 <div className="timeline-icon"><Check size={14}/></div>
                 <div>
                   <div style={{ fontWeight: 600 }}>Payment Successful & Order Created</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleString()}</div>
                 </div>
               </div>
               
               {/* 2. Worker Assignment */}
               <div className={`timeline-item ${order.worker ? 'completed' : 'active'}`}>
                 <div className="timeline-icon">{order.worker ? <Check size={14}/> : <Clock size={14}/>}</div>
                 <div>
                   <div style={{ fontWeight: 600 }}>
                     {order.worker ? `Worker Assigned (${order.worker.name})` : 'Finding Suitable Worker'}
                   </div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                     {order.worker ? 'Worker notified & ready to accept' : 'Allocating available professional'}
                   </div>
                 </div>
               </div>

               {/* 3. Work In Progress */}
               <div className={`timeline-item ${order.status === 'IN_PROGRESS' || order.status === 'COMPLETED' ? 'completed' : (order.status === 'ASSIGNED' ? 'active' : '')}`}>
                 <div className="timeline-icon">{order.status === 'COMPLETED' ? <Check size={14}/> : <Clock size={14}/>}</div>
                 <div>
                   <div style={{ fontWeight: 600 }}>Work In Progress</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                     {order.status === 'COMPLETED' ? 'Completed' : (order.status === 'IN_PROGRESS' ? 'Worker actively processing' : 'Pending start')}
                   </div>
                 </div>
               </div>
               
               {/* 4. Completed & Delivered */}
               <div className={`timeline-item ${order.status === 'COMPLETED' ? 'completed' : ''}`}>
                 <div className="timeline-icon">{order.status === 'COMPLETED' ? <Check size={14}/> : <FileText size={14}/>}</div>
                 <div>
                   <div style={{ fontWeight: 600 }}>Work Completed & Documents Available</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                     {order.status === 'COMPLETED' ? 'Receipt and outputs ready' : 'Pending final submission'}
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
        
        {/* Right Sidebar: Worker & Order Info */}
        <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {order.worker && (
            <div className="form-card" style={{ padding: '20px', margin: 0 }}>
              <h4 style={{ marginBottom: '14px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Worker</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <img src={`https://ui-avatars.com/api/?name=${order.worker.name}&background=random`} alt="worker" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                <div>
                   <div style={{ fontSize: '1rem', fontWeight: 600 }}>{order.worker.name}</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--brand-blue)' }}>Verified Cyber Cafe Pro</div>
                </div>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => alert(`Direct phone/chat connection: ${order.worker.phone || 'Available during scheduled work time slot'}`)}
              >
                 <MessageCircle size={16} /> Contact Worker
              </button>
            </div>
          )}
          
          <div className="form-card" style={{ padding: '20px', margin: 0 }}>
            <h4 style={{ marginBottom: '14px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Order Summary</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
              <span className="text-muted">Service</span>
              <span style={{ fontWeight: 500, textAlign: 'right' }}>{snapshot.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
              <span className="text-muted">Category</span>
              <span style={{ fontWeight: 500 }}>{snapshot.category || 'Online Service'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Total Paid</span>
              <span style={{ fontWeight: 700, color: 'var(--brand-blue)' }}>₹{(((order.pricing?.pricePaise) || order.pricePaise || 0) / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Customer Uploaded Application Documents */}
          {order.documents && order.documents.length > 0 && (
            <div className="form-card" style={{ margin: 0, padding: '16px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> Submitted Documents ({order.documents.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {order.documents.map((doc, idx) => {
                  const token = localStorage.getItem('cybercafe:token');
                  const docUrl = doc.url || `/api/documents/${doc.id}/download`;
                  const authenticatedViewUrl = `${docUrl}${token ? (docUrl.includes('?') ? `&token=${encodeURIComponent(token)}` : `?token=${encodeURIComponent(token)}`) : ''}`;
                  const docDisplayName = doc.name || doc.fileName || `Document #${idx + 1}`;
                  return (
                    <div key={doc.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-main)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={docDisplayName}>
                        {docDisplayName}
                      </span>
                      <a
                        href={authenticatedViewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', textDecoration: 'none' }}
                      >
                        Download
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 16: Document Privacy Notice */}
          <div className="form-card" style={{ padding: '16px', margin: 0, background: 'rgba(83, 100, 249, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={18} color="var(--brand-blue)" />
              <h5 style={{ margin: 0, fontSize: '0.9rem' }}>Customer Document Privacy</h5>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Uploaded documents are accessible only to your assigned verified worker for service execution. Working documents are automatically purged after service completion per the platform retention policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
