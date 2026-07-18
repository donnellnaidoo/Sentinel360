# Sentinel360 — Frontend Component Architecture

> **Document:** 07-COMPONENT-ARCHITECTURE.md  
> **Version:** 1.0  
> **Status:** Approved  
> **Last Updated:** June 2026

---

## Frontend Technology Stack

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **React 18** | UI Framework | Component model, ecosystem, team familiarity |
| **TypeScript** | Language | Type safety, developer experience, self-documenting |
| **Vite** | Build Tool | Fast HMR, optimized builds, ESM-native |
| **Tailwind CSS** | Styling | Utility-first, rapid prototyping, consistent design system |
| **shadcn/ui** | Component Library | Accessible, customizable, copy-paste philosophy |
| **Zustand** | State Management | Lightweight, TypeScript-first, minimal boilerplate |
| **TanStack Query** | Server State | Caching, pagination, optimistic updates, retry logic |
| **React Router v6** | Routing | Nested routes, loaders, actions, data patterns |
| **Socket.io-client** | Real-time | WebSocket reconnection, channel subscriptions |
| **React Three Fiber** | 3D Visualization | Three.js abstraction for React, declarative scene building |
| **Mapbox GL / Leaflet** | Maps | Geospatial data visualization, marker clustering |
| **Zod** | Validation | Schema validation for forms and API responses |
| **Vitest** | Testing | Unit + integration tests, Vite-native |

---

## Application Route Design

```
/                                    → Public Landing Page
/login                               → Login
/register                            → Registration
/forgot-password                     → Password Reset

/dashboard                           → Main Dashboard (post-login)

/feed                                → Public Wanted Feed
/feed?status=active,arrested         → Filtered Feed
/feed/:id                            → Profile Detail (public)

/cases                               → Case List (LE, Security, Admin)
/cases/:id                           → Case Detail / Docket Page (CRITICAL)
/cases/:id/timeline                  → Case Timeline View
/cases/:id/evidence                  → Case Evidence Browser
/cases/:id/3d-reconstruction         → 3D Scene Viewer
/cases/new                           → Create New Case

/evidence                            → Evidence Repository
/evidence/:id                        → Evidence Detail + Chain of Custody

/sightings                           → Sighting List (LE, Admin)
/sightings/:id                       → Sighting Detail
/sightings/submit                    → Submit Sighting (Community, Security)

/profiles                            → Criminal Profiles List
/profiles/:id                        → Profile Detail
/profiles/:id/edit                   → Edit Profile (Admin)
/profiles/new                        → Create Profile (Admin)

/alerts                              → Alert History
/alerts/:id                          → Alert Detail

/analytics                           → Analytics Dashboard (Admin+)
/analytics/cases                     → Case Analytics
/analytics/ai-performance            → AI Model Performance

/admin                               → Admin Dashboard
/admin/users                         → User Management (Super Admin)
/admin/users/:id                     → User Detail
/admin/roles                         → Role Management (Super Admin)
/admin/snapshots/pending             → Pending Snapshot Review (Admin)
/admin/snapshots/queue               → QA Queue
/admin/audit-logs                    → Audit Log Viewer (Super Admin)
/admin/system-config                 → System Configuration (Super Admin)
/admin/models                        → AI Model Management

/settings                            → User Settings
/settings/profile                    → Edit Profile
/settings/notifications              → Notification Preferences
/settings/security                   → Security Settings (2FA setup)

/help                                → Help & Documentation
/help/api                           → API Documentation
```

---

## Component Tree (Complete)

```
<App>
  <ThemeProvider>
    <AuthProvider>
      <QueryClientProvider>
        <RouterProvider>
          <Layout>
            ┌─────────────────────────────────────────────────────────┐
            │  <AppShell>                                              │
            │    ├── <Sidebar>                                         │
            │    │     ├── <Logo />                                    │
            │    │     ├── <NavSection title="Main">                   │
            │    │     │     ├── <NavItem to="/dashboard" icon="home" />│
            │    │     │     ├── <NavItem to="/feed" icon="feed" />    │
            │    │     │     ├── <NavItem to="/cases" icon="case" />   │
            │    │     │     └── <NavItem to="/alerts" icon="alert" /> │
            │    │     ├── <NavSection title="Investigation">          │
            │    │     │     ├── <NavItem to="/evidence" icon="evidence" />│
            │    │     │     ├── <NavItem to="/sightings" icon="sighting" />│
            │    │     │     └── <NavItem to="/profiles" icon="profile" />│
            │    │     ├── <NavSection title="Administration">         │
            │    │     │     ├── <NavItem to="/admin" icon="admin" />  │
            │    │     │     ├── <NavItem to="/analytics" icon="chart" />│
            │    │     │     └── <NavItem to="/settings" icon="settings" />│
            │    │     └── <UserMenu />                                 │
            │    ├── <TopBar>                                          │
            │    │     ├── <Breadcrumbs />                              │
            │    │     ├── <GlobalSearch />                             │
            │    │     ├── <AlertBadge />                               │
            │    │     └── <UserAvatar />                               │
            │    └── <MainContent>                                      │
            │          └── <Outlet />  ← Route content rendered here    │
            └─────────────────────────────────────────────────────────┘

            === ROUTE-SPECIFIC COMPONENTS ===

            ├── <PublicFeedPage>                                       │
            │     └── <WantedFeed>                                     │
            │           ├── <FeedHeader>                                │
            │           │     ├── <FeedSearch />                        │
            │           │     └── <FeedFilters />                       │
            │           ├── <FeedGrid>                                  │
            │           │     └── <FeedCard> (repeated)                 │
            │           │           ├── <ProfilePhoto />                │
            │           │           ├── <ProfileInfo />                 │
            │           │           ├── <LastLocation />                │
            │           │           └── <StatusBadge />                 │
            │           └── <Pagination />                              │
            │                                                           │
            ├── <DashboardPage>                                         │
            │     └── <Dashboard>                                       │
            │           ├── <StatCardGrid>                              │
            │           │     ├── <StatCard title="Active Cases" />     │
            │           │     ├── <StatCard title="Alerts Today" />     │
            │           │     ├── <StatCard title="Pending Sightings" />│
            │           │     └── <StatCard title="AI Matches" />       │
            │           ├── <RecentAlertsPanel />                       │
            │           ├── <ActiveCasesTable />                        │
            │           └── <SightingMap />                             │
            │                                                           │
            ╔═══════════════════════════════════════════════════════╗   │
            ║  === DOCKET PAGE (CRITICAL COMPONENT) ===             ║   │
            ║  <DocketPage>                                         ║   │
            ║    └── <DocketLayout>  ← Three-column glassmorphism   ║   │
            ║          ├── <DocketLeftSidebar>                       ║   │
            ║          │     ├── <CaseHeader>                       ║   │
            ║          │     │     ├── <CaseNumber />               ║   │
            ║          │     │     ├── <CaseStatus />               ║   │
            ║          │     │     └── <CasePriority />             ║   │
            ║          │     ├── <CaseInfo>                         ║   │
            ║          │     │     ├── <InfoField label="Category"/>║   │
            ║          │     │     ├── <InfoField label="Date"/>   ║   │
            ║          │     │     ├── <InfoField label="Location"/>║   │
            ║          │     │     └── <InfoField label="Status"/> ║   │
            ║          │     ├── <InvestigatorCard>                 ║   │
            ║          │     │     ├── <Avatar />                   ║   │
            ║          │     │     ├── <InvestigatorName />         ║   │
            ║          │     │     └── <BadgeNumber />              ║   │
            ║          │     ├── <TimelinePreview>                  ║   │
            ║          │     │     └── <TimelineEntry> (×3)         ║   │
            ║          │     └── <QuickActions>                     ║   │
            ║          │           ├── <ActionButton label="Add Evidence"/> │
            ║          │           ├── <ActionButton label="Link Profile"/> │
            ║          │           └── <ActionButton label="Generate Report"/> │
            ║          │                                              ║   │
            ║          ├── <DocketCenterPanel>                        ║   │
            ║          │     ├── <SuspectPortrait>                    ║   │
            ║          │     │     ├── <ProfilePhoto main />          ║   │
            ║          │     │     ├── <ConfidenceBadge />            ║   │
            ║          │     │     ├── <MatchStatus />                ║   │
            ║          │     │     └── <FaceMatchOverlay />           ║   │
            ║          │     ├── <EvidenceCarousel>                   ║   │
            ║          │     │     └── <EvidenceSlide> (×N)           ║   │
            ║          │     └── <AIAnalysisSummary>                  ║   │
            ║          │           ├── <ConfidenceMeter />            ║   │
            ║          │           ├── <ModelVersion />               ║   │
            ║          │           └── <ReanalyzButton />             ║   │
            ║          │                                              ║   │
            ║          ├── <DocketRightSidebar>                       ║   │
            ║          │     ├── <SuspectDetails>                     ║   │
            ║          │     │     ├── <DetailField label="Name"/>   ║   │
            ║          │     │     ├── <DetailField label="Aliases"/> ║   │
            ║          │     │     ├── <DetailField label="DOB"/>    ║   │
            ║          │     │     ├── <DetailField label="Height"/> ║   │
            ║          │     │     └── <DetailField label="Risk"/>   ║   │
            ║          │     ├── <KnownAssociates>                    ║   │
            ║          │     │     └── <AssociateChip> (×N)           ║   │
            ║          │     ├── <LastLocations>                      ║   │
            ║          │     │     └── <LocationEntry> (×3)           ║   │
            ║          │     └── <ThreatAssessment>                   ║   │
            ║          │           ├── <ThreatLevel />                ║   │
            ║          │           └── <AssessmentNotes />            ║   │
            ║          │                                              ║   │
            ║          └── <DocketBottomPanel>                        ║   │
            ║                ├── <TabBar>                             ║   │
            ║                │     ├── <Tab label="Evidence Log"/>   ║   │
            ║                │     ├── <Tab label="Timeline"/>       ║   │
            ║                │     ├── <Tab label="Chain of Custody"/>║   │
            ║                │     ├── <Tab label="Activity Log"/>   ║   │
            ║                │     └── <Tab label="3D Scene"/>       ║   │
            ║                └── <TabContent>                         ║   │
            ║                      ├── <EvidenceLogPanel>             ║   │
            ║                      ├── <TimelinePanel>                ║   │
            ║                      ├── <ChainOfCustodyPanel>          ║   │
            ║                      ├── <ActivityLogPanel>             ║   │
            ║                      └── <SceneViewer3D>                ║   │
            ╚═══════════════════════════════════════════════════════╝   │
            │                                                           │
            ├── <CaseListPage>                                          │
            │     └── <CaseTable>                                       │
            │           ├── <CaseFilters />                             │
            │           └── <CaseTableBody>                             │
            │                 └── <CaseRow> (repeated)                  │
            │                                                           │
            ├── <EvidenceDetailPage>                                    │
            │     ├── <EvidenceViewer>                                  │
            │     │     ├── <ImageViewer />  or  <VideoPlayer />        │
            │     │     └── <EvidenceMetadata />                        │
            │     └── <ChainOfCustodyTimeline>                          │
            │           └── <CustodyEntry> (repeated)                   │
            │                                                           │
            ├── <SightingDetailPage>                                    │
            │     ├── <SightingMedia />                                 │
            │     ├── <SightingMap />                                   │
            │     ├── <SightingVerification> (LE/Admin)                 │
            │     └── <AIMatchResult />                                 │
            │                                                           │
            ├── <ProfileDetailPage>                                     │
            │     ├── <ProfileHeader>                                   │
            │     │     ├── <ProfilePhoto />                            │
            │     │     ├── <ProfileIdentity />                         │
            │     │     └── <ProfileActions />                          │
            │     ├── <ProfileTabs>                                     │
            │     │     ├── <Tab label="Biometrics" />                  │
            │     │     ├── <Tab label="Case History" />                │
            │     │     ├── <Tab label="Known Associates" />            │
            │     │     ├── <Tab label="Locations" />                   │
            │     │     └── <Tab label="Threat Assessment" />           │
            │     └── <ProfileTimeline>                                 │
            │                                                           │
            ├── <AdminDashboard>                                        │
            │     ├── <AdminStats />                                    │
            │     ├── <PendingVerifications />                          │
            │     ├── <RecentActivity />                                │
            │     └── <SystemHealth />                                  │
            │                                                           │
            ├── <AdminUserManagement> (Super Admin)                     │
            │     ├── <UserTable />                                     │
            │     ├── <UserCreateDialog />                              │
            │     └── <UserDetailPanel />                               │
            │                                                           │
            ├── <AuditLogViewer> (Super Admin)                          │
            │     ├── <AuditLogFilters />                               │
            │     ├── <AuditLogTable />                                 │
            │     └── <AuditLogExport />                                │
            │                                                           │
            ├── <SettingsPage>                                          │
            │     ├── <ProfileSettings />                               │
            │     ├── <NotificationSettings />                          │
            │     └── <SecuritySettings>                                │
            │           └── <TwoFactorSetup />                          │
            │                                                           │
            └── <SightingSubmitPage>                                    │
                  ├── <SightingForm>                                    │
                  │     ├── <PhotoCapture />                             │
                  │     ├── <LocationPicker />                           │
                  │     └── <DescriptionField />                         │
                  └── <SubmissionConfirmation />                         │
```

---

## State Management Architecture

### State Categories

| State Type | Tool | Examples |
|------------|------|----------|
| **Server State** | TanStack Query | Cases list, evidence list, profiles, API data |
| **Client State** | Zustand | UI preferences, selected case, sidebar state, modals |
| **Auth State** | Zustand + Context | Current user, tokens, permissions, session status |
| **WebSocket State** | Zustand | Real-time alerts, live feed updates |
| **Form State** | React Hook Form | Sightings form, case creation, evidence upload |
| **URL State** | React Router | Current route, query parameters, filters |

### Store Structure (Zustand)

```typescript
// Store slices - each is a separate Zustand store

// Auth Store
interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  permissions: string[]; // cached for quick checks
  requires2fa: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
}

// UI Store
interface UIStore {
  sidebarCollapsed: boolean;
  selectedTheme: 'light' | 'dark';
  activeCaseId: string | null;
  activeModal: ModalType | null;
  docketTab: DocketTab; // 'evidence' | 'timeline' | 'custody' | 'activity' | '3d'
  
  toggleSidebar: () => void;
  setActiveModal: (modal: ModalType | null) => void;
  setDocketTab: (tab: DocketTab) => void;
}

// Alerts Store
interface AlertsStore {
  unreadCount: number;
  recentAlerts: Alert[];
  connected: boolean;
  
  addAlert: (alert: Alert) => void;
  markAsRead: (alertId: string) => void;
  setConnected: (status: boolean) => void;
}

// Docket Store (current case context)
interface DocketStore {
  caseData: CaseDetail | null;
  isLoading: boolean;
  activeSuspectIndex: number;
  timelineExpanded: boolean;
  bottomPanelTab: DocketTab;
  
  setCaseData: (data: CaseDetail) => void;
  setActiveSuspect: (index: number) => void;
  setBottomPanelTab: (tab: DocketTab) => void;
}
```

### Data Fetching Strategy (TanStack Query)

```typescript
// Query key conventions
const queryKeys = {
  cases: {
    all: ['cases'] as const,
    list: (filters: CaseFilters) => ['cases', 'list', filters] as const,
    detail: (id: string) => ['cases', 'detail', id] as const,
    timeline: (id: string) => ['cases', 'timeline', id] as const,
    evidence: (id: string) => ['cases', 'evidence', id] as const,
    activity: (id: string) => ['cases', 'activity', id] as const,
  },
  evidence: {
    all: ['evidence'] as const,
    list: (filters: EvidenceFilters) => ['evidence', 'list', filters] as const,
    detail: (id: string) => ['evidence', 'detail', id] as const,
    custody: (id: string) => ['evidence', 'custody', id] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    list: (filters: ProfileFilters) => ['profiles', 'list', filters] as const,
    public: (page: number) => ['profiles', 'public', page] as const,
    detail: (id: string) => ['profiles', 'detail', id] as const,
    associates: (id: string) => ['profiles', 'associates', id] as const,
    locations: (id: string) => ['profiles', 'locations', id] as const,
  },
  sightings: {
    all: ['sightings'] as const,
    list: (filters: SightingFilters) => ['sightings', 'list', filters] as const,
    detail: (id: string) => ['sightings', 'detail', id] as const,
    mySightings: (userId: string) => ['sightings', 'my', userId] as const,
  },
  alerts: {
    unread: ['alerts', 'unread'] as const,
    list: (filters: AlertFilters) => ['alerts', 'list', filters] as const,
  },
  admin: {
    users: (filters: UserFilters) => ['admin', 'users', filters] as const,
    auditLogs: (filters: AuditFilters) => ['admin', 'audit', filters] as const,
    systemConfig: ['admin', 'config'] as const,
    modelVersions: ['admin', 'models'] as const,
  },
  analytics: {
    dashboard: ['analytics', 'dashboard'] as const,
    caseTrends: (period: string) => ['analytics', 'cases', period] as const,
  },
};

// Mutation example
const useSubmitSighting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: SightingFormData) => api.post('/sightings', data),
    onSuccess: (response) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.sightings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.unread });
      
      // Show success toast
      toast.success(`Sighting submitted: ${response.referenceNumber}`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
};
```

---

## The Docket Page — Critical Component Deep Dive

### Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  <DocketPage>                                                                 │
│    ┌────────────────────────────────────────────────────────────────────────┐│
│    │  <DocketLayout>  (CSS Grid: 1fr 2fr 1fr / auto rows)                   ││
│    │                                                                         ││
│    │  ┌──────────────┐ ┌────────────────────┐ ┌──────────────┐             ││
│    │  │ <LeftSidebar> │ │ <CenterPanel>      │ │ <RightSidebar>│             ││
│    │  │  glassmorphism │ │  glassmorphism     │ │  glassmorphism│             ││
│    │  │  w=300px      │ │  flex-1            │ │  w=320px     │             ││
│    │  │               │ │                    │ │              │             ││
│    │  │  Case Info    │ │  Suspect Portrait  │ │  Suspect     │             ││
│    │  │               │ │  (large, centered) │ │  Details     │             ││
│    │  │  Investigator │ │                    │ │              │             ││
│    │  │               │ │  Evidence Carousel │ │  Associates  │             ││
│    │  │  Timeline     │ │                    │ │              │             ││
│    │  │  Preview      │ │  AI Analysis       │ │  Last Known  │             ││
│    │  │               │ │  Summary           │ │  Locations   │             ││
│    │  │  Quick        │ │                    │ │              │             ││
│    │  │  Actions      │ │                    │ │  Threat      │             ││
│    │  └──────────────┘ └────────────────────┘ │  Assessment  │             ││
│    │                                           └──────────────┘             ││
│    │                                                                         ││
│    │  ┌───────────────────────────────────────────────────────────────────┐ ││
│    │  │ <BottomPanel>  (Full width, below the three columns)              │ ││
│    │  │  ┌─────────────────────────────────────────────────────────────┐ │ ││
│    │  │  │ <TabBar>                                                     │ │ ││
│    │  │  │  [Evidence Log] [Timeline] [Chain of Custody] [Activity] [3D]│ │ ││
│    │  │  └─────────────────────────────────────────────────────────────┘ │ ││
│    │  │  ┌─────────────────────────────────────────────────────────────┐ │ ││
│    │  │  │ <TabContent>                                                 │ │ ││
│    │  │  │  (Renders active tab panel — EvidenceLog, Timeline,          │ │ ││
│    │  │  │   ChainOfCustody, ActivityLog, or SceneViewer3D)             │ │ ││
│    │  │  └─────────────────────────────────────────────────────────────┘ │ ││
│    │  └───────────────────────────────────────────────────────────────────┘ ││
│    └────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Glassmorphism Design System

The Docket Page uses a **glassmorphism** aesthetic for its panels:

```css
/* Glassmorphism utility */
.glass-panel {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.glass-panel-dark {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Applied to docket panels via Tailwind */
/* <div className="glass-panel p-4"> */
```

### Center Panel: Suspect Portrait

```
┌─────────────────────────────────────────────┐
│  <SuspectPortrait>                            │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │                                         │ │
│  │        ┌─────────────────────┐          │ │
│  │        │                     │          │ │
│  │        │    Suspect Photo    │          │ │
│  │        │    (centered,       │          │ │
│  │        │     320×400px)      │          │ │
│  │        │                     │          │ │
│  │        │                     │          │ │
│  │        └─────────────────────┘          │ │
│  │              ▲                          │ │
│  │              │                          │ │
│  │     <ConfidenceBadge>                   │ │
│  │     ┌──────────────┐                    │ │
│  │     │  94.2% Match │ ← Overlaid on     │ │
│  │     │  Confidence  │    bottom-right    │ │
│  │     └──────────────┘    of photo        │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  <FaceMatchOverlay>                           │
│  ┌─────────────────────────────────────────┐ │
│  │  ┌──────────┐    ┌──────────┐           │ │
│  │  │ AI Image │    │ Mugshot  │           │ │
│  │  │ Capture  │ ←→ │          │ ← Side-  │ │
│  │  │          │    │          │   by-side │ │
│  │  │ Confidence│   │          │   compar. │ │
│  │  │  94.2%   │    │          │           │ │
│  │  └──────────┘    └──────────┘           │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  <AIAnalysisSummary>                          │
│  ┌─────────────────────────────────────────┐ │
│  │  ⚡ AI Analysis Summary                  │ │
│  │  ┌───────────────────┐                   │ │
│  │  │ Confidence Meter  │  92.4%            │ │
│  │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░│                   │ │
│  │  └───────────────────┘                   │ │
│  │  Model: ArcFace v1.0.3                    │ │
│  │  Captured: 2026-06-04 14:31:15           │ │
│  │  [Re-analyze] [Flag for review]           │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Docket Data Flow

```
1. User navigates to /cases/:id
2. DocketPage component mounts
3. React Router loader fetches case data:

    const docketLoader: LoaderFunction = async ({ params }) => {
      const [caseData, timeline, evidence, activity] = await Promise.all([
        api.get(`/cases/${params.id}`),
        api.get(`/cases/${params.id}/timeline?limit=5`),
        api.get(`/cases/${params.id}/evidence`),
        api.get(`/cases/${params.id}/activity?limit=10`),
      ]);
      
      return { caseData, timeline, evidence, activity };
    };

4. DocketPage initializes the DocketStore (Zustand) with case data
5. Components subscribe to relevant store slices:
   - LeftSidebar → caseData.metadata, caseData.investigator
   - CenterPanel → caseData.criminals[activeIndex], evidence
   - RightSidebar → caseData.criminals[activeIndex].details
   - BottomPanel → tab-specific data

6. WebSocket subscriptions:
   - socket.emit('subscribe', { channels: [`case:${id}`] })
   - Listen for 'case.updated', 'evidence.added', 'alert.new'
   - On event → invalidate relevant TanStack Query or update Zustand store

7. Optimistic UI updates on actions:
   - Link evidence → optimistic add to evidence list → API call → confirm
   - Update status → optimistic UI change → API → rollback on error
```

### Bottom Panel Detail: Evidence Log Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│  <EvidenceLogPanel>                                                       │
│                                                                           │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┐ │
│  │  Type    │  Title   │  Source  │  Date    │  Status  │  Actions      │ │
│  ├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤ │
│  │ 📸       │ Suspect  │ AI       │ 14:31:15 │ Verified │ [View][Hash] │ │
│  │ Snapshot │ Face #1  │ Capture  │          │  ✓       │              │ │
│  ├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤ │
│  │ 🚗       │ Vehicle  │ AI       │ 14:31:20 │ Pending  │ [View][Hash] │ │
│  │ ALPR     │ Plate    │ Capture  │          │  ⏳      │              │ │
│  ├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤ │
│  │ 📹       │ Scene    │ Upload   │ 14:35:00 │ Verified │ [View][Hash] │ │
│  │ Video    │ Footage  │ (Officer)│          │  ✓       │              │ │
│  ├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤ │
│  │ 📄       │ Witness  │ Upload   │ 15:00:00 │ Pending  │ [View]       │ │
│  │ Document │ Statement│ (Officer)│          │  ⏳      │              │ │
│  └──────────┴──────────┴──────────┴──────────┴──────────┴──────────────┘ │
│                                                                           │
│  [+ Add Evidence] [Export Evidence Bundle]                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Bottom Panel Detail: 3D Scene Viewer

```typescript
// SceneViewer3D uses React Three Fiber
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';

const SceneViewer3D: React.FC<{ modelUrl: string }> = ({ modelUrl }) => {
  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden">
      <Canvas shadows camera={{ position: [5, 5, 5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <Suspense fallback={<LoadingSpinner />}>
          <GltfModel url={modelUrl} />
        </Suspense>
        <OrbitControls enableDamping />
        <GridHelper />
        <MeasurementTools />   {/* Custom component for distance/area */}
        <EvidenceMarkers />     {/* Overlay evidence locations */}
        <PathTrace />           {/* Animate suspect movement path */}
      </Canvas>
      
      {/* Overlay controls */}
      <div className="absolute bottom-4 left-4 space-x-2">
        <button className="btn-glass">Measure</button>
        <button className="btn-glass">Annotate</button>
        <button className="btn-glass">Screenshot</button>
      </div>
    </div>
  );
};
```

---

## Shared/Common Components

### Design System Components (shadcn/ui)

| Component | Purpose |
|-----------|---------|
| `<Button />` | Primary, secondary, ghost, destructive variants |
| `<Input />` | Text input with validation states |
| `<Select />` | Dropdown with search |
| `<Dialog />` | Modal dialogs for forms, confirmations |
| `<Sheet />` | Slide-out panels for detail views |
| `<Table />` | Data tables with sorting |
| `<Tabs />` | Tabbed interfaces |
| `<Badge />` | Status, severity, type indicators |
| `<Card />` | Content containers |
| `<Avatar />` | User and profile avatars |
| `<DropdownMenu />` | Context menus |
| `<Toast />` | Success/error notifications |
| `<Progress />` | Progress bars, confidence meters |
| `<Skeleton />` | Loading placeholders |

### Domain-Specific Shared Components

| Component | Props | Description |
|-----------|-------|-------------|
| `<StatusBadge status />` | `Status` enum | Color-coded status indicator for cases/profiles/evidence |
| `<ConfidenceMeter score />` | `number` (0-100) | Visual confidence display with color threshold |
| `<SeverityBadge level />` | `low\|medium\|high\|critical` | Alert severity indicator |
| `<ProfilePhoto url, size />` | `string, number` | Optimized image with fallback and lazy loading |
| `<LocationPin lat, lng />` | `number, number` | Map marker with tooltip |
| `<TimelineEntry event />` | `TimelineEvent` | Standard timeline event display |
| `<ChainOfCustodyEntry entry />` | `CustodyEntry` | Evidence chain display with hash verification status |
| `<AIMatchResult match />` | `AIMatch` | AI comparison result (side-by-side + confidence) |
| `<EvidenceGrid items />` | `Evidence[]` | Grid layout for evidence thumbnails |
| `<SearchInput />` | `onSearch` | Debounced search with autocomplete |
| `<DataTable columns, data />` | `Column[], T[]` | Generic sortable, filterable data table |
| `<FilterBar filters, onChange />` | `Filter[], onChange` | Reusable filter controls |
| `<Pagination cursor, hasMore />` | `CursorPagination` | Cursor-based pagination controls |
| `<EmptyState icon, title, description />` | `string, string, string` | Empty list placeholder |
| `<ErrorState error, retry />` | `Error, () => void` | Error state with retry action |
| `<LoadingState />` | — | Full-page or section loading skeleton |
| `<ConfirmDialog title, message, onConfirm />` | `string, string, () => void` | Destructive action confirmation |

---

## Performance Optimization Strategy

| Technique | Implementation | Impact |
|-----------|---------------|--------|
| **Code Splitting** | React.lazy + Suspense per route | Reduces initial bundle by ~40% |
| **Image Optimization** | CDN with format negotiation (WebP/AVIF), lazy loading | 60-80% bandwidth reduction |
| **Virtual Scrolling** | @tanstack/react-virtual for large lists | Smooth rendering of 10k+ items |
| **Query Caching** | TanStack Query stale-while-revalidate | Instant navigation between visited pages |
| **Debounced Search** | 300ms debounce on search inputs | Reduces API calls by ~90% |
| **Memo & Callback** | React.memo on heavy components, useCallback on handlers | Prevents unnecessary re-renders |
| **Bundle Analysis** | vite-bundle-analyzer in CI | Prevents bundle bloat |
| **WebSocket Throttle** | Batch rapid WebSocket updates (50ms window) | Reduces React renders from alert bursts |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | Software Architect | Initial frontend component architecture |
