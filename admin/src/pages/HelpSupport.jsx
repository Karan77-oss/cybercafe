import { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Search, 
  X, 
  Send, 
  User, 
  Briefcase, 
  AlertCircle 
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { adminApi } from '../api/admin';

export default function HelpSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Drawer
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const loadTickets = () => {
    setLoading(true);
    adminApi.getSupportTickets({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
      q: searchTerm || undefined
    })
      .then(res => {
        setTickets(res.tickets || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load support tickets');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadTickets();
  };

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;
    try {
      await adminApi.replySupportTicket(selectedTicket.id, replyMessage);
      setReplyMessage('');
      loadTickets();
    } catch (err) {
      alert(err.message || 'Failed to reply to ticket');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!internalNote.trim() || !selectedTicket) return;
    try {
      await adminApi.addSupportTicketNote(selectedTicket.id, internalNote);
      setInternalNote('');
      loadTickets();
    } catch (err) {
      alert(err.message || 'Failed to add internal note');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      await adminApi.updateSupportTicketStatus(selectedTicket.id, newStatus);
      loadTickets();
    } catch (err) {
      alert(err.message || 'Failed to update ticket status');
    }
  };

  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Help & Support Desk</h1>
          <p className="subtitle">Manage user support inquiries, in-app customer/worker conversations, and ticket lifecycles.</p>
        </div>
      </div>

      <div className="stats-grid compact">
        <StatCard title="Total Support Tickets" value={totalCount} icon={HelpCircle} color="purple" />
        <StatCard title="Open Tickets" value={openCount} icon={AlertCircle} color="red" />
        <StatCard title="In Progress" value={inProgressCount} icon={Clock} color="yellow" />
        <StatCard title="Resolved" value={resolvedCount} icon={CheckCircle} color="green" />
      </div>

      <div className="data-table-container">
        <div className="table-controls">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '400px' }}>
            <div className="search-box" style={{ width: '100%' }}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search tickets by subject, requester, ID..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            <button type="submit" className="btn btn-outline">Search</button>
          </form>

          <div className="actions">
            <select className="status-filter" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            <select className="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading support tickets...</div>
        ) : error ? (
          <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>{error}</div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No support tickets found matching query.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Requester</th>
                <th>Subject & Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--brand-blue)', fontSize: '0.85rem' }}>
                      {t.id.slice(0, 10)}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.userName || 'User'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.userRole || 'CUSTOMER'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.subject}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.category || 'General Support'}</div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: t.priority === 'URGENT' || t.priority === 'HIGH' ? '#fee2e2' : '#f1f5f9',
                      color: t.priority === 'URGENT' || t.priority === 'HIGH' ? '#b91c1c' : '#475569'
                    }}>
                      {t.priority || 'MEDIUM'}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={t.status || 'OPEN'} />
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{new Date(t.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      Open Ticket
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* TICKET DETAILS DRAWER */}
      {selectedTicket && (
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
              onClick={() => setSelectedTicketId(null)}
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
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <StatusBadge status={selectedTicket.status} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ticket #{selectedTicket.id}</span>
                </div>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.3rem' }}>{selectedTicket.subject}</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  From: <strong>{selectedTicket.userName}</strong> ({selectedTicket.userRole}) • {selectedTicket.userEmail}
                </div>
              </div>

              {/* Status Switcher Bar */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Update Ticket Status:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`btn ${selectedTicket.status === s ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticket Initial Message */}
              <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', borderLeft: '4px solid var(--brand-blue)' }}>
                <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>INQUIRY DETAILS:</div>
                <p style={{ margin: 0, lineHeight: 1.5 }}>{selectedTicket.message || selectedTicket.description}</p>
              </div>

              {/* Message Thread */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={16} /> Conversation Thread ({selectedTicket.thread?.length || 0})
                </h3>

                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {selectedTicket.thread && selectedTicket.thread.length > 0 ? (
                    selectedTicket.thread.map((msg, idx) => (
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
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No replies in this ticket yet.</div>
                  )}
                </div>

                <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="search-box" 
                    style={{ flex: 1 }} 
                    placeholder="Type official reply to customer/worker..." 
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px' }}>
                    <Send size={15} /> Send Reply
                  </button>
                </form>
              </div>

              {/* Internal Admin Notes */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '10px', color: '#475569' }}>
                  Private Support Notes
                </h3>
                
                <div style={{ marginBottom: '12px' }}>
                  {selectedTicket.internalNotes && selectedTicket.internalNotes.length > 0 ? (
                    selectedTicket.internalNotes.map((note, idx) => (
                      <div key={idx} style={{ padding: '8px 12px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '6px', marginBottom: '6px', fontSize: '0.8rem', color: '#713f12' }}>
                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>{note.adminId} • {new Date(note.createdAt).toLocaleString()}</div>
                        <div>{note.note}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No internal notes on this ticket.</div>
                  )}
                </div>

                <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="search-box" 
                    style={{ flex: 1 }} 
                    placeholder="Add internal support note..." 
                    value={internalNote}
                    onChange={e => setInternalNote(e.target.value)}
                  />
                  <button type="submit" className="btn btn-outline" style={{ padding: '6px 12px' }}>
                    Add Note
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
