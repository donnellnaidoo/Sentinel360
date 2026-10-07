"""Generates a short .mp4 with a real knife in it, for the end-to-end smoke
test (scripts/smoke_e2e.py): capture -> YOLO knife -> 3-frame confirmation
-> event -> backend docket with snapshot + crop evidence.

The knife is samples/knife_crop.jpg — a clean crop from the model team's own
X3 test session (yolov8n scored it 0.58 live). Placed at its original size
it scores ~0.60, above the 0.45 alarm threshold but below the 0.85 bypass,
so confirmation has to come from frame persistence, as it would live.

Timeline: 2s empty -> 4s knife (drifting slightly) -> 2s empty, so a looped
run also exercises the streak resetting between appearances.

Usage: uv run python samples/generate_knife_clip.py
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

SAMPLES = Path(__file__).parent
KNIFE_PATH = SAMPLES / "knife_crop.jpg"
OUTPUT_PATH = SAMPLES / "knife_demo.mp4"
WIDTH, HEIGHT, FPS = 640, 480, 15
EMPTY_SECONDS, KNIFE_SECONDS = 2, 4
BACKGROUND = 90


def main() -> None:
    knife = cv2.imread(str(KNIFE_PATH))
    if knife is None:
        raise SystemExit(f"Missing {KNIFE_PATH}")
    knife_h, knife_w = knife.shape[:2]

    writer = cv2.VideoWriter(str(OUTPUT_PATH), cv2.VideoWriter_fourcc(*"mp4v"), FPS, (WIDTH, HEIGHT))
    empty_frames, knife_frames = FPS * EMPTY_SECONDS, FPS * KNIFE_SECONDS
    total_frames = empty_frames * 2 + knife_frames

    for i in range(total_frames):
        frame = np.full((HEIGHT, WIDTH, 3), BACKGROUND, dtype=np.uint8)
        if empty_frames <= i < empty_frames + knife_frames:
            t = (i - empty_frames) / knife_frames
            x = int((WIDTH - knife_w) / 2 + 60 * (t - 0.5))
            y = (HEIGHT - knife_h) // 2
            frame[y : y + knife_h, x : x + knife_w] = knife
        writer.write(frame)

    writer.release()
    print(f"Wrote {total_frames} frames to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
