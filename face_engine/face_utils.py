import cv2
import numpy as np
import urllib.request
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Massively restrict threading to prevent OOM on 512MB RAM Render tiers
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"

MODELS_DIR = os.path.dirname(__file__)

SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

YOLO_PATH = os.path.join(MODELS_DIR, "yolov8n-face.pt")
SFACE_PATH = os.path.join(MODELS_DIR, "face_recognition_sface.onnx")

def download_model(url, path):
    if not os.path.exists(path):
        logger.info(f"Downloading model {os.path.basename(path)}... This may take a minute.")
        urllib.request.urlretrieve(url, path)
        logger.info("Download complete.")

download_model(SFACE_URL, SFACE_PATH)

# --- Load YOLOv8 face detector ---
try:
    import torch
    torch.set_num_threads(1)  # Strictly limit PyTorch RAM overhead
    from ultralytics import YOLO
    yolo_model = YOLO(YOLO_PATH)
    logger.info("YOLOv8 face detection model loaded successfully.")
    YOLO_AVAILABLE = True
except Exception as e:
    logger.warning(f"YOLOv8 failed to load: {e}. Face engine will not be operational.")
    YOLO_AVAILABLE = False

# --- Load SFace recognizer (128D embedding extractor) ---
recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")


def _decode_image(image_bytes: bytes):
    """Decode raw image bytes into an OpenCV BGR image."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def _detect_face_yolo(img) -> np.ndarray | None:
    """
    Run YOLOv8 on the image and return the largest detected face as
    a YuNet-compatible row: [x, y, w, h, ...landmarks..., confidence]
    SFace.alignCrop requires this specific 15-element format.
    """
    results = yolo_model(img, verbose=False)
    boxes = results[0].boxes

    if boxes is None or len(boxes) == 0:
        return None

    # Select the box with highest confidence
    confidences = boxes.conf.cpu().numpy()
    best_idx = int(np.argmax(confidences))
    box = boxes.xyxy[best_idx].cpu().numpy()  # [x1, y1, x2, y2]

    x1, y1, x2, y2 = box
    w = x2 - x1
    h = y2 - y1

    # Build a YuNet-compatible face row (15 elements).
    # Landmarks are approximated from the bounding box since YOLO-face
    # does not produce them in the same format as YuNet.
    # SFace alignCrop only uses the first 4 values (x,y,w,h) for the crop.
    face_row = np.array([
        x1, y1, w, h,
        x1 + w * 0.3, y1 + h * 0.35,   # left eye approx
        x1 + w * 0.7, y1 + h * 0.35,   # right eye approx
        x1 + w * 0.5, y1 + h * 0.55,   # nose approx
        x1 + w * 0.3, y1 + h * 0.75,   # left mouth approx
        x1 + w * 0.7, y1 + h * 0.75,   # right mouth approx
        confidences[best_idx]
    ], dtype=np.float32)

    return face_row


def get_face_encoding(image_bytes: bytes) -> list:
    """
    Detect face using YOLOv8, extract 128D identity embedding via SFace.
    Images exist in memory only — never written to disk.
    Returns a list of 128 floats, or None if no face found.
    """
    if not YOLO_AVAILABLE:
        logger.error("YOLOv8 not available. Cannot extract face encoding.")
        return None

    img = _decode_image(image_bytes)
    if img is None:
        logger.error("Failed to decode image bytes.")
        return None

    face_row = _detect_face_yolo(img)
    if face_row is None:
        logger.warning("No face detected by YOLOv8.")
        return None

    try:
        aligned_face = recognizer.alignCrop(img, face_row)
        feature = recognizer.feature(aligned_face)
        # feature shape: (1, 128) — flatten to plain python list
        encoding = feature[0].tolist()
        logger.info(f"Extracted 128D face embedding successfully (dim={len(encoding)}).")
        return encoding
    except Exception as e:
        logger.error(f"SFace feature extraction failed: {e}")
        return None


def match_faces(captured_image_bytes: bytes, known_encodings_dict: dict) -> list:
    """
    Match a captured live image against a dict of known user embeddings.
    Returns a list of matched user IDs.
    """
    captured_encoding = get_face_encoding(captured_image_bytes)
    if not captured_encoding:
        return []

    captured_feature = np.array(captured_encoding, dtype=np.float32).reshape(1, 128)
    matched_ids = []

    for user_id, enc_list in known_encodings_dict.items():
        enc_array = np.array(enc_list, dtype=np.float32)

        # Support both single (128,) and multi-pose (N, 128) embeddings
        if enc_array.ndim == 1 and enc_array.size == 128:
            embeddings = [enc_array.reshape(1, 128)]
        elif enc_array.ndim == 2 and enc_array.shape[1] == 128:
            embeddings = [row.reshape(1, 128) for row in enc_array]
        else:
            logger.warning(f"Skipping malformed embedding for user {user_id}")
            continue

        for known_feature in embeddings:
            # Score threshold 0.363 = Cosine mode in SFace (recommended)
            score = recognizer.match(known_feature, captured_feature, cv2.FaceRecognizerSF_FR_COSINE)
            if score >= 0.363:
                matched_ids.append(user_id)
                logger.info(f"Face matched user {user_id} (score={score:.4f})")
                break

    return matched_ids


def check_duplicate_face(new_encoding: list, known_encodings_dict: dict, tolerance: float = 0.363) -> str:
    """
    Check if a newly enrolled embedding already exists in the database
    to prevent duplicate registrations for different user accounts.
    Returns the user_id of the match, or None.
    """
    if not known_encodings_dict:
        return None

    new_feature = np.array(new_encoding, dtype=np.float32).reshape(1, 128)

    for user_id, enc_list in known_encodings_dict.items():
        enc_array = np.array(enc_list, dtype=np.float32)

        if enc_array.ndim == 1 and enc_array.size == 128:
            embeddings = [enc_array.reshape(1, 128)]
        elif enc_array.ndim == 2 and enc_array.shape[1] == 128:
            embeddings = [row.reshape(1, 128) for row in enc_array]
        else:
            continue

        for known_feature in embeddings:
            score = recognizer.match(known_feature, new_feature, cv2.FaceRecognizerSF_FR_COSINE)
            if score >= tolerance:
                return user_id

    return None
