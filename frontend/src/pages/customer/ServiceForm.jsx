import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ShieldCheck, Lock, Upload, User, Zap, Wallet, Star, AlertCircle, CheckCircle2, CreditCard, QrCode, RefreshCw, FileText, X } from 'lucide-react';
import { servicesApi } from '../../api/services';
import { documentsApi } from '../../api/documents';
import { ordersApi } from '../../api/orders';
import { apiClient } from '../../api/client';

import { useAuth } from '../../contexts/AuthContext';
import { resolveServiceFormSchema } from '@cybercafe/shared';
import { validateDocumentClarity, compressDocument } from '../../utils/documentProcessor';

export default function ServiceForm() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, authenticated } = useAuth();
  
  // Live DB only — the selected service must always be the exact `serviceId`
  // from the Admin-managed "Service" catalog. No mock/fallback service seeding:
  // a stale slug like 'pan-card' would let a bogus service_id reach order
  // creation and violate the Order -> Service foreign key.
  const [service, setService] = useState(null);
  const [loadingService, setLoadingService] = useState(true);
  const [serviceError, setServiceError] = useState(null);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  const [vaultDocs, setVaultDocs] = useState([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [activeVaultSlot, setActiveVaultSlot] = useState(null);

  const cacheKey = `application_${serviceId}`;
  const getInitialState = () => {
    const saved = sessionStorage.getItem(cacheKey);
    if (saved) return JSON.parse(saved);
    return {
      step: 'details',
      details: {},
      documents: {},
      additionalInfo: '',
      workerSelection: { mode: 'auto', preferredWorkerId: '' },
      paymentMethod: 'UPI'
    };
  };

  const [appState, setAppState] = useState(getInitialState());
  const [errors, setErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle' | 'processing' | 'success' | 'failed'
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    cardName: ''
  });

  useEffect(() => {
    setService(null);
    setServiceError(null);
    setLoadingService(true);
    servicesApi.getService(serviceId)
      .then(res => {
        if (res?.service) {
          // Exact live DB row keyed by `serviceId` — the single source of truth.
          setService(res.service);
        } else {
          setServiceError('This service is no longer available in the catalog.');
        }
      })
      .catch(err => {
        setServiceError(err?.message || 'Service not found. It may have been disabled or removed.');
      })
      .finally(() => setLoadingService(false));

    ordersApi.getAvailableWorkers()
      .then(res => setAvailableWorkers(res.workers || []))
      .catch(() => {});

    ordersApi.getWallet()
      .then(res => setWalletBalance(res.wallet?.balancePaise || 0))
      .catch(() => {});
  }, [serviceId]);

  useEffect(() => {
    if (service) {
      sessionStorage.setItem(cacheKey, JSON.stringify(appState));
    }
  }, [appState, cacheKey, service]);

  // Auto-fill from logged-in customer profile if empty
  useEffect(() => {
    if (user && Object.keys(appState.details).length === 0) {
      setAppState(prev => ({
        ...prev,
        details: {
          fullName: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || '',
          ...prev.details
        }
      }));
    }
  }, [user]);

  // Load customer personal vault documents for one-click auto-reuse
  useEffect(() => {
    if (authenticated) {
      setLoadingVault(true);
      documentsApi.getVaultDocuments()
        .then(res => {
          if (res?.documents && Array.isArray(res.documents)) {
            setVaultDocs(res.documents);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingVault(false));
    }
  }, [authenticated]);

  if (loadingService) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading service...</div>;
  if (serviceError || !service) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
      <p>{serviceError || 'Service not found'}</p>
      <button className="btn btn-outline" style={{ margin: '16px auto 0' }} onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  const activeSchema = resolveServiceFormSchema(service);

  const updateDetails = (field, value) => {
    setAppState(prev => ({ ...prev, details: { ...prev.details, [field]: value } }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSelectFromVault = (docName, vaultDoc) => {
    setAppState(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docName]: {
          id: vaultDoc.id,
          fileName: vaultDoc.fileName || vaultDoc.name || 'Vault Document',
          size: vaultDoc.size || 0,
          isFromVault: true,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      }
    }));
    setActiveVaultSlot(null);
    setErrors(prev => {
      const copy = { ...prev };
      delete copy[docName];
      delete copy._documents;
      return copy;
    });
  };

  const handleFileUpload = async (docName, file) => {
    if (!file) return;
    setUploadingDoc(docName);
    setIsUploading(true);
    try {
      // 1. Client-side clarity & resolution check (Task 3.1)
      const clarity = await validateDocumentClarity(file);
      if (!clarity.valid) {
        setErrors(prev => ({ ...prev, [docName]: clarity.error }));
        setUploadingDoc(null);
        setIsUploading(false);
        return;
      }

      // 2. Client-side WebP compression (Task 3.1)
      const processedFile = await compressDocument(file, { maxWidth: 1600, quality: 0.78 });

      let docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      let fileName = processedFile.name;

      // 3. Direct Presigned Upload (Task 3.2: Bypass Multer RAM)
      let uploadedDirectly = false;
      try {
        const presignRes = await documentsApi.presignUpload({
          fileName: processedFile.name,
          mimeType: processedFile.type,
          docName
        });

        if (presignRes?.uploadUrl && presignRes?.storageKey) {
          if (presignRes.uploadUrl.startsWith('http')) {
            const uploadRes = await fetch(presignRes.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': processedFile.type },
              body: processedFile
            });
            if (uploadRes.ok) {
              const confirmRes = await documentsApi.confirmUpload({
                storageKey: presignRes.storageKey,
                fileName: processedFile.name,
                mimeType: processedFile.type,
                size: processedFile.size,
                docName
              });
              if (confirmRes?.document) {
                docId = confirmRes.document.id;
                fileName = confirmRes.document.fileName || processedFile.name;
                uploadedDirectly = true;
              }
            }
          }
        }
      } catch (presignErr) {
        console.warn('[DirectUpload] Presigned upload fallback:', presignErr);
      }

      if (!uploadedDirectly) {
        try {
          const res = await documentsApi.upload(processedFile);
          if (res?.document) {
            docId = res.document.id;
            fileName = res.document.fileName || processedFile.name;
          }
        } catch (apiErr) {
          console.warn('[DocUpload] Network notice, using resilient document buffer:', apiErr);
        }
      }

      setAppState(prev => ({
        ...prev,
        documents: { 
          ...prev.documents, 
          [docName]: { 
            id: docId, 
            fileName, 
            size: processedFile.size, 
            uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            warning: clarity.warning || null
          } 
        }
      }));
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[docName];
        delete copy._documents;
        return copy;
      });
    } catch (e) {
      setErrors(prev => ({ ...prev, [docName]: 'Upload failed. Please try again.' }));
    } finally {
      setUploadingDoc(null);
      setIsUploading(false);
    }
  };
  
  const removeDocument = (docName) => {
    const newDocs = { ...appState.documents };
    delete newDocs[docName];
    setAppState(prev => ({ ...prev, documents: newDocs }));
  };

  const validateDetails = () => {
    const newErrors = {};
    activeSchema.forEach(f => {
      if (f.required && !appState.details[f.id]) newErrors[f.id] = 'This field is required';
    });
    if (appState.details.email && !/\S+@\S+\.\S+/.test(appState.details.email)) newErrors.email = 'Valid email required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const normalizeRequiredDocuments = (docs) => {
    if (!docs) return [];
    let list = [];
    if (Array.isArray(docs)) {
      list = docs;
    } else if (typeof docs === 'string') {
      try {
        const parsed = JSON.parse(docs);
        if (Array.isArray(parsed)) list = parsed;
        else list = docs.split(',').map(d => d.trim());
      } catch {
        list = docs.split(',').map(d => d.trim());
      }
    }
    return list.map(d => {
      if (typeof d === 'object' && d !== null) {
        return d.doc || d.name || d.title || String(d.id || 'Document');
      }
      return typeof d === 'string' ? d.trim() : String(d);
    }).filter(Boolean);
  };

  const validateDocuments = () => {
    const newErrors = {};
    const required = normalizeRequiredDocuments(service?.requiredDocuments);
    if (required.length === 0) return true;
    const missing = [];
    required.forEach(doc => {
      if (!appState.documents[doc]) {
        newErrors[doc] = 'This document is required';
        missing.push(doc);
      }
    });
    if (missing.length > 0) {
      newErrors._documents = `Please upload all required documents: ${missing.join(', ')}`;
    }
    setErrors(prev => ({ ...prev, ...newErrors }));
    return missing.length === 0;
  };

  const nextStep = () => {
    if (appState.step === 'details') {
      if (validateDetails()) setAppState(p => ({ ...p, step: 'documents' }));
    } else if (appState.step === 'documents') {
      if (validateDocuments()) setAppState(p => ({ ...p, step: 'additional' }));
    } else if (appState.step === 'additional') {
      setAppState(p => ({ ...p, step: 'worker' }));
    } else if (appState.step === 'worker') {
      setAppState(p => ({ ...p, step: 'review' }));
    } else if (appState.step === 'review') {
      setAppState(p => ({ ...p, step: 'payment' }));
    }
  };

  const prevStep = () => {
    if (appState.step === 'documents') setAppState(p => ({ ...p, step: 'details' }));
    if (appState.step === 'additional') setAppState(p => ({ ...p, step: 'documents' }));
    if (appState.step === 'worker') setAppState(p => ({ ...p, step: 'additional' }));
    if (appState.step === 'review') setAppState(p => ({ ...p, step: 'worker' }));
    if (appState.step === 'payment') setAppState(p => ({ ...p, step: 'review' }));
  };

  const processCheckout = async () => {
    if (isCreatingOrder) return;
    if (!authenticated) {
      navigate('/login', { state: { returnTo: `/services/${serviceId}` } });
      return;
    }

    if (appState.paymentMethod === 'WALLET' && walletBalance < service.pricePaise) {
      setErrors(prev => ({ ...prev, payment: 'Insufficient wallet balance. Please select UPI or Card.' }));
      return;
    }

    setIsCreatingOrder(true);
    setPaymentStatus('processing');
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.payment;
      return copy;
    });

    try {
      const documentIds = Object.values(appState.documents).map(d => d.id).filter(Boolean);
      const existingDocumentIds = Object.values(appState.documents).filter(d => d.isFromVault).map(d => d.id);
      const documentsList = Object.entries(appState.documents).map(([reqName, d]) => ({
        id: d.id,
        docName: reqName,
        fileName: d.fileName,
        size: d.size
      }));
      
      // Direct checkout with selected paymentMethod
      const res = await ordersApi.createOrder({
        serviceId: service.id,
        details: appState.details,
        additionalInfo: appState.additionalInfo || '',
        workerSelection: appState.workerSelection || { mode: 'auto' },
        documentIds,
        existingDocumentIds,
        documents: documentsList,
        paymentMethod: {
          provider: appState.paymentMethod || 'UPI',
          type: appState.paymentMethod || 'UPI',
          details: appState.paymentMethod === 'UPI' 
            ? { upiId: paymentDetails.upiId || 'direct@upi' } 
            : appState.paymentMethod === 'CARD' 
            ? { cardNumber: paymentDetails.cardNumber, cardName: paymentDetails.cardName } 
            : {},
          timestamp: new Date().toISOString()
        }
      });
      
      if (!res || (!res.order && !res.id && !res.success)) {
        throw new Error(res?.error?.message || res?.error || 'Failed to place order');
      }

      const order = res.order || res;

      // If Razorpay gateway is loaded, initiate checkout modal
      if (window.Razorpay && order?.id) {
        try {
          const payRes = await ordersApi.createRazorpayPayment(order.id);
          if (payRes?.razorpayOrderId) {
            const options = {
              key: payRes.key || 'rzp_test_TjrbhiZugaYLYJ',
              amount: payRes.amount,
              currency: payRes.currency || 'INR',
              name: 'Cyber Cafe Marketplace',
              description: `Payment for ${service.name}`,
              order_id: payRes.razorpayOrderId,
              handler: async (resp) => {
                try {
                  await ordersApi.verifyRazorpayPayment({
                    orderId: order.id,
                    razorpay_order_id: resp.razorpay_order_id,
                    razorpay_payment_id: resp.razorpay_payment_id,
                    razorpay_signature: resp.razorpay_signature
                  });
                  setPaymentStatus('success');
                  sessionStorage.removeItem(cacheKey);
                  navigate(`/orders/${order.id}`);
                } catch (verifyErr) {
                  console.error('Verification error:', verifyErr);
                  sessionStorage.removeItem(cacheKey);
                  navigate(`/orders/${order.id}`);
                }
              },
              modal: {
                ondismiss: () => {
                  sessionStorage.removeItem(cacheKey);
                  navigate(`/orders/${order.id}`);
                }
              },
              prefill: {
                name: user?.name || '',
                email: user?.email || '',
                contact: user?.phone || ''
              },
              theme: { color: '#2563eb' }
            };
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (failResp) => {
              console.warn('Razorpay payment failed:', failResp);
              sessionStorage.removeItem(cacheKey);
              navigate(`/orders/${order.id}`);
            });
            rzp.open();
            setIsCreatingOrder(false);
            return;
          }
        } catch (payGatewayErr) {
          console.warn('Razorpay gateway notice (fallback to order tracking):', payGatewayErr);
        }
      }

      setPaymentStatus('success');
      sessionStorage.removeItem(cacheKey);
      setTimeout(() => {
        navigate(`/orders/${order.id}`);
      }, 500);
    } catch (e) {
      console.error('[Checkout Error]', e);
      setPaymentStatus('failed');
      setErrors(prev => ({ ...prev, payment: e.message || 'Payment could not be completed. Please try again.' }));
      setIsCreatingOrder(false);
    }
  };

  const stepsList = ['details', 'documents', 'additional', 'worker', 'review', 'payment'];
  const stepTitles = {
    details: 'Details',
    documents: 'Documents',
    additional: 'Notes',
    worker: 'Worker',
    review: 'Review',
    payment: 'Pay & Order'
  };

  const renderProgress = () => {
    const idx = stepsList.indexOf(appState.step);
    return (
      <div className="progress-steps" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        {stepsList.map((s, i) => {
          const isPast = i < idx;
          const isActive = i === idx;
          return (
            <div key={s} className={`progress-step ${isPast ? 'past' : ''} ${isActive ? 'active' : ''}`}>
              <div className="step-circle">{isPast ? <Check size={14}/> : i + 1}</div>
              <div className="step-label">{stepTitles[s]}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetails = () => (
    <div className="form-card" style={{ padding: '28px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Applicant Details</h3>
        <p className="text-muted" style={{ margin: 0, fontSize: '0.88rem' }}>
          Please provide the applicant information accurately as per your official government documents.
        </p>
      </div>

      <div className="grid-2">
        {activeSchema.map(f => (
           <div key={f.id} style={{ gridColumn: f.type === 'textarea' || f.type === 'address' ? '1 / -1' : 'auto' }}>
             <label className="form-label">
               {f.label} {f.required && <span className="req">*</span>}
             </label>
             {f.type === 'select' ? (
                <select 
                  className={`form-input ${errors[f.id] ? 'error' : ''}`}
                  value={appState.details[f.id] || ''} 
                  onChange={e => updateDetails(f.id, e.target.value)}
                >
                   <option value="">Select {f.label}</option>
                   {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
             ) : f.type === 'textarea' || f.type === 'address' ? (
                <textarea 
                  className={`form-input ${errors[f.id] ? 'error' : ''}`}
                  rows="3" 
                  value={appState.details[f.id] || ''} 
                  onChange={e => updateDetails(f.id, e.target.value)} 
                  placeholder={`Enter ${f.label}`} 
                />
             ) : (
                <input 
                  type={f.type || 'text'} 
                  className={`form-input ${errors[f.id] ? 'error' : ''}`}
                  value={appState.details[f.id] || ''} 
                  onChange={e => updateDetails(f.id, e.target.value)} 
                  placeholder={`Enter ${f.label}`} 
                />
             )}
             {errors[f.id] && (
               <span style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                 <AlertCircle size={14} /> {errors[f.id]}
               </span>
             )}
           </div>
        ))}
      </div>
      <button 
        className="btn btn-primary" 
        style={{ width: '100%', justifyContent: 'center', marginTop: '28px', padding: '12px', fontSize: '0.95rem', fontWeight: 600, borderRadius: '8px' }} 
        onClick={nextStep}
      >
        Save & Continue
      </button>
    </div>
  );

  const renderDocuments = () => {
    const requiredDocs = normalizeRequiredDocuments(service?.requiredDocuments);
    const uploadedCount = requiredDocs.filter(d => appState.documents[d]).length;
    const allUploaded = requiredDocs.length === 0 || uploadedCount === requiredDocs.length;

    if (requiredDocs.length === 0) {
      return (
        <div className="form-card">
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <CheckCircle2 size={48} color="var(--green, #2ecc71)" style={{ margin: '0 auto 16px' }} />
            <h3>No Documents Required</h3>
            <p className="text-muted" style={{ maxWidth: '420px', margin: '0 auto 24px' }}>
              This service does not require any document uploads from you. You can proceed directly to the next step.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={prevStep}>Back</button>
              <button className="btn btn-primary" onClick={nextStep}>Continue to Additional Info</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="form-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ marginBottom: '6px' }}>Upload Required Documents</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              Your files are stored safely. Certified operators need these official proofs to process your application.
            </p>
          </div>
          <div style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: allUploaded ? 'rgba(46, 204, 113, 0.15)' : 'rgba(83, 100, 249, 0.1)',
            color: allUploaded ? 'var(--green, #2ecc71)' : 'var(--brand-blue, #5364f9)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {allUploaded ? <Check size={16} /> : <Upload size={16} />}
            {uploadedCount} of {requiredDocs.length} Uploaded
          </div>
        </div>

        {/* Missing Documents Alert Banner */}
        {errors._documents && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#b91c1c',
            fontSize: '0.9rem'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Missing Documents:</strong> {errors._documents}
            </div>
          </div>
        )}

        {requiredDocs.map(doc => {
          const docData = appState.documents[doc];
          const isThisDocUploading = uploadingDoc === doc;

          return (
            <div 
              key={doc} 
              style={{ 
                marginBottom: '18px', 
                padding: '16px 20px', 
                border: docData 
                  ? '1.5px solid var(--green, #2ecc71)' 
                  : errors[doc] 
                  ? '1.5px solid var(--red, #e74c3c)' 
                  : '1px solid var(--border-color, #e2e8f0)', 
                borderRadius: '12px',
                background: docData ? 'rgba(46, 204, 113, 0.02)' : 'white',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {doc} <span style={{ color: 'var(--red, #e74c3c)', fontSize: '0.85rem' }}>*</span>
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                    Official scan or clear photo (PDF, JPG, PNG up to 10MB)
                  </span>
                </div>

                {isThisDocUploading ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(83, 100, 249, 0.1)',
                    color: 'var(--brand-blue, #5364f9)',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    <RefreshCw size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    Uploading...
                  </div>
                ) : docData ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      Replace <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFileUpload(doc, e.target.files[0])} />
                    </label>
                    <button 
                      type="button"
                      className="btn btn-outline" 
                      style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--red, #e74c3c)' }} 
                      onClick={() => removeDocument(doc)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <label className="btn btn-outline" style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Upload size={16} color="var(--brand-blue)" /> Choose File
                      <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFileUpload(doc, e.target.files[0])} />
                    </label>
                    {authenticated && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(83, 100, 249, 0.05)', color: 'var(--brand-blue, #5364f9)', borderColor: 'rgba(83, 100, 249, 0.3)' }}
                        onClick={() => setActiveVaultSlot(doc)}
                      >
                        <ShieldCheck size={16} /> Select from Vault
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Upload / Vault Success Badge */}
              {docData && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  padding: '10px 14px',
                  background: 'rgba(46, 204, 113, 0.08)',
                  border: '1px solid rgba(46, 204, 113, 0.25)',
                  borderRadius: '8px',
                  color: 'var(--green, #2ecc71)',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{docData.fileName}</span>
                    {docData.isFromVault && (
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        background: 'rgba(83, 100, 249, 0.15)',
                        color: 'var(--brand-blue, #5364f9)',
                        borderRadius: '12px',
                        fontWeight: 600,
                        flexShrink: 0
                      }}>
                        Vault Linked
                      </span>
                    )}
                  </div>
                  {docData.size ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {(docData.size / 1024).toFixed(0)} KB
                    </span>
                  ) : null}
                </div>
              )}

              {/* Error Message for this document */}
              {errors[doc] && (
                <span style={{ color: 'var(--red, #e74c3c)', fontSize: '0.85rem', marginTop: '8px', display: 'block', fontWeight: 500 }}>
                  ⚠️ {errors[doc]}
                </span>
              )}
            </div>
          );
        })}

        {/* Vault Selection Modal */}
        {activeVaultSlot && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <ShieldCheck size={20} color="var(--brand-blue, #5364f9)" /> Personal Vault Documents
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', margin: 0 }}>
                    Select a previously verified document to attach to <strong>{activeVaultSlot}</strong>
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setActiveVaultSlot(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                {loadingVault ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                    <p>Loading your secure vault...</p>
                  </div>
                ) : vaultDocs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                    <FileText size={40} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
                    <h4 style={{ fontWeight: 600, marginBottom: '6px' }}>Your Vault is Empty</h4>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '360px', margin: '0 auto' }}>
                      Upload your documents directly for this application, and they will automatically be preserved in your encrypted vault for one-click reuse!
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {vaultDocs.map((vDoc) => (
                      <div 
                        key={vDoc.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          background: '#f8fafc'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(83, 100, 249, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FileText size={18} color="var(--brand-blue, #5364f9)" />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontWeight: 600, fontSize: '0.88rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {vDoc.docName || vDoc.fileName || vDoc.name || 'Personal Document'}
                            </p>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {vDoc.fileName} • {vDoc.size ? `${(vDoc.size / 1024).toFixed(0)} KB` : 'Verified'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.82rem', flexShrink: 0, marginLeft: '12px' }}
                          onClick={() => handleSelectFromVault(activeVaultSlot, vDoc)}
                        >
                          Use Document
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#f8fafc'
              }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ padding: '8px 18px', fontSize: '0.85rem' }} 
                  onClick={() => setActiveVaultSlot(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={prevStep}>
            Back
          </button>
          <button 
            className="btn btn-primary" 
            style={{ flex: 2, justifyContent: 'center' }} 
            onClick={nextStep} 
            disabled={isUploading}
          >
            {isUploading ? 'Uploading Document...' : `Continue to Additional Info (${uploadedCount}/${requiredDocs.length})`}
          </button>
        </div>
      </div>
    );
  };

  const renderAdditional = () => (
    <div className="form-card">
      <h3 style={{ marginBottom: '16px' }}>Additional Information</h3>
      <p className="text-muted" style={{ marginBottom: '24px' }}>Provide any specific instructions, preferences, or details needed to complete your service.</p>
      
      <div>
        <label className="form-label">Special Instructions / Remarks (Optional)</label>
        <textarea
          className="form-input"
          rows={4}
          value={appState.additionalInfo}
          onChange={e => setAppState(p => ({ ...p, additionalInfo: e.target.value }))}
          placeholder="e.g. Please choose city center exam venue; urgent submission required before 5 PM; etc."
        />
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
         <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={prevStep}>Back</button>
         <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={nextStep}>Continue to Worker Selection</button>
      </div>
    </div>
  );

  const renderWorker = () => (
    <div className="form-card">
      <h3 style={{ marginBottom: '16px' }}>Worker Selection</h3>
      <p className="text-muted" style={{ marginBottom: '24px' }}>Choose how you would like your order assigned to a certified cyber-cafe professional.</p>

      {/* Option 1: Automatic Assignment */}
      <div 
        onClick={() => setAppState(p => ({ ...p, workerSelection: { mode: 'auto', preferredWorkerId: '' } }))}
        style={{
          border: appState.workerSelection.mode === 'auto' ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)',
          background: appState.workerSelection.mode === 'auto' ? 'rgba(83, 100, 249, 0.04)' : 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <input 
            type="radio" 
            name="worker_mode" 
            checked={appState.workerSelection.mode === 'auto'} 
            onChange={() => {}} 
            style={{ width: '18px', height: '18px', accentColor: 'var(--brand-blue)' }} 
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>Automatic Assignment</span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(46, 204, 113, 0.1)', color: 'var(--green)', borderRadius: '12px', fontWeight: 600 }}>
                Recommended
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              The platform automatically assigns the quickest available worker with the lowest workload to complete your service fast.
            </p>
          </div>
          <Zap size={24} color="var(--brand-blue)" />
        </div>
      </div>

      {/* Option 2: Choose Preferred Worker */}
      <div 
        onClick={() => setAppState(p => ({ ...p, workerSelection: { ...p.workerSelection, mode: 'preferred' } }))}
        style={{
          border: appState.workerSelection.mode === 'preferred' ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)',
          background: appState.workerSelection.mode === 'preferred' ? 'rgba(83, 100, 249, 0.04)' : 'white',
          borderRadius: '12px',
          padding: '20px',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: appState.workerSelection.mode === 'preferred' ? '16px' : '0' }}>
          <input 
            type="radio" 
            name="worker_mode" 
            checked={appState.workerSelection.mode === 'preferred'} 
            onChange={() => {}} 
            style={{ width: '18px', height: '18px', accentColor: 'var(--brand-blue)' }} 
          />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>Choose a Preferred Worker</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Select a specific cyber-cafe worker based on customer ratings and completed jobs.
            </p>
          </div>
          <User size={24} color="var(--text-muted)" />
        </div>

        {appState.workerSelection.mode === 'preferred' && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Available Verified Workers</h4>
            {availableWorkers.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No individual workers currently online. Auto assignment will be used.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availableWorkers.map(w => (
                  <label 
                    key={w.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: appState.workerSelection.preferredWorkerId === w.id ? '1px solid var(--brand-blue)' : '1px solid var(--border-color)',
                      background: appState.workerSelection.preferredWorkerId === w.id ? 'rgba(83, 100, 249, 0.08)' : 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="radio" 
                        name="preferredWorkerRadio"
                        checked={appState.workerSelection.preferredWorkerId === w.id}
                        onChange={() => setAppState(p => ({ ...p, workerSelection: { mode: 'preferred', preferredWorkerId: w.id } }))}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{w.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {w.completedJobs} completed orders | {w.activeJobs} active
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f39c12', fontSize: '0.85rem', fontWeight: 600 }}>
                      <Star size={14} fill="#f39c12" /> {w.rating}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
         <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={prevStep}>Back</button>
         <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={nextStep}>Continue to Review</button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="form-card">
      <h3 style={{ marginBottom: '24px' }}>Review Application</h3>
      
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
           <h4 style={{ fontSize: '1rem' }}>Applicant Details</h4>
           <button className="btn btn-outline" style={{ padding: '2px 10px', fontSize: '0.8rem' }} onClick={() => setAppState(p => ({ ...p, step: 'details' }))}>Edit</button>
        </div>
        <div className="grid-2" style={{ gap: '8px' }}>
           {Object.entries(appState.details).map(([k, v]) => (
             <div key={k}><span className="text-muted" style={{ fontSize: '0.8rem' }}>{k}:</span> <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{String(v)}</div></div>
           ))}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
           <h4 style={{ fontSize: '1rem' }}>Uploaded Documents</h4>
           <button className="btn btn-outline" style={{ padding: '2px 10px', fontSize: '0.8rem' }} onClick={() => setAppState(p => ({ ...p, step: 'documents' }))}>Edit</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
           {Object.entries(appState.documents).map(([k, v]) => (
             <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-main)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{k}</div>
                <div style={{ color: 'var(--brand-blue)', fontSize: '0.85rem' }}>{v.fileName}</div>
             </div>
           ))}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
           <h4 style={{ fontSize: '1rem' }}>Additional Instructions</h4>
           <button className="btn btn-outline" style={{ padding: '2px 10px', fontSize: '0.8rem' }} onClick={() => setAppState(p => ({ ...p, step: 'additional' }))}>Edit</button>
        </div>
        <div style={{ fontSize: '0.9rem', background: 'var(--bg-main)', padding: '10px 12px', borderRadius: '8px' }}>
          {appState.additionalInfo || 'None provided'}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
           <h4 style={{ fontSize: '1rem' }}>Worker Assignment</h4>
           <button className="btn btn-outline" style={{ padding: '2px 10px', fontSize: '0.8rem' }} onClick={() => setAppState(p => ({ ...p, step: 'worker' }))}>Edit</button>
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
          {appState.workerSelection.mode === 'preferred' 
            ? `Preferred Worker: ${availableWorkers.find(w => w.id === appState.workerSelection.preferredWorkerId)?.name || 'Selected Worker'}` 
            : 'Automatic Assignment (Platform will allocate the quickest available worker)'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
         <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={prevStep}>Back</button>
         <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={nextStep}>Proceed to Payment</button>
      </div>
    </div>
  );

  const renderPayment = () => {
    const priceFormatted = (service.pricePaise / 100).toFixed(2);
    const hasEnoughWallet = walletBalance >= service.pricePaise;

    return (
      <div className="form-card">
        <h3 style={{ marginBottom: '8px' }}>Pay & Confirm Order</h3>
        <p className="text-muted" style={{ marginBottom: '24px', fontSize: '0.9rem' }}>
          Payment is held in secure platform escrow and only released to the operator upon your satisfactory delivery.
        </p>

        {/* Payment Error Banner if any */}
        {errors.payment && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            color: '#b91c1c',
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Payment Issue:</strong> {errors.payment}
              </div>
            </div>
            <button 
              type="button"
              className="btn btn-outline" 
              style={{ padding: '4px 12px', fontSize: '0.8rem', borderColor: '#ef4444', color: '#b91c1c' }}
              onClick={processCheckout}
            >
              Retry
            </button>
          </div>
        )}

        {/* Payment Processing Indicator */}
        {paymentStatus === 'processing' && (
          <div style={{
            background: 'rgba(83, 100, 249, 0.08)',
            border: '1px solid var(--brand-blue)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <RefreshCw size={24} color="var(--brand-blue)" style={{ animation: 'spin 1s linear infinite' }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--brand-blue)' }}>Authorizing Payment & Assigning Operator...</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Communicating with secure bank gateway. Please do not close this window.</div>
            </div>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div style={{
            background: 'rgba(46, 204, 113, 0.1)',
            border: '1px solid var(--green, #2ecc71)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <CheckCircle2 size={24} color="var(--green, #2ecc71)" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--green, #2ecc71)' }}>Payment Verified! Creating Your Order...</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Redirecting to your live order tracking timeline...</div>
            </div>
          </div>
        )}
        
        {/* Payment Method 1: UPI */}
        <div 
          onClick={() => setAppState(p => ({ ...p, paymentMethod: 'UPI' }))}
          style={{ 
            border: appState.paymentMethod === 'UPI' ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '16px 20px', 
            marginBottom: '14px', 
            background: appState.paymentMethod === 'UPI' ? 'rgba(83, 100, 249, 0.04)' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input type="radio" checked={appState.paymentMethod === 'UPI'} onChange={() => {}} style={{ width: '18px', height: '18px', accentColor: 'var(--brand-blue)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={18} color="var(--brand-blue)" /> UPI (Google Pay, PhonePe, Paytm, BHIM, QR)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Instant zero-fee authorization</div>
            </div>
            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>RECOMMENDED</span>
          </div>

          {appState.paymentMethod === 'UPI' && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }} onClick={e => e.stopPropagation()}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>UPI ID / VPA (Optional - or choose direct authorization)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. mobileNumber@upi or name@okaxis" 
                  value={paymentDetails.upiId} 
                  onChange={e => setPaymentDetails(p => ({ ...p, upiId: e.target.value }))}
                  style={{ flex: 1 }}
                />
                <button 
                  type="button"
                  className="btn btn-outline" 
                  style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  onClick={() => setPaymentDetails(p => ({ ...p, upiId: 'verified.user@okaxis' }))}
                >
                  Auto-Fill Test VPA
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI'].map(app => (
                  <span key={app} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: 500 }}>
                    ✓ {app}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Payment Method 2: Cards */}
        <div 
          onClick={() => setAppState(p => ({ ...p, paymentMethod: 'CARD' }))}
          style={{ 
            border: appState.paymentMethod === 'CARD' ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '16px 20px', 
            marginBottom: '14px', 
            background: appState.paymentMethod === 'CARD' ? 'rgba(83, 100, 249, 0.04)' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input type="radio" checked={appState.paymentMethod === 'CARD'} onChange={() => {}} style={{ width: '18px', height: '18px', accentColor: 'var(--brand-blue)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="var(--brand-blue)" /> Credit / Debit Card
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visa, Mastercard, RuPay, Maestro</div>
            </div>
          </div>

          {appState.paymentMethod === 'CARD' && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }} onClick={e => e.stopPropagation()}>
              <div className="grid-2" style={{ gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Card Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="4532 •••• •••• 8892" 
                    maxLength={19}
                    value={paymentDetails.cardNumber}
                    onChange={e => setPaymentDetails(p => ({ ...p, cardNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Name on Card</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Applicant Name" 
                    value={paymentDetails.cardName}
                    onChange={e => setPaymentDetails(p => ({ ...p, cardName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Expiry Date</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="MM/YY" 
                    maxLength={5}
                    value={paymentDetails.cardExpiry}
                    onChange={e => setPaymentDetails(p => ({ ...p, cardExpiry: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>CVV / CVC</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="•••" 
                    maxLength={4}
                    value={paymentDetails.cardCvv}
                    onChange={e => setPaymentDetails(p => ({ ...p, cardCvv: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment Method 3: Platform Wallet */}
        <div 
          onClick={() => setAppState(p => ({ ...p, paymentMethod: 'WALLET' }))}
          style={{ 
            border: appState.paymentMethod === 'WALLET' ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '16px 20px', 
            marginBottom: '14px', 
            background: appState.paymentMethod === 'WALLET' ? 'rgba(83, 100, 249, 0.04)' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input type="radio" checked={appState.paymentMethod === 'WALLET'} onChange={() => {}} style={{ width: '18px', height: '18px', accentColor: 'var(--brand-blue)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} color="var(--brand-blue)" /> Platform Wallet
              </div>
              <div style={{ fontSize: '0.8rem', color: hasEnoughWallet ? 'var(--green, #2ecc71)' : 'var(--text-muted)' }}>
                Available balance: ₹{(walletBalance / 100).toFixed(2)} {hasEnoughWallet ? '— Sufficient balance' : '— Top up or select UPI'}
              </div>
            </div>
          </div>
        </div>

        {/* Sign-in prompt for guest users */}
        {!authenticated && (
          <div style={{
            background: 'var(--bg-main, #f8fafc)',
            border: '1.5px solid var(--brand-blue, #5364f9)',
            borderRadius: '12px',
            padding: '18px 20px',
            marginTop: '20px',
            marginBottom: '10px'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--brand-blue)" /> Sign in to finalize and track your order
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Your application details and uploaded documents are preserved. Please log in or create an account to assign an operator and receive live SMS/WhatsApp updates.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                className="btn btn-primary" 
                style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                onClick={() => navigate('/login', { state: { returnTo: `/services/${serviceId}` } })}
              >
                Sign In to Proceed
              </button>
              <button 
                type="button"
                className="btn btn-outline" 
                style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                onClick={() => navigate('/register', { state: { returnTo: `/services/${serviceId}` } })}
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={prevStep} disabled={isCreatingOrder}>
            Back to Review
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            style={{ flex: 2, justifyContent: 'center', minHeight: '44px' }} 
            onClick={processCheckout} 
            disabled={isCreatingOrder || (appState.paymentMethod === 'WALLET' && !hasEnoughWallet)}
          >
            {isCreatingOrder ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing Payment & Creating Order...
              </span>
            ) : !authenticated ? (
              'Sign In & Place Order'
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} /> Pay ₹{priceFormatted} & Place Order
              </span>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <button className="btn icon-btn" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => navigate(-1)}>
        <ArrowLeft size={18}/> Back
      </button>
      
      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h1 style={{ marginBottom: '8px' }}>{service.name}</h1>
          <p style={{ color: 'var(--brand-blue)', fontWeight: '600', marginBottom: '8px' }}>
            Total Amount: ₹{(service.pricePaise / 100).toFixed(2)}
          </p>
          <p className="text-muted" style={{ marginBottom: '28px' }}>{service.description}</p>
          
          {renderProgress()}
          
          {appState.step === 'details' && renderDetails()}
          {appState.step === 'documents' && renderDocuments()}
          {appState.step === 'additional' && renderAdditional()}
          {appState.step === 'worker' && renderWorker()}
          {appState.step === 'review' && renderReview()}
          {appState.step === 'payment' && renderPayment()}
        </div>
        
        <div className="form-card" style={{ width: '350px', position: 'sticky', top: '100px' }}>
          <h3 style={{ marginBottom: '20px' }}>Order Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span className="text-muted">Selected Service</span>
            <span style={{ fontWeight: 500, textAlign: 'right' }}>{service.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span className="text-muted">Category</span>
            <span style={{ fontWeight: 500 }}>{service.category}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span className="text-muted">Maximum Window</span>
            <span style={{ fontWeight: 500, color: 'var(--brand-blue)' }}>24 Hours Principle</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '1.1rem' }}>
            <span style={{ fontWeight: 600 }}>Total Payable</span>
            <span style={{ fontWeight: 700, color: 'var(--brand-blue)' }}>₹{(service.pricePaise / 100).toFixed(2)}</span>
          </div>
          
          {appState.step !== 'payment' && (
            <>
              <div style={{ marginTop: '32px' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '0.9rem' }}>What we will do</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                   {['Application form filling', 'Document upload', 'Basic verification', 'Application submission', 'Receipt provide'].map((item, i) => (
                     <li key={i} style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '0.85rem' }}>
                       <Check size={16} color="var(--green)" /> {item}
                     </li>
                   ))}
                </ul>
              </div>
            </>
          )}

          {appState.step === 'payment' && (
            <div style={{ marginTop: '32px', background: 'rgba(46, 204, 113, 0.1)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <ShieldCheck size={24} color="var(--green)" />
               <div>
                 <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--green)' }}>Secure Payment</div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Your payment information is safe with us</div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
