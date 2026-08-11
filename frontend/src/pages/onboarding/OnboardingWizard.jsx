import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, UploadCloud, AlertCircle, Loader2, Camera, ShieldCheck, ChevronRight, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

const OnboardingWizard = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [currentStep, setCurrentStep] = useState('personal_details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Form states
  const [personalDetails, setPersonalDetails] = useState({
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
    gender: user.gender || '',
    maritalStatus: user.maritalStatus || '',
    residingAddress: user.residingAddress || '',
    phone: user.phone || ''
  });

  const [emergencyContact, setEmergencyContact] = useState({
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: ''
  });

  const [financialDetails, setFinancialDetails] = useState({
    bankName: user.bankName || '',
    bankBranch: user.bankBranch || '',
    accountNumber: '', 
    ifscCode: user.ifscCode || ''
  });

  const [statutoryDetails, setStatutoryDetails] = useState({
    panNo: user.panNo || '',
    aadharLast4: user.aadharLast4 || ''
  });

  const [documents, setDocuments] = useState({
    panDoc: null,
    aadharDoc: null
  });

  const stepOrder = ['personal_details', 'emergency_contact', 'financial_details', 'statutory_details', 'face_registration', 'completed'];
  
  useEffect(() => {
    if (user.onboardingCompleted) {
      navigate('/dashboard');
    } else if (user.onboardingStep) {
      setCurrentStep(user.onboardingStep);
    }
  }, [user, navigate]);

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = localStorage.getItem('token');

  const handleNext = async (stepName, payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/onboarding/wizard-step`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ step: stepName, data: payload })
      });
      
      const data = await res.json();
      if (!res.ok) {
        let errMsg = data.error;
        if (Array.isArray(errMsg)) {
          errMsg = errMsg.map(e => e.message).join(', ');
        } else if (typeof errMsg === 'object' && errMsg !== null) {
          errMsg = JSON.stringify(errMsg);
        }
        throw new Error(errMsg || 'Failed to save step');
      }
      
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      if (data.onboardingCompleted) {
        navigate('/dashboard');
      } else {
        setCurrentStep(data.onboardingStep);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (type, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch(`${apiBase}/api/onboarding/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data.document;
    } catch (err) {
      setError(`Failed to upload ${type}: ${err.message}`);
      throw err;
    }
  };

  const submitStatutory = async () => {
    setLoading(true);
    setError(null);

    if (statutoryDetails.panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(statutoryDetails.panNo)) {
      setError("Invalid PAN format (expected format: ABCDE1234F)");
      setLoading(false);
      return;
    }
    if (statutoryDetails.aadharLast4 && !/^[0-9]{4}$/.test(statutoryDetails.aadharLast4)) {
      setError("Aadhaar must be exactly 4 digits");
      setLoading(false);
      return;
    }

    try {
      if (documents.panDoc) await handleFileUpload('PAN', documents.panDoc);
      if (documents.aadharDoc) await handleFileUpload('AADHAAR', documents.aadharDoc);
      
      await handleNext('statutory_details', statutoryDetails);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStep === 'face_registration') {
      const initCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setIsCameraReady(true);
          }
        } catch (err) {
          setError("Failed to access camera. Please allow camera permissions to continue.");
        }
      };
      initCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setIsCameraReady(false);
      }
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentStep]);

  const submitFaceRegistration = async () => {
    // Kept for manual fallback if needed, but the effect below handles automation.
    if (!videoRef.current || !isCameraReady) return;
    setLoading(true);
    setError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.9);
      
      await handleNext('face_registration', { image_base64: base64Image });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Auto-capture face loop
  useEffect(() => {
    let isCancelled = false;
    let isProcessing = false;

    if (currentStep === 'face_registration' && isCameraReady) {
      
      const capture = async () => {
        if (isCancelled || isProcessing || !videoRef.current) return;
        isProcessing = true;
        
        try {
          setIsCapturing(true);
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth || 640;
          canvas.height = videoRef.current.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const base64Image = canvas.toDataURL('image/jpeg', 0.8);
          
          const res = await fetch(`${apiBase}/api/onboarding/wizard-step`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ step: 'face_registration', data: { image_base64: base64Image } })
          });
          
          const data = await res.json();
          if (!res.ok) {
            let errMsg = data.error;
            if (Array.isArray(errMsg)) errMsg = errMsg.map(e => e.message).join(', ');
            else if (typeof errMsg === 'object' && errMsg !== null) errMsg = JSON.stringify(errMsg);
            
            if (errMsg === 'NO_FACE_DETECTED' || errMsg === 'SPOOF_DETECTED') {
               // Just silently retry
            } else {
               setError(errMsg || 'Failed to capture face');
            }
            setIsCapturing(false);
            isProcessing = false;
            if (!isCancelled) setTimeout(capture, 300);
            return;
          }
          
          // Success!
          localStorage.setItem('user', JSON.stringify(data));
          setUser(data);
          if (data.onboardingCompleted) {
            navigate('/dashboard');
          } else {
            setCurrentStep(data.onboardingStep);
          }
          return; // don't loop anymore
        } catch (err) {
          console.error(err);
        }
        
        isProcessing = false;
        if (!isCancelled) setTimeout(capture, 300);
      };

      capture();
    }
    
    return () => {
      isCancelled = true;
    };
  }, [currentStep, isCameraReady, apiBase, token, navigate]);

  const currentIdx = stepOrder.indexOf(currentStep);

  // Input styles according to the design system
  const inputClass = "w-full bg-[#FAF8F5] border border-[#EAE7E0] text-[#1F2B4D] font-medium rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm placeholder:text-[#6B655C]/60 outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all shadow-2xs";
  const labelClass = "block text-[10px] sm:text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5 ml-0.5";
  const sectionTitleClass = "text-lg sm:text-xl font-serif font-bold text-[#1F2B4D] tracking-tight mb-4 sm:mb-6";

  return (
    <div className="w-full min-h-screen flex flex-col items-center py-4 sm:py-8 md:py-10 px-3 sm:px-6 bg-[#FAF9F6] font-sans text-[#1D1B16] overflow-x-hidden">
      <div className="max-w-xl sm:max-w-2xl w-full flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8 w-full px-2">
          <div className="w-10 sm:w-12 h-10 sm:h-12 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex items-center justify-center mx-auto mb-3 sm:mb-4 transform -rotate-3 hover:rotate-0 transition-transform duration-300 shrink-0">
            <ShieldCheck className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-[#1F2B4D] tracking-tight">
            Complete Your Profile
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#6B655C] font-medium leading-relaxed max-w-md mx-auto">
            Almost there! We just need a few details to get your workspace ready.
          </p>
        </div>

        {/* Responsive Minimal Progress Bar */}
        <div className="w-full max-w-md sm:max-w-xl mx-auto mb-5 sm:mb-8 px-2 sm:px-4">
          <div className="flex items-center justify-between relative w-full">
            <div className="absolute left-4 right-4 top-3.5 sm:top-4 h-[2px] bg-[#EAE7E0] -z-10 -translate-y-1/2 rounded-full"></div>
            {['Personal', 'Emergency', 'Financial', 'Statutory', 'Face ID'].map((label, i) => {
              const isActive = i === currentIdx;
              const isDone = i < currentIdx;
              return (
                <div key={label} className="flex flex-col items-center gap-1 bg-[#FAF9F6] px-1 shrink-0">
                  <div className={`w-7 sm:w-8 h-7 sm:h-8 rounded-full flex items-center justify-center font-display font-bold text-[10px] sm:text-xs transition-all duration-300 ${
                    isDone ? 'bg-[#1F2B4D] text-white shadow-2xs' : 
                    isActive ? 'bg-white border-2 border-[#1F2B4D] text-[#1F2B4D] scale-110 shadow-2xs' : 'bg-white border border-[#EAE7E0] text-[#9A948A]'
                  }`}>
                    {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                  </div>
                  <span className={`hidden min-[480px]:block text-[8.5px] min-[550px]:text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-wider transition-colors text-center ${isActive || isDone ? 'text-[#1F2B4D]' : 'text-[#9A948A]'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Active Step Badge for Mobile Screens (< 480px) */}
          <div className="min-[480px]:hidden mt-2.5 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#EAE7E0] text-[10px] font-display font-bold text-[#1F2B4D] uppercase tracking-wider shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F2B4D]"></span>
              Step {currentIdx + 1} of 5: {['Personal', 'Emergency', 'Financial', 'Statutory', 'Face ID'][currentIdx] || 'Complete'}
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl sm:rounded-[24px] p-3.5 sm:p-8 lg:p-10 border border-[#EAE7E0] shadow-2xs w-full max-w-full overflow-hidden">
          {error && (
            <div className="mb-5 sm:mb-8 p-3.5 sm:p-4 bg-[#FFF5F5] border border-[#FFE2E2] text-[#D93025] rounded-xl sm:rounded-2xl flex items-start gap-2.5 sm:gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {currentStep === 'personal_details' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
              <h3 className={sectionTitleClass}>Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3.5 sm:gap-y-5 w-full">
                <div className="w-full">
                  <label className={labelClass}>Date of Birth</label>
                  <input type="date" className={`${inputClass} max-w-full`} 
                    value={personalDetails.dateOfBirth} onChange={e => setPersonalDetails({...personalDetails, dateOfBirth: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Gender</label>
                  <div className="relative">
                    <select className={`${inputClass} appearance-none pr-9 cursor-pointer`}
                      value={personalDetails.gender} onChange={e => setPersonalDetails({...personalDetails, gender: e.target.value})}>
                      <option value="" className="bg-white text-[#1F2B4D]">Select gender...</option>
                      <option value="Male" className="bg-white text-[#1F2B4D]">Male</option>
                      <option value="Female" className="bg-white text-[#1F2B4D]">Female</option>
                      <option value="Other" className="bg-white text-[#1F2B4D]">Other</option>
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B655C] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Marital Status</label>
                  <div className="relative">
                    <select className={`${inputClass} appearance-none pr-9 cursor-pointer`}
                      value={personalDetails.maritalStatus} onChange={e => setPersonalDetails({...personalDetails, maritalStatus: e.target.value})}>
                      <option value="" className="bg-white text-[#1F2B4D]">Select status...</option>
                      <option value="Single" className="bg-white text-[#1F2B4D]">Single</option>
                      <option value="Married" className="bg-white text-[#1F2B4D]">Married</option>
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B655C] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="tel" className={inputClass} placeholder="+1 (555) 000-0000"
                    value={personalDetails.phone} onChange={e => setPersonalDetails({...personalDetails, phone: e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Residing Address</label>
                  <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Enter your full residential address..."
                    value={personalDetails.residingAddress} onChange={e => setPersonalDetails({...personalDetails, residingAddress: e.target.value})} />
                </div>
              </div>
              
              <StepButton onClick={() => handleNext('personal_details', personalDetails)} loading={loading} />
            </div>
          )}

          {currentStep === 'emergency_contact' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className={sectionTitleClass}>Emergency Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3.5 sm:gap-y-5">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Contact Name</label>
                  <input type="text" className={inputClass} placeholder="Full name of emergency contact"
                    value={emergencyContact.emergencyContactName} onChange={e => setEmergencyContact({...emergencyContact, emergencyContactName: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Relation</label>
                  <input type="text" className={inputClass} placeholder="e.g. Spouse, Parent"
                    value={emergencyContact.emergencyContactRelation} onChange={e => setEmergencyContact({...emergencyContact, emergencyContactRelation: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="tel" className={inputClass} placeholder="+1 (555) 000-0000"
                    value={emergencyContact.emergencyContactPhone} onChange={e => setEmergencyContact({...emergencyContact, emergencyContactPhone: e.target.value})} />
                </div>
              </div>
              
              <StepButton onClick={() => handleNext('emergency_contact', emergencyContact)} loading={loading} />
            </div>
          )}

          {currentStep === 'financial_details' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className={sectionTitleClass}>Financial Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3.5 sm:gap-y-5">
                <div>
                  <label className={labelClass}>Bank Name</label>
                  <input type="text" className={inputClass} placeholder="e.g. HDFC Bank"
                    value={financialDetails.bankName} onChange={e => setFinancialDetails({...financialDetails, bankName: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Bank Branch</label>
                  <input type="text" className={inputClass} placeholder="e.g. Koramangala"
                    value={financialDetails.bankBranch} onChange={e => setFinancialDetails({...financialDetails, bankBranch: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Account Number</label>
                  <input type="password" placeholder="••••••••" className={inputClass}
                    value={financialDetails.accountNumber} onChange={e => setFinancialDetails({...financialDetails, accountNumber: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>IFSC Code</label>
                  <input type="text" className={`${inputClass} uppercase`} placeholder="HDFC0001234"
                    value={financialDetails.ifscCode} onChange={e => setFinancialDetails({...financialDetails, ifscCode: e.target.value.toUpperCase()})} />
                </div>
              </div>
              
              <StepButton onClick={() => handleNext('financial_details', financialDetails)} loading={loading} />
            </div>
          )}

          {currentStep === 'statutory_details' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className={sectionTitleClass}>Statutory Uploads</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className={labelClass}>PAN Number</label>
                    <input type="text" className={`${inputClass} uppercase`} placeholder="ABCDE1234F"
                      value={statutoryDetails.panNo} onChange={e => setStatutoryDetails({...statutoryDetails, panNo: e.target.value.toUpperCase()})} />
                  </div>
                  <div>
                    <label className={labelClass}>Upload PAN Card Image</label>
                    <div className="relative group overflow-hidden border border-dashed border-[#CFCAC2] rounded-xl sm:rounded-2xl bg-[#FAF9F6] hover:bg-[#FDF8F3] hover:border-[#1F2B4D]/30 transition-colors">
                      <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" id="panUpload" accept="image/*" onChange={e => setDocuments({...documents, panDoc: e.target.files[0]})} />
                      <div className="p-4 sm:p-6 flex flex-col items-center justify-center text-center pointer-events-none">
                        <UploadCloud size={22} className="text-[#9A948A] mb-2 sm:mb-3 group-hover:text-[#1F2B4D] group-hover:-translate-y-1 transition-all duration-500" strokeWidth={1.5} />
                        <span className="text-xs sm:text-sm text-[#1D1B16] font-medium truncate w-full px-2">{documents.panDoc ? documents.panDoc.name : 'Click to select file'}</span>
                        <span className="text-[10px] sm:text-xs text-[#9A948A] mt-1">Max size: 5MB</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className={labelClass}>Aadhaar (Last 4 digits only)</label>
                    <input type="text" maxLength={4} className={inputClass} placeholder="1234"
                      value={statutoryDetails.aadharLast4} onChange={e => setStatutoryDetails({...statutoryDetails, aadharLast4: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>Upload Aadhaar Card Image</label>
                    <div className="relative group overflow-hidden border border-dashed border-[#CFCAC2] rounded-xl sm:rounded-2xl bg-[#FAF9F6] hover:bg-[#FDF8F3] hover:border-[#1F2B4D]/30 transition-colors">
                      <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" id="aadharUpload" accept="image/*" onChange={e => setDocuments({...documents, aadharDoc: e.target.files[0]})} />
                      <div className="p-4 sm:p-6 flex flex-col items-center justify-center text-center pointer-events-none">
                        <UploadCloud size={22} className="text-[#9A948A] mb-2 sm:mb-3 group-hover:text-[#1F2B4D] group-hover:-translate-y-1 transition-all duration-500" strokeWidth={1.5} />
                        <span className="text-xs sm:text-sm text-[#1D1B16] font-medium truncate w-full px-2">{documents.aadharDoc ? documents.aadharDoc.name : 'Click to select file'}</span>
                        <span className="text-[10px] sm:text-xs text-[#9A948A] mt-1">Max size: 5MB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#F4F1EA] border border-[#EAE7E0] text-[#6B655C] p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm flex gap-2.5 sm:gap-3 items-start mt-4 sm:mt-6">
                <AlertCircle size={18} strokeWidth={1.5} className="shrink-0 text-[#B5793A] mt-0.5" />
                <p className="leading-relaxed">Documents uploaded are strictly encrypted and stored privately. They are only accessible by authorized HR personnel.</p>
              </div>

              <StepButton onClick={submitStatutory} loading={loading} />
            </div>
          )}

          {currentStep === 'face_registration' && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className={sectionTitleClass}>Facial Recognition Setup</h3>
              
              <div className="text-center space-y-4 sm:space-y-6">
                <p className="text-xs sm:text-sm text-[#6B655C] leading-relaxed max-w-md mx-auto">
                  Secure your account using biometric verification. Please look directly at the camera in a well-lit environment.
                </p>
                
                <div className="mx-auto w-44 h-44 sm:w-56 sm:h-56 bg-[#FAF9F6] rounded-full border-4 sm:border-[6px] border-[#EAE7E0] flex items-center justify-center overflow-hidden relative shadow-inner">
                   {!isCameraReady && <Camera size={28} className="text-[#CFCAC2] animate-pulse" strokeWidth={1.5} />}
                   <video 
                     ref={videoRef} 
                     autoPlay 
                     playsInline 
                     muted 
                     className={`w-full h-full object-cover scale-x-[-1] ${isCameraReady ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000 ease-out scale-[1.05]`}
                   />
                   
                   {/* HUD overlay */}
                   {isCameraReady && (
                     <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden border-[2px] border-[#1F2B4D]/10 shadow-[inset_0_0_0_4px_rgba(31,43,77,0.1)]">
                       <div className="absolute top-[15%] left-[25%] w-[50%] h-[70%] border border-[#1F2B4D]/30 border-dashed rounded-[40px] opacity-70"></div>
                       <motion.div 
                         className="absolute left-0 right-0 h-[2px] bg-[#1F2B4D] shadow-[0_0_8px_#1F2B4D]"
                         animate={{ top: ['0%', '100%', '0%'] }}
                         transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
                       />
                     </div>
                   )}
                </div>
              </div>

              <div className="bg-[#F4F1EA] border border-[#EAE7E0] text-[#6B655C] p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm flex gap-2.5 sm:gap-3 items-start mt-4 sm:mt-6">
                <AlertCircle size={18} strokeWidth={1.5} className="shrink-0 text-[#B5793A] mt-0.5" />
                <p className="leading-relaxed">Your biometric data is mathematically encrypted into secure vectors and safely stored in compliance with enterprise privacy guidelines.</p>
              </div>

              <div className="mt-6 sm:mt-8 flex items-center justify-center p-3.5 sm:p-4 bg-[#F8F9FC] rounded-xl sm:rounded-2xl border border-[#EAE7E0]">
                <Loader2 className={`text-[#1F2B4D] mr-2.5 sm:mr-3 ${isCapturing ? 'animate-spin' : 'animate-pulse'}`} size={20} strokeWidth={2} />
                <span className="text-[#1F2B4D] font-semibold text-xs sm:text-sm">
                  {!isCameraReady ? 'Waiting for Camera...' : (isCapturing ? 'Analyzing Face...' : 'Scanning for Face...')}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Reusable Next Button Component
const StepButton = ({ onClick, loading, label = "Next Step", icon = <ArrowRight size={18} strokeWidth={2} /> }) => (
  <button
    type="button"
    disabled={loading}
    onClick={onClick}
    className="group w-full mt-6 sm:mt-8 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-semibold rounded-full pl-5 sm:pl-6 pr-1.5 sm:pr-2 py-1.5 sm:py-2 flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 shadow-2xs"
  >
    <span className="text-xs sm:text-sm tracking-wide font-display font-bold uppercase">
      {loading ? 'Processing...' : label}
    </span>
    <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1 group-hover:bg-white/20 shrink-0">
      {loading ? (
        <Loader2 className="animate-spin text-white" size={16} strokeWidth={2} />
      ) : (
        <div className="text-white">{icon}</div>
      )}
    </div>
  </button>
);

export default OnboardingWizard;
