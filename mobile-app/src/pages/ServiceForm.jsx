import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, ChevronRight, Upload, Camera, 
  Trash2, FileText, AlertCircle, ShieldCheck, Loader2, Sparkles, 
  Phone, Zap, HelpCircle, X, PlusCircle, Check, User
} from 'lucide-react';
import { servicesApi, ordersApi, authApi } from '../api/client';
import { takePhoto } from '../utils/camera';
import { servicesConfig, getServiceConfig } from '../config/servicesConfig';

// Derive application types dynamically from service or universal tailored defaults
function getApplicationTypesForService(srv) {
  if (!srv) return ['New Application', 'Correction / Update', 'Duplicate / Reprint'];
  let types = [];
  if (Array.isArray(srv.applicationTypes) && srv.applicationTypes.length > 0) {
    types = srv.applicationTypes;
  } else if (Array.isArray(srv.subCategories) && srv.subCategories.length > 0) {
    types = srv.subCategories;
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
  const [operatorNotes, setOperatorNotes] = useState('');

  // Step 2 state: Contact phone
  const [contactPhone, setContactPhone] = useState('');

  // Custom document slot add
  const [customDocName, setCustomDocName] = useState('');
  const [showAddCustomDoc, setShowAddCustomDoc] = useState(false);

  useEffect(() => {
    async function loadService() {
      try {
        setLoading(true);
        const res = await servicesApi.getService(id);
        const s = res?.service || res;
        setService(s);

        // Pre-select first application type if available
        const cfg = getServiceConfig(s || id);
        const appTypes = cfg?.applicationTypes || [];
        if (appTypes.length > 0) {
          setSelectedApplicationType(appTypes[0].title || appTypes[0]);
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

  // Handle file picker selection
  const handleFileSelect = (docType, file) => {
    if (!file) return;

    let previewUrl = null;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    setUploadedItems(prev => {
      // Remove any existing file for this docType or add new
      const filtered = prev.filter(item => item.type !== docType);
      return [...filtered, {
        type: docType,
        file,
        previewUrl,
        fileName: file.name,
        size: file.size
      }];
    });
    setError(null);
  };

  // Handle camera capture using native or web camera
  const handleCameraCapture = async (docType) => {
    try {
      const result = await takePhoto(docType);
      if (result && result.file) {
        handleFileSelect(docType, result.file);
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
    return 'pan';
  }, [service, id]);

  const applicationTypes = useMemo(() => {
    return servicesConfig[serviceKey]?.applicationTypes || getServiceConfig(service || serviceKey).applicationTypes;
  }, [serviceKey, service]);

  // Check if step 1 inputs and documents and terms are valid
  const isStep1Valid = Boolean(
    selectedApplicationType &&
    selectedGender &&
    termsAccepted &&
    (
      (service?.requiredDocuments && service.requiredDocuments.length > 0)
        ? service.requiredDocuments.every(doc => uploadedItems.some(i => i.type === doc))
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
    const requiredDocs = service?.requiredDocuments || [];
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
        formData.append('subCategory', selectedApplicationType); // backward compatibility
      }
      if (selectedGender) {
        formData.append('gender', selectedGender);
      }
      formData.append('contactPhone', contactPhone.trim());
      formData.append('customerNotes', operatorNotes.trim());

      // Attach all uploaded document files
      uploadedItems.forEach((item) => {
        formData.append('documents', item.file);
        formData.append('documentTypes', item.type);
      });

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
              color: '#06B6D4',
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
        err.response?.data?.error?.message || 
        err.response?.data?.error || 
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
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading service requirements...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen p-6 text-center flex flex-col items-center justify-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-slate-100 mb-2">Service Not Found</h3>
        <button
          onClick={() => navigate('/')}
          className="text-xs font-semibold text-cyan-400"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  // Price calculations & breakdown
  const totalAmount = selectedService.price || 199;
  const serviceFee = Math.round(totalAmount * 0.7);
  const govtCharges = totalAmount - serviceFee;

  // Determine required documents list
  const defaultRequiredDocs = ['Identity Proof (Aadhaar / Voter ID)', 'Photo / Signature Specimen'];
  const docList = (service.requiredDocuments && service.requiredDocuments.length > 0)
    ? service.requiredDocuments
    : defaultRequiredDocs;

  return (
    <div className="min-h-screen pb-36 px-4 pt-3 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            if (currentStep > 1) setCurrentStep(currentStep - 1);
            else navigate(-1);
          }}
          className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/70 flex items-center justify-center text-slate-300 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">
            Express Assisted Flow
          </span>
          <span className="text-xs font-extrabold text-slate-200">
            Step {currentStep} of 2: {currentStep === 1 ? 'Documents & Notes' : 'Callback & Payment'}
          </span>
        </div>
        <div className="w-9" />
      </div>

      {/* Service Info Banner */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 mb-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {service.category || 'Government Service'}
            </span>
            <h1 className="text-sm font-extrabold text-slate-100 mt-1 leading-snug">
              {service.name}
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span>⚡ Fast 2-Step Application</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{service.estimatedTime || '24h Delivery'}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block">Total Fee</span>
            <span className="text-base font-black text-cyan-400">₹{totalAmount}</span>
          </div>
        </div>
      </div>

      {/* 2-Step Modern Indicator */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
            currentStep === 1
              ? 'bg-gradient-to-r from-indigo-950/60 to-cyan-950/60 border-cyan-400/80 ring-1 ring-cyan-500/30'
              : 'bg-slate-850/70 border-slate-750 text-slate-400'
          }`}
        >
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
            currentStep === 1 ? 'bg-cyan-500 text-slate-950' : (uploadedItems.length > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400')
          }`}>
            {uploadedItems.length > 0 ? <Check className="w-3.5 h-3.5" /> : '1'}
          </div>
          <div className="truncate">
            <span className="text-[11px] font-bold text-slate-200 block truncate">1. Upload Files</span>
            <span className="text-[9px] text-slate-400">{uploadedItems.length} attached</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            if (validateStep1()) setCurrentStep(2);
          }}
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
            currentStep === 2
              ? 'bg-gradient-to-r from-indigo-950/60 to-cyan-950/60 border-cyan-400/80 ring-1 ring-cyan-500/30'
              : 'bg-slate-850/70 border-slate-750 text-slate-400'
          }`}
        >
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
            currentStep === 2 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
          }`}>
            2
          </div>
          <div className="truncate">
            <span className="text-[11px] font-bold text-slate-200 block truncate">2. Review & Pay</span>
            <span className="text-[9px] text-slate-400">Callback & Payment</span>
          </div>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 1: Document Upload & Instructions                   */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="space-y-4">
          {/* Universal Application Type Selector */}
          <div className="bg-slate-850/90 border border-slate-750 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Application Type</span>
                <span className="text-rose-400 text-xs">*</span>
              </label>
              <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                Required
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Select the nature of your application so the operator prepares the exact filing forms:
            </p>
            <div className="grid grid-cols-1 gap-2 pt-1">
              {(servicesConfig[serviceKey]?.applicationTypes || []).map((appType) => {
                const title = typeof appType === 'string' ? appType : appType.title;
                const desc = typeof appType === 'object' ? appType.description : null;
                const badge = typeof appType === 'object' ? (appType.badge || appType.formType) : null;
                const isSelected = selectedApplicationType === title || selectedApplicationType === appType.id;

                return (
                  <button
                    key={typeof appType === 'object' ? appType.id : appType}
                    type="button"
                    onClick={() => {
                      setSelectedApplicationType(title);
                      setError(null);
                    }}
                    className={`p-3 rounded-xl text-left border transition-all flex items-start justify-between gap-3 active:scale-[0.99] ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-sm shadow-cyan-500/20 ring-1 ring-cyan-500/30'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-400'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                            {title}
                          </span>
                          {badge && (
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full tracking-wider uppercase ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {badge}
                            </span>
                          )}
                        </div>
                        {desc && (
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
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
          <div className="bg-slate-850/90 border border-slate-750 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Applicant Gender</span>
                <span className="text-rose-400 text-xs">*</span>
              </label>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
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
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium border transition-all text-center active:scale-95 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-sm ring-1 ring-cyan-500/30 font-semibold'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
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
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Upload Required Documents
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Take a clear photo or upload JPG, PNG, or PDF files.
              </p>
            </div>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
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
                  className="bg-slate-850/90 border border-slate-750 rounded-2xl p-3.5 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{docName}</span>
                      <span className="text-rose-400 text-xs">*</span>
                    </span>

                    {uploadedItem ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Attached
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>

                  {uploadedItem ? (
                    /* Compact File Preview Badge with remove icon */
                    <div className="flex items-center justify-between bg-slate-900/90 rounded-xl p-2.5 border border-slate-700/60">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {uploadedItem.previewUrl ? (
                          <img
                            src={uploadedItem.previewUrl}
                            alt="Preview"
                            className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {uploadedItem.fileName}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {(uploadedItem.size / 1024).toFixed(1)} KB • Ready for Operator
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(docName)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all ml-2 shrink-0"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* Touch-friendly Dashed Upload Dropzone */
                    <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-3 bg-slate-900/40 text-center transition-colors">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Camera Scan Button */}
                        <button
                          type="button"
                          onClick={() => handleCameraCapture(docName)}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-xs font-bold text-indigo-300 transition-all active:scale-95"
                        >
                          <Camera className="w-4 h-4 text-indigo-400" />
                          <span>Scan / Camera</span>
                        </button>

                        {/* File Picker Upload Label */}
                        <label className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-cyan-600/15 hover:bg-cyan-600/25 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 cursor-pointer transition-all active:scale-95">
                          <Upload className="w-4 h-4 text-cyan-400" />
                          <span>Pick File</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            className="hidden"
                            onChange={(e) => handleFileSelect(docName, e.target.files[0])}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">
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
                className="bg-slate-850/90 border border-slate-750 rounded-2xl p-3.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-100">{customItem.type}</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Attached
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-900/90 rounded-xl p-2.5 border border-slate-700/60">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {customItem.previewUrl ? (
                      <img src={customItem.previewUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-200 truncate">{customItem.fileName}</p>
                      <span className="text-[10px] text-slate-400">{(customItem.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(customItem.type)}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all ml-2 shrink-0"
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
                className="w-full py-2.5 border border-slate-700/70 border-dashed rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Add Another Document (Marksheet, Income Proof, etc.)</span>
              </button>
            ) : (
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Custom Document Label</span>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomDoc(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 10th Marksheet, Domicile Certificate"
                  value={customDocName}
                  onChange={(e) => setCustomDocName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <label className="flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-600/20 border border-cyan-500/30 rounded-lg text-xs font-bold text-cyan-300 cursor-pointer">
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
          <div className="bg-slate-850/90 border border-slate-750 rounded-2xl p-3.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  setError(null);
                }}
                className="mt-0.5 w-4 h-4 rounded border-slate-750 bg-slate-900 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-900 cursor-pointer"
              />
              <div className="text-xs text-slate-300 leading-snug">
                <span className="font-semibold text-slate-200">I accept the Terms & Conditions</span>
                <span className="text-rose-400 ml-1 font-bold">*</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  I confirm that all uploaded documents are authentic and authorize the operator to process the application on my behalf.
                </p>
              </div>
            </label>
          </div>

          {/* Operator Notes (Optional) */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Specific Instructions / Notes for Operator (Optional)</span>
              <span className="text-[10px] text-slate-500">Optional</span>
            </label>
            <textarea
              rows={3}
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="e.g., Annual income to mention is ₹1,50,000, or exam center preference: Patna."
              className="w-full px-3.5 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
          <div className="bg-gradient-to-br from-indigo-950/70 via-slate-850 to-cyan-950/50 border border-cyan-500/40 rounded-2xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-cyan-300 mb-1">
                  ⚡ Operator-Assisted Review
                </h3>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  ⚡ No manual forms or slot guesswork. Upload your documents and complete payment. Once your order is paired with an expert operator, they will propose the earliest available review window.
                </p>
              </div>
            </div>
          </div>

          {/* Selected Application Type Confirmation */}
          {selectedApplicationType && (
            <div className="bg-slate-850/80 border border-slate-750 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Application Type
                </span>
                <span className="text-xs font-bold text-cyan-300">
                  {selectedApplicationType}
                </span>
                {selectedGender && (
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Gender: <span className="text-slate-200 font-medium">{selectedGender}</span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300"
              >
                Change
              </button>
            </div>
          )}

          {/* Contact Number Verification */}
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Contact / WhatsApp Number</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">For Operator Updates</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">+91</span>
              <input
                type="tel"
                maxLength={10}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit mobile number"
                className="w-full pl-12 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-bold tracking-wider placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Prefilled from your account. You can edit this if you prefer calls on an alternate number.
            </p>
          </div>

          {/* Uploaded Documents Confirmation */}
          <div className="bg-slate-850/80 border border-slate-750 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-200">
                {uploadedItems.length} Document{uploadedItems.length !== 1 ? 's' : ''} Ready to Send
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300"
            >
              Modify Files
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Sticky Bottom Action Bar Right Above Bottom Navigation  */}
      {/* ======================================================== */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">Total Payable</p>
            <p className="text-xl font-bold text-cyan-400">₹{selectedService.price || 199}</p>
          </div>
          {currentStep === 1 ? (
            <button
              type="button"
              disabled={!isStep1Valid}
              onClick={() => {
                if (validateStep1()) setCurrentStep(2);
              }}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            >
              <span>Continue to Payment ➔</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleProceedToPayment}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 active:scale-95 transition-all text-center flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Pay & Submit Order ➔</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
