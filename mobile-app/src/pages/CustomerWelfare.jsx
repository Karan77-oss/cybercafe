import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartHandshake, AlertCircle, CheckCircle2, Clock,
  ArrowLeft, Send, Download, RefreshCw,
  ShieldCheck, DollarSign, ExternalLink, UploadCloud
} from 'lucide-react';
import { welfareApi, ordersApi, authApi, resolveBackendUrl } from '../api/client';

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
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resolved / Processed
        </span>
      );
    }
    if (s.includes('approved')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-200/70 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3 text-sky-600" /> Refund Approved
        </span>
      );
    }
    if (s.includes('review')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3 text-amber-600" /> Under Review
        </span>
      );
    }
    if (s.includes('rejected')) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3 text-rose-500" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3 text-slate-500" /> Open
      </span>
    );
  };

  return (
    <div className="px-5 pt-4 pb-28 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-white shadow-neo-sm border border-slate-100 flex items-center justify-center text-slate-700 hover:text-slate-900 active:scale-95 transition-transform shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug">Welfare Desk & Disputes</h1>
            <p className="text-[10px] text-slate-500 font-medium">Fast-track complaint resolution</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="w-8 h-8 rounded-full bg-white shadow-neo-sm border border-slate-100 flex items-center justify-center text-slate-500 hover:text-sky-600 active:scale-95 transition-transform shrink-0"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="mb-1 p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-1 p-3 bg-emerald-50 border border-emerald-200/70 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Register New Complaint Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h2 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5 text-sky-600" />
            <span>Register a Complaint / Request</span>
          </h2>
          <span className="text-[9px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200/70">
            Citizen Guarantee
          </span>
        </div>

        <form onSubmit={handleSubmitTicket} className="space-y-3">
          {/* Select Order */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Select Related Order <span className="text-rose-500">*</span>
            </label>
            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No existing orders found. Start a new service order first.</p>
            ) : (
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
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
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Nature of Issue <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {issueTypes.map((t) => {
                const isSelected = issueType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setIssueType(t)}
                    className={`py-1.5 px-2.5 rounded-xl text-[11px] font-semibold border text-left transition-all ${
                      isSelected
                        ? 'border-sky-400 bg-sky-50/60 text-sky-800 font-bold ring-2 ring-sky-500/20'
                        : 'border-slate-200/80 bg-[#F8FAFC] text-slate-500 hover:bg-slate-100/60'
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
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Complaint Details <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the issue (e.g. payment deducted but service stuck; wrong date entered; requesting full refund...)"
              className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 resize-none"
            />
          </div>

          {/* Optional Proof Upload Strip */}
          <button
            type="button"
            className="w-full py-2.5 px-4 border border-dashed border-slate-300 rounded-2xl bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-slate-600"
          >
            <UploadCloud className="w-4 h-4 text-sky-600" />
            <span>Attach receipt or screenshot (Optional)</span>
          </button>

          <button
            type="submit"
            disabled={submitting || orders.length === 0}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Submitting...' : 'Submit to Welfare Desk'}</span>
          </button>
        </form>
      </div>

      {/* 24h Guarantee Card */}
      <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-3xl p-3.5 flex items-start gap-3">
        <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-emerald-900">24-hour Turnaround Guarantee</h4>
          <p className="text-[10px] text-emerald-700 mt-0.5 leading-snug">
            Our specialized welfare team will review and resolve this dispute within 24 working hours.
          </p>
        </div>
      </div>

      {/* Your Submitted Tickets & Refund Tracker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Your Cases & Refund Tracking ({tickets.length})
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Loading cases...</div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center shadow-neo-card">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">No active complaints</p>
            <p className="text-[11px] text-slate-500 mt-0.5">All your services are processed with zero pending disputes.</p>
          </div>
        ) : (
          tickets.map((t) => {
            const refund = t.refundRecord;
            const refundProcessed = refund && (refund.status === 'processed' || t.status === 'refund_processed');

            return (
              <div
                key={t.id}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-sky-700">#{t.id}</span>
                      <span className="text-[10px] text-slate-500 font-medium truncate">Order #{t.order_id}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 mt-1">{t.issue_type}</h3>
                  </div>
                  <div className="shrink-0">{getStatusBadge(t.status)}</div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
                  {t.description}
                </p>

                {/* Refund Status Card if applicable */}
                {refund && (
                  <div className="bg-sky-50/60 border border-sky-200/70 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-sky-800 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-sky-600" /> Refund Record
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                        refundProcessed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                          : 'bg-amber-50 text-amber-700 border-amber-200/70'
                      }`}>
                        {refundProcessed ? 'PROCESSED' : 'PENDING'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 pt-2 border-t border-sky-100">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Refund Amount:</span>
                        <span className="font-extrabold text-slate-900">₹{refund.amount}</span>
                      </div>
                      {refund.utr_number && (
                        <div>
                          <span className="text-slate-500 block text-[10px]">Bank UTR No:</span>
                          <span className="font-mono text-sky-700 font-bold">{refund.utr_number}</span>
                        </div>
                      )}
                    </div>

                    {/* Official Receipt Link from Admin */}
                    {refund.receipt_url && (
                      <div className="pt-2 border-t border-sky-100">
                        <a
                          href={resolveBackendUrl(refund.receipt_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white border border-sky-500 rounded-xl text-[11px] font-bold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Admin Refund Receipt</span>
                          <ExternalLink className="w-3 h-3" />
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
                      <div key={i} className="text-[11px] text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-bold text-sky-700">{n.authorName} ({n.role}):</span> {n.note}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Created: {new Date(t.created_at).toLocaleString()}</span>
                  {t.is_escalated && (
                    <span className="text-amber-700 font-bold">⚡ Escalated to Senior Admin</span>
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
