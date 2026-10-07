"""Frame source abstraction: an RTSP/HTTP camera, a looped local video file
and the Insta360 X3 stitcher are the same interface to the rest of the
pipeline (see the "support both" decision for the demo). Only this module
knows the difference — use `open_capture(source)` to get the right one.

Source formats:
  x3tcp://127.0.0.1:5001     Sentinel360X3Stitcher.exe TCP feed (equirectangular)
  rtsp://... / http://...    network camera (e.g. IP Camera Lite's /video MJPEG,
                             or the Insta360 app's live stream relayed by MediaMTX)
  0, 1, 2 ...                USB webcam by device number (0 = first camera)
  anything else              local video file path
"""

from __future__ import annotations

import logging
import os
import socket
import struct
import threading
import time
from dataclasses import dataclass
from typing import Protocol
from urllib.parse import urlparse

import cv2
import numpy as np

logger = logging.getLogger(__name__)

X3_SCHEME = "x3tcp"
_NETWORK_SCHEMES = ("rtsp://", "rtsps://", "rtmp://", "http://", "https://")


def _is_network(source: str) -> bool:
    return source.startswith(_NETWORK_SCHEMES)


def _is_device(source: str) -> bool:
    return source.strip().isdigit()


@dataclass
class Frame:
    image: np.ndarray
    frame_index: int
    timestamp: float
    # True for a 360° equirectangular panorama (X3) that must be dewarped
    # into perspective views before detection — see pipeline/dewarp.py.
    panoramic: bool = False


class FrameSource(Protocol):
    last_error: str | None

    def open(self) -> None: ...
    def close(self) -> None: ...
    def read(self) -> Frame | None: ...
    def __enter__(self) -> "FrameSource": ...
    def __exit__(self, *exc_info: object) -> None: ...


class StreamCapture:
    """Wraps cv2.VideoCapture for either a network camera or a local file.

    Network (RTSP/HTTP): reconnects on read failure (cameras drop
    connections; a demo can't die because of one dropped frame).
    File: loops back to frame 0 when `loop=True` so a short demo clip acts
    like a continuous "stream" for as long as the pipeline runs.

    Live sources (network streams, webcams) are read on a background thread
    that keeps only the newest frame. The pipeline processes ~5 fps; reading
    a 30 fps stream sequentially would let OpenCV's buffer grow and the
    picture fall further and further behind real time.
    """

    def __init__(
        self,
        source: str,
        *,
        loop: bool = True,
        reconnect_delay_seconds: float = 2.0,
        stop_event: threading.Event | None = None,
        panoramic: bool = False,
        live: bool | None = None,
    ):
        self.source = source
        self.loop = loop
        self.reconnect_delay_seconds = reconnect_delay_seconds
        # Set by the pipeline on Stop, so a camera retry loop can be interrupted.
        self.stop_event = stop_event or threading.Event()
        # Why frames aren't arriving (e.g. camera unreachable), for /stream/status.
        self.last_error: str | None = None
        # Webcams behave like network cameras: live, never "end", retried if
        # they drop out.
        self._is_device = _is_device(source)
        self._is_network = _is_network(source) or self._is_device
        self.panoramic = panoramic
        self._live = self._is_network if live is None else live
        self._cap: cv2.VideoCapture | None = None
        self._frame_index = 0
        self._latest: Frame | None = None
        self._last_returned_index = -1
        self._frame_ready = threading.Condition()
        self._grabber: threading.Thread | None = None

    def open(self) -> None:
        if self.source.startswith(("rtsp://", "rtsps://")):
            # TCP instead of OpenCV's default UDP: no smeared/grey frames from
            # dropped packets, and works through firewalls. Must be set before
            # the capture is created; an explicit user setting wins.
            os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")
        self._cap = cv2.VideoCapture(int(self.source) if self._is_device else self.source)
        if not self._cap.isOpened():
            raise RuntimeError(f"Failed to open stream source: {self.source}")

    def close(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    def _reconnect(self) -> None:
        logger.warning("Stream read failed, reconnecting to %s", self.source)
        self.last_error = f"Camera not responding at {self.source}, retrying"
        self.close()
        if self.stop_event.wait(self.reconnect_delay_seconds):
            return
        try:
            self.open()
        except RuntimeError:
            # Leave _cap unset; the next read() retries the open.
            logger.warning("Reconnect to %s failed, will retry", self.source)

    def read(self) -> Frame | None:
        """Returns the next frame (for live sources: the newest one), or None
        when stopped or when a non-looping file has ended. Live sources never
        end on their own — they retry forever, since a camera dropping out
        shouldn't stop the pipeline.
        """
        if not self._live:
            return self._read_next()

        with self._frame_ready:
            while True:
                if self.stop_event.is_set():
                    return None
                latest = self._latest
                if latest is not None and latest.frame_index > self._last_returned_index:
                    self._last_returned_index = latest.frame_index
                    return latest
                if self._grabber is not None and not self._grabber.is_alive():
                    return None
                self._frame_ready.wait(timeout=0.5)

    def _grab_loop(self) -> None:
        while not self.stop_event.is_set():
            frame = self._read_next()
            if frame is None:
                break
            with self._frame_ready:
                self._latest = frame
                self._frame_ready.notify_all()
        with self._frame_ready:
            self._frame_ready.notify_all()

    def _read_next(self) -> Frame | None:
        while True:
            if self.stop_event.is_set():
                return None
            if self._cap is None:
                if self._is_network:
                    self._reconnect()
                    continue
                self.open()
            assert self._cap is not None

            ok, image = self._cap.read()
            if ok:
                break

            if self._is_network:
                self._reconnect()
                continue

            if not self.loop:
                return None
            self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, image = self._cap.read()
            if not ok:
                raise RuntimeError(f"Failed to loop video source: {self.source}")
            break

        self.last_error = None
        frame = Frame(image=image, frame_index=self._frame_index, timestamp=time.time(), panoramic=self.panoramic)
        self._frame_index += 1
        return frame

    def __enter__(self) -> "StreamCapture":
        try:
            self.open()
        except RuntimeError:
            if not self._is_network:
                raise  # a missing file won't appear by waiting
            # A camera that's down at start is handled like a dropped one.
            self.last_error = f"Camera not reachable at {self.source}, retrying"
            logger.warning("Could not open %s yet, will keep retrying", self.source)
        if self._live:
            self._grabber = threading.Thread(target=self._grab_loop, name="capture-grabber", daemon=True)
            self._grabber.start()
        return self

    def __exit__(self, *exc_info: object) -> None:
        if self._grabber is not None:
            # The capture's lifetime is one pipeline run, so ending it ends
            # the grabber too; wait for its current read before releasing.
            self.stop_event.set()
            self._grabber.join(timeout=3)
            self._grabber = None
        self.close()


class X3TcpCapture:
    """Reads stitched equirectangular frames from Sentinel360X3Stitcher.exe.

    Wire format per frame (big-endian): uint32 width, uint32 height,
    uint32 payload_size, then width*height*3 bytes of RGB. The stitcher
    sends RGB; frames are converted to BGR to match cv2 everywhere else.
    Like network cameras, a dropped connection reconnects rather than ending
    the stream.
    """

    HEADER = struct.Struct("!III")

    def __init__(
        self,
        host: str,
        port: int,
        *,
        reconnect_delay_seconds: float = 2.0,
        socket_timeout_seconds: float = 5.0,
        stop_event: threading.Event | None = None,
    ):
        self.host = host
        self.port = port
        self.stop_event = stop_event or threading.Event()
        self.last_error: str | None = None
        self.reconnect_delay_seconds = reconnect_delay_seconds
        self.socket_timeout_seconds = socket_timeout_seconds
        self._sock: socket.socket | None = None
        self._frame_index = 0

    @classmethod
    def from_url(cls, source: str, **kwargs: object) -> "X3TcpCapture":
        parsed = urlparse(source)
        if parsed.scheme != X3_SCHEME or not parsed.hostname or not parsed.port:
            raise ValueError(f"Expected {X3_SCHEME}://host:port, got: {source}")
        return cls(parsed.hostname, parsed.port, **kwargs)  # type: ignore[arg-type]

    def open(self) -> None:
        self._sock = socket.create_connection(
            (self.host, self.port), timeout=self.socket_timeout_seconds
        )

    def close(self) -> None:
        if self._sock is not None:
            self._sock.close()
            self._sock = None

    def _receive_exact(self, size: int) -> bytes:
        assert self._sock is not None
        data = bytearray()
        while len(data) < size:
            chunk = self._sock.recv(size - len(data))
            if not chunk:
                raise ConnectionError("X3 stitcher closed the TCP connection")
            data.extend(chunk)
        return bytes(data)

    def _receive_frame(self) -> np.ndarray:
        width, height, payload_size = self.HEADER.unpack(self._receive_exact(self.HEADER.size))
        expected_size = width * height * 3
        if payload_size != expected_size:
            raise ValueError(
                f"Unexpected X3 payload size {payload_size} for {width}x{height} (expected {expected_size})"
            )
        rgb = np.frombuffer(self._receive_exact(payload_size), dtype=np.uint8).reshape((height, width, 3))
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    def read(self) -> Frame | None:
        """Waits for the stitcher (at start or after a drop) until a frame
        arrives; returns None only when stop_event is set."""
        while True:
            if self.stop_event.is_set():
                return None
            try:
                if self._sock is None:
                    self.open()
                image = self._receive_frame()
                break
            except (OSError, ConnectionError) as exc:
                # A desynced stream can't be recovered mid-connection, so a
                # bad header (ValueError) is deliberately not retried here.
                self.last_error = (
                    f"Waiting for the X3 stitcher at {self.host}:{self.port} "
                    f"({exc.__class__.__name__}) — is Sentinel360X3Stitcher.exe running?"
                )
                logger.warning("X3 read failed (%s), reconnecting to %s:%s", exc, self.host, self.port)
                self.close()
                if self.stop_event.wait(self.reconnect_delay_seconds):
                    return None

        self.last_error = None
        frame = Frame(image=image, frame_index=self._frame_index, timestamp=time.time(), panoramic=True)
        self._frame_index += 1
        return frame

    def __enter__(self) -> "X3TcpCapture":
        # Connecting is left to read(), which retries until the stitcher is
        # up — so the stitcher and the pipeline can start in either order.
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()


def open_capture(
    source: str,
    *,
    loop: bool = True,
    stop_event: threading.Event | None = None,
    panoramic: bool = False,
) -> FrameSource:
    """Picks the capture implementation from the source's scheme.
    `panoramic` marks a webcam/network/file source as a 2:1 equirectangular
    360° image (e.g. an X3 in USB webcam mode) so it's split into 4 views."""
    if source.startswith(f"{X3_SCHEME}://"):
        return X3TcpCapture.from_url(source, stop_event=stop_event)
    return StreamCapture(source, loop=loop, stop_event=stop_event, panoramic=panoramic)
