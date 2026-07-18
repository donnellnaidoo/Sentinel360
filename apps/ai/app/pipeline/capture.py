"""Frame source abstraction: an RTSP camera and a looped local video file are
the same interface to the rest of the pipeline (see the "support both"
decision for the demo). Only this module knows the difference.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def _is_rtsp(source: str) -> bool:
    return source.startswith("rtsp://") or source.startswith("rtsps://")


@dataclass
class Frame:
    image: np.ndarray
    frame_index: int
    timestamp: float


class StreamCapture:
    """Wraps cv2.VideoCapture for either an RTSP URL or a local file.

    RTSP: reconnects on read failure (cameras drop connections; a demo
    can't die because of one dropped frame).
    File: loops back to frame 0 when `loop=True` so a short demo clip acts
    like a continuous "stream" for as long as the pipeline runs.
    """

    def __init__(self, source: str, *, loop: bool = True, reconnect_delay_seconds: float = 2.0):
        self.source = source
        self.loop = loop
        self.reconnect_delay_seconds = reconnect_delay_seconds
        self._is_rtsp = _is_rtsp(source)
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
        self.open()

    def read(self) -> Frame | None:
        """Returns the next frame, or None if a file source has ended and
        looping is disabled. RTSP sources never return None — they retry
        forever, since a demo camera dropping out shouldn't stop the pipeline.
        """
        if self._cap is None:
            self.open()
        assert self._cap is not None

        ok, image = self._cap.read()

        if not ok:
            if self._is_rtsp:
                self._reconnect()
                return self.read()

            if self.loop:
                self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ok, image = self._cap.read()
                if not ok:
                    raise RuntimeError(f"Failed to loop video source: {self.source}")
            else:
                return None

        frame = Frame(image=image, frame_index=self._frame_index, timestamp=time.time())
        self._frame_index += 1
        return frame

    def __enter__(self) -> "StreamCapture":
        self.open()
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()
