# Sentinel360 — Crime Docket Page Design ★ (Critical)

> **Document Version:** 1.0  
> **Last Updated:** June 2026  
> **Author:** Lead Frontend Developer — Alpha Tech  
> **Priority:** P0 — Highest fidelity, most complex page in the system

---

## Table of Contents

1. [Page Overview](#1-page-overview)
2. [Layout Architecture](#2-layout-architecture)
3. [Color Palette & Theme](#3-color-palette--theme)
4. [Center Section — Suspect Portrait & Risk Rings](#4-center-section--suspect-portrait--risk-rings)
5. [Left Sidebar — Case Information](#5-left-sidebar--case-information)
6. [Right Sidebar — Suspect Details](#6-right-sidebar--suspect-details)
7. [Bottom Panel — Investigation Workspace](#7-bottom-panel--investigation-workspace)
8. [Component Breakdown](#8-component-breakdown)
9. [State Management for Docket](#9-state-management-for-docket)
10. [Responsive Behavior](#10-responsive-behavior)
11. [Animations & Micro-interactions](#11-animations--micro-interactions)
12. [Data Flow](#12-data-flow)
13. [Accessibility Considerations](#13-accessibility-considerations)
14. [Complete Wireframe Description](#14-complete-wireframe-description)

---

## 1. Page Overview

The **Crime Docket** is the most critical page in Sentinel360. It is the single source of truth for an active investigation — combining suspect intelligence, forensic evidence, case metadata, and investigation tools in one immersive, futuristic interface.

### Purpose

Provide investigators and law enforcement officials with a **comprehensive, at-a-glance view** of a criminal case, centered around the suspect's identity and threat profile, with:
- Instant access to suspect biometrics and facial recognition data
- Real-time threat assessment with visual indicators
- Complete case history and evidence repository
- Collaborative investigation tools (notes, uploads, statements)
- Rapid status updates (arrest, flag, escalate)

### User Stories Served

| US-ID | User Story |
|---|---|
| US-10 | View full case details including evidence links |
| US-11 | Verify AI-flagged CCTV snapshots |
| US-13 | Update criminal status |
| US-14 | Create, edit, and archive criminal profiles |
| US-16 | Review and verify flagged snapshots |

---

## 2. Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER (part of DashboardLayout) — Breadcrumbs + Global Search     │
├────────────┬──────────────────────────────────┬────────────────────┤
│            │                                  │                     │
│  LEFT      │         CENTER                   │     RIGHT           │
│  SIDEBAR   │                                  │     SIDEBAR         │
│            │                                  │                     │
│  240px     │     1fr (flex-grow)              │     280px           │
│            │                                  │                     │
│ ┌────────┐ │  ┌────────────────────────────┐  │ ┌─────────────────┐ │
│ │ Case   │ │  │   SUSPECT PORTRAIT         │  │ │ Suspect         │ │
│ │ Info   │ │  │                            │  │ │ Details         │ │
│ │ Card   │ │  │   ┌────────────────────┐   │  │ │ Card            │ │
│ │        │ │  │   │                    │   │  │ │                 │ │
│ │ #SEN.. │ │  │   │   PHOTO +          │   │  │ │ Full Name: ... │ │
│ │ Robbery│ │  │   │   FACIAL OVERLAY   │   │  │ │ ID: 930...     │ │
│ │ Det.Shai│ │  │   │                    │   │  │ │ Age: 31        │ │
│ │ 12 Mar  │ │  │   └────────────────────┘   │  │ │ Gender: Male   │ │
│ │         │ │  │                            │  │ │ Address: ...   │ │
│ ├────────┤ │  │   ┌────────────────────┐   │  │ │                 │ │
│ │ Crim.  │ │  │   │   THREAT RINGS     │   │  │ ├─────────────────┤ │
│ │ History│ │  │   │   (animated)       │   │  │ │ Threat          │ │
│ │ Card   │ │  │   └────────────────────┘   │  │ │ Assessment      │ │
│ │         │ │  │                            │  │ │ Card            │ │
│ ├────────┤ │  │   ┌────────────────────┐   │  │ │                 │ │
│ │ Evid.  │ │  │   │   STATUS BADGE     │   │  │ │ [=====---] 76%  │ │
│ │ Summary│ │  │   │   (WANTED)         │   │  │ │                 │ │
│ │ Card   │ │  │   └────────────────────┘   │  │ ├─────────────────┤ │
│ │         │ │  │                            │  │ │ Known           │ │
│ ├────────┤ │  │   ┌────────────────────┐   │  │ │ Associates      │ │
│ │ Act.   │ │  │   │   QUICK ACTIONS    │   │  │ │ Card            │ │
│ │ Log    │ │  │   │                    │   │  │ │                 │ │
│ │ Card   │ │  │   │ [Arrest] [Flag]    │   │  │ │ • T. Moodley    │ │
│ │         │ │  │   │ [Update Status]   │   │  │ │ • P. Mashasha   │ │
│ └────────┘ │  │   └────────────────────┘   │  │ │                 │ │
│            │  │                            │  │ ├─────────────────┤ │
│            │  │                            │  │ │ Last Known      │ │
│            │  │                            │  │ │ Locations       │ │
│            │  │                            │  │ │ Card            │ │
│            │  │                            │  │ │                 │ │
│            │  │                            │  │ │ [MINI MAP]      │ │
│            │  │                            │  │ │                 │ │
├────────────┴──┴────────────────────────────┴──┴────────────────────┤
│  BOTTOM PANEL — Tabs: Notes | Evidence | Witnesses | Attachments    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ [Notes] [Evidence Upload] [Witness Statements] [Attachments]   ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │                                                                 ││
│  │  Tab Content Area (context-dependent)                           ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Grid Definition

```css
.docket-layout {
  display: grid;
  grid-template-columns: 240px 1fr 280px;
  grid-template-rows: 1fr auto;
  gap: 1.25rem;
  height: calc(100vh - 64px); /* full viewport minus header */
  overflow: hidden;
}

/* On tablets (< 1024px) */
@media (max-width: 1024px) {
  .docket-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
    height: auto;
    overflow: auto;
  }
}
```

---

## 3. Color Palette & Theme

### Primary Background

| Token | Hex | Usage |
|---|---|---|
| `bg-primary` | `#0a0e1a` | Main page background |
| `bg-secondary` | `#1a1f2e` | Card backgrounds, sidebar |
| `bg-tertiary` | `#2a2f3e` | Hover states, input backgrounds |

### Accent Colors

| Token | Hex | Usage |
|---|---|---|
| `accent-blue` | `#00d4ff` | Primary accent, links, active borders, threat ring glow |
| `accent-cyan` | `#00ff88` | Success states, verified badges, facial rec overlays |
| `accent-amber` | `#ffaa00` | Warning states, medium threat, pending items |
| `accent-red` | `#ef4444` | Critical threat, wanted status, danger actions |
| `accent-green` | `#22c55e` | Arrested status, safe, confirmed |

### Glassmorphism Tokens

| Token | Value | Usage |
|---|---|---|
| `glass-bg` | `rgba(255, 255, 255, 0.03–0.08)` | Card backgrounds |
| `glass-border` | `rgba(255, 255, 255, 0.05–0.15)` | Card borders |
| `glass-blur` | `blur(8px)–blur(24px)` | Backdrop blur intensity |

### Text Colors

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#f1f5f9` | Primary text |
| `text-secondary` | `#94a3b8` | Secondary/help text |
| `text-muted` | `#475569` | Disabled/muted text |
| `text-accent` | `#00d4ff` | Accent text, links |

### TailwindCSS Configuration

```ts
// tailwind.config.ts — Relevant excerpt for docket theme
colors: {
  navy: {
    900: '#0a0e1a',
    800: '#1a1f2e',
    700: '#2a2f3e',
    600: '#3a4a5e',
  },
  accent: {
    blue: '#00d4ff',
    cyan: '#00ff88',
    amber: '#ffaa00',
    red: '#ef4444',
    green: '#22c55e',
  },
},
backdropBlur: {
  xs: '2px',
  glass: '12px',
  'glass-lg': '20px',
  'glass-xl': '24px',
},
```

---

## 4. Center Section — Suspect Portrait & Risk Rings

### Component: `DocketCenterPanel`

```tsx
// components/docket/DocketCenterPanel.tsx
interface DocketCenterPanelProps {
  suspect: Suspect;
  threatAssessment: ThreatAssessment;
  onStatusChange: (status: SuspectStatus) => void;
  className?: string;
}
```

### Visual Layout

```
┌─────────────────────────────────────────────┐
│                                             │
│              SUSPECT PORTRAIT               │
│                                             │
│    ┌───────────────────────────────┐        │
│    │                               │        │
│    │    ┌───────────────────┐      │        │
│    │    │                   │      │        │
│    │    │  SUSPECT PHOTO    │      │        │
│    │    │  (object-cover)   │      │        │
│    │    │                   │      │        │
│    │    │  ┌─□──□──┐      │      │        │
│    │    │  │ ○    ○ │      │      │        │  ← Facial recognition
│    │    │  │    △   │      │      │        │     wireframe overlay
│    │    │  │ □    □ │      │      │        │
│    │    │  └────────┘      │      │        │
│    │    │                   │      │        │
│    │    └───────────────────┘      │        │
│    │                               │        │
│    │   ┌─▷───▷───▷───▷───▷───┐   │        │
│    │   │  THREAT RING (outer) │   │        │  ← Animated rotating ring
│    │   │  ┌─▷───▷───▷───┐   │   │        │
│    │   │  │  THREAT RING │   │   │        │
│    │   │  │  (inner)     │   │   │        │
│    │   │  └──────────────┘   │   │        │
│    │   └─────────────────────┘   │        │
│    │                               │        │
│    │     [WANTED] Status Badge     │        │  ← Pulsing badge below
│    │                               │        │
│    │   [Arrest] [Flag] [Update]   │        │  ← Quick action buttons
│    │                               │        │
│    └───────────────────────────────┘        │
│                                             │
└─────────────────────────────────────────────┘
```

### FacialOverlay Component

```tsx
// components/docket/FacialOverlay.tsx
interface FacialOverlayProps {
  faceData: FaceDetectionData;
  imageWidth: number;
  imageHeight: number;
  confidence: number;
}

interface FaceDetectionData {
  boundingBox: { x: number; y: number; width: number; height: number };
  landmarks: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    leftMouth: { x: number; y: number };
    rightMouth: { x: number; y: number };
  };
}
```

**Overlay Design:**
- **Bounding box**: Dashed neon cyan (`#00ff88`) rectangle around the face, `stroke-width: 2px`, with subtle glow `filter: drop-shadow(0 0 4px #00ff88)`
- **Eye markers**: Small crosshair targets at eye positions, amber (`#ffaa00`)
- **Nose marker**: Triangle/dot at nose bridge, cyan (`#00d4ff`)
- **Mouth markers**: Small dots at mouth corners, cyan (`#00d4ff`)
- **Confidence badge**: Top-right of image, `"96.4% match"` in glassmorphism pill
- **Scanning line**: Horizontal line animates top-to-bottom over the face every 4 seconds (like a sci-fi facial scanner)

```css
@keyframes scan-face {
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.facial-scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00ff88, #00d4ff, transparent);
  box-shadow: 0 0 8px #00ff88, 0 0 16px #00d4ff;
  animation: scan-face 4s ease-in-out infinite;
}
```

### ThreatRings Component

```tsx
// components/docket/ThreatRings.tsx
interface ThreatRingsProps {
  assessments: RiskRing[];
  animated?: boolean;
}

interface RiskRing {
  id: string;
  label: string; // "Threat Level", "Recidivism Risk", "Flight Risk"
  percentage: number; // 0–100
  level: "critical" | "high" | "medium" | "low";
  color: string;
}
```

**Design:**
- 3 concentric rings with gap between them (like a target)
- Each ring is an SVG `<circle>` with `stroke-dasharray` and `stroke-dashoffset` animated
- Outer ring: overall threat level (thickest stroke, 8px)
- Middle ring: recidivism risk (6px stroke)
- Inner ring: flight risk (4px stroke)
- Each ring has a label that appears on hover
- Rings rotate slowly at different speeds (outer: 30s, middle: 20s, inner: 15s)
- Pulsing glow effect on the highest-risk ring

```tsx
// SVG ring animation pattern
const circumference = 2 * Math.PI * radius;
const offset = circumference - (percentage / 100) * circumference;

<motion.circle
  cx={centerX}
  cy={centerY}
  r={radius}
  fill="none"
  stroke={color}
  strokeWidth={thickness}
  strokeDasharray={circumference}
  strokeDashoffset={offset}
  strokeLinecap="round"
  initial={{ strokeDashoffset: circumference }}
  animate={{ strokeDashoffset: offset }}
  transition={{ duration: 1.5, ease: "easeOut" }}
  style={{ filter: `drop-shadow(0 0 6px ${color})` }}
/>
```

### Status Badge & Quick Actions

```tsx
// Placed below the portrait
<div className="flex flex-col items-center gap-4">
  <StatusBadge
    status={suspect.status}
    pulse={suspect.status === "wanted"}
    size="lg"
  />
  <div className="flex gap-2">
    <Button variant="danger" onClick={handleArrest}>
      <ShieldCheck className="mr-2 h-4 w-4" />
      Mark as Arrested
    </Button>
    <Button variant="secondary" onClick={handleFlag}>
      <Flag className="mr-2 h-4 w-4" />
      Flag Case
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Escalate to Super Admin</DropdownMenuItem>
        <DropdownMenuItem>Request AI Re-analysis</DropdownMenuItem>
        <DropdownMenuItem>Print Docket</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>
```

---

## 5. Left Sidebar — Case Information

### Component: `DocketLeftSidebar`

```tsx
// components/docket/DocketLeftSidebar.tsx
interface DocketLeftSidebarProps {
  caseInfo: CaseInfo;
  criminalHistory: CriminalRecord[];
  evidenceSummary: EvidenceSummary;
  activityLog: TimelineItem[];
  className?: string;
}
```

### 5.1 CaseInfoCard

```tsx
// components/cards/CaseInfoCard.tsx
interface CaseInfoCardProps {
  caseNumber: string;
  crimeCategory: string;
  crimeType: string;
  leadInvestigator: string;
  leadInvestigatorId: string;
  dateOpened: string; // ISO 8601
  status: CaseStatus;
  priority: "critical" | "high" | "medium" | "low";
  className?: string;
}
```

**Layout:**
```
┌─────────────────────────────────┐
│  CASE INFORMATION               │
│  ─────────────────────────────  │
│  Case #         SEN-2024-0042   │
│  Category       Armed Robbery   │
│  Type           Commercial      │
│  Investigator   Det. S. Shai    │
│  Date Opened    12 Mar 2024     │
│  Status         [ACTIVE]        │
│  Priority       [CRITICAL]      │
└─────────────────────────────────┘
```

Each field: `label: value` with value in `text-primary` and label in `text-secondary` (slate-400). GlassCard wrapper with variant="subtle".

### 5.2 CriminalHistoryCard

```tsx
// components/cards/CriminalHistoryCard.tsx
interface CriminalHistoryCardProps {
  records: CriminalRecord[];
  maxDisplay?: number;
  className?: string;
}

interface CriminalRecord {
  id: string;
  date: string;
  crimeType: string;
  status: "convicted" | "acquitted" | "pending";
  sentence?: string;
  location: string;
}
```

**Layout:**
```
┌─────────────────────────────────┐
│  CRIMINAL HISTORY               │
│  ─────────────────────────────  │
│                                  │
│  ● 2019 — Armed Robbery         │
│    Status: Convicted            │
│    Sentence: 5 years            │
│    ───────────────────────       │
│  ● 2016 — Theft                 │
│    Status: Acquitted            │
│    ───────────────────────       │
│  ● 2014 — Assault               │
│    Status: Convicted            │
│    Sentence: 2 years            │
│                                  │
│  [+ View all 7 records]         │
└─────────────────────────────────┘
```

Each record is a dot-separated item with crime icon (from `lucide-react`). Status badges with small variants. Scrollable container with max-height.

### 5.3 EvidenceSummaryCard

```tsx
// components/cards/EvidenceSummaryCard.tsx
interface EvidenceSummaryCardProps {
  totalItems: number;
  images: number;
  videos: number;
  documents: number;
  audio: number;
  other: number;
  forensicComplete: number; // percentage
  lastUpdated: string;
  className?: string;
}
```

**Layout:**
```
┌─────────────────────────────────┐
│  EVIDENCE SUMMARY               │
│  ─────────────────────────────  │
│                                  │
│  🖼 Photos         23           │
│  🎥 Video clips    7            │
│  📄 Documents      12           │
│  🎵 Audio clips    3            │
│  📎 Other          2            │
│                                  │
│  Total: 47 items                │
│                                  │
│  Forensic Analysis:             │
│  [████████░░░░░░░░░] 42%        │
│                                  │
│  Last updated: 2 hours ago      │
└─────────────────────────────────┘
```

Each evidence type is a row with icon, label, count. Bottom section has a progress bar for forensic analysis completion.

### 5.4 ActivityLogCard

```tsx
// components/cards/ActivityLogCard.tsx
interface ActivityLogCardProps {
  items: TimelineItem[];
  maxItems?: number;
  onViewAll?: () => void;
  className?: string;
}
```

Uses <Timeline> component with variant="compact". Shows the 5 most recent activities with "View All" link.

---

## 6. Right Sidebar — Suspect Details

### Component: `DocketRightSidebar`

```tsx
// components/docket/DocketRightSidebar.tsx
interface DocketRightSidebarProps {
  suspect: Suspect;
  threatAssessment: ThreatAssessment;
  associates: Associate[];
  lastKnownLocations: MapLocation[];
  className?: string;
}
```

### 6.1 SuspectDetailsCard

```tsx
// components/cards/SuspectDetailsCard.tsx
interface SuspectDetailsCardProps {
  fullName: string;
  idNumber: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  nationality: string;
  address: string;
  phone?: string;
  email?: string;
  aliases?: string[];
  distinguishingFeatures?: string[];
  className?: string;
}
```

**Layout:**
```
┌─────────────────────────────────┐
│  SUSPECT DETAILS                │
│  ─────────────────────────────  │
│                                  │
│  Full Name    John Michael Doe  │
│  ID Number    930512 5087 081   │
│  DOB          12 May 1993       │
│  Age          31                │
│  Gender       Male              │
│  Nationality  South African     │
│  Address      42 Voortrekker Rd │
│               Cape Town, 8001   │
│  Phone        +27 82 123 4567  │
│                                  │
│  Aliases:                       │
│  "Johnny D", "The Ghost"       │
│                                  │
│  Distinguishing Features:       │
│  • Scar on left cheek           │
│  • Tattoo: dragon, right forearm│
└─────────────────────────────────┘
```

### 6.2 ThreatAssessmentCard

```tsx
// components/cards/ThreatAssessmentCard.tsx
interface ThreatAssessmentCardProps {
  threatScore: number; // 0–100
  riskFactors: RiskFactor[];
  aiSummary: string;
  lastAssessed: string;
  className?: string;
}

interface RiskFactor {
  label: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
}
```

**Layout:**
```
┌─────────────────────────────────┐
│  THREAT ASSESSMENT             │
│  ─────────────────────────────  │
│                                  │
│  Threat Score:                  │
│  ┌─────────────────────────┐   │
│  │ [████████████████░░░░░] │   │
│  │        76/100           │   │
│  └─────────────────────────┘   │
│         HIGH RISK              │
│                                  │
│  Risk Factors:                  │
│  🔴 Violent History        HIGH │
│  🟡 Known Associate Network MED │
│  🔴 Firearm Access        HIGH │
│  🟢 Employment Status      LOW │
│                                  │
│  AI Assessment:                 │
│  "Subject displays elevated    │
│   risk of reoffending based on │
│   pattern of armed robbery with│
│   escalating violence."        │
│                                  │
│  Last assessed: 1 hour ago      │
└─────────────────────────────────┘
```

**Threat Meter Animation:**
- Horizontal bar fills with gradient based on score
  - 0–33: Green gradient `#22c55e → #00ff88`
  - 34–66: Amber gradient `#eab308 → #ffaa00`
  - 67–100: Red gradient `#ef4444 → #dc2626`
- Animated fill on mount (1.5s ease-out)
- Glow effect proportional to score
- Percentage number counts up (0 → 76) on mount

### 6.3 KnownAssociatesCard

```tsx
// components/cards/KnownAssociatesCard.tsx
interface KnownAssociatesCardProps {
  associates: Associate[];
  className?: string;
}

interface Associate {
  id: string;
  name: string;
  photoUrl?: string;
  relationship: string; // "Criminal Partner", "Family", "Cellmate"
  status: SuspectStatus;
  threatLevel: "critical" | "high" | "medium" | "low";
  lastContactDate?: string;
}
```

**Layout:**
```
┌─────────────────────────────────┐
│  KNOWN ASSOCIATES               │
│  ─────────────────────────────  │
│                                  │
│  [Avatar] Tashen Moodley        │
│           Criminal Partner      │
│           [WANTED]  🔴HIGH     │
│                                  │
│  [Avatar] Patricia Mashasha     │
│           Criminal Partner      │
│           [ARRESTED]  🟡MED    │
│                                  │
│  [Avatar] Kgahlisho Tladi       │
│           Family                │
│           [CLEARED]  🟢LOW     │
│                                  │
│  [+ View all 6 associates]      │
└─────────────────────────────────┘
```

Each associate row: small `ProfileAvatar`, name (bold), relationship (text-secondary), `StatusBadge` (sm), threat level indicator.

### 6.4 LastKnownLocationCard

```tsx
// components/cards/LastKnownLocationCard.tsx
interface LastKnownLocationCardProps {
  locations: MapLocation[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}
```

**Layout:**
```
┌─────────────────────────────────┐
│  LAST KNOWN LOCATIONS           │
│  ─────────────────────────────  │
│                                  │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │    [MINI MAP]           │   │
│  │    MapLibre GL          │   │
│  │    200px height         │   │
│  │                         │   │
│  │    ● Current (Cape T.)  │   │
│  │    ● 2 days ago (Durban│   │
│  │    ● 1 week (JHB)      │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                  │
│  📍 Cape Town CBD — Now        │
│  📍 Durban Harbor — 2 days ago │
│  📍 Johannesburg — 1 week ago  │
│                                  │
│  [View Full Timeline]           │
└─────────────────────────────────┘
```

Mini map at 200px height, non-interactive (or minimal interactivity). Markers colored by recency: green (current), amber (recent), red (older). Below map: text list of locations with relative timestamps.

---

## 7. Bottom Panel — Investigation Workspace

### Component: `DocketBottomPanel`

```tsx
// components/docket/DocketBottomPanel.tsx
interface DocketBottomPanelProps {
  docketId: string;
  notes: InvestigationNote[];
  evidence: Evidence[];
  witnesses: WitnessStatement[];
  attachments: Attachment[];
  onAddNote: (note: string) => void;
  onUploadEvidence: (files: File[]) => void;
  className?: string;
}
```

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  [Notes]  [Evidence Upload]  [Witness Statements]  [Attachments] │  ← Tabs
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TAB CONTENT — Changes based on active tab                       │
│                                                                  │
│  ─── Notes Tab ────────────────────────────────────────────────  │
│  [Textarea: Type investigation notes...]                        │
│  [Add Note]                                                     │
│                                                                  │
│  Det. Shai — 2 hours ago                                       │
│  "Suspect was seen near Green Market Square at 14:30.         │
│   CCTV confirms presence. Awaiting facial confirmation."       │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  Admin User — 1 day ago                                        │
│  "Evidence bag #E-0042 processed. Fingerprints match."         │
│                                                                  │
│  ─── (or) Evidence Upload Tab ──────────────────────────────    │
│  [Drop files here or click to upload]                           │
│                                                                  │
│  Uploaded Items:                                                │
│  [IMG_001.jpg] [IMG_002.jpg] [VID_001.mp4] [DOC_001.pdf]       │
│                                                                  │
│  ─── (or) Witness Statements Tab ────────────────────────────   │
│  Trinity Chauke — Verified                                     │
│  "I saw the suspect running from the store at approximately    │
│   3:15 PM. He was wearing a black hoodie and jeans."           │
│  [Verify] [Flag]                                               │
│                                                                  │
│  ─── (or) Attachments Tab ──────────────────────────────────    │
│  [📄 Forensic Report.pdf] [📄 Warrant.pdf] [📄 Scene Photos]   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

The bottom panel uses the `Tabs` component from Radix UI. Tab state is synced to URL search params (`?section=notes|evidence|witnesses|attachments`) for deep linking.

---

## 8. Component Breakdown

### Full Component List for Docket Page

| Component | Type | Description |
|---|---|---|
| `DocketLayout` | Organism | 3-column grid orchestrator with responsive collapse |
| `DocketLeftSidebar` | Molecule | Contains all left sidebar cards |
| `DocketCenterPanel` | Organism | Suspect portrait, risk rings, badges, actions |
| `DocketRightSidebar` | Molecule | Contains all right sidebar cards |
| `DocketBottomPanel` | Organism | Tabbed investigation workspace |
| `SuspectPortrait` | Molecule | Large photo with image optimization |
| `FacialOverlay` | Atom | SVG wireframe overlay for face detection |
| `ThreatRings` | Molecule | Animated SVG concentric rings |
| `CaseInfoCard` | Molecule | Case metadata display |
| `CriminalHistoryCard` | Molecule | Prior criminal records |
| `EvidenceSummaryCard` | Molecule | Evidence count and forensic progress |
| `ActivityLogCard` | Molecule | Recent activity timeline |
| `SuspectDetailsCard` | Molecule | Personal details display |
| `ThreatAssessmentCard` | Molecule | Threat scoring with meter |
| `KnownAssociatesCard` | Molecule | Associates list |
| `LastKnownLocationCard` | Molecule | Mini map with location markers |
| `Timeline` | Molecule | Vertical activity timeline |
| `EvidenceGrid` | Molecule | Grid of evidence items |
| `FileUpload` | Molecule | Drag-and-drop upload zone |
| `WitnessStatementCard` | Molecule | Statement display with actions |
| `AttachmentCard` | Molecule | File attachment display |
| `StatusBadge` | Atom | Status pill badge |
| `RiskIndicator` | Atom | Circular risk meter |
| `GlassCard` | Atom | Glassmorphism card wrapper |
| `MapChart` | Molecule | MapLibre map component |
| `ProfileAvatar` | Atom | Image with fallback |
| `Tabs` | Atom | Radix UI tabs (Notes, Evidence, etc.) |
| `Button` | Atom | Action button variants |
| `Badge` | Atom | Small count/status badge |

---

## 9. State Management for Docket

### Zustand Store (`store/docket-store.ts`)

```tsx
interface DocketState {
  // Data
  currentDocket: Docket | null;
  isLoading: boolean;
  error: string | null;

  // UI State
  activeSection: "notes" | "evidence" | "witnesses" | "attachments";
  isUploading: boolean;
  uploadProgress: number;

  // Actions
  fetchDocket: (docketId: string) => Promise<void>;
  setActiveSection: (section: DocketState["activeSection"]) => void;
  updateSuspectStatus: (status: SuspectStatus) => void;
  addNote: (note: InvestigationNote) => void;
  addEvidence: (evidence: Evidence) => void;
  updateEvidence: (evidenceId: string, updates: Partial<Evidence>) => void;
  verifyWitness: (statementId: string) => void;
  flagWitness: (statementId: string) => void;
  reset: () => void;
}
```

### React Query (Server State)

```tsx
// Fetch docket data
export function useDocket(docketId: string) {
  return useQuery({
    queryKey: ["docket", docketId],
    queryFn: () => docketService.getDocket(docketId),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute (for real-time updates)
  });
}

// Update suspect status
export function useUpdateSuspectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ docketId, status }: { docketId: string; status: SuspectStatus }) =>
      docketService.updateSuspectStatus(docketId, status),
    onSuccess: (_, { docketId }) => {
      queryClient.invalidateQueries({ queryKey: ["docket", docketId] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["wanted-feed"] });
    },
  });
}
```

### Data Flow Architecture

```
URL: /docket/DKT-001
    │
    ▼
DocketPage (page.tsx)
    │
    ├── useDocket(DKT-001)         ← React Query fetch
    ├── useDocketStore()           ← Zustand UI state
    │
    ▼
DocketLayout — 3-column grid
    │
    ├── DocketLeftSidebar
    │   ├── CaseInfoCard           ← caseInfo from docket data
    │   ├── CriminalHistoryCard    ← criminalHistory from docket data
    │   ├── EvidenceSummaryCard    ← evidence summary computed from evidence[]
    │   └── ActivityLogCard        ← activityLog from docket data
    │
    ├── DocketCenterPanel
    │   ├── SuspectPortrait        ← suspect from docket data
    │   │   └── FacialOverlay      ← faceData from suspect
    │   ├── ThreatRings            ← threatAssessment from docket data
    │   ├── StatusBadge            ← suspect.status
    │   └── QuickActions           ← onStatusChange mutation
    │
    ├── DocketRightSidebar
    │   ├── SuspectDetailsCard     ← suspect details
    │   ├── ThreatAssessmentCard   ← threatAssessment
    │   ├── KnownAssociatesCard    ← associates[]
    │   └── LastKnownLocationCard  ← lastKnownLocations[]
    │       └── MapChart           ← MapLibre GL
    │
    └── DocketBottomPanel
        └── Tabs
            ├── Notes Tab          ← notes[], addNote mutation
            ├── Evidence Tab       ← evidence[], uploadMutation
            ├── Witnesses Tab      ← witnesses[], verifyMutation
            └── Attachments Tab    ← attachments[]
```

---

## 10. Responsive Behavior

### Breakpoint Strategy

| Breakpoint | Width | Layout | Behavior |
|---|---|---|---|
| `2xl` | ≥1536px | 3 columns | Full layout, max-width container |
| `xl` | ≥1280px | 3 columns | Standard layout |
| `lg` | ≥1024px | 2 columns | Right sidebar moves below center |
| `md` | ≥768px | 1 column | Sidebars stack vertically |
| `sm` | ≥640px | 1 column | Single column, bottom panel full width |
| Default | <640px | 1 column | Compact spacing, mobile nav |

### Responsive Implementation

```tsx
// DocketLayout.tsx
<div className={cn(
  "grid gap-5",
  // Desktop: 3 columns
  "lg:grid-cols-[240px_1fr_280px] lg:grid-rows-[1fr_auto]",
  // Tablet: 2 columns
  "md:grid-cols-[1fr_280px]",
  // Mobile: single column
  "grid-cols-1",
)}>
  {/* Center panel — always first in DOM for mobile */}
  <div className="lg:order-2 md:order-1 order-1">
    <DocketCenterPanel />
  </div>

  {/* Left sidebar — moves below on mobile */}
  <div className="lg:order-1 md:order-3 order-2">
    <DocketLeftSidebar />
  </div>

  {/* Right sidebar — moves below on tablet/mobile */}
  <div className="lg:order-3 md:order-2 order-3">
    <DocketRightSidebar />
  </div>

  {/* Bottom panel — always last */}
  <div className="lg:col-span-3 md:col-span-2 col-span-1 order-4">
    <DocketBottomPanel />
  </div>
</div>
```

### Mobile-Specific Adjustments

- Sidebars become collapsible accordions (GlassCard headers are clickable to expand/collapse)
- Threat rings reduce to 2 rings instead of 3
- Suspect portrait is smaller (takes 60% viewport width)
- Quick actions become an overflow menu
- Bottom panel tabs become a horizontal scroll
- Mini map reduced to 150px height
- Status badge moves to top-left corner as floating badge

---

## 11. Animations & Micro-interactions

### Animation Specs Table

| Element | Animation | Duration | Easing | Trigger |
|---|---|---|---|---|
| **Page entrance** | Fade in + slide up | 0.4s | `ease-out` | Page mount |
| **GlassCard entrance** | Staggered fade in | 0.3s each | `ease-out` | 100ms delay per card |
| **Suspect portrait** | Scale from 0.95 → 1.0 + fade | 0.5s | `ease-out` | Image load |
| **Facial overlay** | Draw wireframe lines sequentially | 0.8s total | `ease-in-out` | Image load complete |
| **Scanning line** | Top to bottom sweep | 4s loop | `ease-in-out` | Continuous |
| **Threat rings** | Stroke dash offset animation | 1.5s | `easeOut` | Page mount |
| **Threat rings** | Slow rotation | 20–30s loop | `linear` | Continuous |
| **Risk glow pulse** | Opacity 0.3 → 0.7 | 2s loop | `ease-in-out` | Continuous (highest risk) |
| **Threat meter fill** | Width 0 → 76% | 1.5s | `ease-out` | Visible in viewport |
| **Status badge** | Subtle pulse | 2s loop | `ease-in-out` | Only "wanted" status |
| **Tab switch** | Horizontal slide | 0.3s | `ease-out` | Tab click |
| **Hover: GlassCard** | Scale 1.0 → 1.02 + glow | 0.2s | `ease-out` | Hover enter |
| **Button hover** | Background brighten | 0.15s | `ease-out` | Hover enter |
| **Upload progress** | Width animation | per progress | `linear` | Upload in progress |
| **Map marker popup** | Scale 0 → 1 + bounce | 0.3s | `spring` | Marker click |

### Framer Motion Implementation Pattern

```tsx
// Staggered card entrance animation
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  <motion.div variants={cardVariants}>
    <CaseInfoCard />
  </motion.div>
  <motion.div variants={cardVariants}>
    <CriminalHistoryCard />
  </motion.div>
  ...
</motion.div>
```

### Glass Shimmer Effect

```css
@keyframes glass-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.glass-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.03) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 75%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: glass-shimmer 6s ease-in-out infinite;
}
```

---

## 12. Data Flow

### Page Data Requirements

```tsx
// TypeScript interface for the full docket response
interface Docket {
  id: string;
  caseInfo: CaseInfo;
  suspect: Suspect;
  threatAssessment: ThreatAssessment;
  criminalHistory: CriminalRecord[];
  evidence: Evidence[];
  evidenceSummary: EvidenceSummary;
  associates: Associate[];
  lastKnownLocations: MapLocation[];
  activityLog: TimelineItem[];
  notes: InvestigationNote[];
  witnesses: WitnessStatement[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}
```

### Loading State

```tsx
function DocketPage({ params }: { params: { docketId: string } }) {
  const { data: docket, isLoading, error } = useDocket(params.docketId);

  if (isLoading) {
    return <DocketSkeleton />; // Skeleton matching the 3-column layout
  }

  if (error) {
    return <ErrorState message="Failed to load docket" onRetry />;
  }

  return <DocketLayout docket={docket} />;
}
```

### DocketSkeleton Component

```tsx
function DocketSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr_280px]">
      {/* Left skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>

      {/* Center skeleton */}
      <div className="space-y-4">
        <Skeleton className="aspect-[3/4] w-full rounded-xl" />
        <Skeleton className="mx-auto h-16 w-48 rounded-full" />
        <div className="flex justify-center gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      {/* Right skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

---

## 13. Accessibility Considerations

| Requirement | Implementation |
|---|---|
| **Keyboard navigation** | All interactive elements reachable via Tab. Quick actions, tabs, associates list all keyboard accessible. |
| **Screen reader labels** | `aria-label` on all icon buttons. `role="region"` on each sidebar with `aria-label="Case information"` etc. |
| **Alt text** | Suspect portrait has descriptive `alt="Mugshot of John Doe"`. Decorative overlays have `aria-hidden="true"`. |
| **Focus indicators** | Custom `focus-visible:ring-2 focus-visible:ring-accent-blue` on all interactive elements. |
| **Color contrast** | All text meets WCAG AA (4.5:1 ratio). Text-primary `#f1f5f9` on `#1a1f2e` = 12.3:1. |
| **Motion sensitivity** | `prefers-reduced-motion` media query disables animations: pulse, sweep, rotation set to `animation: none`. |
| **Tab panel semantics** | Uses `role="tablist"`, `role="tab"`, `role="tabpanel"` with `aria-selected` and `aria-controls`. |
| **Status announcements** | Status changes (suspect arrested) announced via `aria-live="polite"` region. |
| **Error announcements** | Form errors linked to inputs via `aria-describedby`. |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .facial-scan-line,
  .threat-ring-rotation,
  .glass-shimmer,
  .status-pulse {
    animation: none !important;
  }

  .glass-card-hover {
    transition: none !important;
  }
}
```

---

## 14. Complete Wireframe Description

### Desktop View (≥1280px)

```
The page occupies the full viewport height minus the dashboard header (64px).

BACKGROUND: Deep navy (#0a0e1a) with subtle ambient glow behind the center panel
  — A radial gradient circle in the center: radial-gradient(circle at 50% 40%, rgba(0,212,255,0.05), transparent 60%)

LAYOUT: Three vertical columns separated by 1.25rem gaps

LEFT COLUMN (240px, scrollable):
  Four glassmorphism cards stacked vertically with 1rem gap:
  1. CaseInfoCard (compact, ~120px height)
  2. CriminalHistoryCard (scrollable, max ~300px)
  3. EvidenceSummaryCard (~180px)
  4. ActivityLogCard (~200px, shows 3–5 timeline items)

CENTER COLUMN (flex-grow, scrollable):
  A large glassmorphism card containing:
  — Suspect portrait: approximately 70% of the column width, centered
    — Image fills available space with object-cover, rounded corners
    — Facial recognition overlays in neon green wireframe
    — Scanning line animates vertically across the face
    — Confidence badge in top-right corner
  — Below the photo, three concentric animated rings:
    — Outer ring (thick, 200px diameter): Overall Threat Level
    — Middle ring (medium, 160px diameter): Recidivism Risk
    — Inner ring (thin, 120px diameter): Flight Risk
    — Rings have slow rotation animation and colored glows
  — Below rings: large StatusBadge (centered, pulsing if wanted)
  — Quick action buttons row (centered)

RIGHT COLUMN (280px, scrollable):
  Four glassmorphism cards stacked vertically with 1rem gap:
  1. SuspectDetailsCard (~280px — personal info)
  2. ThreatAssessmentCard (~240px — meter + risk factors)
  3. KnownAssociatesCard (~200px — 3 associates shown)
  4. LastKnownLocationCard (~300px — mini map + text list)

BOTTOM SECTION (full width, below three columns):
  A glassmorphism card with tabs:
  — Tab bar with 4 tabs: Notes, Evidence Upload, Witness Statements, Attachments
  — Active tab content area (variable height, max ~400px with scroll)
  — Tab state synced to URL search param

EDGE TO EDGE: The layout extends to the edges of the main content area (padded at lg:p-8)
```

### Mobile View (<768px)

```
Single column, stacked vertically:

1. Suspect Portrait (full width, 70vw height)
   — Facial overlay visible but smaller
   — Threat rings reduced to 2 (outer + inner)
   — Status badge overlays top-left corner
   — Quick actions below the photo in a horizontal scroll

2. Case Info (collapsible accordion)
   — Tap header "Case Information" to expand

3. Suspect Details (collapsible accordion)

4. Threat Assessment (collapsible accordion)
   — Threat meter visible without expansion

5. Known Associates (collapsible accordion)

6. Last Known Locations (collapsible accordion)
   — Mini map at 150px height

7. Criminal History (collapsible accordion)

8. Evidence Summary (collapsible accordion)

9. Activity Log (collapsible accordion)

10. Bottom Panel (full width)
    — Tab bar horizontally scrollable
    — Tab content full width below
```

---

> **Next Document:** [04-PAGE-DESIGNS.md](./04-PAGE-DESIGNS.md)
