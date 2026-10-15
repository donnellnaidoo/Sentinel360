"""Builds the weapon training set for scripts/train_weapon.py, in
Ultralytics YOLO format, from public datasets (no account needed):

  * OD-WeaponDetection (University of Granada, CC BY-SA 4.0)
    https://github.com/ari-dasci/OD-WeaponDetection
    - Sohas_weapon-Detection: knives and pistols in hands, plus the objects
      that get mistaken for them, held the same way (smartphone, wallet,
      banknote, card) as their own classes so the model learns the
      difference. Includes the Knife_detection images.
    - Pistol detection: 3,000 more pistol images.
    The 4.7 GB zip is downloaded once from the authors' Google Drive (or
    pass --zip if you already have it); only those folders are extracted.
  * Simuletic synthetic CCTV knife set (CC BY 4.0, Hugging Face): people
    holding knives seen from surveillance angles. Its person boxes are
    dropped: the weapon model has no person class (persons come from
    WEAPON_PERSON_MODEL_PATH).

Images are deduplicated by content. Sohas' own test split is the
validation set; the rest is split 85/15 by image hash, so it's stable.

Usage (needs ~8 GB free; run it on Colab, see notebooks/):
  pip install gdown httpx
  python scripts/prepare_weapon_dataset.py --out datasets/weapons
  python scripts/train_weapon.py --data datasets/weapons/data.yaml ...

Add your own labelled camera frames (scripts/export_frames.py) with
--extra <dir with images/ and labels/ in YOLO format, same class order>.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import shutil
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

# Alarm classes first; train_weapon.py only alarms on WEAPON_CLASSES.
CLASSES = ["knife", "pistol", "smartphone", "wallet", "banknote", "card"]
# Spanish/variant label names in the source annotations -> CLASSES.
LABEL_MAP = {
    "knife": "knife",
    "pistol": "pistol",
    "handgun": "pistol",
    "smartphone": "smartphone",
    "monedero": "wallet",
    "billete": "banknote",
    "tarjeta": "card",
}

DRIVE_ID = "1Szc920DAh5kU8Qk38Doq0znEVR1QmTZS"
ZIP_ROOT = "OD-WeaponDetection-master/"
# (folder in the zip, its test images are the validation set)
ZIP_SOURCES = [
    ("Weapons and similar handled objects/Sohas_weapon-Detection/", True),
    ("Pistol detection/", False),
]
SIMULETIC = "Simuletic/cctv-knife-detection-dataset"
SIMULETIC_CLASSES = {1: "knife"}  # 0 = person, dropped
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp")
VAL_FRACTION = 0.15


class Builder:
    def __init__(self, out: Path):
        self.out = out
        self.seen: set[str] = set()
        self.counts: dict[str, collections.Counter] = {"train": collections.Counter(), "val": collections.Counter()}
        self.images = collections.Counter()
        self.skipped = collections.Counter()
        for split in ("train", "val"):
            (out / "images" / split).mkdir(parents=True, exist_ok=True)
            (out / "labels" / split).mkdir(parents=True, exist_ok=True)

    def add(self, image: bytes, suffix: str, boxes: list[tuple[str, float, float, float, float]], split: str | None) -> None:
        """boxes: (class, cx, cy, w, h), normalised. split None = by hash."""
        digest = hashlib.sha1(image).hexdigest()
        if digest in self.seen:
            self.skipped["duplicate image"] += 1
            return
        self.seen.add(digest)
        if split is None:
            split = "val" if int(digest[:8], 16) / 0xFFFFFFFF < VAL_FRACTION else "train"
        stem = digest[:16]
        (self.out / "images" / split / f"{stem}{suffix.lower()}").write_bytes(image)
        lines = [f"{CLASSES.index(c)} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}" for c, cx, cy, w, h in boxes]
        (self.out / "labels" / split / f"{stem}.txt").write_text("\n".join(lines) + ("\n" if lines else ""))
        self.images[split] += 1
        self.counts[split].update(c for c, *_ in boxes)


def voc_boxes(xml_text: str) -> list[tuple[str, float, float, float, float]] | None:
    """VOC boxes as normalised YOLO boxes; None if any label is unknown
    (an unlabelled weapon would teach the model it's background)."""
    root = ET.fromstring(xml_text)
    width = float(root.findtext("size/width") or 0)
    height = float(root.findtext("size/height") or 0)
    if width <= 0 or height <= 0:
        return None
    boxes = []
    for obj in root.iter("object"):
        name = LABEL_MAP.get((obj.findtext("name") or "").strip().lower())
        if name is None:
            return None
        box = obj.find("bndbox")
        x1, y1, x2, y2 = (float(box.findtext(k)) for k in ("xmin", "ymin", "xmax", "ymax"))
        x1, x2 = max(0.0, min(x1, x2)), min(width, max(x1, x2))
        y1, y2 = max(0.0, min(y1, y2)), min(height, max(y1, y2))
        if x2 - x1 < 2 or y2 - y1 < 2:
            continue
        boxes.append((name, (x1 + x2) / 2 / width, (y1 + y2) / 2 / height, (x2 - x1) / width, (y2 - y1) / height))
    return boxes


def download_zip(target: Path) -> Path:
    """The authors' 4.7 GB zip, downloaded once with gdown (handles Drive's
    large-file confirm page; resumes a partial file; retries timeouts)."""
    import time

    import gdown

    if target.is_file() and zipfile.is_zipfile(target):
        return target
    target.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading OD-WeaponDetection (4.7 GB) to {target} ...")
    for attempt in range(1, 6):
        try:
            gdown.download(id=DRIVE_ID, output=str(target), quiet=False, resume=True)
        except Exception as e:  # timeouts, dropped connections
            print(f"  attempt {attempt} failed: {e}")
        if target.is_file() and zipfile.is_zipfile(target):
            return target
        time.sleep(10 * attempt)
    raise SystemExit(
        "Couldn't download the zip from Google Drive (quota or network). Download it in a browser from "
        f"https://drive.google.com/file/d/{DRIVE_ID}, put it at {target}, and run again."
    )


def add_od_weapon_detection(builder: Builder, zip_path: Path) -> None:
    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
        for folder, has_test_split in ZIP_SOURCES:
            prefix = ZIP_ROOT + folder
            members = [n for n in names if n.startswith(prefix) and not n.endswith("/") and "/." not in n]
            # Keyed by split too: a test image can share a train image's name.
            images = {("_test/" in n, Path(n).stem): n for n in members if n.lower().endswith(IMAGE_EXTENSIONS)}
            xmls = [n for n in members if n.endswith(".xml")]
            print(f"  {folder}: {len(xmls)} annotations, {len(images)} images")
            for xml_name in xmls:
                image_name = images.get(("_test/" in xml_name, Path(xml_name).stem))
                if image_name is None:
                    builder.skipped["annotation without image"] += 1
                    continue
                boxes = voc_boxes(z.read(xml_name).decode("utf-8", "replace"))
                if boxes is None:
                    builder.skipped["unknown label or bad size"] += 1
                    continue
                split = ("val" if "_test/" in xml_name else "train") if has_test_split else None
                builder.add(z.read(image_name), Path(image_name).suffix, boxes, split)


def add_simuletic(builder: Builder) -> None:
    import httpx

    print(f"Downloading {SIMULETIC} from Hugging Face ...")
    base = f"https://huggingface.co/datasets/{SIMULETIC}"
    with httpx.Client(follow_redirects=True, timeout=60) as client:
        files = [f["path"] for f in client.get(f"https://huggingface.co/api/datasets/{SIMULETIC}/tree/main?recursive=true").json() if f.get("type") == "file"]
        labels = {Path(f).stem: f for f in files if f.endswith(".txt")}
        for path in files:
            if not path.lower().endswith(IMAGE_EXTENSIONS) or Path(path).stem not in labels:
                continue
            image = client.get(f"{base}/resolve/main/{path}").content
            boxes = []
            for line in client.get(f"{base}/resolve/main/{labels[Path(path).stem]}").text.splitlines():
                parts = line.split()
                if len(parts) == 5 and int(parts[0]) in SIMULETIC_CLASSES:
                    boxes.append((SIMULETIC_CLASSES[int(parts[0])], *map(float, parts[1:])))
            builder.add(image, Path(path).suffix, boxes, None)


def add_extra(builder: Builder, extra: Path) -> None:
    """Your own frames, YOLO format in CLASSES order: extra/images, extra/labels."""
    for image_path in sorted((extra / "images").rglob("*")):
        if image_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        label_path = extra / "labels" / image_path.relative_to(extra / "images").with_suffix(".txt")
        boxes = []
        if label_path.is_file():
            for line in label_path.read_text().splitlines():
                parts = line.split()
                if len(parts) == 5:
                    boxes.append((CLASSES[int(parts[0])], *map(float, parts[1:])))
        builder.add(image_path.read_bytes(), image_path.suffix, boxes, None)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", type=Path, default=Path("datasets/weapons"))
    parser.add_argument("--extra", type=Path, action="append", default=[], help="your own YOLO-format frames (repeatable)")
    parser.add_argument("--no-simuletic", action="store_true")
    parser.add_argument("--zip", type=Path, default=Path("datasets/OD-WeaponDetection-master.zip"),
                        help="the OD-WeaponDetection zip (downloaded here if missing)")
    args = parser.parse_args()

    if args.out.exists() and any(args.out.iterdir()):
        print(f"{args.out} is not empty; remove it first")
        return 2
    builder = Builder(args.out)
    add_od_weapon_detection(builder, download_zip(args.zip))
    if not args.no_simuletic:
        add_simuletic(builder)
    for extra in args.extra:
        add_extra(builder, extra)

    (args.out / "data.yaml").write_text(
        f"path: {args.out.resolve()}\ntrain: images/train\nval: images/val\nnames:\n"
        + "".join(f"  {i}: {name}\n" for i, name in enumerate(CLASSES))
    )
    (args.out / "SOURCES.md").write_text(
        "OD-WeaponDetection (Pérez-Hernández et al., Knowledge-Based Systems 194, 2020), CC BY-SA 4.0: "
        "https://github.com/ari-dasci/OD-WeaponDetection\n"
        "Simuletic Synthetic Knife Detection CCTV Dataset (2025), CC BY 4.0: "
        f"https://huggingface.co/datasets/{SIMULETIC}\n"
    )
    for split in ("train", "val"):
        print(f"{split}: {builder.images[split]} images, boxes {dict(builder.counts[split])}")
    if builder.skipped:
        print(f"skipped: {dict(builder.skipped)}")
    print(f"Wrote {args.out / 'data.yaml'}")
    return 0 if builder.images["train"] else 1


if __name__ == "__main__":
    sys.exit(main())
