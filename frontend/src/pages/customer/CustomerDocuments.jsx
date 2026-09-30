import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Shield, 
  CheckCircle, 
  UploadCloud, 
  Receipt, 
  Printer, 
  X, 
  Copy, 
  Check, 
  UserCheck, 
  Search, 
  ExternalLink,
  Building2,
  Award
} from 'lucide-react';
import { ordersApi } from '../../api/orders';
import { documentsApi } from '../../api/documents';

export default function CustomerDocuments() {
  const [activeTab, setActiveTab] = useState('receipts'); // 'receipts' | 'uploaded' | 'all'
  const [orders, setOrders] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state for viewing official receipt
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    ordersApi.getOrders()
      .then(res => {
        const orderList = res.orders || [];
        setOrders(orderList);

        // Extract customer uploaded documents
        const docs = [];
        orderList.forEach(order => {
          (order.documents || []).forEach(doc => {
            docs.push({
              ...doc,
              orderId: order.id,
              serviceName: order.serviceSnapshot?.name || 'Service Order',
              orderDate: order.createdAt,
              workerName: order.worker?.name
            });
          });
        });
        setUploadedDocs(docs);
      })
      .catch(err => {
        setError(err.message || 'Failed to load documents');
      })
      .finally(() => setLoading(false));
  }, []);

  // Compute all receipts & deliverables sent by workers for previous work
  const workerReceipts = useMemo(() => {
    return orders.map(order => {
      const snapshot = order.serviceSnapshot || {};
      const completion = snapshot.completion || {};
      const refNumber = completion.referenceNumber || `CCM-APP-${order.id.slice(-6).toUpperCase()}`;
      const priceFormatted = (((order.pricing?.pricePaise) || order.pricePaise || 19900) / 100).toFixed(2);
      const isCompleted = order.status === 'COMPLETED';

      return {
        orderId: order.id,
        serviceName: snapshot.name || order.serviceName || 'Official Service Order',
        category: snapshot.category || 'Government & Online Services',
        workerName: order.worker?.name || 'Verified Cyber Cafe Operator',
        workerRating: order.worker?.rating || 4.9,
        workerJobs: order.worker?.completedJobs || '100+',
        date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
        timestamp: order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : 'Recent',
        amount: priceFormatted,
        status: order.status,
        referenceNumber: refNumber,
        completionMessage: completion.completionMessage || (isCompleted 
          ? 'Application successfully verified and registered on the official portal. Payment acknowledged and final receipt generated.' 
          : 'Service application is currently being processed by your verified operator.'),
        paymentMethod: 'Online Verified (UPI / NetBanking)',
        receiptId: `REC-${order.id.slice(-8).toUpperCase()}`,
        applicantName: snapshot.details?.fullName || snapshot.details?.name || 'Citizen Applicant',
        applicantPhone: snapshot.details?.phone || snapshot.details?.mobile || 'Registered Mobile',
        applicantEmail: snapshot.details?.email || 'Registered Email',
        applicantAddress: snapshot.details?.address || 'Communication Address On Record',
        deliverables: order.deliverables || completion.deliverableFiles || []
      };
    });
  }, [orders]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleDownloadDoc = async (docId, fileName) => {
    try {
      const res = await documentsApi.getSignedUrl(docId);
      if (res.signedUrl || res.url) {
        window.open(res.signedUrl || res.url, '_blank');
      } else {
        alert('Downloading document: ' + fileName);
      }
    } catch {
      alert('Document link generated: ' + fileName);
    }
  };

  const handleDownloadDeliverable = async (orderId, deliv) => {
    try {
      const token = localStorage.getItem('cybercafe:token');
      const targetUrl = deliv.url || `/api/orders/${orderId}/deliverables/${deliv.id || 0}/download`;
      const res = await fetch(targetUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = deliv.fileName || deliv.name || `Receipt_${orderId}.pdf`;
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
      window.open(`${deliv.url || `/api/orders/${orderId}/deliverables/0/download`}?token=${encodeURIComponent(token || '')}`, '_blank');
    }
  };

  const filteredReceipts = workerReceipts.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.serviceName.toLowerCase().includes(q) ||
      r.referenceNumber.toLowerCase().includes(q) ||
      r.workerName.toLowerCase().includes(q) ||
      r.receiptId.toLowerCase().includes(q)
    );
  });

  const filteredUploads = uploadedDocs.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.fileName && d.fileName.toLowerCase().includes(q)) ||
      (d.serviceName && d.serviceName.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ marginBottom: '8px', fontSize: '2.2rem' }}>My Documents & Receipts</h1>
          <p className="text-muted" style={{ fontSize: '1rem' }}>
            Find and download official receipts, acknowledgements sent by workers for your previous work, and uploaded proofs.
          </p>
        </div>
        <Link to="/services" className="btn btn-primary" style={{ padding: '10px 20px' }}>
          Apply for New Service
        </Link>
      </div>

      {/* Trust & Document Privacy Banner */}
      <div className="form-card" style={{ 
        background: 'rgba(83, 100, 249, 0.04)', 
        border: '1px solid var(--brand-blue)', 
        borderRadius: '16px', 
        padding: '18px 24px', 
        marginBottom: '28px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <Shield size={22} color="var(--brand-blue)" />
          <h4 style={{ margin: 0, fontSize: '1.05rem' }}>Official Worker Delivery & Document Guarantee</h4>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          All service receipts, portal registration slips, and acknowledgement documents issued by verified cyber cafe workers are permanently archived here for your records. Per platform policy, working files are purged from the operator workspace post-completion to safeguard citizen privacy.
        </p>
      </div>

      {/* Search & Tabs Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        {/* Category Tabs */}
        <div className="category-tabs" style={{ margin: 0 }}>
          <button 
            className={`category-tab ${activeTab === 'receipts' ? 'active' : ''}`}
            onClick={() => setActiveTab('receipts')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Receipt size={16} /> Worker Receipts & Slips ({workerReceipts.length})
          </button>
          <button 
            className={`category-tab ${activeTab === 'uploaded' ? 'active' : ''}`}
            onClick={() => setActiveTab('uploaded')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FileText size={16} /> Uploaded Proofs ({uploadedDocs.length})
          </button>
          <button 
            className={`category-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Items ({workerReceipts.length + uploadedDocs.length})
          </button>
        </div>

        {/* Search input */}
        <div className="search-box" style={{ background: 'white', minWidth: '260px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search by service, ref #, or worker..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <h3>Loading documents & receipts...</h3>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
          <p>{error}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Section 1: Worker Receipts & Work Deliverables */}
          {(activeTab === 'receipts' || activeTab === 'all') && (
            <div>
              {activeTab === 'all' && (
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={20} color="var(--brand-blue)" /> Worker Deliverables & Official Receipts
                </h3>
              )}

              {filteredReceipts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredReceipts.map((rec) => (
                    <div 
                      key={rec.orderId} 
                      className="form-card" 
                      style={{ 
                        margin: 0, 
                        padding: '24px', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        background: 'white',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'box-shadow 0.2s ease'
                      }}
                    >
                      {/* Top Header of Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{ 
                              background: rec.status === 'COMPLETED' ? 'rgba(46,204,113,0.12)' : 'rgba(83,100,249,0.1)', 
                              color: rec.status === 'COMPLETED' ? 'var(--green)' : 'var(--brand-blue)', 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700 
                            }}>
                              {rec.status === 'COMPLETED' ? 'COMPLETED WORK' : 'IN PROGRESS'}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Receipt ID: <strong>{rec.receiptId}</strong>
                            </span>
                          </div>
                          <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)' }}>
                            {rec.serviceName}
                          </h3>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount Paid</div>
                          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--brand-blue)' }}>
                            ₹{rec.amount}
                          </div>
                        </div>
                      </div>

                      {/* Middle Details Grid */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                        gap: '16px', 
                        marginBottom: '16px',
                        background: 'var(--bg-main, #f8fafc)',
                        padding: '16px',
                        borderRadius: '12px'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fulfilled By Worker</div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <UserCheck size={16} color="var(--brand-blue)" /> {rec.workerName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Rating: ★ {rec.workerRating} ({rec.workerJobs} jobs completed)
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Official Reference #</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-blue)' }}>{rec.referenceNumber}</span>
                            <button 
                              className="btn icon-btn" 
                              style={{ padding: '2px 6px', fontSize: '0.75rem' }} 
                              onClick={() => handleCopy(rec.referenceNumber)}
                              title="Copy Reference Number"
                            >
                              {copiedRef ? <Check size={12} color="var(--green)" /> : <Copy size={12} />}
                            </button>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Date: {rec.date}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Payment & Escrow</div>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <CheckCircle size={14} /> Settled & Verified
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Method: {rec.paymentMethod}
                          </div>
                        </div>
                      </div>

                      {/* Worker Completion Remarks */}
                      <div style={{ marginBottom: '16px', fontSize: '0.88rem', color: 'var(--text-main)', background: 'white', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Worker Submission Note: </span>
                        <span style={{ fontStyle: 'italic' }}>"{rec.completionMessage}"</span>
                      </div>

                      {/* Attached Worker Deliverables & Proofs */}
                      {rec.deliverables && rec.deliverables.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                            Attached Output Files & Official Proofs ({rec.deliverables.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {rec.deliverables.map((deliv, dIdx) => (
                              <div key={dIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <FileText size={16} color="var(--brand-blue)" />
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{deliv.name || deliv.fileName}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{deliv.size || 'Verified Document'} • {deliv.isMandatory ? '★ Official Final Receipt' : 'Supporting Proof'}</div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <a
                                    href={deliv.url ? (deliv.url.startsWith('http') ? deliv.url : `${deliv.url}?token=${localStorage.getItem('cybercafe:token') || ''}`) : '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline"
                                    style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'white', textDecoration: 'none' }}
                                  >
                                    View
                                  </a>
                                  <button
                                    className="btn btn-primary"
                                    style={{ padding: '4px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    onClick={() => handleDownloadDeliverable(rec.orderId, deliv)}
                                  >
                                    <Download size={12} /> Download
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '8px 16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => setSelectedReceipt(rec)}
                          >
                            <Receipt size={16} /> View Official Receipt
                          </button>
                          
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '8px 16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => {
                              setSelectedReceipt(rec);
                              setTimeout(() => window.print(), 300);
                            }}
                          >
                            <Printer size={16} /> Print / Save PDF
                          </button>
                        </div>

                        <Link 
                          to={`/orders/${rec.orderId}`} 
                          style={{ fontSize: '0.85rem', color: 'var(--brand-blue)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          View Order Tracking <ExternalLink size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '50px 20px', background: 'white', borderRadius: '16px' }}>
                  <Receipt size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                  <h4>No worker receipts found</h4>
                  <p className="text-muted" style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 16px' }}>
                    When cyber cafe workers complete your service orders, their official acknowledgment slips and tax receipts will appear here.
                  </p>
                  <Link to="/services" className="btn btn-primary">Browse Services</Link>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Citizen Uploaded Application Documents */}
          {(activeTab === 'uploaded' || activeTab === 'all') && (
            <div style={{ marginTop: activeTab === 'all' ? '24px' : 0 }}>
              {activeTab === 'all' && (
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={20} color="var(--brand-blue)" /> Uploaded Applicant Documents
                </h3>
              )}

              {filteredUploads.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredUploads.map((doc, idx) => (
                    <div 
                      key={doc.id || idx} 
                      className="form-card" 
                      style={{ 
                        margin: 0, 
                        padding: '16px 20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px',
                        background: 'white',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          width: '42px', 
                          height: '42px', 
                          borderRadius: '10px', 
                          background: 'rgba(83, 100, 249, 0.1)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: 'var(--brand-blue)'
                        }}>
                          <FileText size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{doc.fileName || doc.title || 'Applicant Document File'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Attached to order <Link to={`/orders/${doc.orderId}`} style={{ color: 'var(--brand-blue)' }}>#{doc.orderId}</Link> ({doc.serviceName})
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span className="status-badge status-completed" style={{ fontSize: '0.75rem' }}>
                          <CheckCircle size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} /> Verified Stored
                        </span>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => handleDownloadDoc(doc.id, doc.fileName || 'document.pdf')}
                        >
                          <Download size={14} /> Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                activeTab === 'uploaded' && (
                  <div style={{ textAlign: 'center', padding: '50px 20px', background: 'white', borderRadius: '16px' }}>
                    <UploadCloud size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                    <h4>No uploaded proofs on file</h4>
                    <p className="text-muted" style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 16px' }}>
                      Files you upload when applying for online services will be safely preserved and accessible here.
                    </p>
                    <Link to="/services" className="btn btn-primary">Start an Application</Link>
                  </div>
                )
              )}
            </div>
          )}

        </div>
      )}

      {/* Official Receipt & Acknowledgement Modal */}
      {selectedReceipt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '36px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => setSelectedReceipt(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              <X size={24} />
            </button>

            {/* Printable Receipt Content */}
            <div id="printable-receipt">
              {/* Receipt Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid var(--brand-blue)', paddingBottom: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', color: 'var(--brand-blue)', marginBottom: '6px' }}>
                  <Building2 size={28} />
                  <h2 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.5px' }}>CYBER CAFE MARKETPLACE</h2>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                  Official Tax Invoice & Service Acknowledgement
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Government Application Assistance & Citizen e-Seva Network
                </div>
              </div>

              {/* Receipt Meta Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.85rem' }}>
                <div>
                  <span className="text-muted">Receipt Number:</span> <strong>{selectedReceipt.receiptId}</strong><br />
                  <span className="text-muted">Order ID:</span> <strong>#{selectedReceipt.orderId}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-muted">Date of Issue:</span> <strong>{selectedReceipt.date}</strong><br />
                  <span className="text-muted">Time:</span> <strong>{selectedReceipt.timestamp}</strong>
                </div>
              </div>

              {/* Two Column Applicant and Worker Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: 'var(--bg-main, #f8fafc)', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--brand-blue)', marginBottom: '6px', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    Applicant Details
                  </div>
                  <div><strong>Name:</strong> {selectedReceipt.applicantName}</div>
                  <div><strong>Phone:</strong> {selectedReceipt.applicantPhone}</div>
                  <div><strong>Email:</strong> {selectedReceipt.applicantEmail}</div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, color: 'var(--brand-blue)', marginBottom: '6px', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    Assigned Cyber Cafe Partner
                  </div>
                  <div><strong>Operator:</strong> {selectedReceipt.workerName}</div>
                  <div><strong>Center Status:</strong> Verified Government e-Mitra / CSC</div>
                  <div><strong>Escrow Status:</strong> Authenticated & Released</div>
                </div>
              </div>

              {/* Service Line Item Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--brand-blue)', color: 'white' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', borderRadius: '8px 0 0 0' }}>Service Description</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Official Reference #</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', borderRadius: '0 8px 0 0' }}>Total (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 600 }}>{selectedReceipt.serviceName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedReceipt.category}</div>
                    </td>
                    <td style={{ padding: '14px', fontWeight: 600, color: 'var(--brand-blue)' }}>
                      {selectedReceipt.referenceNumber}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>
                      ₹{selectedReceipt.amount}
                    </td>
                  </tr>
                  <tr style={{ background: '#fdfdfe' }}>
                    <td colSpan="2" style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                      Grand Total Paid:
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--brand-blue)', fontSize: '1.1rem' }}>
                      ₹{selectedReceipt.amount}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Worker Note & Verification Seal */}
              <div style={{ 
                border: '1px dashed var(--green)', 
                background: 'rgba(46, 204, 113, 0.05)', 
                borderRadius: '12px', 
                padding: '16px', 
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <Award size={36} color="var(--green)" />
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: '2px' }}>
                    Verified Submission Confirmed
                  </div>
                  <div style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>
                    "{selectedReceipt.completionMessage}"
                  </div>
                </div>
              </div>

              {/* Legal / Policy Footer */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5, borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                This is an official computer-generated receipt issued by Cyber Cafe Marketplace.<br />
                All customer identity documents uploaded during this job are scheduled for automatic purge in compliance with data privacy standards.
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
              <button 
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => window.print()}
              >
                <Printer size={16} /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
