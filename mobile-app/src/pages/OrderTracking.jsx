import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, CheckCircle2, Clock,
  UserCheck, Download, AlertCircle, Phone,
  CreditCard, Sparkles, Loader2, Calendar,
  ShieldCheck, FileText, Check, X, CalendarCheck,
  MessageSquare, Paperclip, Send, UploadCloud, HelpCircle,
  Star
} from 'lucide-react';
import { ordersApi } from '../api/client';

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  // Payment state
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState(null);

  // Reschedule state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('Today');
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('11:00 AM - 01:00 PM');
  const [actionLoading, setActionLoading] = useState(false);

  // Chat & Clarification state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [replacementFile, setReplacementFile] = useState(null);
  const [sendingChat, setSendingChat] = useState(false);
  const chatFileRef = useRef(null);
  const chatBottomRef = useRef(null);

  const fetchOrder = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await ordersApi.getOrder(id);
      const orderData = res?.order || res?.data || res;
      setOrder(orderData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch order:', err);
      if (!order) setError('Order not found or access denied.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadChat = async () => {
    try {
      const res = await ordersApi.getOrderChat(id);
      if (res?.messages) {
        setChatMessages(res.messages);
      }
    } catch (err) {
      console.warn('Failed to load chat:', err);
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
      await ordersApi.sendChatMessage(id, formData);
      setChatInput('');
      setReplacementFile(null);
      if (chatFileRef.current) chatFileRef.current.value = '';
      await loadChat();
      await fetchOrder(true);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to send message');
    } finally {
      setSendingChat(false);
    }
  };

  const handleRequestReschedule = async (e) => {
    e?.preventDefault();
    if (!rescheduleTimeSlot) return;
    try {
      setActionLoading(true);
      await ordersApi.requestReschedule(order.id, {
        proposedDate: rescheduleDate,
        proposedTimeSlot: rescheduleTimeSlot,
        requestedBy: 'CUSTOMER'
      });
      setShowRescheduleModal(false);
      await fetchOrder(true);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to request reschedule');
    } finally {
      setActionLoading(false);
    }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePayFee = async () => {
    if (isPaying) return;
    setPayError(null);
    setIsPaying(true);
    try {
      // Step 1: Create a Razorpay order on the backend
      const paymentRes = await ordersApi.createPayment({ orderId: order.id });
      const razorpayOrderId = paymentRes?.razorpayOrderId;
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || paymentRes?.key || 'rzp_test_TjrbhiZugaYLYJ';

      // Step 2: Load Razorpay checkout.js if needed
      const scriptLoaded = await loadRazorpayScript();

      if (scriptLoaded && window.Razorpay && razorpayOrderId) {
        // Step 3: Open Razorpay modal
        await new Promise((resolve, reject) => {
          const options = {
            key: razorpayKey,
            amount: order.pricing?.pricePaise || order.pricePaise || 4900,
            currency: 'INR',
            name: 'Cyber Cafe Express',
            description: order.serviceSnapshot?.name || order.serviceName || 'Service Fee',
            order_id: razorpayOrderId,
            handler: async (response) => {
              try {
                // Step 4: Verify payment on backend
                await ordersApi.verifyPayment({
                  orderId: order.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
              } catch (verifyErr) {
                console.warn('[PayFee] Verification notice:', verifyErr);
              }
              // Step 5: Refresh order so badge + button update
              await fetchOrder(true);
              resolve();
            },
            prefill: {},
            theme: { color: '#0284C7' },
            modal: {
              ondismiss: () => {
                setIsPaying(false);
                resolve();
              }
            }
          };
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', (resp) => {
            console.warn('[PayFee] Payment failed:', resp);
            setPayError('Payment was not completed. Please try again.');
            setIsPaying(false);
            resolve();
          });
          rzp.open();
        });
      } else {
        // Fallback: Razorpay not available (test/dev mode) — use the per-order create-payment endpoint
        // which updates paymentStatus to PAID via verifyPayment with a mock token if keys are test keys
        // or directly mark paid via the order-scoped verify-payment endpoint
        throw new Error('Razorpay checkout unavailable. Please check payment gateway configuration.');
      }
    } catch (err) {
      console.error('[PayFee] Error:', err);
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Payment failed. Please try again.';
      setPayError(message);
    } finally {
      setIsPaying(false);
    }
  };

  const handleRespondReschedule = async (action) => {
    try {
      setActionLoading(true);
      await ordersApi.respondReschedule(order.id, { action });
      await fetchOrder(true);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to respond to reschedule');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    let es = null;
    try {
      const token = localStorage.getItem('cybercafe:token') || localStorage.getItem('token') || '';
      const streamUrl = `/api/events/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      es = new EventSource(streamUrl, { withCredentials: true });

      es.addEventListener('ORDER_STATUS_UPDATED', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.orderId === id) {
            fetchOrder(true);
          }
        } catch {
          fetchOrder(true);
        }
      });

      es.addEventListener('ORDER_CHAT_MESSAGE', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.orderId === id && payload?.message) {
            setChatMessages(prev => {
              if (prev.some(m => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });
          }
        } catch (err) {}
      });

      es.addEventListener('ORDER_CLARIFICATION_REQUESTED', (e) => {
        fetchOrder(true);
        loadChat();
      });
    } catch (sseErr) {
      console.warn('[SSE] EventSource init notice:', sseErr);
    }

    // Poll for status updates every 15 seconds
    const interval = setInterval(() => {
      fetchOrder(false);
    }, 15000);

    return () => {
      clearInterval(interval);
      if (es) es.close();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-xs text-slate-500">Loading order timeline...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen p-6 text-center flex flex-col items-center justify-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
        <h3 className="text-base font-bold text-slate-900 mb-2">Order Not Found</h3>
        <p className="text-xs text-slate-500 mb-4">{error || 'Could not locate this order.'}</p>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 bg-slate-900 text-white rounded-2xl text-xs font-bold active:scale-95 transition-transform"
        >
          View My Orders
        </button>
      </div>
    );
  }

  const status = (order.status || 'PENDING').toUpperCase();

  // Status mapping to 4 live steps: Order Placed -> Operator Assigned -> In Progress -> Completed / Receipt Ready
  const steps = [
    {
      title: 'Order Placed',
      description: 'Your express request was received and verified.',
      isDone: true,
      isActive: status === 'PENDING' || status === 'OFFERED' || status === 'PAYMENT_PENDING',
    },
    {
      title: 'Operator Assigned',
      description: order.assignedWorker
        ? `Handled by ${order.assignedWorker.name || 'Certified Operator'}`
        : 'Connecting to the nearest available operator...',
      isDone: ['ASSIGNED', 'IN_PROGRESS', 'PROCESSING', 'DELIVERED', 'COMPLETED'].includes(status),
      isActive: status === 'ASSIGNED',
    },
    {
      title: 'In Progress',
      description: 'Operator is reviewing your documents & preparing official filing.',
      isDone: ['DELIVERED', 'COMPLETED'].includes(status),
      isActive: ['IN_PROGRESS', 'PROCESSING'].includes(status),
    },
    {
      title: 'Completed / Receipt Ready',
      description: 'Official acknowledgement slip & verified receipt issued.',
      isDone: ['DELIVERED', 'COMPLETED'].includes(status),
      isActive: status === 'COMPLETED' || status === 'DELIVERED',
    },
  ];

  const pricePaise = order.pricing?.pricePaise || order.pricePaise || 0;
  const priceDisplay = pricePaise ? `₹${Math.round(pricePaise / 100)}` : 'Included';

  const slotStatus = order.slotStatus || order.serviceSnapshot?.scheduling?.slotStatus || (order.timeSlot ? 'CONFIRMED' : 'UNASSIGNED');
  const bookingDateValue = order.bookingDate || order.serviceSnapshot?.scheduling?.date || 'Today';
  const timeSlotValue = order.bookingTimeSlot ||
    (typeof order.timeSlot === 'string' ? order.timeSlot : order.timeSlot?.timeSlotStr) ||
    order.serviceSnapshot?.scheduling?.timeSlot;
  const proposedDateValue = order.proposedDate || order.serviceSnapshot?.scheduling?.proposedDate || 'Today';
  const proposedTimeSlotValue = order.proposedSlot || order.serviceSnapshot?.scheduling?.proposedSlot || order.serviceSnapshot?.scheduling?.proposedTimeSlot || '';

  return (
    <div className="px-5 pt-4 pb-28 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/orders')}
          className="w-9 h-9 rounded-full bg-white shadow-neo-sm border border-slate-100 flex items-center justify-center text-slate-700 hover:text-slate-900 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Order Tracking</span>
          <span className="text-xs font-extrabold text-slate-900">#{order.id.slice(-8).toUpperCase()}</span>
        </div>
        <button
          onClick={() => fetchOrder(true)}
          className="w-9 h-9 rounded-full bg-white shadow-neo-sm border border-slate-100 flex items-center justify-center text-sky-600 active:scale-95 transition-transform"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Status Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-neo-card p-4">
        <div className="absolute top-0 right-0 w-28 h-28 bg-sky-100/60 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {order.serviceName || 'Cafe Service'}
            </span>
            <h2 className="text-sm font-extrabold text-slate-900 mt-1.5 leading-snug">
              {order.serviceSnapshot?.name || order.serviceName || 'Application Filing'}
            </h2>
          </div>
          <span className="text-base font-extrabold text-sky-700 shrink-0">{priceDisplay}</span>
        </div>

        {/* Live Status Pill */}
        <div className={`relative z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold ${
          order.paymentStatus === 'PAID'
            ? 'bg-emerald-50 border border-emerald-200/70 text-emerald-700'
            : 'bg-slate-50 border border-slate-200/70 text-sky-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            order.paymentStatus === 'PAID' ? 'bg-emerald-500' : 'bg-sky-500 animate-pulse'
          }`} />
          <span>{status.replace(/_/g, ' ')}</span>
        </div>
        {/* Payment Status Badge */}
        {order.paymentStatus && (
          <div className={`relative z-10 inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[11px] font-bold ${
            order.paymentStatus === 'PAID'
              ? 'bg-emerald-50 border border-emerald-200/70 text-emerald-700'
              : 'bg-amber-50 border border-amber-200/60 text-amber-700'
          }`}>
            {order.paymentStatus === 'PAID'
              ? <CheckCircle2 className="w-3 h-3" />
              : <CreditCard className="w-3 h-3" />}
            <span>{order.paymentStatus === 'PAID' ? 'PAID' : 'PAYMENT PENDING'}</span>
          </div>
        )}
      </div>

      {/* Clarification Required Alert Banner */}
      {order.status === 'WAITING_FOR_CUSTOMER' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 space-y-2 shadow-neo-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-extrabold text-amber-700 tracking-wider block">
                Clarification / Action Required
              </span>
              <h4 className="text-xs font-bold text-amber-950 mt-0.5">
                Operator requested clarification or updated documents
              </h4>
              <p className="text-[11px] text-amber-800/90 mt-1 leading-relaxed">
                Please reply or upload replacement documents so your application processing can resume.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setShowChatModal(true); loadChat(); }}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Reply & Upload Replacement Document</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* Dynamic Review Window & Mutual Reschedule UI            */}
      {/* ======================================================== */}

      {/* 1. UNASSIGNED STATE */}
      {slotStatus === 'UNASSIGNED' && (
        <div className="bg-amber-50/80 border border-amber-200/60 rounded-3xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-extrabold text-amber-700 block tracking-wider">
              Review Window
            </span>
            <h4 className="text-xs font-bold text-amber-900 mt-0.5">
              Awaiting Operator Assignment & Slot Proposal
            </h4>
            <p className="text-[11px] text-amber-700/80 mt-0.5 leading-relaxed">
              Once paired with a certified operator, they will propose the earliest available call window.
            </p>
          </div>
        </div>
      )}

      {/* 2. CONFIRMED STATE */}
      {slotStatus === 'CONFIRMED' && (
        <div className="bg-sky-50/80 border border-sky-200/70 rounded-3xl p-4">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-extrabold text-sky-700 block tracking-wider">
                  Review Window
                </span>
                <h4 className="text-xs font-bold text-sky-900 mt-0.5 leading-snug">
                  {bookingDateValue} at {timeSlotValue || 'Scheduled'}
                </h4>
              </div>
            </div>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Confirmed</span>
            </span>
          </div>
          <div className="pt-2.5 border-t border-sky-100 flex justify-end">
            <button
              type="button"
              onClick={() => setShowRescheduleModal(true)}
              className="px-3 py-1.5 bg-white border border-sky-200/70 text-sky-700 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-neo-sm"
            >
              <RefreshCw className="w-3 h-3 text-sky-600" />
              <span>Request Reschedule</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. RESCHEDULE REQUESTED BY WORKER */}
      {slotStatus === 'RESCHEDULE_REQUESTED_BY_WORKER' && (
        <div className="bg-white border-2 border-sky-200 rounded-3xl p-4 shadow-neo-card">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] uppercase font-extrabold text-sky-700 tracking-wider block">
                Operator Reschedule Proposal
              </span>
              <h4 className="text-xs font-bold text-slate-900 mt-0.5 leading-snug">
                New window: <span className="text-sky-700 font-extrabold">{proposedDateValue} at {proposedTimeSlotValue || 'Proposed Time'}</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Previously scheduled: {bookingDateValue} at {timeSlotValue || 'Scheduled'}. You can accept the operator's suggestion or keep your existing time.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleRespondReschedule('ACCEPT')}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Accept New Slot</span>
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleRespondReschedule('REJECT')}
              className="py-2.5 px-3 bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5 text-rose-500" />
              <span>Keep Existing</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. RESCHEDULE REQUESTED BY CUSTOMER */}
      {slotStatus === 'RESCHEDULE_REQUESTED_BY_CUSTOMER' && (
        <div className="bg-amber-50/80 border border-amber-200/60 rounded-3xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-extrabold text-amber-700 block tracking-wider">
              Pending Operator Confirmation
            </span>
            <h4 className="text-xs font-bold text-amber-900 mt-0.5">
              Your reschedule request is pending operator confirmation.
            </h4>
            <p className="text-[11px] text-amber-700/80 mt-0.5">
              Proposed: <strong className="text-amber-800">{proposedDateValue} at {proposedTimeSlotValue}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Reschedule Request Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-extrabold text-slate-900">Request New Review Window</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="w-7 h-7 rounded-full bg-slate-50 text-slate-500 hover:text-slate-900 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleRequestReschedule} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                  Select Preferred Day:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Today', 'Tomorrow', 'Day After'].map(d => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setRescheduleDate(d)}
                      className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                        rescheduleDate === d
                          ? 'bg-sky-50 border-sky-400 text-sky-700 ring-2 ring-sky-500/20'
                          : 'bg-slate-50 border-slate-200/80 text-slate-500'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                  Select Preferred Time Slot:
                </label>
                <div className="space-y-1.5">
                  {[
                    '10:00 AM - 12:00 PM',
                    '12:00 PM - 02:00 PM',
                    '02:00 PM - 04:00 PM',
                    '04:00 PM - 06:00 PM',
                    '06:00 PM - 08:00 PM'
                  ].map(slot => (
                    <button
                      type="button"
                      key={slot}
                      onClick={() => setRescheduleTimeSlot(slot)}
                      className={`w-full py-2 px-3 text-left text-xs font-semibold rounded-xl border transition-all flex items-center justify-between ${
                        rescheduleTimeSlot === slot
                          ? 'bg-sky-50 border-sky-400 text-sky-700 ring-2 ring-sky-500/20'
                          : 'bg-slate-50 border-slate-200/80 text-slate-600'
                      }`}
                    >
                      <span>{slot}</span>
                      {rescheduleTimeSlot === slot && <Check className="w-3.5 h-3.5 text-sky-600" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-2xl text-xs active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rescheduleTimeSlot}
                  className="flex-1 py-2.5 bg-slate-900 text-white font-bold rounded-2xl text-xs shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Send Proposal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Uploaded Documents Showcase */}
      {order.documents && order.documents.length > 0 && (
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                Uploaded Documents ({order.documents.length})
              </h3>
            </div>
            <span className="text-[10px] text-sky-700 font-bold">Vault Secured</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {order.documents.map((doc, idx) => {
              const isImg = doc.url && (doc.mimeType?.startsWith('image/') || doc.fileName?.match(/\.(jpg|jpeg|png|webp)$/i));
              return (
                <div
                  key={doc.id || idx}
                  className="bg-slate-50 border border-slate-200/70 rounded-2xl p-2.5 flex items-center gap-2.5 overflow-hidden"
                >
                  {isImg ? (
                    <img
                      src={doc.url}
                      alt={doc.name || 'Document'}
                      className="w-9 h-9 object-cover rounded-xl border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">
                      {doc.docName || doc.name || 'Uploaded File'}
                    </p>
                    <span className="text-[9px] text-slate-500 truncate block">
                      {doc.fileName || (typeof doc.size === 'number' ? `${(doc.size / 1024).toFixed(0)} KB` : 'Verified')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Operator Notes / Instructions Card (if provided) */}
      {(order.customerNotes || order.notes || order.formData?.customerNotes) && (
        <div className="bg-white border border-slate-100 rounded-3xl p-3.5 text-xs shadow-neo-sm">
          <span className="text-[9px] uppercase font-extrabold text-slate-500 block mb-1">
            Instructions for Operator:
          </span>
          <p className="text-slate-600 italic">
            "{order.customerNotes || order.notes || order.formData?.customerNotes}"
          </p>
        </div>
      )}

      {/* Operator Card (if assigned) */}
      {order.assignedWorker && (
        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-neo-card flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-sky-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Assigned Cafe Operator</p>
              <h4 className="text-xs font-bold text-slate-900 truncate">{order.assignedWorker.name || 'Verified Cafe Staff'}</h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { setShowChatModal(true); loadChat(); }}
              className="py-1.5 px-3 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat / Clarify</span>
            </button>
            {order.assignedWorker.phone && (
              <a
                href={`tel:${order.assignedWorker.phone}`}
                className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-700 shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Vertical Progress Timeline */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-neo-card">
        <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span>Live Processing Timeline</span>
        </h3>

        <div className="relative pl-6 space-y-6">
          {steps.map((s, idx) => {
            const isLast = idx === steps.length - 1;

            return (
              <div key={s.title} className="relative flex items-start gap-4">
                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={`absolute left-[-22px] top-4 bottom-[-24px] w-0.5 ${
                      s.isDone ? 'bg-sky-500' : 'bg-slate-200'
                    }`}
                  />
                )}

                {/* Node */}
                <div
                  className={`absolute left-[-28px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                    s.isDone
                      ? 'bg-sky-500 text-white ring-4 ring-sky-500/15'
                      : s.isActive
                      ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/15 animate-pulse'
                      : 'bg-white border-2 border-slate-300'
                  }`}
                >
                  {s.isDone && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <h4
                    className={`text-xs font-bold ${
                      s.isDone ? 'text-slate-900' : s.isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dual Receipt Section: Platform Payment Invoice + Official Government Acknowledgment */}
      {(order.status === 'COMPLETED' || (order.deliverables && order.deliverables.length > 0)) && (
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Official Receipts & Deliverables
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Receipt 1: Platform Payment Receipt */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-slate-800">Platform Payment Receipt</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Official invoice breakdown with GST and verified payment acknowledgement.
                </p>
              </div>
              <a
                href={`/api/orders/${order.id}/receipt`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 text-white rounded-2xl text-xs font-bold active:scale-95 transition-transform text-center"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Platform Invoice</span>
              </a>
            </div>

            {/* Receipt 2: Official Government Acknowledgment */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Official Government Acknowledgment</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Department portal registration receipt or official deliverable slip.
                </p>
              </div>

              {order.deliverables && order.deliverables.length > 0 ? (
                <a
                  href={order.deliverables[0].url || `/api/documents/${order.deliverables[0].id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="mt-3 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 text-white font-bold rounded-2xl text-xs active:scale-95 transition-transform text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Official Proof</span>
                </a>
              ) : (
                <div className="mt-3 py-2 px-2.5 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-700 text-[10px] font-semibold text-center">
                  Operator processing official acknowledgment upload
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Feedback & Rating Section for Completed Orders */}
      {order && (order.status === 'COMPLETED' || order.status === 'WORK_COMPLETED' || order.status === 'RECEIPT_SUBMITTED') && (
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              Operator Service Rating & Feedback
            </h3>
          </div>

          {((order.rating || order.serviceSnapshot?.review?.rating || order.review?.rating) || feedbackSubmitted) ? (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Your Feedback Submitted</span>
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => {
                    const r = order.rating || order.serviceSnapshot?.review?.rating || order.review?.rating || feedbackRating;
                    return (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= r ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`}
                      />
                    );
                  })}
                </div>
              </div>
              {(order.review || order.serviceSnapshot?.review?.comment || order.feedback_comment || feedbackComment) && (
                <p className="text-xs text-amber-950/80 italic font-medium leading-relaxed">
                  "{order.review || order.serviceSnapshot?.review?.comment || order.feedback_comment || feedbackComment}"
                </p>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Rate Operator's Service:
                </span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="p-1 hover:scale-110 active:scale-95 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${star <= feedbackRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={2}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Share your experience with the operator's service..."
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 placeholder:text-slate-400 resize-none"
              />

              {feedbackError && (
                <p className="text-[11px] text-rose-600 font-semibold">{feedbackError}</p>
              )}

              <button
                type="button"
                disabled={submittingFeedback}
                onClick={async () => {
                  if (!feedbackRating) return;
                  setSubmittingFeedback(true);
                  setFeedbackError('');
                  try {
                    await ordersApi.submitFeedback(order.id, {
                      rating: feedbackRating,
                      feedback_comment: feedbackComment.trim(),
                      comment: feedbackComment.trim()
                    });
                    setFeedbackSubmitted(true);
                    setOrder(prev => ({
                      ...prev,
                      rating: feedbackRating,
                      review: feedbackComment.trim(),
                      serviceSnapshot: {
                        ...(prev?.serviceSnapshot || {}),
                        review: {
                          rating: feedbackRating,
                          comment: feedbackComment.trim(),
                          createdAt: new Date().toISOString()
                        }
                      }
                    }));
                  } catch (err) {
                    setFeedbackError(err.friendlyMessage || err.message || 'Failed to submit feedback');
                  } finally {
                    setSubmittingFeedback(false);
                  }
                }}
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingFeedback ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pay Error Alert */}
      {payError && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200/70 rounded-2xl p-3.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-rose-700">Payment Failed</p>
            <p className="text-[11px] text-rose-600 mt-0.5 leading-relaxed">{payError}</p>
          </div>
          <button
            type="button"
            onClick={() => setPayError(null)}
            className="shrink-0 w-6 h-6 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Pay Now Button (if pending payment) */}
      {order.paymentStatus === 'PENDING' && (
        <button
          type="button"
          disabled={isPaying}
          onClick={handlePayFee}
          className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {isPaying
            ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></>
            : <><CreditCard className="w-4 h-4" /><span>Pay Fee Now ({priceDisplay})</span></>}
        </button>
      )}

      {/* Chat & Clarification Modal / Drawer */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">Operator Chat & Clarifications</h3>
                  <p className="text-[10px] text-slate-500">Order #{order.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8fafc] min-h-[220px] max-h-[420px]">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs space-y-1">
                  <p className="font-semibold text-slate-600">No chat messages yet</p>
                  <p className="text-[11px]">Send a message or upload any requested document directly to your operator.</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isCustomer = msg.senderRole === 'CUSTOMER';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[9px] text-slate-400 mb-1 px-1">
                        {isCustomer ? 'You' : (msg.senderName || 'Certified Operator')}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          isCustomer
                            ? 'bg-sky-600 text-white rounded-br-none shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                        }`}
                      >
                        <p>{msg.message}</p>
                        {msg.attachmentUrl && (
                          <div className={`mt-2 pt-2 border-t flex items-center gap-2 ${isCustomer ? 'border-sky-400/40' : 'border-slate-100'}`}>
                            <Paperclip className="w-3.5 h-3.5 shrink-0" />
                            <a
                              href={msg.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={msg.attachmentName || 'document'}
                              className={`text-[11px] underline font-bold truncate ${isCustomer ? 'text-white' : 'text-sky-600'}`}
                            >
                              {msg.attachmentName || 'Uploaded File'}
                            </a>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 px-1">
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Box & Replacement Document Uploader */}
            <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-100 space-y-2">
              {replacementFile && (
                <div className="flex items-center justify-between p-2 bg-sky-50 border border-sky-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="text-[11px] font-bold text-sky-800 truncate">{replacementFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setReplacementFile(null); if (chatFileRef.current) chatFileRef.current.value = ''; }}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={chatFileRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setReplacementFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => chatFileRef.current?.click()}
                  className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                  title="Upload Replacement / Supporting Document"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type reply or explanation..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-500 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={sendingChat || (!chatInput.trim() && !replacementFile)}
                  className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
