"""Records a clip from the camera for the evaluation set (eval/).

Reads STREAM_SOURCE exactly as the pipeline does (X3 stitcher, network
camera, webcam) and saves what arrives — the raw panorama for an X3, so
evaluate.py splits it into the same four views. Run it while the pipeline
is stopped: a camera can only be opened once.

  uv run python scripts/record_clip.py knife_front_01 --seconds 20
  uv run python scripts/record_clip.py normal_corridor_01 --seconds 300

Then add the clip to eval/labels.json with the times (seconds from the
start) of anything that should raise an alarm. Write them down while
recording — "knife out at 0:07, put away at 0:13" — it's much easier than
scrubbing through afterwards.
"""

from __future__ import annotations

import argparse
import sys
import threading
import time
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parent.parent
CLIPS_DIR = AI_ROOT / "eval" / "clips"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("name", help="file name without extension, e.g. knife_front_01")
    parser.add_argument("--seconds", type=float, default=20.0)
    parser.add_argument("--source", help="override STREAM_SOURCE")
    parser.add_argument("--countdown", type=int, default=3, help="seconds before recording starts")
    args = parser.parse_args()

    sys.path.insert(0, str(AI_ROOT))
    import cv2

    from app.config import settings
    from app.pipeline.capture import StreamCapture, X3_SCHEME, X3TcpCapture, is_live_source

    source = args.source or settings.stream_source
    if not is_live_source(source):
        print(f"{source} is already a file — copy it into eval/clips/ instead")
        return 2
    CLIPS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = CLIPS_DIR / f"{args.name}.mp4"
    if out_path.exists():
        print(f"{out_path} already exists — pick another name")
        return 2

    stop = threading.Event()
    # Read every frame in order (not the pipeline's newest-frame mode), so
    # the clip keeps the camera's real frame rate.
    capture = (
        X3TcpCapture.from_url(source, stop_event=stop)
        if source.startswith(f"{X3_SCHEME}://")
        else StreamCapture(source, loop=False, stop_event=stop, live=False)
    )
    panoramic = source.startswith(f"{X3_SCHEME}://") or settings.stream_panoramic

    with capture:
        print(f"Connecting to {source} ...")
        first = capture.read()
        if first is None:
            print(f"No frames from {source}: {capture.last_error}")
            return 1
        for remaining in range(args.countdown, 0, -1):
            print(f"  recording in {remaining}...")
            time.sleep(1)

        frames = []
        started = time.time()
        print(f"Recording {args.seconds:.0f}s — Ctrl+C to stop early")
        try:
            while time.time() - started < args.seconds:
                frame = capture.read()
                if frame is None:
                    break
                frames.append(frame.image)
        except KeyboardInterrupt:
            pass
        elapsed = time.time() - started

    if not frames:
        print("No frames recorded")
        return 1
    # The real rate the camera delivered, so clip time == wall time.
    fps = len(frames) / elapsed
    height, width = frames[0].shape[:2]
    writer = cv2.VideoWriter(str(out_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    if not writer.isOpened():
        print(f"Could not write {out_path} ({width}x{height} at {fps:.1f} fps)")
        return 1
    for image in frames:
        writer.write(image)
    writer.release()

    print(f"Saved {out_path.relative_to(AI_ROOT)}: {elapsed:.1f}s, {len(frames)} frames ({fps:.1f} fps), {width}x{height}")
    print("Add it to eval/labels.json:")
    print(f'  {{"file": "clips/{out_path.name}", "panoramic": {str(panoramic).lower()}, "events": []}}')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
