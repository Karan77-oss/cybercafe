import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, RefreshCw, CheckCircle2, Clock, 
  UserCheck, Download, AlertCircle, Phone, 
  ExternalLink, CreditCard, Sparkles, Loader2, Calendar 
} from 'lucide-react';
import { ordersApi } from '../api/client';

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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

  // Status mapping to steps
  const steps = [
    {
      title: 'Order Placed',
      description: 'Your request was received and verified.',
      isDone: true,
      isActive: status === 'PENDING' || status === 'OFFERED',
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
      title: 'Application Processing',
      description: 'Document resizing, form entry, and official portal filing.',
      isDone: ['DELIVERED', 'COMPLETED'].includes(status),
      isActive: ['IN_PROGRESS', 'PROCESSING'].includes(status),
    },
    {
      title: 'Fulfillment & Deliverables Ready',
      description: 'Official acknowledgement slip & receipt issued.',
      isDone: ['DELIVERED', 'COMPLETED'].includes(status),
      isActive: status === 'COMPLETED' || status === 'DELIVERED',
    },
  ];

  const pricePaise = order.pricing?.pricePaise || order.pricePaise || 0;
  const priceDisplay = pricePaise ? `₹${Math.round(pricePaise / 100)}` : 'Included';

  const timeSlotValue = order.bookingTimeSlot || 
    (typeof order.timeSlot === 'string' ? order.timeSlot : order.timeSlot?.timeSlotStr) || 
    order.serviceSnapshot?.scheduling?.timeSlot;
  const bookingDateValue = order.bookingDate || order.serviceSnapshot?.scheduling?.date;
  const slotDisplay = timeSlotValue ? (
    (bookingDateValue && !timeSlotValue.includes(bookingDateValue))
      ? `${bookingDateValue}, ${timeSlotValue}`
      : timeSlotValue
  ) : null;

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

      {/* Booked Time Slot Card */}
      {slotDisplay && (
        <div className="bg-slate-800/80 border border-cyan-500/30 rounded-2xl p-4 mb-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Booked Work Time Slot
              </span>
              <h4 className="text-xs font-bold text-cyan-300 mt-0.5">
                📅 Slot: {slotDisplay}
              </h4>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Confirmed</span>
          </span>
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
