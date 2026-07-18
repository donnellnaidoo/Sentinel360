# Sentinel360 — Frontend Project Setup

> **Document Version:** 1.0  
> **Last Updated:** June 2026  
> **Author:** Lead Frontend Developer — Alpha Tech  
> **Stack:** Next.js 14+ (App Router) · TypeScript · TailwindCSS · Zustand · React Query

---

## Table of Contents

1. [Technology Stack Rationale](#1-technology-stack-rationale)
2. [Styling Approach](#2-styling-approach)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Package Dependencies](#4-package-dependencies)
5. [Environment Variables](#5-environment-variables)
6. [ESLint & Prettier Configuration](#6-eslint--prettier-configuration)
7. [Husky & Commitlint Setup](#7-husky--commitlint-setup)
8. [Docker Setup for Frontend](#8-docker-setup-for-frontend)
9. [CI/CD Pipeline](#9-cicd-pipeline)

---

## 1. Technology Stack Rationale

| Technology | Version | Justification |
|---|---|---|
| **Next.js 14+** | `14.x` (App Router) | Production-grade React framework with SSR, SSG, ISR. App Router provides nested layouts, React Server Components (RSC), streaming, and edge runtime. Essential for fast page loads on admin dashboards. |
| **TypeScript** | `5.x` | Mandatory for type safety across a large codebase with complex domain models (Cases, Evidence, Suspects, Users). Catches bugs at compile time, improves DX with autocompletion. |
| **TailwindCSS** | `3.4+` | Utility-first CSS that pairs with the glassmorphism/futuristic design system. Enables rapid prototyping, consistent spacing/color tokens, and small production bundles via purging. |
| **Zustand** | `4.x` | Lightweight state management (2.1 KB). Preferred over Redux for lower boilerplate, and over Context for avoiding re-render cascades. Used for auth, UI, and docket state. |
| **TanStack React Query** | `5.x` | Server state management: caching, background refetching, optimistic updates, pagination. Perfect for case lists, evidence galleries, and wanted feed. |
| **React Hook Form** | `7.x` | Performant form library with minimal re-renders. Used for sighting submissions, profile edits, and admin forms. |
| **Zod** | `3.x` | Schema validation for forms and API responses. Composes with React Hook Form for type-safe validation. |
| **Framer Motion** | `11.x` | Declarative animations for glassmorphism effects, page transitions, threat ring animations, and micro-interactions. |
| **Recharts / D3** | `2.x` | Lightweight charting for threat assessment meters, crime statistics dashboards, and timeline visualizations. |
| **MapLibre GL** | `4.x` | Open-source map rendering for last-known-location maps, crime heatmaps, and sighting geo-location. Chosen over Google Maps for offline capabilities and no API key costs. |
| **Axios** | `1.x` | HTTP client with interceptors for token refresh, request/response transforms, and cancellation tokens. |
| **Socket.IO Client** | `4.x` | Real-time WebSocket communication for alerts, live feed updates, and WebSocket-based event streaming. |
| **Vitest + React Testing Library** | `1.x` | Fast, Vite-native test runner with Jest-compatible API. RTL for component testing with accessibility queries. |
| **Playwright** | `1.x` | Cross-browser E2E testing with auto-waiting, trace viewer, and CI integration. |
| **Storybook** | `8.x` | Isolated component development and visual regression testing via Chromatic. |
| **date-fns** | `3.x` | Tree-shakable date utilities for formatting timestamps, case dates, and alert times. |
| **Lucide React** | `0.x` | Consistent, tree-shakable icon library for the intelligence-agency aesthetic. |

### Why Next.js App Router over Vite?

- **Nested Layouts**: DashboardLayout wraps all authenticated pages; AuthLayout for login. App Router handles this natively.
- **React Server Components**: Heavy data fetching (case lists with thousands of records) stays on the server, reducing client JS bundle.
- **Streaming**: Suspense boundaries allow the docket page to stream in the suspect photo while waiting for evidence data.
- **Middleware**: Route protection and role-based redirects at the edge with zero client overhead.
- **Image Optimization**: Built-in `<Image>` component with blur placeholder for suspect photos and evidence images.

---

## 2. Styling Approach

### Primary: TailwindCSS

**Justification:**
- **Design System Consistency**: Tailwind's config-based design tokens (colors, spacing, fonts) ensure the entire palette is centralized in `tailwind.config.ts`.
- **Glassmorphism Utilities**: Custom utilities for `backdrop-filter`, `background opacity`, and `border` gradients can be composed directly in JSX.
- **Performance**: Tailwind purges unused CSS in production, resulting in sub-10 KB CSS bundles.
- **Responsive Design**: Built-in breakpoints (`sm`, `md`, `lg`, `xl`, `2xl`) map directly to the mobile-to-desktop responsive strategy.
- **Team Collaboration**: Utility classes are explicit and do not require context-switching to CSS files.

### Secondary: CSS Modules (for complex animations only)

**Justification:**
- Used sparingly for keyframe animations that are too verbose in Tailwind (e.g., glass shimmer, threat ring rotations, pulse effects).
- Co-located with components in `*.module.css` files.

### Class Variance Authority (CVA)

Used for component variants (e.g., `StatusBadge` with `wanted | investigating | arrested` variants).

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const statusBadge = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm",
  {
    variants: {
      status: {
        wanted: "bg-red-500/20 text-red-400 border border-red-500/30",
        investigating: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        arrested: "bg-green-500/20 text-green-400 border border-green-500/30",
        cleared: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
      },
    },
    defaultVariants: { status: "wanted" },
  }
);
```

### Tailwind Merge & clsx

```tsx
import { cn } from "@/lib/utils"; // clsx + tailwind-merge

<GlassCard className={cn("p-6", isExpanded && "h-auto")} />
```

---

## 3. Project Folder Structure

```
frontend/
├── .github/
│   └── workflows/
│       ├── ci.yml                         # CI pipeline: lint, type-check, test, build
│       ├── cd.yml                         # CD pipeline: deploy to staging/production
│       └── chromatic.yml                  # Visual regression on each PR
│
├── .husky/
│   ├── pre-commit                         # Lint-staged + prettier on staged files
│   └── commit-msg                         # Commitlint check
│
├── public/
│   ├── fonts/                             # Self-hosted Inter, JetBrains Mono
│   ├── icons/                             # SVG icons, favicon, OG images
│   ├── images/                            # Static images (default suspect, logos)
│   ├── manifest.json                      # PWA manifest
│   ├── sw.js                              # Service worker for offline support
│   └── robots.txt                         # SEO indexing rules
│
├── src/
│   ├── app/                               # Next.js App Router pages
│   │   ├── (auth)/                        # Auth route group
│   │   │   ├── login/
│   │   │   │   └── page.tsx               # Login page
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx               # Password reset
│   │   │   └── layout.tsx                 # AuthLayout (centered card)
│   │   │
│   │   ├── (dashboard)/                   # Authenticated route group (admin + super_admin)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx               # Main dashboard (stats, recent cases)
│   │   │   ├── cases/
│   │   │   │   ├── page.tsx               # Case list with filters
│   │   │   │   └── [caseId]/
│   │   │   │       └── page.tsx           # Individual case detail / docket
│   │   │   ├── docket/
│   │   │   │   └── [docketId]/
│   │   │   │       └── page.tsx           # Crime Docket page (critical)
│   │   │   ├── evidence/
│   │   │   │   ├── page.tsx               # Evidence gallery
│   │   │   │   └── [evidenceId]/
│   │   │   │       └── page.tsx           # Evidence detail
│   │   │   ├── sightings/
│   │   │   │   └── page.tsx               # Sighting submissions list
│   │   │   ├── alerts/
│   │   │   │   └── page.tsx               # Alert management
│   │   │   ├── wanted-feed/
│   │   │   │   └── page.tsx               # Wanted feed
│   │   │   ├── admin/
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx           # Admin: user management
│   │   │   │   ├── profiles/
│   │   │   │   │   └── page.tsx           # Admin: criminal profiles
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx           # Admin: system settings
│   │   │   ├── super-admin/
│   │   │   │   ├── audit-logs/
│   │   │   │   │   └── page.tsx           # Super Admin: audit logs
│   │   │   │   └── users/
│   │   │   │       └── page.tsx           # Super Admin: full user control
│   │   │   ├── profile/
│   │   │   │   └── page.tsx               # Profile settings
│   │   │   └── layout.tsx                 # DashboardLayout (sidebar, header)
│   │   │
│   │   ├── loading.tsx                    # Global loading state
│   │   ├── error.tsx                      # Global error boundary
│   │   ├── not-found.tsx                  # 404 page
│   │   ├── layout.tsx                     # RootLayout (fonts, providers, metadata)
│   │   └── page.tsx                       # Landing page (redirects based on auth)
│   │
│   ├── components/
│   │   ├── ui/                            # Atoms — atomic design
│   │   │   ├── Button.tsx                 # Variants: primary, secondary, ghost, danger
│   │   │   ├── Badge.tsx                  # StatusBadge, CountBadge
│   │   │   ├── Input.tsx                  # Text input with validation states
│   │   │   ├── Select.tsx                 # Dropdown select
│   │   │   ├── Textarea.tsx               # Multi-line input
│   │   │   ├── Label.tsx                  # Form label
│   │   │   ├── Avatar.tsx                 # User/suspect avatar with fallback
│   │   │   ├── Spinner.tsx                # Loading spinner
│   │   │   ├── Skeleton.tsx               # Loading skeleton (used heavily)
│   │   │   ├── Modal.tsx                  # Accessible modal dialog
│   │   │   ├── Dialog.tsx                 # Confirmation dialogs
│   │   │   ├── DropdownMenu.tsx           # Context menus
│   │   │   ├── Tooltip.tsx                # Hover tooltips
│   │   │   ├── Toast.tsx                  # Toast notification system
│   │   │   ├── Separator.tsx              # Divider line
│   │   │   ├── ProgressBar.tsx            # Horizontal progress
│   │   │   ├── Tabs.tsx                   # Tabbed interfaces
│   │   │   ├── Card.tsx                   # Base card container
│   │   │   ├── GlassCard.tsx              # Glassmorphism wrapper (★)
│   │   │   ├── IconButton.tsx             # Circular icon button
│   │   │   └── index.ts                  # Barrel export
│   │   │
│   │   ├── cards/                         # Molecules — composed UI patterns
│   │   │   ├── SuspectPortrait.tsx        # Large photo + facial rec overlays (★)
│   │   │   ├── RiskIndicator.tsx          # Circular threat gauge (★)
│   │   │   ├── StatusBadge.tsx            # Wanted/Investigating/Arrested (★)
│   │   │   ├── EvidenceCard.tsx           # Evidence thumbnail card
│   │   │   ├── Timeline.tsx               # Activity log component (★)
│   │   │   ├── EvidenceGrid.tsx           # Grid of evidence cards (★)
│   │   │   ├── CaseInfoCard.tsx           # Case metadata card
│   │   │   ├── SuspectDetailsCard.tsx     # Suspect info card
│   │   │   ├── CriminalHistoryCard.tsx    # Past records card
│   │   │   ├── ThreatAssessmentCard.tsx   # Threat meter card (★)
│   │   │   ├── KnownAssociatesCard.tsx    # Associates list card
│   │   │   ├── LastKnownLocationCard.tsx  # Mini map card (★)
│   │   │   ├── EvidenceSummaryCard.tsx    # Evidence counts summary
│   │   │   ├── ActivityLogCard.tsx        # Timeline in card format
│   │   │   ├── FileUpload.tsx             # Drag-and-drop upload with preview (★)
│   │   │   ├── AlertBanner.tsx            # Dismissable alert with severity (★)
│   │   │   ├── SearchBar.tsx              # Search input with filter dropdown (★)
│   │   │   ├── DataTable.tsx              # Sortable, paginated table (★)
│   │   │   ├── MapChart.tsx               # Map visualization component (★)
│   │   │   ├── ProfileAvatar.tsx          # User avatar with upload (★)
│   │   │   ├── WitnessStatementCard.tsx   # Statement display card
│   │   │   ├── AttachmentCard.tsx         # Document/file attachment card
│   │   │   └── index.ts                  # Barrel export
│   │   │
│   │   ├── docket/                        # Docket-specific components (★)
│   │   │   ├── DocketLayout.tsx           # Three-column layout orchestrator
│   │   │   ├── DocketLeftSidebar.tsx      # Case info, criminal history, evidence
│   │   │   ├── DocketCenterPanel.tsx      # Suspect portrait, risk rings, badges
│   │   │   ├── DocketRightSidebar.tsx     # Suspect details, threat, associates
│   │   │   ├── DocketBottomPanel.tsx      # Notes, uploads, statements
│   │   │   ├── FacialOverlay.tsx          # Wireframe face detection graphics
│   │   │   ├── ThreatRings.tsx            # Animated circular risk indicators
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/                        # Organisms — layout components
│   │   │   ├── Sidebar.tsx                # Main navigation sidebar
│   │   │   ├── SidebarItem.tsx            # Sidebar navigation item
│   │   │   ├── Header.tsx                 # Top navigation bar
│   │   │   ├── MobileNav.tsx              # Mobile bottom navigation
│   │   │   └── index.ts
│   │   │
│   │   ├── forms/                         # Form components
│   │   │   ├── LoginForm.tsx              # Email/password login
│   │   │   ├── ProfileForm.tsx            # Edit profile
│   │   │   ├── CaseFilterForm.tsx         # Filter cases
│   │   │   └── index.ts
│   │   │
│   │   ├── charts/                        # Data visualization
│   │   │   ├── ThreatMeter.tsx            # Horizontal threat gauge
│   │   │   ├── CrimeStatsChart.tsx        # Dashboard crime statistics
│   │   │   ├── ActivityTimeline.tsx       # Activity over time
│   │   │   └── index.ts
│   │   │
│   │   └── providers/                     # React context providers
│   │       ├── AuthProvider.tsx           # Auth context (token, user, permissions)
│   │       ├── ThemeProvider.tsx           # Theme context (dark/light)
│   │       ├── SocketProvider.tsx          # WebSocket connection provider
│   │       └── QueryProvider.tsx           # TanStack Query client provider
│   │
│   ├── hooks/                             # Custom React hooks
│   │   ├── useAuth.ts                     # Auth state + actions
│   │   ├── useDebounce.ts                # Debounced value hook
│   │   ├── useWebSocket.ts               # WebSocket connection hook
│   │   ├── usePagination.ts              # Pagination logic
│   │   ├── useInfiniteScroll.ts          # Infinite scroll trigger
│   │   ├── useMediaQuery.ts              # Responsive breakpoint hook
│   │   ├── useClickOutside.ts            # Close dropdown on outside click
│   │   ├── useIntersectionObserver.ts     # Lazy loading trigger
│   │   ├── useLocalStorage.ts            # Typed localStorage hook
│   │   └── index.ts
│   │
│   ├── lib/                               # Utility functions
│   │   ├── utils.ts                       # cn() helper (clsx + tailwind-merge)
│   │   ├── constants.ts                   # App-wide constants
│   │   ├── format.ts                      # Date, currency, percentage formatters
│   │   ├── validators.ts                  # Zod schemas for forms
│   │   └── auth.ts                        # Auth helpers (token decode, permission check)
│   │
│   ├── services/                          # API service layer
│   │   ├── api-client.ts                  # Axios instance with interceptors
│   │   ├── auth.service.ts               # Login, refresh, logout
│   │   ├── cases.service.ts              # CRUD for cases
│   │   ├── docket.service.ts             # Docket-specific queries
│   │   ├── evidence.service.ts           # Evidence upload, list, detail
│   │   ├── suspects.service.ts           # Suspect profiles
│   │   ├── sightings.service.ts          # Sighting submissions
│   │   ├── alerts.service.ts             # Alert CRUD + WebSocket
│   │   ├── users.service.ts              # User management (admin)
│   │   ├── audit.service.ts              # Audit log queries
│   │   ├── websocket.service.ts          # WebSocket client singleton
│   │   └── index.ts
│   │
│   ├── store/                             # Zustand state stores
│   │   ├── auth-store.ts                  # Auth state (user, token, permissions)
│   │   ├── docket-store.ts               # Current docket state
│   │   ├── ui-store.ts                    # Sidebar open/close, modals, themes
│   │   ├── alerts-store.ts               # Real-time alert queue
│   │   └── index.ts
│   │
│   ├── types/                             # TypeScript type definitions
│   │   ├── api.ts                         # API response wrappers (ApiResponse<T>)
│   │   ├── auth.ts                        # User, LoginRequest, Tokens, Permissions
│   │   ├── case.ts                        # Case, CaseStatus, CaseFilters
│   │   ├── docket.ts                      # Docket, DocketSection
│   │   ├── evidence.ts                    # Evidence, EvidenceType, EvidenceUpload
│   │   ├── suspect.ts                     # Suspect, ThreatLevel, RiskAssessment
│   │   ├── sighting.ts                    # Sighting, SightingStatus
│   │   ├── alert.ts                       # Alert, AlertSeverity, AlertTarget
│   │   ├── audit.ts                       # AuditLog, AuditAction
│   │   └── index.ts
│   │
│   ├── styles/                            # Global styles
│   │   ├── globals.css                    # Tailwind directives, base styles
│   │   ├── glassmorphism.css              # Glassmorphism utility classes
│   │   └── animations.css                 # @keyframes definitions
│   │
│   └── middleware.ts                      # Next.js middleware (route protection)
│
├── tests/
│   ├── unit/                              # Unit tests (Vitest)
│   │   ├── components/                    # Component tests
│   │   ├── hooks/                         # Hook tests
│   │   ├── services/                      # Service tests
│   │   └── utils/                         # Utility tests
│   │
│   ├── integration/                       # Integration tests
│   │   ├── pages/                         # Page-level integration tests
│   │   └── api/                           # API integration tests
│   │
│   ├── e2e/                               # E2E tests (Playwright)
│   │   ├── auth.spec.ts                   # Login / forgot password flows
│   │   ├── docket.spec.ts                 # Docket page interaction
│   │   ├── admin.spec.ts                  # Admin workflows
│   │   └── super-admin.spec.ts            # Super Admin workflows
│   │
│   ├── fixtures/                          # Test data fixtures
│   │   ├── cases.ts
│   │   ├── suspects.ts
│   │   ├── evidence.ts
│   │   └── users.ts
│   │
│   └── setup.ts                           # Vitest setup (mocks, cleanup)
│
├── .env.local                             # Local environment variables
├── .env.example                           # Environment variable template
├── .eslintrc.json                         # ESLint configuration
├── .prettierrc                            # Prettier configuration
├── .lintstagedrc.js                       # Lint-staged configuration
├── commitlint.config.js                   # Commitlint configuration
├── tailwind.config.ts                     # TailwindCSS configuration
├── postcss.config.js                      # PostCSS configuration (Tailwind plugin)
├── next.config.js                         # Next.js configuration
├── tsconfig.json                          # TypeScript configuration
├── vitest.config.ts                       # Vitest configuration
├── playwright.config.ts                   # Playwright configuration
├── Dockerfile                             # Production container
├── docker-compose.yml                     # Local dev services
├── .dockerignore                          # Docker ignore file
├── .gitignore                             # Git ignore file
├── components.json                        # shadcn/ui configuration (if used)
├── package.json                           # Dependencies and scripts
├── pnpm-lock.yaml                         # Lock file (pnpm)
└── README.md                              # Project README
```

---

## 4. Package Dependencies

### `package.json`

```jsonc
{
  "name": "sentinel360-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write 'src/**/*.{ts,tsx,css}'",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.4.0",

    // State Management
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.28.0",

    // Forms & Validation
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",

    // HTTP & Real-time
    "axios": "^1.6.0",
    "socket.io-client": "^4.7.0",

    // UI & Styling
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.350.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-tooltip": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-toast": "^1.1.0",
    "@radix-ui/react-separator": "^1.0.0",
    "@radix-ui/react-progress": "^1.0.0",
    "@radix-ui/react-label": "^2.0.0",

    // Charts & Maps
    "recharts": "^2.12.0",
    "maplibre-gl": "^4.0.0",
    "react-map-gl": "^7.1.0",

    // Utilities
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.0.0",
    "uuid": "^9.0.0",
    "file-saver": "^2.0.0",
    "sonner": "^1.4.0"
  },
  "devDependencies": {
    // TypeScript
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.11.0",
    "@types/uuid": "^9.0.0",
    "@types/file-saver": "^2.0.0",

    // Linting & Formatting
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.0",
    "eslint-plugin-tailwindcss": "^3.14.0",

    // Testing
    "vitest": "^1.4.0",
    "@testing-library/react": "^14.2.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0",
    "jsdom": "^24.0.0",
    "msw": "^2.2.0",
    "@playwright/test": "^1.42.0",

    // Storybook
    "@storybook/react": "^8.0.0",
    "@storybook/nextjs": "^8.0.0",
    "@storybook/addon-essentials": "^8.0.0",
    "@storybook/addon-interactions": "^8.0.0",
    "@storybook/addon-a11y": "^8.0.0",
    "chromatic": "^11.0.0",

    // Git Hooks
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0",
    "@commitlint/cli": "^19.2.0",
    "@commitlint/config-conventional": "^19.1.0",

    // Build Tools
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "tailwindcss-animate": "^1.0.0",
    "tailwindcss-radix": "^2.0.0",

    // Utilities
    "dotenv": "^16.4.0",
    "cross-env": "^7.0.0",
    "concurrently": "^8.2.0"
  }
}
```

### Dependency Rationale

| Dependency | Size | Why Included |
|---|---|---|
| `zustand` | 2.1 KB | Client state; minimal boilerplate vs Redux; no provider wrapping needed |
| `@tanstack/react-query` | 13 KB | Server cache; handles loading/error states; auto-refetch on focus |
| `framer-motion` | 35 KB | Declarative animations for glassmorphism effects, entrance animations |
| `maplibre-gl` | 200 KB | Open-source map renderer; no API key; works offline |
| `recharts` | 100 KB | Lightweight charting built on D3; tree-shakeable |
| `@radix-ui/*` | ~5 KB each | Accessible, unstyled primitives; compose with Tailwind |
| `lucide-react` | ~100 KB (tree-shakeable) | Consistent icon set; 1000+ icons; intelligence-agency aesthetic |
| `sonner` | 3 KB | Toast notifications; lightweight, accessible |
| `msw` | (dev) | Mock service worker for API testing; intercepts at network level |

---

## 5. Environment Variables

### `.env.example`

```bash
# ─── Application ──────────────────────────────────────────
NEXT_PUBLIC_APP_NAME="Sentinel360"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_ENV="development"                    # development | staging | production

# ─── API ──────────────────────────────────────────────────
NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"
NEXT_PUBLIC_WS_URL="ws://localhost:8000/ws"

# ─── Auth ─────────────────────────────────────────────────
NEXT_PUBLIC_AUTH_TOKEN_KEY="sentinel360_access_token"
AUTH_REFRESH_TOKEN_KEY="sentinel360_refresh_token"

# ─── Maps ─────────────────────────────────────────────────
NEXT_PUBLIC_MAP_STYLE_URL="https://api.maptiler.com/maps/dark-matter/style.json"
NEXT_PUBLIC_MAP_API_KEY=""                             # Optional MapTiler/Mapbox key

# ─── File Upload ──────────────────────────────────────────
NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB=50
NEXT_PUBLIC_ALLOWED_FILE_TYPES="image/jpeg,image/png,image/webp,video/mp4,application/pdf"

# ─── Sentry (Error Tracking) ──────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=""
NEXT_PUBLIC_SENTRY_ENVIRONMENT="development"

# ─── Feature Flags ────────────────────────────────────────
NEXT_PUBLIC_ENABLE_3D_RECONSTRUCTION=true
NEXT_PUBLIC_ENABLE_REALTIME_ALERTS=true

# ─── Performance ──────────────────────────────────────────
NEXT_PUBLIC_REACT_QUERY_DEVTOOLS=true

# ─── Analytics ────────────────────────────────────────────
NEXT_PUBLIC_GA_ID=""                                   # Google Analytics ID (optional)
```

---

## 6. ESLint & Prettier Configuration

### `.eslintrc.json`

```jsonc
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:tailwindcss/recommended",
    "prettier"
  ],
  "plugins": ["@typescript-eslint", "tailwindcss"],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "rules": {
    "react/no-unescaped-entities": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "tailwindcss/classnames-order": "warn",
    "tailwindcss/no-custom-classname": "off",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "react/self-closing-comp": "warn",
    "import/order": [
      "warn",
      {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc" }
      }
    ]
  },
  "settings": {
    "tailwindcss": {
      "config": "tailwind.config.ts",
      "callees": ["cn", "cva"]
    }
  }
}
```

### `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

---

## 7. Husky & Commitlint Setup

### Installation

```bash
pnpm dlx husky init
pnpm add -D @commitlint/cli @commitlint/config-conventional lint-staged
```

### `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

### `.husky/commit-msg`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm commitlint --edit "$1"
```

### `.lintstagedrc.js`

```js
module.exports = {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{css,scss,md}": ["prettier --write"],
  "*.{json,yml,yaml}": ["prettier --write"],
};
```

### `commitlint.config.js`

```js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",     // New feature
        "fix",      // Bug fix
        "docs",     // Documentation
        "style",    // Formatting
        "refactor", // Code restructuring
        "perf",     // Performance improvement
        "test",     // Tests
        "build",    // Build/dependencies
        "ci",       // CI/CD
        "chore",    // Maintenance
        "revert",   // Revert previous commit
      ],
    ],
    "scope-case": [2, "always", "kebab-case"],
    "subject-case": [2, "always", "sentence-case"],
  },
};
```

### Commit Message Convention

```
feat(docket): add facial recognition overlay animations
fix(auth): resolve token refresh race condition
perf(evidence): optimize image lazy loading with intersection observer
style(glasscard): refine backdrop-blur and border opacity
```

---

## 8. Docker Setup for Frontend

### `Dockerfile`

```dockerfile
# ─── Stage 1: Dependencies ────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN corepack enable && pnpm build

# ─── Stage 3: Production Runner ──────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### `docker-compose.yml`

```yaml
version: "3.8"

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://backend:8000/api/v1
      - NEXT_PUBLIC_WS_URL=ws://backend:8000/ws
    depends_on:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    image: sentinel360-backend:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/sentinel360
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: sentinel360
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### `.dockerignore`

```
node_modules
.next
.git
*.md
.env.local
.env*.local
coverage
tests
storybook-static
```

---

## 9. CI/CD Pipeline

### `.github/workflows/ci.yml`

```yaml
name: CI — Lint, Type-Check, Test, Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    name: Code Quality Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type Check
        run: pnpm type-check

      - name: Unit & Integration Tests
        run: pnpm test:run --coverage

      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          directory: ./coverage

  e2e:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright Browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Build
        run: pnpm build

      - name: Run E2E Tests
        run: pnpm test:e2e

      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  build:
    name: Production Build
    runs-on: ubuntu-latest
    needs: [quality, e2e]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Upload Build Artifact
        uses: actions/upload-artifact@v4
        with:
          name: next-build
          path: .next/
          retention-days: 3
```

### `.github/workflows/cd.yml`

```yaml
name: CD — Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: af-south-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: sentinel360-frontend
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster sentinel360-cluster \
            --service sentinel360-frontend \
            --force-new-deployment
```

### `.github/workflows/chromatic.yml`

```yaml
name: Chromatic — Visual Regression

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Publish to Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          storybookBuildDir: storybook-static
          exitOnceUploaded: true
```

---

> **Next Document:** [01-COMPONENT-ARCHITECTURE.md](./01-COMPONENT-ARCHITECTURE.md)
