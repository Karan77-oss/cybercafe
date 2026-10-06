import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  FileText, 
  Send, 
  Upload, 
  Phone, 
  Mail, 
  ShieldCheck, 
  AlertTriangle,
  Play,
  Calendar,
  Lock,
  ExternalLink,
  Info,
  Trash2,
  Download,
  Paperclip
} from 'lucide-react';
import { workerApi } from '../../api/worker';
import { buildUrl } from '../../api/client';

export default function JobWorkspace() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Time Slot State
  const [slotDate, setSlotDate] = useState('Today');
  const [slotStart, setSlotStart] = useState('10:00 AM');
  const [slotEnd, setSlotEnd] = useState('12:00 PM');
  const [updatingSlot, setUpdatingSlot] = useState(false);

  // Deliverables State
  const [deliverableName, setDeliverableName] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableFile, setDeliverableFile] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadingDeliverable, setUploadingDeliverable] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [finishing, setFinishing] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);
  const chatBottomRef = useRef(null);

  const loadJobData = async () => {
    try {
      const res = await workerApi.getJobDetails(jobId);
      if (res?.job) {
        setJob(res.job);
        setIsChatClosed(res.job.status === 'COMPLETED' || res.job.status === 'CANCELLED');
      } else {
        setError('Order not found or unauthorized');
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load order workspace: ' + err.message);
      setLoading(false);
    }
  };

  const loadChat = async () => {
    try {
      const res = await workerApi.getOrderChat(jobId);
      if (res?.messages) {
        setChatMessages(res.messages);
      }
      if (res?.isClosed) {
        setIsChatClosed(true);
      }
    } catch (err) {
      // Chat might be closed or not found
    }
  };

  useEffect(() => {
    loadJobData();
    loadChat();

    const chatInterval = setInterval(loadChat, 5000);
    return () => clearInterval(chatInterval);
  }, [jobId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Section 10: Propose / Confirm Time Slot
  const handleSetTimeSlot = async (e) => {
    e.preventDefault();
    if (!slotStart || !slotEnd) return;
    setUpdatingSlot(true);
    try {
      const res = await workerApi.setTimeSlot(jobId, {
        date: slotDate,
        startTime: slotStart,
        endTime: slotEnd
      });
      if (res?.success) {
        setJob(res.order);
        alert('Time slot set and customer notified.');
      }
    } catch (err) {
      alert(err.message || 'Failed to update time slot');
    } finally {
      setUpdatingSlot(false);
    }
  };

  // Accept Customer Reschedule
  const handleAcceptReschedule = async () => {
    setUpdatingSlot(true);
    try {
      const res = await workerApi.acceptReschedule(jobId);
      if (res?.success) {
        setJob(res.order);
        alert('Customer reschedule accepted! Working window is confirmed.');
      }
    } catch (err) {
      alert(err.message || 'Failed to accept reschedule');
    } finally {
      setUpdatingSlot(false);
    }
  };

  // Section 11: Start Work
  const handleStartWork = async () => {
    try {
      const res = await workerApi.startWork(jobId);
      if (res?.success) {
        setJob(res.order);
      }
    } catch (err) {
      alert(err.message || 'Failed to start work');
    }
  };

  const handleDownloadDoc = async (doc) => {
    try {
      const token = localStorage.getItem('cybercafe:token');
      const targetUrl = buildUrl(doc.url || `/documents/${doc.id}/download`);
      const res = await fetch(targetUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = doc.fileName || doc.name || `Document_${doc.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        const authParam = token ? `?token=${encodeURIComponent(token)}` : '';
        const fallbackUrl = targetUrl.includes('?') ? `${targetUrl}&token=${encodeURIComponent(token || '')}` : `${targetUrl}${authParam}`;
        window.open(fallbackUrl, '_blank');
      }
    } catch (err) {
      console.error('Download error:', err);
      const token = localStorage.getItem('cybercafe:token');
      const targetUrl = buildUrl(doc.url || `/documents/${doc.id}/download`);
      window.open(`${targetUrl}?token=${encodeURIComponent(token || '')}`, '_blank');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDeliverableFile(file);
      if (!deliverableName.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setDeliverableName(cleanName || file.name);
      }
    }
  };

  // Section 12: Add Deliverable (1 mandatory + max 1 optional)
  const handleAddDeliverable = async (e) => {
    e.preventDefault();
    if (!deliverableFile && !deliverableName.trim()) {
      alert('Please select a file or enter a document title to upload');
      return;
    }

    const currentDeliverables = job.deliverables || [];
    if (currentDeliverables.length >= 2) {
      alert('Maximum 2 deliverables allowed (1 mandatory final receipt/output + 1 optional proof)');
      return;
    }

    setUploadingDeliverable(true);
    try {
      let res;
      if (deliverableFile) {
        res = await workerApi.uploadDeliverableFile(jobId, deliverableFile, deliverableName.trim());
      } else {
        const newDeliv = {
          name: deliverableName.trim(),
          url: deliverableUrl.trim() || `/api/orders/${jobId}/deliverables/latest/download`,
          size: '420 KB',
          isMandatory: currentDeliverables.length === 0
        };
        const updatedList = [...currentDeliverables, newDeliv];
        res = await workerApi.uploadDeliverables(jobId, updatedList);
      }

      if (res?.success) {
        setJob(prev => ({ ...prev, deliverables: res.deliverables }));
        setDeliverableName('');
        setDeliverableUrl('');
        setDeliverableFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      alert(err.message || 'Failed to attach deliverable');
    } finally {
      setUploadingDeliverable(false);
    }
  };

  const handleDeleteDeliverable = async (delivId) => {
    if (!window.confirm('Are you sure you want to remove this attached deliverable?')) return;
    try {
      const res = await workerApi.deleteDeliverable(jobId, delivId);
      if (res?.success) {
        setJob(prev => ({ ...prev, deliverables: res.deliverables }));
      }
    } catch (err) {
      alert(err.message || 'Failed to delete deliverable');
    }
  };

  // Section 13: Finish Work
  const handleFinishWork = async () => {
    if (!job.deliverables || job.deliverables.length === 0) {
      alert('Section 12 Rule: You must upload at least 1 mandatory official output receipt/file before finishing.');
      return;
    }

    if (!window.confirm('Are you sure you want to finish and submit this work? Earning will be transferred to your wallet.')) {
      return;
    }

    setFinishing(true);
    try {
      const res = await workerApi.submitJob(jobId, completionNote);
      if (res?.success) {
        setJob(res.order);
        setIsChatClosed(true);
        alert('Work successfully finished! Net earnings credited to your wallet.');
      }
    } catch (err) {
      alert(err.message || 'Failed to complete job');
    } finally {
      setFinishing(false);
    }
  };

  // Chat send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatClosed || sendingMsg) return;

    setSendingMsg(true);
    try {
      const res = await workerApi.sendChatMessage(jobId, chatInput.trim());
      if (res?.success && res.message) {
        setChatMessages(prev => [...prev, res.message]);
        setChatInput('');
      }
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading workspace...
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ padding: '32px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', textAlign: 'center' }}>
        <div>{error || 'Order not found'}</div>
        <button onClick={() => navigate('/worker/jobs')} className="btn btn-outline" style={{ marginTop: 12 }}>
          Back to Jobs
        </button>
      </div>
    );
  }

  const isCompleted = job.status === 'COMPLETED';
  const isCorrection = job.status === 'CORRECTION_REQUIRED';
  const isAccepted = job.status === 'ACCEPTED';
  const payout = (job.workerEarningsPaise || Math.round(job.pricePaise * 0.8)) / 100;
  const deliverables = job.deliverables || [];

  // Normalize form data: backend populates job.formData from serviceSnapshot.details,
  // but as a client-side safety fallback, also check serviceSnapshot.details directly.
  const effectiveFormData =
    (job.formData && Object.keys(job.formData).length > 0)
      ? job.formData
      : (job.serviceSnapshot?.details && Object.keys(job.serviceSnapshot.details).length > 0
          ? job.serviceSnapshot.details
          : null);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button
          className="btn icon-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#f1f5f9', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 600 }}
          onClick={() => navigate('/worker/jobs')}
        >
          <ArrowLeft size={18} /> Back to My Jobs
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Order #{job.id}</span>
          <span className={`w-badge ${job.status.toLowerCase().replace('_', '-')}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            {job.status}
          </span>
        </div>
      </div>

      {/* Section 16: Correction Banner if applicable */}
      {isCorrection && (
        <div style={{
          background: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <AlertTriangle size={28} color="#ef4444" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '1rem' }}>
              CORRECTION REQUIRED — 2-HOUR RESPONSE TIMEOUT
            </div>
            <div style={{ fontSize: '0.88rem', color: '#b91c1c', marginTop: 2 }}>
              The customer or platform auditor has requested a correction on this submission. Please review their instructions, upload the corrected output, and re-submit to release your held earnings.
            </div>
          </div>
        </div>
      )}

      {/* Section 15: Post-Completion Privacy Banner */}
      {isCompleted && (
        <div style={{
          background: '#f0fdf4',
          border: '1.5px solid #10b981',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <ShieldCheck size={26} color="#10b981" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.95rem' }}>
              Order Completed & Privacy Protection Enforced (Section 15)
            </div>
            <div style={{ fontSize: '0.84rem', color: '#047857' }}>
              Customer contact information is masked and working documents have been purged from your active workspace. Payout has been transferred to your wallet balance.
            </div>
          </div>
        </div>
      )}

      {/* Title & Headline Overview */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {job.category || 'Service'}
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0 8px', color: '#0f172a' }}>
            {job.serviceName}
          </h1>
          <div style={{ display: 'flex', gap: '18px', fontSize: '0.88rem', color: '#64748b', flexWrap: 'wrap' }}>
            <span>Created: <strong>{new Date(job.createdAt).toLocaleDateString()}</strong></span>
            <span>Deadline: <strong style={{ color: '#0f172a' }}>{job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Today'}</strong></span>
            {job.timeSlot && (
              <span style={{ color: '#0284c7', fontWeight: 700 }}>
                Agreed Slot: {job.timeSlot.date || 'Today'} ({job.timeSlot.startTime} - {job.timeSlot.endTime})
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>
              ₹{payout.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {isCompleted ? 'Credited to Wallet' : 'Your Net Payout'}
            </div>
          </div>

          {/* Start Work Action if still ACCEPTED */}
          {isAccepted && (
            <button
              onClick={handleStartWork}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 700 }}
            >
              <Play size={16} fill="white" /> Start Work (Mark In-Progress)
            </button>
          )}
        </div>
      </div>

      {/* Main 3-Column Workspace Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Column 1: Customer Details & Working Documents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Customer Information Card */}
          <div className="form-card" style={{ margin: 0, padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#1e293b' }}>
              Customer Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Applicant Name</span>
                <strong style={{ color: '#1e293b' }}>{job.customerName || 'Customer'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={14} /> Phone Number
                </span>
                <strong style={{ color: isCompleted ? '#94a3b8' : '#1e293b' }}>
                  {job.customerPhone || 'Not provided'}
                </strong>
              </div>

              {job.customerEmail && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={14} /> Email Address
                  </span>
                  <strong style={{ color: isCompleted ? '#94a3b8' : '#1e293b' }}>
                    {job.customerEmail}
                  </strong>
                </div>
              )}

              {/* Form Data Snapshot */}
              {effectiveFormData && Object.keys(effectiveFormData).length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Submitted Form Details
                  </span>
                  <div style={{ marginTop: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(effectiveFormData).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                        <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}:</span>
                        <span style={{ color: '#1e293b', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 11 & 15: Working Documents */}
          <div className="form-card" style={{ margin: 0, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>
                Customer Uploaded Documents
              </h3>
              {isCompleted && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={12} /> Purged
                </span>
              )}
            </div>

            {isCompleted ? (
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
                <ShieldCheck size={24} color="#10b981" style={{ margin: '0 auto 8px' }} />
                Customer personal identity files have been permanently cleared from your workspace in compliance with data privacy policies.
              </div>
            ) : (!job.documents || job.documents.length === 0) ? (
              <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>No customer documents uploaded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {job.documents.map((doc, idx) => {
                  const token = localStorage.getItem('cybercafe:token');
                  const docUrl = doc.url || `/api/documents/${doc.id}/download`;
                  const authenticatedViewUrl = `${docUrl}${token ? (docUrl.includes('?') ? `&token=${encodeURIComponent(token)}` : `?token=${encodeURIComponent(token)}`) : ''}`;
                  const docDisplayName = doc.name || doc.fileName || `Document #${idx + 1}`;
                  const docSizeText = doc.sizeFormatted || (typeof doc.size === 'number' 
                    ? (doc.size > 1048576 ? `${(doc.size / 1048576).toFixed(1)} MB` : `${Math.round(doc.size / 1024)} KB`) 
                    : (doc.size || 'Verified document'));

                  return (
                    <div
                      key={doc.id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: '#ffffff',
                        gap: '10px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={20} color="#3b82f6" />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                            {docDisplayName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {docSizeText}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={authenticatedViewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                        >
                          View <ExternalLink size={12} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(doc)}
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        >
                          <Download size={12} /> Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Time Slot & Deliverables Submission */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 10: Mutual Time-Slot Agreement */}
          <div className="form-card" style={{ margin: 0, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#3b82f6" /> Mutual Time-Slot Agreement
              </h3>
              {job.timeSlot && (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  background: (job.timeSlot.status === 'ACCEPTED' || job.serviceSnapshot?.scheduling?.status === 'ACCEPTED')
                    ? 'rgba(46,204,113,0.15)'
                    : (job.serviceSnapshot?.scheduling?.status === 'RESCHEDULE_REQUESTED' ? 'rgba(230,126,34,0.15)' : 'rgba(59,130,246,0.15)'),
                  color: (job.timeSlot.status === 'ACCEPTED' || job.serviceSnapshot?.scheduling?.status === 'ACCEPTED')
                    ? '#166534'
                    : (job.serviceSnapshot?.scheduling?.status === 'RESCHEDULE_REQUESTED' ? '#c0392b' : '#1d4ed8')
                }}>
                  {(job.timeSlot.status === 'ACCEPTED' || job.serviceSnapshot?.scheduling?.status === 'ACCEPTED')
                    ? 'Slot Confirmed'
                    : (job.serviceSnapshot?.scheduling?.status === 'RESCHEDULE_REQUESTED' ? 'Reschedule Requested' : 'Proposed to Customer')}
                </span>
              )}
            </div>

            {/* Customer Reschedule Request Notice */}
            {job.serviceSnapshot?.scheduling?.status === 'RESCHEDULE_REQUESTED' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> Customer Requested Reschedule
                </div>
                <div style={{ fontSize: '0.92rem', color: '#78350f', marginTop: 4 }}>
                  Requested Window: <strong>{job.serviceSnapshot?.scheduling?.timeSlot || job.timeSlot?.requestedTime || 'New slot requested'}</strong>
                </div>
                {job.serviceSnapshot?.scheduling?.rescheduleNote && (
                  <div style={{ fontSize: '0.82rem', color: '#92400e', marginTop: 4, fontStyle: 'italic' }}>
                    Note: "{job.serviceSnapshot.scheduling.rescheduleNote}"
                  </div>
                )}
                {!isCompleted && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleAcceptReschedule}
                      disabled={updatingSlot}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                    >
                      <Check size={14} /> Accept Customer's Request
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* State: No time slot provided yet */}
            {(!job.timeSlot || !job.timeSlot.startTime) && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.88rem' }}>
                  Action Required: Provide Working Time Slot
                </div>
                <p style={{ fontSize: '0.82rem', color: '#3b82f6', margin: '4px 0 0' }}>
                  Customer is waiting for you to select and provide your working window for this order.
                </p>
              </div>
            )}

            {/* State: Time Slot Confirmed */}
            {job.timeSlot && job.timeSlot.startTime && (job.timeSlot.status === 'ACCEPTED' || job.serviceSnapshot?.scheduling?.status === 'ACCEPTED') && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>
                  Confirmed Working Window:
                </div>
                <div style={{ fontSize: '0.95rem', color: '#15803d', marginTop: 4, fontWeight: 600 }}>
                  {job.timeSlot.date || 'Today'} • {job.timeSlot.startTime} to {job.timeSlot.endTime}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#15803d', margin: '4px 0 0' }}>
                  Mutually agreed with customer. You can propose a change below if necessary.
                </p>
              </div>
            )}

            {/* State: Time Slot Proposed */}
            {job.timeSlot && job.timeSlot.startTime && job.timeSlot.status === 'PROPOSED' && job.serviceSnapshot?.scheduling?.status !== 'RESCHEDULE_REQUESTED' && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>
                  Proposed Working Window:
                </div>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', marginTop: 4, fontWeight: 600 }}>
                  {job.timeSlot.date || 'Today'} • {job.timeSlot.startTime} to {job.timeSlot.endTime}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 0' }}>
                  Sent to customer for confirmation. You can update or change this slot below.
                </p>
              </div>
            )}

            {!isCompleted && (
              <form onSubmit={handleSetTimeSlot} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  {job.timeSlot ? 'Propose New or Updated Slot:' : 'Select Working Slot:'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Date</label>
                    <input
                      type="text"
                      value={slotDate}
                      onChange={e => setSlotDate(e.target.value)}
                      placeholder="e.g. Today"
                      style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Start</label>
                    <input
                      type="text"
                      value={slotStart}
                      onChange={e => setSlotStart(e.target.value)}
                      placeholder="10:00 AM"
                      style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>End</label>
                    <input
                      type="text"
                      value={slotEnd}
                      onChange={e => setSlotEnd(e.target.value)}
                      placeholder="12:00 PM"
                      style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updatingSlot}
                  className="btn btn-outline"
                  style={{ alignSelf: 'flex-start', padding: '6px 14px', fontSize: '0.82rem', marginTop: '4px' }}
                >
                  {updatingSlot ? 'Saving...' : job.timeSlot ? 'Update Time Slot' : 'Confirm Time Slot'}
                </button>
              </form>
            )}
          </div>

          {/* Section 12 & 13: Deliverables & Proof of Work */}
          <div className="form-card" style={{ margin: 0, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="#059669" /> Deliverables & Proof of Work
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Max 2 files (1 mandatory)
              </span>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.4 }}>
              Upload the official receipt, acknowledgement PDF, or application confirmation. <strong>At least 1 mandatory final receipt</strong> is strictly required to enable "Finish Work".
            </p>

            {/* List of Deliverables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {deliverables.length === 0 ? (
                <div style={{ 
                  fontSize: '0.82rem', 
                  color: '#dc2626', 
                  background: '#fef2f2', 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} color="#dc2626" />
                  <span><strong>Mandatory Requirement:</strong> Upload at least 1 official final output/receipt before finishing.</span>
                </div>
              ) : (
                deliverables.map((deliv, idx) => (
                  <div
                    key={deliv.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} color="#16a34a" />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#166534' }}>
                          {deliv.name || deliv.fileName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                          {deliv.isMandatory ? '★ Primary Mandatory Output' : 'Secondary Supporting Proof'} • {deliv.size || 'Verified File'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a
                        href={deliv.url ? (deliv.url.startsWith('http') ? deliv.url : `${buildUrl(deliv.url)}?token=${localStorage.getItem('cybercafe:token') || ''}`) : '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={12} /> Download
                      </a>
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDeliverable(deliv.id || deliv.fileName)}
                          className="btn icon-btn"
                          style={{ padding: '4px 6px', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '4px' }}
                          title="Remove file"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Upload Deliverable Form (Enabled if < 2 deliverables and not completed) */}
            {!isCompleted && deliverables.length < 2 && (
              <form onSubmit={handleAddDeliverable} style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={16} color="var(--brand-blue)" />
                  {deliverables.length === 0 ? 'Upload 1 Mandatory Final Output / Receipt (PDF, Image, Doc)' : 'Attach 1 Optional Supporting Proof / Acknowledgement'}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* File Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      style={{ display: 'none' }}
                      id="deliverable-file-input"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-outline"
                      style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Paperclip size={14} /> {deliverableFile ? 'Change File' : 'Choose Receipt/Deliverable File...'}
                    </button>
                    {deliverableFile && (
                      <span style={{ fontSize: '0.8rem', color: '#0f766e', fontWeight: 600 }}>
                        ✓ {deliverableFile.name} ({(deliverableFile.size / 1024).toFixed(0)} KB)
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={deliverableName}
                    onChange={e => setDeliverableName(e.target.value)}
                    placeholder="Document Title (e.g. Official_Acknowledgement_Receipt.pdf)"
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />

                  <button
                    type="submit"
                    disabled={uploadingDeliverable || (!deliverableFile && !deliverableName.trim())}
                    className="btn btn-primary"
                    style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Upload size={14} />
                    {uploadingDeliverable ? 'Uploading to Storage...' : '+ Attach Deliverable'}
                  </button>
                </div>
              </form>
            )}

            {/* Finish Work Action */}
            {!isCompleted ? (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Completion Note for Customer (Optional)
                  </label>
                  <input
                    type="text"
                    value={completionNote}
                    onChange={e => setCompletionNote(e.target.value)}
                    placeholder="e.g. Application submitted successfully. Ack number: 2026-X1"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>

                <button
                  onClick={handleFinishWork}
                  disabled={deliverables.length === 0 || finishing}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    background: deliverables.length === 0 ? '#94a3b8' : '#059669',
                    borderColor: deliverables.length === 0 ? '#94a3b8' : '#059669',
                    cursor: deliverables.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title={deliverables.length === 0 ? 'Upload mandatory output file first' : 'Complete and release payout'}
                >
                  {finishing ? 'Submitting Work...' : 'Finish Work & Credit Payout'}
                </button>

                {deliverables.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#dc2626', textAlign: 'center', marginTop: '6px' }}>
                    * Section 12: You must attach the final receipt above to enable Finish Work.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center', color: '#166534', fontWeight: 700 }}>
                <CheckCircle2 size={20} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                Order Completed & Verified
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Live Customer Chat (Section 5 & 11) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="form-card" style={{ margin: 0, padding: 0, height: '100%', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Chat Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                  Order Chat Desk
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {job.customerName || 'Customer'}
                </div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: '4px',
                background: isChatClosed ? '#f1f5f9' : '#ecfdf5',
                color: isChatClosed ? '#64748b' : '#047857',
                fontWeight: 600
              }}>
                {isChatClosed ? 'Locked' : 'Active Channel'}
              </span>
            </div>

            {/* Chat Body */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatMessages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: '24px' }}>
                  <Info size={28} style={{ margin: '0 auto 8px' }} />
                  <div>No messages yet in this order chat.</div>
                  <div style={{ fontSize: '0.78rem', marginTop: 4 }}>You can confirm application details or clarify questions directly with the customer.</div>
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
                        maxWidth: '85%',
                        alignSelf: isMe ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 2 }}>
                        {isMe ? 'You (Worker)' : (msg.senderName || 'Customer')}
                      </div>
                      <div
                        style={{
                          background: isMe ? '#3b82f6' : '#ffffff',
                          color: isMe ? '#ffffff' : '#1e293b',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          fontSize: '0.88rem',
                          lineHeight: 1.4,
                          border: isMe ? 'none' : '1px solid #e2e8f0'
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

            {/* Chat Input or Closed Message */}
            {isChatClosed ? (
              <div style={{ padding: '16px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                <Lock size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Chat is closed because this order is completed.
              </div>
            ) : (
              <form onSubmit={handleSendMessage} style={{ padding: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', background: 'white' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message to customer..."
                  disabled={sendingMsg}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || sendingMsg}
                  className="btn btn-primary icon-btn"
                  style={{ borderRadius: '8px', padding: '8px 14px' }}
                >
                  <Send size={16} />
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
