"""Generates a short synthetic .mp4 so the capture/detect/MJPEG pipeline can
be smoke-tested (opens, loops, encodes) without a real CCTV clip on hand.

This does NOT exercise real detection — a plain rectangle isn't something
YOLO will classify as a person/vehicle. It only proves the infrastructure
(capture -> detect (finds nothing, which is fine) -> overlay -> JPEG -> MJPEG)
runs without crashing. Swap in a real clip with people/vehicles in it before
the actual demo rehearsal (see README "Demo rehearsal + hardening").

Usage: uv run python samples/generate_smoketest_clip.py
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

OUTPUT_PATH = Path(__file__).parent / "demo.mp4"
WIDTH, HEIGHT, FPS, DURATION_SECONDS = 640, 480, 15, 5


def main() -> None:
    writer = cv2.VideoWriter(
        str(OUTPUT_PATH), cv2.VideoWriter_fourcc(*"mp4v"), FPS, (WIDTH, HEIGHT)
    )
    total_frames = FPS * DURATION_SECONDS

    for i in range(total_frames):
        frame = np.full((HEIGHT, WIDTH, 3), 30, dtype=np.uint8)
        x = int((i / total_frames) * (WIDTH - 80))
        cv2.rectangle(frame, (x, 200), (x + 60, 380), (80, 180, 80), -1)
        cv2.putText(
            frame, f"frame {i}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2
        )
        writer.write(frame)

    writer.release()
    print(f"Wrote {total_frames} frames to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
