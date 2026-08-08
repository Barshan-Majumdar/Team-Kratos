import React, { useEffect, useRef, useState } from 'react';
import { Shield, CheckCircle, XCircle, ScanFace, Loader2, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LivenessModal({ 
  status, // 'loading' | 'active' | 'passed' | 'failed'
  onCancel, 
  processFrame,
  isModelLoaded,
  onCameraError
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Stop camera stream helper
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
  };

  useEffect(() => {
    let active = true;
    let animId = null;

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
              videoRef.current.play().catch(e => console.warn('Video play error:', e));
              setIsCameraReady(true);
            }
          };
          videoRef.current.onloadeddata = () => {
            setIsCameraReady(true);
          };
        }

        const checkReadyLoop = () => {
          if (!active) return;
          if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
            setIsCameraReady(true);
          } else {
            animId = requestAnimationFrame(checkReadyLoop);
          }
        };

        checkReadyLoop();
      } catch (err) {
        console.error('Camera access denied:', err);
        setCameraError('Webcam access was denied. Camera access is required for attendance.');
        if (onCameraError) {
          onCameraError(err);
        }
      }
    }

    initCamera();

    return () => {
      active = false;
      stopCameraStream();
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, []);

  // Turn off camera hardware light when verification completes (passed or failed)
  useEffect(() => {
    if (status === 'passed' || status === 'failed') {
      stopCameraStream();
    }
  }, [status]);

  const captureRef = useRef(false);

  // Auto-capture face loop for liveness verification
  useEffect(() => {
    if (!isCameraReady || status === 'passed' || status === 'failed') return;
    
    let isCancelled = false;

    // Auto-close if no face comes in for 10 seconds
    const timeoutId = setTimeout(() => {
      if (status !== 'passed' && status !== 'loading') {
         handleCancelClick();
      }
    }, 10000);

    const capture = async () => {
      if (isCancelled || captureRef.current || status === 'loading' || !videoRef.current) return;
      captureRef.current = true;
      
      try {
        setIsCapturing(true); // Visual indicator that we are actively sending to backend
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);

        await processFrame(base64Image);
        return; // Success! It will resolve the promise and stop the loop.
      } catch (e) {
        // Backend said NO_FACE_DETECTED, so we silently ignore and loop
        setIsCapturing(false);
      } finally {
        captureRef.current = false;
      }

      // If no face found, check again in 300ms
      if (!isCancelled) {
        setTimeout(capture, 300);
      }
    };

    // Start checking
    capture();
    
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isCameraReady, status, processFrame]);

  const handleCancelClick = () => {
    stopCameraStream();
    if (onCancel) onCancel();
  };

  const showPassed = status === 'passed';
  const showFailed = status === 'failed';

  return (
    <div className="fixed inset-0 bg-[#1F2B4D]/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 relative bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[32px] border border-[#EAE7E0] flex flex-col items-center text-center">
        
        {/* Verification Icon Shield Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-[#1F2B4D]/5 flex items-center justify-center">
            <Shield className="text-[#1F2B4D]" size={16} strokeWidth={2.5} />
          </div>
          <span className="text-xs font-bold text-[#1F2B4D] uppercase tracking-widest">Identity Verification</span>
        </div>

        {/* Video Circle Container */}
        <div className={`relative w-64 h-64 rounded-full overflow-hidden border-[6px] ${
          isCameraReady ? 'border-[#EAE7E0]' : 'border-[#F4F1EA]'
        } shadow-inner mb-6 bg-[#FAF9F6] flex items-center justify-center transition-all duration-500`}>
          {cameraError ? (
            <div className="p-4 text-xs text-[#D93025] font-medium text-center">
              <XCircle size={32} className="mx-auto mb-2 text-[#D93025]/80" />
              {cameraError}
            </div>
          ) : (
            <>
              {/* Web Cam Mirroring Feed */}
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                onLoadedData={() => setIsCameraReady(true)}
                className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-1000 ease-out ${isCameraReady && !showPassed && !showFailed ? 'opacity-100' : 'opacity-0'}`}
              />
              
              {/* Cyber Scanner HUD Overlay */}
              {isCameraReady && !showPassed && !showFailed && (
                <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden border-[2px] border-[#1F2B4D]/10">
                  {/* Targeting reticle lines */}
                  <div className="absolute top-[15%] left-[25%] w-[50%] h-[70%] border border-[#1F2B4D]/30 border-dashed rounded-[40px] opacity-70"></div>
                    
                  {/* Animated Laser Line */}
                  <motion.div 
                    className="absolute left-0 right-0 h-[2px] bg-[#1F2B4D] shadow-[0_0_8px_#1F2B4D]"
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
                  />
                </div>
              )}
              
              {/* Camera Initializing Overlay */}
              {!isCameraReady && !showPassed && !showFailed && (
                <div className="absolute inset-0 bg-[#FAF9F6] flex flex-col items-center justify-center text-center p-4 z-10">
                  <Camera size={32} className="text-[#CFCAC2] animate-pulse mb-3" strokeWidth={1.5} />
                  <span className="text-xs font-semibold text-[#1D1B16]">Initializing Camera...</span>
                </div>
              )}

              {/* HUD overlay */}
              {isCameraReady && !showPassed && !showFailed && (
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_0_4px_rgba(31,43,77,0.1)] rounded-full mix-blend-overlay"></div>
              )}

              {/* Scanner Guide Circle */}
              {!showPassed && !showFailed && (
                <div className={`absolute inset-3 border border-[#1F2B4D]/20 rounded-full border-dashed animate-[spin_40s_linear_infinite] pointer-events-none`}></div>
              )}

              {/* Status Overlays */}
              <AnimatePresence>
                {showPassed && (
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
                {showFailed && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white flex flex-col items-center justify-center text-[#1D1B16] z-20"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#FFE2E2] text-[#D93025] flex items-center justify-center mb-3 shadow-sm border border-[#FFC7C7]">
                      <XCircle size={32} strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Check Failed</span>
                    <span className="text-xs text-[#6B655C] mt-1 font-medium">Please try again</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Presence Instructions */}
        {!cameraError && !showPassed && !showFailed && (
          <div className="mb-8 space-y-1.5 text-center">
            <h4 className="text-[17px] font-bold text-[#1D1B16] tracking-tight flex items-center justify-center gap-2">
              Align face to clock in
            </h4>
            <p className="text-sm text-[#6B655C]">Position your face inside the circle</p>
          </div>
        )}

        {showPassed && (
          <div className="mb-8 space-y-1.5 text-center animate-in fade-in slide-in-from-bottom-2">
            <h4 className="text-[17px] font-bold text-[#1D1B16] tracking-tight flex items-center justify-center gap-2">
              <CheckCircle size={20} className="text-[#10B981]" />
              Capture Complete
            </h4>
            <p className="text-sm text-[#6B655C]">Camera disconnected. Processing your clock-in...</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full space-y-3">
          {!showPassed && !showFailed && !cameraError && (
            <div className="mt-8 flex items-center justify-center p-4 bg-[#F8F9FC] rounded-2xl border border-[#EAE7E0]">
              <Loader2 className={`text-[#1F2B4D] mr-3 ${isCapturing ? 'animate-spin' : 'animate-pulse'}`} size={24} strokeWidth={2} />
              <span className="text-[#1F2B4D] font-semibold text-sm">
                {!isCameraReady ? 'Waiting for Camera...' : (isCapturing ? 'Analyzing Face...' : 'Scanning for Face...')}
              </span>
            </div>
          )}

          {!showPassed && !showFailed && (
            <button 
              onClick={handleCancelClick}
              className="w-full bg-[#FAF9F6] border border-[#EAE7E0] hover:bg-[#F4F1EA] hover:border-[#CFCAC2] text-[#1D1B16] font-semibold py-3 rounded-full text-sm transition-all duration-300"
            >
              Cancel Clock In
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
