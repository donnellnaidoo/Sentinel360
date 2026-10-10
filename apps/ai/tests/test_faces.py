"""Face crops for docket evidence: every face across all views, largest
first, capped, and resized small enough for the backend's per-face limit."""

import cv2
import numpy as np

from app.config import settings
from app.pipeline.faces import FaceDetector, _crop_face, load_face_detector


class _ScriptedFaces(FaceDetector):
    """Real crop/encode logic with scripted detections per view (by mean
    pixel value, since views are flat-colour test images)."""

    def __init__(self, faces_by_value: dict[int, list[tuple[float, tuple[int, int, int, int]]]]):
        self.min_size = 0
        self._faces_by_value = faces_by_value

    def detect_with_landmarks(self, image):
        return [(conf, bbox, None) for conf, bbox in self._faces_by_value.get(int(image.mean()), [])]


def test_real_model_finds_nothing_on_a_blank_frame():
    detector = FaceDetector()
    assert detector.detect(np.full((360, 480, 3), 90, dtype=np.uint8)) == []


def test_crops_keep_all_views_largest_first_and_cap():
    views = {
        "Front": np.full((360, 480, 3), 10, dtype=np.uint8),
        "Rear": np.full((360, 480, 3), 20, dtype=np.uint8),
    }
    detector = _ScriptedFaces(
        {
            10: [(0.9, (0, 0, 20, 20)), (0.8, (100, 100, 200, 200))],
            20: [(0.95, (50, 50, 110, 110)), (0.7, (300, 10, 330, 40))],
        }
    )

    crops = detector.crops(views, max_faces=3)

    assert [(c.view, c.bbox) for c in crops] == [
        ("Front", (100, 100, 200, 200)),
        ("Rear", (50, 50, 110, 110)),
        ("Rear", (300, 10, 330, 40)),
    ]
    decoded = cv2.imdecode(np.frombuffer(crops[0].jpeg, np.uint8), cv2.IMREAD_COLOR)
    assert abs(int(decoded.mean()) - 10) <= 2  # cropped from the right view


def test_crop_is_padded_clipped_and_downscaled():
    image = np.zeros((1000, 1000, 3), dtype=np.uint8)
    assert _crop_face(image, (0, 0, 100, 100), 0.5, 256).shape == (150, 150, 3)  # padded, clipped at 0
    assert max(_crop_face(image, (100, 100, 900, 700), 0.0, 256).shape[:2]) == 256


def test_missing_model_disables_faces_instead_of_failing(monkeypatch):
    monkeypatch.setattr(settings, "face_model_path", "models/does-not-exist.onnx")
    detector, reason = load_face_detector()
    assert detector is None
    assert "not found" in reason


def test_disabled_by_setting(monkeypatch):
    monkeypatch.setattr(settings, "face_enabled", False)
    assert load_face_detector() == (None, "disabled by FACE_ENABLED")
