"""scripts/find_camera.py logic that doesn't need a real camera."""

import importlib.util
import sys
from pathlib import Path

import cv2
import numpy as np

_spec = importlib.util.spec_from_file_location(
    "find_camera", Path(__file__).parent.parent / "scripts" / "find_camera.py"
)
find_camera = importlib.util.module_from_spec(_spec)
sys.modules["find_camera"] = find_camera  # @dataclass looks the module up here
_spec.loader.exec_module(find_camera)
Camera = find_camera.Camera


def test_classifies_normal_panorama_and_dual_fisheye():
    assert find_camera.classify(np.full((720, 1280, 3), 120, np.uint8)) == "normal"
    assert find_camera.classify(np.full((960, 1920, 3), 120, np.uint8)) == "360-panorama"

    fisheye = np.zeros((960, 1920, 3), np.uint8)
    cv2.circle(fisheye, (480, 480), 470, (140, 140, 140), -1)
    cv2.circle(fisheye, (1440, 480), 470, (140, 140, 140), -1)
    assert find_camera.classify(fisheye) == "dual-fisheye"


def test_chooses_the_panorama_over_the_laptop_webcam():
    cams = [Camera(0, 1280, 720, "normal"), Camera(1, 1920, 960, "360-panorama")]
    assert find_camera.choose(cams).index == 1
    assert find_camera.choose([Camera(0, 1280, 720, "normal")]) is None


def test_update_env_replaces_and_appends_without_touching_other_lines():
    before = "# comment\nSTREAM_SOURCE=x3tcp://127.0.0.1:5001\nBACKEND_API_KEY=secret\n"
    after = find_camera.update_env(before, {"STREAM_SOURCE": "1", "STREAM_PANORAMIC": "true"})
    assert after == "# comment\nSTREAM_SOURCE=1\nBACKEND_API_KEY=secret\nSTREAM_PANORAMIC=true\n"
