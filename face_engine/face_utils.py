import cv2
import numpy as np
import urllib.request
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS_DIR = os.path.dirname(__file__)

YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

YUNET_PATH = os.path.join(MODELS_DIR, "face_detection_yunet.onnx")
SFACE_PATH = os.path.join(MODELS_DIR, "face_recognition_sface.onnx")

def download_model(url, path):
    if not os.path.exists(path):
        logger.info(f"Downloading model {os.path.basename(path)}... This may take a minute.")
        urllib.request.urlretrieve(url, path)
        logger.info("Download complete.")

download_model(YUNET_URL, YUNET_PATH)
download_model(SFACE_URL, SFACE_PATH)

detector = cv2.FaceDetectorYN.create(YUNET_PATH, "", (320, 320), score_threshold=0.5)
recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")

def get_face_encoding(image_bytes: bytes) -> list:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return None
        
    height, width, _ = img.shape
    detector.setInputSize((width, height))
    
    _, faces = detector.detect(img)
    if faces is None or len(faces) == 0:
        return None
        
    # Pick the largest face (based on width * height)
    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
    face = faces[0]
    
    aligned_face = recognizer.alignCrop(img, face)
    feature = recognizer.feature(aligned_face)
    
    # feature is a 2D numpy array: [[v1, v2, ..., v128]]
    # Flatten to a 1D python list of 128 floats
    return feature[0].tolist()

def match_faces(captured_image_bytes: bytes, known_encodings_dict: dict) -> list[str]:
    captured_encoding = get_face_encoding(captured_image_bytes)
    if not captured_encoding:
        return []
        
    captured_feature = np.array(captured_encoding, dtype=np.float32).reshape(1, 128)
    
    matched_student_ids = []
    
    for student_id, enc_list in known_encodings_dict.items():
        known_feature = np.array(enc_list, dtype=np.float32).reshape(1, 128)
        
        # SFace cosine similarity threshold is typically 0.363 for true match
        # Distance = 1.0 - CosineSimilarity in SFace, or we can just use SFace's built-in matcher
        # For simplicity, we use recognizer.match with L2 distance or Cosine.
        # cv2.FaceRecognizerSF_FR_COSINE = 0
        score = recognizer.match(known_feature, captured_feature, 0)
        
        # For COSINE, a score >= 0.363 usually means a match. We use 0.363 as threshold.
        if score >= 0.363:
            logger.info(f"Matched {student_id} with score {score}")
            matched_student_ids.append(student_id)
            
    return matched_student_ids

def check_duplicate_face(new_encoding: list, known_encodings_dict: dict, tolerance: float = 0.363) -> str:
    if not known_encodings_dict:
        return None
        
    new_feature = np.array(new_encoding, dtype=np.float32).reshape(1, 128)
    
    for student_id, enc_list in known_encodings_dict.items():
        known_feature = np.array(enc_list, dtype=np.float32).reshape(1, 128)
        score = recognizer.match(known_feature, new_feature, 0)
        
        if score >= tolerance:
            return student_id
            
    return None
