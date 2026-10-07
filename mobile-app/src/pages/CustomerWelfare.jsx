import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartHandshake, AlertCircle, CheckCircle2, Clock, 
  ArrowLeft, FileText, Send, Download, RefreshCw, 
  ChevronRight, ShieldCheck, DollarSign, ExternalLink
} from 'lucide-react';
import { welfareApi, ordersApi, authApi } from '../api/client';

export default function CustomerWelfare() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [issueType, setIssueType] = useState('Payment/Refund');
  const [description, setDescription] = useState('');

  const issueTypes = [
    'Payment/Refund',
    'Application Delay',
    'Portal Rejection',
    'Incorrect Filing Details',
    'Missing Final Document',
    'Other Service Dispute'
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [ticketRes, orderRes] = await Promise.all([
        welfareApi.getMyTickets().catch(() => ({ tickets: [] })),
        ordersApi.getOrders().catch(() => ({ orders: [] }))
      ]);

      setTickets(ticketRes?.tickets || ticketRes?.data || []);
      const userOrders = orderRes?.orders || orderRes?.data || (Array.isArray(orderRes) ? orderRes : []);
      setOrders(userOrders);
      if (userOrders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(userOrders[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load welfare records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      localStorage.setItem('redirectAfterAuth', '/customer-welfare');
      navigate('/auth');
      return;
    }
    loadData();
  }, []);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!selectedOrderId) {
      setError('Please select an order for this complaint.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description of your issue.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await welfareApi.createTicket({
        order_id: selectedOrderId,
        issue_type: issueType,
        description: description.trim()
      });
      setSuccess('Complaint successfully registered. Our welfare team is reviewing your case.');
      setDescription('');
      loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('processed') || s.includes('resolved')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> Resolved / Processed
        </span>
      );
    }
    if (s.includes('approved')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3" /> Refund Approved
        </span>
      );
    }
    if (s.includes('review')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" /> Under Review
        </span>
      );
    }
    if (s.includes('rejected')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-700/60 border border-slate-600 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> Open
      </span>
    );
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-3 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-cyan-400" />
              Customer Welfare Desk
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Complaints, Escalate Issues & Refund Tracking</p>
          </div>
        </div>
        <button 
          onClick={loadData}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Register New Complaint Card */}
      <div className="bg-slate-850/90 border border-slate-750 rounded-2xl p-4 mb-5 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-750 pb-2.5">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <span>Register a Complaint / Request</span>
          </h2>
          <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
            Citizen Guarantee
          </span>
        </div>

        <form onSubmit={handleSubmitTicket} className="space-y-3">
          {/* Select Order */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Select Related Order <span className="text-rose-400">*</span>
            </label>
            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No existing orders found.</p>
            ) : (
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.id} - {o.serviceName || o.serviceSnapshot?.name || 'Service'} (₹{((o.pricePaise || 19900) / 100)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Issue Type Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Nature of Issue <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {issueTypes.map((t) => {
                const isSelected = issueType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setIssueType(t)}
                    className={`py-1.5 px-2.5 rounded-lg text-[11px] font-medium border text-left transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Issue Description */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Complaint Details <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the issue (e.g. payment deducted but service stuck; wrong date entered; requesting full refund...)"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || orders.length === 0}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-98"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Submitting...' : 'Submit to Welfare Desk'}</span>
          </button>
        </form>
      </div>

      {/* Your Submitted Tickets & Refund Tracker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Your Cases & Refund Tracking ({tickets.length})
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Loading cases...</div>
        ) : tickets.length === 0 ? (
          <div className="bg-slate-850/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
            <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No active complaints</p>
            <p className="text-[11px] text-slate-500 mt-0.5">All your services are processed with zero pending disputes.</p>
          </div>
        ) : (
          tickets.map((t) => {
            const refund = t.refundRecord;
            const refundProcessed = refund && (refund.status === 'processed' || t.status === 'refund_processed');

            return (
              <div 
                key={t.id}
                className="bg-slate-850 border border-slate-750 rounded-2xl p-4 shadow-md space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-cyan-300">#{t.id}</span>
                      <span className="text-[11px] text-slate-400 font-medium">Order #{t.order_id}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-100 mt-1">{t.issue_type}</h3>
                  </div>
                  <div>{getStatusBadge(t.status)}</div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  {t.description}
                </p>

                {/* Refund Status Card if applicable */}
                {refund && (
                  <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-300 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" /> Refund Record
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        refundProcessed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {refundProcessed ? 'PROCESSED' : 'PENDING'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Refund Amount:</span>
                        <span className="font-bold text-white">₹{refund.amount}</span>
                      </div>
                      {refund.utr_number && (
                        <div>
                          <span className="text-slate-500 block text-[10px]">Bank UTR No:</span>
                          <span className="font-mono text-cyan-300 font-semibold">{refund.utr_number}</span>
                        </div>
                      )}
                    </div>

                    {/* Official Receipt Link from Admin */}
                    {refund.receipt_url && (
                      <div className="pt-2 border-t border-slate-800">
                        <a
                          href={refund.receipt_url.startsWith('http') ? refund.receipt_url : `http://localhost:4000${refund.receipt_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Admin Refund Receipt</span>
                          <ExternalLink className="w-3 h-3 text-indigo-400" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Internal / Administrative Decision Notes */}
                {t.internal_notes && t.internal_notes.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Desk Updates:</span>
                    {t.internal_notes.map((n, i) => (
                      <div key={i} className="text-[11px] text-slate-300 bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                        <span className="text-[10px] font-semibold text-cyan-400">{n.authorName} ({n.role}):</span> {n.note}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Created: {new Date(t.created_at).toLocaleString()}</span>
                  {t.is_escalated && (
                    <span className="text-amber-400 font-semibold">⚡ Escalated to Senior Admin</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
