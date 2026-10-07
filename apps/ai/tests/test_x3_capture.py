"""X3TcpCapture against a fake Sentinel360X3Stitcher.exe — the real stitcher
is Windows-only, so the wire format is exercised with a local TCP server.
"""

import socket
import struct
import threading
import time

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

    webcam = open_capture("0")
    assert isinstance(webcam, StreamCapture) and webcam._is_device and webcam._is_network
    assert open_capture("1", panoramic=True).panoramic is True


def test_x3_url_requires_port():
    with pytest.raises(ValueError):
        X3TcpCapture.from_url("x3tcp://127.0.0.1")


def _free_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def test_waits_for_a_stitcher_that_starts_later():
    port = _free_port()
    rgb = np.zeros((480, 960, 3), dtype=np.uint8)

    def start_late() -> None:
        time.sleep(0.5)
        server = socket.socket()
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(("127.0.0.1", port))
        server.listen(1)
        conn, _ = server.accept()
        with conn, server:
            conn.sendall(_x3_message(rgb))

    threading.Thread(target=start_late, daemon=True).start()

    capture = X3TcpCapture("127.0.0.1", port, reconnect_delay_seconds=0.1)
    with capture:  # must not raise "connection refused" at start
        frame = capture.read()

    assert frame is not None and frame.panoramic
    assert capture.last_error is None


def test_reports_waiting_and_stops_promptly_without_a_stitcher():
    stop = threading.Event()
    capture = X3TcpCapture("127.0.0.1", _free_port(), reconnect_delay_seconds=5, stop_event=stop)
    result: list = []
    reader = threading.Thread(target=lambda: result.append(capture.read()), daemon=True)

    with capture:
        reader.start()
        time.sleep(0.3)
        assert capture.last_error and "Sentinel360X3Stitcher.exe" in capture.last_error
        stop.set()
        reader.join(timeout=2)

    assert not reader.is_alive(), "Stop must interrupt the retry wait"
    assert result == [None]
