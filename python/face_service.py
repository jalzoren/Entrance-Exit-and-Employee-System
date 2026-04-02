# face_service.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import base64
import cv2
import onnxruntime as ort
from typing import List
from typing import Optional
import math

# ─── NEW: MediaPipe for /validate-frame only ──────────────────────────────────
# This import is ISOLATED to the validate-frame endpoint.
# It does NOT touch ArcFace, Haar Cascade, or any embedding logic.
import mediapipe as mp
print(mp.__version__)

app = FastAPI()

# ----------------------------------------------------
# Models
# ----------------------------------------------------

recognizer = None
face_detector = None


@app.on_event("startup")
async def load_models():
    global recognizer, face_detector

    try:
        print("Loading ArcFace model...")

        recognizer = ort.InferenceSession(
            "models/arcface.onnx",
            providers=["CPUExecutionProvider"]
        )

        print("Loading OpenCV face detector...")

        face_detector = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        if face_detector.empty():
            face_detector = None
            print("Face detector XML not found or corrupted")

        print("Models loaded successfully")

    except Exception as e:
        print("MODEL LOAD ERROR:", e)

# ----------------------------------------------------
# Request Models
# ----------------------------------------------------

class ImageRequest(BaseModel):
    images: List[str]
    min_face_size: int = 40
    quality_threshold: float = 0.3


class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    faces_detected: int
    quality_scores: List[float]
    success: bool


# ----------------------------------------------------
# Base64 → Image
# ----------------------------------------------------

def base64_to_image(base64_string):

    if "," in base64_string:
        base64_string = base64_string.split(",")[1]

    img_bytes = base64.b64decode(base64_string)

    np_arr = np.frombuffer(img_bytes, np.uint8)

    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(400, "Image decode failed")

    return img


# ----------------------------------------------------
# Face Preprocess (ArcFace)
# ----------------------------------------------------

def preprocess_face(face):

    face = cv2.resize(face, (112,112))

    face = cv2.equalizeHist(cv2.cvtColor(face, cv2.COLOR_BGR2GRAY))

    face = cv2.cvtColor(face, cv2.COLOR_GRAY2RGB)

    face = face.astype(np.float32)

    face = (face - 127.5) / 128.0

    face = np.transpose(face, (2,0,1))

    face = np.expand_dims(face, axis=0)

    return face


# ----------------------------------------------------
# Face Quality
# ----------------------------------------------------

def calculate_face_quality(face):

    gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)

    blur = cv2.Laplacian(gray, cv2.CV_64F).var()

    blur_score = min(blur / 500, 1)

    brightness = np.mean(gray) / 255

    brightness_score = 1 - abs(brightness - 0.5) * 2

    contrast = np.std(gray) / 128

    contrast_score = min(contrast, 1)

    quality = (
        blur_score * 0.5 +
        brightness_score * 0.25 +
        contrast_score * 0.25
    )

    return quality


# ----------------------------------------------------
# Face Detection
# ----------------------------------------------------

def detect_faces(img, min_face_size):

    if face_detector is None or face_detector.empty():
        raise HTTPException(500, "Face detector not loaded")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    detections = face_detector.detectMultiScale(
        gray,
        scaleFactor=1.3,
        minNeighbors=5,
        minSize=(min_face_size, min_face_size)
    )

    faces = []

    print("Faces detected:", len(detections))

    for (x, y, w, h) in detections:

        face = img[y:y+h, x:x+w]

        if face.size == 0:
            continue

        face = cv2.resize(face, (112,112))

        quality = calculate_face_quality(face)

        faces.append({
            "face": face,
            "quality": quality
        })

    return faces


# ----------------------------------------------------
# Embedding Generator
# ----------------------------------------------------

def get_embedding(face):

    if recognizer is None:
        raise HTTPException(500, "Recognizer not loaded")

    tensor = preprocess_face(face)

    input_name = recognizer.get_inputs()[0].name

    emb = recognizer.run(None, {input_name: tensor})[0]

    emb = emb.flatten()

    emb = emb / np.linalg.norm(emb)

    return emb


# ----------------------------------------------------
# Cosine Similarityy
# ----------------------------------------------------

def cosine(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


# ----------------------------------------------------
# Generate Embedding
# ----------------------------------------------------

@app.post("/generate-embedding", response_model=EmbeddingResponse)
async def generate_embedding(data: ImageRequest):

    embeddings = []
    qualities = []
    total_faces = 0

    print("Images received:", len(data.images))

    for img_str in data.images:

        try:

            img = base64_to_image(img_str)

            print("Image shape:", img.shape)

            faces = detect_faces(img, data.min_face_size)

            if len(faces) == 0:
                continue

            total_faces += len(faces)

            best_face = max(faces, key=lambda x: x["quality"])

            emb = get_embedding(best_face["face"])

            embeddings.append(emb.tolist())

            qualities.append(best_face["quality"])

        except Exception as e:
            print("IMAGE ERROR:", e)

    if len(embeddings) == 0:

        return EmbeddingResponse(
            embeddings=[],
            faces_detected=0,
            quality_scores=[],
            success=False
        )

    # -----------------------------
    # Face Consistency Check
    # -----------------------------

    if len(embeddings) > 1:

        sims = []

        for i in range(len(embeddings)):
            for j in range(i + 1, len(embeddings)):

                sim = cosine(np.array(embeddings[i]), np.array(embeddings[j]))
                sims.append(sim)

                print("Pair similarity:", sim)

        avg_sim = sum(sims) / len(sims)

        print("Average similarity:", avg_sim)

        if avg_sim < 0.45:
            raise HTTPException(
                status_code=400,
                detail="Different faces detected in images"
            )

    # -----------------------------
    # Return all embeddings
    # -----------------------------

    return {
        "embeddings": embeddings,
        "faces_detected": total_faces,
        "quality_scores": qualities,
        "success": True
    }


# ----------------------------------------------------
# Health Check
# ----------------------------------------------------

@app.get("/health")
async def health():

    return {
        "recognizer_loaded": recognizer is not None,
        "detector_loaded": face_detector is not None,
        "status": "healthy"
    }


# ----------------------------------------------------
# Similarity
# ----------------------------------------------------

class SimilarityRequest(BaseModel):

    embedding1: List[float]
    embedding2: List[float]


@app.post("/calculate-similarity")
async def similarity(data: SimilarityRequest):

    emb1 = np.array(data.embedding1)
    emb2 = np.array(data.embedding2)

    emb1 = emb1 / np.linalg.norm(emb1)
    emb2 = emb2 / np.linalg.norm(emb2)

    sim = float(np.dot(emb1, emb2))

    percent = (sim + 1) / 2 * 100

    return {
        "cosine_similarity": sim,
        "similarity_percent": percent,
        "is_match": percent > 75
    }


# ============================================================
# /validate-frame  — quality gate before ArcFace embedding
#
# PRIORITY ORDER enforced server-side:
#   1. Brightness (fast, no model)
#   2. Face detected (MediaPipe)
#   3. Occlusion / mask
#   4. Blur on face crop  ← NEW
#   5. Head pose
#
# Glasses: detected and returned as soft_warning only — never blocks.
# ============================================================

# ── MediaPipe init ────────────────────────────────────────────────────────────
_mp_face_mesh = mp.solutions.face_mesh
_face_mesh    = _mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
)

# ── Landmark indices ──────────────────────────────────────────────────────────

POSE_LANDMARK_IDS = [1, 152, 33, 263, 61, 291]

POSE_3D_MODEL = np.array([
    [  0.0,    0.0,    0.0],
    [  0.0, -330.0,  -65.0],
    [-225.0,  170.0, -135.0],
    [ 225.0,  170.0, -135.0],
    [-150.0, -150.0, -125.0],
    [ 150.0, -150.0, -125.0],
], dtype=np.float64)

LEFT_EYE_IDS  = [33, 7, 163, 144, 145, 153, 154, 155, 133]
RIGHT_EYE_IDS = [362, 382, 381, 380, 374, 373, 390, 249, 263]

LOWER_FACE_IDS = [61, 291, 17, 152, 13, 14, 78, 308]

MOUTH_LEFT_ID  = 61
MOUTH_RIGHT_ID = 291

NOSE_TIP_ID  = 1
CHIN_ID      = 152
FOREHEAD_ID  = 10

# ── Thresholds ────────────────────────────────────────────────────────────────

BRIGHTNESS_MIN      = 60
BRIGHTNESS_MAX      = 210
GLASSES_GLARE_RATIO = 0.06

# Blur: Laplacian variance on the face crop.
# Below this → frame is too blurry to produce a reliable embedding.
# 80 is a good starting point for 480p webcams under normal indoor lighting.
# Lower to 60 if older cameras are being falsely blocked.
# Raise to 100 if embeddings still come back soft despite passing this gate.
BLUR_THRESHOLD = 80.0

POSE_YAW_CENTER   = 25
POSE_PITCH_CENTER = 25
POSE_SIDE_MIN     = 15
POSE_TILT_MIN     = 12

MOUTH_NARROW_RATIO  = 0.55
LOWER_DISP_RATIO    = 0.15

TILT_UP_RATIO_MIN   = 0.65
TILT_DOWN_RATIO_MIN = 0.38


# ── Request / response models ─────────────────────────────────────────────────

class FrameValidationRequest(BaseModel):
    image:         str
    expected_pose: str = "center"


class FrameValidationResponse(BaseModel):
    face_detected:    bool
    mask_detected:    bool
    blur_ok:          bool   # NEW — True when face crop is sharp enough
    pose_ok:          bool
    pose_label:       str
    message:          str
    glasses_detected: bool
    glasses_warning:  bool


# ── Helpers ───────────────────────────────────────────────────────────────────

def _decode_frame(b64: str) -> np.ndarray:
    if "," in b64:
        b64 = b64.split(",")[1]
    buf = np.frombuffer(base64.b64decode(b64), np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img


def _check_brightness(frame_bgr: np.ndarray) -> dict:
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    lum  = float(np.mean(gray))
    if lum < BRIGHTNESS_MIN:
        return {"ok": False, "message": "Too dark — improve your lighting"}
    if lum > BRIGHTNESS_MAX:
        return {"ok": False, "message": "Too bright — reduce glare or step back"}
    return {"ok": True, "message": "Lighting looks good"}


def _check_glasses(frame_bgr: np.ndarray, landmarks, w: int, h: int) -> dict:
    """
    Glare-based glasses detection — SOFT check only.
    Never blocks. Frontend renders result as an amber badge.
    """
    eye_pts = []
    for idx in LEFT_EYE_IDS + RIGHT_EYE_IDS:
        lm = landmarks[idx]
        eye_pts.append((int(lm.x * w), int(lm.y * h)))

    if not eye_pts:
        return {"ok": True, "message": "Eye region unclear"}

    xs  = [p[0] for p in eye_pts]
    ys  = [p[1] for p in eye_pts]
    x1  = max(0,     min(xs) - 10)
    y1  = max(0,     min(ys) - 10)
    x2  = min(w - 1, max(xs) + 10)
    y2  = min(h - 1, max(ys) + 10)

    if x2 <= x1 or y2 <= y1:
        return {"ok": True, "message": "Eye region too small"}

    eye_roi = frame_bgr[y1:y2, x1:x2]
    if eye_roi.size == 0:
        return {"ok": True, "message": "Eye region empty"}

    hsv         = cv2.cvtColor(eye_roi, cv2.COLOR_BGR2HSV)
    glare_mask  = (hsv[:, :, 2] > 220) & (hsv[:, :, 1] < 40)
    glare_ratio = float(np.sum(glare_mask)) / max(eye_roi.shape[0] * eye_roi.shape[1], 1)

    if glare_ratio > GLASSES_GLARE_RATIO:
        return {"ok": False, "message": "Glasses detected — may reduce accuracy"}
    return {"ok": True, "message": "No glasses detected"}


def _check_blur(frame_bgr: np.ndarray, landmarks, w: int, h: int) -> dict:
    """
    Measures sharpness using Laplacian variance on the face crop only.

    Why crop to the face and not use the full frame:
      A busy or textured background inflates the full-frame Laplacian score,
      making a blurry face appear sharp. Cropping to the face region isolates
      exactly what ArcFace will process — the same technique your teammate
      already uses in calculate_face_quality() on the embedding side.

    Why Laplacian variance:
      The Laplacian is an edge detector. A sharp face has many strong edges
      → high variance. A motion-blurred or out-of-focus face has soft edges
      → low variance. This is fast — no model, just one OpenCV call.

    Threshold notes (BLUR_THRESHOLD = 80.0):
      - Score < 80  → blurry, block the frame
      - Score 80–150 → acceptable for 480p webcams
      - Score > 150 → sharp, no issue
      Tune BLUR_THRESHOLD at the top of the file if needed.
    """
    xs = [int(lm.x * w) for lm in landmarks]
    ys = [int(lm.y * h) for lm in landmarks]

    x1 = max(0,     min(xs) - 10)
    y1 = max(0,     min(ys) - 10)
    x2 = min(w - 1, max(xs) + 10)
    y2 = min(h - 1, max(ys) + 10)

    face_crop = frame_bgr[y1:y2, x1:x2]

    # Guard: crop too small to measure reliably — pass silently.
    # The face-detected gate already ensures landmarks exist, so this
    # only fires if the face is extremely close to the frame edge.
    if face_crop.size == 0 or face_crop.shape[0] < 20 or face_crop.shape[1] < 20:
        return {"ok": True, "score": 0.0, "message": ""}

    gray  = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    score = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    if score < BLUR_THRESHOLD:
        return {
            "ok":      False,
            "score":   round(score, 1),
            "message": "Hold still — image is too blurry",
        }
    return {"ok": True, "score": round(score, 1), "message": ""}


def _check_occlusion(landmarks, w: int, h: int) -> bool:
    """
    Detects a hand or object covering the mouth area using two signals.

    Signal A — Mouth-corner horizontal compression:
      Normal mouth width ≈ 55–65% of inter-eye distance.
      A hand pressed over the mouth squeezes corners inward below MOUTH_NARROW_RATIO.

    Signal B — Whole lower-face vertical displacement:
      The centroid of LOWER_FACE_IDS should sit ~60% of the way from nose to chin.
      A hand or mask pushes those landmarks upward toward the nose.

    Either signal alone is enough to flag occlusion.
    """
    nose_y = landmarks[NOSE_TIP_ID].y
    chin_y = landmarks[CHIN_ID].y
    face_h = abs(chin_y - nose_y)

    if face_h < 0.001:
        return False

    left_eye_x  = landmarks[33].x
    right_eye_x = landmarks[263].x
    eye_width   = abs(right_eye_x - left_eye_x)

    mouth_left_x  = landmarks[MOUTH_LEFT_ID].x
    mouth_right_x = landmarks[MOUTH_RIGHT_ID].x
    mouth_width   = abs(mouth_right_x - mouth_left_x)

    mouth_compressed = (eye_width > 0.001) and (mouth_width < eye_width * MOUTH_NARROW_RATIO)

    expected_y = nose_y + face_h * 0.60
    lower_ys   = [landmarks[idx].y for idx in LOWER_FACE_IDS]
    actual_y   = float(np.mean(lower_ys))
    displaced  = (expected_y - actual_y) > (face_h * LOWER_DISP_RATIO)

    return mouth_compressed or displaced


def _estimate_pose(landmarks, w: int, h: int) -> Optional[dict]:
    """
    Head pose via solvePnP + Rodrigues → atan2 extraction.
    Also computes landmark ratios for camera-independent up/down detection.
    """
    image_pts = np.array(
        [[landmarks[idx].x * w, landmarks[idx].y * h] for idx in POSE_LANDMARK_IDS],
        dtype=np.float64,
    )
    focal   = float(w)
    cam_mat = np.array(
        [[focal, 0, w / 2],
         [0, focal, h / 2],
         [0,     0,     1]],
        dtype=np.float64,
    )

    ok, rvec, _ = cv2.solvePnP(
        POSE_3D_MODEL, image_pts, cam_mat, np.zeros((4, 1)),
        flags=cv2.SOLVEPNP_ITERATIVE,
    )
    if not ok:
        return None

    rot_mat, _ = cv2.Rodrigues(rvec)

    pitch = math.atan2(-rot_mat[2, 0],
                        math.sqrt(rot_mat[2, 1]**2 + rot_mat[2, 2]**2))
    yaw   = math.atan2(rot_mat[1, 0], rot_mat[0, 0])
    roll  = math.atan2(rot_mat[2, 1], rot_mat[2, 2])

    nose_y     = landmarks[NOSE_TIP_ID].y
    chin_y     = landmarks[CHIN_ID].y
    forehead_y = landmarks[FOREHEAD_ID].y
    full_h     = abs(chin_y - forehead_y)

    nose_chin_ratio     = (abs(chin_y - nose_y)     / full_h) if full_h > 0.001 else 0.5
    nose_forehead_ratio = (abs(nose_y - forehead_y) / full_h) if full_h > 0.001 else 0.5

    return {
        "yaw":                 round(math.degrees(yaw),   1),
        "pitch":               round(math.degrees(pitch), 1),
        "roll":                round(math.degrees(roll),  1),
        "nose_chin_ratio":     round(nose_chin_ratio,     3),
        "nose_forehead_ratio": round(nose_forehead_ratio, 3),
    }


def _check_pose(pose: dict, expected: str) -> dict:
    """
    Center / left / right: solvePnP angle only.
    Up / down: OR logic — either pitch angle OR landmark ratio passing is enough.
    """
    yaw   = pose["yaw"]
    pitch = pose["pitch"]
    ncr   = pose.get("nose_chin_ratio",     0.5)
    nfr   = pose.get("nose_forehead_ratio", 0.5)

    tilt_up_by_ratio   = ncr > TILT_UP_RATIO_MIN
    tilt_down_by_ratio = nfr > TILT_DOWN_RATIO_MIN

    rules = {
        "center": lambda: abs(yaw) <= POSE_YAW_CENTER and abs(pitch) <= POSE_PITCH_CENTER,
        "left":   lambda: yaw  < -POSE_SIDE_MIN,
        "right":  lambda: yaw  >  POSE_SIDE_MIN,
        "up":     lambda: (pitch < -POSE_TILT_MIN) or tilt_up_by_ratio,
        "down":   lambda: (pitch >  POSE_TILT_MIN) or tilt_down_by_ratio,
    }

    instructions = {
        "center": "Look straight at the camera",
        "left":   "Turn your head slightly to the LEFT",
        "right":  "Turn your head slightly to the RIGHT",
        "up":     "Tilt your chin DOWN slightly (~15–25°) so your face points upward",
        "down":   "Tilt your chin UP slightly (~15–25°) so your face points downward",
    }

    rule = rules.get(expected)
    if rule and rule():
        return {"ok": True, "pose_label": expected, "message": f"Pose correct: {expected}"}
    return {
        "ok":         False,
        "pose_label": expected,
        "message":    instructions.get(expected, "Adjust head position"),
    }


# ── Endpoint ──────────────────────────────────────────────────────────────────

@app.post("/validate-frame", response_model=FrameValidationResponse)
async def validate_frame(data: FrameValidationRequest):
    """
    Polled every 600 ms by RegisterStudentCam.jsx via Node.js.

    Priority waterfall — each gate only runs if the one above it passed.
    Blur sits between occlusion and pose: once we know the face is visible
    and unobstructed, we check if the frame is sharp enough before asking
    the user to hold a specific angle.

    Never writes to DB. Never calls ArcFace.
    """
    try:
        frame = _decode_frame(data.image)
    except Exception:
        raise HTTPException(400, "Could not decode image")

    h, w = frame.shape[:2]

    # ── Gate 1: Brightness ────────────────────────────────────────────────────
    brightness = _check_brightness(frame)
    if not brightness["ok"]:
        return FrameValidationResponse(
            face_detected=False, mask_detected=False,
            blur_ok=True,        pose_ok=False,
            pose_label="unknown", message=brightness["message"],
            glasses_detected=False, glasses_warning=False,
        )

    # ── Gate 2: Face detection ────────────────────────────────────────────────
    rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = _face_mesh.process(rgb)

    if not result.multi_face_landmarks:
        return FrameValidationResponse(
            face_detected=False, mask_detected=False,
            blur_ok=True,        pose_ok=False,
            pose_label="unknown",
            message="Move closer — position your face in the oval",
            glasses_detected=False, glasses_warning=False,
        )

    landmarks = result.multi_face_landmarks[0].landmark

    # ── Soft check: Glasses (always runs when face is visible, never blocks) ──
    glasses_result   = _check_glasses(frame, landmarks, w, h)
    glasses_detected = not glasses_result["ok"]

    # ── Gate 3: Occlusion ─────────────────────────────────────────────────────
    mask_detected = _check_occlusion(landmarks, w, h)
    if mask_detected:
        return FrameValidationResponse(
            face_detected=True,  mask_detected=True,
            blur_ok=True,        pose_ok=False,
            pose_label="unknown",
            message="Remove any face covering or mask",
            glasses_detected=glasses_detected, glasses_warning=glasses_detected,
        )

    # ── Gate 4: Blur (Laplacian on face crop) ─────────────────────────────────
    blur_result = _check_blur(frame, landmarks, w, h)
    if not blur_result["ok"]:
        return FrameValidationResponse(
            face_detected=True,  mask_detected=False,
            blur_ok=False,       pose_ok=False,
            pose_label="unknown",
            message=blur_result["message"],
            glasses_detected=glasses_detected, glasses_warning=glasses_detected,
        )

    # ── Gate 5: Head pose ─────────────────────────────────────────────────────
    pose_angles = _estimate_pose(landmarks, w, h)
    pose_check  = (
        _check_pose(pose_angles, data.expected_pose)
        if pose_angles is not None
        else {"ok": False, "pose_label": "unknown",
              "message": "Could not read head pose — face the camera"}
    )

    message = "All checks passed" if pose_check["ok"] else pose_check["message"]

    return FrameValidationResponse(
        face_detected    = True,
        mask_detected    = False,
        blur_ok          = True,
        pose_ok          = pose_check["ok"],
        pose_label       = pose_check["pose_label"],
        message          = message,
        glasses_detected = glasses_detected,
        glasses_warning  = glasses_detected,
    )

# ----------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)