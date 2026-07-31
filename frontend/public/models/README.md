# Face API & Liveness Models Directory

This directory contains static assets for face api detection and liveness heuristics checks.

## Active Models
- `tiny_face_detector_model-weights_manifest.json` + `tiny_face_detector_model-shard1`
- `face_landmark_68_tiny_model-weights_manifest.json` + `face_landmark_68_tiny_model-shard1`

## ONNX Liveness Upgrade
For future ONNX-based classifier anti-spoofing upgrades:
1. Place the `liveness_model.onnx` file in this directory.
2. Update `livenessWorker.js` to initialize the `onnxruntime-web` runtime, load the ONNX model, and run inference using cropped face images.
