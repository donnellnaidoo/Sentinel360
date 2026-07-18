# Sentinel360 — State Management Architecture

> **Document Version:** 1.0  
> **Last Updated:** June 2026  
> **Author:** Lead Frontend Developer — Alpha Tech

---

## Table of Contents

1. [State Management Philosophy](#1-state-management-philosophy)
2. [State Categories](#2-state-categories)
3. [Auth State](#3-auth-state)
4. [Case State](#4-case-state)
5. [Docket State](#5-docket-state)
6. [Evidence State](#6-evidence-state)
7. [Alert State (Real-Time)](#7-alert-state-real-time)
8. [UI State](#8-ui-state)
9. [Data Fetching Strategy](#9-data-fetching-strategy)
10. [State Architecture Diagram](#10-state-architecture-diagram)

---

## 1. State Management Philosophy

Sentinel360 uses a **split-state architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     STATE ARCHITECTURE                          │
├───────────────────────┬─────────────────────────────────────────┤
│   CLIENT STATE        │        SERVER STATE                     │
│   (Zustand)           │        (TanStack React Query)           │
├───────────────────────┼─────────────────────────────────────────┤
│ • Auth (user, token)  │ • Cases list & detail                   │
│ • Docket (current)    │ • Docket data (fetched from API)        │
│ • UI (sidebar, modal) │ • Evidence list & detail                │
│ • Alerts (real-time)  │ • Suspects                              │
│                       │ • Sightings                             │
│                       │ • Users                                 │
│                       │ • Audit logs                            │
│                       │ • Wanted feed                           │
├───────────────────────┴─────────────────────────────────────────┤
│   FORM STATE           │   URL STATE                            │
│   (React Hook Form)    │   (Next.js useSearchParams)             │
├───────────────────────┼─────────────────────────────────────────┤
│ • Login/Register      │ • Case list filters                    │
│ • Sighting submission  │ • Pagination page numbers              │
│ • Profile editing      │ • Search queries                       │
│ • Alert creation       │ • Docket active tab                    │
│ • Case creation        │ • Sort order                           │
└───────────────────────┴─────────────────────────────────────────┘
```

### Why Split?

| Concern | Client State (Zustand) | Server State (React Query) |
|---|---|---|
| **Source of truth** | Local user actions | Server database |
| **Staleness** | Instant updates | Configurable stale time |
| **Persistence** | localStorage (optional) | Cache invalidation on mutation |
| **Loading/error** | Manual management | Built-in status tracking |
| **Real-time** | Zustand listeners | WebSocket invalidation |
| **Bundle size** | 2.1 KB | 13 KB |

---

## 2. State Categories

| Category | Storage | Persistence | Description |
|---|---|---|---|
| Auth | Zustand | localStorage (token) | Current user, JWT tokens, permissions |
| Docket | Zustand + React Query | None | Current docket view state |
| UI | Zustand | localStorage (theme) | Sidebar state, active modals, theme |
| Alerts | Zustand | None | Real-time alert queue |
| Cases | React Query | Cache | Case list, filters, pagination |
| Evidence | React Query | Cache | Evidence list, upload progress |
| Suspects | React Query | Cache | Suspect profiles, search results |
| Sightings | React Query | Cache | Sighting submissions |
| Users | React Query | Cache | User management (admin) |
| Audit Logs | React Query | Cache | Audit trail (super admin) |
| Wanted Feed | React Query | Cache | Public + authenticated feed |
| Forms | React Hook Form | None | Form field state and validation |
| URL | useSearchParams | URL | Filters, pagination, tabs |

---

## 3. Auth State

### Store Definition

```tsx
// store/auth-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  // Data
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: User, tokens: TokenPair) => void;
  setUser: (user: User) => void;
  updateTokens: (tokens: TokenPair) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  organization?: string;
  phone?: string;
  createdAt: string;
  lastLogin: string;
}

type UserRole = "community" | "security" | "leo" | "admin" | "super_admin";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        }),

      setUser: (user) => set({ user }),

      updateTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        return checkPermission(user.role, permission);
      },

      hasRole: (role) => {
        const user = get().user;
        if (!user) return false;

        // Hierarchical role check
        const hierarchy: Record<UserRole, number> = {
          community: 0,
          security: 1,
          leo: 2,
          admin: 3,
          super_admin: 4,
        };

        return hierarchy[user.role] >= hierarchy[role];
      },
    }),
    {
      name: "sentinel360-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
```

### Auth Provider

```tsx
// components/providers/AuthProvider.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // On mount, verify token validity
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      // Check if token is expired
      try {
        const payload = JSON.parse(atob(accessToken.split(".")[1]));
        if (payload.exp * 1000 < Date.now()) {
          // Token expired — try refresh
          useAuthStore.getState().logout();
          router.push("/login");
        }
      } catch {
        useAuthStore.getState().logout();
        router.push("/login");
      }
    }
  }, []);

  return <>{children}</>;
}
```

### Auth Flow

```
                    ┌─────────────┐
                    │  /login     │
                    │  form       │
                    └──────┬──────┘
                           │ submit
                           ▼
                    ┌─────────────┐
                    │ POST /auth/ │
                    │ login       │
                    └──────┬──────┘
                           │ { user, tokens }
                           ▼
              ┌─────────────────────────┐
              │ useAuthStore.setAuth()  │
              │ Persist to localStorage │
              └─────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │ Redirect to /dashboard  │
              │ Set axios auth header   │
              └─────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
              API calls      Token expires
                    │             │
                    │             ▼
                    │    ┌─────────────────┐
                    │    │ 401 response     │
                    │    │ Axios interceptor │
                    │    └────────┬────────┘
                    │             │
                    │             ▼
                    │    ┌─────────────────┐
                    │    │ POST /auth/     │
                    │    │ refresh         │
                    │    └────────┬────────┘
                    │             │
                    │             ▼
                    │    ┌─────────────────┐
                    │    │ New tokens      │
                    │    │ Retry request   │
                    │    └─────────────────┘
                    │
                    ▼
              ┌─────────────┐
              │ Logout      │
              │ Clear store │
              │ Redirect    │
              └─────────────┘
```

---

## 4. Case State

Cases are **server state** managed by React Query. Filters are **URL state**.

```tsx
// hooks/useCases.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";

interface CaseFilters {
  search?: string;
  status?: CaseStatus;
  type?: CrimeType;
  officerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Query hook
export function useCases() {
  const searchParams = useSearchParams();

  const filters: CaseFilters = {
    search: searchParams.get("q") || undefined,
    status: searchParams.get("status") as CaseStatus || undefined,
    type: searchParams.get("type") as CrimeType || undefined,
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "25"),
    sortBy: searchParams.get("sortBy") || "updatedAt",
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
  };

  return useQuery({
    queryKey: ["cases", filters],
    queryFn: () => casesService.list(filters),
    placeholderData: keepPreviousData, // Smooth pagination
    staleTime: 30_000, // 30 seconds
  });
}

// Mutation hooks
export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: casesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success("Case created successfully");
    },
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Partial<Case> }) =>
      casesService.update(caseId, data),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      toast.success("Case updated");
    },
  });
}
```

### Cache Invalidation Map

```
Mutation                  → Invalidates
──────────────────────────────────────────────────
createCase()              → ["cases"]
updateCase(id)            → ["cases"], ["case", id]
deleteCase(id)            → ["cases"]
updateSuspectStatus(id,s) → ["cases"], ["case", id], ["docket", id], ["wanted-feed"]
```

---

## 5. Docket State

Docket state is split between **React Query** (server data) and **Zustand** (UI state).

### React Query — Server Data

```tsx
// hooks/useDocket.ts
export function useDocket(docketId: string) {
  return useQuery({
    queryKey: ["docket", docketId],
    queryFn: () => docketService.getDocket(docketId),
    staleTime: 30_000,
    refetchInterval: 60_000, // Auto-refresh for real-time updates
  });
}

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

export function useAddDocketNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ docketId, content }: { docketId: string; content: string }) =>
      docketService.addNote(docketId, content),
    onSuccess: (_, { docketId }) => {
      queryClient.invalidateQueries({ queryKey: ["docket", docketId] });
    },
  });
}

export function useUploadDocketEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ docketId, files }: { docketId: string; files: File[] }) =>
      docketService.uploadEvidence(docketId, files),
    onSuccess: (_, { docketId }) => {
      queryClient.invalidateQueries({ queryKey: ["docket", docketId] });
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
    },
  });
}
```

### Zustand — Client UI State

```tsx
// store/docket-store.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface DocketUIState {
  // Active tab in bottom panel
  activeSection: "notes" | "evidence" | "witnesses" | "attachments";
  // Upload state
  isUploading: boolean;
  uploadProgress: number;
  // Quick action confirmation
  pendingAction: {
    type: "arrest" | "flag" | "status" | null;
    showConfirm: boolean;
  };
  // Expanded/collapsed sidebar sections (mobile)
  expandedSections: Record<string, boolean>;

  // Actions
  setActiveSection: (section: DocketUIState["activeSection"]) => void;
  setUploading: (uploading: boolean, progress?: number) => void;
  setPendingAction: (action: DocketUIState["pendingAction"]) => void;
  toggleSection: (sectionId: string) => void;
  reset: () => void;
}

export const useDocketStore = create<DocketUIState>()(
  devtools(
    (set) => ({
      activeSection: "notes",
      isUploading: false,
      uploadProgress: 0,
      pendingAction: { type: null, showConfirm: false },
      expandedSections: {},

      setActiveSection: (section) => set({ activeSection: section }),
      setUploading: (isUploading, progress) =>
        set({ isUploading, uploadProgress: progress ?? 0 }),
      setPendingAction: (pendingAction) => set({ pendingAction }),
      toggleSection: (sectionId) =>
        set((state) => ({
          expandedSections: {
            ...state.expandedSections,
            [sectionId]: !state.expandedSections[sectionId],
          },
        })),
      reset: () =>
        set({
          activeSection: "notes",
          isUploading: false,
          uploadProgress: 0,
          pendingAction: { type: null, showConfirm: false },
        }),
    }),
    { name: "docket-store" },
  ),
);
```

---

## 6. Evidence State

Evidence is **server state** managed by React Query with optimistic updates for uploads.

```tsx
// hooks/useEvidence.ts
export function useEvidence(filters: EvidenceFilters) {
  return useQuery({
    queryKey: ["evidence", filters],
    queryFn: () => evidenceService.list(filters),
    staleTime: 30_000,
  });
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: evidenceService.upload,
    onMutate: async (newEvidence) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["evidence"] });
      const previous = queryClient.getQueryData(["evidence"]);
      queryClient.setQueryData(["evidence"], (old: any) => ({
        ...old,
        items: [newEvidence, ...(old?.items || [])],
      }));
      return { previous };
    },
    onError: (err, newEvidence, context) => {
      // Rollback on error
      queryClient.setQueryData(["evidence"], context?.previous);
      toast.error("Upload failed. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
    },
  });
}

export function useVerifyEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evidenceId, verified }: { evidenceId: string; verified: boolean }) =>
      evidenceService.verify(evidenceId, verified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      toast.success("Evidence verified");
    },
  });
}
```

---

## 7. Alert State (Real-Time)

Alerts use a hybrid approach: **WebSocket → Zustand** for real-time push, with **React Query** for initial/historical load.

```tsx
// store/alerts-store.ts
import { create } from "zustand";

interface Alert {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  dismissed: boolean;
  data?: Record<string, any>; // Additional payload
}

interface AlertsState {
  queue: Alert[];
  unreadCount: number;
  isConnected: boolean;

  addAlert: (alert: Alert) => void;
  markRead: (alertId: string) => void;
  markAllRead: () => void;
  dismissAlert: (alertId: string) => void;
  clearDismissed: () => void;
  setConnected: (connected: boolean) => void;
}

export const useAlertsStore = create<AlertsState>()((set, get) => ({
  queue: [],
  unreadCount: 0,
  isConnected: false,

  addAlert: (alert) =>
    set((state) => ({
      queue: [alert, ...state.queue].slice(0, 100), // Keep max 100
      unreadCount: state.unreadCount + 1,
    })),

  markRead: (alertId) =>
    set((state) => ({
      queue: state.queue.map((a) =>
        a.id === alertId ? { ...a, read: true } : a,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllRead: () =>
    set((state) => ({
      queue: state.queue.map((a) => ({ ...a, read: true })),
      unreadCount: 0,
    })),

  dismissAlert: (alertId) =>
    set((state) => ({
      queue: state.queue.map((a) =>
        a.id === alertId ? { ...a, dismissed: true } : a,
      ),
    })),

  clearDismissed: () =>
    set((state) => ({
      queue: state.queue.filter((a) => !a.dismissed),
    })),

  setConnected: (isConnected) => set({ isConnected }),
}));
```

### WebSocket Integration

```tsx
// hooks/useWebSocket.ts
export function useWebSocket() {
  const addAlert = useAlertsStore((s) => s.addAlert);
  const setConnected = useAlertsStore((s) => s.setConnected);

  useEffect(() => {
    const ws = webSocketService.connect();

    ws.on("connect", () => setConnected(true));
    ws.on("disconnect", () => setConnected(false));

    ws.on("alert:new", (alert: Alert) => {
      addAlert(alert);
      // Show toast for critical/high alerts
      if (alert.severity === "critical" || alert.severity === "high") {
        toast.error(alert.title, {
          description: alert.message,
          duration: 5000,
        });
      }
    });

    ws.on("docket:update", (data: { docketId: string }) => {
      // Invalidate docket query to refetch
      queryClient.invalidateQueries({ queryKey: ["docket", data.docketId] });
    });

    ws.on("wanted:update", () => {
      queryClient.invalidateQueries({ queryKey: ["wanted-feed"] });
    });

    return () => {
      ws.disconnect();
    };
  }, []);
}
```

---

## 8. UI State

### Store Definition

```tsx
// store/ui-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Theme
  theme: "dark" | "light";

  // Active modals
  activeModal: string | null;
  modalData: Record<string, any> | null;

  // Toast notifications
  toasts: Toast[];

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
  openModal: (modalId: string, data?: Record<string, any>) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  duration?: number;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: "dark",
      activeModal: null,
      modalData: null,
      toasts: [],

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setTheme: (theme) => set({ theme }),

      openModal: (modalId, data) =>
        set({ activeModal: modalId, modalData: data || null }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      addToast: (toast) => {
        const id = crypto.randomUUID();
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        // Auto-remove after duration
        const duration = toast.duration || 4000;
        setTimeout(() => get().removeToast(id), duration);
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: "sentinel360-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    },
  ),
);
```

---

## 9. Data Fetching Strategy

### React Query Configuration

```tsx
// components/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // 30s — data considered fresh
      gcTime: 5 * 60 * 1000,       // 5 min — cache retention
      retry: 2,                     // Retry twice on failure
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: true,   // Refetch when tab refocused
      refetchOnReconnect: true,     // Refetch on network recovery
      placeholderData: keepPreviousData, // Smooth transitions
    },
    mutations: {
      retry: 0,                     // Don't retry mutations
    },
  },
});
```

### Query Key Convention

```
["cases"]                         → Case list (paginated)
["cases", filters]                → Case list with filters
["case", caseId]                  → Single case detail
["docket", docketId]              → Full docket data
["evidence"]                      → Evidence list
["evidence", evidenceId]          → Single evidence
["suspects", searchTerm]          → Suspect search
["sightings", filters]            → Sighting list
["alerts", filters]               → Alert list
["alerts", "unread"]              → Unread alert count
["users", filters]                → User list
["audit", filters]                → Audit log list
["wanted-feed", filters]          → Wanted feed
["dashboard", "stats"]            → Dashboard statistics
["dashboard", "crimeStats"]       → Crime statistics chart data
```

### Prefetching Strategy

```tsx
// Prefetch case list on dashboard hover
const prefetchCases = usePrefetchQuery({
  queryKey: ["cases", { page: 1, limit: 25 }],
  queryFn: () => casesService.list({ page: 1, limit: 25 }),
});

// Prefetch docket on row click
const prefetchDocket = (docketId: string) => {
  queryClient.prefetchQuery({
    queryKey: ["docket", docketId],
    queryFn: () => docketService.getDocket(docketId),
    staleTime: 30_000,
  });
};
```

---

## 10. State Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                             APPLICATION                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      PROVIDERS LAYER                                 │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐ │  │
│  │  │ QueryClient │  │ AuthProvider │  │ Theme    │  │ Socket       │ │  │
│  │  │ Provider    │  │ (Zustand)    │  │ Provider │  │ Provider     │ │  │
│  │  └─────────────┘  └──────────────┘  └──────────┘  └──────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     ZUSTAND STORES (Client State)                     │  │
│  │  ┌───────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐ │  │
│  │  │   auth-store  │ │  ui-store    │ │docket-store│ │ alerts-store │ │  │
│  │  │               │ │              │ │            │ │              │ │  │
│  │  │ • user        │ │ • sidebar    │ │ • activeTab│ │ • queue[]    │ │  │
│  │  │ • tokens      │ │ • modals     │ │ • upload   │ │ • unreadCount│ │  │
│  │  │ • permissions │ │ • theme      │ │ • pending  │ │ • connected  │ │  │
│  │  │ • login/logout│ │ • toasts     │ │ • expanded │ │ • addAlert() │ │  │
│  │  └───────────────┘ └──────────────┘ └────────────┘ └──────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              TANSTACK REACT QUERY (Server State Cache)                │  │
│  │                                                                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │  Cases   │ │  Docket  │ │ Evidence │ │ Suspects │ │ Sightings│  │  │
│  │  │ Cache    │ │  Cache   │ │  Cache   │ │  Cache   │ │  Cache   │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │  Alerts  │ │  Users   │ │  Audit   │ │  Wanted  │ │Dashboard │  │  │
│  │  │  Cache   │ │  Cache   │ │  Cache   │ │  Feed    │ │  Stats   │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                  SERVICE LAYER (API Calls)                            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │ Auth     │ │ Cases    │ │ Docket   │ │ Evidence │ │ Suspects │  │  │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │ Sightings│ │ Alerts   │ │ Users    │ │ Audit    │ │ Wanted   │  │  │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     API CLIENT (Axios)                                │  │
│  │  ┌──────────────────────────────────────────────────────────────┐   │  │
│  │  │  • Base URL configuration                                    │   │  │
│  │  │  • Auth interceptor (attach token)                           │   │  │
│  │  │  • Token refresh interceptor (handle 401)                    │   │  │
│  │  │  • Error transformation                                      │   │  │
│  │  │  • Request/response logging (dev)                            │   │  │
│  │  └──────────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     WEBSOCKET CONNECTION                              │  │
│  │  ┌──────────────────────────────────────────────────────────────┐   │  │
│  │  │  • Socket.IO client                                          │   │  │
│  │  │  • Auto-reconnect with exponential backoff                   │   │  │
│  │  │  • Events: alert:new, docket:update, wanted:update           │   │  │
│  │  │  • Zustand alerts-store integration                          │   │  │
│  │  │  • React Query invalidation bridge                           │   │  │
│  │  └──────────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

> **Next Document:** [06-SERVICES-API-LAYER.md](./06-SERVICES-API-LAYER.md)
