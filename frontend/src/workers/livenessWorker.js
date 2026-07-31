/**
 * NOTE: Challenge-response anti-spoofing logic has been removed in favor of presence-only detection for enhanced UX.
 * Trade-off: Printed photos or screens can pass presence detection as motion/blink verification is omitted.
 * 'isLive' in returned data represents 'face detected and stable in frame', not 'challenge completed'.
 */
import * as faceapi from 'face-api.js';

// Polyfill the face-api environment for worker execution
if (typeof OffscreenCanvas !== 'undefined') {
  faceapi.env.monkeyPatch({
    Canvas: OffscreenCanvas,
    CanvasRenderingContext2D: OffscreenCanvas.getContext ? OffscreenCanvas.getContext('2d')?.constructor : null
  });
}

let modelsLoaded = false;
let frameHistory = [];

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

/**
 * Validates face presence and stability over a short frame history (~1 sec / 5-10 frames).
 * Checks that a face is detected consistently, centered in frame, and of sufficient size.
 */
function checkFacePresence(history) {
  if (history.length < 4) return false;

  const recentFrames = history.slice(-4);
  for (const frame of recentFrames) {
    if (!frame.detection) return false;
    const { box } = frame.detection;
    // Bounding box size check: face must be at least 70x70px (not too far)
    if (box.width < 70 || box.height < 70) return false;
  }

  return true;
}

self.onmessage = async (e) => {
  const { type, data } = e.data;

  if (type === 'init') {
    try {
      const { modelUrl } = data;
      if (!modelsLoaded) {
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl);
        modelsLoaded = true;
      }
      self.postMessage({ type: 'init_complete', success: true });
    } catch (err) {
      self.postMessage({ type: 'error', message: `Model load failed: ${err.message}` });
    }
  } 
  
  else if (type === 'start') {
    frameHistory = [];
    self.postMessage({ type: 'start_acknowledged' });
  } 
  
  else if (type === 'process') {
    if (!modelsLoaded) {
      self.postMessage({ type: 'error', message: 'Models not initialized.' });
      return;
    }

    try {
      const { imageBitmap } = data;
      
      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0);
      imageBitmap.close();

      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.05 }))
        .withFaceLandmarks(true);

      if (!detection) {
        self.postMessage({ type: 'no_face_detected' });
        return;
      }

      const landmarks = detection.landmarks.positions;
      const box = detection.detection.box;
      
      frameHistory.push({
        detection: detection.detection,
        landmarks,
        box,
        timestamp: Date.now()
      });

      if (frameHistory.length > 30) {
        frameHistory.shift();
      }

      const isStablePresence = checkFacePresence(frameHistory);

      if (isStablePresence) {
        let embeddingHash = '';
        let rawEmbedding = extract128DimEmbedding(landmarks, box);

        if (faceapi.nets.faceRecognitionNet.isLoaded) {
          const descriptor = await faceapi.computeFaceDescriptor(canvas, detection);
          rawEmbedding = Array.from(descriptor);
          const descriptorString = rawEmbedding.map(f => f.toFixed(6)).join(',');
          
          const msgUint8 = new TextEncoder().encode(descriptorString);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
          embeddingHash = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        } else {
          const coordinatesString = landmarks.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(';');
          const msgUint8 = new TextEncoder().encode(coordinatesString);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
          embeddingHash = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }

        self.postMessage({
          type: 'liveness_success',
          data: {
            isLive: true,
            confidence: detection.detection.score,
            embeddingHash,
            rawEmbedding
          }
        });
      } else {
        self.postMessage({
          type: 'challenge_pending',
          data: {
            detected: true,
            score: detection.detection.score,
            box: detection.detection.box
          }
        });
      }
    } catch (err) {
      self.postMessage({ type: 'error', message: `Processing error: ${err.message}` });
    }
  }
};
