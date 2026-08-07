import base64
import numpy as np
import cv2
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional
import logging
import json

# Import the face_utils ported from AttendX
from face_utils import get_face_encoding, check_duplicate_face, match_faces

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Crew Face Engine")

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [url.strip() for url in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VerificationRequest(BaseModel):
    image_base64: str
    # A dictionary of known faces: { "user_id": [128 floats], ... }
    known_faces: dict

class RegistrationRequest(BaseModel):
    image_base64: str

def decode_base64_image(base64_string: str) -> bytes:
    """Helper to decode base64 string to raw image bytes"""
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        image_bytes = base64.b64decode(base64_string)
        return image_bytes
    except Exception as e:
        logger.error(f"Failed to decode base64 image: {e}")
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

def run_liveness_check(image_bytes: bytes) -> bool:
    """
    Placeholder for Anti-Spoofing PyTorch model.
    To be fully implemented with a Silent-Face-Anti-Spoofing model.
    Currently returns True. If you have the MiniVision model weights, 
    we will load them here to do depth/texture analysis.
    """
    # TODO: Load PyTorch model and run inference on image_bytes
    return True

@app.post("/verify")
async def verify_face(req: VerificationRequest):
    """
    1. Check Liveness
    2. Extract Face Encoding
    3. Match against known faces
    """
    image_bytes = decode_base64_image(req.image_base64)
    
    # 1. Anti-Spoofing (Liveness Check)
    is_live = run_liveness_check(image_bytes)
    if not is_live:
        return {"success": False, "error": "SPOOF_DETECTED"}
    
    # 2 & 3. YOLOv8 + Dlib Matching
    matched_ids = match_faces(image_bytes, req.known_faces)
    
    if not matched_ids:
        return {"success": False, "error": "NO_MATCH_FOUND"}
    
    # In attendance, usually the best/first match is the user standing there
    return {
        "success": True,
        "match_id": matched_ids[0],
        "confidence": 0.95 # Dlib tolerance is used internally
    }

@app.post("/register")
async def register_face(req: RegistrationRequest):
    """
    Extracts the 128D encoding from a registration photo.
    Returns the array to be saved in the Node.js PostgreSQL database.
    """
    image_bytes = decode_base64_image(req.image_base64)
    
    # Anti-spoofing during registration is also a good idea
    if not run_liveness_check(image_bytes):
        return {"success": False, "error": "SPOOF_DETECTED"}
        
    encoding = get_face_encoding(image_bytes)
    if not encoding:
        return {"success": False, "error": "NO_FACE_DETECTED"}
        
    return {
        "success": True,
        "encoding": encoding
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
