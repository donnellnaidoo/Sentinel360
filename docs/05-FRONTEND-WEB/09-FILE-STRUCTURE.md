# Sentinel360 — Complete File Structure

> **Document Version:** 1.0  
> **Last Updated:** June 2026  
> **Author:** Lead Frontend Developer — Alpha Tech

---

## Table of Contents

1. [Root Level](#1-root-level)
2. [Source Directory](#2-source-directory-src)
3. [Components Directory](#3-components-directory)
4. [App Directory (Pages)](#4-app-directory-pages)
5. [Supporting Directories](#5-supporting-directories)
6. [Tests Directory](#6-tests-directory)
7. [Project Root Configuration Files](#7-project-root-configuration-files)

---

## 1. Root Level

```
frontend/
├── .github/
│   └── workflows/
│       ├── ci.yml                         # CI pipeline: lint, type-check, test, build
│       ├── cd.yml                         # CD pipeline: deploy to AWS ECS
│       └── chromatic.yml                  # Visual regression testing via Chromatic
│
├── .husky/
│   ├── pre-commit                         # Run lint-staged before each commit
│   ├── commit-msg                         # Validate commit message with commitlint
│   └── _/
│       └── husky.sh                       # Husky internal script
│
├── public/
│   ├── fonts/
│   │   ├── Inter-Variable.woff2           # Inter variable font (all weights)
│   │   ├── JetBrainsMono-Variable.woff2   # JetBrains Mono variable font
│   │   └── Inter-Italic-Variable.woff2    # Inter italic variable font
│   │
│   ├── icons/
│   │   ├── favicon.ico                    # 16×16 favicon
│   │   ├── favicon-16x16.png              # 16×16 PNG favicon
│   │   ├── favicon-32x32.png              # 32×32 PNG favicon
│   │   ├── apple-touch-icon.png           # 180×180 Apple touch icon
│   │   ├── android-chrome-192x192.png     # PWA icon 192px
│   │   ├── android-chrome-512x512.png     # PWA icon 512px
│   │   └── og-image.png                   # Open Graph image (1200×630)
│   │
│   ├── images/
│   │   ├── logo.svg                       # Sentinel360 logo (light)
│   │   ├── logo-dark.svg                  # Sentinel360 logo (dark)
│   │   ├── logo-icon.svg                  # Sentinel360 icon mark
│   │   ├── default-avatar.svg             # Default user avatar placeholder
│   │   ├── default-suspect.svg            # Default suspect photo placeholder
│   │   ├── empty-state.svg                # Empty state illustration
│   │   └── error-state.svg                # Error state illustration
│   │
│   ├── manifest.json                      # PWA manifest (name, icons, theme)
│   ├── sw.js                              # Service worker for offline caching
│   └── robots.txt                         # SEO robot directives
│
├── src/                                   # Main source code
├── tests/                                 # Test files
│
├── .dockerignore                          # Docker ignore rules
├── .env.example                           # Environment variable template
├── .env.local                             # Local environment (gitignored)
├── .eslintrc.json                         # ESLint configuration
├── .gitignore                             # Git ignore rules
├── .lintstagedrc.js                       # Lint-staged configuration
├── .prettierrc                            # Prettier formatting config
├── commitlint.config.js                   # Commitlint rules
├── components.json                        # shadcn/ui component config
├── docker-compose.yml                     # Local development Docker services
├── Dockerfile                             # Production Docker build
├── next.config.js                         # Next.js configuration
├── package.json                           # Dependencies and scripts
├── playwright.config.ts                   # Playwright E2E test config
├── pnpm-lock.yaml                         # pnpm lockfile
├── postcss.config.js                      # PostCSS (Tailwind + autoprefixer)
├── tailwind.config.ts                     # TailwindCSS design tokens
├── tsconfig.json                          # TypeScript configuration
└── vitest.config.ts                       # Vitest unit/integration test config
```

---

## 2. Source Directory (`src/`)

```
src/
├── app/                                   # Next.js App Router pages
├── components/                            # React components
├── hooks/                                 # Custom React hooks
├── lib/                                   # Utility functions and helpers
├── services/                              # API service layer
├── store/                                 # Zustand state stores
├── styles/                                # Global CSS and animations
├── types/                                 # TypeScript type definitions
│
├── middleware.ts                          # Next.js edge middleware (route protection)
└── instrument.ts                          # OpenTelemetry/Sentry instrumentation
```

---

## 3. Components Directory (`src/components/`)

```
src/components/
├── ui/                                    # ATOMS — Smallest UI elements
│   ├── Avatar.tsx                         # User/suspect image with fallback initials
│   ├── Badge.tsx                          # Small count/status badge
│   ├── Button.tsx                         # Button with variants: primary, secondary, ghost, danger
│   ├── Card.tsx                           # Base card container with optional header/footer
│   ├── Dialog.tsx                         # Confirmation dialog (Radix UI)
│   ├── DropdownMenu.tsx                   # Context menu dropdown (Radix UI)
│   ├── GlassCard.tsx                      # ★ Glassmorphism wrapper — variants: default, elevated, subtle
│   ├── IconButton.tsx                     # Circular icon-only button
│   ├── Input.tsx                          # Text input with label, error state, icon slots
│   ├── Label.tsx                          # Form label with optional required indicator
│   ├── Modal.tsx                          # Accessible modal dialog (Radix UI)
│   ├── ProgressBar.tsx                    # Horizontal progress indicator
│   ├── Select.tsx                         # Dropdown select with options
│   ├── Separator.tsx                      # Horizontal or vertical divider (Radix UI)
│   ├── Skeleton.tsx                       # Loading skeleton placeholder
│   ├── Spinner.tsx                        # Loading spinner animation
│   ├── Tabs.tsx                           # Tabbed interface (Radix UI)
│   ├── Textarea.tsx                       # Multi-line text input
│   ├── Toast.tsx                          # Toast notification component
│   ├── Tooltip.tsx                        # Hover tooltip (Radix UI)
│   └── index.ts                           # Barrel export file
│
├── cards/                                 # MOLECULES — Composed UI patterns
│   ├── ActivityLogCard.tsx                # ★ Timeline in card format for sidebar
│   ├── AlertBanner.tsx                    # ★ Dismissable alert with severity color (critical→info)
│   ├── AttachmentCard.tsx                 # File attachment display with download
│   ├── CaseInfoCard.tsx                   # Case metadata: number, category, investigator, date
│   ├── CriminalHistoryCard.tsx            # Prior criminal records list
│   ├── DataTable.tsx                      # ★ Sortable, paginated, selectable table (TanStack Table)
│   ├── EvidenceCard.tsx                   # Evidence thumbnail for grid
│   ├── EvidenceGrid.tsx                   # ★ Grid/list/masonry layout of evidence items
│   ├── EvidenceSummaryCard.tsx            # Evidence counts by type + forensic progress
│   ├── FileUpload.tsx                     # ★ Drag-and-drop upload zone with preview
│   ├── KnownAssociatesCard.tsx            # Associates list with avatars and status
│   ├── LastKnownLocationCard.tsx          # Mini map with location markers
│   ├── MapChart.tsx                       # ★ MapLibre GL map component
│   ├── ProfileAvatar.tsx                  # ★ User avatar with upload, status dot, size variants
│   ├── RiskIndicator.tsx                  # ★ Circular risk gauge with animated ring
│   ├── SearchBar.tsx                      # ★ Search input with filter dropdown and debounce
│   ├── StatusBadge.tsx                    # ★ Status pill: wanted/investigating/arrested/cleared
│   ├── SuspectDetailsCard.tsx             # Personal details: name, ID, age, address, aliases
│   ├── SuspectPortrait.tsx                # ★ Large photo with facial recognition overlay
│   ├── ThreatAssessmentCard.tsx           # ★ Threat meter + risk factors + AI summary
│   ├── Timeline.tsx                       # ★ Vertical activity timeline component
│   ├── WitnessStatementCard.tsx           # Witness statement with verify/flag actions
│   └── index.ts                           # Barrel export file
│
├── charts/                                # Data visualization components
│   ├── ActivityTimeline.tsx               # Activity over time chart
│   ├── CrimeStatsChart.tsx                # Dashboard crime statistics bar/line chart
│   ├── ThreatMeter.tsx                    # Horizontal threat gauge animated fill
│   └── index.ts                           # Barrel export file
│
├── docket/                                # DOCKET-SPECIFIC ORGANISMS
│   ├── DocketBottomPanel.tsx              # Tabbed workspace: notes, evidence, witnesses, attachments
│   ├── DocketCenterPanel.tsx              # Suspect portrait + threat rings + badges + actions
│   ├── DocketLayout.tsx                   # 3-column grid orchestrator with responsive collapse
│   ├── DocketLeftSidebar.tsx              # Case info, criminal history, evidence summary, activity log
│   ├── DocketRightSidebar.tsx             # Suspect details, threat, associates, locations
│   ├── FacialOverlay.tsx                  # SVG wireframe face detection overlay
│   ├── ThreatRings.tsx                    # Animated concentric SVG risk rings
│   └── index.ts                           # Barrel export file
│
├── forms/                                 # Form components
│   ├── CaseFilterForm.tsx                 # Case list filter controls
│   ├── LoginForm.tsx                      # Email + password with validation
│   ├── ProfileForm.tsx                    # Edit profile fields
│   ├── RegisterForm.tsx                   # Registration with role selection
│   ├── SightingForm.tsx                   # Submit sighting: name, description, photo, location
│   └── index.ts                           # Barrel export file
│
├── layout/                                # LAYOUT ORGANISMS
│   ├── Breadcrumbs.tsx                    # Breadcrumb navigation with icons
│   ├── Header.tsx                         # Top navigation bar: search, alerts, profile
│   ├── HeaderDropdown.tsx                 # User menu: profile, settings, logout
│   ├── MobileNav.tsx                      # Mobile bottom navigation bar
│   ├── Sidebar.tsx                        # Main navigation sidebar with role-based items
│   ├── SidebarItem.tsx                    # Sidebar navigation link with icon + badge
│   └── index.ts                           # Barrel export file
│
└── providers/                             # React context providers
    ├── AuthProvider.tsx                    # Auth context — validates token on mount
    ├── QueryProvider.tsx                   # TanStack Query client + devtools
    ├── SocketProvider.tsx                  # WebSocket connection lifecycle
    └── ThemeProvider.tsx                   # Dark/light theme with system preference
```

---

## 4. App Directory (Pages) (`src/app/`)

```
src/app/
├── (auth)/                                # Auth route group — centered card layout
│   ├── forgot-password/
│   │   └── page.tsx                       # Forgot password form page
│   ├── login/
│   │   └── page.tsx                       # Login page with LoginForm
│   ├── register/
│   │   └── page.tsx                       # Registration page with RegisterForm
│   └── layout.tsx                         # AuthLayout — centered glass card
│
├── (dashboard)/                           # Authenticated route group — sidebar + header
│   ├── admin/
│   │   ├── profiles/
│   │   │   └── page.tsx                   # Admin: criminal profile management
│   │   ├── settings/
│   │   │   └── page.tsx                   # Admin: system settings
│   │   └── users/
│   │       └── page.tsx                   # Admin: user management (CRUD)
│   │
│   ├── alerts/
│   │   └── page.tsx                       # Alert management with create (Admin) + list
│   │
│   ├── cases/
│   │   ├── [caseId]/
│   │   │   └── page.tsx                   # Single case detail (tabs: info, evidence, timeline)
│   │   └── page.tsx                       # Case list with filters, search, pagination
│   │
│   ├── dashboard/
│   │   └── page.tsx                       # Main dashboard — stats, charts, recent activity
│   │
│   ├── docket/
│   │   └── [docketId]/
│   │       └── page.tsx                   # ★ CRIME DOCKET — 3-column layout (critical page)
│   │
│   ├── evidence/
│   │   ├── [evidenceId]/
│   │   │   └── page.tsx                   # Evidence detail with full preview + chain of custody
│   │   └── page.tsx                       # Evidence gallery (grid/masonry) with filters
│   │
│   ├── profile/
│   │   └── page.tsx                       # Profile settings: edit, password, notifications
│   │
│   ├── sightings/
│   │   ├── submit/
│   │   │   └── page.tsx                   # Submit a sighting (Community/Security)
│   │   └── page.tsx                       # Sightings list with filters (LEO/Admin)
│   │
│   ├── super-admin/
│   │   ├── audit-logs/
│   │   │   └── page.tsx                   # Immutable audit log viewer + CSV export
│   │   └── users/
│   │       └── page.tsx                   # Super Admin full user control (delete, force deactivate)
│   │
│   ├── wanted-feed/
│   │   └── page.tsx                       # Authenticated wanted feed (full details, filters)
│   │
│   └── layout.tsx                         # DashboardLayout — Sidebar + Header + Breadcrumbs
│
├── (public)/                              # Public route group — no auth required
│   ├── wanted/
│   │   └── page.tsx                       # Public wanted feed (paginated, no auth)
│   └── layout.tsx                         # PublicLayout — minimal header + footer
│
├── error.tsx                              # Global error boundary (client component)
├── globals.css                            # Tailwind directives + base styles
├── layout.tsx                             # RootLayout: fonts, metadata, providers
├── loading.tsx                            # Global loading state (skeleton)
├── not-found.tsx                          # 404 page with navigation options
└── page.tsx                               # Root page — redirects based on auth state
```

---

## 5. Supporting Directories

### Hooks (`src/hooks/`)

```
src/hooks/
├── index.ts                               # Barrel export
├── useAuth.ts                             # Auth state and permission checking
├── useClickOutside.ts                     # Detect clicks outside element (close dropdowns)
├── useDebounce.ts                         # Debounce a value with configurable delay
├── useInfiniteScroll.ts                   # Trigger callback when scrolling near bottom
├── useIntersectionObserver.ts             # Lazy load trigger via IntersectionObserver
├── useLocalStorage.ts                     # Typed localStorage read/write with JSON
├── useMediaQuery.ts                       # Responsive breakpoint matching
├── usePagination.ts                       # Pagination state and page number generation
└── useWebSocket.ts                        # WebSocket connection and event management
```

### Library (`src/lib/`)

```
src/lib/
├── auth.ts                                # Auth helpers: token decode, permission checks, role hierarchy
├── constants.ts                           # App-wide constants: roles, statuses, limits
├── format.ts                              # Formatters: dates (date-fns), file sizes, percentages
├── utils.ts                               # cn() helper (clsx + tailwind-merge), random ID, etc.
└── validators.ts                          # Zod schemas: login, register, sighting, profile, case
```

### Services (`src/services/`)

```
src/services/
├── index.ts                               # Barrel export
├── alerts.service.ts                      # Alert CRUD + unread count
├── api-client.ts                          # Axios instance with auth/refresh/error interceptors
├── audit.service.ts                       # Audit log queries + CSV export (Super Admin)
├── auth.service.ts                        # Login, register, logout, refresh, forgot/reset password
├── cases.service.ts                       # Case CRUD with pagination and filters
├── dashboard.service.ts                   # Dashboard stats and crime statistics
├── docket.service.ts                      # Docket fetch, suspect status, notes, evidence upload
├── evidence.service.ts                    # Evidence CRUD, upload with progress, verify
├── sightings.service.ts                   # Sighting CRUD, submit with photo, verify
├── suspects.service.ts                    # Suspect search, CRUD, merge (Super Admin)
├── users.service.ts                       # User CRUD (Admin/Super Admin)
├── wanted.service.ts                      # Public and authenticated wanted feed
└── websocket.service.ts                   # Socket.IO singleton: connect, disconnect, events
```

### Store (`src/store/`)

```
src/store/
├── index.ts                               # Barrel export
├── alerts-store.ts                        # Real-time alert queue, unread count, connection status
├── auth-store.ts                          # User, tokens, isAuthenticated, login/logout, permissions
├── docket-store.ts                        # Current docket UI state: active tab, upload progress, confirmations
└── ui-store.ts                            # Sidebar state, theme, active modal, toast notifications
```

### Types (`src/types/`)

```
src/types/
├── index.ts                               # Barrel export
├── alert.ts                               # Alert, AlertSeverity, AlertFilters, AlertCreate
├── api.ts                                 # ApiResponse<T>, PaginationMeta, ApiError, RequestStatus
├── audit.ts                               # AuditLog, AuditFilters, AuditAction
├── auth.ts                                # LoginRequest, RegisterRequest, Tokens, User, UserRole
├── case.ts                                # Case, CaseStatus, CaseFilters, CaseCreate, CaseInfo
├── docket.ts                              # Docket, DocketSection, InvestigationNote, SuspectStatus
├── evidence.ts                            # Evidence, EvidenceType, EvidenceFilters, ChainOfCustody
├── sighting.ts                            # Sighting, SightingStatus, SightingFilters, SightingCreate
├── suspect.ts                             # Suspect, WantedSuspect, ThreatLevel, FaceDetectionData, Associate
└── user.ts                                # UserProfile, UserFilters, UserCreate
```

### Styles (`src/styles/`)

```
src/styles/
├── animations.css                         # @keyframes definitions: pulse, shimmer, scan, threat-glow
├── glassmorphism.css                      # Glass utility classes: .glass, .glass-elevated, .glass-shimmer
└── globals.css                            # Tailwind directives (@tailwind base/components/utilities)
```

---

## 6. Tests Directory (`tests/`)

```
tests/
├── setup.ts                               # Vitest setup: jest-dom matchers, mocks (Next.js, ResizeObserver)
│
├── fixtures/                              # Test data fixtures
│   ├── cases.ts                           # Mock case data
│   ├── dockets.ts                         # Mock docket data
│   ├── evidence.ts                        # Mock evidence data
│   ├── suspects.ts                        # Mock suspect data
│   └── users.ts                           # Mock user data
│
├── integration/                           # Integration tests (page-level)
│   └── pages/
│       ├── docket-page.test.tsx           # Docket page: load, display, error states
│       ├── login-page.test.tsx            # Login: valid/invalid credentials, validation
│       └── wanted-feed-page.test.tsx      # Wanted feed: load, filter, paginate
│
├── unit/                                  # Unit and component tests
│   ├── a11y/                              # Accessibility regression tests
│   │   ├── status-badge.a11y.test.tsx     # StatusBadge WCAG compliance
│   │   └── glass-card.a11y.test.tsx       # GlassCard WCAG compliance
│   ├── components/                        # Component tests
│   │   ├── DataTable.test.tsx             # Table: sort, paginate, select
│   │   ├── FileUpload.test.tsx            # Upload: drag, drop, progress
│   │   ├── GlassCard.test.tsx             # Card: variants, shimmer, hover
│   │   ├── SearchBar.test.tsx             # Search: input, debounce, clear
│   │   ├── StatusBadge.test.tsx           # Badge: all statuses, pulse
│   │   └── Timeline.test.tsx              # Timeline: items, variants
│   ├── hooks/                             # Hook tests
│   │   ├── useAuth.test.ts                # Auth: login, logout, permissions
│   │   └── useDebounce.test.ts            # Debounce: timing, cancellation
│   ├── services/                          # Service tests
│   │   ├── auth.service.test.ts           # Auth API calls
│   │   └── cases.service.test.ts          # Cases API calls
│   └── utils/                             # Utility tests
│       ├── format.test.ts                 # Date, file size formatters
│       └── validators.test.ts             # Zod schema validation
│
└── e2e/                                   # End-to-end tests (Playwright)
    ├── admin.spec.ts                      # Admin: user management, profile CRUD
    ├── auth.spec.ts                       # Auth: login, register, logout, protected routes
    ├── docket.spec.ts                     # Docket: 3-column layout, status update, tabs
    ├── sighting.spec.ts                   # Sighting: submit, upload photo, verify
    └── wanted-feed.spec.ts                # Wanted feed: public view, search, pagination
```

---

## 7. Project Root Configuration Files

### `package.json`

```
Root package.json with:
- Scripts: dev, build, start, lint, format, type-check, test, test:run, test:coverage, test:e2e
- Dependencies: Next.js, React, Zustand, TanStack Query, TailwindCSS, Framer Motion, etc.
- DevDependencies: TypeScript, ESLint, Prettier, Vitest, Playwright, Storybook, etc.
```

### `tsconfig.json`

```
- strict mode enabled
- Path alias: @/ → src/
- JSX: react-jsx
- Module: ESNext
- Module resolution: bundler
- Includes: src/, tests/
```

### `next.config.js`

```
- Image domains configuration
- Experimental: optimizePackageImports
- Headers: CSP, CORS
- Redirects: auth-based redirects
- Output: standalone (for Docker)
- Webpack: custom loaders for SVGs
```

### `tailwind.config.ts`

```
- Dark mode: class-based
- Custom colors: navy, accent, status, severity
- Custom fonts: Inter, JetBrains Mono
- Custom animations: pulse, shimmer, scan, glow
- Custom backdrop blur: glass levels
- Custom box shadows: glass, neon variants
- Plugins: tailwindcss-animate
```

### `postcss.config.js`

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### `docker-compose.yml`

```
Services:
- frontend (Next.js on port 3000)
- backend (API on port 8000)
- db (PostgreSQL 16 on port 5432)
```

### `.gitignore`

```
node_modules/
.next/
*.local
.env*.local
coverage/
playwright-report/
storybook-static/
*.tsbuildinfo
```

---

> **End of Documentation Suite** — All 10 documents have been generated for the Sentinel360 Frontend Implementation Plan.
