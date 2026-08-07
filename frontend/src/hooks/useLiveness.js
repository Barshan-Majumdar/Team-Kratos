import { useState, useRef } from 'react';

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

  const validateAndExtractPose = async (videoElement, requestedPose) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const dummyVector = Array.from({ length: 128 }, (_, i) => parseFloat((Math.sin(i + 1) * 0.088).toFixed(6)));
        resolve({
          success: true,
          rawEmbedding: dummyVector,
          confidence: 0.95
        });
      }, 500); // simulate some processing time
    });
  };

  return {
    validateAndExtractPose,
    startVerification,
    processFrame,
    cancelVerification,
    isVerifying,
    isModelLoaded: true, // Mocked so Attendance.jsx doesn't block waiting for models
    status,
    error: null
  };
}
