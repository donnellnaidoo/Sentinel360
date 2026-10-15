# Sentinel360: Project Day Presentation Plan

**AIS IT Project Day, 16 October 2026.** 15 minutes: 3 min problem and solution, 7 min live demo, 5 min questions.

## What the format changes

1. **The video uses up a third of your talking time.** You have 3 minutes for the problem and solution, and the video takes the first 60 seconds of that. That leaves about 2 minutes.
2. **The judges mark what they see working live.** Functionality (20 marks) and Live Demo (5 marks) both reward the system running in front of them. So the investigation can't be only a recording during the 7-minute demo. Use a short recorded feature montage at the end of the overview, and do the core flow live in the demo.
3. **Questions are worth 5 marks, but they're also where you defend Technical Quality (15) and Scalability and Business (10).** Prepare for them like a third segment.

Record the montage and the backups the day before.

## Part 1: Problem and solution (3:00)

| Time | Beat | Marks it earns |
|---|---|---|
| 0:00–1:00 | **Video**, cut to black, silence | Problem (10) |
| 1:00–1:45 | **The line in the silence.** One SAPS stat, then the three failures: *cameras no one watches, witnesses no one asks, dockets that fall apart in court.* Name the users: SAPS investigators, private security control rooms, CPFs and neighbourhood watches, and the public. | Problem (10), Impact (10) |
| 1:45–2:35 | **Recorded montage, about 50 seconds**, Screen Studio style with music and captions. It shows breadth: the live AI feed with boxes, a 360° panorama, a docket filling with captures, the hash check, the court timeline, the community app and its alerts. Caption at the end: *"One platform. Camera → community → courtroom."* | Innovation (15) |
| 2:35–3:00 | **Why it's different, and who pays.** *"Today it's CCTV no one watches and WhatsApp groups. We connect them and produce evidence that holds up in court. It's sold per site to security companies, estates and municipalities, and runs on the camera's own laptop or edge box."* Then: "Let us show you it working." | Business (5), Scalability (5) |

**The line in the silence.** Don't fill the black screen with an introduction. Let the silence sit for about 2 seconds, then:

> "Every day in South Africa, about [X] people are murdered. Most crimes are caught on a camera that no one is watching, seen by a witness no one asks, and filed in a docket that falls apart in court. Sentinel360 fixes all three, and we'll show you live."

Check [X] against the latest SAPS quarterly release so the number is exact.

## Part 2: Live demo (7:00)

Before you start, have everything open: the web console, an incognito window logged in as a low-privilege user, the phone mirrored, the camera pointed at the room, and one demo case already prepared.

| Time | Beat | What the judges see |
|---|---|---|
| 0:00–0:30 | **The live feed** on the Monitoring page, one line on the edge camera | The system is real, now |
| 0:30–1:45 | **Wanted-plate hit.** A teammate holds up the printed plate, a `PLATE_MATCH` alert appears, and the narrator points out that every plate that doesn't match a wanted profile is discarded, never stored | AI working live, privacy by design |
| 1:45–3:15 | **Panic button.** A long press on the phone sounds the **siren in the room**, the alert appears, the officer clicks **Open docket**, and the docket shows face crops, close-ups and the **360° panorama** (drag it around). Use the ~10 seconds before the captures appear to say: *"A model never opens a criminal case — an officer decides."* | Complete workflow, human in the loop |
| 3:15–5:15 | **Investigation, fast and live, on the prepared case.** Click one stepper transition, then **Verify Integrity** (the hashes match), then the court timeline with the **48-hour breach shown in red**, then try the same case from the incognito window and get **403**. That's 4 clicks of about 30 seconds each, all rehearsed. | Functionality (20), Technical Quality (15) |
| 5:15–6:30 | **Community loop.** On the phone, report a sighting with a photo, approve it on the web console, and show the alert arriving on the phone | Complete loop, UX (10) |
| 6:30–7:00 | **Close.** Play 2 seconds of the news chaos audio, cut to the one docketed alert. *"Same cameras. Now someone's watching — and it holds up in court."* | Presentation (5) |

**For every live beat, have the recorded backup ready to play.** If something fails, say "here's this morning's run" and keep going without apologising.

### AI choices for the live demo

- **Use** a webcam or phone as the camera (`STREAM_SOURCE=0` or a phone RTSP URL). Don't use the X3 live: its stitcher only runs on Windows, and it's one more thing that can break.
- **Use** the printed wanted plate (`ALPR_ENABLED=true`, `ALPR_SCAN_FULL_VIEW=true`). It's the most reliable AI trigger.
- **Optional, bigger but riskier:** make a teammate a "wanted person" (their photo on a profile, `FACE_WATCHLIST_SCAN=true`). They walk into frame and get flagged, with the "officer must verify" message. Rehearse both and keep whichever works 10 times out of 10.
- **Don't demo live:** knife or gun detection (the model still misses knives held in a hand, and venues may not allow a prop weapon; show it in a pre-recorded clip), SlowFast anomaly detection (uncalibrated) or pose/altercation detection (experimental).

## Part 3: Questions (5:00)

| Likely question | Your answer |
|---|---|
| False positives? | Detections wait for an officer to review them, and repeats within 10 minutes are grouped into one incident. After a dismissal, a new detection raises a fresh alert, so a real weapon is never silenced. Evaluation tooling measures recall, precision and false alarms per hour (`scripts/evaluate.py`). |
| Facial recognition and POPIA? | Matching is off by default and only used where there's a lawful basis. A match is a suggestion an officer must verify. There's self-service data access and deletion (s23/s24). Deletion anonymises the person but keeps the evidence, which s11 allows. |
| Is it admissible in court? | Every file gets a SHA-256 hash at upload, there's an append-only chain-of-custody ledger and a hash-chained audit log, and any file can be re-verified live. Cite CPA 51/1977 and ECTA s15. |
| How does it scale? | AI runs at the edge, one service per site, and only events go to the cloud. Web and API run on Vercel with Supabase in Cape Town (data stays in SA). Today it's one stream per service; scaling out means more edge nodes, and the target architecture is in the docs. |
| Why this tech stack? | tRPC gives types end to end, from database to UI. The case state machine is enforced on the server, not only in the UI. Turborepo holds the web, API, mobile and AI apps in one monorepo. |
| What isn't finished? | Answer plainly: the weapon model is being fine-tuned for knives held in a hand, retention isn't scheduled yet, and multi-camera tracking is out of scope. Then say what's next. |
| Business model? | Charge per site or camera per month to security companies, estates and municipalities. The community app is free and brings in the tips. |

Pick one person to field questions and pass each question to whoever owns that area. Practise five rapid-fire rounds.

## Roles (4 people)

- **Narrator** does the whole 3-minute overview and the demo narration.
- **Driver** works the web console. They don't speak, which keeps the clicking smooth.
- **Actor** holds the plate, presses panic and works the phone.
- **Tech lead** answers the defence questions.

## The 50-second montage: shot list

Record with Screen Studio at 1080p or higher, on the deployed URL, with seeded data that looks real. Music bed, captions instead of voiceover.

1. Monitoring page, live AI feed with boxes and the red alarm border.
2. 360° panorama evidence, dragged around.
3. A docket filling with face crops and close-ups.
4. Evidence **Verify Integrity**: *"Every file SHA-256 sealed. Every access logged."*
5. Court timeline with the 48-hour breach in red: *"CPA s50 checked from real timestamps."*
6. Community app: sighting report and the alert arriving.
7. End card: *"One platform. Camera → community → courtroom."*

Also record a backup of every live beat: plate hit, panic button with siren, docket opening, investigation clicks, phone flow, plus a knife or gun detection on recorded footage.

## Checklist

**Two days before**

- Seed the demo data: wanted profile with the plate, the prepared case with its 48-hour breach, the low-privilege user.
- Print the plate.
- Check that sighting submission saves the photo.

**Day before**

- Record the montage and a backup of each live beat.
- Do two full timed run-throughs with a stopwatch, keeping the demo under 6:45 for buffer.

**On the day**

- Test the siren volume on the venue's speakers.
- Tap the panic page once (the browser won't play the siren until it has been tapped).
- Warm up the AI service so models are loaded and `/stream/status` shows normal fps.
- Reload the monitoring feed just before you go on; the Vercel function ends the stream after 300 seconds.

**Two cuts that raise marks:** drop the separate architecture slide, because the Scalability marks come from what you say in the overview and in questions. Also skip the POPIA "My Data" page in the demo; a single sentence during questions covers it.
