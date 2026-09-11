import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ShieldCheck, Lock, Upload, User, Zap, Wallet, Star } from 'lucide-react';
import { servicesApi } from '../../api/services';
import { documentsApi } from '../../api/documents';
import { ordersApi } from '../../api/orders';

import { services as fallbackServices } from '../../mockDataCustomer';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULT_FORM_SCHEMA = [
  { id: 'fullName', label: 'Full Name of Applicant', type: 'text', required: true },
  { id: 'phone', label: 'Contact Phone / WhatsApp Number', type: 'tel', required: true },
  { id: 'email', label: 'Email Address', type: 'email', required: true },
  { id: 'address', label: 'Complete Postal / Communication Address', type: 'textarea', required: true }
];

export default function ServiceForm() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, authenticated } = useAuth();
  
  const [service, setService] = useState(() => fallbackServices.find(s => s.id === serviceId) || null);
  const [loadingService, setLoadingService] = useState(false);
  const [serviceError, setServiceError] = useState(null);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

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
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  useEffect(() => {
    servicesApi.getService(serviceId)
      .then(res => {
        if (res.service) {
          setService(res.service);
        }
      })
      .catch(err => {
        const fallback = fallbackServices.find(s => s.id === serviceId);
        if (fallback) {
          setService(fallback);
        } else {
          setServiceError(err.message || 'Service not found');
        }
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

  if (loadingService) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading service...</div>;
  if (serviceError || !service) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
      <p>{serviceError || 'Service not found'}</p>
      <button className="btn btn-outline" style={{ margin: '16px auto 0' }} onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  const activeSchema = (service?.formSchema && Array.isArray(service.formSchema) && service.formSchema.length > 0)
    ? service.formSchema 
    : DEFAULT_FORM_SCHEMA;

  const updateDetails = (field, value) => {
    setAppState(prev => ({ ...prev, details: { ...prev.details, [field]: value } }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleFileUpload = async (docName, file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await documentsApi.upload(file);
      setAppState(prev => ({
        ...prev,
        documents: { ...prev.documents, [docName]: { id: res.document.id, fileName: res.document.fileName } }
      }));
      setErrors(prev => ({ ...prev, [docName]: null }));
    } catch (e) {
      setErrors(prev => ({ ...prev, [docName]: 'Upload failed. Please try again.' }));
    } finally {
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

  const validateDocuments = () => {
    const newErrors = {};
    const required = service.requiredDocuments || [];
    required.forEach(doc => {
      if (!appState.documents[doc]) newErrors[doc] = 'Required document';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    if (!authenticated) {
      navigate('/login', { state: { returnTo: `/services/${serviceId}` } });
      return;
    }
    setIsCreatingOrder(true);
    try {
      const documentIds = Object.values(appState.documents).map(d => d.id);
      const res = await ordersApi.createOrder({
        serviceId: service.id,
        details: appState.details,
        additionalInfo: appState.additionalInfo || '',
        workerSelection: appState.workerSelection || { mode: 'auto' },
        documentIds,
        paymentMethod: {
          provider: appState.paymentMethod || 'UPI',
          timestamp: new Date().toISOString()
        }
      });
      sessionStorage.removeItem(cacheKey);
      navigate(`/orders/${res.order.id}`);
    } catch (e) {
      setErrors({ payment: e.message || 'Checkout failed' });
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
    <div className="form-card">
      <h3 style={{ marginBottom: '8px' }}>Applicant Details</h3>
      <p className="text-muted" style={{ marginBottom: '24px' }}>Please provide the applicant information accurately as per your official documents.</p>
      <div className="grid-2">
        {activeSchema.map(f => (
           <div key={f.id} style={{ gridColumn: f.type === 'textarea' || f.type === 'address' ? '1 / -1' : 'auto' }}>
             <label className="form-label">{f.label} {f.required && <span style={{ color: 'var(--red)' }}>*</span>}</label>
             {f.type === 'select' ? (
                <select className="form-input" value={appState.details[f.id] || ''} onChange={e => updateDetails(f.id, e.target.value)}>
                   <option value="">Select {f.label}</option>
                   {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
             ) : f.type === 'textarea' || f.type === 'address' ? (
                <textarea className="form-input" rows="3" value={appState.details[f.id] || ''} onChange={e => updateDetails(f.id, e.target.value)} placeholder={`Enter ${f.label}`} />
             ) : (
                <input type={f.type || 'text'} className="form-input" value={appState.details[f.id] || ''} onChange={e => updateDetails(f.id, e.target.value)} placeholder={`Enter ${f.label}`} />
             )}
             {errors[f.id] && <span style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{errors[f.id]}</span>}
           </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '24px' }} onClick={nextStep}>Save & Continue</button>
    </div>
  );

  const renderDocuments = () => (
    <div className="form-card">
      <h3 style={{ marginBottom: '24px' }}>Upload Documents</h3>
      <p className="text-muted" style={{ marginBottom: '24px' }}>Please upload all required documents to proceed.</p>
      
      {(service.requiredDocuments || []).map(doc => (
        <div key={doc} style={{ marginBottom: '20px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>{doc} <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>*</span></h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Required</span>
            </div>
            {appState.documents[doc] ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                 <label className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    Replace <input type="file" hidden onChange={e => handleFileUpload(doc, e.target.files[0])} />
                 </label>
                 <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--red)' }} onClick={() => removeDocument(doc)}>Remove</button>
              </div>
            ) : (
              <label className="btn btn-outline" style={{ padding: '6px 16px', cursor: 'pointer' }}>
                <Upload size={16} /> Upload Document
                <input type="file" hidden onChange={e => handleFileUpload(doc, e.target.files[0])} />
              </label>
            )}
          </div>
          {appState.documents[doc] && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(46,204,113,0.1)', color: 'var(--green)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
               <Check size={16} /> {appState.documents[doc].fileName}
            </div>
          )}
          {errors[doc] && <span style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: '8px', display: 'block' }}>{errors[doc]}</span>}
        </div>
      ))}
      {isUploading && <div style={{ color: 'var(--brand-blue)', fontSize: '0.9rem', marginTop: '12px' }}>Uploading... please wait</div>}
      
      <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
         <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={prevStep}>Back</button>
         <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={nextStep} disabled={isUploading}>Continue to Additional Info</button>
      </div>
    </div>
  );

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
        <p className="text-muted" style={{ marginBottom: '24px' }}>
          Per platform rules, payment is verified online before the order is officially dispatched. Normal pending time is capped at 24 hours.
        </p>
        
        {/* Payment Method 1: UPI */}
        <div 
          onClick={() => setAppState(p => ({ ...p, paymentMethod: 'UPI' }))}
          style={{ 
            border: appState.paymentMethod === 'UPI' ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '16px', 
            marginBottom: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            background: appState.paymentMethod === 'UPI' ? 'rgba(83, 100, 249, 0.05)' : 'white',
            cursor: 'pointer'
          }}
        >
          <input type="radio" checked={appState.paymentMethod === 'UPI'} onChange={() => {}} style={{ width: '18px', height: '18px', accentColor: 'var(--brand-blue)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600' }}>UPI (Google Pay, PhonePe, Paytm, BHIM)</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Instant online authorization</div>
          </div>
        </div>
        
        {/* Payment Method 2: Cards */}
        <div 
          onClick={() => setAppState(p => ({ ...p, paymentMethod: 'CARD' }))}
          style={{ 
            border: appState.paymentMethod === 'CARD' ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '16px', 
            marginBottom: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            background: appState.paymentMethod === 'CARD' ? 'rgba(83, 100, 249, 0.05)' : 'white',
            cursor: 'pointer'
          }}
        >
          <input type="radio" checked={appState.paymentMethod === 'CARD'} onChange={() => {}} style={{ width: '18px', height: '18px', accentColor: 'var(--brand-blue)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600' }}>Debit / Credit Card</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visa, Mastercard, RuPay</div>
          </div>
        </div>

        {/* Payment Method 3: Platform Wallet */}
        <div 
          onClick={() => setAppState(p => ({ ...p, paymentMethod: 'WALLET' }))}
          style={{ 
            border: appState.paymentMethod === 'WALLET' ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)', 
            borderRadius: '12px', 
            padding: '16px', 
            marginBottom: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            background: appState.paymentMethod === 'WALLET' ? 'rgba(83, 100, 249, 0.05)' : 'white',
            cursor: 'pointer'
          }}
        >
          <input type="radio" checked={appState.paymentMethod === 'WALLET'} onChange={() => {}} style={{ width: '18px', height: '18px', accentColor: 'var(--brand-blue)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={16} color="var(--brand-blue)" /> Platform Wallet
            </div>
            <div style={{ fontSize: '0.8rem', color: hasEnoughWallet ? 'var(--green)' : 'var(--text-muted)' }}>
              Current balance: ₹{(walletBalance / 100).toFixed(2)} {hasEnoughWallet ? '(Eligible for checkout)' : '(Top up or use UPI)'}
            </div>
          </div>
        </div>
        
        {errors.payment && <div style={{ color: 'red', marginBottom: '16px' }}>{errors.payment}</div>}

        {!authenticated && (
          <div style={{
            background: 'var(--bg-main, #f8fafc)',
            border: '1px solid var(--brand-blue, #5364f9)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginTop: '20px',
            marginBottom: '10px'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--brand-blue)" /> Sign-in required to place your order
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Your application details and documents are safely preserved. Please log in or create an account to place your order and track live progress.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                className="btn btn-primary" 
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                onClick={() => navigate('/login', { state: { returnTo: `/services/${serviceId}` } })}
              >
                Sign In to Proceed
              </button>
              <button 
                type="button"
                className="btn btn-outline" 
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                onClick={() => navigate('/register', { state: { returnTo: `/services/${serviceId}` } })}
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
           <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={prevStep} disabled={isCreatingOrder}>Back to Review</button>
           <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={processCheckout} disabled={isCreatingOrder}>
             <Lock size={18} /> {isCreatingOrder ? 'Processing Payment & Creating Order...' : !authenticated ? 'Sign In & Place Order' : `Pay ₹${priceFormatted} & Place Order`}
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
