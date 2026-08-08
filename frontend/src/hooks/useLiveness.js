import { useState, useRef } from 'react';

/**
 * Captures a single frame from a <video> element.
 * Draws to an off-screen canvas and exports as a compressed WebP base64 string.
 * The canvas is discarded immediately after — no image data persists in memory.
 * Returns the raw base64 string (no data:image prefix).
 */
function captureFrame(videoElement, quality = 0.82) {
  if (!videoElement || videoElement.readyState < 2) {
    throw new Error('Camera not ready. Please wait for the video feed to load.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;

  const ctx = canvas.getContext('2d');
  // Mirror the frame to match the mirrored video display (CSS -scale-x-100)
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Export as WebP (smaller than JPEG, broader support)
  const dataUrl = canvas.toDataURL('image/webp', quality);

  // Strip the data:image/webp;base64, prefix — backend only needs the raw base64
  const base64 = dataUrl.split(',')[1];

  // Aggressively release the canvas from memory
  canvas.width = 0;
  canvas.height = 0;

  return base64;
}

export function useLiveness() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, active, loading, passed, failed
  const promiseRef = useRef(null);

  const startVerification = () => {
    setIsVerifying(true);
    setStatus('active');
    return new Promise((resolve, reject) => {
      promiseRef.current = { resolve, reject };
    });
  };

  /**
   * Used by the Attendance clock-in flow.
   * Sends the base64 image to Node.js which proxies it to the Python YOLO engine.
   */
  const processFrame = async (base64Image) => {
    setStatus('loading');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/attendance/check-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ image_base64: base64Image })
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('idle');
        throw new Error(data.error || 'NO_FACE_DETECTED');
      }

      if (promiseRef.current) {
        setStatus('passed');
        setIsVerifying(false);
        promiseRef.current.resolve({ isLive: true, imageBase64: base64Image });
        promiseRef.current = null;
      }
      return true;
    } catch (err) {
      setStatus('idle');
      throw err;
    }
  };

  const cancelVerification = () => {
    setIsVerifying(false);
    setStatus('idle');
    if (promiseRef.current) {
      promiseRef.current.reject(new Error('Verification cancelled by user.'));
      promiseRef.current = null;
    }
  };

  /**
   * Used by FaceRegistration.jsx.
   * Captures a real frame from the video element for the requested pose.
   * Returns { success, frameBase64 } — the actual embedding extraction
   * happens server-side via the YOLO Python engine.
   */
  const validateAndExtractPose = async (videoElement, requestedPose) => {
    return new Promise((resolve, reject) => {
      try {
        const frameBase64 = captureFrame(videoElement);
        resolve({
          success: true,
          frameBase64,        // real captured frame — sent to backend
          rawEmbedding: null, // embedding is now extracted by the Python engine
          confidence: null
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  return {
    validateAndExtractPose,
    startVerification,
    processFrame,
    cancelVerification,
    isVerifying,
    isModelLoaded: true,
    status,
    error: null
  };
}

