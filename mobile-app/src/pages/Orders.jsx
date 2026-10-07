import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Clock, ChevronRight, RefreshCw, 
  AlertCircle, CheckCircle2, Loader2, Plus, Calendar, PhoneCall, ShieldCheck
} from 'lucide-react';
import { ordersApi, authApi } from '../api/client';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuthenticated = authApi.isAuthenticated();

  const fetchOrders = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await ordersApi.getMyOrders();
      const list = res?.orders || res?.data?.orders || (Array.isArray(res) ? res : []);
      setOrders(list);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Could not retrieve orders. Please check network.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-12 max-w-lg mx-auto text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-100 mb-2">Track Your Orders</h2>
        <p className="text-xs text-slate-400 max-w-xs mb-6">
          Sign in to view real-time filing progress, operator updates, and download verified receipts.
        </p>
        <button
          onClick={() => {
            localStorage.setItem('redirectAfterAuth', '/orders');
            navigate('/auth');
          }}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold rounded-xl text-xs shadow-lg active:scale-95 transition-all"
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
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'IN_PROGRESS':
      case 'PROCESSING':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'ASSIGNED':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-3 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-extrabold text-slate-100">My Orders</h1>
          <p className="text-[10px] text-slate-400 font-medium">Real-time cafe fulfillment status</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-full text-xs font-semibold hover:bg-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
          <button
            onClick={fetchOrders}
            className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/40 animate-pulse h-24" />
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
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-md active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="truncate">
                    <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <h3 className="text-xs font-bold text-slate-100 truncate">
                      {order.serviceSnapshot?.name || order.serviceName || 'Application Service'}
                    </h3>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusColor(status)}`}>
                    {status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Highlighted Booked Call Slot: 📞 Callback Window */}
                {fullSlotBadge && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-1 rounded-lg mb-2.5 w-fit">
                    <PhoneCall className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>📞 Callback Window: {fullSlotBadge}</span>
                  </div>
                )}

                {/* Uploaded Documents Count & Thumbnails */}
                {docs.length > 0 && (
                  <div className="flex items-center gap-2 mb-2.5 bg-slate-900/60 border border-slate-700/50 rounded-xl p-1.5 px-2.5 w-fit">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {docs.slice(0, 3).map((d, i) => (
                        <div
                          key={d.id || i}
                          className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] text-cyan-300 shrink-0 overflow-hidden"
                          title={d.name || d.docName || 'Document'}
                        >
                          {d.url && (d.mimeType?.startsWith('image/') || d.fileName?.match(/\.(jpg|jpeg|png|webp)$/i)) ? (
                            <img src={d.url} alt="doc" className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-3 h-3 text-cyan-400" />
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>{docs.length} Doc{docs.length > 1 ? 's' : ''} Attached</span>
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-cyan-400">
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
      {!loading && orders.length === 0 && (
        <div className="text-center py-12 px-4 glass-card rounded-3xl mt-4">
          <FileText className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-bold text-slate-200 mb-1">No Orders Yet</h4>
          <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto">
            Book any cyber cafe service from the catalog to start tracking live progress here.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs"
          >
            Explore Services
          </button>
        </div>
      )}
    </div>
  );
}
