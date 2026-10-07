"""End-to-end smoke test: real models, real backend.

Starts a throwaway AI service on --port streaming samples/knife_demo.mp4,
starts the pipeline, and waits until the publisher has delivered a
WEAPON_DETECTED event that the backend turned into a docket with both
evidence images. Prints the docket number and how long detection -> docket
took, then stops everything.

WARNING: this writes to whatever database apps/server is connected to — a
real incident, docket, alert, notifications to operators/admins, and two
evidence files. Close the docket afterwards if it isn't wanted.

Prerequisites:
  * apps/server running (BACKEND_URL, default http://localhost:3000)
  * apps/ai/.env with BACKEND_API_KEY = apps/server AI_SERVICE_API_KEY
  * uv run python samples/generate_knife_clip.py

Usage: uv run python scripts/smoke_e2e.py [--port 8011] [--timeout 90]
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx

AI_ROOT = Path(__file__).resolve().parent.parent
CLIP = AI_ROOT / "samples" / "knife_demo.mp4"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--port", type=int, default=8011)
    parser.add_argument("--timeout", type=float, default=90.0, help="seconds to wait for the docket")
    args = parser.parse_args()

    if not CLIP.exists():
        print(f"Missing {CLIP} — run: uv run python samples/generate_knife_clip.py")
        return 2

    sys.path.insert(0, str(AI_ROOT))
    from app.config import settings  # noqa: E402 — reads apps/ai/.env for the key/backend

    try:
        httpx.get(settings.backend_url, timeout=5).raise_for_status()
    except httpx.HTTPError as exc:
        print(f"Backend not reachable at {settings.backend_url}: {exc}")
        return 2

    env = {
        **os.environ,
        "STREAM_SOURCE": str(CLIP),
        # Play once: a looping clip shows the knife again every 8s, and with a
        # ~10s ingest a second docket would be created before shutdown.
        "STREAM_LOOP": "false",
        "CAMERA_ID": "CAM-SMOKE-TEST",
        "CAMERA_LOCATION_NAME": "End-to-end smoke test",
        # Weapon path only: SlowFast is experimental and would add noise.
        "ANOMALY_ENABLED": "false",
    }
    service = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(args.port)],
        cwd=AI_ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    base = f"http://127.0.0.1:{args.port}"
    headers = {"X-Internal-Api-Key": settings.backend_api_key}

    try:
        with httpx.Client(base_url=base, headers=headers, timeout=10) as client:
            deadline = time.time() + 60
            while True:
                try:
                    client.get("/health").raise_for_status()
                    break
                except httpx.HTTPError:
                    if time.time() > deadline or service.poll() is not None:
                        print("AI service failed to start")
                        return 1
                    time.sleep(0.5)

            client.post("/stream/start").raise_for_status()
            started = time.time()
            print(f"Pipeline started on {CLIP.name}; waiting for a docket (up to {args.timeout:.0f}s)…")

            while time.time() - started < args.timeout:
                status = client.get("/stream/status").json()
                if status.get("error"):
                    print(f"Pipeline error: {status['error']}")
                    return 1
                publisher = status["publisher"]
                result = publisher.get("last_result")
                if publisher["failed"]:
                    print(f"Delivery failed: {publisher['last_error']}")
                    return 1
                if publisher["sent"] and result:
                    event = next(e for e in status["events"]["recent"] if e["event_id"] == result["event_id"])
                    detected_at = datetime.fromisoformat(event["occurred_at"]).timestamp()
                    evidence = result.get("evidenceIds") or []
                    print(
                        f"OK  {event['event_type']} {event['confidence']:.2f} "
                        f"[{event['metadata'].get('confirmationMethod')}] -> docket {result['caseNumber']} "
                        f"with {len(evidence)} evidence item(s)"
                    )
                    print(
                        f"    pipeline start -> detection {detected_at - started:.1f}s, "
                        f"detection -> docket {time.time() - detected_at:.1f}s (polled every 0.5s), "
                        f"{status['fps']:.1f} fps"
                    )
                    return 0 if len(evidence) == 2 else 1
                time.sleep(0.5)

            print(f"Timed out. Last status: frames={status['frame_count']} events={status['events']}")
            return 1
    finally:
        service.terminate()
        service.wait(timeout=10)


if __name__ == "__main__":
    raise SystemExit(main())
