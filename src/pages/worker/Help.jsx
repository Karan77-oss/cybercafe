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
  AlertCircle
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

  useEffect(() => {
    loadTickets();
  }, []);

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
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '14px',
                      background: '#f8fafc'
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
                          Admin Response:
                        </div>
                        <div style={{ fontSize: '0.84rem', color: '#334155' }}>
                          {tkt.replies[tkt.replies.length - 1].message}
                        </div>
                      </div>
                    )}
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
    </div>
  );
}