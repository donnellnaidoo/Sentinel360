# Sentinel360 — Route Design & Navigation Architecture

> **Document Version:** 1.0  
> **Last Updated:** June 2026  
> **Author:** Lead Frontend Developer — Alpha Tech

---

## Table of Contents

1. [Route Structure Overview](#1-route-structure-overview)
2. [Public Routes](#2-public-routes)
3. [Auth Routes](#3-auth-routes)
4. [Protected Dashboard Routes](#4-protected-dashboard-routes)
5. [Role-Based Permissions Matrix](#5-role-based-permissions-matrix)
6. [Layout Hierarchy](#6-layout-hierarchy)
7. [Nested Routes for Case Management](#7-nested-routes-for-case-management)
8. [Route Guards & Middleware](#8-route-guards--middleware)

---

## 1. Route Structure Overview

```
/                                    # Root — redirects based on auth state
├── (public)/                        # Public routes — no auth required
│   ├── /login                       # Login page
│   └── /forgot-password             # Password reset request
│
├── (dashboard)/                     # Authenticated routes — auth required
│   ├── /dashboard                   # Main dashboard / home
│   ├── /cases                       # Case list
│   │   └── /cases/[caseId]          # Individual case detail
│   ├── /docket/[docketId]           # ★ Crime docket page (critical)
│   ├── /evidence                    # Evidence gallery
│   │   └── /evidence/[evidenceId]   # Evidence detail
│   ├── /sightings                   # Sighting submissions list
│   ├── /alerts                      # Alerts management
│   ├── /wanted-feed                 # Authenticated wanted feed
│   ├── /admin/users                 # Admin: user management
│   ├── /admin/profiles              # Admin: criminal profiles
│   ├── /admin/settings              # Admin: system settings
│   ├── /super-admin/audit-logs      # Super Admin: audit logs
│   ├── /super-admin/users           # Super Admin: full user control
│   └── /profile                     # Profile settings
```

---

## 2. Public Routes

These routes require **no authentication** and are accessible by anyone.

| Route | Page Component | Description |
|---|---|---|
| `/login` | `LoginPage` | Redirected here if not authenticated |
| `/forgot-password` | `ForgotPasswordPage` | Password reset request form |

### Public Route Guards

- If user is already authenticated and visits `/login`, redirect to `/dashboard`.
- Rate limiting on `/login` (handled by middleware).

> **Note:** The web application is admin-only. Community member features (registration, public wanted feed, sighting submission) are available exclusively through the mobile application (`apps/native`).

---

## 3. Auth Routes

Authentication routes use `AuthLayout` — a minimal, centered card layout.

```tsx
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0a0e1a]">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#00d4ff]/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#00ff88]/10 blur-[120px]" />
      </div>
      {/* Card */}
      <GlassCard variant="elevated" className="w-full max-w-md p-8">
        <Logo className="mb-8" />
        {children}
      </GlassCard>
    </div>
  );
}
```

---

## 4. Protected Dashboard Routes

All routes under `(dashboard)` require authentication. They inherit `DashboardLayout`.

### Route Table

| Route | Page | Required Roles | Description |
|---|---|---|---|---|
| `/dashboard` | `DashboardPage` | ALL | Stats overview, recent cases, alerts |
| `/cases` | `CaseListPage` | Admin, Super Admin | Case list with filters |
| `/cases/[caseId]` | `CaseDetailPage` | Admin, Super Admin | Single case details |
| `/docket/[docketId]` | `DocketPage` ★ | Admin, Super Admin | Full crime docket |
| `/evidence` | `EvidenceGalleryPage` | Admin, Super Admin | Evidence grid |
| `/evidence/[evidenceId]` | `EvidenceDetailPage` | Admin, Super Admin | Single evidence detail |
| `/sightings` | `SightingListPage` | Admin, Super Admin | All sightings |
| `/alerts` | `AlertsPage` | Admin, Super Admin | Alert management |
| `/wanted-feed` | `WantedFeedAuthPage` | Admin, Super Admin | Full wanted feed |
| `/admin/users` | `AdminUsersPage` | Admin, Super Admin | User management |
| `/admin/profiles` | `AdminProfilesPage` | Admin, Super Admin | Criminal profile management |
| `/admin/settings` | `AdminSettingsPage` | Admin, Super Admin | System settings |
| `/super-admin/audit-logs` | `SuperAdminAuditPage` | Super Admin | Audit log viewer |
| `/super-admin/users` | `SuperAdminUsersPage` | Super Admin | Full user control |
| `/profile` | `ProfileSettingsPage` | ALL | User profile settings |

---

## 5. Role-Based Permissions Matrix

| Route | Admin | Super Admin |
|---|---|---|
| `/dashboard` | ✓ | ✓ |
| `/cases` | ✓ | ✓ |
| `/cases/[caseId]` | ✓ | ✓ |
| `/docket/[docketId]` | ✓ | ✓ |
| `/evidence` | ✓ | ✓ |
| `/evidence/[evidenceId]` | ✓ | ✓ |
| `/sightings` (view) | ✓ | ✓ |
| `/alerts` (view) | ✓ | ✓ |
| `/alerts` (create) | ✓ | ✓ |
| `/wanted-feed` | ✓ | ✓ |
| `/admin/users` | ✓ (limited) | ✓ (full) |
| `/admin/profiles` | ✓ | ✓ (delete) |
| `/admin/settings` | ✓ | ✓ |
| `/super-admin/audit-logs` | ✗ | ✓ |
| `/super-admin/users` | ✗ | ✓ |
| `/profile` | ✓ | ✓ |

> **Note:** The web application serves only **Admin** and **Super Admin** roles. All other roles (Community, Security, LEO) use the mobile application (`apps/native`).

### Permission Enforcement Layers

```
Layer 1: Middleware (Edge)
  └── Checks JWT, redirects to /login if invalid
  └── Checks role for protected route group

Layer 2: Layout (Server Component)
  └── DashboardLayout checks user permissions
  └── Renders 403 page if insufficient role

Layer 3: Page (Client Component)
  └── useAuth() hook for fine-grained UI control
  └── Conditionally renders buttons, sections, data
  └── API returns 403 if unauthorized action
```

---

## 6. Layout Hierarchy

```
RootLayout (app/layout.tsx)
  ├── Providers (Query, Auth, Theme, Socket)
  ├── Metadata, Fonts, Global styles
  │
  ├── (auth) AuthLayout (app/(auth)/layout.tsx)
  │   ├── Centered glassmorphism card
  │   └── {children} — Auth forms
  │       ├── /login — LoginPage
  │       └── /forgot-password — ForgotPasswordPage
  │
  ├── (dashboard) DashboardLayout (app/(dashboard)/layout.tsx)
  │   ├── <Sidebar /> — Navigation menu
  │   ├── <Header /> — Global search, alerts, profile
  │   └── <main>{children}</main> — Page content
  │       ├── /dashboard — DashboardPage
  │       ├── /cases — CaseListPage
  │       ├── /docket/[docketId] — DocketPage ★
  │       ├── /evidence — EvidenceGalleryPage
  │       ├── /sightings — SightingListPage
  │       ├── /alerts — AlertsPage
  │       ├── /wanted-feed — WantedFeedAuthPage
  │       ├── /admin/* — (AdminLayout extends DashboardLayout)
  │       └── /super-admin/* — (SuperAdminLayout)
  │
  └── Global error/loading/not-found
      ├── /error — ErrorBoundary
      ├── /loading — Loading skeleton
      └── /not-found — 404 page
```

### DashboardLayout Implementation

```tsx
// app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      {/* Sidebar — hidden on mobile, toggleable */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <Header />
        <Breadcrumbs />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile navigation — visible only on small screens */}
      <MobileNav />
    </div>
  );
}
```

### Sidebar Navigation Items by Role

```
ALL USERS (Admin + Super Admin):
  ├── Dashboard          /dashboard          Icon: LayoutDashboard
  ├── Cases              /cases              Icon: FolderSearch
  ├── Docket             /docket/[id]        Icon: FileBadge
  ├── Evidence           /evidence           Icon: FileSearch
  ├── Sightings          /sightings          Icon: Eye
  ├── Alerts             /alerts             Icon: Bell
  ├── Wanted Feed        /wanted-feed        Icon: Crosshair
  └── Profile            /profile            Icon: UserCircle

ADMIN + SUPER ADMIN only:
  └── Administration     /admin/users        Icon: Shield
      ├── Users          /admin/users
      ├── Profiles       /admin/profiles
      └── Settings       /admin/settings

SUPER ADMIN only:
  └── Super Admin        /super-admin/audit-logs  Icon: ShieldAlert
      ├── Audit Logs     /super-admin/audit-logs
      └── Users          /super-admin/users
```

---

## 7. Nested Routes for Case Management

### Case Routes Structure

```
/cases                              # Case list (paginated, filterable)
  │
  ├── /cases?status=active          # Filtered by status
  ├── /cases?q=search+term          # Search query
  ├── /cases?page=2                 # Pagination
  │
  └── /cases/[caseId]               # Case detail page
        │
        ├── /cases/123              # Basic case info
        ├── /cases/123?tab=evidence # Case with evidence tab active
        └── /cases/123?tab=timeline # Case with timeline tab
```

### Docket Routes Structure

```
/docket/[docketId]                  # ★ Crime Docket (3-column layout)
  │
  ├── /docket/DKT-001              # Full docket view
  ├── /docket/DKT-001?section=notes       # Bottom panel: Notes tab active
  ├── /docket/DKT-001?section=evidence    # Bottom panel: Evidence tab active
  ├── /docket/DKT-001?section=witnesses   # Bottom panel: Witnesses tab active
  └── /docket/DKT-001?section=attachments # Bottom panel: Attachments tab active
```

The docket route uses URL search params to persist the active bottom panel tab state, enabling shareable deep links.

---

## 8. Route Guards & Middleware

### Next.js Middleware (`src/middleware.ts`)

```tsx
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route configuration
const publicRoutes = ["/login", "/forgot-password"];
const authRoutes = ["/login", "/forgot-password"];

// Allowed roles on the admin web app
const allowedRoles = ["admin", "super_admin"];

// Role-based route access
const roleRouteMap: Record<string, string[]> = {
  admin: [
    "/dashboard", "/cases", "/docket", "/evidence",
    "/sightings", "/alerts", "/wanted-feed",
    "/admin", "/profile",
  ],
  super_admin: [
    "/dashboard", "/cases", "/docket", "/evidence",
    "/sightings", "/alerts", "/wanted-feed",
    "/admin", "/super-admin", "/profile",
  ],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("sentinel360_access_token")?.value;

  // 1. Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    if (token && authRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 2. Require authentication for all other routes
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Decode token to check role — admin-only web app
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userRole: string = payload.role;

    if (!allowedRoles.includes(userRole)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    const userRoutes = roleRouteMap[userRole] || [];
    const hasAccess = userRoutes.some((route) => pathname.startsWith(route));
    if (!hasAccess) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (fonts, images, icons)
     */
    "/((?!_next/static|_next/image|favicon.ico|fonts|icons|images|manifest.json|sw.js|robots.txt).*)",
  ],
};
```

### Client-Side Guards (useAuth hook)

For granular UI control within pages:

```tsx
// Example: Conditional rendering based on role
function DocketActions() {
  const { user, hasPermission } = useAuth();

  if (!hasPermission("update:suspectStatus")) {
    return null; // Hide action buttons
  }

  return (
    <div className="flex gap-2">
      <Button onClick={handleArrest}>Mark as Arrested</Button>
      <Button onClick={handleFlag} variant="secondary">Flag Case</Button>
    </div>
  );
}
```

### Permission Definitions

```tsx
// lib/permissions.ts
export const permissions = {
  admin: {
    granted: [
      "user:manage", "profile:manage",
      "alert:create", "alert:send",
      "snapshot:verify", "system:configure",
      "case:view", "case:edit", "docket:view",
      "evidence:viewAll", "evidence:verify",
      "sighting:viewAll", "sighting:verify",
      "wanted:viewFull",
    ],
  },
  super_admin: {
    granted: [
      "user:fullManage", "audit:view",
      "profile:delete", "profile:merge",
      "system:fullConfigure",
      "case:view", "case:edit", "docket:view",
      "evidence:viewAll", "evidence:verify",
      "sighting:viewAll", "sighting:verify",
      "wanted:viewFull",
    ],
    twoFactorRequired: ["profile:delete", "user:deactivate"],
  },
};

export type Permission = keyof typeof permissions[keyof typeof permissions]["granted"];
```

---

> **Next Document:** [03-DOCKET-PAGE-DESIGN.md](./03-DOCKET-PAGE-DESIGN.md)
