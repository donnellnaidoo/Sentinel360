"""Sanity checks for StreamCapture against the synthetic smoketest clip
(samples/generate_smoketest_clip.py). Does not exercise a real RTSP source —
that needs a live camera and is covered by manual demo rehearsal instead.
"""

import threading
import time
from pathlib import Path

import numpy as np
import pytest

from app.pipeline.capture import Frame, LatestFrameReader, StreamCapture, is_live_source

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


# --- LatestFrameReader / frame tap ---------------------------------------------

class _FakeSource:
    """Delivers `count` frames as fast as asked, then blocks until stopped
    (like the X3 stitcher), or raises `error` after them."""

    last_error = None

    def __init__(self, count: int, error: Exception | None = None):
        self.count = count
        self.error = error
        self.stop_event = threading.Event()
        self.index = 0

    def open(self): ...
    def close(self): ...
    def __enter__(self):
        return self
    def __exit__(self, *exc):
        self.close()

    def read(self):
        if self.index < self.count:
            self.index += 1
            return Frame(np.zeros((2, 2, 3), np.uint8), self.index, float(self.index))
        if self.error is not None:
            raise self.error
        self.stop_event.wait()
        return None


def test_reader_taps_every_frame_and_returns_the_newest():
    tapped = []
    source = _FakeSource(count=20)
    with LatestFrameReader(source, on_frame=lambda f: tapped.append(f.frame_index)) as reader:
        deadline = time.time() + 2
        while len(tapped) < 20 and time.time() < deadline:
            time.sleep(0.01)
        frame = reader.read()
    assert tapped == list(range(1, 21))
    assert frame is not None and frame.frame_index == 20


def test_reader_reraises_source_errors_on_the_pipeline_thread():
    with LatestFrameReader(_FakeSource(count=0, error=ValueError("bad header"))) as reader:
        with pytest.raises(ValueError, match="bad header"):
            reader.read()


def test_a_failing_tap_does_not_stop_capture():
    def broken(_frame):
        raise RuntimeError("tap bug")

    with LatestFrameReader(_FakeSource(count=3), on_frame=broken) as reader:
        assert reader.read() is not None


def test_live_sources():
    assert is_live_source("x3tcp://127.0.0.1:5001")
    assert is_live_source("rtsp://cam/x3") and is_live_source("0")
    assert not is_live_source("samples/demo.mp4")
