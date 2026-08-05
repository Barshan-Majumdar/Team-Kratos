import React, { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Shield, CheckCircle, XCircle, ScanFace, Loader2, Camera, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from 'face-api.js';

function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function calculateEAR(eyePoints) {
  if (!eyePoints || eyePoints.length < 6) return 0.30;
  const v1 = distance(eyePoints[1], eyePoints[5]);
  const v2 = distance(eyePoints[2], eyePoints[4]);
  const horiz = distance(eyePoints[0], eyePoints[3]);
  if (horiz === 0) return 0.30;
  return (v1 + v2) / (2.0 * horiz);
}

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

  // Eye blink detection states
  const [blinkVerified, setBlinkVerified] = useState(false);
  const [blinkErrorMsg, setBlinkErrorMsg] = useState('');

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

  // Continuous background Eye Aspect Ratio (EAR) blink detection loop
  useEffect(() => {
    let active = true;
    let blinkTimer = null;

    const detectBlinkLoop = async () => {
      if (!active || blinkVerified || !isCameraReady || !videoRef.current) {
        if (active && !blinkVerified) {
          blinkTimer = setTimeout(detectBlinkLoop, 50);
        }
        return;
      }

      try {
        if (faceapi.nets?.tinyFaceDetector?.isLoaded && faceapi.nets?.faceLandmark68TinyNet?.isLoaded) {
          let detection = null;
          for (const inputSize of [320, 224, 160]) {
            try {
              detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.05 }))
                .withFaceLandmarks(true);
              if (detection) break;
            } catch (_) {}
          }

          if (detection && detection.landmarks) {
            const leftEye = detection.landmarks.getLeftEye();
            const rightEye = detection.landmarks.getRightEye();
            const leftEAR = calculateEAR(leftEye);
            const rightEAR = calculateEAR(rightEye);
            const avgEAR = (leftEAR + rightEAR) / 2.0;

            // EAR threshold <= 0.22 indicates closed eyes / blink event
            if (avgEAR <= 0.22) {
              setBlinkVerified(true);
              setBlinkErrorMsg('');
            }
          }
        }
      } catch (err) {
        console.warn('[Blink Check Notice]:', err);
      }

      if (active && !blinkVerified) {
        blinkTimer = setTimeout(detectBlinkLoop, 50);
      }
    };

    if (isCameraReady && !blinkVerified) {
      detectBlinkLoop();
    }

    return () => {
      active = false;
      if (blinkTimer) clearTimeout(blinkTimer);
    };
  }, [isCameraReady, blinkVerified]);

  // Auto-trigger capture upon eye blink verification
  useEffect(() => {
    if (blinkVerified && isCameraReady && videoRef.current && !isCapturing && status !== 'passed' && status !== 'failed') {
      const autoTimer = setTimeout(() => {
        handleCaptureImage();
      }, 350);
      return () => clearTimeout(autoTimer);
    }
  }, [blinkVerified, isCameraReady, status]);

  // Immediately turn off camera hardware light when verification completes (passed or failed)
  useEffect(() => {
    if (status === 'passed' || status === 'failed') {
      stopCameraStream();
    }
  }, [status]);

  const handleCaptureImage = async () => {
    if (!videoRef.current || !isCameraReady || isCapturing) return;

    if (!blinkVerified) {
      setBlinkErrorMsg('⚠️ Please blink your eyes naturally to verify liveness before capturing. Static photos are not accepted!');
      return;
    }

    setIsCapturing(true);
    setBlinkErrorMsg('');
    try {
      await processFrame(videoRef.current);
    } catch (e) {
      console.warn('Capture frame process notice:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCancelClick = () => {
    stopCameraStream();
    if (onCancel) onCancel();
  };

  const showPassed = status === 'passed';
  const showFailed = status === 'failed';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 relative bg-white shadow-2xl rounded-[28px] border border-slate-100 flex flex-col items-center text-center">
        
        {/* Verification Icon Shield Header */}
        <div className="flex items-center gap-2 mb-3">
          <Shield className="text-indigo-600" size={24} />
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Attendance Identity Verification</span>
        </div>

        {/* Live Anti-Spoofing Eye Blink Status Badge */}
        {!showPassed && !showFailed && !cameraError && (
          <div className={`mb-4 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${
            blinkVerified 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' 
              : 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
          }`}>
            <Eye size={16} className={blinkVerified ? 'text-emerald-600' : 'text-amber-600'} />
            {blinkVerified ? (
              <span>✓ Live Human Verified (Eye Blink Detected)</span>
            ) : (
              <span>👁️ Action Required: Please blink your eyes to verify liveness</span>
            )}
          </div>
        )}

        {/* Video Circle Container */}
        <div className={`relative w-64 h-64 rounded-full overflow-hidden border-4 ${
          blinkVerified ? 'border-emerald-500 shadow-emerald-500/30' : isCameraReady ? 'border-amber-400/80 shadow-amber-400/20' : 'border-indigo-200'
        } shadow-2xl mb-4 bg-slate-950 flex items-center justify-center transition-all duration-500`}>
          {cameraError ? (
            <div className="p-4 text-xs text-rose-500 font-medium">
              <XCircle size={32} className="mx-auto mb-2 text-rose-400" />
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
                className="w-full h-full object-cover scale-x-[-1]"
              />
              
              {/* Camera Initializing Overlay */}
              {!isCameraReady && !showPassed && !showFailed && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-4 z-10">
                  <Loader2 className="animate-spin text-indigo-400 mb-2" size={32} />
                  <span className="text-xs font-semibold text-slate-200">Initializing Camera Feed...</span>
                  <span className="text-[10px] text-slate-400 mt-1">Please allow camera access in your browser prompt</span>
                </div>
              )}

              {/* Circular mask overlay border */}
              <div className="absolute inset-0 border-[16px] border-slate-950/20 pointer-events-none rounded-full"></div>
              
              {/* Scanner Guide Circle */}
              {!showPassed && !showFailed && (
                <div className={`absolute inset-4 border ${blinkVerified ? 'border-emerald-400/80' : 'border-amber-400/60'} rounded-full border-dashed animate-[spin_40s_linear_infinite] pointer-events-none`}></div>
              )}

              {/* Status Overlays */}
              <AnimatePresence>
                {showPassed && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center text-white z-20"
                  >
                    <CheckCircle size={56} className="mb-2" />
                    <span className="font-bold text-lg">Face & Liveness Verified</span>
                    <span className="text-xs text-emerald-100 mt-1">Clocking In...</span>
                  </motion.div>
                )}
                {showFailed && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-rose-600/95 flex flex-col items-center justify-center text-white z-20"
                  >
                    <XCircle size={56} className="mb-2" />
                    <span className="font-bold text-lg">Face Check Failed</span>
                    <span className="text-xs text-rose-100 mt-1">Please try again</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Presence Instructions */}
        {!cameraError && !showPassed && !showFailed && (
          <div className="mb-4 space-y-1">
            <h4 className="text-base font-bold text-slate-800 flex items-center justify-center gap-2">
              <ScanFace className="text-indigo-600" size={18} />
              Align face & blink your eyes
            </h4>
            <p className="text-xs text-slate-500">Position face inside circle and blink naturally to confirm identity</p>
          </div>
        )}

        {/* Blink Warning Alert if attempt made before blinking */}
        {blinkErrorMsg && !showPassed && !showFailed && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left font-medium flex items-center gap-2">
            <span>{blinkErrorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full space-y-3">
          {!showPassed && !showFailed && !cameraError && (
            <Button 
              onClick={handleCaptureImage}
              disabled={!isCameraReady || isCapturing}
              className={`w-full font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-md transition-all disabled:opacity-50 ${
                blinkVerified ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isCapturing ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Verifying Face & Liveness...
                </>
              ) : !isCameraReady ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Waiting for Camera Feed...
                </>
              ) : (
                <>
                  <Camera size={18} />
                  {blinkVerified ? 'Confirm & Clock In' : 'Capture Image for Attendance'}
                </>
              )}
            </Button>
          )}

          <Button 
            onClick={handleCancelClick}
            variant="outline"
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-2xl text-xs border-0"
          >
            Cancel Clock In
          </Button>
        </div>

      </Card>
    </div>
  );
}
