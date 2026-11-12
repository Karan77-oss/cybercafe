import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, ChevronRight, RefreshCw,
  AlertCircle, Plus, Calendar, PhoneCall, ShieldCheck,
  Download, Star, CheckCircle, Send, Sparkles
} from 'lucide-react';
import { ordersApi, authApi, resolveBackendUrl } from '../api/client';
import { swrCache } from '../utils/swrCache';
import { supabase, hasSupabase } from '../lib/supabase';

function OrderFeedbackSection({ order, onFeedbackSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const existingReview = order.rating 
    ? { rating: order.rating, comment: order.review || order.feedback_comment } 
    : (order.serviceSnapshot?.review || order.review);

  if (existingReview?.rating || submitted) {
    const displayRating = existingReview?.rating || rating;
    const displayComment = existingReview?.comment || comment;

    return (
      <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Thank you for your feedback!</span>
          </span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${s <= displayRating ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`}
              />
            ))}
          </div>
        </div>
        {displayComment && (
          <p className="text-[11px] text-amber-950/80 italic mt-0.5 font-medium">
            "{displayComment}"
          </p>
        )}
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.stopPropagation();
    if (!rating) return;
    setSubmitting(true);
    setFeedbackError('');

    try {
      await ordersApi.submitFeedback(order.id, {
        rating,
        feedback_comment: comment.trim(),
        comment: comment.trim()
      });
      setSubmitted(true);
      onFeedbackSubmitted(order.id, { rating, comment: comment.trim() });
    } catch (err) {
      setFeedbackError(err.friendlyMessage || err.message || 'Could not save feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      className="mt-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-800">
          Rate Operator's Service:
        </span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              className="p-0.5 hover:scale-110 active:scale-95 transition-transform"
            >
              <Star
                className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
              />
            </button>
          ))}
        </div>
      </div>

      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience with the worker's service..."
        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 placeholder:text-slate-400 resize-none"
      />

      {feedbackError && (
        <p className="text-[10px] text-rose-600 font-semibold">{feedbackError}</p>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        className="w-full py-2 bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform disabled:opacity-50"
      >
        <Send className="w-3 h-3" />
        <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
      </button>
    </div>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  // Hydrate instantly in 0ms from SWR cache
  const [orders, setOrders] = useState(() => swrCache.get('my_orders') || []);
  const [loading, setLoading] = useState(() => (swrCache.get('my_orders') ? false : true));
  const [error, setError] = useState(null);

  const isAuthenticated = authApi.isAuthenticated();

  const fetchOrders = async (silent = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      if (!silent && orders.length === 0) setLoading(true);
      setError(null);
      const res = await ordersApi.getMyOrders();
      const list = res?.orders || res?.data?.orders || (Array.isArray(res) ? res : []);
      setOrders(list);
      swrCache.set('my_orders', list);
    } catch (err) {
      console.error('Failed to load orders:', err);
      if (orders.length === 0) {
        setError(err.friendlyMessage || err.message || 'Could not retrieve orders. Please check network.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(orders.length > 0);
  }, [isAuthenticated]);

  // Listen for optimistic UI updates from order creation
  useEffect(() => {
    const handleOptimisticUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setOrders(e.detail);
      }
    };
    window.addEventListener('swr:my_orders', handleOptimisticUpdate);
    return () => window.removeEventListener('swr:my_orders', handleOptimisticUpdate);
  }, []);

  // Real-time SSE stream listener for instant live order updates
  useEffect(() => {
    if (!isAuthenticated) return;
    const sseBase = resolveBackendUrl('/api/events/stream');
    let es;
    try {
      es = new EventSource(sseBase);
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (!payload || !payload.type) return;

          if (['ORDER_STATUS_UPDATED', 'ORDER_ACCEPTED', 'ORDER_CLAIMED', 'PAYMENT_SUCCESS'].includes(payload.type)) {
            const updatedOrder = payload.order || payload.data;
            const orderId = payload.orderId || updatedOrder?.id;

            if (orderId) {
              setOrders((prev) => {
                const next = prev.map((o) => {
                  if (o.id === orderId) {
                    return {
                      ...o,
                      status: payload.status || updatedOrder?.status || o.status,
                      ...(updatedOrder || {})
                    };
                  }
                  return o;
                });
                swrCache.set('my_orders', next);
                return next;
              });
            }
          } else if (payload.type === 'ORDER_CREATED') {
            const newOrder = payload.order;
            const currentUserId = authApi.getCurrentUser()?.id;
            if (newOrder && (newOrder.customerId === currentUserId || newOrder.userId === currentUserId)) {
              setOrders((prev) => {
                if (prev.some((o) => o.id === newOrder.id)) return prev;
                const next = [newOrder, ...prev];
                swrCache.set('my_orders', next);
                return next;
              });
            }
          }
        } catch (err) {
          console.warn('[Orders SSE parse notice]:', err);
        }
      };
    } catch (sseErr) {
      console.warn('[Orders SSE notice]:', sseErr);
    }

    return () => {
      if (es) es.close();
    };
  }, [isAuthenticated]);

  // Real-time Supabase Postgres changes listener (when Supabase is configured)
  useEffect(() => {
    if (!hasSupabase() || !isAuthenticated) return;
    const user = authApi.getCurrentUser();
    if (!user?.id) return;

    const channel = supabase
      .channel(`public:Order:customer:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Order', filter: `customerId=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => {
              if (prev.some((o) => o.id === payload.new.id)) return prev;
              const next = [payload.new, ...prev];
              swrCache.set('my_orders', next);
              return next;
            });
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) => {
              const next = prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o));
              swrCache.set('my_orders', next);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="px-5 pt-12 pb-6 flex flex-col items-center text-center min-h-screen">
        <div className="w-16 h-16 rounded-3xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-base font-extrabold text-slate-900 mb-2">Track Your Orders</h2>
        <p className="text-xs text-slate-500 max-w-xs mb-6">
          Sign in to view real-time filing progress, operator updates, and download verified receipts.
        </p>
        <button
          onClick={() => {
            localStorage.setItem('redirectAfterAuth', '/orders');
            navigate('/auth');
          }}
          className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl text-xs shadow-md active:scale-95 transition-transform"
        >
          Sign In to View Orders
        </button>
      </div>
    );
  }

  const getStatusColor = (status = '') => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      case 'IN_PROGRESS':
      case 'PROCESSING':
        return 'bg-sky-50 text-sky-700 border-sky-200/70';
      case 'ASSIGNED':
        return 'bg-sky-50 text-sky-700 border-sky-200/70';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200/70';
    }
  };

  return (
    <div className="px-5 pt-4 pb-28 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight">My Orders</h1>
          <p className="text-[11px] text-slate-500 font-medium">Track your application & callback status</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/')}
            className="h-8 px-3 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
          <button
            onClick={fetchOrders}
            className="w-8 h-8 rounded-full bg-white shadow-neo-sm border border-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-95 transition-transform"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 flex items-center gap-2 text-xs text-rose-600">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-sm animate-pulse h-32" />
          ))}
        </div>
      )}

      {/* Orders List */}
      {!loading && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => {
            const price = order.pricing?.pricePaise || order.pricePaise;
            const priceDisplay = price ? `₹${Math.round(price / 100)}` : 'Fee Paid';
            const status = (order.status || 'PENDING').toUpperCase();

            // Extract booked time slot and booking date
            const timeSlotDisplay = order.bookingTimeSlot ||
              (typeof order.timeSlot === 'string' ? order.timeSlot : order.timeSlot?.timeSlotStr) ||
              order.serviceSnapshot?.scheduling?.timeSlot;
            const bookingDateDisplay = order.bookingDate || order.serviceSnapshot?.scheduling?.date;
            const fullSlotBadge = timeSlotDisplay ? (
              (bookingDateDisplay && !timeSlotDisplay.includes(bookingDateDisplay))
                ? `${bookingDateDisplay}, ${timeSlotDisplay}`
                : timeSlotDisplay
            ) : null;

            const docs = order.documents || [];

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card hover:border-sky-100 transition-all duration-200 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block mb-0.5">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {order.serviceSnapshot?.name || order.serviceName || 'Application Service'}
                    </h3>
                  </div>

                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusColor(status)}`}>
                    {status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Highlighted Booked Call Slot: 📞 Callback Window */}
                {fullSlotBadge && (
                  <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-200/60 p-2.5 rounded-2xl text-xs text-amber-900 mb-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <PhoneCall className="w-3.5 h-3.5" />
                    </div>
                    <div className="leading-tight min-w-0">
                      <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">Callback Window</p>
                      <p className="text-[11px] font-bold truncate">{fullSlotBadge}</p>
                    </div>
                  </div>
                )}

                {/* Uploaded Documents Count & Thumbnails */}
                {docs.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex -space-x-1.5">
                        {docs.slice(0, 3).map((d, i) => (
                          <div
                            key={d.id || i}
                            className="w-5 h-5 rounded bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] text-sky-700 shrink-0 overflow-hidden"
                            title={d.name || d.docName || 'Document'}
                          >
                            {d.url && (d.mimeType?.startsWith('image/') || d.fileName?.match(/\.(jpg|jpeg|png|webp)$/i)) ? (
                              <img src={d.url} alt="doc" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-3 h-3 text-sky-600" />
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>{docs.length} Doc{docs.length > 1 ? 's' : ''} Attached</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Completed Order: Official Receiving Document & Customer Feedback Section */}
                {(status === 'COMPLETED' || status === 'WORK_COMPLETED' || status === 'RECEIPT_SUBMITTED') && (() => {
                  const receivingDoc = (order.deliverables && order.deliverables.length > 0) 
                    ? order.deliverables[0] 
                    : (order.receipt || order.serviceSnapshot?.completion?.deliverableFiles?.[0]);
                  const receivingDocUrl = receivingDoc?.url || order.serviceSnapshot?.completion?.receiptUrl;

                  return (
                    <div className="mb-3 pt-2.5 border-t border-slate-100 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                      {/* Official Deliverables / Receiving Proof Download */}
                      {receivingDocUrl ? (
                        <a
                          href={receivingDocUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-sm active:scale-95 transition-transform text-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View / Download Receiving Document</span>
                        </a>
                      ) : (
                        <div className="py-2 px-3 bg-emerald-50/80 border border-emerald-200/60 rounded-2xl text-[10px] text-emerald-800 font-semibold flex items-center justify-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Work Completed & Verified by Operator</span>
                        </div>
                      )}

                      {/* Customer Feedback & Rating Section */}
                      <OrderFeedbackSection 
                        order={order} 
                        onFeedbackSubmitted={(orderId, feedback) => {
                          setOrders(prev => {
                            const next = prev.map(o => o.id === orderId ? { ...o, rating: feedback.rating, review: feedback.comment } : o);
                            swrCache.set('my_orders', next);
                            return next;
                          });
                        }} 
                      />
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1 font-extrabold text-sky-700">
                    <span>{priceDisplay}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && !error && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-neo-card text-center mt-2">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">No Orders Yet</h4>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            Book any cyber cafe service from the catalog to start tracking live progress here.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-2xl text-xs active:scale-95 transition-transform"
          >
            Explore Services
          </button>
        </div>
      )}
    </div>
  );
}
