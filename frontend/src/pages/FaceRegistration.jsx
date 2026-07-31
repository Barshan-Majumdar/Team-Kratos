import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function FaceRegistration() {
  const navigate = useNavigate();
  const { validateAndExtractPose } = useLiveness();

  const [hasConsented, setHasConsented] = useState(false);
  const [consentApproved, setConsentApproved] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [capturedEmbeddings, setCapturedEmbeddings] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [poseFailCount, setPoseFailCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const videoRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!consentApproved) return;

    let active = true;
    async function initCamera() {
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

        const loop = () => {
          if (!active) return;
          if (videoRef.current && videoRef.current.readyState >= 2) {
            setIsCameraReady(true);
          }
          animFrameIdRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch (err) {
        setErrorMsg('Webcam access was denied or device camera is unavailable. Please allow camera permissions.');
      }
    }

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
    if (isSuccess && streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (_) {}
      });
      streamRef.current = null;
    }
  }, [isSuccess]);

  const handleCapturePose = async () => {
    setErrorMsg('');
    setCapturing(true);

    try {
      const currentPose = POSES[currentPoseIndex];
      const result = await validateAndExtractPose(videoRef.current, currentPose);
      if (!result || !result.rawEmbedding || result.rawEmbedding.length !== 128) {
        throw new Error('Could not extract high-quality face embedding. Please position your face clearly in light.');
      }

      setPoseFailCount(0);
      const nextEmbeddings = [...capturedEmbeddings, result.rawEmbedding];
      setCapturedEmbeddings(nextEmbeddings);

      if (nextEmbeddings.length < 4) {
        setCurrentPoseIndex(nextEmbeddings.length);
      } else {
        // All 4 poses captured -> Submit to backend
        await submitFaceProfile(nextEmbeddings);
      }
    } catch (err) {
      setPoseFailCount(prev => prev + 1);
      setErrorMsg(err.message || 'Failed to capture pose. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const submitFaceProfile = async (embeddings) => {
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
        body: JSON.stringify({ embeddings })
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
    setCapturedEmbeddings([]);
    setCurrentPoseIndex(0);
    setPoseFailCount(0);
    setErrorMsg('');
  };

  if (!consentApproved) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-xl w-full p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Shield size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Privacy-First Biometric Registration</h2>
              <p className="text-slate-500 text-sm mt-0.5">On-device facial verification & security compliance</p>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-4 text-xs text-slate-600 leading-relaxed">
            <div className="flex items-start gap-3">
              <Lock className="text-emerald-500 shrink-0 mt-0.5" size={18} />
              <div>
                <strong className="text-slate-800 text-sm block mb-0.5">Zero Raw Image Storage Guarantee</strong>
                Your camera frames are processed 100% inside your browser. No photos, videos, or image files are ever uploaded or saved on any server.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="text-indigo-500 shrink-0 mt-0.5" size={18} />
              <div>
                <strong className="text-slate-800 text-sm block mb-0.5">AES-256-GCM Encryption</strong>
                Only non-reconstructable 128-dimensional mathematical feature vectors are encrypted using military-grade AES-256-GCM before database storage.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <div>
                <strong className="text-slate-800 text-sm block mb-0.5">Hard-Gate Attendance Verification</strong>
                Clock-in requires Liveness Pass + Geofence Match + Face Similarity Match.
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 cursor-pointer transition-all hover:bg-indigo-50">
            <input 
              type="checkbox" 
              checked={hasConsented}
              onChange={(e) => setHasConsented(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-700 font-medium">
              I explicitly consent to the processing of encrypted mathematical facial feature vectors for identity-verified time and attendance tracking.
            </span>
          </label>

          <Button 
            disabled={!hasConsented}
            onClick={() => setConsentApproved(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-base transition-all disabled:opacity-40"
          >
            I Consent — Continue to Camera Capture
            <ArrowRight size={18} />
          </Button>
        </Card>
      </div>
    );
  }

  const currentPose = POSES[currentPoseIndex] || POSES[0];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 bg-slate-900 text-white rounded-[28px] border border-slate-800 flex flex-col items-center text-center shadow-2xl relative">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between w-full mb-6">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <ScanFace size={18} />
            <span>Face Profile Setup ({capturedEmbeddings.length}/4)</span>
          </div>
          <button 
            onClick={handleRetakeAll}
            className="text-slate-400 hover:text-white text-xs flex items-center gap-1 font-semibold transition-colors"
          >
            <RefreshCw size={12} />
            Reset
          </button>
        </div>

        {/* Video Camera Container */}
        <div className={`relative w-64 h-64 rounded-full overflow-hidden border-4 ${isCameraReady ? 'border-emerald-500/60 shadow-emerald-500/20' : 'border-indigo-500/40'} shadow-2xl mb-6 bg-slate-950 flex items-center justify-center transition-all duration-500`}>
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedData={() => setIsCameraReady(true)}
            className="w-full h-full object-cover scale-x-[-1]"
          />
          
          {/* Camera Initializing / Permission Overlay */}
          {!isCameraReady && !isSuccess && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-4 z-10">
              <Loader2 className="animate-spin text-indigo-400 mb-2" size={32} />
              <span className="text-xs font-semibold text-slate-200">Initializing Camera Feed...</span>
              <span className="text-[10px] text-slate-400 mt-1">Please allow camera permissions if prompted by your browser</span>
            </div>
          )}

          {/* Guide Overlay */}
          <div className="absolute inset-0 border-[16px] border-slate-950/40 pointer-events-none rounded-full"></div>
          <div className={`absolute inset-4 border ${isCameraReady ? 'border-emerald-400/50' : 'border-indigo-400/30'} rounded-full border-dashed animate-[spin_30s_linear_infinite] pointer-events-none`}></div>

          {/* Success Animation Overlay */}
          <AnimatePresence>
            {isSuccess && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center text-white"
              >
                <CheckCircle size={56} className="mb-2" />
                <span className="font-bold text-lg">Registration Complete!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pose Instructions */}
        {!isSuccess && (
          <div className="mb-6 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              Pose {currentPose.step} of 4
            </span>
            <h3 className="text-xl font-bold text-white">{currentPose.title}</h3>
            <p className="text-xs text-slate-400">{currentPose.instruction}</p>
          </div>
        )}

        {/* Captured Steps Badges */}
        <div className="flex justify-center gap-2 mb-6 w-full">
          {POSES.map((p, idx) => (
            <div 
              key={p.step}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                idx < capturedEmbeddings.length
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : idx === currentPoseIndex
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                  : 'bg-slate-800/60 border-slate-800 text-slate-600'
              }`}
            >
              {idx < capturedEmbeddings.length ? '✓' : `Pose ${p.step}`}
            </div>
          ))}
        </div>

        {errorMsg && (
          <div className="mb-4 text-xs text-rose-400 bg-rose-950/60 border border-rose-800 p-3 rounded-xl w-full text-left flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {poseFailCount >= 3 && (
          <div className="mb-4 text-xs text-amber-300 bg-amber-950/60 border border-amber-800/80 p-3 rounded-xl w-full text-left flex items-start gap-2">
            <Info size={16} className="shrink-0 mt-0.5 text-amber-400" />
            <div>
              <strong className="block font-semibold text-amber-200 mb-0.5">Capture Guidance:</strong>
              If you are having trouble passing this step, make sure your face is in good lighting, well-centered, and distinctly turned in the requested direction.
            </div>
          </div>
        )}

        {/* Action Button */}
        {!isSuccess && (
          <Button 
            onClick={handleCapturePose}
            disabled={!isCameraReady || capturing || submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50"
          >
            {capturing || submitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {submitting ? 'Encrypting & Saving Profile...' : 'Analyzing Pose...'}
              </>
            ) : !isCameraReady ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Waiting for Camera Feed...
              </>
            ) : (
              <>
                <Camera size={18} />
                Capture Pose {currentPoseIndex + 1} of 4
              </>
            )}
          </Button>
        )}

      </Card>
    </div>
  );
}
