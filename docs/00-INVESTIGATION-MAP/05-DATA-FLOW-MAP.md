# Sentinel360 — End-to-End Data Flow Maps

> **Document:** Data Flow Diagrams for All Major System Processes
> **Group:** Alpha Tech
> **Last Updated:** June 2026

---

## 1. Data Flow Notation

```
[External Entity] ──► (Process) ──► [Data Store]
                   ◄──              ◄──
┌─────┐            ┌─────┐          ┌─────┐
│Actor│  Data Flow │Proc │   Flow   │Storage│
└─────┘            └─────┘          └─────┘
```

---

## 2. Primary Data Flow: AI Detection → Alert

### 2.1 Flow Diagram

```
┌──────────────┐    Video Stream    ┌──────────────────┐
│  360° Camera ├────────────────────► Edge Node        │
│  (Edge Node) │                    │ (NVIDIA Jetson)  │
└──────────────┘                    └────────┬─────────┘
                                             │ YOLOv8 inference
                                             ▼
                                    ┌──────────────────┐
                                    │ Face/Vehicle/     │
                                    │ Behaviour Detected│
                                    └────────┬─────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │ High confidence (>95%)?      │
                              │ Yes                  No      │
                              │                       │      │
                              ▼                       ▼      │
                     ┌────────────────┐     ┌──────────────┐ │
                     │ Extract         │     │ Queue for    │ │
                     │ Attributes      │     │ Low-Conf     │ │
                     │ (Face, ALPR,    │     │ Review       │ │
                     │  Clothing)      │     └──────────────┘ │
                     └───────┬────────┘                      │
                             │                                │
                             ▼                                │
                     ┌────────────────┐                       │
                     │ Match Against  │                       │
                     │ Wanted Profiles│                       │
                     └───────┬────────┘                       │
                             │                                │
                    ┌────────┴──────────┐                    │
                    │ Match found?       │                    │
                    │ Yes         No     │                    │
                    │              │     │                    │
                    ▼              ▼     │                    │
            ┌────────────┐  ┌─────────┐  │                    │
            │ Create      │  │ Log as  │  │                    │
            │ Evidence    │  │ Unknown │  │                    │
            │ Record      │  │ Entity  │  │                    │
            └──────┬─────┘  └─────────┘  │                    │
                   │                      │                    │
                   ▼                      │                    │
            ┌────────────┐                │                    │
            │ SHA-256     │                │                    │
            │ Hash +      │                │                    │
            │ Chain Entry │                │                    │
            └──────┬─────┘                │                    │
                   │                      │                    │
                   ▼                      ▼                    ▼
            ┌──────────────────────────────────────────────────┐
            │              Alert Routing Engine                 │
            │  Determines recipients based on:                  │
            │   • Role (security, LEO, community)               │
            │   • Region (geofence match)                       │
            │   • User preferences                              │
            └──────┬────────────────────┬──────────────────────┘
                   │                    │
                   ▼                    ▼
            ┌──────────────┐   ┌────────────────┐
            │ Push          │   │ In-App          │
            │ Notification  │   │ Notification    │
            │ (FCM/APNS)    │   │ (WebSocket)     │
            └──────┬───────┘   └───────┬────────┘
                   │                   │
                   ▼                   ▼
            ┌────────────────────────────────────┐
            │  User Acknowledges / Dismisses      │
            │  • Logged to audit trail            │
            │  • If LEO: evidence added to case   │
            │  • If false: feedback to AI model   │
            └────────────────────────────────────┘
```

### 2.2 Data Stores Involved

| Data Store | Read | Write | Purpose |
|------------|------|-------|---------|
| `evidence` | ✅ | ✅ | Detection evidence record |
| `evidence_chain_of_custody` | ✅ | ✅ | Immutable chain entry |
| `ai_inference_results` | ✅ | ✅ | AI model output |
| `face_matches` | ✅ | ✅ | Face match results |
| `alerts` | ✅ | ✅ | Alert record |
| `alert_recipients` | ✅ | ✅ | Per-user alert delivery |
| `notifications` | ✅ | ✅ | In-app notification |
| `criminal_profiles` | ✅ | ❌ | Match lookup |

---

## 3. Data Flow: Community Sighting Submission

### 3.1 Flow Diagram

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│  Community   │    │  Mobile App      │    │  API Server  │
│  Member      ├────► Report Screen    ├────► Sightings    │
│              │    │ Capture photo    │    │ Router       │
│              │    │ GPS location     │    │              │
│              │    │ Description      │    │              │
└──────────────┘    └──────────────────┘    └──────┬───────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │ Validate Input   │
                                          │ • Photo format   │
                                          │ • GPS coords     │
                                          │ • Description    │
                                          └──────┬───────────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │ Upload Media to  │
                                          │ S3/MinIO         │
                                          │ + SHA-256 hash   │
                                          └──────┬───────────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │ Create Sighting  │
                                          │ Record           │
                                          │ • Generate ref # │
                                          │ • Status=pending │
                                          └──────┬───────────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │ Enqueue AI Match │
                                          │ (Bull Queue)     │
                                          └──────┬───────────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │ Return to User   │
                                          │ • Reference #    │
                                          │ • Status update  │
                                          │ notification     │
                                          └──────────────────┘
```

### 3.2 Data Stores

| Data Store | Read | Write | Purpose |
|------------|------|-------|---------|
| `sightings` | ✅ | ✅ | Sighting record |
| `sighting_media` | ✅ | ✅ | Uploaded media refs |
| `sighting_verifications` | ❌ | Future | Verification record |
| S3/MinIO | ✅ | ✅ | Raw media storage |

---

## 4. Data Flow: Case Investigation (Docket)

### 4.1 Flow Diagram

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ Investigator │    │  Web Dashboard   │    │  API Server  │
│ (LEO)        ├────► Case Detail      ├────► Cases Router│
│              │    │ Page (Docket)    │    │              │
└──────────────┘    └──────────────────┘    └──────┬───────┘
                                                   │
                    ┌───────────────────────────────┘
                    │
                    ▼
          ┌─────────────────────┐
          │ Load Case + All     │
          │ Related Data        │
          └──────────┬──────────┘
                     │
        ┌────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Case       │ │ Criminal   │ │ Evidence   │ │ Timeline   │
│ Details    │ │ Profiles   │ │ List       │ │ Events     │
│ + Status   │ │ + Roles    │ │ + Status   │ │ + Filter   │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

                     │ Investigator actions:
                     ▼
          ┌──────────────────────────────────────┐
          │ Add timeline entry                   │
          │ Link evidence to case                │
          │ Add case note (public/private)       │
          │ Update case status                   │
          │ Link criminal profile                │
          │ Update criminal status               │
          │ Export case as XML/JSON for SAPS     │
          └──────────────────────────────────────┘
```

### 4.2 Data Stores

| Data Store | Read | Write | Purpose |
|------------|------|-------|---------|
| `cases` | ✅ | ✅ | Case record |
| `case_timeline_entries` | ✅ | ✅ | Chronological events |
| `case_activity_logs` | ✅ | ✅ | Immutable audit |
| `case_notes` | ✅ | ✅ | Investigator notes |
| `case_criminals` | ✅ | ✅ | Case-profile links |
| `case_evidence` | ✅ | ✅ | Case-evidence links |
| `criminal_profiles` | ✅ | ❌ | Linked profiles |
| `evidence` | ✅ | ❌ | Linked evidence |
| `audit_logs` | ✅ | ✅ | All actions logged |

---

## 5. Data Flow: Evidence Chain of Custody

### 5.1 Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                 Evidence Lifecycle                        │
│                                                          │
│  1. Created (AI capture / Upload / System-generated)     │
│     ├── SHA-256 hash computed on original file           │
│     ├── Chain entry: action="created", previous_hash=null│
│     └── Evidence status: pending                         │
│                                                          │
│  2. Verified (Admin / LEO reviews)                       │
│     ├── Chain entry: action="verified"                   │
│     ├── previous_hash = previous entry's current_hash    │
│     ├── current_hash = SHA-256(previous_hash + action +  │
│     │                    timestamp + verifier_id)         │
│     └── Evidence status: verified/rejected               │
│                                                          │
│  3. Accessed (Viewed / Downloaded)                       │
│     ├── Chain entry: action="accessed" or "exported"     │
│     ├── Hash chain continues                             │
│     └── Audit log records user ID, IP, timestamp         │
│                                                          │
│  4. Linked to case                                       │
│     ├── Chain entry: action="linked_to_case"             │
│     └── case_id stored in metadata                       │
│                                                          │
│  5. Exported (to SAPS / LEO CMS)                         │
│     ├── Chain entry: action="exported"                   │
│     ├── Export bundle includes hash manifest             │
│     └── Recipient can verify: hash(file) == hash(record) │
│                                                          │
│  6. Archived (Retention policy met)                      │
│     ├── Chain entry: action="archived"                   │
│     └── Data moved to cold storage; hash preserved       │
│                                                          │
│  7. Deleted (Legal hold released)                        │
│     ├── Chain entry: action="deleted"                    │
│     ├── Reason recorded                                  │
│     └── Only Super Admin with 2FA can perform            │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Hash Chain Integrity Verification

```
Chain verification algorithm:

  function verifyChain(evidenceId):
    chain = getChainOrderedByPosition(evidenceId)
    for i = 1 to chain.length:
      expectedHash = SHA-256(
        chain[i-1].current_hash +   // previous entry's hash
        chain[i].action +            // current action
        chain[i].performed_at +      // timestamp
        chain[i].performed_by        // user ID
      )
      if chain[i].current_hash != expectedHash:
        return FAIL("Chain broken at entry " + i)
      if chain[i].previous_hash != chain[i-1].current_hash:
        return FAIL("Previous hash mismatch at entry " + i)
    return PASS
```

---

## 6. System Context Diagram (High-Level)

```
┌──────────────────────────────────────────────────────────────────┐
│                    SOUTH AFRICAN BORDER                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Sentinel360 System                     │    │
│  │                                                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │    │
│  │  │ Web App  │  │ Mobile   │  │ API      │  │ AI     │ │    │
│  │  │ (Next.js)│  │ (Expo)   │  │ Gateway  │  │ Micro- │ │    │
│  │  │ :3001    │  │          │  │ (Hono)   │  │ service│ │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  │(Python)│ │    │
│  │       │              │             │         └────────┘ │    │
│  │       └──────┬───────┘             │                     │    │
│  │              │                     │                     │    │
│  │              ▼                     ▼                     │    │
│  │       ┌──────────────────────────────────────┐           │    │
│  │       │         tRPC API Layer               │           │    │
│  │       │  (Auth | Cases | Evidence | Alerts)  │           │    │
│  │       └────────────────┬─────────────────────┘           │    │
│  │                        │                                 │    │
│  │                        ▼                                 │    │
│  │       ┌──────────────────────────────────────┐           │    │
│  │       │      PostgreSQL (Supabase)            │           │    │
│  │       │   + Redis (Cache + Queue + Pub/Sub)   │           │    │
│  │       │   + MinIO/S3 (Media Storage)          │           │    │
│  │       └──────────────────────────────────────┘           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                External Integrations                    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐     │    │
│  │  │ SAPS     │  │ SAPS     │  │ Email Service    │     │    │
│  │  │ CMS      │  │ Hotline  │  │ (SendGrid/Mailgun)│    │    │
│  │  └──────────┘  └──────────┘  └──────────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Network Data Flow (Security Boundaries)

```
┌─────────────────┐         ┌─────────────────┐
│  Internet        │         │  DMZ             │
│                  │         │                  │
│  Community App   │──HTTPS──►  Hono API        │
│  Web Browser     │         │  (tRPC + Auth)   │
│  Mobile App      │         │                  │
└──────────────────┘         └────────┬─────────┘
                                       │
                              ┌────────▼─────────┐
                              │  Application      │
                              │  Network          │
                              │                   │
                              │  tRPC Routers     │
                              │  Business Logic   │
                              │  AI Orchestrator  │
                              └────────┬─────────┘
                                       │
                              ┌────────▼─────────┐
                              │  Data Network     │
                              │                   │
                              │  PostgreSQL       │
                              │  Redis            │
                              │  MinIO/S3         │
                              └───────────────────┘
                                       │
                              ┌────────▼─────────┐
                              │  AI Processing    │
                              │  Network          │
                              │                   │
                              │  Python AI API    │
                              │  GPU Workers      │
                              └───────────────────┘
```

---

## 8. Key Data Flow Requirements (NFR Mapping)

| Requirement | Flow Stage | Status |
|-------------|-----------|--------|
| Sub-second alert latency (NFR-01-002) | Detection → Alert | ❌ Not built |
| 95% confidence threshold (NFR-02-001) | Detection → Match | ❌ Not built |
| SHA-256 chain of custody (NFR-03-001) | All evidence flows | ❌ Not built |
| AES-256 encryption at rest (NFR-03-002) | All data stores | ✅ Supabase managed |
| TLS 1.3 in transit (NFR-03-003) | All external flows | ✅ Hono/Supabase |
| RBAC enforcement (NFR-03-004) | All API endpoints | 🔶 Partial |
| Immutable audit trail (NFR-03-005) | All write operations | ❌ Not built |
| SA data residency (NFR-07-003) | All data stores | ✅ AWS Cape Town |
