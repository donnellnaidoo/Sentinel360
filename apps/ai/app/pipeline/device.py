"""Torch device selection shared by the YOLO and SlowFast stages."""

from __future__ import annotations

import torch


def resolve_device(requested: str) -> str:
    """'auto' picks cuda > mps > cpu; anything else is passed through."""
    if requested != "auto":
        return requested
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"
