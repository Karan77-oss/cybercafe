import { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Plus, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Lock, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  X,
  Send,
  HeartHandshake
} from 'lucide-react';
import { workerApi } from '../../api/worker';

export default function Help() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('General');
  const [subject, setSubject] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Ticket Thread Details Modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Customer Welfare Complaints on Assigned Orders
  const [welfareTickets, setWelfareTickets] = useState([]);
  const [welfareNoteText, setWelfareNoteText] = useState({});
  const [escalateTicketId, setEscalateTicketId] = useState(null);
  const [escalateReason, setEscalateReason] = useState('');

  const loadTickets = async () => {
    try {
      const res = await workerApi.getSupportTickets();
      if (res?.tickets) {
        setTickets(res.tickets);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const loadWelfareTickets = async () => {
    try {
      const res = await workerApi.getWelfareTickets();
      if (res?.tickets) {
        setWelfareTickets(res.tickets);
      }
    } catch (err) {
      console.warn('Welfare tickets loading failed:', err);
    }
  };

  useEffect(() => {
    loadTickets();
    loadWelfareTickets();
  }, []);

  const handleAddWelfareNote = async (ticketId) => {
    const note = welfareNoteText[ticketId];
    if (!note || !note.trim()) return;
    try {
      await workerApi.addWelfareNote(ticketId, note.trim());
      setWelfareNoteText(prev => ({ ...prev, [ticketId]: '' }));
      loadWelfareTickets();
      alert('Internal note added.');
    } catch (err) {
      alert(err.message || 'Failed to add note');
    }
  };

  const handleEscalateWelfare = async (ticketId) => {
    if (!escalateReason.trim()) return;
    try {
      await workerApi.escalateWelfareTicket(ticketId, escalateReason.trim());
      setEscalateTicketId(null);
      setEscalateReason('');
      loadWelfareTickets();
      alert('Complaint escalated to Administrator.');
    } catch (err) {
      alert(err.message || 'Failed to escalate');
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    setSuccessMsg('');
    try {
      const res = await workerApi.createSupportTicket({
        category,
        subject: subject.trim(),
        message: message.trim(),
        orderId: orderId.trim() || undefined
      });
      if (res?.success) {
        setSuccessMsg('Support ticket submitted successfully. Our operations team will respond shortly.');
        setSubject('');
        setOrderId('');
        setMessage('');
        loadTickets();
      }
    } catch (err) {
      alert(err.message || 'Failed to create support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    setReplying(true);
    try {
      const res = await workerApi.replySupportTicket(selectedTicket.id, replyText.trim());
      if (res?.success) {
        setReplyText('');
        const tktRes = await workerApi.getSupportTickets();
        if (tktRes?.tickets) {
          setTickets(tktRes.tickets);
          const updated = tktRes.tickets.find(t => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const faqs = [
    {
      q: 'How does the 10-minute order response window work?',
      a: 'When an order is assigned to you, you have exactly 10 minutes to either Accept or Decline it. If no action is taken within 10 minutes, the offer expires and is automatically reassigned to another available operator to ensure prompt customer service.'
    },
    {
      q: 'Why must I upload an output file before clicking "Finish Work"?',
      a: 'In compliance with platform verification policies (Section 12), customers pay for official documentation services. You must upload at least 1 mandatory official acknowledgement slip, receipt, or final PDF before finishing work to guarantee proof of delivery.'
    },
    {
      q: 'Why was I automatically switched to Offline?',
      a: 'If no mouse, keyboard, or touch activity is detected on your worker portal for 30 minutes, the platform automatically switches your status to Offline. This prevents orders from expiring while you are away from your workstation. You can switch back to Online at any time from the header.'
    },
    {
      q: 'How do I change my bank account or IFSC code?',
      a: 'For financial security and to prevent unauthorized account rerouting (Section 18), bank detail modifications cannot be performed directly in settings. Please submit a support ticket under "Bank Detail Change Request" with your new details and proof of passbook.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
          Worker Help Desk & Support
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Open support tickets for payout inquiries, order disputes, bank detail updates, and platform assistance.
        </p>
      </div>

      {successMsg && (
        <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.9rem' }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* New Ticket Form */}
        <div className="form-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="#3b82f6" /> Open a New Support Ticket
          </h3>

          <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Ticket Category <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: 'white' }}
              >
                <option value="General">General Inquiry</option>
                <option value="Order">Order Dispute / Revision Assistance</option>
                <option value="Payment / Withdrawal">Payment / Withdrawal Status</option>
                <option value="Bank Detail Change">Bank Detail Change Request</option>
                <option value="Technical">Technical Issue</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Subject / Title <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief summary of your query"
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Related Order ID (Optional)
              </label>
              <input
                type="text"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                placeholder="e.g. ord_active_101"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Detailed Description <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Provide clear details or explanation..."
                rows={4}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ padding: '12px', fontWeight: 700, fontSize: '0.95rem' }}
            >
              {submitting ? 'Submitting Ticket...' : 'Submit Support Ticket'}
            </button>
          </form>
        </div>

        {/* Existing Tickets & FAQ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Customer Welfare Complaints for Assigned Orders */}
          <div className="form-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HeartHandshake size={18} color="#ec4899" /> Customer Complaints on Assigned Orders ({welfareTickets.length})
            </h3>

            {welfareTickets.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#10b981', fontSize: '0.85rem', background: '#ecfdf5', borderRadius: '8px' }}>
                <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '6px' }} />
                No customer complaints or welfare cases on your assigned orders.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {welfareTickets.map(wt => (
                  <div key={wt.id} style={{ border: '1px solid #fed7aa', borderRadius: '8px', padding: '14px', background: '#fffaf5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c2410c' }}>
                        Order #{wt.order_id?.slice(0, 8)} • Issue: {wt.issue_type}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        background: wt.status === 'refund_approved' ? '#dcfce7' : '#ffedd5',
                        color: wt.status === 'refund_approved' ? '#166534' : '#9a3412'
                      }}>
                        {wt.status}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#431407', lineHeight: 1.4 }}>
                      "{wt.description}"
                    </p>

                    {wt.refund_record && (
                      <div style={{ fontSize: '0.78rem', color: '#15803d', marginBottom: '8px' }}>
                        Refund: <strong>₹{wt.refund_record.amount}</strong> ({wt.refund_record.status})
                        {wt.refund_record.utr_number && ` • UTR: ${wt.refund_record.utr_number}`}
                      </div>
                    )}

                    {wt.internal_notes && wt.internal_notes.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#78350f', textTransform: 'uppercase' }}>
                          Internal Notes:
                        </span>
                        {wt.internal_notes.map((n, idx) => (
                          <div key={idx} style={{ fontSize: '0.78rem', color: '#78350f', background: '#fef3c7', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>
                            {n.note}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Append internal note..."
                        value={welfareNoteText[wt.id] || ''}
                        onChange={e => setWelfareNoteText(prev => ({ ...prev, [wt.id]: e.target.value }))}
                        style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #fed7aa' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddWelfareNote(wt.id)}
                        className="btn btn-outline"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      >
                        Add Note
                      </button>
                      <button
                        type="button"
                        onClick={() => setEscalateTicketId(wt.id)}
                        className="btn btn-outline"
                        style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '6px 10px', fontSize: '0.78rem' }}
                      >
                        Escalate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ticket History */}
          <div className="form-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b' }}>
              Your Support Tickets ({tickets.length})
            </h3>

            {loading ? (
              <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                No active or past support tickets found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tickets.map(tkt => (
                  <div
                    key={tkt.id}
                    onClick={() => setSelectedTicket(tkt)}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '14px',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#f0fdf4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6' }}>#{tkt.id}</span>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        background: tkt.status === 'Resolved' ? '#ecfdf5' : '#eff6ff',
                        color: tkt.status === 'Resolved' ? '#065f46' : '#1d4ed8'
                      }}>
                        {tkt.status}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '4px' }}>
                      {tkt.subject}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#475569', marginBottom: '8px' }}>
                      {tkt.message}
                    </div>

                    {tkt.replies && tkt.replies.length > 0 && (
                      <div style={{ background: 'white', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
                          Latest Response ({tkt.replies[tkt.replies.length - 1].senderRole}):
                        </div>
                        <div style={{ fontSize: '0.84rem', color: '#334155' }}>
                          {tkt.replies[tkt.replies.length - 1].message}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MessageSquare size={13} /> View full conversation thread & reply →
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick FAQ Section */}
          <div className="form-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#1e293b' }}>
              Worker Operations FAQ
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {faqs.map((faq, index) => {
                const isExpanded = expandedFaq === index;
                return (
                  <div
                    key={index}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      onClick={() => setExpandedFaq(isExpanded ? null : index)}
                      style={{
                        padding: '12px 14px',
                        background: isExpanded ? '#eff6ff' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        color: isExpanded ? '#1d4ed8' : '#1e293b'
                      }}
                    >
                      <span>{faq.q}</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '12px 14px', background: 'white', fontSize: '0.84rem', color: '#475569', lineHeight: 1.5, borderTop: '1px solid #e2e8f0' }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Ticket Details & Conversation Modal */}
      {selectedTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Ticket #{selectedTicket.id}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  background: selectedTicket.status === 'Resolved' ? '#ecfdf5' : '#eff6ff',
                  color: selectedTicket.status === 'Resolved' ? '#065f46' : '#1d4ed8'
                }}>
                  {selectedTicket.status}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  background: '#f1f5f9',
                  color: '#475569'
                }}>
                  {selectedTicket.category}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: '#1e293b' }}>
                  {selectedTicket.subject}
                </h4>
                {selectedTicket.orderId && (
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '8px' }}>
                    Linked Order ID: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6' }}>{selectedTicket.orderId}</span>
                  </div>
                )}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '0.88rem',
                  color: '#334155',
                  lineHeight: 1.5
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                    INITIAL TICKET MESSAGE:
                  </div>
                  {selectedTicket.message}
                </div>
              </div>

              {/* Replies Thread */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>
                  Conversation Thread ({selectedTicket.replies?.length || 0})
                </div>

                {(!selectedTicket.replies || selectedTicket.replies.length === 0) ? (
                  <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.84rem', color: '#64748b', textAlign: 'center' }}>
                    No replies yet. Our support operations team reviews open tickets periodically.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedTicket.replies.map((reply, idx) => {
                      const isAdmin = reply.senderRole === 'ADMIN' || reply.senderRole === 'SUPPORT';
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: isAdmin ? '#bbf7d0' : '#e2e8f0',
                            background: isAdmin ? '#f0fdf4' : '#f8fafc',
                            alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                            maxWidth: '90%',
                            width: 'fit-content'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isAdmin ? '#dcfce7' : '#e2e8f0',
                              color: isAdmin ? '#15803d' : '#475569'
                            }}>
                              {isAdmin ? 'Admin Operations' : 'You (Worker)'}
                            </span>
                            {reply.createdAt && (
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.4 }}>
                            {reply.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer / Reply Input */}
            <form onSubmit={handleSendReply} style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Post a follow-up reply to operations team..."
                rows={2}
                disabled={replying}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  resize: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={replying || !replyText.trim()}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={14} />
                  {replying ? 'Sending...' : 'Post Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate to Admin Modal */}
      {escalateTicketId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#0f172a' }}>
              Escalate Case to Admin
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#64748b' }}>
              State the operational reasons for administrator review or refund approval.
            </p>
            <textarea
              required
              rows={3}
              placeholder="e.g. Applicant claims official server downtime caused rejection; please review and approve refund..."
              value={escalateReason}
              onChange={e => setEscalateReason(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginBottom: '14px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setEscalateTicketId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!escalateReason.trim()}
                className="btn btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => handleEscalateWelfare(escalateTicketId)}
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}