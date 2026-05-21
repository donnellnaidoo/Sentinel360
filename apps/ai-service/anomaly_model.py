from pathlib import Path
import numpy as np
import cv2
import tensorflow as tf
import os
from typing import Tuple, Dict

# Use legacy Keras API to support older model formats
os.environ['TF_USE_LEGACY_KERAS'] = '1'


class AnomalyModel:
    def __init__(self, vs_path: str = None, cl_path: str = None):
        root = Path(__file__).resolve().parents[1]
        # prefer models inside the service folder
        models_dir = root / "models"
        # default to repository-level model folder if not provided
        if vs_path is None:
            candidate = models_dir / "model_an_vs_nor.h5"
            vs_path = str(candidate if candidate.exists() else (root / "../model" / "model_an_vs_nor.h5"))
        if cl_path is None:
            candidate = models_dir / "model_an_cl.h5"
            cl_path = str(candidate if candidate.exists() else (root / "../model" / "model_an_cl.h5"))

        # Load models once
        tf.get_logger().setLevel('ERROR')
        
        self.vs_model = None
        self.cl_model = None
        self.mock_mode = False
        
        # Try multiple loading strategies for backward compatibility
        try:
            print(f"[INFO] Loading vs_model from {vs_path}")
            self.vs_model = tf.keras.models.load_model(vs_path)
            print("[INFO] vs_model loaded successfully")
        except Exception as e:
            print(f"[WARNING] Failed to load vs_model: {e}")
            print("[INFO] Model loading failed - running in mock mode for MVP testing")
            self.mock_mode = True

        try:
            print(f"[INFO] Loading cl_model from {cl_path}")
            self.cl_model = tf.keras.models.load_model(cl_path)
            print("[INFO] cl_model loaded successfully")
        except Exception as e:
            print(f"[WARNING] Failed to load cl_model: {e}")
            if not self.mock_mode:
                print("[INFO] Model loading failed - running in mock mode for MVP testing")
            self.mock_mode = True

        self.class_names = [
            "Fighting",
            "Shoplifting",
            "Abuse",
            "Arrest",
            "Shooting",
            "Robbery",
            "Explosion",
        ]

    def preprocess(self, frame: np.ndarray) -> np.ndarray:
        # Expect OpenCV BGR frames
        if frame is None:
            raise ValueError("Empty frame")
        img = cv2.resize(frame, (64, 64))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = img.astype("float32") / 255.0
        return img

    def predict(self, frame: np.ndarray, anomaly_threshold: float = 0.5) -> Dict:
        img = self.preprocess(frame)
        x = np.expand_dims(img, axis=0)

        # Mock mode: return synthetic predictions for testing if models not loaded
        if self.mock_mode or not self.vs_model:
            # Synthetic prediction: ~30% chance of anomaly
            is_anomaly = np.random.random() < 0.3
            if is_anomaly:
                classes = ["Fighting", "Shoplifting", "Abuse", "Arrest", "Shooting", "Robbery", "Explosion"]
                label = np.random.choice(classes)
                conf = float(np.random.uniform(0.6, 0.95))
                return {"anomaly": True, "type": label, "confidence": conf}
            else:
                return {"anomaly": False, "type": None, "confidence": float(np.random.uniform(0.1, 0.4))}

        # Binary anomaly detection
        try:
            vs_pred = self.vs_model.predict(x)
        except Exception:
            # fallback: some models output logits in different shapes
            vs_pred = self.vs_model(x)

        # coerce to probability
        vs_prob = float(np.squeeze(vs_pred))
        is_anomaly = vs_prob >= anomaly_threshold

        result = {"anomaly": bool(is_anomaly), "type": None, "confidence": float(vs_prob)}

        if is_anomaly and self.cl_model:
            # classify
            try:
                cl_pred = self.cl_model.predict(x)
            except Exception:
                cl_pred = self.cl_model(x)

            cl_probs = np.squeeze(cl_pred)
            if cl_probs.ndim == 0:
                # degenerate case
                idx = int(cl_probs)
                conf = 1.0
            else:
                idx = int(np.argmax(cl_probs))
                conf = float(np.max(cl_probs))

            label = self.class_names[idx] if idx < len(self.class_names) else str(idx)
            result.update({"type": label, "confidence": conf})

        return result
