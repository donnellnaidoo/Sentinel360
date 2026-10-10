"""Downloads the ready-made models into models/ — no training needed.

  uv run python scripts/download_models.py

Each file comes from a fixed version (a commit or release, not "latest") and
is checked against a known SHA-256 before it's installed. A file that's
already in models/ is never replaced — e.g. the model team's yolov8n.pt
stays exactly as handed over.

  yolov8n.pt                         knives + persons (COCO; the model team's choice)
  threat_yolov8n.pt                  guns (public YOLOv8n threat model, MIT licence)
  face_detection_yunet_2023mar.onnx  face crops on every docket
  face_recognition_sface_2021dec.onnx  watchlist matching (only used if FACE_RECOGNITION_ENABLED)
  yolo11n-pose.pt                    fight/fall rules (only used if POSE_ENABLED)

The SlowFast anomaly model (slowfast_ucfcrime_binary.pth) isn't public — it
comes from the model team's handoff; see README.
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

import httpx

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

# name -> (url, sha256)
MODELS: dict[str, tuple[str, str]] = {
    "yolov8n.pt": (
        "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolov8n.pt",
        "f59b3d833e2ff32e194b5bb8e08d211dc7c5bdf144b90d2c8412c47ccfc83b36",
    ),
    # https://huggingface.co/Subh775/Threat-Detection-YOLOv8n — classes Gun,
    # explosion, grenade, knife; only Gun is used (WEAPON_EXTRA_LABELS).
    "threat_yolov8n.pt": (
        "https://huggingface.co/Subh775/Threat-Detection-YOLOv8n/resolve/"
        "c6d6fa4e6c9bfd4c4fccb46478db23609e5468fb/weights/best.pt",
        "86c43444ae8319d2276dd300edc3e7f7a1137fe7566737f994ca579ad770f6ce",
    ),
    "face_detection_yunet_2023mar.onnx": (
        "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4",
    ),
    "face_recognition_sface_2021dec.onnx": (
        "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
        "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79",
    ),
    "yolo11n-pose.pt": (
        "https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo11n-pose.pt",
        "869e83fcdffdc7371fa4e34cd8e51c838cc729571d1635e5141e3075e9319dc0",
    ),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    MODELS_DIR.mkdir(exist_ok=True)
    failed = []
    for name, (url, expected) in MODELS.items():
        target = MODELS_DIR / name
        if target.is_file():
            note = "" if sha256(target) == expected else " (your own copy, kept)"
            print(f"  present   {name}{note}")
            continue
        print(f"  download  {name} ...", end="", flush=True)
        partial = target.with_suffix(target.suffix + ".part")
        try:
            with httpx.stream("GET", url, follow_redirects=True, timeout=60.0) as response:
                response.raise_for_status()
                with partial.open("wb") as f:
                    for chunk in response.iter_bytes():
                        f.write(chunk)
        except httpx.HTTPError as exc:
            partial.unlink(missing_ok=True)
            print(f" failed: {exc}")
            failed.append(name)
            continue
        actual = sha256(partial)
        if actual != expected:
            partial.unlink()
            print(f" checksum mismatch (got {actual[:12]}…) — not installed")
            failed.append(name)
            continue
        partial.replace(target)
        print(f" {target.stat().st_size / 1e6:.1f} MB")

    if failed:
        print(f"\nCould not install: {', '.join(failed)}")
        return 1
    print("\nAll models ready. Restart the AI service to pick them up.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
