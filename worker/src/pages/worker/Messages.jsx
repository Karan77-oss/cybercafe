import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, 
  Info, 
  ArrowRight
} from 'lucide-react';
import { workerApi } from '../../api/worker';

export default function Messages() {
  const [activeJobs, setActiveJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatBottomRef = useRef(null);

  const loadActiveJobs = async () => {
    try {
      const res = await workerApi.getMyJobs();
      const all = res?.jobs || [];
      const active = all.filter(j => ['ACCEPTED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'].includes(j.status));
      setActiveJobs(active);
      if (active.length > 0 && !selectedJob) {
        setSelectedJob(active[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedJob) return;
    try {
      const res = await workerApi.getOrderChat(selectedJob.id);
      if (res?.messages) {
        setChatMessages(res.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadActiveJobs();
  }, []);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedJob]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedJob || sending) return;

    setSending(true);
    try {
      const res = await workerApi.sendChatMessage(selectedJob.id, chatInput.trim());
      if (res?.success && res.message) {
        setChatMessages(prev => [...prev, res.message]);
        setChatInput('');
      }
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading conversations...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
          Customer Communications
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Section 5 & 20: Direct messaging with customers for currently active orders.
        </p>
      </div>

      {activeJobs.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          <MessageSquare size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#334155' }}>No Active Order Conversations</div>
          <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
            Direct customer chat is accessible when you accept and work on active customer orders.
          </div>
          <Link to="/worker/requests" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>
            Check Available Orders
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', minHeight: '560px' }}>
          
          {/* Left Active Order List */}
          <div className="form-card" style={{ padding: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
              Active Conversations ({activeJobs.length})
            </div>

            {activeJobs.map(j => {
              const isSelected = selectedJob?.id === j.id;
              return (
                <div
                  key={j.id}
                  onClick={() => setSelectedJob(j)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? '#eff6ff' : 'white',
                    border: `1.5px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                      {j.customerName || 'Customer'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#3b82f6', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      #{j.orderNumber || j.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {j.serviceName}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Chat Panel */}
          <div className="form-card" style={{ padding: 0, margin: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {selectedJob ? (
              <>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                      {selectedJob.customerName || 'Customer'}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Order: {selectedJob.serviceName} • Status: {selectedJob.status}
                    </div>
                  </div>

                  <Link
                    to={`/worker/jobs/${selectedJob.id}`}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Open Workspace <ArrowRight size={12} />
                  </Link>
                </div>

                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {chatMessages.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                      <Info size={28} style={{ margin: '0 auto 8px' }} />
                      <div>No messages sent yet.</div>
                      <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Say hello or confirm order specifics with the customer.</div>
                    </div>
                  ) : (
                    chatMessages.map(msg => {
                      const isMe = msg.senderRole === 'WORKER';
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '75%',
                            alignSelf: isMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 2 }}>
                            {isMe ? 'You' : (msg.senderName || 'Customer')}
                          </div>
                          <div
                            style={{
                              background: isMe ? '#3b82f6' : '#ffffff',
                              color: isMe ? 'white' : '#1e293b',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              border: isMe ? 'none' : '1px solid #e2e8f0',
                              fontSize: '0.9rem',
                              lineHeight: 1.4
                            }}
                          >
                            {msg.message}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <form onSubmit={handleSendMessage} style={{ padding: '14px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', background: 'white' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder={`Message ${selectedJob.customerName || 'Customer'}...`}
                    disabled={sending}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || sending}
                    className="btn btn-primary"
                    style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Send size={16} /> Send
                  </button>
                </form>
              </>
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
                Select an order from the left to start chatting.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}