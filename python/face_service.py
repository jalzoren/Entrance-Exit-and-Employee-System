from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import base64
import cv2
import onnxruntime as ort
from typing import List

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

    if face_detector is None:
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
# Cosine Similarity
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


# ----------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)