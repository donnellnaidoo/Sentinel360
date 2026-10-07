"""Equirectangular (360°) -> perspective view dewarping for the Insta360 X3.

Ported from the model team's weapondetection.py. YOLO and SlowFast were
trained on ordinary perspective footage, so the stitched panorama is split
into four virtual cameras (Front/Right/Rear/Left) before detection.
Non-panoramic sources pass through as a single "Main" view so downstream
stages only ever deal with `dict[view_name, image]`.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.config import settings
from app.pipeline.capture import Frame

# (view name, yaw in degrees). Order matters: it's the YOLO batch order and
# the 2x2 display/SlowFast composite layout.
X3_VIEWS: tuple[tuple[str, float], ...] = (
    ("Front", 0.0),
    ("Right", 90.0),
    ("Rear", 180.0),
    ("Left", -90.0),
)
SINGLE_VIEW_NAME = "Main"


def create_perspective_map(
    pano_width: int,
    pano_height: int,
    yaw: float,
    pitch: float = 0.0,
    fov: float = 100.0,
    out_width: int = 480,
    out_height: int = 360,
) -> tuple[np.ndarray, np.ndarray]:
    """Precompute the cv2.remap tables for one virtual camera.

    The spherical projection math runs once; cv2.remap() reuses the maps
    for every incoming frame.
    """
    focal_length = (out_width / 2.0) / np.tan(np.deg2rad(fov) / 2.0)

    px, py = np.meshgrid(
        np.arange(out_width, dtype=np.float32),
        np.arange(out_height, dtype=np.float32),
    )
    x = px - (out_width / 2.0)
    y = (out_height / 2.0) - py
    z = np.full_like(x, focal_length)

    length = np.sqrt(x * x + y * y + z * z)
    x /= length
    y /= length
    z /= length

    pitch_rad = np.deg2rad(pitch)
    y, z = (
        y * np.cos(pitch_rad) - z * np.sin(pitch_rad),
        y * np.sin(pitch_rad) + z * np.cos(pitch_rad),
    )

    yaw_rad = np.deg2rad(yaw)
    x, z = (
        x * np.cos(yaw_rad) + z * np.sin(yaw_rad),
        -x * np.sin(yaw_rad) + z * np.cos(yaw_rad),
    )

    # 3D direction -> spherical coordinates -> panorama pixels
    longitude = np.arctan2(x, z)
    latitude = np.arcsin(np.clip(y, -1.0, 1.0))
    map_x = (longitude / (2.0 * np.pi) + 0.5) * pano_width
    map_y = (0.5 - latitude / np.pi) * pano_height

    return map_x.astype(np.float32), map_y.astype(np.float32)


class ViewSplitter:
    """Turns a captured Frame into named, unannotated views.

    Remap tables are built lazily for whatever panorama size the stitcher
    actually sends (960x480 today) and rebuilt if that ever changes, rather
    than hard-coding the size like the original script did.
    """

    def __init__(
        self,
        fov: float = settings.x3_view_fov,
        out_width: int = settings.x3_view_width,
        out_height: int = settings.x3_view_height,
    ):
        self.fov = fov
        self.out_width = out_width
        self.out_height = out_height
        self._maps: dict[str, tuple[np.ndarray, np.ndarray]] = {}
        self._pano_shape: tuple[int, int] | None = None

    def _ensure_maps(self, pano_height: int, pano_width: int) -> None:
        if self._pano_shape == (pano_height, pano_width):
            return
        self._maps = {
            name: create_perspective_map(
                pano_width,
                pano_height,
                yaw=yaw,
                fov=self.fov,
                out_width=self.out_width,
                out_height=self.out_height,
            )
            for name, yaw in X3_VIEWS
        }
        self._pano_shape = (pano_height, pano_width)

    def split(self, frame: Frame) -> dict[str, np.ndarray]:
        if not frame.panoramic:
            return {SINGLE_VIEW_NAME: frame.image}

        height, width = frame.image.shape[:2]
        self._ensure_maps(height, width)
        return {
            name: cv2.remap(
                frame.image,
                map_x,
                map_y,
                interpolation=cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_WRAP,
            )
            for name, (map_x, map_y) in self._maps.items()
        }


def compose_grid(views: dict[str, np.ndarray], cell_size: tuple[int, int] | None = None) -> np.ndarray:
    """2x2 Front|Right / Left|Rear layout used for display and as the
    SlowFast input. A single view is returned unchanged. `cell_size`
    (width, height) resizes each view first — SlowFast uses 224x224 cells.
    """
    if set(views) != {name for name, _ in X3_VIEWS}:
        (only,) = views.values()
        return only

    def cell(name: str) -> np.ndarray:
        image = views[name]
        if cell_size is not None:
            image = cv2.resize(image, cell_size, interpolation=cv2.INTER_AREA)
        return image

    top = np.hstack((cell("Front"), cell("Right")))
    bottom = np.hstack((cell("Left"), cell("Rear")))
    return np.vstack((top, bottom))
