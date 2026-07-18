"""Sanity checks for StreamCapture against the synthetic smoketest clip
(samples/generate_smoketest_clip.py). Does not exercise a real RTSP source —
that needs a live camera and is covered by manual demo rehearsal instead.
"""

from pathlib import Path

import pytest

from app.pipeline.capture import StreamCapture

DEMO_CLIP = Path(__file__).parent.parent / "samples" / "demo.mp4"


@pytest.mark.skipif(not DEMO_CLIP.exists(), reason="run samples/generate_smoketest_clip.py first")
def test_reads_frames_in_order():
    with StreamCapture(str(DEMO_CLIP), loop=False) as capture:
        first = capture.read()
        second = capture.read()

    assert first is not None
    assert second is not None
    assert first.image.shape[:2] == (480, 640)
    assert second.frame_index == first.frame_index + 1


@pytest.mark.skipif(not DEMO_CLIP.exists(), reason="run samples/generate_smoketest_clip.py first")
def test_non_looping_source_ends():
    with StreamCapture(str(DEMO_CLIP), loop=False) as capture:
        frame_count = 0
        while capture.read() is not None:
            frame_count += 1
            if frame_count > 10_000:
                pytest.fail("source did not end — loop=False was not respected")

    assert frame_count > 0


@pytest.mark.skipif(not DEMO_CLIP.exists(), reason="run samples/generate_smoketest_clip.py first")
def test_looping_source_wraps_around():
    with StreamCapture(str(DEMO_CLIP), loop=True) as capture:
        # 5s @ 15fps = 75 frames; reading well past that proves it looped
        # instead of raising or returning None.
        frames = [capture.read() for _ in range(120)]

    assert all(frame is not None for frame in frames)
