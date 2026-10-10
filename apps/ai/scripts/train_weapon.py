"""Fine-tunes a YOLO11 weapon detector (knife, pistol, rifle, ...).

Needs a dataset in Ultralytics YOLO format — a data.yaml listing the class
names and train/val image folders. Roboflow Universe has public ones (search
"weapon detection" and export as "YOLOv11"); add your own labelled X3
frames from scripts/export_frames.py to the same dataset.

Training wants a GPU. On a Mac it runs on MPS (slow but works for a small
dataset); on Google Colab (free T4 GPU) roughly an hour for ~5k images:

  !git clone <this repo> && cd Sentinel360/apps/ai && pip install ultralytics
  !python scripts/train_weapon.py --data /content/dataset/data.yaml --epochs 80

Then copy models/weapon_yolo11n.pt back to apps/ai/models/ on the demo
laptop. It prints the .env lines to switch to it — and to switch back,
just remove them (the stock models/yolov8n.pt is untouched).

ALWAYS compare it with the current model on your own clips before
switching:  uv run python scripts/evaluate.py run --set WEAPON_MODEL_PATH=...

  uv run python scripts/train_weapon.py --data datasets/weapons/data.yaml
  uv run python scripts/train_weapon.py --data ... --model yolo11s.pt --name weapon_yolo11s
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", type=Path, required=True, help="dataset data.yaml")
    parser.add_argument("--model", default="yolo11n.pt", help="starting weights (yolo11n.pt is fast on CPU; yolo11s.pt is more accurate)")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", default="auto", help="auto, cpu, mps or a CUDA index like 0")
    parser.add_argument("--name", default="weapon_yolo11n", help="output: models/<name>.pt")
    args = parser.parse_args()

    sys.path.insert(0, str(AI_ROOT))
    import yaml
    from ultralytics import YOLO

    from app.pipeline.device import resolve_device

    if not args.data.is_file():
        print(f"No dataset config at {args.data}")
        return 2
    names = yaml.safe_load(args.data.read_text()).get("names")
    class_names = list(names.values()) if isinstance(names, dict) else list(names or [])
    print(f"Classes: {class_names}")
    if not class_names:
        print("data.yaml has no 'names'")
        return 2

    device = resolve_device(args.device)
    device = "0" if device == "cuda" else device
    model = YOLO(args.model)
    model.train(
        data=str(args.data.resolve()),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=device,
        project=str(AI_ROOT / "runs" / "weapon"),
        name=args.name,
        exist_ok=True,
        # Wide-angle dewarped views: objects appear at any angle and scale.
        degrees=10.0,
        scale=0.6,
        patience=20,
    )

    best = AI_ROOT / "runs" / "weapon" / args.name / "weights" / "best.pt"
    if not best.is_file():
        print(f"Training finished but {best} is missing")
        return 1
    target = AI_ROOT / "models" / f"{args.name}.pt"
    shutil.copy2(best, target)

    metrics = YOLO(str(target)).val(
        data=str(args.data.resolve()),
        imgsz=args.imgsz,
        device=device,
        project=str(AI_ROOT / "runs" / "weapon"),
        name=f"{args.name}_val",
        exist_ok=True,
        verbose=False,
    )
    print(f"\nSaved {target.relative_to(AI_ROOT)}")
    print(f"Validation mAP50: {metrics.box.map50:.3f}   mAP50-95: {metrics.box.map:.3f}")
    for index, ap50 in zip(metrics.box.ap_class_index, metrics.box.ap50):
        print(f"  {class_names[int(index)]:<12} AP50 {ap50:.3f}")

    weapon_classes = [n for n in class_names if n.lower() not in ("person", "people", "human")]
    print("\nTo try it, add to apps/ai/.env (remove the lines to go back):")
    print(f"  WEAPON_MODEL_PATH=models/{target.name}")
    print(f"  WEAPON_ALARM_LABELS='{json.dumps(weapon_classes)}'")
    if "person" not in class_names:
        print("  WEAPON_PERSON_MODEL_PATH=models/yolov8n.pt   # this model has no person class")
    print("\nBut first compare it with the current model on your own clips:")
    print(f"  uv run python scripts/evaluate.py run --set WEAPON_MODEL_PATH=models/{target.name} "
          f"--set 'WEAPON_ALARM_LABELS={json.dumps(weapon_classes)}'"
          + ("" if "person" in class_names else " --set WEAPON_PERSON_MODEL_PATH=models/yolov8n.pt"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
