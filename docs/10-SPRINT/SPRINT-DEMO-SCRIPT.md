# Sentinel360 Sprint Demo Script

> Five features built for maximum "we modeled the real domain, not a toy CRUD app" impact.
> All are live and clickable — nothing here is a slide. Run through this once tonight before
> presenting so nothing surprises you live.

---

## Before the room fills up

- [ ] Have **two** browser sessions ready: your normal admin/investigator account, and a
      second test user with a *different, lower* role (e.g. `security_operator` or a fresh
      `investigator` who is **not** assigned to the demo case). Use `Admin → Users` to create
      one if you don't already have it, and `Admin → Roles` to check its role assignment.
      (Easiest: one normal window + one incognito/private window, logged in as each.)
- [ ] Pick or create one demo case with at least one evidence file uploaded (so the integrity
      check has something to verify) and at least one arrest/hearing recorded (so the judicial
      timeline isn't empty).
- [ ] Know the case's docket URL (`/docket/<id>`) so you're not clicking through the list live.

---

## Act 1 — Case status stepper (the state machine, made visible)

**Say:** "Investigations aren't a free-for-all status field — they follow the same lifecycle a
real docket does, and the system enforces it."

1. Open the demo case's docket page.
2. Point at the stepper: `Open → Under Investigation → Awaiting Review → Closed → Archived`.
3. Note only the *valid* next step(s) render as buttons — e.g. from `Open` there's only
   **Start investigating**, not a free jump to Closed.
4. Click through a transition live (e.g. into `Under Investigation`), and if you're at
   `Awaiting Review`, show that **Close case** demands a reason before it'll submit.

**The line that lands:** "This isn't UI validation — the backend has its own state machine
(`case-status.ts`) that rejects invalid transitions independently. The frontend just stopped
letting you attempt ones that would fail."

---

## Act 2 — Live evidence integrity verification (the "wow" moment)

**Say:** "Every piece of evidence is SHA-256 hashed the moment it's uploaded. Watch what happens
when we check it hasn't been tampered with."

1. Go to the **Evidence** tab on the docket.
2. Click **Verify Integrity** on an existing item.
3. Watch it flip to **✅ Integrity verified — recomputed hash matches chain of custody**, with
   the stored and recomputed SHA-256 hashes shown side by side.

**The line that lands:** "This re-downloads the actual file, recomputes the hash server-side,
and compares it against the hash recorded at upload — live, not cached. And every access —
this check included — writes an entry to an append-only chain-of-custody ledger, because under
the Criminal Procedure Act and ECTA section 15, evidence has to prove it wasn't tampered with to
be admissible."

*(Optional extra beat if you're brave: this is also where you could show a failure — but don't
fake a tampered file live unless you've tested that exact path beforehand.)*

---

## Act 3 — Judicial lifecycle timeline (the legal-rigor moment)

**Say:** "We didn't just model 'case open, case closed' — we modeled the actual South African
criminal procedure sequence that follows an arrest."

1. Go to the **Court & Prosecution** tab.
2. Point at the merged timeline at the top: arrest → first appearance → bail → NPA decision →
   hearings, each with its real legal citation underneath.
3. Read out loud whichever citations are showing, e.g.:
   - *"Constitution s35(1)(a) — right to be informed of the reason for arrest"*
   - *"CPA s50 — first appearance required within 48 hours of arrest"*
   - *"CPA bail classification: Schedule 5"*
4. If a first appearance is scheduled more than 48 hours after the arrest in your demo data,
   the timeline will actually flag it in red — point that out, it's a live compliance check,
   not decoration.

**The line that lands:** "Every one of those citations came from actually reading the Criminal
Procedure Act 51 of 1977 and the Constitution while designing the schema — it's not cosmetic
labeling, the 48-hour check is computed from real timestamps."

---

## Act 4 — Sensitive-case access control (POPIA, live, not asserted)

**Say:** "Some cases need restricted access — informants, minors, that kind of thing. Watch this
enforced live, not just described."

1. In your main window, open the demo case's docket and tick **Sensitive case** in the CASE INFO
   panel (or set it at creation next time via the checkbox on the New Case form).
2. Switch to the second (lower-privileged, unassigned) browser session and try to open the same
   `/docket/<id>` URL directly.
3. It should render **"Failed to load case: This case is restricted to its assigned
   investigator and administrators"** — a hard 403, not a redacted view.
4. Switch back to your admin/assigned window and reload — it renders normally.

**The line that lands:** "That's not a frontend `if` statement hiding a button — the API itself
throws FORBIDDEN before any data leaves the server. Every read path on this case, including
sub-resources like notes and evidence, routes through the same check."

---

## Act 5 — "My Data" POPIA self-service page

**Say:** "And because this handles personal information under POPIA, data subjects — including
staff — can see and request deletion of what we hold on them, without needing an admin."

1. Click **My Data** in the sidebar (own account).
2. Point at the consent line — either the recorded consent timestamp, or the **Give Consent
   Now** button if it's a legacy account without one on record.
3. Click **View raw export** to show the full JSON dump: cases reported/assigned, notes
   authored, sightings submitted, timeline actions.
4. Optionally submit a **Request Deletion** to show the pending-request state.

**The line that lands:** "Approving a deletion request anonymizes the account fields — name,
email, phone — but deliberately *doesn't* touch case, evidence, or audit records the person is
linked to, because POPIA itself (s11(1)(d)/(f)) permits retaining that data where the law
requires it — which for an investigation platform, it does."

---

## If asked "what's still missing" (have this ready, don't get caught out)

Be upfront rather than oversell — it lands better with an academic audience than pretending
everything is finished:

- Retention/archival sweeps are manually triggered right now, not on a schedule — there's no
  job queue/cron infrastructure yet.
- The consent-recapture flow requires the user to click "Give Consent" themselves; nothing
  proactively nags every legacy account yet.
- SAPS docket format alignment is explicitly not attempted — it needs the real SAPS CMS
  integration spec, which isn't publicly available, so we didn't guess at it.

Full detail: `INVESTIGATION-PROCESS-REVIEW.md` at the repo root.
