import base64

import numpy as np

from app.pipeline.events import DetectionEvent
from app.pipeline.objects import crop_objects, select_objects
from app.pipeline.pipeline import _attach_objects
from app.pipeline.publisher import build_payload
from app.pipeline.weapon import ViewDetection


def det(label, confidence, bbox, view="Main"):
    return ViewDetection(view=view, label=label, confidence=confidence, bbox=bbox)


def views():
    rng = np.random.default_rng(0)
    return {
        "Main": rng.integers(0, 255, (720, 1280, 3), dtype=np.uint8),
        "Rear": rng.integers(0, 255, (720, 1280, 3), dtype=np.uint8),
    }


def test_weapons_first_by_confidence_then_people_largest_first():
    detections = {
        "Main": [
            det("person", 0.9, (0, 0, 100, 100)),
            det("knife", 0.6, (10, 10, 30, 30)),
            det("person", 0.5, (0, 0, 400, 400)),
        ],
        "Rear": [det("gun", 0.8, (50, 50, 90, 90), "Rear")],
    }
    picked = select_objects(detections, ["knife", "gun"])
    assert [(d.label, d.confidence) for d in picked] == [
        ("gun", 0.8),
        ("knife", 0.6),
        ("person", 0.5),
        ("person", 0.9),
    ]


def test_drops_weak_detections_and_vehicles_and_caps_counts():
    detections = {
        "Main": [
            det("knife", 0.30, (0, 0, 20, 20)),  # below the alarm confidence
            det("person", 0.20, (0, 0, 50, 50)),  # below the person confidence
            det("car", 0.95, (0, 0, 500, 300)),  # plates stay with plates.py
            *[det("person", 0.9, (0, 0, 10 + i, 10 + i)) for i in range(15)],
            *[det("knife", 0.9, (0, 0, 20, 20)) for _ in range(5)],
        ]
    }
    picked = select_objects(detections, ["knife"], max_weapons=3, max_people=10)
    assert sum(d.label == "knife" for d in picked) == 3
    assert sum(d.label == "person" for d in picked) == 10
    assert all(d.label != "car" for d in picked)


def test_crops_are_numbered_per_label_and_fit_the_size_cap():
    detections = {
        "Main": [
            det("person", 0.9, (0, 0, 1280, 720)),
            det("person", 0.8, (100, 100, 300, 500)),
            det("knife", 0.7, (500, 300, 600, 340)),
        ]
    }
    crops = crop_objects(views(), detections, ["knife"], max_side=320, max_bytes=40 * 1024)
    assert [c.name for c in crops] == ["Knife 1", "Person 1", "Person 2"]
    assert all(c.jpeg.startswith(b"\xff\xd8") and len(c.jpeg) <= 40 * 1024 for c in crops)


def test_event_carries_objects_as_metadata_and_object_media():
    event = DetectionEvent("WEAPON_DETECTED", "CAM-1", 0.7, "Knife detected")
    detections = {"Main": [det("knife", 0.7, (500, 300, 600, 340)), det("person", 0.9, (0, 0, 640, 720))]}

    _attach_objects(event, views(), detections, ["knife"])

    assert [o["name"] for o in event.metadata["objects"]] == ["Knife 1", "Person 1"]
    media = build_payload(event)["media"]
    assert [m["kind"] for m in media] == ["OBJECT", "OBJECT"]
    assert base64.b64decode(media[0]["dataBase64"]) == event.object_jpegs[0]


def test_no_detections_attaches_nothing():
    event = DetectionEvent("PANIC_BUTTON", "CAM-1", 1.0, "Panic")
    _attach_objects(event, views(), None, ["knife"])
    _attach_objects(event, views(), {"Main": []}, ["knife"])
    assert event.object_jpegs == [] and "objects" not in event.metadata
