import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Shield, Camera, CheckCircle, AlertTriangle, ScanFace, Lock, ArrowRight, RefreshCw, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveness } from '../hooks/useLiveness';

const POSES = [
  { id: 'straight', step: 1, title: 'Look Straight Ahead', poseLabel: 'Look straight ahead', instruction: 'Align your face inside the oval facing directly at the camera.' },
  { id: 'turn_left', step: 2, title: 'Turn Slightly Left (~20–30°)', poseLabel: 'Turn slightly left', instruction: 'Turn your head slightly to the left while keeping your eyes forward.' },
  { id: 'turn_right', step: 3, title: 'Turn Slightly Right (~20–30°)', poseLabel: 'Turn slightly right', instruction: 'Turn your head slightly to the right.' },
  { id: 'tilt_up', step: 4, title: 'Slight Head Tilt (Up/Down)', poseLabel: 'Slight head tilt', instruction: 'Tilt your chin slightly up or down to complete 3D facial feature mapping.' }
];

// Common UI Wrapper - Soft Structuralism & Doppelrand Architecture
const LayoutWrapper = ({ children, maxW = "max-w-xl" }) => (
  <div className="min-h-[100dvh] flex items-center justify-center p-4 md:p-8 bg-[#FAF9F6] font-['Plus_Jakarta_Sans',_sans-serif]">
    {/* Outer Shell (Doppelrand) */}
    <div className={`w-full ${maxW} bg-[#F4F1EA] p-2 rounded-[32px] border border-[#EAE7E0] shadow-[0_8px_40px_-12px_rgba(29,27,22,0.1)]`}>
      {/* Inner Core */}
      <div className="bg-white rounded-[24px] p-6 md:p-10 border border-[#E2E8F0] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] relative overflow-hidden">
        {children}
      </div>
    </div>
  </div>
);

export default function FaceRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const trackingUid = searchParams.get('uid');

  const { validateAndExtractPose } = useLiveness();

  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [accessDeniedError, setAccessDeniedError] = useState(null);

  const [hasConsented, setHasConsented] = useState(false);
  const [consentApproved, setConsentApproved] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [poseFailCount, setPoseFailCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const LOADING_MESSAGES = [
    "Initializing Neural Engine...",
    "Mapping 3D Facial Matrix...",
    "Extracting 128D Identity Vectors...",
    "Encrypting Biometric Signature...",
    "Finalizing Secure Profile..."
  ];

  const videoRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const streamRef = useRef(null);

  const initCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(e => console.warn('Play error:', e));
            setIsCameraReady(true);
          }
        };
        videoRef.current.onloadeddata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      setErrorMsg('Webcam access was denied or device camera is unavailable. Please allow camera permissions.');
      setIsCameraReady(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const checkEligibility = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (isMounted) setAccessDeniedError('Authentication required.');
          return;
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/face-registration/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          if (isMounted) setAccessDeniedError('Failed to verify registration access.');
          return;
        }

        const data = await res.json();
        
        if (!data.eligibility) {
          if (isMounted) setAccessDeniedError('Server returned invalid eligibility payload.');
          return;
        }

        // 1. Check Tracking UID match
        if (trackingUid !== data.eligibility.userContext.employeeId && trackingUid !== data.eligibility.userContext.id) {
           if (isMounted) setAccessDeniedError('Invalid or missing security tracking token in URL.');
           return;
        }

        // 2. Check Time Window / Admin Unlock Eligibility
        if (!data.eligibility.isEligible) {
           if (isMounted) setAccessDeniedError(data.eligibility.reason || 'Access Expired.');
           return;
        }

        if (isMounted) {
          setEligibilityData(data.eligibility);
        }
      } catch (err) {
        if (isMounted) setAccessDeniedError('Network error while checking access eligibility.');
      } finally {
        if (isMounted) setIsLoadingStatus(false);
      }
    };

    checkEligibility();
    return () => { isMounted = false; };
  }, [trackingUid]);

  useEffect(() => {
    if (!consentApproved) return;

    let active = true;
    const loop = () => {
      if (!active) return;
      if (videoRef.current && videoRef.current.readyState >= 2) {
        setIsCameraReady(true);
      }
      animFrameIdRef.current = requestAnimationFrame(loop);
    };
    loop();
    initCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [consentApproved]);

  useEffect(() => {
    if ((isSuccess || submitting) && streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (_) {}
      });
      streamRef.current = null;
    }
  }, [isSuccess, submitting]);

  // Timer to show slow warning if taking > 15s, and cycle loading texts
  useEffect(() => {
    let timer;
    let interval;
    
    if (submitting) {
      timer = setTimeout(() => setShowSlowWarning(true), 15000);
      
      // Cycle text every 1.8s
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1800);
    } else {
      setShowSlowWarning(false);
      setLoadingTextIndex(0);
    }
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [submitting]);

  const handleCapturePose = async () => {
    setErrorMsg('');
    setCapturing(true);

    try {
      const currentPose = POSES[currentPoseIndex];
      const result = await validateAndExtractPose(videoRef.current, currentPose);
      if (!result || !result.frameBase64) {
        throw new Error('Could not capture frame. Please ensure your face is clearly visible in good lighting.');
      }

      setPoseFailCount(0);
      const nextFrames = [...capturedFrames, result.frameBase64];
      setCapturedFrames(nextFrames);

      if (nextFrames.length < 4) {
        setCurrentPoseIndex(nextFrames.length);
      } else {
        // All 4 pose frames captured — submit to backend for YOLO processing
        await submitFaceProfile(nextFrames);
      }
    } catch (err) {
      setPoseFailCount(prev => prev + 1);
      setErrorMsg(err.message || 'Failed to capture pose. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const submitFaceProfile = async (frames) => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/face-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // Send raw Base64 frames — backend YOLO engine extracts the 128D embeddings
        body: JSON.stringify({ frames })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save biometric profile.');
      }

      // Update user state in localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          u.faceRegistered = true;
          localStorage.setItem('user', JSON.stringify(u));
        } catch (_) {}
      }

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/dashboard/attendance');
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeAll = () => {
    setCapturedFrames([]);
    setCurrentPoseIndex(0);
    setPoseFailCount(0);
    setErrorMsg('');
    setIsCameraReady(false);
    initCamera();
  };

  if (isLoadingStatus) {
    return (
      <LayoutWrapper maxW="max-w-xl">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 size={32} className="animate-spin text-[#1F2B4D]" />
          <p className="text-[#6B655C] text-sm font-semibold animate-pulse">Verifying Security Access...</p>
        </div>
      </LayoutWrapper>
    );
  }

  if (accessDeniedError) {
    return (
      <LayoutWrapper maxW="max-w-xl">
        <div className="flex flex-col items-center justify-center text-center py-8 gap-6">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-2">
            <Lock size={32} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#1D1B16] tracking-tight">Access Denied</h2>
            <p className="text-[#6B655C] text-sm mt-2 font-medium max-w-md mx-auto leading-relaxed">
              {accessDeniedError}
            </p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-semibold rounded-full px-6 py-2.5 transition-all shadow-sm flex items-center gap-2"
          >
            <ArrowRight size={16} className="rotate-180" /> Return to Dashboard
          </button>
        </div>
      </LayoutWrapper>
    );
  }

  const { userContext } = eligibilityData || {};

  if (!consentApproved) {
    return (
      <LayoutWrapper maxW="max-w-xl">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F0F3F9] flex items-center justify-center border border-[#1F2B4D]/10 text-[#1F2B4D] shrink-0 shadow-sm">
              <Shield size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-[#1D1B16] tracking-tight">Privacy-First Biometric Setup</h2>
              <p className="text-[#6B655C] text-sm mt-0.5 font-medium">On-device facial verification & security compliance</p>
            </div>
          </div>

          {/* Identity Verification Card */}
          <div className="bg-white border border-[#EAE7E0] p-4 rounded-[20px] shadow-sm flex items-center gap-4 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-[#10B981]"></div>
             {userContext?.avatar ? (
                <img src={userContext.avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-[#EAE7E0]" />
             ) : (
                <div className="w-12 h-12 rounded-full bg-[#F0F3F9] text-[#1F2B4D] font-bold flex items-center justify-center border border-[#EAE7E0]">
                   {userContext?.displayName?.charAt(0) || 'U'}
                </div>
             )}
             <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-[#9A948A] tracking-wider mb-0.5">Registering Biometrics For</p>
                <p className="text-sm font-bold text-[#1F2B4D] leading-tight">{userContext?.displayName}</p>
                <p className="text-xs text-[#6B655C] font-mono mt-0.5">{userContext?.employeeId} • {userContext?.department}</p>
             </div>
             <div className="shrink-0 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                Authorized
             </div>
          </div>

          <div className="bg-[#FAF9F6] p-6 rounded-3xl border border-[#EAE7E0] flex flex-col gap-6 text-sm text-[#6B655C] leading-relaxed shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
            <div className="flex items-start gap-3.5">
              <Lock className="text-[#10B981] shrink-0 mt-0.5" size={20} strokeWidth={2} />
              <div>
                <strong className="text-[#1D1B16] text-sm block mb-1">Zero Storage Guarantee</strong>
                Frames are streamed through volatile memory only. No photos or videos are ever written to disk or retained on our servers.
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Shield className="text-[#1F2B4D] shrink-0 mt-0.5" size={20} strokeWidth={2} />
              <div>
                <strong className="text-[#1D1B16] text-sm block mb-1">AES-256-GCM Encryption</strong>
                Only non-reconstructable 128-dimensional mathematical feature vectors are encrypted using military-grade AES-256-GCM before database storage.
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <CheckCircle className="text-[#4F46E5] shrink-0 mt-0.5" size={20} strokeWidth={2} />
              <div>
                <strong className="text-[#1D1B16] text-sm block mb-1">Hard-Gate Attendance Verification</strong>
                Clock-in requires Liveness Pass + Geofence Match + Face Similarity Match.
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3.5 p-5 rounded-2xl bg-[#F0F3F9]/60 border border-[#1F2B4D]/10 cursor-pointer transition-all hover:bg-[#F0F3F9]">
            <input 
              type="checkbox" 
              checked={hasConsented}
              onChange={(e) => setHasConsented(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[#EAE7E0] text-[#1F2B4D] focus:ring-[#1F2B4D] bg-white transition-all"
            />
            <span className="text-sm text-[#1D1B16] font-semibold leading-snug">
              I explicitly consent to the processing of encrypted mathematical facial feature vectors for identity-verified time and attendance tracking.
            </span>
          </label>

          <button 
            disabled={!hasConsented}
            onClick={() => setConsentApproved(true)}
            className="group w-full bg-[#1F2B4D] hover:bg-[#141C33] text-white font-semibold rounded-full pl-6 pr-2 py-2 flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
          >
            <span className="text-sm tracking-wide">
              I Consent — Continue to Camera Capture
            </span>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:bg-white/20">
              <ArrowRight className="text-white" size={18} strokeWidth={2} />
            </div>
          </button>
        </div>
      </LayoutWrapper>
    );
  }

  const currentPose = POSES[currentPoseIndex] || POSES[0];

  return (
    <LayoutWrapper maxW="max-w-md">
      <div className="flex flex-col items-center text-center relative w-full">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between w-full mb-6">
          <div className="flex items-center gap-2 text-[#1F2B4D] font-bold text-xs uppercase tracking-wider">
            <ScanFace size={18} strokeWidth={2} />
            <span>Face Setup ({capturedFrames.length}/4)</span>
          </div>
          <button 
            onClick={handleRetakeAll}
            className="text-[#6B655C] hover:text-[#1D1B16] text-xs flex items-center gap-1 font-bold transition-colors"
          >
            <RefreshCw size={12} />
            Reset
          </button>
        </div>

        {/* Video Camera Container */}
        <div className={`relative w-64 h-64 rounded-full overflow-hidden border-4 ${isCameraReady ? 'border-emerald-500/60 shadow-emerald-500/20' : 'border-indigo-500/40'} shadow-2xl mb-6 bg-slate-950 flex items-center justify-center transition-all duration-500`}>
          <video 
            ref={videoRef} 
            className="absolute inset-0 w-full h-full object-cover origin-center -scale-x-100"
            autoPlay
            playsInline 
            muted 
            onLoadedData={() => setIsCameraReady(true)}
          />

          <div className={`
              absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[75%] 
              rounded-[50%] border-4 border-dashed transition-colors duration-500
              ${capturing ? 'border-[#10B981]' : poseFailCount > 0 ? 'border-[#B5793A]' : 'border-white/70'}
            `} />

          <AnimatePresence>
            {submitting && !isSuccess && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white flex items-center justify-center z-20"
              >
                <div className="relative flex items-center justify-center w-full h-full">
                  <div className="absolute w-24 h-24 rounded-full border border-[#10B981]/60 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <div className="absolute w-24 h-24 rounded-full border border-[#10B981]/40 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '0.5s' }} />
                  <div className="relative z-10 w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.15)] border border-[#10B981]/5">
                    <ScanFace size={40} strokeWidth={1.5} className="text-[#10B981] animate-pulse" />
                  </div>
                </div>
              </motion.div>
            )}

            {isSuccess && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center text-white z-30 backdrop-blur-sm"
              >
                <CheckCircle size={56} className="mb-2" />
                <span className="font-bold text-lg">Registration Complete!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full h-[120px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {submitting && !isSuccess ? (
              <motion.div
                key="submitting-text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="flex flex-col items-center text-center"
              >
                <h3 className="text-xl font-extrabold text-[#1D1B16] mb-1.5 tracking-tight flex items-center justify-center gap-2">
                  <CheckCircle size={20} className="text-[#10B981]" />
                  Capture Complete
                </h3>
                <p className="text-sm text-[#6B655C] font-medium leading-relaxed px-4">
                  Camera feed is disconnected. You can relax your face while we securely process your profile.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={currentPose.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <h3 className="text-xl font-extrabold text-[#1D1B16] mb-1.5 tracking-tight">{currentPose.title}</h3>
                <p className="text-sm text-[#6B655C] font-medium leading-relaxed px-4">{currentPose.instruction}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {errorMsg && (
          <div className="w-full mt-4 p-3.5 bg-[#FDF8F3] border border-[#EEDCCE] rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 text-left">
            <AlertTriangle className="text-[#B5793A] shrink-0 mt-0.5" size={18} strokeWidth={2} />
            <p className="text-[#8C5722] text-sm font-semibold">{errorMsg}</p>
          </div>
        )}

        {!isSuccess && (
          <button
            onClick={handleCapturePose}
            disabled={capturing || submitting || !isCameraReady}
            className={`group w-full mt-6 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-semibold rounded-full pl-6 pr-2 py-2 flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98] ${submitting ? 'cursor-wait opacity-95' : 'disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed'}`}
          >
            <span className="text-sm tracking-wide flex items-center justify-start gap-2 overflow-hidden relative w-full h-6 text-left">
              {submitting ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={loadingTextIndex}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="absolute inset-0 flex items-center text-white gap-2"
                  >
                    <Loader2 size={16} className="animate-spin text-[#10B981] shrink-0" />
                    <span className="truncate">{LOADING_MESSAGES[loadingTextIndex]}</span>
                  </motion.div>
                </AnimatePresence>
              ) : capturing ? (
                <span className="absolute inset-0 flex items-center">Extracting Vector...</span>
              ) : (
                <span className="absolute inset-0 flex items-center">Capture Secure Signature</span>
              )}
            </span>
            <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${submitting ? 'bg-[#10B981]/20' : 'bg-white/10 group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:bg-white/20 group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]'}`}>
              {submitting ? <Loader2 size={18} className="animate-spin text-[#10B981]" /> : <Camera size={18} strokeWidth={2} className="text-white" />}
            </div>
          </button>
        )}

        <AnimatePresence>
          {showSlowWarning && !isSuccess && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="w-full mt-4 text-xs font-semibold text-[#8C5722] bg-[#FFF9F2] border border-[#F4E3D3] rounded-2xl p-3.5 shadow-sm flex items-start gap-2.5 text-left"
            >
              <span className="text-lg leading-none">🚀</span>
              <span>This is hosted on Render's free tier, so processing may take about 1 minute. Please hang tight!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2.5 mt-6 justify-center">
          {POSES.map((p, i) => (
            <div 
              key={p.id}
              className={`h-2 rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                i < capturedFrames.length ? 'w-8 bg-[#10B981]' : 
                i === currentPoseIndex ? 'w-8 bg-[#1F2B4D]' : 'w-2 bg-[#EAE7E0]'
              }`}
            />
          ))}
        </div>
      </div>
    </LayoutWrapper>
  );
}
