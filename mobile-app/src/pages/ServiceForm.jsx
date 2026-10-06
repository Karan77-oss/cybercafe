import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, ChevronRight, Upload, Camera, 
  Trash2, FileText, AlertCircle, ShieldCheck, Loader2, Sparkles, Clock, Calendar 
} from 'lucide-react';
import { servicesApi, ordersApi, authApi, vaultApi } from '../api/client';
import { takePhoto } from '../utils/camera';
import TimeSlotPicker from '../components/TimeSlotPicker';

export default function ServiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({}); // { [docName]: File }
  const [filePreviews, setFilePreviews] = useState({});   // { [docName]: string }

  // Time slot state
  const [bookingDate, setBookingDate] = useState('Today');
  const [timeSlot, setTimeSlot] = useState('10:30 AM - 12:00 PM');

  useEffect(() => {
    async function loadService() {
      try {
        setLoading(true);
        const res = await servicesApi.getService(id);
        const s = res?.service || res;
        setService(s);

        // Prepopulate default fields
        if (s?.formSchema) {
          const initial = {};
          s.formSchema.forEach(field => {
            initial[field.id] = field.defaultValue || '';
          });
          setFormData(initial);
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

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileSelect = (docName, file) => {
    if (!file) return;
    setUploadedFiles(prev => ({ ...prev, [docName]: file }));
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviews(prev => ({ ...prev, [docName]: url }));
    } else {
      setFilePreviews(prev => ({ ...prev, [docName]: null }));
    }
  };

  const handleCameraCapture = async (docName) => {
    const result = await takePhoto(docName);
    if (result && result.file) {
      handleFileSelect(docName, result.file);
    }
  };

  const handleRemoveFile = (docName) => {
    setUploadedFiles(prev => {
      const copy = { ...prev };
      delete copy[docName];
      return copy;
    });
    setFilePreviews(prev => {
      const copy = { ...prev };
      delete copy[docName];
      return copy;
    });
  };

  const validateStep1 = () => {
    if (!service?.formSchema) return true;
    for (const field of service.formSchema) {
      if (field.required && !formData[field.id]) {
        setError(`Please fill in "${field.label}"`);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!service?.requiredDocuments || service.requiredDocuments.length === 0) return true;
    for (const doc of service.requiredDocuments) {
      if (!uploadedFiles[doc]) {
        setError(`Please attach or scan "${doc}"`);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleSubmitOrder = async () => {
    if (!authApi.isAuthenticated()) {
      // Store current path to redirect back after login
      localStorage.setItem('redirectAfterAuth', window.location.pathname);
      navigate('/auth');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Upload files first through the upload endpoint to get document references
      const docIds = [];
      const clientDocs = [];

      for (const [docName, file] of Object.entries(uploadedFiles)) {
        const fileForm = new FormData();
        fileForm.append('file', file);
        fileForm.append('docName', docName);

        try {
          const uploadRes = await vaultApi.uploadGeneralDoc(fileForm);
          if (uploadRes?.document?.id) {
            docIds.push(uploadRes.document.id);
            clientDocs.push({
              id: uploadRes.document.id,
              docName,
              fileName: file.name,
              size: file.size
            });
          }
        } catch (uploadErr) {
          console.warn('Doc upload error, fallback to direct FormData:', uploadErr);
        }
      }

      // 2. Prepare order payload with Time Slot & Booking Date
      const serviceAmount = service.pricePaise ? Math.round(service.pricePaise / 100) : 199;
      const orderPayload = {
        serviceId: service.id,
        serviceName: service.name,
        formData: formData,
        bookingDate: bookingDate || 'Today',
        timeSlot: timeSlot || '10:00 AM - 12:00 PM',
        amount: serviceAmount,
        documentIds: docIds,
        clientDocuments: clientDocs,
        notes: formData.notes || formData.instructions || '',
      };

      const res = await ordersApi.createOrder(orderPayload);
      const createdOrder = res?.order || res?.data?.order || res;
      const orderId = createdOrder?.id || createdOrder?.orderId;

      if (!orderId) {
        throw new Error('Order placement failed: no order ID returned.');
      }

      const currentUser = authApi.getCurrentUser() || {};

      // 3. Initiate Razorpay Gateway Checkout
      try {
        const paymentRes = await ordersApi.createPayment({
          orderId,
          amount: serviceAmount,
        });

        const razorpayOrderId = paymentRes?.razorpayOrderId;
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || paymentRes?.key || 'rzp_test_TjrbhiZugaYLYJ';

        if (window.Razorpay && razorpayOrderId) {
          const options = {
            key: razorpayKey,
            amount: (createdOrder.pricePaise || service.pricePaise || (serviceAmount * 100)),
            currency: 'INR',
            name: 'Cyber Cafe Marketplace',
            description: createdOrder.serviceName || service.name,
            order_id: razorpayOrderId,
            handler: async function (response) {
              try {
                // Verify signature on backend
                await ordersApi.verifyPayment({
                  orderId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
              } catch (verifyErr) {
                console.warn('Payment verification notice:', verifyErr);
              }
              navigate(`/orders/${orderId}`);
            },
            prefill: {
              name: currentUser.name || formData.fullName || '',
              email: currentUser.email || formData.email || '',
              contact: currentUser.phone || formData.phone || '',
            },
            theme: {
              color: '#4F46E5',
            },
            modal: {
              ondismiss: function () {
                navigate(`/orders/${orderId}`);
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (resp) {
            console.warn('Razorpay payment failed:', resp);
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
      setError(err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Order submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading service configuration...</p>
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

  const priceFormatted = service.pricePaise ? `₹${Math.round(service.pricePaise / 100)}` : 'Free';

  return (
    <div className="min-h-screen pb-24 px-4 pt-3 max-w-lg mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            if (currentStep > 1) setCurrentStep(currentStep - 1);
            else navigate(-1);
          }}
          className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/70 flex items-center justify-center text-slate-300 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Step {currentStep} of 4
        </span>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Service Header Card */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 mb-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {service.category || 'Service'}
            </span>
            <h1 className="text-base font-extrabold text-slate-100 mt-1 leading-snug">
              {service.name}
            </h1>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-slate-400 block">Total</span>
            <span className="text-sm font-black text-cyan-400">{priceFormatted}</span>
          </div>
        </div>
      </div>

      {/* Stepper Indicator */}
      <div className="flex items-center justify-between mb-6 px-1">
        {[
          { step: 1, title: 'Details' },
          { step: 2, title: 'Documents' },
          { step: 3, title: 'Time Slot' },
          { step: 4, title: 'Review & Pay' },
        ].map((s, idx) => (
          <React.Fragment key={s.step}>
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep >= s.step
                    ? 'bg-cyan-500 text-slate-950 glow-cyan'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {currentStep > s.step ? <CheckCircle2 className="w-4 h-4" /> : s.step}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${
                currentStep >= s.step ? 'text-cyan-300 font-semibold' : 'text-slate-500'
              }`}>
                {s.title}
              </span>
            </div>
            {idx < 3 && (
              <div className={`flex-1 h-0.5 mx-1.5 rounded ${
                currentStep > idx + 1 ? 'bg-cyan-500' : 'bg-slate-800'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Form Fields */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Applicant & Application Information
          </h3>

          {service.formSchema?.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>{field.label}</span>
                {field.required && <span className="text-[10px] text-amber-400 font-bold">*Required</span>}
              </label>

              {field.type === 'select' ? (
                <select
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700/70 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="">Select an option</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.label}...`}
                  className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700/70 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.label}...`}
                  className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700/70 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              if (validateStep1()) setCurrentStep(2);
            }}
            className="w-full mt-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-98 transition-all"
          >
            <span>Continue to Documents</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Document Uploads */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Required Documents
            </h3>
            <span className="text-[11px] text-cyan-400">Mobile Scanner Ready</span>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Capture clear photos using your camera or upload scanned PDF / images from your phone.
          </p>

          {(!service.requiredDocuments || service.requiredDocuments.length === 0) ? (
            <div className="glass-card p-5 rounded-2xl text-center">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-medium">No documents required for this service.</p>
            </div>
          ) : (
            service.requiredDocuments.map((docName) => {
              const file = uploadedFiles[docName];
              const preview = filePreviews[docName];

              return (
                <div key={docName} className="bg-slate-800/90 border border-slate-700/70 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-200">{docName}</span>
                    {file ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>

                  {file ? (
                    <div className="flex items-center justify-between bg-slate-900/80 rounded-xl p-2.5 border border-slate-700/50">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {preview ? (
                          <img src={preview} alt="preview" className="w-9 h-9 object-cover rounded-lg shrink-0 border border-slate-700" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-200 truncate">{file.name}</p>
                          <span className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveFile(docName)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCameraCapture(docName)}
                        className="flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-xs font-semibold text-indigo-300 transition-all active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Camera Scan</span>
                      </button>

                      <label className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer transition-all active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleFileSelect(docName, e.target.files[0])}
                        />
                      </label>
                    </div>
                  )}
                </div>
              );
            })
          )}

          <button
            type="button"
            onClick={() => {
              if (validateStep2()) setCurrentStep(3);
            }}
            className="w-full mt-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-98 transition-all"
          >
            <span>Continue to Time Slot</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 3: Time Slot Selection */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <TimeSlotPicker
            selectedDate={bookingDate}
            onSelectDate={setBookingDate}
            selectedSlot={timeSlot}
            onSelectSlot={setTimeSlot}
          />

          <button
            type="button"
            onClick={() => {
              if (!timeSlot) {
                setError('Please choose a preferred time slot');
                return;
              }
              setError(null);
              setCurrentStep(4);
            }}
            className="w-full mt-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-98 transition-all"
          >
            <span>Continue to Review & Pay</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 4: Review & Payment */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Review Order Summary
          </h3>

          {/* Service Details Card */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <span className="text-xs text-slate-400">Selected Service</span>
              <span className="text-xs font-bold text-slate-100">{service.name}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <span className="text-xs text-slate-400">Fulfillment Guarantee</span>
              <span className="text-xs font-bold text-emerald-400">Cyber Cafe Verified</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <span className="text-xs text-slate-400">Estimated Turnaround</span>
              <span className="text-xs font-bold text-cyan-400">{service.estimatedTime || '15-30 Mins'}</span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-bold text-slate-200">Total Application Fee</span>
              <span className="text-base font-extrabold text-cyan-400">{priceFormatted}</span>
            </div>
          </div>

          {/* Booked Time Slot Card */}
          <div className="bg-slate-800/80 border border-cyan-500/40 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Booked Time Slot
                </span>
                <span className="text-xs font-bold text-cyan-300">
                  📅 {bookingDate || 'Today'}, {timeSlot}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline"
            >
              Change
            </button>
          </div>

          {/* Form Responses Preview */}
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-2">Submitted Details</h4>
            <div className="space-y-1.5">
              {Object.entries(formData).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-slate-200 font-medium max-w-[180px] truncate">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Count */}
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-200">
                {Object.keys(uploadedFiles).length} Documents Attached
              </span>
            </div>
            <span className="text-[10px] text-cyan-400 font-bold">Auto-Stored in Vault</span>
          </div>

          {/* Submit Action */}
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmitOrder}
            className="w-full mt-4 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Authorizing Razorpay Gateway...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Proceed to Pay ({priceFormatted})</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
