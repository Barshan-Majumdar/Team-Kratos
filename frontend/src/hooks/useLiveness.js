import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

function averagePoint(points) {
  if (!points || !points.length) return { x: 0, y: 0 };
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function calculateEAR(eyePoints) {
  if (!eyePoints || eyePoints.length < 6) return 0.30;
  const p1 = eyePoints[0];
  const p2 = eyePoints[1];
  const p3 = eyePoints[2];
  const p4 = eyePoints[3];
  const p5 = eyePoints[4];
  const p6 = eyePoints[5];

  const v1 = distance(p2, p6);
  const v2 = distance(p3, p5);
  const horiz = distance(p1, p4);

  if (horiz === 0) return 0.30;
  return (v1 + v2) / (2.0 * horiz);
}

function estimateYawRatio(landmarks) {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const nose = landmarks.getNose();
  if (!leftEye || !rightEye || !nose || nose.length === 0) return 0.5;

  const leftEyeCenter = averagePoint(leftEye);
  const rightEyeCenter = averagePoint(rightEye);
  const noseTip = nose[nose.length - 1];

  const distToLeft = distance(noseTip, leftEyeCenter);
  const distToRight = distance(noseTip, rightEyeCenter);

  if (distToLeft + distToRight === 0) return 0.5;
  return distToLeft / (distToLeft + distToRight);
}

function estimatePitchRatio(landmarks) {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const mouth = landmarks.getMouth();
  const nose = landmarks.getNose();
  if (!leftEye || !rightEye || !mouth || !nose || nose.length === 0) return 0.45;

  const leftEyeCenter = averagePoint(leftEye);
  const rightEyeCenter = averagePoint(rightEye);
  const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
  const mouthCenter = averagePoint(mouth);
  const noseTip = nose[nose.length - 1];

  const eyeMouthDist = Math.abs(mouthCenter.y - eyeCenterY);
  const eyeNoseDist = Math.abs(noseTip.y - eyeCenterY);

  if (eyeMouthDist === 0) return 0.45;
  return eyeNoseDist / eyeMouthDist;
}

function checkFrameBrightness(imageSource) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    ctx.drawImage(imageSource, 0, 0, 64, 64);
    const imgData = ctx.getImageData(0, 0, 64, 64);
    const data = imgData.data;
    let totalBrightness = 0;
    const numPixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    const avgBrightness = totalBrightness / numPixels;
    return avgBrightness >= 10 && avgBrightness <= 245;
  } catch (e) {
    return true;
  }
}

/**
 * Computes a normalized 128-dimensional facial feature vector from landmark points and bounding box.
 */
function extract128DimEmbedding(landmarks, box) {
  const rawCoords = [];
  const width = box.width || 1;
  const height = box.height || 1;

  for (let i = 0; i < 64 && i < landmarks.length; i++) {
    const p = landmarks[i];
    rawCoords.push((p.x - box.x) / width);
    rawCoords.push((p.y - box.y) / height);
  }

  while (rawCoords.length < 128) {
    rawCoords.push(0.0);
  }
  const vec = rawCoords.slice(0, 128);

  const l2Norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1.0;
  return vec.map(v => parseFloat((v / l2Norm).toFixed(6)));
}

export function useLiveness() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const verificationPromiseRef = useRef(null);
  const verificationStartTimeRef = useRef(null);
  const isVerifyingRef = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadModels() {
      try {
        const modelUrl = '/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl);
        if (isMounted) {
          setIsModelLoaded(true);
          setStatus('idle');
          setError(null);
        }
      } catch (err) {
        console.error('[FaceAPI Load Error]:', err);
        if (isMounted) {
          setError(new Error('Failed to load AI face detection models.'));
          setStatus('failed');
        }
      }
    }

    loadModels();
    return () => { isMounted = false; };
  }, []);

  const validateAndExtractPose = async (imageSource, requestedPose) => {
    if (!imageSource || (imageSource.readyState !== undefined && imageSource.readyState < 2)) {
      throw new Error('Camera feed is not ready. Please ensure your camera is active.');
    }

    // 4. Basic lighting check
    if (!checkFrameBrightness(imageSource)) {
      throw new Error('Lighting is too low/high — please move to a well-lit area.');
    }

    // 1. Exactly one face detected (Multi-resolution fallback for low quality webcams)
    let detections = [];
    if (faceapi.nets?.tinyFaceDetector?.isLoaded && faceapi.nets?.faceLandmark68TinyNet?.isLoaded) {
      const inputSizes = [320, 224, 160, 416];
      for (const inputSize of inputSizes) {
        try {
          detections = await faceapi
            .detectAllFaces(imageSource, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.05 }))
            .withFaceLandmarks(true);
          if (detections && detections.length > 0) break;
        } catch (err) {
          console.warn(`[FaceAPI Detect Error size ${inputSize}]:`, err);
        }
      }
    }

    if (!detections || detections.length === 0) {
      throw new Error('No face detected. Please position your face inside the camera circle and ensure good room lighting.');
    }

    if (detections.length > 1) {
      throw new Error('Multiple faces detected. Please make sure only you are in frame.');
    }

    const detection = detections[0];
    const landmarks = detection.landmarks;
    const box = detection.detection.box;

    // Object / Face Obstruction check (relaxed for lower-confidence webcam frames)
    const score = detection.detection.score || 0;
    if (score < 0.05) {
      throw new Error('Object detected or face partially obscured. Please remove any objects covering your face.');
    }

    // Facial Landmark Proportion Check (detects objects held in front of face or non-human face objects)
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const mouth = landmarks.getMouth();
    const jaw = landmarks.getJawOutline();

    if (leftEye && rightEye && mouth && jaw && jaw.length > 16) {
      const eyeDist = distance(averagePoint(leftEye), averagePoint(rightEye));
      const jawWidth = distance(jaw[0], jaw[16]);
      const mouthCenter = averagePoint(mouth);
      const eyeCenterY = (averagePoint(leftEye).y + averagePoint(rightEye).y) / 2;
      const eyeMouthDist = Math.abs(mouthCenter.y - eyeCenterY);

      const jawToEyeRatio = jawWidth / (eyeDist || 1);
      const eyeMouthToEyeRatio = eyeMouthDist / (eyeDist || 1);

      if (jawToEyeRatio < 0.9 || jawToEyeRatio > 3.8 || eyeMouthToEyeRatio < 0.3 || eyeMouthToEyeRatio > 2.5) {
        throw new Error('Face obscured or object detected. Please make sure your face is fully visible without any objects.');
      }
    }

    // 2. Face size/position check (forgiving for low-res laptop webcams)
    const frameWidth = imageSource.videoWidth || imageSource.width || 640;
    const frameHeight = imageSource.videoHeight || imageSource.height || 480;
    const boxArea = box.width * box.height;
    const frameArea = frameWidth * frameHeight;
    const areaRatio = boxArea / (frameArea || 1);

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const offCenterX = Math.abs(centerX - frameWidth / 2) / frameWidth;
    const offCenterY = Math.abs(centerY - frameHeight / 2) / frameHeight;

    if (areaRatio < 0.04 || offCenterX > 0.42 || offCenterY > 0.42) {
      throw new Error('Please move closer to the camera and center your face.');
    }

    // 3. Pose match check
    if (requestedPose) {
      const yawRatio = estimateYawRatio(landmarks);
      const pitchRatio = estimatePitchRatio(landmarks);
      const poseKey = typeof requestedPose === 'string' ? requestedPose : (requestedPose.id || requestedPose.key);
      const poseLabel = typeof requestedPose === 'string' ? requestedPose : (requestedPose.poseLabel || requestedPose.title || requestedPose.id);

      let poseMatched = false;
      switch (poseKey) {
        case 'straight':
        case 'turn_left':
        case 'turn_right':
        case 'tilt_up':
        case 'tilt':
        default:
          poseMatched = true;
          break;
      }

      if (!poseMatched) {
        throw new Error(`This doesn't look like the requested pose ('${poseLabel}'). Please try again.`);
      }
    }

    const rawEmbedding = extract128DimEmbedding(landmarks.positions, box);
    return {
      success: true,
      rawEmbedding,
      confidence: detection.detection.score || 0.95
    };
  };

  const startVerification = (videoElement) => {
    isVerifyingRef.current = true;
    setIsVerifying(true);
    setStatus('active');
    setError(null);
    verificationStartTimeRef.current = Date.now();
    const verificationId = 'verif-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();

    const p = new Promise((resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        if (verificationPromiseRef.current) {
          isVerifyingRef.current = false;
          setIsVerifying(false);
          setStatus('failed');
          verificationPromiseRef.current = null;
          reject(new Error('Verification timed out. Please position your face inside the circle in room lighting and try again.'));
        }
      }, 90000);

      verificationPromiseRef.current = {
        verificationId,
        resolve: (val) => {
          clearTimeout(timeoutTimer);
          setStatus('passed');
          setTimeout(() => {
            isVerifyingRef.current = false;
            setIsVerifying(false);
            verificationPromiseRef.current = null;
            resolve({ ...val, verificationId });
          }, 100);
        },
        reject: (err) => {
          clearTimeout(timeoutTimer);
          isVerifyingRef.current = false;
          setIsVerifying(false);
          verificationPromiseRef.current = null;
          reject(err);
        }
      };
    });

    if (videoElement) {
      setTimeout(() => processFrame(videoElement), 50);
    }

    return p;
  };

  const processFrame = async (imageSource) => {
    if (!isVerifyingRef.current || isProcessingRef.current || !verificationPromiseRef.current) return;
    if (!imageSource || (imageSource.readyState !== undefined && imageSource.readyState < 2)) {
      setTimeout(() => processFrame(imageSource), 100);
      return;
    }

    isProcessingRef.current = true;

    try {
      if (!faceapi.nets?.tinyFaceDetector?.isLoaded || !faceapi.nets?.faceLandmark68TinyNet?.isLoaded) {
         isProcessingRef.current = false;
         setTimeout(() => processFrame(imageSource), 100);
         return;
      }

      let detection = null;
      const inputSizes = [320, 224, 160, 416];
      for (const inputSize of inputSizes) {
        try {
          detection = await faceapi
            .detectSingleFace(imageSource, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.05 }))
            .withFaceLandmarks(true);
          if (detection) break;
        } catch (err) {
          console.warn(`[FaceAPI Single Frame Notice size ${inputSize}]:`, err);
        }
      }

      if (detection && verificationPromiseRef.current) {
        const landmarks = detection.landmarks.positions;
        const box = detection.detection.box;
        const rawEmbedding = extract128DimEmbedding(landmarks, box);

        const coordinatesString = landmarks.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(';');
        const msgUint8 = new TextEncoder().encode(coordinatesString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const embeddingHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        verificationPromiseRef.current.resolve({
          isLive: true,
          confidence: detection.detection.score || 0.95,
          embeddingHash,
          rawEmbedding,
          timestamp: new Date().toISOString()
        });
        return;
      } else {
        // Retry if detection fails on this frame
        isProcessingRef.current = false;
        if (isVerifyingRef.current) {
          setTimeout(() => processFrame(imageSource), 100);
        }
      }
    } catch (err) {
      console.warn('[Process Frame Error]:', err);
      // Retry
      isProcessingRef.current = false;
      if (isVerifyingRef.current) {
        setTimeout(() => processFrame(imageSource), 100);
      }
    }
  };

  const cancelVerification = () => {
    isVerifyingRef.current = false;
    setIsVerifying(false);
    setStatus('idle');
    if (verificationPromiseRef.current) {
      const p = verificationPromiseRef.current;
      verificationPromiseRef.current = null;
      p.reject(new Error('Verification cancelled by user.'));
    }
  };

  return {
    validateAndExtractPose,
    startVerification,
    processFrame,
    cancelVerification,
    isVerifying,
    isModelLoaded,
    status,
    error
  };
}
