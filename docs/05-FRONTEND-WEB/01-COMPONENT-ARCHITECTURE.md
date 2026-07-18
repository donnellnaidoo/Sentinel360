# Sentinel360 — Component Architecture & Design System

> **Document Version:** 1.0  
> **Last Updated:** June 2026  
> **Author:** Lead Frontend Developer — Alpha Tech

---

## Table of Contents

1. [Atomic Design Methodology](#1-atomic-design-methodology)
2. [Complete Component Tree](#2-complete-component-tree)
3. [Shared/Reusable Components](#3-sharedreusable-components)
   - [GlassCard](#glasscard)
   - [StatusBadge](#statusbadge)
   - [RiskIndicator](#riskindicator)
   - [SuspectPortrait](#suspectportrait)
   - [Timeline](#timeline)
   - [EvidenceGrid](#evidencegrid)
   - [FileUpload](#fileupload)
   - [AlertBanner](#alertbanner)
   - [SearchBar](#searchbar)
   - [DataTable](#datatable)
   - [MapChart](#mapchart)
   - [ProfileAvatar](#profileavatar)
4. [State Management Approach](#4-state-management-approach)
5. [Component Tree Diagram](#5-component-tree-diagram)

---

## 1. Atomic Design Methodology

We adopt Brad Frost's Atomic Design methodology to create a scalable, maintainable component hierarchy:

| Level | Definition | Sentinel360 Examples |
|---|---|---|
| **Atoms** | Smallest indivisible UI elements | `Button`, `Input`, `Label`, `Badge`, `Spinner`, `IconButton`, `GlassCard` |
| **Molecules** | Composed atoms forming functional units | `SearchBar`, `StatusBadge`, `RiskIndicator`, `FileUpload`, `DataTable`, `Timeline` |
| **Organisms** | Complex sections composed of molecules | `Sidebar`, `Header`, `DocketLeftSidebar`, `DocketCenterPanel`, `EvidenceGrid` |
| **Templates** | Page-level layouts without data | `AuthLayout`, `DashboardLayout`, `AdminLayout` |
| **Pages** | Specific instances of templates with data | `LoginPage`, `DocketPage`, `CaseListPage`, `WantedFeedPage` |

### Naming Conventions

```
┌─────────────────────────────────────────────────────────────┐
│  Atoms:    components/ui/Button.tsx                         │
│  Molecules: components/cards/SuspectPortrait.tsx            │
│  Organisms: components/docket/DocketCenterPanel.tsx         │
│  Templates: app/(dashboard)/layout.tsx                      │
│  Pages:     app/(dashboard)/docket/[docketId]/page.tsx       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Component Tree

```
<App>
  ├── <Providers>                               # Context providers
  │   ├── <QueryProvider>                       # TanStack React Query
  │   ├── <AuthProvider>                        # Auth state
  │   ├── <ThemeProvider>                       # Dark/Light theme
  │   └── <SocketProvider>                      # WebSocket connection
  │
  ├── <RootLayout>                              # HTML, fonts, metadata
  │   │
  │   ├── (auth) <AuthLayout>                   # Centered card layout
  │   │   ├── <LoginPage>                       # /login
  │   │   │   └── <LoginForm>
  │   │   │       ├── <Input />                 # Email
  │   │   │       ├── <Input />                 # Password
  │   │   │       └── <Button />                # Submit
  │   │   └── <ForgotPasswordPage>              # /forgot-password
  │   │
  │   └── (dashboard) <DashboardLayout>          # Auth required
  │       ├── <Sidebar>                         # Navigation
  │       │   ├── <SidebarItem />               # Dashboard
  │       │   ├── <SidebarItem />               # Cases
  │       │   ├── <SidebarItem />               # Docket
  │       │   ├── <SidebarItem />               # Evidence
  │       │   ├── <SidebarItem />               # Sightings
  │       │   ├── <SidebarItem />               # Alerts
  │       │   ├── <SidebarItem />               # Wanted Feed
  │       │   ├── <SidebarItem />               # Profile
  │       │   ├── <SidebarItem />               # Admin (role-gated)
  │       │   └── <SidebarItem />               # Super Admin (role-gated)
  │       │
  │       ├── <Header>                          # Top bar
  │       │   ├── <SearchBar />                 # Global search
  │       │   ├── <AlertBell />                 # Notification bell
  │       │   └── <ProfileAvatar />             # User menu
  │       │
  │       └── <PageContent>                     # {children} slot
  │           │
  │           ├── <DashboardPage>               # /dashboard
  │           │   ├── <GlassCard>               # Stats overview
  │           │   │   └── <CrimeStatsChart />
  │           │   ├── <Timeline />              # Recent activity
  │           │   ├── <AlertBanner />           # Active alerts
  │           │   └── <DataTable />             # Recent cases
  │           │
  │           ├── <CaseListPage>                # /cases
  │           │   ├── <SearchBar />
  │           │   ├── <CaseFilterForm />        # Status, date, type filters
  │           │   └── <DataTable>
  │           │       ├── <StatusBadge />
  │           │       └── <Button />            # View case
  │           │
  │           ├── <DocketPage>                  # /docket/[docketId] ★
  │           │   └── <DocketLayout>
  │           │       ├── <DocketLeftSidebar>
  │           │       │   ├── <CaseInfoCard />
  │           │       │   ├── <CriminalHistoryCard />
  │           │       │   ├── <EvidenceSummaryCard />
  │           │       │   └── <ActivityLogCard />
  │           │       ├── <DocketCenterPanel>
  │           │       │   ├── <SuspectPortrait>
  │           │       │   │   └── <FacialOverlay />
  │           │       │   ├── <ThreatRings />
  │           │       │   └── <StatusBadge />
  │           │       ├── <DocketRightSidebar>
  │           │       │   ├── <SuspectDetailsCard />
  │           │       │   ├── <ThreatAssessmentCard />
  │           │       │   ├── <KnownAssociatesCard />
  │           │       │   └── <LastKnownLocationCard>
  │           │       │       └── <MapChart />
  │           │       └── <DocketBottomPanel>
  │           │           ├── <Tabs>
  │           │           │   ├── <Textarea />  # Investigation notes
  │           │           │   ├── <FileUpload /> # Evidence upload
  │           │           │   ├── <WitnessStatementCard />
  │           │           │   └── <AttachmentCard />
  │           │           └── </Tabs>
  │           │
  │           ├── <EvidenceGalleryPage>         # /evidence
  │           │   └── <EvidenceGrid>
  │           │       └── <EvidenceCard />
  │           │
  │           ├── <SightingListPage>            # /sightings
  │           │   ├── <SearchBar />
  │           │   ├── <FilterBar />             # Status, date, region filters
  │           │   └── <DataTable />             # All sightings
  │           │
  │           ├── <AlertsPage>                  # /alerts
  │           │   ├── <SearchBar />
  │           │   └── <DataTable>
  │           │       └── <AlertBanner />
  │           │
  │           ├── <AdminUsersPage>              # /admin/users
  │           │   ├── <SearchBar />
  │           │   ├── <DataTable />
  │           │   └── <Modal />                 # Add/Edit user
  │           │
  │           ├── <SuperAdminAuditPage>         # /super-admin/audit-logs
  │           │   ├── <SearchBar />
  │           │   └── <DataTable />
  │           │
  │           └── <ProfileSettingsPage>         # /profile
  │               ├── <ProfileAvatar />
  │               ├── <ProfileForm />
  │               └── <Button />                # Save
```

---

## 3. Shared/Reusable Components

### GlassCard

The foundational glassmorphism wrapper used throughout the application.

```tsx
// components/ui/GlassCard.tsx
import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "elevated" | "subtle";
  hoverEffect?: boolean;
  shimmer?: boolean;
  children: React.ReactNode;
}

/* Usage:
  <GlassCard variant="elevated" hoverEffect shimmer className="p-6">
    <h3>Case Information</h3>
  </GlassCard>
*/
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"default" \| "elevated" \| "subtle"` | `"default"` | Glass intensity level |
| `hoverEffect` | `boolean` | `false` | Lift + glow on hover |
| `shimmer` | `boolean` | `false` | Animated light sweep across card |
| `className` | `string` | `""` | Additional classes |
| `children` | `React.ReactNode` | required | Card content |

**Variants CSS:**

```css
.variant-default {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.variant-elevated {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.variant-subtle {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

---

### StatusBadge

Displays case/suspect status with appropriate color coding.

```tsx
// components/cards/StatusBadge.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm",
  {
    variants: {
      status: {
        wanted: "bg-red-500/15 text-red-400 border border-red-500/30",
        investigating: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        arrested: "bg-green-500/15 text-green-400 border border-green-500/30",
        cleared: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
        deceased: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
        under_review: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
      },
    },
    defaultVariants: { status: "wanted" },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: "wanted" | "investigating" | "arrested" | "cleared" | "deceased" | "under_review";
  pulse?: boolean;
  className?: string;
}

/* Usage:
  <StatusBadge status="wanted" pulse />
  <StatusBadge status="arrested" />
  <StatusBadge status="investigating" pulse />
*/
```

| Status | Color | Icon | Background |
|---|---|---|---|
| `wanted` | `#ef4444` (red) | `Crosshair` | `rgba(239,68,68,0.15)` |
| `investigating` | `#f59e0b` (amber) | `Search` | `rgba(245,158,11,0.15)` |
| `arrested` | `#22c55e` (green) | `ShieldCheck` | `rgba(34,197,94,0.15)` |
| `cleared` | `#94a3b8` (slate) | `CheckCircle` | `rgba(148,163,184,0.15)` |
| `deceased` | `#6b7280` (gray) | `HeartOff` | `rgba(107,114,128,0.15)` |
| `under_review` | `#3b82f6` (blue) | `Clock` | `rgba(59,130,246,0.15)` |

---

### RiskIndicator

Circular threat meter with animated rings, used around the suspect portrait.

```tsx
// components/cards/RiskIndicator.tsx
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RiskIndicatorProps {
  level: "critical" | "high" | "medium" | "low";
  percentage: number; // 0–100
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  label?: string;
  className?: string;
}

type RiskConfig = {
  color: string;
  ringColor: string;
  pulseColor: string;
};

const riskConfig: Record<string, RiskConfig> = {
  critical: {
    color: "#ef4444",
    ringColor: "stroke-red-500",
    pulseColor: "rgba(239,68,68,0.3)",
  },
  high: {
    color: "#f59e0b",
    ringColor: "stroke-amber-500",
    pulseColor: "rgba(245,158,11,0.3)",
  },
  medium: {
    color: "#eab308",
    ringColor: "stroke-yellow-500",
    pulseColor: "rgba(234,179,8,0.3)",
  },
  low: {
    color: "#22c55e",
    ringColor: "stroke-green-500",
    pulseColor: "rgba(34,197,94,0.3)",
  },
};

/* Usage:
  <RiskIndicator level="critical" percentage={92} size="lg" animated />
  <RiskIndicator level="medium" percentage={54} size="md" />
*/
```

**Visual description:**
- Circular SVG ring with `stroke-dasharray` animation
- Percentage text in center
- Pulsing glow ring at `rgba` of the risk color
- Size variants: `sm` (64px), `md` (96px), `lg` (128px)
- `animated` prop enables rotation animation (slow spin 20s infinite)

---

### SuspectPortrait

Large photograph with facial recognition overlay graphics.

```tsx
// components/cards/SuspectPortrait.tsx
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { FacialOverlay } from "@/components/docket/FacialOverlay";

interface SuspectPortraitProps {
  imageUrl: string;
  suspectName: string;
  faceData?: FaceDetectionData[]; // Coordinates for wireframe overlays
  status: SuspectStatus;
  confidenceScore?: number;
  size?: "sm" | "md" | "lg" | "xl";
  showOverlay?: boolean;
  className?: string;
}

interface FaceDetectionData {
  id: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    leftMouth: { x: number; y: number };
    rightMouth: { x: number; y: number };
  };
  confidence: number;
}

/* Usage:
  <SuspectPortrait
    imageUrl="/suspects/123.jpg"
    suspectName="John Doe"
    faceData={faceDetectionResults}
    status="wanted"
    confidenceScore={96.4}
    size="xl"
    showOverlay
  />
*/
```

**Features:**
- Responsive image fills container with `object-cover`
- Facial wireframe overlay using absolute-positioned SVG lines
- Green wireframe boxes around eyes, nose, mouth at `rgba(0,255,136,0.6)`
- Confidence score display in top-right corner
- Subtle scanning line animation across the face (like sci-fi facial recognition)
- Animated border glow based on status color

---

### Timeline

Activity log for case investigations.

```tsx
// components/cards/Timeline.tsx
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TimelineItem {
  id: string;
  timestamp: string; // ISO 8601
  action: string;
  description: string;
  actor: {
    name: string;
    role: string;
    avatar?: string;
  };
  type: "creation" | "update" | "verification" | "alert" | "upload" | "note";
}

interface TimelineProps {
  items: TimelineItem[];
  variant?: "default" | "compact" | "detailed";
  maxItems?: number;
  onLoadMore?: () => void;
  className?: string;
  emptyMessage?: string;
}

/* Usage:
  <Timeline
    items={activityLog}
    variant="detailed"
    maxItems={20}
    onLoadMore={handleLoadMore}
  />
*/
```

**Visual description:**
- Vertical timeline with connecting line (neon blue `#00d4ff`)
- Each item has a dot marker (color-coded by type)
- Type icons: creation → `Plus`, update → `Edit`, verification → `Check`, alert → `AlertTriangle`, upload → `Upload`, note → `FileText`
- Timestamp formatted with `date-fns` (relative: "2 hours ago")
- Compact variant: single line, no description
- Detailed variant: full card with actor avatar

---

### EvidenceGrid

Grid layout for evidence items.

```tsx
// components/cards/EvidenceGrid.tsx
import { motion } from "framer-motion";

interface EvidenceGridProps {
  items: EvidenceItem[];
  viewMode?: "grid" | "list" | "masonry";
  columns?: 2 | 3 | 4;
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onItemClick?: (item: EvidenceItem) => void;
  onUpload?: () => void;
  isLoading?: boolean;
  className?: string;
}

interface EvidenceItem {
  id: string;
  type: "image" | "video" | "document" | "audio" | "other";
  title: string;
  thumbnailUrl?: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  tags: string[];
  confidenceScore?: number;
  isFlagged?: boolean;
}

/* Usage:
  <EvidenceGrid
    items={evidenceList}
    viewMode="grid"
    columns={3}
    selectable
    onItemClick={openEvidenceDetail}
    onUpload={openUploadModal}
  />
*/
```

**Grid item card (EvidenceCard):**
- Thumbnail with type overlay icon
- Title truncated to 2 lines
- File size formatted
- Tags as small pill badges
- Confidence score badge if applicable
- Checkbox for select mode

---

### FileUpload

Drag-and-drop file upload with preview.

```tsx
// components/cards/FileUpload.tsx
import { useDropzone, type DropzoneOptions } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  onRemove?: (index: number) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  existingFiles?: UploadedFile[];
  uploading?: boolean;
  uploadProgress?: number;
  error?: string;
  className?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  status: "uploading" | "processing" | "complete" | "error";
  progress: number; // 0–100
}

/* Usage:
  <FileUpload
    maxFiles={10}
    maxSizeMB={50}
    acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
    onFilesSelected={handleFiles}
  />
*/
```

**Features:**
- Drag zone with dashed border and glow on drag active
- Preview thumbnails for images
- Progress bar for each file
- Remove button per file
- Error state for failed uploads
- Accessible: keyboard navigable, ARIA labels

**States:**

| State | Visual |
|---|---|
| Empty | Dashed border, cloud upload icon, "Drop files here or click to browse" |
| Dragging | Border turns neon blue `#00d4ff`, background glow |
| Uploading | Progress bar per file, percentage text |
| Complete | Green checkmark, file size, preview thumbnail |
| Error | Red border, error message text |
| Max files | Disabled zone, "Max files reached" |

---

### AlertBanner

Dismissable notification banner for alerts.

```tsx
// components/cards/AlertBanner.tsx
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Info, ShieldAlert, Bell } from "lucide-react";

interface AlertBannerProps {
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  message?: string;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

type SeverityConfig = {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
};

/* Usage:
  <AlertBanner
    severity="critical"
    title="Suspicious Activity Detected"
    message="AI flagged behavior at Dock Road, 2 minutes ago"
    action={{ label: "View", onClick: () => router.push("/case/123") }}
    dismissible
  />
*/
```

| Severity | Icon | Color | Background |
|---|---|---|---|
| `critical` | `ShieldAlert` | `#ef4444` | `rgba(239,68,68,0.1)` |
| `high` | `AlertTriangle` | `#f59e0b` | `rgba(245,158,11,0.1)` |
| `medium` | `Bell` | `#eab308` | `rgba(234,179,8,0.1)` |
| `low` | `Info` | `#3b82f6` | `rgba(59,130,246,0.1)` |
| `info` | `Info` | `#00d4ff` | `rgba(0,212,255,0.1)` |

**Animations:**
- Entrance: slide down + fade in (0.3s)
- Dismissal: slide up + fade out (0.2s)
- Auto-dismiss after configurable duration (default: none for critical)

---

### SearchBar

Search input with filter dropdown.

```tsx
// components/cards/SearchBar.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filters?: SearchFilter[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  className?: string;
}

interface SearchFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

/* Usage:
  <SearchBar
    value={searchQuery}
    onChange={setSearchQuery}
    placeholder="Search suspects, cases, evidence..."
    filters={[
      { key: "status", label: "Status", options: [...] },
      { key: "type", label: "Crime Type", options: [...] },
    ]}
    onFilterChange={(key, val) => setFilters(prev => ({...prev, [key]: val}))}
  />
*/
```

**Features:**
- Search icon on left
- Clear (X) button on right when value exists
- Filter button that toggles a dropdown panel
- `useDebounce` hook internally (300ms default)
- Keyboard shortcut: `/` to focus
- Accessible: `role="search"`, `aria-label`

---

### DataTable

Sortable, paginated data table.

```tsx
// components/cards/DataTable.tsx
import { flexRender, type Table as TableType } from "@tanstack/react-table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface DataTableProps<TData> {
  table: TableType<TData>; // From @tanstack/react-table
  columns: ColumnDef<TData>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  className?: string;
}

/* Usage:
  const table = useReactTable({
    data: cases,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  <DataTable table={table} columns={columns} onRowClick={handleCaseClick} />
*/
```

| Feature | Implementation |
|---|---|
| Sorting | Click column header to toggle asc/desc/unsorted |
| Pagination | Prev/Next buttons, page number display, page size selector |
| Row selection | Checkboxes, "Select all" header checkbox |
| Loading state | Skeleton rows (pulsing) |
| Empty state | Centered icon + message |
| Responsive | Horizontal scroll on mobile, collapse to card view |
| Sticky header | Header row stays fixed on scroll |

---

### MapChart

Map component for locations using MapLibre GL.

```tsx
// components/cards/MapChart.tsx
import Map, { Marker, Popup, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapChartProps {
  locations: MapLocation[];
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  interactive?: boolean;
  height?: string | number;
  markerColor?: string;
  onMarkerClick?: (location: MapLocation) => void;
  showPopup?: boolean;
  className?: string;
}

interface MapLocation {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  type: "current" | "last_known" | "sighting" | "incident";
  timestamp?: string;
  description?: string;
}

/* Usage:
  <MapChart
    locations={lastKnownLocations}
    center={[18.4241, -33.9249]} // Cape Town
    zoom={12}
    markerColor="#00d4ff"
    onMarkerClick={handleMarkerClick}
  />
*/
```

**Marker colors by type:**
| Type | Color |
|---|---|
| `current` | `#00ff88` (cyan green) |
| `last_known` | `#f59e0b` (amber) |
| `sighting` | `#ef4444` (red) |
| `incident` | `#3b82f6` (blue) |

**Features:**
- Dark map style to match the theme
- Navigation controls (zoom, compass)
- Clustered markers for dense locations
- Popup on marker click with location details
- Lazy loaded with `next/dynamic` (no SSR for map)
- Resize observer for responsive container

---

### ProfileAvatar

User avatar with upload functionality.

```tsx
// components/cards/ProfileAvatar.tsx
import Image from "next/image";
import { Camera, User } from "lucide-react";

interface ProfileAvatarProps {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  editable?: boolean;
  onUpload?: (file: File) => void;
  status?: "online" | "offline" | "away";
  className?: string;
}

/* Usage:
  <ProfileAvatar
    src={user.avatarUrl}
    alt={user.name}
    size="lg"
    editable
    onUpload={handleAvatarUpload}
    status="online"
  />
*/
```

| Size | Dimensions |
|---|---|
| `sm` | 32×32 |
| `md` | 48×48 |
| `lg` | 80×80 |
| `xl` | 120×120 |

**Features:**
- Fallback to initials on gray background when no image
- Camera overlay icon on hover when `editable`
- Status dot (green=online, gray=offline, yellow=away)
- Rounded-full with border glow matching status color

---

## 4. State Management Approach

### Architecture Decision Record

| Consideration | Choice | Rationale |
|---|---|---|
| **Client State** | **Zustand** | 2.1 KB, no providers needed, selectors prevent re-renders, middleware (persist, devtools, immer) available |
| **Server State** | **TanStack React Query** | Automatic caching, background refetching, optimistic updates, pagination, infinite scroll |
| **Form State** | **React Hook Form** | Isolated re-renders per field, Zod integration, performant |
| **URL State** | **Next.js useSearchParams** | Filters, pagination, search queries stored in URL for shareability |

### Why Zustand over Redux?

| Factor | Zustand | Redux Toolkit |
|---|---|---|
| Bundle size | 2.1 KB | 11 KB (+ 5 KB for RTK) |
| Boilerplate | None — create store directly | Slices, store config, providers |
| TypeScript | Excellent inference | Good, but more verbose |
| Learning curve | Minimal | Moderate |
| Middleware | Built-in persist, devtools | Requires configuration |
| Performance | Selectors prevent re-renders | Same with `useSelector` |
| Persistence | `persist` middleware | Requires `redux-persist` |

### Zustand Store Pattern

```tsx
// store/docket-store.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface DocketState {
  currentDocket: Docket | null;
  isLoading: boolean;
  error: string | null;
  activeSection: "notes" | "evidence" | "witnesses" | "attachments";

  // Actions
  setDocket: (docket: Docket) => void;
  setActiveSection: (section: DocketState["activeSection"]) => void;
  updateSuspectStatus: (status: SuspectStatus) => void;
  addEvidence: (evidence: Evidence) => void;
  addNote: (note: InvestigationNote) => void;
  reset: () => void;
}

export const useDocketStore = create<DocketState>()(
  devtools(
    immer((set) => ({
      currentDocket: null,
      isLoading: false,
      error: null,
      activeSection: "notes",

      setDocket: (docket) =>
        set((state) => {
          state.currentDocket = docket;
        }),

      setActiveSection: (section) =>
        set((state) => {
          state.activeSection = section;
        }),

      updateSuspectStatus: (status) =>
        set((state) => {
          if (state.currentDocket) {
            state.currentDocket.suspect.status = status;
          }
        }),

      addEvidence: (evidence) =>
        set((state) => {
          state.currentDocket?.evidence.push(evidence);
        }),

      addNote: (note) =>
        set((state) => {
          state.currentDocket?.notes.push(note);
        }),

      reset: () =>
        set({ currentDocket: null, isLoading: false, error: null }),
    })),
    { name: "docket-store" },
  ),
);
```

### Store Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ZUSTAND STORES                       │
├───────────────┬───────────────┬───────────────┬─────────────┤
│  auth-store   │  docket-store │  ui-store     │ alerts-store│
│               │               │               │             │
│ • user        │ • docket      │ • sidebarOpen │ • queue[]   │
│ • token       │ • loading     │ • theme       │ • unread    │
│ • permissions │ • section     │ • modals{}    │ • add()     │
│ • login()     │ • setDocket() │ • toasts[]    │ • dismiss() │
│ • logout()    │ • addEvidence │ • openModal() │ • markRead()│
│ • refresh()   │ • addNote()   │ • closeModal()│             │
└───────────────┴───────────────┴───────────────┴─────────────┘
         │              │               │              │
         └──────────────┴───────┬───────┴──────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   TANSTACK REACT QUERY │ (server state)
                    │                       │
                    │ • cases.list()        │
                    │ • cases.detail()      │
                    │ • evidence.list()     │
                    │ • alerts.list()       │
                    │ • users.list()        │
                    │ • suspects.search()   │
                    └───────────────────────┘
```

### Data Flow Pattern

```
User Action
    │
    ▼
React Component
    │
    ├── Form action → React Hook Form → Zod validation → API call
    │                                                         │
    ├── Navigation → Next.js router → URL params → useSearchParams
    │
    ▼
Service Layer (services/*.service.ts)
    │
    ├── Mutation → React Query useMutation → onSuccess → invalidate queries
    │                                                         │
    ├── Query → React Query useQuery → cache → UI
    │
    ▼
Zustand Store (if client state needed)
    │
    ▼
UI Update via selectors
```

---

## 5. Component Tree Diagram

```
Pages
  │
  ├── AuthLayout
  │   ├── LoginPage
  │   │   └── GlassCard
  │   │       ├── Logo
  │   │       ├── LoginForm
  │   │       │   ├── Input (email)
  │   │       │   ├── Input (password)
  │   │       │   ├── Button (submit)
  │   │       │   └── Link (forgot password)
  │   │       └── Divider
  │   │
  │   └── ForgotPasswordPage
  │       └── GlassCard
  │           └── ForgotPasswordForm
  │
  └── DashboardLayout
      ├── Sidebar
      │   ├── Logo
      │   ├── SidebarItem (×N)
      │   │   ├── Icon
      │   │   ├── Label
      │   │   └── Badge (notification count)
      │   ├── Administration section
      │   │   └── SidebarItem (Users, Profiles, Settings)
      │   ├── Super Admin section (role-gated)
      │   │   └── SidebarItem (Audit Logs, Users)
      │   └── ProfileSection
      │       └── ProfileAvatar + user name
      │
      ├── Header
      │   ├── SearchBar (global search)
      │   ├── AlertBell
      │   │   └── Badge (unread count)
      │   └── ProfileAvatar
      │
      └── Page Content (outlet)
          │
          ├── DashboardPage
          │   ├── StatsRow
          │   │   └── GlassCard (×4 — active cases, alerts, etc)
          │   ├── CrimeStatsChart (Recharts)
          │   ├── RecentCasesList
          │   │   └── DataTable
          │   └── RecentAlertsList
          │       └── AlertBanner (×N)
          │
          ├── CaseListPage
          │   ├── PageHeader (title + create button)
          │   ├── SearchBar + filters
          │   └── DataTable
          │       ├── column: Case #
          │       ├── column: Type
          │       ├── column: Status → StatusBadge
          │       ├── column: Investigator
          │       ├── column: Date
          │       └── column: Actions
          │
          ├── DocketPage ★
          │   └── DocketLayout
          │       ├── DocketLeftSidebar
          │       │   ├── CaseInfoCard
          │       │   │   ├── Label "Case #"
          │       │   │   ├── Text "SEN-2024-0042"
          │       │   │   ├── Label "Category"
          │       │   │   ├── StatusBadge
          │       │   │   ├── Label "Lead Investigator"
          │       │   │   ├── Text "Det. S. Shai"
          │       │   │   ├── Label "Date Opened"
          │       │   │   └── Text "12 Mar 2024"
          │       │   ├── CriminalHistoryCard
          │       │   │   ├── List of prior offenses
          │       │   │   └── StatusBadge per entry
          │       │   ├── EvidenceSummaryCard
          │       │   │   ├── Icon counts (images, videos, docs)
          │       │   │   └── Progress bar (forensic complete %)
          │       │   └── ActivityLogCard
          │       │       └── Timeline (recent 5 actions)
          │       │
          │       ├── DocketCenterPanel
          │       │   ├── SuspectPortrait
          │       │   │   ├── Image (large, centered)
          │       │   │   ├── FacialOverlay (wireframe boxes)
          │       │   │   └── Confidence badge
          │       │   ├── ThreatRings (animated circles around portrait)
          │       │   │   ├── RiskIndicator (threat level)
          │       │   │   ├── RiskIndicator (recidivism)
          │       │   │   └── RiskIndicator (flight risk)
          │       │   ├── StatusBadge (centered below photo)
          │       │   └── QuickActions
          │       │       └── Button (arrest, update status, flag)
          │       │
          │       ├── DocketRightSidebar
          │       │   ├── SuspectDetailsCard
          │       │   │   ├── Full Name
          │       │   │   ├── ID Number
          │       │   │   ├── Age / DOB
          │       │   │   ├── Gender
          │       │   │   └── Address
          │       │   ├── ThreatAssessmentCard
          │       │   │   ├── ThreatMeter (horizontal gauge)
          │       │   │   ├── Risk factors list
          │       │   │   └── AI assessment summary
          │       │   ├── KnownAssociatesCard
          │       │   │   └── Associate list (avatar + name + status)
          │       │   └── LastKnownLocationCard
          │       │       └── MapChart (mini map with markers)
          │       │
          │       └── DocketBottomPanel
          │           └── Tabs
          │               ├── Tab: Investigation Notes
          │               │   ├── Textarea (add note)
          │               │   └── List of notes (author, timestamp, content)
          │               ├── Tab: Evidence Uploads
          │               │   ├── FileUpload (drag-and-drop zone)
          │               │   └── EvidenceGrid (uploaded items)
          │               ├── Tab: Witness Statements
          │               │   └── WitnessStatementCard (×N)
          │               │       ├── Name, contact
          │               │       ├── Statement text
          │               │       ├── Status (pending/verified/flagged)
          │               │       └── Actions (verify, flag)
          │               └── Tab: Attachments
          │                   └── AttachmentCard (×N)
          │                       ├── Icon (file type)
          │                       ├── File name
          │                       ├── Size, date
          │                       └── Download button
          │
          ├── EvidenceGalleryPage
          │   ├── PageHeader
          │   ├── FilterBar (type, date, case)
          │   └── EvidenceGrid
          │       └── EvidenceCard (×N)
          │
          ├── SightingListPage
          │   ├── SearchBar
          │   ├── FilterBar (status, date, region)
          │   └── DataTable (all sightings)
          │       └── row: StatusBadge, photo, name, location, date
          │
          ├── AlertsPage
          │   ├── PageHeader (create alert button)
          │   ├── FilterBar (severity, status, date)
          │   └── DataTable
          │       └── row: AlertBanner style severity
          │
          ├── AdminUsersPage
          │   ├── SearchBar
          │   ├── PageHeader (add user button)
          │   └── DataTable
          │       └── row: ProfileAvatar, name, email, role, status, actions
          │
          ├── SuperAdminAuditPage
          │   ├── SearchBar
          │   ├── FilterBar (category)
          │   ├── DataTable (immutable audit log)
          │   └── ExportButton (CSV)
          │
          └── ProfileSettingsPage
              ├── GlassCard
              │   ├── ProfileAvatar (editable)
              │   └── ProfileForm
              │       ├── Input (name)
              │       ├── Input (email)
              │       ├── Input (phone)
              │       ├── Select (notification preferences)
              │       └── Button (save)
              └── GlassCard
                  └── ChangePasswordForm
```

---

> **Next Document:** [02-ROUTE-DESIGN.md](./02-ROUTE-DESIGN.md)
