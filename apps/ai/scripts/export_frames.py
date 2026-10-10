"""Exports frames from your own clips as images to label for training the
weapon model (scripts/train_weapon.py).

A model fine-tuned only on internet photos still struggles with the X3's
views (wide angle, dewarped, low light). A few hundred labelled frames from
the real camera fix much of that. This writes the same perspective views
the detector sees — so labels drawn on them match what it gets live.

  uv run python scripts/export_frames.py eval/clips/*.mp4 --every 0.5
  -> eval/frames/<clip>_<seconds>_<view>.jpg

Upload eval/frames/ to your labelling tool (Roboflow, CVAT, Label Studio),
draw boxes for knife / pistol / rifle (plus person if your dataset has
it), and export in "YOLO" format. Include frames with NO weapon too (phones,
remotes, tools in hand) — they teach the model what not to fire on.

Don't label frames from clips you use in eval/labels.json: a model tested
on frames it trained on looks better than it is.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("clips", nargs="+", type=Path)
    parser.add_argument("--every", type=float, default=1.0, help="seconds between exported frames")
    parser.add_argument("--panoramic", action=argparse.BooleanOptionalAction, default=None,
                        help="split 360 panoramas into 4 views (default: guess from the 2:1 shape)")
    parser.add_argument("--out", type=Path, default=AI_ROOT / "eval" / "frames")
    args = parser.parse_args()

    sys.path.insert(0, str(AI_ROOT))
    import cv2

    from app.pipeline.capture import Frame
    from app.pipeline.dewarp import ViewSplitter

    args.out.mkdir(parents=True, exist_ok=True)
    splitter = ViewSplitter()
    total = 0
    for path in args.clips:
        capture = cv2.VideoCapture(str(path))
        if not capture.isOpened():
            print(f"  ! cannot open {path}")
            continue
        fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
        index, next_t, written = 0, 0.0, 0
        while True:
            ok, image = capture.read()
            if not ok:
                break
            t = index / fps
            index += 1
            if t + 1e-6 < next_t:
                continue
            next_t += args.every
            height, width = image.shape[:2]
            panoramic = args.panoramic if args.panoramic is not None else abs(width / height - 2.0) < 0.05
            views = splitter.split(Frame(image, index, t, panoramic=panoramic))
            for view, view_image in views.items():
                cv2.imwrite(str(args.out / f"{path.stem}_{t:07.2f}_{view}.jpg"), view_image, [cv2.IMWRITE_JPEG_QUALITY, 95])
                written += 1
        capture.release()
        total += written
        print(f"  {path.name}: {written} images")
    print(f"Wrote {total} images to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
