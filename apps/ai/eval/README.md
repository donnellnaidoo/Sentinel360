# Evaluation set

Labelled clips from the real camera, used by `scripts/evaluate.py` to
measure the pipeline instead of guessing. Clips, caches, exported frames and
your `labels.json` are gitignored: the footage shows real people (POPIA),
so keep it on the team drive, not in git.

## 1. Record clips

Stop the pipeline (the camera can only be opened once), then:

```bash
uv run python scripts/record_clip.py knife_front_01 --seconds 20
```

Aim for 30–60 clips of 10–30 s, plus a few long "nothing happens" ones:

| Kind | Examples | Why |
|---|---|---|
| Positives | knife drawn/held in each X3 view, near and far, good and poor light | recall, time to detect |
| Hard negatives | phone, remote, pen, keys, tools held like a knife; kitchen knife lying on a counter | false alarms |
| Activity | staged push/shove, someone falling, running | anomaly / altercation recall |
| Normal | people walking, sitting, talking — at least 30 min in total, ideally an hour | false alarms per hour, SlowFast calibration |

Write down the times while recording ("knife out 0:07, away 0:13").

## 2. Label

Copy `labels.example.json` to `labels.json` and add one entry per clip.
`start`/`end` are seconds from the start of the clip; event types are
`WEAPON_DETECTED`, `ANOMALY_DETECTED` and `ALTERCATION`. A clip with
`"events": []` is a negative — any alarm on it is a false alarm. An alarm
counts as catching an event if it fires from 1 s before `start` to 2 s
after `end`.

## 3. Measure

```bash
uv run python scripts/evaluate.py run                 # current settings
uv run python scripts/evaluate.py sweep               # best alarm settings on this set
uv run python scripts/evaluate.py calibrate           # SlowFast threshold from normal footage
uv run python scripts/evaluate.py run --json eval/report-baseline.json   # keep for the report
```

Compare a change by running it with `--set`, e.g.
`--set ANOMALY_CLIP_SECONDS=1.5 --set ANOMALY_VIEW_MODE=per_view_people`
or `--set WEAPON_REQUIRE_PERSON=true`. Model outputs are cached per setting,
so only the first run of each combination is slow.

Two cautions:
- **Small sets overfit.** With 30 clips, a sweep can find settings that are
  perfect here and worse live. Prefer a setting that's near the top for
  several clips, and re-check on clips recorded later.
- **Keep training and test footage apart.** Frames you label to train the
  weapon model (`scripts/export_frames.py`) must not come from clips in
  `labels.json`.
