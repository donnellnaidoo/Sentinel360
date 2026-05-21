import asyncio
import cv2
import time
from collections import deque
from typing import Deque, Dict
from yt_dlp import YoutubeDL
from anomaly_model import AnomalyModel
import numpy as np


class StreamProcessor:
    def __init__(self, model: AnomalyModel, source_url: str, sample_interval: float = 1.5):
        self.model = model
        self.source_url = source_url
        self.sample_interval = sample_interval
        self.events: Deque[Dict] = deque(maxlen=50)
        self._running = False

    def _resolve_stream(self) -> str:
        ydl_opts = {"quiet": True, "skip_download": True, "no_warnings": True}
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(self.source_url, download=False)
            # prefer best video format url
            if "url" in info:
                return info["url"]
            formats = info.get("formats") or []
            if formats:
                return formats[-1].get("url")
        return self.source_url

    async def run(self):
        self._running = True
        stream_url = self._resolve_stream()
        cap = cv2.VideoCapture(stream_url)

        last_sample = 0.0
        while self._running:
            ret, frame = cap.read()
            if not ret or frame is None:
                await asyncio.sleep(1.0)
                continue

            now = time.time()
            if now - last_sample >= self.sample_interval:
                try:
                    pred = self.model.predict(frame)
                except Exception as e:
                    pred = {"anomaly": False, "type": None, "confidence": 0.0}

                event = {
                    "timestamp": now,
                    "source": self.source_url,
                    "result": pred,
                }
                print("[stream_processor] event:", event)
                self.events.appendleft(event)
                last_sample = now

            await asyncio.sleep(0.01)

        cap.release()

    def stop(self):
        self._running = False

    def get_events(self):
        return list(self.events)
