from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
import base64
import cv2
import onnxruntime as ort

app = FastAPI()

# Load models
detector = ort.InferenceSession("models/scrfd.onnx", providers=["CPUExecutionProvider"])
recognizer = ort.InferenceSession("models/arcface.onnx", providers=["CPUExecutionProvider"])

class ImageRequest(BaseModel):
    images: list[str]

def base64_to_image(base64_string):
    image_data = base64.b64decode(base64_string.split(",")[1])
    np_arr = np.frombuffer(image_data, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

def detect_face(img):
    input_name = detector.get_inputs()[0].name
    input_shape = detector.get_inputs()[0].shape

    resized = cv2.resize(img, (640, 640))
    blob = resized.astype(np.float32)
    blob = np.transpose(blob, (2, 0, 1))
    blob = np.expand_dims(blob, axis=0)

    outputs = detector.run(None, {input_name: blob})

    # Simplified: take center crop fallback
    h, w, _ = img.shape
    return img[int(h*0.15):int(h*0.85), int(w*0.15):int(w*0.85)]

def preprocess_face(face_img):
    face_img = cv2.resize(face_img, (112, 112))
    face_img = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
    face_img = face_img.astype(np.float32) / 255.0
    face_img = np.transpose(face_img, (2, 0, 1))
    face_img = np.expand_dims(face_img, axis=0)
    return face_img

def get_embedding(img):
    face = detect_face(img)
    face_input = preprocess_face(face)

    input_name = recognizer.get_inputs()[0].name
    embedding = recognizer.run(None, {input_name: face_input})[0]

    embedding = embedding.flatten()
    embedding = embedding / np.linalg.norm(embedding)

    return embedding

@app.post("/generate-embedding")
def generate_embedding(data: ImageRequest):
    print("Images received:", len(data.images))
    embeddings = []

    for img_str in data.images:
        img = base64_to_image(img_str)
        emb = get_embedding(img)
        embeddings.append(emb)

    final_embedding = np.mean(embeddings, axis=0)

    return {
        "embedding": final_embedding.tolist()
    }