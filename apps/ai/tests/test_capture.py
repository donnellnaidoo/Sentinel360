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


@pytest.mark.skipif(not DEMO_CLIP.exists(), reason="run samples/generate_smoketest_clip.py first")
def test_live_source_returns_newest_frame_not_a_backlog():
    """A live stream outpaces the ~5 fps pipeline; frames that arrived while
    we were busy must be skipped, not queued (otherwise latency grows)."""
    import threading
    import time

    stop = threading.Event()
    with StreamCapture(str(DEMO_CLIP), loop=True, live=True, stop_event=stop) as capture:
        first = capture.read()
        time.sleep(0.3)  # "processing" while the source keeps producing
        second = capture.read()
        third = capture.read()

        assert first is not None and second is not None and third is not None
        assert second.frame_index > first.frame_index + 1  # skipped the backlog
        assert third.frame_index > second.frame_index  # never the same frame twice

        stop.set()
        started = time.time()
        assert capture.read() is None
        assert time.time() - started < 1.0


def test_rtsp_and_webcam_sources_are_live():
    from app.pipeline.capture import open_capture

    for source in ("rtsp://127.0.0.1:8554/x3", "rtmp://127.0.0.1:1935/x3", "0"):
        capture = open_capture(source)
        assert capture._live, source
    assert not open_capture("samples/demo.mp4")._live
