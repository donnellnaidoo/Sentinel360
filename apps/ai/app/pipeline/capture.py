"""Frame source abstraction: an RTSP/HTTP camera, a looped local video file
and the Insta360 X3 stitcher are the same interface to the rest of the
pipeline (see the "support both" decision for the demo). Only this module
knows the difference — use `open_capture(source)` to get the right one.

Source formats:
  x3tcp://127.0.0.1:5001     Sentinel360X3Stitcher.exe TCP feed (equirectangular)
  rtsp://... / http://...    network camera (e.g. IP Camera Lite's /video MJPEG)
  anything else              local video file path
"""

from __future__ import annotations

import logging
import socket
import struct
import time
from dataclasses import dataclass
from typing import Protocol
from urllib.parse import urlparse

import cv2
import numpy as np

logger = logging.getLogger(__name__)

X3_SCHEME = "x3tcp"
_NETWORK_SCHEMES = ("rtsp://", "rtsps://", "http://", "https://")


def _is_network(source: str) -> bool:
    return source.startswith(_NETWORK_SCHEMES)


@dataclass
class Frame:
    image: np.ndarray
    frame_index: int
    timestamp: float
    # True for a 360° equirectangular panorama (X3) that must be dewarped
    # into perspective views before detection — see pipeline/dewarp.py.
    panoramic: bool = False


class FrameSource(Protocol):
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
    """

    def __init__(self, source: str, *, loop: bool = True, reconnect_delay_seconds: float = 2.0):
        self.source = source
        self.loop = loop
        self.reconnect_delay_seconds = reconnect_delay_seconds
        self._is_network = _is_network(source)
        self._cap: cv2.VideoCapture | None = None
        self._frame_index = 0

    def open(self) -> None:
        self._cap = cv2.VideoCapture(self.source)
        if not self._cap.isOpened():
            raise RuntimeError(f"Failed to open stream source: {self.source}")

    def close(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    def _reconnect(self) -> None:
        logger.warning("Stream read failed, reconnecting to %s", self.source)
        self.close()
        time.sleep(self.reconnect_delay_seconds)
        try:
            self.open()
        except RuntimeError:
            # Leave _cap unset; the next read() retries the open.
            logger.warning("Reconnect to %s failed, will retry", self.source)

    def read(self) -> Frame | None:
        """Returns the next frame, or None if a file source has ended and
        looping is disabled. Network sources never return None — they retry
        forever, since a demo camera dropping out shouldn't stop the pipeline.
        """
        while True:
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

        frame = Frame(image=image, frame_index=self._frame_index, timestamp=time.time())
        self._frame_index += 1
        return frame

    def __enter__(self) -> "StreamCapture":
        self.open()
        return self

    def __exit__(self, *exc_info: object) -> None:
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
    ):
        self.host = host
        self.port = port
        self.reconnect_delay_seconds = reconnect_delay_seconds
        self.socket_timeout_seconds = socket_timeout_seconds
        self._sock: socket.socket | None = None
        self._frame_index = 0

    @classmethod
    def from_url(cls, source: str, **kwargs: float) -> "X3TcpCapture":
        parsed = urlparse(source)
        if parsed.scheme != X3_SCHEME or not parsed.hostname or not parsed.port:
            raise ValueError(f"Expected {X3_SCHEME}://host:port, got: {source}")
        return cls(parsed.hostname, parsed.port, **kwargs)

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
        while True:
            try:
                if self._sock is None:
                    self.open()
                image = self._receive_frame()
                break
            except (OSError, ConnectionError) as exc:
                # A desynced stream can't be recovered mid-connection, so a
                # bad header (ValueError) is deliberately not retried here.
                logger.warning("X3 read failed (%s), reconnecting to %s:%s", exc, self.host, self.port)
                self.close()
                time.sleep(self.reconnect_delay_seconds)

        frame = Frame(image=image, frame_index=self._frame_index, timestamp=time.time(), panoramic=True)
        self._frame_index += 1
        return frame

    def __enter__(self) -> "X3TcpCapture":
        self.open()
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()


def open_capture(source: str, *, loop: bool = True) -> FrameSource:
    """Picks the capture implementation from the source's scheme."""
    if source.startswith(f"{X3_SCHEME}://"):
        return X3TcpCapture.from_url(source)
    return StreamCapture(source, loop=loop)
