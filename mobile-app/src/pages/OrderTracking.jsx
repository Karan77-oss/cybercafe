import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, RefreshCw, CheckCircle2, Clock, 
  UserCheck, Download, AlertCircle, Phone, 
  ExternalLink, CreditCard, Sparkles, Loader2, Calendar,
  PhoneCall, ShieldCheck, FileText, Check, X, CalendarCheck 
} from 'lucide-react';
import { ordersApi } from '../api/client';

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Reschedule state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('Today');
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('11:00 AM - 01:00 PM');
  const [actionLoading, setActionLoading] = useState(false);

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
    // Poll for status updates every 10 seconds
    const interval = setInterval(() => {
      fetchOrder(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading order timeline...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen p-6 text-center flex flex-col items-center justify-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-slate-100 mb-2">Order Not Found</h3>
        <p className="text-xs text-slate-400 mb-4">{error || 'Could not locate this order.'}</p>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
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
    <div className="min-h-screen pb-24 px-4 pt-3 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/orders')}
          className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">Order Tracking</span>
          <span className="text-xs font-bold text-slate-200">#{order.id.slice(-8).toUpperCase()}</span>
        </div>
        <button
          onClick={() => fetchOrder(true)}
          className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 active:scale-95 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Status Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-850 to-slate-900 border border-slate-700/80 p-5 mb-5 shadow-xl">
        <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {order.serviceName || 'Cafe Service'}
            </span>
            <h2 className="text-base font-extrabold text-slate-100 mt-1 leading-snug">
              {order.serviceSnapshot?.name || order.serviceName || 'Application Filing'}
            </h2>
          </div>
          <span className="text-sm font-black text-cyan-400">{priceDisplay}</span>
        </div>

        {/* Live Status Pill */}
        <div className="inline-flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-bold text-cyan-300 mt-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Status: {status.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Dynamic Review Window & Mutual Reschedule UI            */}
      {/* ======================================================== */}

      {/* 1. UNASSIGNED STATE */}
      {slotStatus === 'UNASSIGNED' && (
        <div className="bg-slate-800/90 border border-amber-500/30 rounded-2xl p-4 mb-4 shadow-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">
              Review Window
            </span>
            <h4 className="text-xs font-bold text-amber-300 mt-0.5">
              ⏳ Awaiting Operator Assignment & Slot Proposal
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Once paired with a certified operator, they will propose the earliest available call window.
            </p>
          </div>
        </div>
      )}

      {/* 2. CONFIRMED STATE */}
      {slotStatus === 'CONFIRMED' && (
        <div className="bg-slate-800/90 border border-cyan-500/40 rounded-2xl p-4 mb-4 shadow-lg">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">
                  Review Window
                </span>
                <h4 className="text-xs font-bold text-cyan-300 mt-0.5">
                  📅 Assigned Review Window: {bookingDateValue} at {timeSlotValue || 'Scheduled'}
                </h4>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Confirmed</span>
            </span>
          </div>
          <div className="pt-2 border-t border-slate-700/60 flex justify-end">
            <button
              type="button"
              onClick={() => setShowRescheduleModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-cyan-500/40 text-cyan-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              <span>Request Reschedule</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. RESCHEDULE REQUESTED BY WORKER */}
      {slotStatus === 'RESCHEDULE_REQUESTED_BY_WORKER' && (
        <div className="bg-gradient-to-br from-indigo-950/90 via-slate-850 to-slate-900 border-2 border-indigo-500/60 rounded-2xl p-4 mb-4 shadow-xl">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] uppercase font-extrabold text-indigo-300 tracking-wider block">
                Operator Reschedule Proposal
              </span>
              <h4 className="text-xs font-bold text-slate-100 mt-0.5 leading-snug">
                Operator proposed a new window: <span className="text-cyan-300 font-extrabold">{proposedDateValue} at {proposedTimeSlotValue || 'Proposed Time'}</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Previously scheduled: {bookingDateValue} at {timeSlotValue || 'Scheduled'}. You can accept the operator's suggestion or keep your existing time.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleRespondReschedule('ACCEPT')}
              className="py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Accept New Slot</span>
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleRespondReschedule('REJECT')}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>Keep Existing</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. RESCHEDULE REQUESTED BY CUSTOMER */}
      {slotStatus === 'RESCHEDULE_REQUESTED_BY_CUSTOMER' && (
        <div className="bg-slate-800/90 border border-amber-500/40 rounded-2xl p-4 mb-4 shadow-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold text-amber-400 block tracking-wider">
              Pending Operator Confirmation
            </span>
            <h4 className="text-xs font-bold text-slate-100 mt-0.5">
              Your reschedule request is pending operator confirmation.
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Proposed: <strong className="text-amber-300">{proposedDateValue} at {proposedTimeSlotValue}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Reschedule Request Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-750 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-extrabold text-slate-100">Request New Review Window</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleRequestReschedule} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
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
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
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
                      className={`w-full py-2 px-3 text-left text-xs font-medium rounded-xl border transition-all flex items-center justify-between ${
                        rescheduleTimeSlot === slot
                          ? 'bg-gradient-to-r from-indigo-950/60 to-cyan-950/60 border-cyan-400 text-cyan-200'
                          : 'bg-slate-800/70 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span>{slot}</span>
                      {rescheduleTimeSlot === slot && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rescheduleTimeSlot}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-black rounded-xl text-xs shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
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
        <div className="bg-slate-800/80 border border-slate-750 rounded-2xl p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Uploaded Documents ({order.documents.length})
              </h3>
            </div>
            <span className="text-[10px] text-cyan-400 font-semibold">Vault Secured</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {order.documents.map((doc, idx) => {
              const isImg = doc.url && (doc.mimeType?.startsWith('image/') || doc.fileName?.match(/\.(jpg|jpeg|png|webp)$/i));
              return (
                <div
                  key={doc.id || idx}
                  className="bg-slate-900/80 border border-slate-750 rounded-xl p-2.5 flex items-center gap-2.5 overflow-hidden"
                >
                  {isImg ? (
                    <img
                      src={doc.url}
                      alt={doc.name || 'Document'}
                      className="w-9 h-9 object-cover rounded-lg border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-[11px] font-bold text-slate-200 truncate">
                      {doc.docName || doc.name || 'Uploaded File'}
                    </p>
                    <span className="text-[9px] text-slate-400 truncate block">
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
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 mb-4 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Instructions for Operator:
          </span>
          <p className="text-slate-300 italic">
            "{order.customerNotes || order.notes || order.formData?.customerNotes}"
          </p>
        </div>
      )}

      {/* Operator Card (if assigned) */}
      {order.assignedWorker && (
        <div className="bg-slate-800/80 border border-indigo-500/30 rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-bold text-sm">
              <UserCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Assigned Cafe Operator</p>
              <h4 className="text-xs font-bold text-slate-100">{order.assignedWorker.name || 'Verified Cafe Staff'}</h4>
            </div>
          </div>

          {order.assignedWorker.phone && (
            <a
              href={`tel:${order.assignedWorker.phone}`}
              className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Vertical Glowing Node Timeline */}
      <div className="glass-card rounded-3xl p-5 mb-5">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Live Processing Timeline</span>
        </h3>

        <div className="relative pl-6 space-y-7">
          {steps.map((s, idx) => {
            const isLast = idx === steps.length - 1;

            return (
              <div key={s.title} className="relative flex items-start gap-4">
                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={`absolute left-[-15px] top-4 bottom-[-28px] w-0.5 ${
                      s.isDone ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  />
                )}

                {/* Glowing Node */}
                <div
                  className={`absolute left-[-22px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                    s.isDone
                      ? 'bg-cyan-500 text-slate-950 glow-cyan ring-4 ring-cyan-500/20'
                      : s.isActive
                      ? 'bg-indigo-600 text-white glow-indigo ring-4 ring-indigo-500/30 animate-pulse'
                      : 'bg-slate-800 border-2 border-slate-700'
                  }`}
                >
                  {s.isDone && <CheckCircle2 className="w-3 h-3 text-slate-950" />}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <h4
                    className={`text-xs font-bold ${
                      s.isDone ? 'text-slate-100' : s.isActive ? 'text-cyan-300 font-extrabold' : 'text-slate-500'
                    }`}
                  >
                    {s.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deliverables / Output Download Card */}
      {order.deliverables && order.deliverables.length > 0 && (
        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-3xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
              Official Output & Deliverables
            </h3>
          </div>
          <div className="space-y-2">
            {order.deliverables.map((deliv, idx) => (
              <a
                key={deliv.id || idx}
                href={deliv.url || `/api/documents/${deliv.id}/download`}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center justify-between p-3 bg-slate-900/80 rounded-xl border border-emerald-500/20 hover:border-emerald-500/50 transition-all text-xs font-semibold text-slate-200"
              >
                <div className="flex items-center gap-2 truncate">
                  <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{deliv.name || deliv.fileName || 'Submission_Receipt.pdf'}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Pay Now Button (if pending payment) */}
      {order.paymentStatus === 'PENDING' && (
        <button
          onClick={async () => {
            try {
              setRefreshing(true);
              await ordersApi.payOrder(order.id, { paymentMethod: 'UPI_SIMULATION' });
              fetchOrder(true);
            } catch (payErr) {
              console.error('Payment error:', payErr);
            } finally {
              setRefreshing(false);
            }
          }}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all"
        >
          <CreditCard className="w-4 h-4" />
          <span>Pay Fee Now ({priceDisplay})</span>
        </button>
      )}
    </div>
  );
}
