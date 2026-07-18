# Sentinel360 — All Page Designs

> **Document Version:** 1.0  
> **Last Updated:** June 2026  
> **Author:** Lead Frontend Developer — Alpha Tech

---

## Table of Contents

1. [Login Page](#1-login-page)
2. [Dashboard / Home Page](#2-dashboard--home-page)
3. [Wanted Feed Page](#3-wanted-feed-page)
4. [Case List Page](#4-case-list-page)
5. [Evidence Gallery Page](#5-evidence-gallery-page)
6. [Alerts Management Page](#6-alerts-management-page)
7. [Admin User Management Page](#7-admin-user-management-page)
8. [Super Admin Audit Logs Page](#8-super-admin-audit-logs-page)
9. [Profile Settings Page](#9-profile-settings-page)

---

## 1. Login Page

### Route: `/login`, `/forgot-password`

### Layout: `AuthLayout`

### Wireframe Description

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    ┌───────────────────────────┐                    │
│                    │                           │                    │
│                    │     SENTINEL360 LOGO      │                    │
│                    │     (neon blue glow)      │                    │
│                    │                           │                    │
│                    │  ───────────────────────  │                    │
│                    │                           │                    │
│                    │  Welcome Back            │                    │
│                    │  Sign in to Sentinel360  │                    │
│                    │                           │                    │
│                    │  ┌─────────────────────┐ │                    │
│                    │  │ Email               │ │                    │
│                    │  └─────────────────────┘ │                    │
│                    │                           │                    │
│                    │  ┌─────────────────────┐ │                    │
│                    │  │ Password            │ │                    │
│                    │  └─────────────────────┘ │                    │
│                    │                           │                    │
│                    │  [Forgot Password?]      │                    │
│                    │                           │                    │
│                    │  ┌─────────────────────┐ │                    │
│                    │  │   Sign In           │ │                    │
│                    │  └─────────────────────┘ │                    │
│                    │                           │                    │
│                    └───────────────────────────┘                    │
│                                                                     │
│              Background: Dark navy with ambient glow                │
└─────────────────────────────────────────────────────────────────────┘
```

### Component List

| Component | Description |
|---|---|
| `AuthLayout` | Centered card layout with animated background gradients |
| `GlassCard` | Frosted glass container for the form |
| `Logo` | Sentinel360 logo with neon blue text effect |
| `LoginForm` | Email + password form with validation |

| `ForgotPasswordForm` | Email input + submit |
| `Input` | Text input with floating label |
| `Button` | Primary submit button with loading state |
| `Divider` | "Or continue with" separator |
| `SocialLoginButtons` | Google/GitHub (optional, future) |

### State Management

```tsx
// React Query mutation
const loginMutation = useMutation({
  mutationFn: authService.login,
  onSuccess: (data) => {
    useAuthStore.getState().setAuth(data.user, data.tokens);
    router.push(redirect || "/dashboard");
  },
});
```
### States

| State | Visual | Behavior |
|---|---|---|
| Default | Clean form | All fields empty, submit button enabled |
| Validation error | Red border on invalid fields | Zod validation messages below inputs |
| Submitting | Spinner in button, fields disabled | Button shows loading spinner, text "Signing in..." |
| Network error | Toast error + field-level error | "Invalid credentials" or "Network error" |
| Success | Redirect to dashboard | Brief success toast, redirect |
| Rate limited | "Too many attempts" message | 30-second cooldown timer shown |

---

## 2. Dashboard / Home Page

### Route: `/dashboard`

### Layout: `DashboardLayout`

### Wireframe Description

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Header: Breadcrumbs | Global Search | Alert Bell | Profile]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Welcome back, Det. Shai                    [Last login: 2h ago]   │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ ACTIVE   │ │ PENDING  │ │ OPEN     │ │ CRITICAL │              │
│  │ CASES    │ │ ALERTS   │ │ EVIDENCE │ │ THREATS  │              │
│  │    24    │ │    7     │ │   142    │ │     3    │              │
│  │  +3 today│ │  +2 since │ │  +12 this│ │  in your │              │
│  │          │ │ yesterday│ │  week    │ │  region  │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                     │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │  CRIME STATISTICS        │  │  RECENT ACTIVITY         │        │
│  │                          │  │                          │        │
│  │  [Bar Chart: Crimes by   │  │  ● Case #SEN-0042 updated│        │
│  │   category this month]   │  │  ● New sighting in       │        │
│  │                          │  │    Green Market Square   │        │
│  │  Up 12% from last month  │  │  ● Evidence uploaded     │        │
│  │                          │  │  ● AI flag: 92% match   │        │
│  └──────────────────────────┘  └──────────────────────────┘        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  RECENT CASES                                   [View All]  │   │
│  │  ┌─────┬──────────────┬──────────┬──────────┬──────────┐   │   │
│  │  │ #   │ Suspect      │ Type     │ Status   │ Officer  │   │   │
│  │  ├─────┼──────────────┼──────────┼──────────┼──────────┤   │   │
│  │  │0042 │ J. Doe       │ Robbery  │ [WANTED] │ Shai     │   │   │
│  │  │0041 │ T. Moodley   │ Assault  │ [INVEST] │ Naidoo   │   │   │
│  │  │0040 │ P. Mashasha  │ Theft    │ [ARREST] │ Chauke   │   │   │
│  │  └─────┴──────────────┴──────────┴──────────┴──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────┐  ┌──────────────────────────┐        │
│  │  RECENT ALERTS           │  │  QUICK ACTIONS           │        │
│  │                          │  │                          │        │
│  │  🔴 CRITICAL: Suspicious │  │  [New Case]             │        │
│  │     activity detected    │  │  [Submit Evidence]      │        │
│  │  🟡 HIGH: Perimeter      │  │  [View Wanted Feed]     │        │
│  │     breach alert         │  │  [Generate Report]      │        │
│  │  🟢 MED: Known vehicle   │  │                          │        │
│  │     spotted in area      │  └──────────────────────────┘        │
│  └──────────────────────────┘                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Component List

| Component | Description |
|---|---|
| `StatsRow` | 4 glass cards with count, label, trend arrow, and icon |
| `CrimeStatsChart` | Recharts bar/line chart for crime trends |
| `Timeline` | Recent activity timeline (compact) |
| `DataTable` | Recent cases table (5 rows, sortable) |
| `AlertBanner` | Recent alerts (3 items, severity-colored) |
| `QuickActionsCard` | Glass card with shortcut buttons |
| `Skeleton` | Loading skeleton for each section |

### State Management

```tsx
// Dashboard aggregates data from multiple queries
function useDashboard() {
  const stats = useQuery({ queryKey: ["dashboard", "stats"], queryFn: dashboardService.getStats });
  const recentCases = useQuery({ queryKey: ["cases", "recent"], queryFn: () => casesService.list({ limit: 5 }) });
  const recentAlerts = useQuery({ queryKey: ["alerts", "recent"], queryFn: () => alertsService.list({ limit: 3 }) });
  const crimeStats = useQuery({ queryKey: ["dashboard", "crimeStats"], queryFn: dashboardService.getCrimeStats });

  return { stats, recentCases, recentAlerts, crimeStats };
}
```

---

## 3. Wanted Feed Page

### Route: `/wanted-feed`

### Layout: `DashboardLayout`

### Admin & Super Admin wanted feed with:

- **Full suspect details**: ID numbers, addresses, aliases, distinguishing features
- **Advanced filters**: Status (wanted/investigating/arrested), date range, officer assigned, confidence score range
- **Bulk actions**: Select multiple suspects → batch update status, export list
- **Real-time updates**: New wanted additions appear via WebSocket push
- **Evidence links**: Each suspect card shows count of associated evidence items
- **Quick verify**: Admin/Super Admin can verify or flag snapshots inline

### Additional Components

| Component | Description |
|---|---|
| `BulkActionBar` | Appears when items selected: "Update Status", "Export" |
| `AdvancedFilterPanel` | Expandable panel with all filter options |
| `VerifySnapshotModal` | Modal for Admin/Super Admin to approve/reject snapshots |
| `ExportButton` | Export to CSV/PDF |

---

## 4. Case List Page

### Route: `/cases`

### Layout: `DashboardLayout`

### Wireframe Description

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cases                                                    [+New]   │
│  Manage and track all investigation cases                          │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │  [Search cases...]   [Status ▼] [Type ▼] [Officer ▼]    │     │
│  │                                           [Clear Filters] │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                     │
│  Active filters: Status: Active, Wanted    (2 filters)  [Clear all]│
│                                                                     │
│  ┌─────┬───────────┬────────────┬──────────┬──────────┬─────────┐  │
│  │ ☐  │ Case #    │ Suspect    │ Type     │ Status   │ Updated │  │
│  ├─────┼───────────┼────────────┼──────────┼──────────┼─────────┤  │
│  │ ☐  │ SEN-0042  │ J. Doe     │ Robbery  │ [WANTED] │ 2h ago  │  │
│  │ ☐  │ SEN-0041  │ T. Moodley │ Assault  │ [INVEST] │ 5h ago  │  │
│  │ ☐  │ SEN-0040  │ P.Mashasha │ Theft    │ [ARREST] │ 1d ago  │  │
│  │ ☐  │ SEN-0039  │ K. Tladi   │ Burglary │ [ACTIVE] │ 3d ago  │  │
│  │ ☐  │ SEN-0038  │ T. Chauke  │ Fraud    │ [CLOSED] │ 1w ago  │  │
│  └─────┴───────────┴────────────┴──────────┴──────────┴─────────┘  │
│                                                                     │
│  [< Prev]  Page 1 of 12  (142 total)  [Next >]   [25 per page ▼]  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component List

| Component | Description |
|---|---|
| `SearchBar` | Text search with debounce |
| `CaseFilterForm` | Dropdowns for status, type, officer, date range |
| `DataTable` | Full-featured table with sorting, selection |
| `StatusBadge` | Per-row status indicator |
| `BulkActionBar` | Appears on selection |
| `NewCaseModal` | Dialog with form to create new case |
| `Pagination` | Page controls with page size selector |

### State Management

```tsx
// Filters stored in URL params for shareability
const searchParams = useSearchParams();
const filters = {
  search: searchParams.get("q") || "",
  status: searchParams.get("status") || "",
  type: searchParams.get("type") || "",
  page: parseInt(searchParams.get("page") || "1"),
  limit: parseInt(searchParams.get("limit") || "25"),
};

const { data, isLoading } = useQuery({
  queryKey: ["cases", filters],
  queryFn: () => casesService.list(filters),
});
```

### States

| State | Visual |
|---|---|
| Loading | Skeleton rows (8 rows) |
| Empty | "No cases found matching your filters" with illustration |
| Error | Error message with retry |
| No results | "0 cases match your search" with clear filters button |

---

## 5. Evidence Gallery Page

### Route: `/evidence`

### Layout: `DashboardLayout`

### Wireframe Description

```
┌─────────────────────────────────────────────────────────────────────┐
│  Evidence Gallery                                         [+Upload] │
│  Browse all forensic evidence across cases                          │
│                                                                     │
│  [Search...]  [Type: All ▼]  [Case: ▼]  [Date: ▼]  [☐ Grid] [☐ List]│
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │              │
│  │ │IMG   │ │ │ │IMG   │ │ │ │VID   │ │ │ │DOC   │ │              │
│  │ │      │ │ │ │      │ │ │ │      │ │ │ │      │ │              │
│  │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │              │
│  │ Crime    │ │ Scene    │ │ Interview│ │ Report   │              │
│  │ Scene #1 │ │ Photo #4 │ │ Recording│ │ 04/2024  │              │
│  │ Case 42  │ │ Case 42  │ │ Case 41  │ │ Case 40  │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ ...      │ │ ...      │ │ ...      │ │ ...      │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                     │
│  Loading more... [infinite scroll]                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Component List

| Component | Description |
|---|---|
| `SearchBar` | Search by title, description, tags |
| `FilterBar` | Type, case, date range, tags |
| `EvidenceGrid` | Grid/masonry layout of evidence cards |
| `EvidenceCard` | Thumbnail with type badge, title, case ref, date |
| `ViewToggle` | Grid/List toggle |
| `UploadModal` | Modal with FileUpload component |
| `EvidenceDetailModal` | Full-size preview with metadata |

### Evidence Detail Modal

```
┌────────────────────────────────────────────────────────────────┐
│  [X] Close                                  [Download] [Share]  │
│  ┌───────────────────────┐  ┌───────────────────────────────┐  │
│  │                       │  │  Filename: scene_photo_1.jpg  │  │
│  │   FULL SIZE PREVIEW   │  │  Type: Image                  │  │
│  │   (image/video/doc)   │  │  Size: 4.2 MB                │  │
│  │                       │  │  Uploaded: 12 Mar 2024        │  │
│  │                       │  │  By: Det. S. Shai            │  │
│  │                       │  │  Case: SEN-2024-0042         │  │
│  │                       │  │                              │  │
│  └───────────────────────┘  │  Tags:                        │  │
│                              │  [crime-scene] [firearm]     │  │
│                              │                              │  │
│                              │  AI Analysis:                │  │
│                              │  Confidence: 94.2%           │  │
│                              │  Objects detected: firearm,  │  │
│                              │  shell casing, blood spatter │  │
│                              │                              │  │
│                              │  Chain of Custody:           │  │
│                              │  ✓ Hash: a3f2b...           │  │
│                              │  ✓ Verifed: 12 Mar 2024     │  │
│                              └───────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. Alerts Management Page

### Route: `/alerts`

### Layout: `DashboardLayout`

### Wireframe Description

```
┌─────────────────────────────────────────────────────────────────────┐
│  Alerts & Notifications                                [+Create]   │
│  Manage system alerts and notifications                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [Search alerts...]  [Severity ▼]  [Status ▼]  [Date ▼]   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  🔴 CRITICAL  │ Now    │ Suspicious activity — Dock Road          │
│  🟡 HIGH      │ 2h ago │ Perimeter breach — Warehouse 4          │
│  🟡 HIGH      │ 5h ago │ Known vehicle spotted — Green Point     │
│  🟢 MEDIUM    │ 1d ago │ New sighting reported — City Bowl       │
│  🔵 LOW       │ 2d ago │ System update: AI model v2.1 deployed   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [< Prev]  Page 1 of 8  [Next >]                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ────────────────────────────  Filters active ─────────────────── │
│  Real-time updates: ● Connected (WebSocket active)                │
└─────────────────────────────────────────────────────────────────────┘
```

### Component List

| Component | Description |
|---|---|
| `SearchBar` | Search by title, message |
| `FilterBar` | Severity, status, date range, type |
| `AlertList` | Styled list with severity icons and colors |
| `AlertBanner` | Used within list items |
| `CreateAlertModal` | Form: title, message, severity, target (region/role) |
| `AlertDetailModal` | Full alert details with delivery status |
| `StatusIndicator` | WebSocket connection status |

### Create Alert Modal (Admin+)

```
┌────────────────────────────────────────────────────────────────┐
│  Create Alert                                                  │
│  ────────────────────────────────────────────                  │
│                                                               │
│  Title *       ┌────────────────────────────────────┐         │
│                └────────────────────────────────────┘         │
│                                                               │
│  Message *     ┌────────────────────────────────────┐         │
│                │                                    │         │
│                └────────────────────────────────────┘         │
│                                                               │
│  Severity *    [Critical ▼]                                   │
│                                                               │
│  Target        [Region: Cape Town ▼]     [All Users]          │
│                [Role: Admin, Super Admin ▼]                   │
│                                                               │
│  [Send Alert]                [Cancel]                         │
└────────────────────────────────────────────────────────────────┘
```

### Real-Time Updates

Alerts are delivered via WebSocket. The `alertsStore` maintains a queue:

```tsx
// store/alerts-store.ts
interface AlertsState {
  queue: Alert[];
  unreadCount: number;
  isConnected: boolean;
  addAlert: (alert: Alert) => void;
  markRead: (alertId: string) => void;
  dismissAlert: (alertId: string) => void;
  clearAll: () => void;
}
```

---

## 7. Admin User Management Page

### Route: `/admin/users`

### Layout: `DashboardLayout`

### Wireframe Description

```
┌─────────────────────────────────────────────────────────────────────┐
│  User Management                                          [+Add]   │
│  Manage all registered users and their roles                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [Search by name, email...]  [Role ▼]  [Status ▼]         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────┬──────────┬──────────────┬────────┬────────┬──────────┐   │
│  │ User │ Name     │ Email        │ Role   │ Status │ Actions  │   │
│  ├──────┼──────────┼──────────────┼────────┼────────┼──────────┤   │
│  │ [A]  │ S. Shai  │ serati@s    │ Admin   │ Active │ [Edit]   │   │
│  │ [T]  │ T.Moodle │ tashen@s    │ Super   │ Active │ [Edit]   │   │
│  │ [P]  │ P.Mash   │ patricia@s  │ Admin   │ Active │ [Edit]   │   │
│  │ [K]  │ K. Tladi │ kgahlish@s  │ Super   │ Inact  │ [Edit]   │   │
│  │ [T]  │ T.Chauke │ trinity@s   │ Admin   │ Active │ [Edit]   │   │
│  └──────┴──────────┴──────────────┴────────┴────────┴──────────┘   │
│                                                                     │
│  [< Prev]  Page 1 of 5  [Next >]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component List

| Component | Description |
|---|---|
| `DataTable` | Users table with avatar, name, email, role, status |
| `SearchBar` | Search users |
| `FilterBar` | Role filter, status filter |
| `UserModal` | Add/Edit user form (name, email, role, status) |
| `UserDeleteDialog` | Confirmation dialog with reason |
| `ProfileAvatar` | User avatar in table rows |

### User Modal

```
┌────────────────────────────────────────────────────────────────┐
│  Add New User                                    [X] Close     │
│  ────────────────────────────────────────────                  │
│                                                               │
│  Full Name *   ┌────────────────────────────────────┐         │
│                └────────────────────────────────────┘         │
│                                                               │
│  Email *       ┌────────────────────────────────────┐         │
│                └────────────────────────────────────┘         │
│                                                               │
│  Role *        [Admin ▼]                                      │
│                                                               │
│  Status        [● Active]                                     │
│                                                               │
│  [Send Invitation]  [Save]  [Cancel]                          │
└────────────────────────────────────────────────────────────────┘
```

---

## 8. Super Admin Audit Logs Page

### Route: `/super-admin/audit-logs`

### Layout: `DashboardLayout`

### Wireframe Description

```
┌─────────────────────────────────────────────────────────────────────┐
│  Audit Logs                                              [Export]  │
│  Complete system activity log — immutable and searchable           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [Search by user, action...]                                │   │
│  │  Date From: [12 Mar 2024]  To: [12 Jun 2024]               │   │
│  │  User: [All Users ▼]  Action: [All Actions ▼]             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────┬──────────┬─────────────┬──────────┬──────────┬────────┐  │
│  │ Time │ User     │ Action      │ Resource │ IP       │ Status │  │
│  ├──────┼──────────┼─────────────┼──────────┼──────────┼────────┤  │
│  │14:32 │ S. Shai  │ case.update │ SEN-0042 │ 192.x.x  │ ✓      │  │
│  │14:30 │ T.Moodle │ user.create │ User #12 │ 10.x.x   │ ✓      │  │
│  │14:25 │ P.Mash   │ sight.verify│ SGT-042  │ 192.x.x  │ ✓      │  │
│  │14:20 │ System   │ ai.flag     │ Snap #091 │ —       │ ✓      │  │
│  │14:15 │ K. Tladi │ auth.login  │ —        │ 172.x.x  │ ✓      │  │
│  └──────┴──────────┴─────────────┴──────────┴──────────┴────────┘  │
│                                                                     │
│  [< Prev]  Page 1 of 48  [Next >]            Total: 1,194 entries │
│                                                                     │
│  ⚠ Audit logs cannot be edited or deleted by any user              │
└─────────────────────────────────────────────────────────────────────┘
```

### Component List

| Component | Description |
|---|---|
| `SearchBar` | Search across all log fields |
| `DateRangePicker` | Start/end date filter |
| `FilterBar` | User filter, action type filter |
| `DataTable` | Immutable log display |
| `ExportButton` | Export to CSV |
| `LogDetailDialog` | Full log entry details |
| `ImmutableBadge` | "Cannot be edited" notice |

### Key Design Decisions

- **Immutability**: No edit or delete actions available. Table is read-only.
- **Export**: CSV export of filtered results for compliance reporting.
- **Search**: Full-text search across user name, action, resource, IP address.
- **Pagination**: Server-side pagination due to potentially millions of entries.
- **Real-time**: New audit entries appear via WebSocket stream.

---

## 9. Profile Settings Page

### Route: `/profile`

### Layout: `DashboardLayout`

### Wireframe Description

```
┌─────────────────────────────────────────────────────────────────────┐
│  Profile Settings                                                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Profile Information                                        │   │
│  │                                                              │   │
│  │       ┌──────┐                                              │   │
│  │       │ AVAT │  [Change Photo]                              │   │
│  │       │ ATAR │                                              │   │
│  │       └──────┘                                              │   │
│  │                                                              │   │
│  │  Full Name    ┌────────────────────────────────────┐        │   │
│  │               └────────────────────────────────────┘        │   │
│  │                                                              │   │
│  │  Email        ┌────────────────────────────────────┐        │   │
│  │               └────────────────────────────────────┘        │   │
│  │                                                              │   │
│  │  Phone        ┌────────────────────────────────────┐        │   │
│  │               └────────────────────────────────────┘        │   │
│  │                                                              │   │
│  │  Organization ┌────────────────────────────────────┐        │   │
│  │               └────────────────────────────────────┘        │   │
│  │                                                              │   │
│  │  [Save Changes]                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Change Password                                           │   │
│  │                                                              │   │
│  │  Current Password  ┌────────────────────────────────────┐   │   │
│  │                    └────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  New Password      ┌────────────────────────────────────┐   │   │
│  │                    └────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  Confirm New      ┌────────────────────────────────────┐   │   │
│  │                    └────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  [Update Password]                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Notification Preferences                                   │   │
│  │                                                              │   │
│  │  ☑ Push notifications for alerts                            │   │
│  │  ☐ Email notifications for case updates                     │   │
│  │  ☑ SMS for critical alerts                                  │   │
│  │                                                              │   │
│  │  Alert Radius: [=====○=========] 5 km                       │   │
│  │                                                              │   │
│  │  [Save Preferences]                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Account Information                                        │   │
│  │                                                              │   │
│  │  Role: Admin                                                 │   │
│  │  Member since: 01 Jan 2024                                  │   │
│  │  Last login: Today at 14:30                                 │   │
│  │                                                              │   │
│  │  [Delete Account] (requires confirmation)                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component List

| Component | Description |
|---|---|
| `ProfileAvatar` | Editable avatar with upload |
| `ProfileForm` | React Hook Form for name, email, phone |
| `PasswordForm` | Current + new password with validation |
| `NotificationPreferences` | Checkboxes + alert radius slider |
| `AccountInfoCard` | Read-only account information |
| `DeleteAccountDialog` | Confirmation dialog with reason input |

---

> **Next Document:** [05-STATE-MANAGEMENT.md](./05-STATE-MANAGEMENT.md)
