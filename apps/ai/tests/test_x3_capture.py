"""X3TcpCapture against a fake Sentinel360X3Stitcher.exe — the real stitcher
is Windows-only, so the wire format is exercised with a local TCP server.
"""

import socket
import struct
import threading

import numpy as np
import pytest

from app.pipeline.capture import StreamCapture, X3TcpCapture, open_capture


def _serve(payloads: list[bytes]) -> tuple[int, threading.Thread]:
    server = socket.socket()
    server.bind(("127.0.0.1", 0))
    server.listen(1)
    port = server.getsockname()[1]

    def run() -> None:
        conn, _ = server.accept()
        with conn, server:
            for payload in payloads:
                conn.sendall(payload)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    return port, thread


def _x3_message(rgb: np.ndarray) -> bytes:
    height, width = rgb.shape[:2]
    return struct.pack("!III", width, height, rgb.nbytes) + rgb.tobytes()


def test_reads_rgb_frames_as_bgr_panoramas():
    rgb = np.zeros((480, 960, 3), dtype=np.uint8)
    rgb[..., 0] = 255  # pure red in RGB
    port, thread = _serve([_x3_message(rgb), _x3_message(rgb)])

    with X3TcpCapture("127.0.0.1", port) as capture:
        first = capture.read()
        second = capture.read()
    thread.join(timeout=2)

    assert first is not None and second is not None
    assert first.panoramic
    assert first.image.shape == (480, 960, 3)
    assert tuple(first.image[0, 0]) == (0, 0, 255)  # red in BGR
    assert second.frame_index == first.frame_index + 1


def test_rejects_payload_size_mismatch():
    bad = struct.pack("!III", 4, 2, 5) + b"\x00" * 5
    port, thread = _serve([bad])

    with X3TcpCapture("127.0.0.1", port) as capture, pytest.raises(ValueError, match="payload size"):
        capture.read()
    thread.join(timeout=2)


def test_open_capture_picks_source_by_scheme():
    x3 = open_capture("x3tcp://127.0.0.1:5001")
    assert isinstance(x3, X3TcpCapture)
    assert (x3.host, x3.port) == ("127.0.0.1", 5001)

    assert isinstance(open_capture("http://10.0.0.3:8081/video"), StreamCapture)
    assert isinstance(open_capture("samples/demo.mp4"), StreamCapture)


def test_x3_url_requires_port():
    with pytest.raises(ValueError):
        X3TcpCapture.from_url("x3tcp://127.0.0.1")
