import { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  Phone, 
  MessageSquare, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Support ticket form state
  const [ticketData, setTicketData] = useState({ subject: '', category: 'General', orderId: '', message: '' });
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [ticketError, setTicketError] = useState('');

  const faqs = [
    {
      id: 1,
      category: 'orders',
      question: 'How does the 24-Hour SLA Guarantee work?',
      answer: 'Every customer order is placed on an active 24-hour SLA timer. Assigned cyber cafe operators must accept and begin processing your application promptly. If an order cannot be serviced within this window, the platform will reassign it or refund the full fee directly to your platform wallet.'
    },
    {
      id: 2,
      category: 'privacy',
      question: 'How are my uploaded identity documents protected?',
      answer: 'All uploaded files (Aadhaar, PAN, marksheets, signatures) are stored with secure access control and are only visible to your assigned verified operator during the execution period. Once your order status is marked as COMPLETED or CANCELLED, working documents are automatically purged from the operator workspace.'
    },
    {
      id: 3,
      category: 'verification',
      question: 'How do video/audio slots and live verification work?',
      answer: 'Certain official portals require one-time passwords (OTP) sent to the applicant’s mobile number or live biometric/signature checks. Your operator can propose a real-time online slot. Once you accept, an interactive screen and communication room opens inside your Order Tracking dashboard.'
    },
    {
      id: 4,
      category: 'payments',
      question: 'What payment methods can I use?',
      answer: 'We support all major Indian UPI applications (Google Pay, PhonePe, Paytm, BHIM), Debit & Credit cards (Visa, Mastercard, RuPay), and our internal Platform Wallet. Transactions are encrypted end-to-end.'
    },
    {
      id: 5,
      category: 'orders',
      question: 'Can I choose my preferred cyber cafe operator?',
      answer: 'Yes! During checkout at the "Worker" step, you can select "Automatic Assignment" for the quickest available turnaround or browse top-rated verified operators to select your preferred partner based on customer ratings and completed jobs.'
    },
    {
      id: 6,
      category: 'privacy',
      question: 'What should I do if an official portal encounters downtime?',
      answer: 'If government portals (like UIDAI, Income Tax, or State portals) experience server outages, your operator will post an update in your order activity log and schedule an alternate slot as soon as the portal resumes.'
    },
    {
      id: 7,
      category: 'payments',
      question: 'How do refunds work if my application is rejected?',
      answer: 'If an application cannot be completed due to platform or operator reasons, 100% of the service fee is immediately credited back to your Platform Wallet. You can use it for any other service or request a bank withdrawal.'
    }
  ];

  const categories = [
    { id: 'all', label: 'All FAQs' },
    { id: 'orders', label: 'Orders & 24h Guarantee' },
    { id: 'privacy', label: 'Documents & Privacy' },
    { id: 'verification', label: 'Appointments & Verification' },
    { id: 'payments', label: 'Payments & Wallet' }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchQuery = !searchQuery.trim() || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchQuery;
  });

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketData.subject || !ticketData.message) {
      setTicketError('Please provide both a subject and a message.');
      return;
    }
    setTicketError('');
    setTicketSubmitted(true);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px', padding: '24px 16px' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: '12px' }}>Customer Help & Support</h1>
        <p className="text-muted" style={{ fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto 28px' }}>
          Have questions about your applications, documents, or operators? We’re here to help you every step of the way.
        </p>

        {/* Search Input */}
        <div style={{ 
          maxWidth: '540px', 
          margin: '0 auto', 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'white',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border-color)',
          padding: '8px 16px'
        }}>
          <Search size={20} color="var(--text-muted)" style={{ marginRight: '10px' }} />
          <input 
            type="text" 
            placeholder="Search questions or keywords..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem' }}
          />
        </div>
      </div>

      {/* Quick Contact Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '48px' }}>
        <div className="form-card" style={{ padding: '20px', margin: 0, textAlign: 'center' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(83, 100, 249, 0.1)', color: 'var(--brand-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Phone size={22} />
          </div>
          <h4 style={{ marginBottom: '6px' }}>Helpline Support</h4>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '10px' }}>Mon - Sun, 8:00 AM - 10:00 PM</p>
          <div style={{ fontWeight: 600, color: 'var(--brand-blue)' }}>1800-420-CYBER</div>
        </div>

        <div className="form-card" style={{ padding: '20px', margin: 0, textAlign: 'center' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(83, 100, 249, 0.1)', color: 'var(--brand-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <MessageSquare size={22} />
          </div>
          <h4 style={{ marginBottom: '6px' }}>WhatsApp Assistance</h4>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '10px' }}>Instant response for live orders</p>
          <div style={{ fontWeight: 600, color: 'var(--green)' }}>+91 98765 43210</div>
        </div>

        <div className="form-card" style={{ padding: '20px', margin: 0, textAlign: 'center' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(83, 100, 249, 0.1)', color: 'var(--brand-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Mail size={22} />
          </div>
          <h4 style={{ marginBottom: '6px' }}>Email Support</h4>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '10px' }}>Detailed queries & escalations</p>
          <div style={{ fontWeight: 600, color: 'var(--brand-blue)' }}>support@cybercafe.in</div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs" style={{ marginBottom: '24px' }}>
        {categories.map(c => (
          <button 
            key={c.id} 
            className={`category-tab ${activeCategory === c.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div style={{ marginBottom: '50px' }}>
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map(faq => {
            const isOpen = expandedFaq === faq.id;
            return (
              <div 
                key={faq.id} 
                style={{ 
                  background: 'white', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)', 
                  marginBottom: '12px', 
                  overflow: 'hidden' 
                }}
              >
                <div 
                  onClick={() => setExpandedFaq(isOpen ? null : faq.id)}
                  style={{ 
                    padding: '18px 20px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    background: isOpen ? 'rgba(83, 100, 249, 0.03)' : 'white'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                    {faq.question}
                  </span>
                  {isOpen ? <ChevronUp size={20} color="var(--brand-blue)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                </div>
                {isOpen && (
                  <div style={{ padding: '0 20px 20px 20px', fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px' }}>
            <HelpCircle size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <p className="text-muted">No answers found for your query. Try another keyword or submit a ticket below.</p>
          </div>
        )}
      </div>

      {/* Submit Support Ticket Card */}
      <div className="form-card" style={{ padding: '32px' }}>
        <h3 style={{ marginBottom: '8px' }}>Still need assistance? Raise a Support Ticket</h3>
        <p className="text-muted" style={{ marginBottom: '24px', fontSize: '0.9rem' }}>
          Our customer resolution desk typically responds within 2 business hours.
        </p>

        {ticketSubmitted ? (
          <div style={{ 
            background: 'rgba(46, 204, 113, 0.1)', 
            border: '1px solid var(--green)', 
            borderRadius: '12px', 
            padding: '24px', 
            textAlign: 'center' 
          }}>
            <CheckCircle size={36} color="var(--green)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ color: 'var(--green)', marginBottom: '8px' }}>Support Ticket Submitted Successfully</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Reference ID: <strong>TKT-{(Math.random() * 100000 | 0)}</strong>. A support executive has been assigned and will update you via notifications.
            </p>
            <button 
              className="btn btn-outline" 
              style={{ marginTop: '16px' }}
              onClick={() => { setTicketSubmitted(false); setTicketData({ subject: '', category: 'General', orderId: '', message: '' }); }}
            >
              Submit Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {ticketError && (
              <div style={{ color: 'var(--red)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} /> {ticketError}
              </div>
            )}
            
            <div className="grid-2">
              <div>
                <label className="form-label">Subject *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Question regarding PAN application"
                  value={ticketData.subject} 
                  onChange={e => setTicketData({ ...ticketData, subject: e.target.value })} 
                  required 
                />
              </div>
              <div>
                <label className="form-label">Category</label>
                <select 
                  className="form-input" 
                  value={ticketData.category} 
                  onChange={e => setTicketData({ ...ticketData, category: e.target.value })}
                >
                  <option value="General">General Inquiry</option>
                  <option value="Order Status">Order Status & 24h SLA</option>
                  <option value="Payment & Wallet">Payment & Wallet</option>
                  <option value="Document Verification">Document Verification</option>
                  <option value="Worker Feedback">Worker Feedback / Escalation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Order ID (Optional)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. ord_123456" 
                value={ticketData.orderId} 
                onChange={e => setTicketData({ ...ticketData, orderId: e.target.value })} 
              />
            </div>

            <div>
              <label className="form-label">Message Details *</label>
              <textarea 
                className="form-input" 
                rows="4" 
                placeholder="Explain the issue or question in detail..."
                value={ticketData.message} 
                onChange={e => setTicketData({ ...ticketData, message: e.target.value })} 
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>
              Submit Inquiry
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
