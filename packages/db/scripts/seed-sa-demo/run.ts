// Wipes all operational data (cases, incidents, evidence + storage objects,
// alerts, sightings, profiles, audit log) and reseeds with the South African
// demo dataset in ./data.ts. Keeps user accounts, roles and permissions.
//
//   bun scripts/seed-sa-demo/run.ts --confirm-wipe
//
// Reads DATABASE_URL / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from
// apps/server/.env. Evidence images are generated placeholders watermarked
// "SIMULATED TEST EVIDENCE"; hashes are real so integrity checks pass.
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";
import sharp from "sharp";

import {
  AI_EVENTS, BROADCASTS, CASES, COMMUNITY, PEOPLE, PLACES, SIGHTINGS, STAFF, USERS,
  type Place, type PlaceKey, type UserKey,
} from "./data";

dotenv.config({ path: fileURLToPath(new URL("../../../../apps/server/.env", import.meta.url)) });

if (!process.argv.includes("--confirm-wipe")) {
  console.error("Refusing to run without --confirm-wipe (this deletes all operational data).");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EVIDENCE_BUCKET = "evidence";
const PHOTO_BUCKET = "profile-photos";

// audit_log.created_at is timestamp WITHOUT time zone and the DB writes now() in UTC.
(pg.defaults as { parseInputDatesAsUTC?: boolean }).parseInputDatesAsUTC = true;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const D = (iso: string) => new Date(iso);
const SEED_NOW = D("2026-10-14T06:00:00+02:00");
const addMin = (iso: string | Date, min: number) => new Date(new Date(iso).getTime() + min * 60_000);
const uid = (k: UserKey | null) => (k ? USERS[k] : null);
const loc = (k: PlaceKey): Place => PLACES[k];
const rand6 = () => Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "X");

async function insert(table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  const vals = cols.map((c) => {
    const v = row[c];
    return v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v;
  });
  await client.query(
    `insert into public."${table}" (${cols.map((c) => `"${c}"`).join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})`,
    vals,
  );
}

// ---------------------------------------------------------------- storage --
async function storage(method: string, path: string, body?: BodyInit, contentType = "application/json") {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": contentType },
    body,
  });
  if (!r.ok) throw new Error(`storage ${method} ${path}: ${r.status} ${await r.text()}`);
  return r;
}

async function emptyBucket(bucket: string) {
  const { rows } = await client.query(`select name from storage.objects where bucket_id = $1`, [bucket]);
  for (let i = 0; i < rows.length; i += 100) {
    await storage("DELETE", `object/${bucket}`, JSON.stringify({ prefixes: rows.slice(i, i + 100).map((r) => r.name) }));
  }
  return rows.length;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// CCTV-style placeholder frame. Seeded from the label so each file (and
// therefore each hash) is unique.
async function renderImage(opts: { label: string; camera?: string; at: string; place: Place; caseRef?: string }) {
  const seed = parseInt(sha256(opts.label + opts.at).slice(0, 8), 16);
  const rnd = (n: number) => ((seed * (n + 7919)) % 9973) / 9973;
  const w = 1280, h = 720;
  const blocks = Array.from({ length: 9 }, (_, i) => {
    const x = Math.floor(rnd(i) * w), y = Math.floor(300 + rnd(i + 20) * 300);
    const bw = 60 + Math.floor(rnd(i + 40) * 260), bh = 80 + Math.floor(rnd(i + 60) * 240);
    const g = 40 + Math.floor(rnd(i + 80) * 60);
    return `<rect x="${x}" y="${y - bh}" width="${bw}" height="${bh}" fill="rgb(${g},${g + 6},${g + 4})" opacity="0.9"/>`;
  }).join("");
  const figures = Array.from({ length: 1 + (seed % 3) }, (_, i) => {
    const x = 300 + Math.floor(rnd(i + 100) * 700), y = 470 + Math.floor(rnd(i + 120) * 80);
    return `<circle cx="${x}" cy="${y - 150}" r="22" fill="#1a1d1c"/><rect x="${x - 30}" y="${y - 125}" width="60" height="125" rx="14" fill="#1a1d1c"/>` +
      `<rect x="${x - 50}" y="${y - 185}" width="100" height="195" fill="none" stroke="#ff3b30" stroke-width="3"/>`;
  }).join("");
  const ts = new Date(opts.at).toLocaleString("sv-SE", { timeZone: "Africa/Johannesburg" });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3330"/><stop offset="1" stop-color="#0f1211"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>${blocks}
    <rect x="0" y="560" width="${w}" height="160" fill="#151917"/>${figures}
    ${Array.from({ length: 90 }, (_, i) => `<rect x="0" y="${i * 8}" width="${w}" height="1" fill="#000" opacity="0.25"/>`).join("")}
    <rect x="0" y="0" width="${w}" height="56" fill="#000" opacity="0.6"/>
    <text x="24" y="38" font-family="Menlo, monospace" font-size="26" fill="#e8e8e8">${esc(opts.camera ?? "PHOTO")}  ${esc(ts)} SAST</text>
    <text x="${w - 24}" y="38" text-anchor="end" font-family="Menlo, monospace" font-size="22" fill="#ff453a">● REC</text>
    <rect x="0" y="${h - 110}" width="${w}" height="110" fill="#000" opacity="0.65"/>
    <text x="24" y="${h - 70}" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="bold" fill="#ffffff">${esc(opts.label)}</text>
    <text x="24" y="${h - 30}" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#c8c8c8">${esc(opts.place.address)}${opts.caseRef ? "  ·  " + esc(opts.caseRef) : ""}</text>
    <text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="54" font-weight="bold" fill="#ffffff" opacity="0.13" transform="rotate(-18 ${w / 2} ${h / 2})">SIMULATED TEST EVIDENCE</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

type Media = { id: string; hash: string };
async function createMedia(opts: {
  title: string; description: string; label: string; at: string; place: Place; camera?: string;
  caseRef?: string; type: "IMAGE" | "PHOTO"; source: "AI_PIPELINE" | "SIGHTING" | "MANUAL_UPLOAD";
  uploader: UserKey | null; metadata?: Record<string, unknown>;
}): Promise<Media> {
  const buf = await renderImage(opts);
  const hash = sha256(buf);
  const filename = `${opts.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}.jpg`;
  const path = `${new Date(opts.at).getFullYear()}/${randomUUID()}-${filename}`;
  await storage("POST", `object/${EVIDENCE_BUCKET}/${path}`, buf, "image/jpeg");
  const id = randomUUID();
  await insert("media_asset", {
    id, type: opts.type, title: opts.title, description: opts.description, source: opts.source,
    source_camera_id: opts.camera ?? null, original_filename: filename, mime_type: "image/jpeg",
    file_size: buf.length, file_hash: hash, storage_url: path, storage_tier: "HOT",
    resolution: "1280x720", gps_latitude: opts.place.latitude, gps_longitude: opts.place.longitude,
    status: "READY", metadata: opts.metadata ?? {}, created_by_user_id: uid(opts.uploader),
    created_at: addMin(opts.at, 20), updated_at: addMin(opts.at, 20),
  });
  await insert("chain_of_custody", {
    evidence_entity_type: "MEDIA_ASSET", evidence_entity_id: id, action: "CREATED",
    from_user_id: null, to_user_id: uid(opts.uploader), reason: opts.source === "AI_PIPELINE" ? "Captured by AI pipeline" : "Evidence uploaded",
    evidence_hash: hash, location: opts.camera ?? opts.place.address, metadata: {}, created_at: addMin(opts.at, 20),
  });
  return { id, hash };
}

// ------------------------------------------------------------- audit log --
type AuditEvt = { at: Date; domain: string; eventType: string; actor: string | null; targetType: string; targetId: string; action: string; payload: Record<string, unknown> };
const audit: AuditEvt[] = [];
const timeline: { caseId: string; eventType: string; summary: string; payload: Record<string, unknown>; actor: string | null; at: Date }[] = [];

function caseEvent(caseId: string, eventType: string, summary: string, payload: Record<string, unknown>, actor: string | null, at: Date) {
  timeline.push({ caseId, eventType, summary, payload, actor, at });
  audit.push({ at, domain: "cases", eventType, actor, targetType: "case", targetId: caseId, action: summary.slice(0, 50), payload });
}

function canonicalValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonicalValue);
  if (v && typeof v === "object" && !(v instanceof Date)) {
    return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canonicalValue((v as Record<string, unknown>)[k])]));
  }
  return v;
}

// ================================================================== WIPE ==
console.log("Wiping operational data…");
const WIPE = [
  "case_timeline_entry", "case_hearing", "case_prosecution_decision", "case_arrest", "case_criminal",
  "case_evidence", "case_incident", "investigation_note", "evidence_request", "case_share_record", "case_report",
  "watchlist_entry", "community_sighting", "entity_match", "entity_profile", "case", "incident",
  "notification", "alert_acknowledgment", "alert", "chain_of_custody", "evidence_integrity_check",
  "compliance_report", "media_asset", "audit_log", "verification", "data_deletion_request", "law_enforcement_officer",
  // Legacy (currently unused, empty) tables with FKs into the ones above.
  "anonymous_tip", "detection", "dispatch_request", "entity_track", "face_detection", "geofence_violation",
  "media_annotation", "media_metadata", "media_retention_record", "media_transcoded_variant", "movement_pattern",
  "movement_pattern_analysis", "movement_prediction", "movement_timeline", "person_attributes", "plate_detection",
  "reconstruction_project", "reconstruction_asset", "scene_annotation", "scene_measurement", "sighting",
  "sighting_comment", "source_file", "track_segment", "evidence_marker",
];
await client.query(`truncate ${WIPE.map((t) => `public."${t}"`).join(", ")}`);
console.log(`  removed ${await emptyBucket(EVIDENCE_BUCKET)} evidence objects, ${await emptyBucket(PHOTO_BUCKET)} profile photos`);

// ================================================================ PEOPLE ==
console.log("Seeding profiles…");
const personId: Record<string, string> = {};
for (const p of PEOPLE) {
  const id = randomUUID();
  personId[p.key] = id;
  const seen = (p.seenAt ?? []).map((k) => loc(k));
  await insert("entity_profile", {
    id, entity_type: p.entityType, display_name: p.displayName,
    known_plate_numbers: p.plates ?? [],
    attributes: { physicalDescription: p.physicalDescription, charges: p.charges },
    first_seen_at: D("2026-07-01T00:00:00+02:00"), last_seen_at: D("2026-10-10T00:00:00+02:00"),
    detection_count: seen.length, locations_seen: seen, status: p.status,
    watchlist_status: p.watchlist && p.status === "ACTIVE" ? p.watchlist.priority : "NONE",
    notes: "SIMULATED TEST PERSONA — fictitious, not a real individual.",
    created_at: D("2026-07-01T09:00:00+02:00"),
  });
}

// ================================================================= CASES ==
console.log("Seeding cases…");
const caseId: Record<string, string> = {};
const caseNumberOf: Record<string, string> = {};
let incCounter = 0;
const incNumber = (at: string) => `INC-MAN-${new Date(at).getTime()}-${String(++incCounter).padStart(3, "0")}${rand6().slice(0, 3)}`;

for (const c of CASES) {
  const id = randomUUID();
  caseId[c.key] = id;
  caseNumberOf[c.key] = c.number;
  const creator = uid(c.creator)!;
  const created = D(c.created);
  const lastActivity = [c.created, c.reviewAt, c.closed, ...c.notes.map((n) => n.at)].filter(Boolean).sort().at(-1)!;
  await insert("case", {
    id, case_number: c.number, case_type: c.type, title: c.title, description: c.description,
    priority: c.priority, status: c.status, assigned_to_user_id: uid(c.assignee), created_by_user_id: creator,
    is_sensitive: !!c.sensitive, closed_at: c.closed ? D(c.closed) : null, resolution_notes: c.resolution ?? null,
    created_at: created, updated_at: D(lastActivity),
  });
  caseEvent(id, "CASE_CREATED", "Case opened", { caseType: c.type, priority: c.priority }, creator, created);
  if (c.assignee) caseEvent(id, "INVESTIGATOR_ASSIGNED", "Investigator assigned", { previousUserId: null, newUserId: uid(c.assignee) }, creator, addMin(created, 30));
  if (c.sensitive) caseEvent(id, "SENSITIVITY_CHANGED", "Marked sensitive", { isSensitive: true }, creator, addMin(created, 35));

  // status path
  const path: [string, Date, string][] = [];
  if (c.status !== "OPEN") path.push(["UNDER_INVESTIGATION", addMin(created, 60), "Investigation started"]);
  if (["AWAITING_REVIEW", "CLOSED", "ARCHIVED"].includes(c.status)) path.push(["AWAITING_REVIEW", D(c.reviewAt!), "Docket submitted for review"]);
  if (["CLOSED", "ARCHIVED"].includes(c.status)) path.push(["CLOSED", D(c.closed!), c.resolution!.slice(0, 120)]);
  if (c.status === "ARCHIVED") path.push(["ARCHIVED", addMin(c.closed!, 60 * 24 * 100), "Archived after retention review"]);
  let from = "OPEN";
  for (const [to, at, reason] of path) {
    caseEvent(id, "STATUS_CHANGE", `Status: ${from} → ${to}`, { from, to, reason }, uid(c.assignee) ?? creator, at);
    from = to;
  }
  if (c.status === "ARCHIVED") await client.query(`update public."case" set updated_at = $1 where id = $2`, [path.at(-1)![1], id]);

  for (const inc of c.incidents) {
    const incId = randomUUID();
    await insert("incident", {
      id: incId, incident_number: incNumber(inc.at), incident_type: inc.type, title: inc.title, description: inc.description,
      location: loc(inc.place), occurred_at: D(inc.at), severity: inc.severity,
      status: ["CLOSED", "ARCHIVED"].includes(c.status) ? "CLOSED" : (inc.status ?? "REPORTED"),
      source_domain: "MANUAL", reported_by_user_id: creator, created_at: addMin(inc.at, 25),
    });
    const linkedAt = new Date(Math.max(addMin(inc.at, 30).getTime(), addMin(created, 10).getTime()));
    await insert("case_incident", { case_id: id, incident_id: incId, linked_at: linkedAt });
    caseEvent(id, "INCIDENT_LINKED", `Incident linked: ${inc.title}`, { incidentId: incId }, creator, linkedAt);
  }

  for (const n of c.notes) {
    const author = uid(c.assignee) ?? creator;
    await insert("investigation_note", { case_id: id, note_type: n.type, content: n.content, created_by_user_id: author, created_at: D(n.at) });
    caseEvent(id, "NOTE_ADDED", `${n.type[0]}${n.type.slice(1).toLowerCase().replace("_", "-")} note added`, { noteType: n.type }, author, D(n.at));
  }

  for (const e of c.evidence) {
    const uploader = c.assignee ?? c.creator;
    const m = await createMedia({ ...e, place: loc(e.place), caseRef: c.number, type: "IMAGE", source: "MANUAL_UPLOAD", uploader });
    const at = addMin(e.at, 30);
    const linkAt = at < created ? addMin(created, 15) : at;
    await insert("case_evidence", {
      case_id: id, evidence_entity_type: "MEDIA_ASSET", evidence_entity_id: m.id,
      relationship_description: e.description, created_by_user_id: uid(uploader), created_at: linkAt,
    });
    caseEvent(id, "EVIDENCE_LINKED", `Evidence added: ${e.title}`, { evidenceId: m.id, fileHash: m.hash, mimeType: "image/jpeg" }, uid(uploader), linkAt);
    // A verified integrity check + access on older evidence.
    if (new Date(e.at) < D("2026-09-15T00:00:00+02:00")) {
      const vAt = addMin(linkAt, 60 * 24 * 7);
      await insert("evidence_integrity_check", { evidence_entity_type: "MEDIA_ASSET", evidence_entity_id: m.id, computed_hash: m.hash, stored_hash: m.hash, is_valid: true, checked_at: vAt, created_at: vAt });
      await insert("chain_of_custody", { evidence_entity_type: "MEDIA_ASSET", evidence_entity_id: m.id, action: "VERIFIED", from_user_id: uid(uploader), to_user_id: uid(uploader), reason: "Integrity verified — hash match", evidence_hash: m.hash, location: "Sentinel360 evidence store", metadata: {}, created_at: vAt });
      await insert("chain_of_custody", { evidence_entity_type: "MEDIA_ASSET", evidence_entity_id: m.id, action: "ACCESSED", from_user_id: uid(uploader), to_user_id: uid(uploader), reason: "Evidence downloaded", evidence_hash: m.hash, location: null, metadata: { download: true }, created_at: addMin(vAt, 45) });
    }
  }

  for (const pl of c.people ?? []) {
    await insert("case_criminal", { case_id: id, entity_profile_id: personId[pl.person], role: pl.role, notes: pl.notes ?? null, linked_by_user_id: uid(c.assignee) ?? creator, linked_at: D(pl.at) });
    caseEvent(id, "CRIMINAL_LINKED", `${pl.role.replace(/_/g, " ").toLowerCase()} linked`, { entityProfileId: personId[pl.person], role: pl.role }, uid(c.assignee) ?? creator, D(pl.at));
  }

  for (const a of c.arrests ?? []) {
    await insert("case_arrest", {
      case_id: id, entity_profile_id: personId[a.person], arrested_at: D(a.at), with_warrant: a.withWarrant,
      warrant_number: a.warrant ?? null, location: loc(a.place), rights_informed_at: addMin(a.at, 5),
      custody_status: a.custody, notes: a.notes ?? null, created_by_user_id: uid(c.assignee) ?? creator, created_at: addMin(a.at, 90),
    });
    caseEvent(id, "ARREST_RECORDED", "Arrest recorded", { entityProfileId: personId[a.person], withWarrant: a.withWarrant }, uid(c.assignee) ?? creator, addMin(a.at, 90));
  }

  for (const d of c.decisions ?? []) {
    await insert("case_prosecution_decision", { case_id: id, decision: d.decision, prosecutor_name: d.prosecutor, decided_at: D(d.at), reason: d.reason, created_by_user_id: uid(c.assignee) ?? creator, created_at: addMin(d.at, 30) });
    caseEvent(id, "PROSECUTION_DECISION", `NPA decision: ${d.decision.replace(/_/g, " ").toLowerCase()}`, { decision: d.decision, reason: d.reason }, uid(c.assignee) ?? creator, addMin(d.at, 30));
  }

  for (const h of c.hearings ?? []) {
    // Scheduled ~5 days ahead, but never in the future relative to the seed's "now".
    const scheduledOn = new Date(Math.min(addMin(h.at, -60 * 24 * 5).getTime(), SEED_NOW.getTime()));
    await insert("case_hearing", {
      case_id: id, hearing_type: h.type, scheduled_at: D(h.at), court_name: h.court, case_roll_number: h.roll ?? null,
      presiding_officer: h.officer ?? null, outcome_type: h.outcome, outcome_notes: h.notes ?? null,
      next_hearing_at: h.next ? D(h.next) : null,
      bail_schedule_classification: h.bail?.cls ?? null, bail_amount: h.bail?.amount ?? null,
      bail_conditions: h.bail?.conditions ?? null, bail_decision: h.bail?.decision ?? null,
      created_by_user_id: uid(c.assignee) ?? creator, created_at: scheduledOn,
      updated_at: h.outcome === "PENDING" ? scheduledOn : addMin(h.at, 240),
    });
    caseEvent(id, "HEARING_SCHEDULED", `${h.type.replace(/_/g, " ").toLowerCase()} scheduled`, { hearingType: h.type, scheduledAt: D(h.at).toISOString() }, uid(c.assignee) ?? creator, scheduledOn);
    if (h.outcome !== "PENDING") {
      caseEvent(id, "HEARING_OUTCOME_RECORDED", `Hearing outcome: ${h.outcome.toLowerCase()}`, { outcomeType: h.outcome, nextHearingAt: h.next ? D(h.next).toISOString() : null }, uid(c.assignee) ?? creator, addMin(h.at, 240));
    }
  }
}

// Watchlist entries
for (const p of PEOPLE) {
  if (!p.watchlist || p.status !== "ACTIVE") continue;
  await insert("watchlist_entry", {
    entity_profile_id: personId[p.key], priority_level: p.watchlist.priority, reason: p.watchlist.reason,
    case_id: caseId[p.watchlist.caseKey], expiry_date: D("2027-04-30T23:59:00+02:00"),
    created_by_user_id: USERS.serati, status: "ACTIVE", created_at: D("2026-09-01T09:00:00+02:00"),
  });
}

// ========================================================= NOTIFICATIONS ==
async function createAlert(a: {
  type: string; title: string; message: string; severity: string; sourceDomain: string; sourceEntityType?: string;
  sourceEntityId?: string; status?: string; location: Place; metadata: Record<string, unknown>; at: Date; expiresAt?: Date | null;
  recipients: UserKey[]; readBy?: UserKey[]; ackBy?: UserKey[]; actionUrl?: string | null;
}) {
  const id = randomUUID();
  await insert("alert", {
    id, alert_type: a.type, title: a.title, message: a.message, severity: a.severity, source_domain: a.sourceDomain,
    source_entity_type: a.sourceEntityType ?? null, source_entity_id: a.sourceEntityId ?? null, status: a.status ?? "ACTIVE",
    location: a.location, metadata: a.metadata, expires_at: a.expiresAt ?? null, created_at: a.at, updated_at: a.at,
  });
  for (const r of a.recipients) {
    await insert("notification", {
      alert_id: id, recipient_user_id: USERS[r], channel: "IN_APP", title: a.title, body: a.message,
      delivery_status: "DELIVERED", sent_at: a.at, delivered_at: a.at,
      read_at: a.readBy?.includes(r) ? addMin(a.at, 25) : null, action_url: a.actionUrl ?? null, created_at: a.at,
    });
  }
  for (const r of a.ackBy ?? []) {
    await insert("alert_acknowledgment", { alert_id: id, user_id: USERS[r], channel: "IN_APP", notes: "Acknowledged — reviewing.", acknowledged_at: addMin(a.at, 12) });
  }
  return id;
}

// ===================================================== AI PIPELINE EVENTS ==
console.log("Seeding AI pipeline events…");
let caseSeq2026 = Math.max(...CASES.filter((c) => c.number.startsWith("S360-2026")).map((c) => Number(c.number.slice(-5))));
for (const e of AI_EVENTS) {
  const incId = randomUUID();
  const eventId = `evt_${sha256(e.key).slice(0, 12)}`;
  const severity = { WEAPON_DETECTED: "CRITICAL", PANIC_BUTTON: "CRITICAL", ANOMALY_DETECTED: "HIGH", ALTERCATION: "HIGH", WATCHLIST_MATCH: "HIGH", PLATE_MATCH: "MEDIUM" }[e.type];
  const status = { PENDING: "PENDING_REVIEW", DOCKETED: "DOCKETED", DISMISSED: "DISMISSED" }[e.decision];
  const place = loc(e.place);
  await insert("incident", {
    id: incId, incident_number: `INC-AI-${eventId}`, incident_type: e.type, title: e.title, description: e.message,
    location: { name: e.camera, ...place }, occurred_at: D(e.at), severity, status,
    source_domain: "ai_pipeline", source_entity_type: "CAMERA", source_entity_id: e.camera, created_at: D(e.at),
  });
  const media: Media[] = [];
  for (const kind of ["SNAPSHOT", "CROP"] as const) {
    const label = kind === "SNAPSHOT" ? e.title : `${e.weaponClass ? e.weaponClass.toUpperCase() : e.plate ?? (e.watchPerson ? "FACE" : "SUBJECT")} — ${Math.round(e.confidence * 100)}%`;
    media.push(await createMedia({
      title: `${e.type} ${kind.toLowerCase()} — ${e.camera}`, description: e.message, label, at: e.at, place, camera: e.camera,
      type: "IMAGE", source: "AI_PIPELINE", uploader: null,
      metadata: { kind, eventType: e.type, eventId, confidence: e.confidence, incidentId: incId, ...(kind === "CROP" ? { objectName: e.weaponClass ?? e.plate ?? "person", objectLabel: label } : {}) },
    }));
  }
  const metadata: Record<string, unknown> = {
    targetRole: "OPERATORS_AND_POLICE", cameraId: e.camera, confidence: e.confidence, incidentId: incId, eventId,
    detectionCount: e.detections, firstDetectedAt: D(e.at).toISOString(), lastDetectedAt: addMin(e.at, e.detections).toISOString(),
    maxConfidence: e.confidence, modelStatus: "experimental", model: "sentinel-yolo-sa-v2",
    ...(e.weaponClass ? { weaponClass: e.weaponClass } : {}),
    ...(e.plate ? { plate: e.plate } : {}),
    ...(e.watchPerson ? { watchlistMatches: [{ entityProfileId: personId[e.watchPerson], displayName: PEOPLE.find((p) => p.key === e.watchPerson)!.displayName, similarity: e.confidence }] } : {}),
  };
  const reviewAt = addMin(e.at, 18).toISOString();
  if (e.decision === "PENDING") metadata.review = { decision: "PENDING" };
  if (e.decision === "DISMISSED") metadata.review = { decision: "DISMISSED", byUserId: USERS.serati, at: reviewAt, reason: e.dismissReason };
  if (e.decision === "DOCKETED" && e.docket) {
    const cId = randomUUID();
    caseSeq2026 = Math.max(caseSeq2026, Number(e.docket.number.slice(-5)));
    await insert("case", {
      id: cId, case_number: e.docket.number, case_type: "AI_GENERATED", title: e.docket.title, description: e.docket.description,
      priority: severity, status: "OPEN", assigned_to_user_id: null, created_by_user_id: USERS.serati, created_at: D(reviewAt), updated_at: D(reviewAt),
    });
    caseEvent(cId, "CASE_CREATED", "Case opened from AI review", { caseType: "AI_GENERATED", priority: severity, source: "ai_pipeline", reviewed: true }, USERS.serati, D(reviewAt));
    await insert("case_incident", { case_id: cId, incident_id: incId, linked_at: D(reviewAt) });
    caseEvent(cId, "INCIDENT_LINKED", "AI incident linked", { incidentId: incId }, USERS.serati, D(reviewAt));
    for (const m of media) await insert("case_evidence", { case_id: cId, evidence_entity_type: "MEDIA_ASSET", evidence_entity_id: m.id, relationship_description: "AI pipeline capture", created_by_user_id: USERS.serati, created_at: D(reviewAt) });
    caseEvent(cId, "EVIDENCE_LINKED", "AI captures linked", { evidenceIds: media.map((m) => m.id), source: "ai_pipeline" }, USERS.serati, D(reviewAt));
    Object.assign(metadata, { caseId: cId, caseNumber: e.docket.number, review: { decision: "DOCKETED", byUserId: USERS.serati, at: reviewAt } });
  }
  await createAlert({
    type: e.type, title: e.title, message: e.message, severity, sourceDomain: "ai_pipeline", sourceEntityType: "INCIDENT", sourceEntityId: incId,
    status: e.decision === "DISMISSED" ? "RESOLVED" : "ACTIVE", location: { name: e.camera, ...place } as Place, metadata, at: D(e.at),
    recipients: STAFF, readBy: e.decision === "PENDING" ? [] : STAFF, ackBy: e.decision === "PENDING" ? [] : ["serati"],
  });
}

// ================================================= COMMUNITY SIGHTINGS ==
console.log("Seeding community sightings…");
const sightingIds: string[] = [];
const ordered = SIGHTINGS.map((s, i) => ({ s, i })).sort((a, b) => a.s.at.localeCompare(b.s.at));
const refOf = new Map<number, string>();
ordered.forEach(({ i }, n) => refOf.set(i, `ST-2026-${String(n + 1).padStart(5, "0")}`));
// Duplicates in data.ts reference their original by data index; fix up the
// human-readable "Same event as …" reasons to the real reference codes.
for (const { s, i } of ordered) {
  const id = randomUUID();
  sightingIds[i] = id;
  const moderated = s.moderation !== "PENDING";
  const modAt = addMin(s.at, 35);
  const reason = s.duplicateOf !== undefined ? `Same event as ${refOf.get(s.duplicateOf)}.` : s.reason ?? null;
  const media: Media[] = [];
  if (s.photo) media.push(await createMedia({ title: `Community photo — ${s.title}`, description: s.description, label: s.photo, at: s.at, place: loc(s.place), type: "PHOTO", source: "SIGHTING", uploader: s.reporter }));
  const suggested = s.subject
    ? CASES.filter((c) => c.people?.some((pp) => pp.person === s.subject) || PEOPLE.find((pp) => pp.key === s.subject)?.watchlist?.caseKey === c.key).map((c) => caseId[c.key])
    : [];
  let incidentId: string | null = null;
  if (s.moderation === "APPROVED") {
    incidentId = randomUUID();
    await insert("incident", {
      id: incidentId, incident_number: `INC-SGT-${new Date(s.at).getTime()}-${rand6()}`, incident_type: s.type, title: s.title,
      description: s.description, location: loc(s.place), occurred_at: D(s.at), severity: s.severity ?? "MEDIUM", status: "REPORTED",
      source_domain: "community_sightings", source_entity_type: "COMMUNITY_SIGHTING", source_entity_id: id,
      reported_by_user_id: USERS[s.reporter], created_at: modAt,
    });
  }
  await insert("community_sighting", {
    id, reference_code: refOf.get(i), reporter_user_id: USERS[s.reporter], sighting_type: s.type, title: s.title,
    description: s.description, location: loc(s.place), occurred_at: D(s.at), media_ids: media.map((m) => m.id),
    status: moderated ? "RESOLVED" : "SUBMITTED", severity: s.severity ?? null,
    visibility: s.moderation === "APPROVED" ? "COMMUNITY" : "PRIVATE",
    operator_notes: moderated ? reason : null, linked_incident_id: incidentId,
    subject_entity_profile_id: s.subject ? personId[s.subject] : null, suggested_case_ids: suggested,
    duplicate_of_sighting_id: null, moderation_status: s.moderation, moderation_reason: moderated ? reason : null,
    reported_at: D(s.at), is_anonymous: !!s.anonymous, created_at: addMin(s.at, 3), updated_at: moderated ? modAt : addMin(s.at, 3),
  });
  if (moderated) {
    audit.push({ at: modAt, domain: "sightings", eventType: "SIGHTING_MODERATED", actor: USERS.serati, targetType: "community_sighting", targetId: id, action: `Sighting ${s.moderation.toLowerCase()}`, payload: { moderationStatus: s.moderation, reason } });
    const alertType = { APPROVED: "SIGHTING_APPROVED", REJECTED: "SIGHTING_REJECTED", DUPLICATE: "SIGHTING_DUPLICATE" }[s.moderation];
    await createAlert({
      type: alertType, title: `Your report ${refOf.get(i)} was ${s.moderation === "DUPLICATE" ? "marked as a duplicate" : s.moderation.toLowerCase()}`,
      message: reason ?? "Thank you for your report.", severity: "LOW", sourceDomain: "COMMUNITY_SIGHTING",
      sourceEntityType: "COMMUNITY_SIGHTING", sourceEntityId: id, location: loc(s.place),
      metadata: { targetRole: "PERSONAL", createdByUserId: USERS.serati, sightingId: id, referenceCode: refOf.get(i) }, at: modAt,
      recipients: [s.reporter], readBy: Math.random() < 0.6 ? [s.reporter] : [],
    });
  }
  if (s.moderation === "APPROVED" && s.subject) {
    const person = PEOPLE.find((pp) => pp.key === s.subject)!;
    await createAlert({
      type: "COMMUNITY_SIGHTING_APPROVED", title: `Sighting of wanted ${person.entityType === "PERSON" ? "person" : "vehicle"}: ${person.displayName}`,
      message: `A community report places ${person.displayName} near ${loc(s.place).address}. Do not approach — call 10111.`,
      severity: s.severity ?? "HIGH", sourceDomain: "COMMUNITY_SIGHTING", sourceEntityType: "COMMUNITY_SIGHTING", sourceEntityId: id,
      location: loc(s.place), metadata: { targetRole: "COMMUNITY", createdByUserId: USERS.serati, sightingId: id }, at: addMin(modAt, 5),
      expiresAt: addMin(modAt, 60 * 24 * 14), recipients: COMMUNITY, readBy: ["tashen", "linda"],
    });
  }
  if (s.docket && incidentId) {
    const cId = randomUUID();
    const at = addMin(modAt, 10);
    await insert("case", {
      id: cId, case_number: s.docket.number, case_type: "COMMUNITY_SIGHTING", title: s.docket.title, description: s.docket.description,
      priority: s.severity ?? "HIGH", status: "UNDER_INVESTIGATION", assigned_to_user_id: USERS.serati, created_by_user_id: USERS.serati, created_at: at, updated_at: addMin(at, 120),
    });
    caseEvent(cId, "CASE_CREATED", "Case opened from community sighting", { caseType: "COMMUNITY_SIGHTING", priority: s.severity ?? "HIGH", sightingId: id }, USERS.serati, at);
    caseEvent(cId, "INVESTIGATOR_ASSIGNED", "Investigator assigned", { previousUserId: null, newUserId: USERS.serati }, USERS.serati, addMin(at, 2));
    await insert("case_incident", { case_id: cId, incident_id: incidentId, linked_at: addMin(at, 3) });
    caseEvent(cId, "INCIDENT_LINKED", "Sighting incident linked", { incidentId, sightingId: id }, USERS.serati, addMin(at, 3));
    caseEvent(cId, "STATUS_CHANGE", "Status: OPEN → UNDER_INVESTIGATION", { from: "OPEN", to: "UNDER_INVESTIGATION", reason: "Corroborated by AI watchlist match" }, USERS.serati, addMin(at, 120));
    await insert("case_criminal", { case_id: cId, entity_profile_id: personId[s.subject!], role: "SUSPECT", notes: "Subject of the sighting.", linked_by_user_id: USERS.serati, linked_at: addMin(at, 5) });
    caseEvent(cId, "CRIMINAL_LINKED", "suspect linked", { entityProfileId: personId[s.subject!], role: "SUSPECT" }, USERS.serati, addMin(at, 5));
    await insert("investigation_note", { case_id: cId, note_type: "FOLLOW_UP", content: "Requested Park Station PRASA CCTV for 17:30–19:00. Cross-referencing with docket S360-2026-00004.", created_by_user_id: USERS.serati, created_at: addMin(at, 90) });
    caseEvent(cId, "NOTE_ADDED", "Follow-up note added", { noteType: "FOLLOW_UP" }, USERS.serati, addMin(at, 90));
    await createAlert({
      type: "SIGHTING_LINKED_TO_CASE", title: `Your report ${refOf.get(i)} is now part of an investigation`,
      message: `Thank you. An investigating officer has opened docket ${s.docket.number} based on your report.`, severity: "MEDIUM",
      sourceDomain: "COMMUNITY_SIGHTING", sourceEntityType: "CASE", sourceEntityId: cId, location: loc(s.place),
      metadata: { targetRole: "PERSONAL", caseId: cId, sightingId: id }, at: addMin(at, 4), recipients: [s.reporter], actionUrl: `/docket/${cId}`,
    });
  }
}
// duplicate_of links (originals now exist)
for (const [i, s] of SIGHTINGS.entries()) {
  if (s.duplicateOf !== undefined) await client.query(`update public.community_sighting set duplicate_of_sighting_id = $1 where id = $2`, [sightingIds[s.duplicateOf], sightingIds[i]]);
}

// ========================================================= BROADCASTS ==
console.log("Seeding community broadcasts…");
for (const b of BROADCASTS) {
  const at = D(b.at);
  await createAlert({
    type: b.type, title: b.title, message: b.message, severity: b.severity, sourceDomain: "MANUAL", location: loc(b.place),
    metadata: { targetRole: "COMMUNITY", createdByUserId: USERS.donnell }, at, expiresAt: addMin(at, 60 * 24 * 30),
    recipients: [...COMMUNITY], readBy: ["linda", "timothy"],
  });
}

// ============================================== TIMELINE + AUDIT CHAIN ==
console.log("Writing timeline and audit chain…");
for (const t of timeline) {
  await insert("case_timeline_entry", { case_id: t.caseId, event_type: t.eventType, summary: t.summary, payload: t.payload, actor_user_id: t.actor, occurred_at: t.at });
}
audit.sort((a, b) => a.at.getTime() - b.at.getTime());
let prev: string | null = null;
let lastMs = 0;
for (const a of audit) {
  // created_at must be strictly increasing so "latest row" is unambiguous for the next app write.
  const ms = Math.max(a.at.getTime(), lastMs + 1);
  lastMs = ms;
  const entryHash = sha256((prev ?? "") + JSON.stringify(canonicalValue(a.payload)));
  await insert("audit_log", {
    event_type: a.eventType, domain: a.domain, actor_id: a.actor, actor_type: "USER", target_entity_type: a.targetType,
    target_entity_id: a.targetId, action: a.action, payload: a.payload, entry_hash: entryHash, previous_hash: prev,
    status: "COMPLETE", created_at: new Date(ms),
  });
  prev = entryHash;
}

// ============================================================= SUMMARY ==
const tables = ["case", "incident", "case_incident", "investigation_note", "case_evidence", "media_asset", "chain_of_custody", "entity_profile", "watchlist_entry", "case_criminal", "case_arrest", "case_hearing", "case_prosecution_decision", "community_sighting", "alert", "notification", "case_timeline_entry", "audit_log"];
for (const t of tables) {
  const { rows } = await client.query(`select count(*)::int n from public."${t}"`);
  console.log(`  ${t.padEnd(28)} ${rows[0].n}`);
}
await client.end();
console.log("Done.");
