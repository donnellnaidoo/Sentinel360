"""Finds connected webcams (e.g. an Insta360 X3 in USB webcam mode), works
out which one is a 360° camera, and points the AI service at it.

Usage (from apps/ai):
    uv run python scripts/find_camera.py            # detect + update .env
    uv run python scripts/find_camera.py --dry-run  # detect only

For each camera it saves a preview to camera_previews/cam<N>.jpg and
classifies the picture:
  360-panorama  2:1 equirectangular (stitched) — used with STREAM_PANORAMIC=true
  dual-fisheye  2:1 with two lens circles (black corners) — not supported yet
  normal        ordinary webcam picture

Then it writes STREAM_SOURCE / STREAM_PANORAMIC into .env. Restart the AI
service afterwards.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

AI_ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = AI_ROOT / ".env"
PREVIEW_DIR = AI_ROOT / "camera_previews"
MAX_DEVICES = 6
# Cameras often send a few dark frames while starting up.
WARMUP_FRAMES = 15


@dataclass
class Camera:
    index: int
    width: int
    height: int
    kind: str  # "360-panorama" | "dual-fisheye" | "normal"


def classify(frame: np.ndarray) -> str:
    height, width = frame.shape[:2]
    if abs(width / height - 2.0) > 0.05:
        return "normal"
    # A dual-fisheye frame is two lens circles side by side: its four
    # corners fall outside both circles and are black. A stitched panorama
    # has picture content right into the corners.
    patch = max(4, height // 20)
    corners = [
        frame[:patch, :patch],
        frame[:patch, -patch:],
        frame[-patch:, :patch],
        frame[-patch:, -patch:],
    ]
    if all(float(c.mean()) < 12 for c in corners) and float(frame.mean()) > 20:
        return "dual-fisheye"
    return "360-panorama"


def open_device(index: int) -> cv2.VideoCapture:
    # DirectShow is the most reliable backend for USB webcams on Windows.
    if sys.platform.startswith("win"):
        return cv2.VideoCapture(index, cv2.CAP_DSHOW)
    return cv2.VideoCapture(index)


def probe(index: int) -> tuple[Camera, np.ndarray] | None:
    cap = open_device(index)
    try:
        if not cap.isOpened():
            return None
        frame = None
        for _ in range(WARMUP_FRAMES):
            ok, candidate = cap.read()
            if ok and candidate is not None:
                frame = candidate
        if frame is None:
            return None
        height, width = frame.shape[:2]
        return Camera(index, width, height, classify(frame)), frame
    finally:
        cap.release()


def choose(cameras: list[Camera]) -> Camera | None:
    panoramas = [c for c in cameras if c.kind == "360-panorama"]
    if len(panoramas) == 1:
        return panoramas[0]
    if len(panoramas) > 1:
        return max(panoramas, key=lambda c: c.width * c.height)
    return None


def update_env(text: str, values: dict[str, str]) -> str:
    """Sets KEY=value lines, replacing existing ones and appending new ones,
    leaving every other line untouched."""
    lines = text.splitlines()
    remaining = dict(values)
    for i, line in enumerate(lines):
        key = line.split("=", 1)[0].strip()
        if key in remaining and not line.lstrip().startswith("#"):
            lines[i] = f"{key}={remaining.pop(key)}"
    lines.extend(f"{key}={value}" for key, value in remaining.items())
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="detect only; don't change .env")
    args = parser.parse_args()

    PREVIEW_DIR.mkdir(exist_ok=True)
    print("Looking for cameras (this takes a few seconds)...\n")
    cameras: list[Camera] = []
    for index in range(MAX_DEVICES):
        found = probe(index)
        if found is None:
            continue
        camera, frame = found
        preview = PREVIEW_DIR / f"cam{index}.jpg"
        cv2.imwrite(str(preview), frame)
        cameras.append(camera)
        print(f"  camera {index}: {camera.width}x{camera.height}  {camera.kind:13}  preview: {preview.relative_to(AI_ROOT)}")

    if not cameras:
        print("No cameras found. Is the X3 connected by USB and set to Webcam mode?")
        return 1

    chosen = choose(cameras)
    if chosen is None:
        print()
        if any(c.kind == "dual-fisheye" for c in cameras):
            print("The 360 camera is sending two fisheye circles, not a stitched panorama.")
            print("Set the X3 to 360 mode before connecting, or send camera_previews/ to the dev team.")
        else:
            print("No 360 panorama found (only normal webcams). Is the X3 in Webcam mode and 360 mode?")
        print("To use a normal webcam anyway: set STREAM_SOURCE=<camera number> in .env")
        return 1

    values = {"STREAM_SOURCE": str(chosen.index), "STREAM_PANORAMIC": "true"}
    print(f"\n360 camera found: camera {chosen.index} ({chosen.width}x{chosen.height}).")
    if args.dry_run:
        print("Dry run — .env not changed. Would set: " + ", ".join(f"{k}={v}" for k, v in values.items()))
        return 0

    existing = ENV_PATH.read_text() if ENV_PATH.exists() else ""
    ENV_PATH.write_text(update_env(existing, values))
    print(f"Updated {ENV_PATH.name}: " + ", ".join(f"{k}={v}" for k, v in values.items()))
    print("\nNow restart the AI service (Ctrl+C, then):")
    print("  uv run uvicorn app.main:app --host 127.0.0.1 --port 8001")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
