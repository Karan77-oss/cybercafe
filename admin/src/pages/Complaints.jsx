import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Download, 
  X, 
  MessageSquare, 
  ShieldAlert, 
  DollarSign, 
  RotateCcw, 
  Send, 
  FileText,
  UserCheck,
  HeartHandshake,
  Upload,
  ExternalLink
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { adminApi } from '../api/admin';

export default function Complaints() {
  // Navigation tabs: 'welfare' or 'disputes'
  const [activeTab, setActiveTab] = useState('welfare');

  // General Disputes State
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters for General Disputes
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Drawer for General Disputes
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reply & Internal Notes
  const [replyMessage, setReplyMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Resolution Action Modal
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionDecision, setResolutionDecision] = useState('RELEASE_EARNINGS');
  const [resolutionNote, setResolutionNote] = useState('');

  // Customer Welfare & Refund Cases State
  const [welfareTickets, setWelfareTickets] = useState([]);
  const [welfareLoading, setWelfareLoading] = useState(false);
  const [welfareStatusFilter, setWelfareStatusFilter] = useState('ALL');
  const [selectedWelfareTicket, setSelectedWelfareTicket] = useState(null);

  // Welfare Review & Refund Process Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTicket, setRefundTicket] = useState(null);
  const [refundAmount, setRefundAmount] = useState('199');
  const [utrNumber, setUtrNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  const loadComplaints = () => {
    setLoading(true);
    adminApi.getComplaints({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      role: roleFilter === 'ALL' ? undefined : roleFilter,
      category: categoryFilter === 'ALL' ? undefined : categoryFilter,
      q: searchTerm || undefined
    })
      .then(res => {
        setComplaints(res.complaints || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load complaints');
        setLoading(false);
      });
  };

  const loadWelfareTickets = () => {
    setWelfareLoading(true);
    adminApi.getWelfareTickets({
      status: welfareStatusFilter === 'ALL' ? undefined : welfareStatusFilter
    })
      .then(res => {
        setWelfareTickets(res.tickets || []);
        setWelfareLoading(false);
      })
      .catch(err => {
        console.error('Failed to load welfare tickets:', err);
        setWelfareLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'disputes') {
      loadComplaints();
    } else {
      loadWelfareTickets();
    }
  }, [activeTab, statusFilter, roleFilter, categoryFilter, welfareStatusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadComplaints();
  };

  const openComplaintDetail = (id) => {
    setSelectedComplaintId(id);
    setDetailLoading(true);
    adminApi.getComplaintDetails(id)
      .then(res => {
        setDetail(res.complaint);
        setDetailLoading(false);
      })
      .catch(err => {
        console.error(err);
        setDetailLoading(false);
      });
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !detail) return;
    try {
      await adminApi.replyComplaint(detail.id, replyMessage);
      setReplyMessage('');
      openComplaintDetail(detail.id);
      loadComplaints();
    } catch (err) {
      alert(err.message || 'Failed to send reply');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!internalNote.trim() || !detail) return;
    try {
      await adminApi.addComplaintNote(detail.id, internalNote);
      setInternalNote('');
      openComplaintDetail(detail.id);
    } catch (err) {
      alert(err.message || 'Failed to add internal note');
    }
  };

  const handleResolveComplaint = async () => {
    if (!detail) return;
    try {
      await adminApi.resolveComplaint(detail.id, resolutionDecision, resolutionNote || 'Dispute resolved by Admin');
      setShowResolveModal(false);
      setResolutionNote('');
      openComplaintDetail(detail.id);
      loadComplaints();
    } catch (err) {
      alert(err.message || 'Failed to resolve complaint');
    }
  };

  const handleQuickResolve = async (id) => {
    try {
      await adminApi.resolveComplaint(id, 'RESOLVED', 'Dispute resolved by Administrator');
      loadComplaints();
      if (selectedComplaintId === id) {
        openComplaintDetail(id);
      }
    } catch (err) {
      alert(err.message || 'Failed to resolve complaint');
    }
  };

  // Welfare Ticket Review Status Update
  const handleReviewWelfare = async (ticketId, nextStatus) => {
    try {
      await adminApi.reviewWelfareTicket(ticketId, {
        status: nextStatus,
        note: reviewNote.trim() || `Status updated to ${nextStatus} by Admin`
      });
      setReviewNote('');
      loadWelfareTickets();
      if (selectedWelfareTicket?.id === ticketId) {
        setSelectedWelfareTicket(prev => prev ? { ...prev, status: nextStatus } : null);
      }
    } catch (err) {
      alert(err.message || 'Failed to update welfare ticket status');
    }
  };

  // Open Process Refund Modal
  const openRefundModal = (ticket) => {
    setRefundTicket(ticket);
    setRefundAmount(ticket.refund_record?.amount ? String(ticket.refund_record.amount) : '199');
    setUtrNumber(ticket.refund_record?.utr_number || '');
    setReceiptUrl(ticket.refund_record?.receipt_url || '');
    setShowRefundModal(true);
  };

  // Handle Receipt File Selection (convert to base64 data URL)
  const handleReceiptFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit Process Refund
  const handleProcessRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundTicket) return;
    if (!utrNumber.trim()) {
      alert('Please enter a valid Bank UTR Number / Reference.');
      return;
    }
    setProcessingRefund(true);
    try {
      await adminApi.processRefund(refundTicket.id, {
        amount: Number(refundAmount) || 199,
        utr_number: utrNumber.trim(),
        receipt_url: receiptUrl.trim() || undefined,
        status: 'processed'
      });
      setShowRefundModal(false);
      setRefundTicket(null);
      setUtrNumber('');
      setReceiptUrl('');
      loadWelfareTickets();
      alert('Refund successfully processed! Receipt and UTR recorded.');
    } catch (err) {
      alert(err.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Complaint ID', 'Complainant', 'Role', 'Order ID', 'Subject', 'Category', 'Status', 'Date'];
    const rows = complaints.map(c => [
      c.id,
      `"${c.complainantName || ''}"`,
      c.complainantRole,
      c.orderId || 'N/A',
      `"${c.subject || ''}"`,
      c.category,
      c.status,
      new Date(c.createdAt).toLocaleDateString()
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `complaints_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCount = complaints.length;
  const openCount = complaints.filter(c => c.status === 'OPEN').length;
  const reviewCount = complaints.filter(c => c.status === 'UNDER_REVIEW').length;
  const resolvedCount = complaints.filter(c => c.status === 'RESOLVED').length;

  const welfareTotal = welfareTickets.length;
  const welfareOpen = welfareTickets.filter(t => t.status === 'open' || t.status === 'in_review').length;
  const welfareRefundApproved = welfareTickets.filter(t => t.status === 'refund_approved' || t.status === 'refund_processed').length;
  const welfareResolved = welfareTickets.filter(t => t.status === 'resolved').length;

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Customer Welfare & Disputes</h1>
          <p className="subtitle">Review customer complaints, manage escalated welfare cases, approve refunds, and issue payment proofs.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('welfare')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'welfare' ? '3px solid var(--brand-blue, #2563eb)' : '3px solid transparent',
            color: activeTab === 'welfare' ? 'var(--brand-blue, #2563eb)' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <HeartHandshake size={16} /> Customer Welfare & Refunds ({welfareTotal})
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'disputes' ? '3px solid var(--brand-blue, #2563eb)' : '3px solid transparent',
            color: activeTab === 'disputes' ? 'var(--brand-blue, #2563eb)' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <AlertTriangle size={16} /> General Platform Disputes ({totalCount})
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CUSTOMER WELFARE & REFUNDS PIPELINE               */}
      {/* ======================================================== */}
      {activeTab === 'welfare' && (
        <>
          <div className="stats-grid compact">
            <StatCard title="Welfare Cases" value={welfareTotal} icon={HeartHandshake} color="purple" />
            <StatCard title="Under Review" value={welfareOpen} icon={Clock} color="red" />
            <StatCard title="Refunds Approved/Paid" value={welfareRefundApproved} icon={DollarSign} color="yellow" />
            <StatCard title="Resolved" value={welfareResolved} icon={CheckCircle} color="green" />
          </div>

          <div className="data-table-container">
            <div className="table-controls">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Status Filter:</span>
                <select 
                  className="status-filter" 
                  value={welfareStatusFilter} 
                  onChange={e => setWelfareStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Welfare Cases</option>
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="refund_approved">Refund Approved</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <button 
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                onClick={loadWelfareTickets}
              >
                Refresh
              </button>
            </div>

            {welfareLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Loading customer welfare cases...</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Order & User</th>
                    <th>Issue Type</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Refund Status</th>
                    <th>UTR / Receipt</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {welfareTickets.map(t => {
                    const isProcessed = t.refund_record?.status === 'processed';
                    return (
                      <tr key={t.id}>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--brand-blue)', fontSize: '0.85rem' }}>
                            {t.id.slice(0, 10)}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Order: #{t.order_id?.slice(0, 8) || 'N/A'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>User: {t.user_id?.slice(0, 8)}</div>
                        </td>
                        <td>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '3px 8px', 
                            borderRadius: '12px', 
                            background: '#f1f5f9', 
                            fontWeight: 600,
                            color: '#334155' 
                          }}>
                            {t.issue_type}
                          </span>
                        </td>
                        <td style={{ maxWidth: '240px' }}>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.description}
                          </p>
                          {t.internal_notes && t.internal_notes.length > 0 && (
                            <span style={{ fontSize: '0.72rem', color: '#854d0e', display: 'block', marginTop: '2px' }}>
                              ⚡ {t.internal_notes.length} internal note(s)
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            textTransform: 'uppercase',
                            background: t.status === 'refund_approved' ? '#dcfce7' : t.status === 'open' ? '#fee2e2' : '#f1f5f9',
                            color: t.status === 'refund_approved' ? '#166534' : t.status === 'open' ? '#991b1b' : '#334155'
                          }}>
                            {t.status}
                          </span>
                        </td>
                        <td>
                          {t.refund_record ? (
                            <div>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isProcessed ? '#dcfce7' : '#fef3c7',
                                color: isProcessed ? '#166534' : '#92400e'
                              }}>
                                ₹{t.refund_record.amount} • {isProcessed ? 'Processed' : 'Pending'}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None</span>
                          )}
                        </td>
                        <td>
                          {t.refund_record?.utr_number ? (
                            <div style={{ fontSize: '0.75rem' }}>
                              <span style={{ fontWeight: 600, color: '#334155' }}>UTR: {t.refund_record.utr_number}</span>
                              {t.refund_record.receipt_url && (
                                <a 
                                  href={t.refund_record.receipt_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ display: 'block', color: 'var(--brand-blue)', textDecoration: 'none', marginTop: '2px' }}
                                >
                                  View Receipt ↗
                                </a>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => setSelectedWelfareTicket(t)}
                            >
                              Details
                            </button>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#059669', borderColor: '#059669' }}
                              onClick={() => openRefundModal(t)}
                            >
                              Process Refund
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {welfareTickets.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>
                        No welfare tickets filed yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GENERAL PLATFORM DISPUTES                         */}
      {/* ======================================================== */}
      {activeTab === 'disputes' && (
        <>
          <div className="stats-grid compact">
            <StatCard title="Total Complaints" value={totalCount} icon={AlertTriangle} color="purple" />
            <StatCard title="Open Tickets" value={openCount} icon={Clock} color="red" />
            <StatCard title="Under Review" value={reviewCount} icon={ShieldAlert} color="yellow" />
            <StatCard title="Resolved" value={resolvedCount} icon={CheckCircle} color="green" />
          </div>

          <div className="data-table-container">
            <div className="table-controls">
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '380px' }}>
                <div className="search-box" style={{ width: '100%' }}>
                  <Search size={18} />
                  <input 
                    type="text" 
                    placeholder="Search disputes by ID, user, subject..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
                </div>
                <button type="submit" className="btn btn-outline">Search</button>
              </form>

              <div className="actions">
                <select className="status-filter" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                  <option value="ALL">All Roles</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="WORKER">Worker</option>
                </select>

                <select className="status-filter" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="ALL">All Categories</option>
                  <option value="delayed_order">Delayed Order</option>
                  <option value="incorrect_work">Incorrect Work</option>
                  <option value="bad_communication">Communication</option>
                  <option value="payment_issue">Payment Issue</option>
                  <option value="cancellation">Cancellation</option>
                  <option value="other">Other</option>
                </select>

                <select className="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="ALL">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Loading complaints...</div>
            ) : error ? (
              <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>{error}</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Complainant</th>
                    <th>Related Entity</th>
                    <th>Subject & Category</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id}>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--brand-blue)', fontSize: '0.85rem' }}>
                          {c.id.slice(0, 10)}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.complainantName || 'User'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role: {c.complainantRole}</div>
                      </td>
                      <td>
                        {c.orderId ? (
                          <span style={{ fontSize: '0.85rem', color: 'var(--brand-blue)' }}>Order: {c.orderId}</span>
                        ) : c.workerId ? (
                          <span style={{ fontSize: '0.85rem', color: '#6366f1' }}>Worker: {c.workerId}</span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>General</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.subject}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.category}</div>
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{new Date(c.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            onClick={() => openComplaintDetail(c.id)}
                          >
                            Investigate
                          </button>
                          {(c.status !== 'RESOLVED' && c.status !== 'Resolved') && (
                            <button
                              className="btn btn-outline"
                              style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#16a34a', borderColor: '#16a34a' }}
                              onClick={() => handleQuickResolve(c.id)}
                            >
                              Mark as Resolved
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {complaints.length === 0 && (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>No complaints found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* WELFARE CASE DETAILS DRAWER                              */}
      {/* ======================================================== */}
      {selectedWelfareTicket && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '680px', maxWidth: '92vw', height: '100%',
            backgroundColor: '#fff', padding: '28px', overflowY: 'auto',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', position: 'relative'
          }}>
            <button 
              onClick={() => setSelectedWelfareTicket(null)}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                border: 'none', background: '#f1f5f9', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  background: selectedWelfareTicket.status === 'refund_approved' ? '#dcfce7' : '#fee2e2',
                  color: selectedWelfareTicket.status === 'refund_approved' ? '#166534' : '#991b1b'
                }}>
                  {selectedWelfareTicket.status}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Issue: {selectedWelfareTicket.issue_type}</span>
              </div>

              <h2 style={{ margin: '0 0 6px 0', fontSize: '1.2rem' }}>
                Welfare Case #{selectedWelfareTicket.id.slice(0, 12)}
              </h2>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '18px' }}>
                Order ID: <strong>#{selectedWelfareTicket.order_id}</strong> • Filed on {new Date(selectedWelfareTicket.created_at).toLocaleString()}
              </div>

              {/* Statement of complaint */}
              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid var(--brand-blue)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>CUSTOMER COMPLAINT:</div>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{selectedWelfareTicket.description}</p>
              </div>

              {/* Refund Info Section */}
              <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontWeight: 600, color: '#166534', fontSize: '0.85rem', marginBottom: '8px' }}>
                  Refund Record & Payment Status
                </div>
                {selectedWelfareTicket.refund_record ? (
                  <div style={{ fontSize: '0.85rem', color: '#14532d', spaceY: '4px' }}>
                    <div>Amount: <strong>₹{selectedWelfareTicket.refund_record.amount}</strong></div>
                    <div>Status: <strong>{selectedWelfareTicket.refund_record.status?.toUpperCase()}</strong></div>
                    {selectedWelfareTicket.refund_record.utr_number && (
                      <div>UTR / Bank Ref: <strong>{selectedWelfareTicket.refund_record.utr_number}</strong></div>
                    )}
                    {selectedWelfareTicket.refund_record.receipt_url && (
                      <div style={{ marginTop: '8px' }}>
                        <a 
                          href={selectedWelfareTicket.refund_record.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '4px 8px', textDecoration: 'none' }}
                        >
                          View Receipt / Proof ↗
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                    No refund record initiated yet.
                  </div>
                )}
              </div>

              {/* Internal Notes from Worker & Admin */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: '#475569' }}>
                  Internal Investigation & Worker Notes
                </h4>
                {selectedWelfareTicket.internal_notes && selectedWelfareTicket.internal_notes.length > 0 ? (
                  selectedWelfareTicket.internal_notes.map((n, idx) => (
                    <div key={idx} style={{ padding: '8px 12px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '6px', marginBottom: '6px', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: 600, color: '#713f12' }}>{n.authorRole || 'Note'} • {new Date(n.createdAt).toLocaleTimeString()}</div>
                      <div style={{ color: '#854d0e' }}>{n.note}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No internal notes appended yet.</div>
                )}
              </div>

              {/* Status Update Controls */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>Update Status:</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    onClick={() => handleReviewWelfare(selectedWelfareTicket.id, 'in_review')}
                  >
                    Mark In Review
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.78rem', padding: '6px 12px', color: '#16a34a', borderColor: '#86efac' }}
                    onClick={() => handleReviewWelfare(selectedWelfareTicket.id, 'resolved')}
                  >
                    Mark Resolved
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.78rem', padding: '6px 12px', color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => handleReviewWelfare(selectedWelfareTicket.id, 'rejected')}
                  >
                    Reject Complaint
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ fontSize: '0.78rem', padding: '6px 12px', background: '#059669', borderColor: '#059669' }}
                    onClick={() => openRefundModal(selectedWelfareTicket)}
                  >
                    Process Refund & Upload Proof
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PROCESS REFUND MODAL                                     */}
      {/* ======================================================== */}
      {showRefundModal && refundTicket && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Process Customer Refund
              </h3>
              <button 
                onClick={() => setShowRefundModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProcessRefundSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Target Order ID
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={refundTicket.order_id || ''} 
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Refund Amount (₹) *
                </label>
                <input 
                  type="number" 
                  required
                  value={refundAmount} 
                  onChange={e => setRefundAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Bank UTR / Transaction Reference Number *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. UTR928374829103"
                  value={utrNumber} 
                  onChange={e => setUtrNumber(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Upload Payment Proof / Receipt
                </label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={handleReceiptFileSelect}
                  style={{ width: '100%', padding: '6px 0', fontSize: '0.8rem' }}
                />
                {receiptUrl && (
                  <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Receipt attached ready to publish
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setShowRefundModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={processingRefund}
                  className="btn btn-primary"
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  {processingRefund ? 'Recording...' : 'Confirm & Process Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLAINT INVESTIGATION DRAWER FOR DISPUTES */}
      {selectedComplaintId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '720px', maxWidth: '92vw', height: '100%',
            backgroundColor: '#fff', padding: '28px', overflowY: 'auto',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', position: 'relative'
          }}>
            <button 
              onClick={() => setSelectedComplaintId(null)}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                border: 'none', background: '#f1f5f9', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>

            {detailLoading || !detail ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>Loading dispute details...</div>
            ) : (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <StatusBadge status={detail.status} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{detail.category}</span>
                  </div>
                  <h2 style={{ margin: '0 0 6px 0', fontSize: '1.3rem' }}>{detail.subject}</h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Filed by <strong>{detail.complainantName}</strong> ({detail.complainantRole}) on {new Date(detail.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Dispute Actions Bar */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '10px' }}>Dispute Resolution Controls</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ color: '#16a34a', borderColor: '#86efac', fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => { setResolutionDecision('RELEASE_EARNINGS'); setShowResolveModal(true); }}
                    >
                      <CheckCircle size={14} /> Approve & Release Worker Earnings
                    </button>

                    <button 
                      className="btn btn-outline" 
                      style={{ color: '#ca8a04', borderColor: '#fde047', fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => { setResolutionDecision('REQUEST_CORRECTION'); setShowResolveModal(true); }}
                    >
                      <RotateCcw size={14} /> Request 2h Correction
                    </button>

                    <button 
                      className="btn btn-outline" 
                      style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => { setResolutionDecision('FULL_REFUND'); setShowResolveModal(true); }}
                    >
                      <DollarSign size={14} /> Issue 100% Full Refund
                    </button>

                    <button 
                      className="btn btn-primary" 
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => { setResolutionDecision('RESOLVE_DISPUTE'); setShowResolveModal(true); }}
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>

                {/* Complaint Statement */}
                <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', borderLeft: '4px solid var(--brand-blue)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>STATEMENT OF COMPLAINT:</div>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>{detail.description}</p>
                </div>

                {/* Resolution Decision Display if resolved */}
                {detail.resolution && (
                  <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bbf7d0', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600, color: '#15803d', marginBottom: '4px' }}>OFFICIAL RESOLUTION ({detail.resolution.decision}):</div>
                    <div>{detail.resolution.resolutionNote}</div>
                    <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '4px' }}>Resolved at: {new Date(detail.resolution.resolvedAt).toLocaleString()}</div>
                  </div>
                )}

                {/* Message Thread */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={16} /> Thread Communication ({detail.thread?.length || 0})
                  </h3>
                  
                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                    {detail.thread && detail.thread.length > 0 ? (
                      detail.thread.map((msg, idx) => (
                        <div key={idx} style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          maxWidth: '85%',
                          alignSelf: msg.senderRole === 'ADMIN' ? 'flex-end' : 'flex-start',
                          background: msg.senderRole === 'ADMIN' ? '#eff6ff' : '#f8fafc',
                          border: msg.senderRole === 'ADMIN' ? '1px solid #bfdbfe' : '1px solid #e2e8f0'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            <strong>{msg.senderName} ({msg.senderRole})</strong>
                            <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem' }}>{msg.message}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No messages exchanged in this thread yet.</div>
                    )}
                  </div>

                  <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="search-box" 
                      style={{ flex: 1 }} 
                      placeholder="Type official response to complainant/worker..." 
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px' }}>
                      <Send size={15} /> Send
                    </button>
                  </form>
                </div>

                {/* Internal Admin Investigation Notes */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: '10px', color: '#475569' }}>
                    Internal Investigation Notes (Private to Admin)
                  </h3>
                  
                  <div style={{ marginBottom: '12px' }}>
                    {detail.internalNotes && detail.internalNotes.length > 0 ? (
                      detail.internalNotes.map((note, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '6px', marginBottom: '6px', fontSize: '0.8rem', color: '#713f12' }}>
                          <div style={{ fontWeight: 600, marginBottom: '2px' }}>Note by {note.adminId} • {new Date(note.createdAt).toLocaleString()}</div>
                          <div>{note.note}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No internal notes added.</div>
                    )}
                  </div>

                  <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="search-box" 
                      style={{ flex: 1 }} 
                      placeholder="Add private investigation note..." 
                      value={internalNote}
                      onChange={e => setInternalNote(e.target.value)}
                    />
                    <button type="submit" className="btn btn-outline" style={{ padding: '6px 12px' }}>
                      Add Note
                    </button>
                  </form>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* RESOLUTION MODAL */}
      {showResolveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '460px', width: '100%' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Confirm Dispute Resolution</h3>
            
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Decision Action *</label>
              <select 
                className="status-filter" 
                style={{ width: '100%' }}
                value={resolutionDecision}
                onChange={e => setResolutionDecision(e.target.value)}
              >
                <option value="RELEASE_EARNINGS">Release Worker Earnings (Claim dismissed)</option>
                <option value="REQUEST_CORRECTION">Enforce 2-Hour Correction from Worker</option>
                <option value="FULL_REFUND">Issue Full 100% Refund to Customer</option>
                <option value="RESOLVE_DISPUTE">Custom Resolution</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Formal Resolution Justification *</label>
              <textarea 
                style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                placeholder="Explain the administrative decision and outcome..."
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setShowResolveModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResolveComplaint}>
                Apply & Resolve
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
