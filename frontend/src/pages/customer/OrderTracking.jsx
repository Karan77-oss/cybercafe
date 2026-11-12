import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, Clock, FileText, MessageCircle, AlertCircle, 
  Calendar, Star, Download, Copy, Shield, CheckCircle2,
  MessageSquare, Paperclip, Send, X, HelpCircle, UploadCloud
} from 'lucide-react';
import { ordersApi } from '../../api/orders';
import { buildUrl } from '../../api/client';

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

  // Chat & Clarification state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [replacementFile, setReplacementFile] = useState(null);
  const [sendingChat, setSendingChat] = useState(false);
  const chatFileRef = useRef(null);
  const chatBottomRef = useRef(null);

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

  const loadChat = async () => {
    try {
      const res = await ordersApi.getOrderChat(effectiveId);
      if (res?.messages) {
        setChatMessages(res.messages);
      }
    } catch (e) {
      console.warn('Failed to load chat:', e);
    }
  };

  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() && !replacementFile) return;
    try {
      setSendingChat(true);
      const formData = new FormData();
      if (chatInput.trim()) formData.append('message', chatInput.trim());
      if (replacementFile) formData.append('file', replacementFile);
      await ordersApi.sendChatMessage(effectiveId, formData);
      setChatInput('');
      setReplacementFile(null);
      if (chatFileRef.current) chatFileRef.current.value = '';
      await loadChat();
      await fetchOrder();
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSendingChat(false);
    }
  };

  useEffect(() => {
    if (effectiveId) {
      fetchOrder();
    }
  }, [effectiveId]);

  // Real-time Server-Sent Events (SSE) Bus Listener & fallback polling
  useEffect(() => {
    if (!effectiveId) return;

    let es = null;
    try {
      const token = localStorage.getItem('cybercafe:token') || localStorage.getItem('token') || '';
      const streamUrl = `/api/events/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      es = new EventSource(streamUrl, { withCredentials: true });

      es.addEventListener('ORDER_STATUS_UPDATED', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.orderId === effectiveId) {
            fetchOrder();
          }
        } catch {
          fetchOrder();
        }
      });

      es.addEventListener('ORDER_CHAT_MESSAGE', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.orderId === effectiveId && payload?.message) {
            setChatMessages(prev => {
              if (prev.some(m => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });
          }
        } catch {}
      });

      es.addEventListener('ORDER_CLARIFICATION_REQUESTED', (e) => {
        fetchOrder();
        loadChat();
      });
    } catch (sseErr) {
      console.warn('[SSE] EventSource init notice:', sseErr);
    }

    const interval = setInterval(() => {
      fetchOrder();
    }, 15000);

    return () => {
      clearInterval(interval);
      if (es) es.close();
    };
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
      const targetUrl = buildUrl(deliv.url || `/orders/${order.id}/deliverables/${deliv.id || 0}/download`);
      
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
      const targetUrl = buildUrl(deliv.url || `/orders/${order.id}/deliverables/0/download`);
      window.open(`${targetUrl}?token=${encodeURIComponent(token || '')}`, '_blank');
    }
  };

  const handleDownloadPlatformReceipt = () => {
    const token = localStorage.getItem('cybercafe:token') || '';
    const receiptUrl = buildUrl(`/orders/${order.id}/receipt${token ? `?token=${encodeURIComponent(token)}` : ''}`);
    window.open(receiptUrl, '_blank');
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

          {/* Section A0: Waiting for Customer Clarification */}
          {order.status === 'WAITING_FOR_CUSTOMER' && (
            <div className="form-card" style={{ margin: 0, border: '2px solid #f59e0b', background: '#fffbeb', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={22} color="#d97706" />
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#92400e', fontWeight: 700 }}>
                  Action Required: Operator Requested Clarification or Replacement Document
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#78350f', margin: '0 0 14px', lineHeight: 1.5 }}>
                Your operator has requested additional clarification or a clearer document scan. Please reply or upload your document so work can resume.
              </p>
              <button
                className="btn btn-primary"
                style={{ background: '#d97706', borderColor: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
                onClick={() => { setShowChatModal(true); loadChat(); }}
              >
                <MessageSquare size={16} /> Reply & Upload Document
              </button>
            </div>
          )}

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

              {/* Dual Receipt Section: Platform Payment Invoice + Official Government Acknowledgment */}
              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Official Application Receipts & Deliverables</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  
                  {/* Receipt 1: Platform Payment Receipt */}
                  <div style={{ padding: '16px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <FileText size={18} color="var(--brand-blue)" />
                        <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Platform Payment Receipt</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                        Official tax invoice with itemized charges, platform fee breakdown, and verified payment confirmation.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ marginTop: '14px', width: '100%', justifyContent: 'center', fontSize: '0.82rem', gap: '6px' }}
                      onClick={handleDownloadPlatformReceipt}
                    >
                      <Download size={14} /> Download Platform Invoice
                    </button>
                  </div>

                  {/* Receipt 2: Official Government Acknowledgment */}
                  <div style={{ padding: '16px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <Shield size={18} color="var(--green, #2ecc71)" />
                        <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Official Government Acknowledgment</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                        Official department submission acknowledgment, registration receipt, or final deliverable certificate.
                      </p>
                    </div>

                    {order.deliverables && order.deliverables.length > 0 ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ marginTop: '14px', width: '100%', justifyContent: 'center', fontSize: '0.82rem', gap: '6px' }}
                        onClick={() => handleDownloadDeliverable(order.deliverables[0])}
                      >
                        <Download size={14} /> Download Official Acknowledgment
                      </button>
                    ) : (
                      <div style={{
                        marginTop: '14px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(230, 126, 34, 0.08)',
                        border: '1px solid rgba(230, 126, 34, 0.25)',
                        color: '#d35400',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        Operator processing official acknowledgment upload
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Deliverable Attachments if any */}
                {order.deliverables && order.deliverables.length > 1 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Additional Supporting Deliverables:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {order.deliverables.slice(1).map((deliv, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'white', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={16} color="var(--brand-blue)" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{deliv.name || deliv.fileName || `Attachment #${idx + 2}`}</span>
                          </div>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            onClick={() => handleDownloadDeliverable(deliv)}
                          >
                            <Download size={12} /> Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
               <div className={`timeline-item ${['IN_PROGRESS', 'RECEIPT_SUBMITTED', 'SUBMITTED', 'COMPLETED'].includes(order.status) ? 'completed' : (order.status === 'ASSIGNED' || order.status === 'ACCEPTED' ? 'active' : '')}`}>
                 <div className="timeline-icon">{['IN_PROGRESS', 'RECEIPT_SUBMITTED', 'SUBMITTED', 'COMPLETED'].includes(order.status) ? <Check size={14}/> : <Clock size={14}/>}</div>
                 <div>
                   <div style={{ fontWeight: 600 }}>Work In Progress</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                     {['RECEIPT_SUBMITTED', 'SUBMITTED', 'COMPLETED'].includes(order.status) ? 'Work completed by operator' : (order.status === 'IN_PROGRESS' ? 'Worker actively processing' : 'Pending start')}
                   </div>
                 </div>
               </div>
               
               {/* 4. Completed & Delivered */}
               <div className={`timeline-item ${['RECEIPT_SUBMITTED', 'SUBMITTED', 'COMPLETED'].includes(order.status) ? 'completed' : (order.status === 'IN_PROGRESS' ? 'active' : '')}`}>
                 <div className="timeline-icon">{['RECEIPT_SUBMITTED', 'SUBMITTED', 'COMPLETED'].includes(order.status) ? <Check size={14}/> : <FileText size={14}/>}</div>
                 <div>
                   <div style={{ fontWeight: 600 }}>Work Completed & Documents Available</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                     {['RECEIPT_SUBMITTED', 'SUBMITTED', 'COMPLETED'].includes(order.status) ? 'Receipt and outputs ready' : 'Pending final submission'}
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
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => { setShowChatModal(true); loadChat(); }}
              >
                 <MessageSquare size={16} /> Chat / Clarify with Worker
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
                  const docUrl = buildUrl(doc.url || `/documents/${doc.id}/download`);
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

      {/* Chat & Clarification Modal */}
      {showChatModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '12px', maxWidth: '520px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} color="var(--brand-blue)" />
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Operator Chat & Clarifications</h3>
              </div>
              <button 
                onClick={() => setShowChatModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '200px', maxHeight: '380px' }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '0.88rem' }}>
                  No messages exchanged yet. Send a message or upload any requested replacement document directly to your operator.
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isCustomer = msg.senderRole === 'CUSTOMER';
                  return (
                    <div 
                      key={msg.id || idx} 
                      style={{ 
                        alignSelf: isCustomer ? 'flex-end' : 'flex-start', 
                        maxWidth: '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isCustomer ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
                        {isCustomer ? 'You' : (msg.senderName || 'Certified Operator')}
                      </span>
                      <div style={{
                        background: isCustomer ? 'var(--brand-blue)' : '#ffffff',
                        color: isCustomer ? '#ffffff' : '#1e293b',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '0.88rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        border: isCustomer ? 'none' : '1px solid #e2e8f0',
                        wordBreak: 'break-word'
                      }}>
                        {msg.message}
                        {msg.attachmentUrl && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: isCustomer ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Paperclip size={14} />
                            <a 
                              href={buildUrl(msg.attachmentUrl)} 
                              target="_blank" 
                              rel="noreferrer" 
                              download={msg.attachmentName || 'document'}
                              style={{ color: isCustomer ? '#ffffff' : 'var(--brand-blue)', fontSize: '0.8rem', textDecoration: 'underline', fontWeight: 600 }}
                            >
                              {msg.attachmentName || 'Download Uploaded File'}
                            </a>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input & Upload */}
            <form onSubmit={handleSendChat} style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: 'white' }}>
              {replacementFile && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#eff6ff', borderRadius: '6px', marginBottom: '8px', fontSize: '0.8rem', color: '#1e40af' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Paperclip size={14} />
                    <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replacementFile.name}</span>
                  </div>
                  <button type="button" onClick={() => { setReplacementFile(null); if (chatFileRef.current) chatFileRef.current.value = ''; }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <X size={14} />
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  ref={chatFileRef}
                  style={{ display: 'none' }}
                  onChange={e => {
                    if (e.target.files?.[0]) setReplacementFile(e.target.files[0]);
                  }}
                />
                <button
                  type="button"
                  onClick={() => chatFileRef.current?.click()}
                  className="btn btn-outline"
                  style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Upload Replacement / Supporting Document"
                >
                  <Paperclip size={16} />
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type reply or explanation..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
                <button
                  type="submit"
                  disabled={sendingChat || (!chatInput.trim() && !replacementFile)}
                  className="btn btn-primary"
                  style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
