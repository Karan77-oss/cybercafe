import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, ChevronRight, Upload, Camera,
  Trash2, FileText, AlertCircle, ShieldCheck, Loader2, Sparkles,
  Phone, Zap, X, PlusCircle, Check, User, FolderUp
} from 'lucide-react';
import { servicesApi, ordersApi, authApi, vaultApi, documentsApi } from '../api/client';
import { takePhoto } from '../utils/camera';
import { servicesConfig } from '../config/servicesConfig';
import { validateDocumentClarity, compressDocument } from '../utils/documentProcessor';

// Derive application types dynamically from service or universal tailored defaults
function getApplicationTypesForService(srv) {
  if (!srv) return ['New Application', 'Correction / Update', 'Duplicate / Reprint'];
  let types = [];
  if (Array.isArray(srv.applicationTypes) && srv.applicationTypes.length > 0) {
    types = srv.applicationTypes;
  } else if (Array.isArray(srv.formSchema)) {
    const selectField = srv.formSchema.find(
      (f) => (f.id === 'application_type' || f.id === 'applicationType' || f.type === 'select') && Array.isArray(f.options) && f.options.length > 0
    );
    if (selectField) {
      types = selectField.options;
    }
  }

  if (types.length === 0) {
    const text = `${srv.name || ''} ${srv.id || ''} ${srv.category || ''}`.toLowerCase();
    if (text.includes('aadhaar') || text.includes('uidai')) {
      types = ['Mobile Link / Change', 'Address Update', 'Biometric Update', 'Name / DOB Correction'];
    } else if (text.includes('pan')) {
      types = ['New PAN (Form 49A)', 'Correction in Existing PAN', 'Duplicate / Lost Reprint'];
    } else if (text.includes('passport')) {
      types = ['Fresh Passport (Normal)', 'Passport Renewal / Re-issue', 'Tatkaal Application', 'Address / Name Change'];
    } else if (text.includes('voter') || text.includes('epic') || text.includes('election')) {
      types = ['New Voter Registration (Form 6)', 'Correction / Update (Form 8)', 'Shifting of Residence', 'Reprint Lost EPIC'];
    } else if (text.includes('driving') || text.includes('dl') || text.includes('licence') || text.includes('license') || text.includes('rto')) {
      types = ['Learner Licence', 'Permanent DL', 'Renewal / Address Change', 'Duplicate / Lost DL'];
    } else if (text.includes('ration')) {
      types = ['New Ration Card', 'Member Addition / Deletion', 'Address / FPS Change', 'Split / Surrender'];
    } else if (text.includes('income') || text.includes('caste') || text.includes('domicile') || text.includes('certificate')) {
      types = ['Fresh Certificate Application', 'Renewal / Verification', 'Correction of Details'];
    } else if (text.includes('pf') || text.includes('epfo') || text.includes('uan')) {
      types = ['PF Full Withdrawal (Form 19)', 'PF Advance (Form 31)', 'KYC / Bank Link', 'UAN Activation'];
    } else {
      types = ['New Application', 'Correction / Update', 'Duplicate / Lost Reprint', 'Renewal / Extension'];
    }
  }

  // Decouple demographics: remove gender values from application types
  return types
    .map((item) => (typeof item === 'string' ? item : item.name || item.label || item.value || String(item)))
    .filter((t) => !['male', 'female', 'other', 'transgender'].includes(t.toLowerCase().trim()));
}

// Normalize dynamic required documents array (strings or JSON objects)
function normalizeRequiredDocs(rawDocs) {
  if (!rawDocs) return [];
  let list = [];
  if (Array.isArray(rawDocs)) {
    list = rawDocs;
  } else if (typeof rawDocs === 'string') {
    try {
      const parsed = JSON.parse(rawDocs);
      if (Array.isArray(parsed)) list = parsed;
      else list = rawDocs.split(',').map(d => d.trim());
    } catch {
      list = rawDocs.split(',').map(d => d.trim());
    }
  }
  return list.map(d => {
    if (typeof d === 'object' && d !== null) {
      return d.doc || d.name || d.title || String(d.id || 'Document');
    }
    return typeof d === 'string' ? d.trim() : String(d);
  }).filter(Boolean);
}

export default function ServiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Documents & Notes, 2: Callback & Payment
  const [error, setError] = useState(null);

  // Standardized application type selection
  const [selectedApplicationType, setSelectedApplicationType] = useState('New Application');
  // Decoupled demographics: Gender selector
  const [selectedGender, setSelectedGender] = useState('Male');
  // Mandatory Terms & Conditions Checkbox
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Uploaded documents state: array of { type: string, file: File, previewUrl: string, size: number, fileName: string }
  const [uploadedItems, setUploadedItems] = useState([]);
  const [processingDoc, setProcessingDoc] = useState(null);
  const [operatorNotes, setOperatorNotes] = useState('');

  // Step 2 state: Contact phone
  const [contactPhone, setContactPhone] = useState('');

  // Custom document slot add
  const [customDocName, setCustomDocName] = useState('');
  const [showAddCustomDoc, setShowAddCustomDoc] = useState(false);

  // Vault auto-reuse states
  const [vaultDocs, setVaultDocs] = useState([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [activeVaultSlot, setActiveVaultSlot] = useState(null);

  useEffect(() => {
    async function loadService() {
      try {
        setLoading(true);
        const res = await servicesApi.getService(id);
        const s = res?.service || res;
        setService(s);

        // Pre-select first application type dynamically from live Supabase service
        const appTypes = (Array.isArray(s?.applicationTypes) && s.applicationTypes.length > 0)
          ? s.applicationTypes
          : getApplicationTypesForService(s);
        if (appTypes.length > 0) {
          setSelectedApplicationType(appTypes[0].title || appTypes[0].id || appTypes[0]);
        }

        // Prepopulate contact number from logged in user profile
        const user = authApi.getCurrentUser();
        if (user?.phone) {
          setContactPhone(user.phone);
        } else if (user?.email) {
          setContactPhone('');
        }
      } catch (err) {
        console.error('Failed to load service:', err);
        setError('Service details could not be retrieved.');
      } finally {
        setLoading(false);
      }
    }
    loadService();
  }, [id]);

  const openVaultModal = async (docType) => {
    setActiveVaultSlot(docType);
    setLoadingVault(true);
    try {
      const res = await vaultApi.getDocuments();
      if (res?.documents && Array.isArray(res.documents)) {
        setVaultDocs(res.documents);
      }
    } catch (err) {
      console.warn('Could not load vault documents:', err);
    } finally {
      setLoadingVault(false);
    }
  };

  const handleSelectFromVault = (docType, vDoc) => {
    setUploadedItems(prev => {
      const filtered = prev.filter(item => item.type !== docType);
      return [...filtered, {
        type: docType,
        existingDocId: vDoc.id,
        isFromVault: true,
        fileName: vDoc.docName || vDoc.fileName || vDoc.name || 'Vault Document',
        size: vDoc.size || 0,
        previewUrl: null
      }];
    });
    setActiveVaultSlot(null);
    setError(null);
  };

  // Handle file picker selection with client-side validation, compression, and direct presigned upload
  const handleFileSelect = async (docType, file) => {
    if (!file) return;
    setProcessingDoc(docType);
    setError(null);

    try {
      // 1. Client-side resolution and blur check (Task 3.1)
      const clarity = await validateDocumentClarity(file);
      if (!clarity.valid) {
        setError(clarity.error || 'Document image is too small or blurry. Please upload a clear photo.');
        setProcessingDoc(null);
        return;
      }

      // 2. Client-side WebP compression (Task 3.1)
      const processedFile = await compressDocument(file, { maxWidth: 1600, quality: 0.78 });

      let previewUrl = null;
      if (processedFile.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(processedFile);
      }

      let existingDocId = null;

      // 3. Direct Presigned Upload (Task 3.2: Bypass Multer RAM)
      try {
        const presignRes = await documentsApi.presignUpload({
          fileName: processedFile.name,
          mimeType: processedFile.type,
          docName: docType
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
                docName: docType
              });
              if (confirmRes?.document?.id) {
                existingDocId = confirmRes.document.id;
              }
            }
          }
        }
      } catch (presignErr) {
        console.warn('[DirectUpload] Presigned upload fallback:', presignErr);
      }

      setUploadedItems(prev => {
        // Remove any existing file for this docType or add new
        const filtered = prev.filter(item => item.type !== docType);
        return [...filtered, {
          type: docType,
          file: processedFile,
          existingDocId,
          previewUrl,
          fileName: processedFile.name,
          size: processedFile.size,
          warning: clarity.warning || null
        }];
      });
    } catch (err) {
      console.error('Document processing error:', err);
      setError('Failed to process document. Please try again.');
    } finally {
      setProcessingDoc(null);
    }
  };

  // Handle camera capture using native or web camera
  const handleCameraCapture = async (docType) => {
    try {
      const result = await takePhoto(docType);
      if (result && result.file) {
        await handleFileSelect(docType, result.file);
      }
    } catch (err) {
      console.warn('Camera capture failed:', err);
    }
  };

  // Remove uploaded document
  const handleRemoveFile = (docType) => {
    setUploadedItems(prev => {
      const target = prev.find(i => i.type === docType);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(item => item.type !== docType);
    });
  };

  // Compute normalized service object and sub-categories
  const selectedService = useMemo(() => {
    if (!service) return { price: 199 };
    return {
      ...service,
      price: service.price || (service.pricePaise ? Math.round(service.pricePaise / 100) : 199)
    };
  }, [service]);

  const serviceKey = useMemo(() => {
    const sId = (service?.id || id || '').toLowerCase();
    const sName = (service?.name || '').toLowerCase();
    const sCat = (service?.category || '').toLowerCase();
    const text = `${sId} ${sName} ${sCat}`;

    if (text.includes('pan')) return 'pan';
    if (text.includes('aadhaar') || text.includes('uidai')) return 'aadhaar';
    if (text.includes('voter') || text.includes('epic') || text.includes('election')) return 'voter';
    if (text.includes('dl') || text.includes('driving') || text.includes('licence') || text.includes('license') || text.includes('rto')) return 'dl';
    if (text.includes('certificate') || text.includes('income') || text.includes('caste') || text.includes('domicile')) return 'certificates';
    if (text.includes('ration')) return 'ration';
    if (text.includes('passport')) return 'passport';
    if (servicesConfig[sId]) return sId;
    return null;
  }, [service, id]);

  const applicationTypes = useMemo(() => {
    // 1. Highest Priority: Admin-configured Universal Application Types on this service
    if (Array.isArray(service?.applicationTypes) && service.applicationTypes.length > 0) {
      return service.applicationTypes.map((item, idx) => {
        if (typeof item === 'string') {
          return {
            id: `app_type_${idx}`,
            title: item,
            description: null,
            badge: 'OFFICIAL'
          };
        }
        return {
          id: item.id || `app_type_${idx}`,
          title: item.title || item.name || 'Standard Application',
          description: item.description || null,
          badge: item.badge || item.formType || null
        };
      });
    }

    // 2. Second Priority: Options from service.formSchema application_type select field
    if (Array.isArray(service?.formSchema)) {
      const selectField = service.formSchema.find(
        (f) => (f.id === 'application_type' || f.id === 'applicationType' || f.type === 'select') && Array.isArray(f.options) && f.options.length > 0
      );
      if (selectField) {
        return selectField.options.map((opt, idx) => ({
          id: `opt_${idx}`,
          title: typeof opt === 'string' ? opt : (opt.label || opt.value),
          description: null,
          badge: 'OPTION'
        }));
      }
    }

    // 3. Third Priority: Tailored category config ONLY if serviceKey matched a known category
    if (serviceKey && servicesConfig[serviceKey]?.applicationTypes) {
      return servicesConfig[serviceKey].applicationTypes;
    }

    // 4. Universal Fallback: Dynamic based on this specific service name (never PAN!)
    return [
      {
        id: 'standard-application',
        title: `${service?.name || 'Standard'} Application`,
        description: `Full assistance, document review, and official filing for ${service?.name || 'this service'}.`,
        badge: 'STANDARD'
      }
    ];
  }, [service, serviceKey]);

  // Keep selectedApplicationType synced with available applicationTypes
  useEffect(() => {
    if (applicationTypes.length > 0) {
      const exists = applicationTypes.some(
        (t) => (typeof t === 'string' ? t : t.title) === selectedApplicationType || t.id === selectedApplicationType
      );
      if (!selectedApplicationType || !exists) {
        const first = applicationTypes[0];
        setSelectedApplicationType(typeof first === 'string' ? first : (first.title || first.id));
      }
    }
  }, [applicationTypes, selectedApplicationType]);

  const docList = useMemo(() => {
    const normalized = normalizeRequiredDocs(service?.requiredDocuments);
    const defaultRequiredDocs = ['Identity Proof (Aadhaar / Voter ID)', 'Photo / Signature Specimen'];
    return normalized.length > 0 ? normalized : defaultRequiredDocs;
  }, [service]);

  // Check if step 1 inputs and documents and terms are valid
  const isStep1Valid = Boolean(
    selectedApplicationType &&
    selectedGender &&
    termsAccepted &&
    (
      (docList && docList.length > 0)
        ? docList.every(doc => uploadedItems.some(i => i.type === doc))
        : uploadedItems.length > 0
    )
  );

  // Step 1 Validation
  const validateStep1 = () => {
    if (!selectedApplicationType) {
      setError('Please choose a valid application type.');
      return false;
    }
    if (!selectedGender) {
      setError('Please choose applicant gender.');
      return false;
    }
    if (!termsAccepted) {
      setError('Please agree to the Terms & Conditions before proceeding.');
      return false;
    }
    const requiredDocs = docList;
    if (requiredDocs.length > 0) {
      const uploadedTypes = uploadedItems.map(i => i.type);
      const missing = requiredDocs.find(doc => !uploadedTypes.includes(doc));
      if (missing) {
        setError(`Please attach or capture photo for: "${missing}"`);
        return false;
      }
    } else if (uploadedItems.length === 0) {
      setError('Please upload at least one relevant document for the operator.');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 2 Validation & Payment / Order Submission
  const handleProceedToPayment = async () => {
    if (!contactPhone || contactPhone.trim().length < 10) {
      setError('Please provide a valid 10-digit contact / WhatsApp number for operator callback.');
      return;
    }

    if (!authApi.isAuthenticated()) {
      localStorage.setItem('redirectAfterAuth', window.location.pathname);
      navigate('/auth');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Construct multipart FormData payload with universal application_type & gender
      const formData = new FormData();
      formData.append('serviceId', selectedService.id || id);
      if (selectedApplicationType) {
        formData.append('application_type', selectedApplicationType);
      }
      if (selectedGender) {
        formData.append('gender', selectedGender);
      }
      formData.append('contactPhone', contactPhone.trim());
      formData.append('customerNotes', operatorNotes.trim());

      // Attach all uploaded document files and vault document IDs
      const existingDocIds = [];
      uploadedItems.forEach((item) => {
        if (item.existingDocId) {
          existingDocIds.push(item.existingDocId);
        } else if (item.file) {
          formData.append('documents', item.file);
          formData.append('documentTypes', item.type);
        }
      });
      if (existingDocIds.length > 0) {
        formData.append('existingDocumentIds', JSON.stringify(existingDocIds));
      }

      // 2. Submit to POST /api/orders
      const res = await ordersApi.createOrder(formData);
      const createdOrder = res?.order || res?.data?.order || res;
      const orderId = createdOrder?.id || createdOrder?.orderId;

      if (!orderId) {
        throw new Error('Order placement failed: no order ID returned from server.');
      }

      const currentUser = authApi.getCurrentUser() || {};
      const totalPaise = createdOrder.pricePaise || selectedService.pricePaise || ((selectedService.price || 199) * 100);
      const totalRupees = Math.round(totalPaise / 100);

      // 3. Initiate Razorpay Checkout Gateway
      try {
        const paymentRes = await ordersApi.createPayment({
          orderId,
          amount: totalRupees,
        });

        const razorpayOrderId = paymentRes?.razorpayOrderId;
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || paymentRes?.key || 'rzp_test_TjrbhiZugaYLYJ';

        if (window.Razorpay && razorpayOrderId) {
          const options = {
            key: razorpayKey,
            amount: totalPaise,
            currency: 'INR',
            name: 'Cyber Cafe Express',
            description: `${selectedService.name || 'Service'} - ${selectedApplicationType || 'Assisted'}`,
            order_id: razorpayOrderId,
            handler: async function (response) {
              try {
                await ordersApi.verifyPayment({
                  orderId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
              } catch (verifyErr) {
                console.warn('Payment verification callback notice:', verifyErr);
              }
              navigate(`/orders/${orderId}`);
            },
            prefill: {
              name: currentUser.name || 'Customer',
              email: currentUser.email || '',
              contact: contactPhone || currentUser.phone || '',
            },
            theme: {
              color: '#0284C7',
            },
            modal: {
              ondismiss: function () {
                navigate(`/orders/${orderId}`);
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (resp) {
            console.warn('Razorpay payment dismissed or failed:', resp);
            navigate(`/orders/${orderId}`);
          });
          rzp.open();
          return;
        }
      } catch (payGatewayErr) {
        console.warn('Razorpay gateway notice (fallback to order tracking):', payGatewayErr);
      }

      // Default redirect to Order Tracking
      navigate(`/orders/${orderId}`);
    } catch (err) {
      console.error('Order submission error:', err);
      setError(
        err.friendlyMessage ||
        err.response?.data?.error?.message ||
        (typeof err.response?.data?.error === 'string' ? err.response?.data?.error : null) ||
        err.response?.data?.message ||
        err.message ||
        'Order submission failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-xs text-slate-500">Loading service requirements...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen p-6 text-center flex flex-col items-center justify-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
        <h3 className="text-base font-bold text-slate-900 mb-2">Service Not Found</h3>
        <button
          onClick={() => navigate('/')}
          className="text-xs font-semibold text-sky-600"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  // Price calculations & breakdown
  const totalAmount = selectedService.price || 199;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => {
            if (currentStep > 1) setCurrentStep(currentStep - 1);
            else navigate(-1);
          }}
          className="w-9 h-9 rounded-full bg-white shadow-neo-sm border border-slate-100 flex items-center justify-center text-slate-700 hover:text-slate-900 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <span className="text-[9px] font-extrabold text-sky-700 uppercase tracking-widest block">
            Express Assisted Flow
          </span>
          <span className="text-xs font-extrabold text-slate-900">
            Step {currentStep} of 2: {currentStep === 1 ? 'Documents & Details' : 'Callback & Payment'}
          </span>
        </div>
        <div className="w-9" />
      </div>

      <div className="px-5 py-3 space-y-4 pb-36">
        {/* Step Indicator Card */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-neo-sm">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-900">
              Step {currentStep} of 2: {currentStep === 1 ? 'Documents & Details' : 'Callback & Payment'}
            </span>
            <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
              {currentStep === 1 ? '50% Completed' : '100% Completed'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-sky-600 h-full rounded-full transition-all duration-300"
              style={{ width: currentStep === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {/* Service Info Banner */}
        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-neo-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {service.category || 'Government Service'}
              </span>
              <h1 className="text-sm font-extrabold text-slate-900 mt-1.5 leading-snug">
                {service.name}
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> Assisted Entry</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">{service.estimatedTime || '24h Delivery'}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-500 block">Total Fee</span>
              <span className="text-base font-extrabold text-sky-700">₹{totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 flex items-center gap-2 text-xs text-rose-600">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 1: Document Upload & Instructions                   */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Universal Application Type Selector */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Application Type</span>
                  <span className="text-rose-500 text-xs">*</span>
                </label>
                <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                  Required
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Select the nature of your application so the operator prepares the exact filing forms:
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {(applicationTypes || []).map((appType, appIdx) => {
                  const title = typeof appType === 'string' ? appType : (appType.title || appType.name || 'Standard Application');
                  const desc = typeof appType === 'object' ? appType.description : null;
                  const badge = typeof appType === 'object' ? (appType.badge || appType.formType) : null;
                  const isSelected = selectedApplicationType === title || selectedApplicationType === appType.id;

                  return (
                    <button
                      key={typeof appType === 'object' ? (appType.id || `app_${appIdx}`) : `${appType}_${appIdx}`}
                      type="button"
                      onClick={() => {
                        setSelectedApplicationType(title);
                        setError(null);
                      }}
                      className={`p-3 rounded-2xl text-left border transition-all flex items-start justify-between gap-3 active:scale-[0.99] ${
                        isSelected
                          ? 'bg-sky-50/50 border-sky-500 ring-2 ring-sky-500/20 shadow-neo-sm'
                          : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-sky-600 bg-sky-600'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-sky-800' : 'text-slate-700'}`}>
                              {title}
                            </span>
                            {badge && (
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full tracking-wider uppercase border ${
                                isSelected
                                  ? 'bg-sky-100 text-sky-700 border-sky-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {badge}
                              </span>
                            )}
                          </div>
                          {desc && (
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              {desc}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Decoupled Gender Demographic Selector */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  <span>Applicant Gender</span>
                  <span className="text-rose-500 text-xs">*</span>
                </label>
                <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/80">
                  Demographic
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                {['Male', 'Female', 'Other'].map((g) => {
                  const isSelected = selectedGender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setSelectedGender(g);
                        setError(null);
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-[#F8FAFC] text-slate-600 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 1 Title */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Upload Required Documents
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Take a clear photo or upload JPG, PNG, or PDF files.
                </p>
              </div>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                No Typing Required
              </span>
            </div>

            {/* Dynamic Required Documents List */}
            <div className="space-y-3">
              {docList.map((docName) => {
                const uploadedItem = uploadedItems.find(i => i.type === docName);

                return (
                  <div
                    key={docName}
                    className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{docName}</span>
                        <span className="text-rose-500 text-xs">*</span>
                      </span>

                      {uploadedItem ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Attached
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full shrink-0">
                          Pending
                        </span>
                      )}
                    </div>

                    {uploadedItem ? (
                      /* Compact File Preview Badge with remove icon */
                      <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-2.5 border border-slate-200/70">
                        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                          {uploadedItem.previewUrl ? (
                            <img
                              src={uploadedItem.previewUrl}
                              alt="Preview"
                              className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                              <span>{uploadedItem.fileName}</span>
                              {uploadedItem.isFromVault && (
                                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.2 rounded shrink-0">
                                  Vault
                                </span>
                              )}
                            </p>
                            <span className="text-[10px] text-slate-500">
                              {uploadedItem.size ? `${(uploadedItem.size / 1024).toFixed(1)} KB • ` : ''}Ready for Operator
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(docName)}
                          className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-500 text-slate-500 flex items-center justify-center transition-all ml-2 shrink-0"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : processingDoc === docName ? (
                      <div className="border border-sky-200 rounded-2xl p-3 bg-sky-50/50 text-center flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                        <span className="text-xs font-medium text-sky-800">Validating & compressing document...</span>
                      </div>
                    ) : (
                      /* Touch-friendly Multi-source Upload Hub */
                      <div className="rounded-2xl p-3 bg-slate-50/80 border border-slate-200/70">
                        <div className="grid grid-cols-3 gap-2">
                          {/* Camera Scan Button */}
                          <button
                            type="button"
                            onClick={() => handleCameraCapture(docName)}
                            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 transition-all text-slate-700 gap-1.5 active:scale-95 shadow-neo-sm"
                          >
                            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                              <Camera className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-bold">Camera</span>
                          </button>

                          {/* File Picker Upload Label */}
                          <label className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 transition-all text-slate-700 gap-1.5 cursor-pointer active:scale-95 shadow-neo-sm">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                              <FolderUp className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-bold">Upload File</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              className="hidden"
                              onChange={(e) => handleFileSelect(docName, e.target.files[0])}
                            />
                          </label>

                          {/* Vault Selection Button */}
                          <button
                            type="button"
                            onClick={() => openVaultModal(docName)}
                            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 transition-all text-slate-700 gap-1.5 active:scale-95 shadow-neo-sm"
                          >
                            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-bold">DigiVault</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 text-center">
                          Supported: JPG, PNG, PDF up to 15MB
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Any Additional Custom Uploads */}
              {uploadedItems.filter(i => !docList.includes(i.type)).map(customItem => (
                <div
                  key={customItem.type}
                  className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 truncate">{customItem.type}</span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full shrink-0">
                      Attached
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-2.5 border border-slate-200/70">
                    <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                      {customItem.previewUrl ? (
                        <img src={customItem.previewUrl} alt="Preview" className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{customItem.fileName}</p>
                        <span className="text-[10px] text-slate-500">{(customItem.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(customItem.type)}
                      className="w-7 h-7 rounded-xl bg-slate-100 text-slate-500 hover:text-rose-500 flex items-center justify-center transition-all ml-2 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Optional Additional Document Toggle */}
              {!showAddCustomDoc ? (
                <button
                  type="button"
                  onClick={() => setShowAddCustomDoc(true)}
                  className="w-full py-3 border border-slate-300 border-dashed rounded-2xl bg-white text-slate-500 hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-sky-600" />
                  <span>Add Another Document (Marksheet, Income Proof, etc.)</span>
                </button>
              ) : (
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Custom Document Label</span>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomDoc(false)}
                      className="text-slate-500 hover:text-slate-900"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 10th Marksheet, Domicile Certificate"
                    value={customDocName}
                    onChange={(e) => setCustomDocName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                  <label className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-sky-50 border border-sky-200/70 rounded-xl text-xs font-bold text-sky-700 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose File for "{customDocName || 'Custom Doc'}"</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleFileSelect(customDocName.trim() || 'Additional Document', e.target.files[0]);
                          setCustomDocName('');
                          setShowAddCustomDoc(false);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Mandatory Terms & Conditions Checkbox */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-neo-card">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    setError(null);
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 bg-white text-sky-600 focus:ring-sky-500/40 focus:ring-offset-white cursor-pointer"
                />
                <div className="text-xs text-slate-600 leading-snug">
                  <span className="font-semibold text-slate-900">I accept the Terms & Conditions</span>
                  <span className="text-rose-500 ml-1 font-bold">*</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    I confirm that all uploaded documents are authentic and authorize the operator to process the application on my behalf.
                  </p>
                </div>
              </label>
            </div>

            {/* Operator Notes (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Specific Instructions / Notes for Operator</span>
                <span className="text-[10px] text-slate-400">Optional</span>
              </label>
              <textarea
                rows={3}
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                placeholder="e.g., Annual income to mention is ₹1,50,000, or exam center preference: Patna."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 resize-none"
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: Review & Payment                                 */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {/* Assurance / Trust Banner */}
            <div className="bg-sky-50/70 border border-sky-200/60 rounded-3xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-sky-900 mb-1">
                    Operator-Assisted Review
                  </h3>
                  <p className="text-[11px] text-sky-800/80 leading-relaxed">
                    No manual forms or slot guesswork. Upload your documents and complete payment. Once your order is paired with an expert operator, they will propose the earliest available review window.
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Application Type Confirmation */}
            {selectedApplicationType && (
              <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-neo-card flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider block">
                    Application Type
                  </span>
                  <span className="text-xs font-bold text-sky-800">{selectedApplicationType}</span>
                  {selectedGender && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Gender: <span className="text-slate-800 font-semibold capitalize">{selectedGender}</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 shrink-0 ml-2"
                >
                  Change
                </button>
              </div>
            )}

            {/* Contact Number Verification */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-neo-card space-y-2">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-sky-600" />
                  <span>Contact / WhatsApp Number</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">For Operator Updates</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="w-full pl-12 pr-3 py-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-xl text-xs text-slate-900 font-bold tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Prefilled from your account. You can edit this if you prefer calls on an alternate number.
              </p>
            </div>

            {/* Uploaded Documents Confirmation */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-neo-card flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-medium text-slate-700 truncate">
                  {uploadedItems.length} Document{uploadedItems.length !== 1 ? 's' : ''} Ready to Send
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-[11px] font-bold text-sky-600 hover:text-sky-700 shrink-0 ml-2"
              >
                Modify Files
              </button>
            </div>
          </div>
        )}

        {/* Sticky Bottom Action Bar */}
        <div className="sticky bottom-0 mt-auto bg-white/95 backdrop-blur-xl border-t border-slate-200/80 p-4 z-40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Payable</span>
              <span className="text-base font-extrabold text-slate-900 font-mono">₹{selectedService.price || 199}</span>
            </div>
            {currentStep === 1 ? (
              <button
                type="button"
                disabled={!isStep1Valid}
                onClick={() => {
                  if (validateStep1()) setCurrentStep(2);
                }}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <span>Continue to Payment</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleProceedToPayment}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Pay & Submit Order</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vault Selection Sheet / Modal */}
      {activeVaultSlot && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden border border-slate-200/60">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <span>Personal Document Vault</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Attach verified document to <strong>{activeVaultSlot}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveVaultSlot(null)}
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {loadingVault ? (
                <div className="py-8 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
                  <p className="text-xs">Loading your secure vault...</p>
                </div>
              ) : vaultDocs.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Your Vault is Empty</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Take a photo or upload a file directly above. Documents are automatically saved to your vault for quick reuse next time!
                  </p>
                </div>
              ) : (
                vaultDocs.map((vDoc) => (
                  <div
                    key={vDoc.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-sky-200"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {vDoc.docName || vDoc.fileName || vDoc.name || 'Personal Document'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {vDoc.fileName} {vDoc.size ? `• ${(vDoc.size / 1024).toFixed(0)} KB` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectFromVault(activeVaultSlot, vDoc)}
                      className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full shrink-0 active:scale-95 transition-transform"
                    >
                      Use
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setActiveVaultSlot(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-600 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
