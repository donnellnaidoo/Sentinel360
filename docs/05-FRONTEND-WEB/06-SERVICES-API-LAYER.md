# Sentinel360 — Services & API Layer

> **Document Version:** 1.0  
> **Last Updated:** June 2026  
> **Author:** Lead Frontend Developer — Alpha Tech

---

## Table of Contents

1. [API Client Setup](#1-api-client-setup)
2. [Token Refresh Interceptor](#2-token-refresh-interceptor)
3. [WebSocket Client](#3-websocket-client)
4. [API Service Functions](#4-api-service-functions)
5. [TypeScript Types for API Responses](#5-typescript-types-for-api-responses)
6. [Error Handling Strategy](#6-error-handling-strategy)

---

## 1. API Client Setup

### Axios Instance with Interceptors

```tsx
// services/api-client.ts
import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/store/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ─── Response Types ────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>; // Field-level validation errors
  code?: string;
}

// ─── Axios Instance ────────────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor ──────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (process.env.NEXT_PUBLIC_APP_ENV === "development") {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ─────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (process.env.NEXT_PUBLIC_APP_ENV === "development") {
      console.log(`[API] ${response.status} ${response.config.url}`, {
        data: response.data,
      });
    }
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 — token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        useAuthStore.getState().updateTokens({
          accessToken,
          refreshToken: newRefreshToken,
        });

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed — logout
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login?session=expired";
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 — forbidden
    if (error.response?.status === 403) {
      // Could redirect to dashboard or show permission denied
      console.error("[API] Forbidden access:", error.config?.url);
    }

    // Handle 429 — rate limited
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"] || 30;
      console.warn(`[API] Rate limited. Retry after ${retryAfter}s`);
    }

    // Transform error
    const apiError: ApiError = error.response?.data || {
      success: false,
      message: error.message || "An unexpected error occurred",
    };

    return Promise.reject(apiError);
  },
);

export default apiClient;
```

### File Upload Instance

For multipart uploads (evidence, sighting photos, avatar):

```tsx
// services/api-client.ts (continued)
export const uploadClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000, // 2 minutes for large uploads
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

// Same interceptors as apiClient
uploadClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Upload progress event helper
export function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
) {
  return uploadClient.post(url, formData, {
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentage = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        onProgress(percentage);
      }
    },
    signal,
  });
}
```

---

## 2. Token Refresh Interceptor

The token refresh interceptor is embedded in the response interceptor. Here is the detailed flow:

```
1. Request → 401 Unauthorized
2. Check: Is this the first retry? (originalRequest._retry)
   │
   ├── YES:
   │   ├── Mark request as retried (_retry = true)
   │   ├── Get refreshToken from authStore
   │   │   │
   │   │   ├── Has refreshToken? → Continue
   │   │   └── No refreshToken → Logout, redirect to /login
   │   │
   │   ├── POST /auth/refresh { refreshToken }
   │   │   │
   │   │   ├── Success:
   │   │   │   ├── Store new tokens
   │   │   │   ├── Update Authorization header
   │   │   │   └── Retry original request
   │   │   │
   │   │   └── Failure:
   │   │       ├── Logout
   │   │       ├── Clear auth store
   │   │       └── Redirect to /login?session=expired
   │   │
   │   └── Return promise
   │
   └── NO (already retried):
       └── Pass error through (don't retry again to avoid loops)
```

### Queue Strategy for Concurrent 401s

When multiple requests fail with 401 simultaneously, we need to avoid multiple refresh calls:

```tsx
// Enhanced refresh logic with queue
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

// In the response interceptor:
if (error.response?.status === 401 && !originalRequest._retry) {
  if (isRefreshing) {
    // Queue this request until refresh completes
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: (token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        },
        reject,
      });
    });
  }

  originalRequest._retry = true;
  isRefreshing = true;

  try {
    const refreshToken = useAuthStore.getState().refreshToken;
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    useAuthStore.getState().updateTokens({ accessToken, refreshToken: newRefreshToken });

    processQueue(null, accessToken);
    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    return apiClient(originalRequest);
  } catch (err) {
    processQueue(err, null);
    useAuthStore.getState().logout();
    window.location.href = "/login?session=expired";
    return Promise.reject(err);
  } finally {
    isRefreshing = false;
  }
}
```

---

## 3. WebSocket Client

```tsx
// services/websocket.service.ts
import { io, type Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = useAuthStore.getState().accessToken;

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
    });

    this.socket.on("connect", () => {
      console.log("[WS] Connected:", this.socket?.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[WS] Disconnected:", reason);
      if (reason === "io server disconnect") {
        // Server disconnected — attempt reconnect
        this.socket?.connect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("[WS] Connection error:", error.message);
    });

    // Re-attach all registered listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });

    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  emit(event: string, ...args: any[]): void {
    this.socket?.emit(event, ...args);
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const webSocketService = new WebSocketService();
```

### WebSocket Event Map

| Event | Direction | Payload | Description |
|---|---|---|---|
| `alert:new` | Server → Client | `Alert` | New alert generated |
| `docket:update` | Server → Client | `{ docketId: string }` | Docket data changed |
| `wanted:update` | Server → Client | `{}` | Wanted feed changed |
| `sighting:new` | Server → Client | `Sighting` | New sighting submitted |
| `case:update` | Server → Client | `{ caseId: string }` | Case data changed |
| `user:status` | Server → Client | `{ userId: string, status: string }` | User online/offline |
| `evidence:processed` | Server → Client | `{ evidenceId: string }` | AI processing complete |

---

## 4. API Service Functions

### Auth Service

```tsx
// services/auth.service.ts
import apiClient from "./api-client";
import type { ApiResponse } from "./api-client";
import type { User, LoginRequest, RegisterRequest, Tokens } from "@/types/auth";

export const authService = {
  login: async (data: LoginRequest): Promise<ApiResponse<{ user: User; tokens: Tokens }>> => {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<ApiResponse<User>> => {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.post("/auth/logout");
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<Tokens>> => {
    const response = await apiClient.post("/auth/refresh", { refreshToken });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post("/auth/forgot-password", { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post("/auth/reset-password", { token, password });
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get("/auth/profile");
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await apiClient.put("/auth/profile", data);
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<null>> => {
    const response = await apiClient.put("/auth/change-password", data);
    return response.data;
  },
};
```

### Cases Service

```tsx
// services/cases.service.ts
import apiClient from "./api-client";
import type { ApiResponse, PaginationMeta } from "./api-client";
import type { Case, CaseFilters, CaseCreate } from "@/types/case";

export const casesService = {
  list: async (
    filters: CaseFilters,
  ): Promise<ApiResponse<{ items: Case[]; meta: PaginationMeta }>> => {
    const response = await apiClient.get("/cases", { params: filters });
    return response.data;
  },

  getById: async (caseId: string): Promise<ApiResponse<Case>> => {
    const response = await apiClient.get(`/cases/${caseId}`);
    return response.data;
  },

  create: async (data: CaseCreate): Promise<ApiResponse<Case>> => {
    const response = await apiClient.post("/cases", data);
    return response.data;
  },

  update: async (caseId: string, data: Partial<Case>): Promise<ApiResponse<Case>> => {
    const response = await apiClient.put(`/cases/${caseId}`, data);
    return response.data;
  },

  delete: async (caseId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/cases/${caseId}`);
    return response.data;
  },
};
```

### Docket Service

```tsx
// services/docket.service.ts
import apiClient, { uploadWithProgress } from "./api-client";
import type { ApiResponse } from "./api-client";
import type { Docket, InvestigationNote, SuspectStatus } from "@/types/docket";
import type { Evidence } from "@/types/evidence";

export const docketService = {
  getDocket: async (docketId: string): Promise<ApiResponse<Docket>> => {
    const response = await apiClient.get(`/dockets/${docketId}`);
    return response.data;
  },

  updateSuspectStatus: async (
    docketId: string,
    status: SuspectStatus,
  ): Promise<ApiResponse<Docket>> => {
    const response = await apiClient.patch(`/dockets/${docketId}/suspect/status`, { status });
    return response.data;
  },

  addNote: async (
    docketId: string,
    content: string,
  ): Promise<ApiResponse<InvestigationNote>> => {
    const response = await apiClient.post(`/dockets/${docketId}/notes`, { content });
    return response.data;
  },

  uploadEvidence: async (
    docketId: string,
    files: File[],
    onProgress?: (percentage: number) => void,
  ): Promise<ApiResponse<Evidence[]>> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("docketId", docketId);

    const response = await uploadWithProgress(
      `/dockets/${docketId}/evidence`,
      formData,
      onProgress,
    );
    return response.data;
  },

  verifyWitness: async (
    docketId: string,
    statementId: string,
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.post(
      `/dockets/${docketId}/witnesses/${statementId}/verify`,
    );
    return response.data;
  },

  flagWitness: async (
    docketId: string,
    statementId: string,
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.post(
      `/dockets/${docketId}/witnesses/${statementId}/flag`,
    );
    return response.data;
  },
};
```

### Evidence Service

```tsx
// services/evidence.service.ts
import apiClient, { uploadWithProgress } from "./api-client";
import type { ApiResponse, PaginationMeta } from "./api-client";
import type { Evidence, EvidenceFilters } from "@/types/evidence";

export const evidenceService = {
  list: async (
    filters: EvidenceFilters,
  ): Promise<ApiResponse<{ items: Evidence[]; meta: PaginationMeta }>> => {
    const response = await apiClient.get("/evidence", { params: filters });
    return response.data;
  },

  getById: async (evidenceId: string): Promise<ApiResponse<Evidence>> => {
    const response = await apiClient.get(`/evidence/${evidenceId}`);
    return response.data;
  },

  upload: async (
    data: FormData,
    onProgress?: (percentage: number) => void,
  ): Promise<ApiResponse<Evidence>> => {
    const response = await uploadWithProgress("/evidence", data, onProgress);
    return response.data;
  },

  verify: async (
    evidenceId: string,
    verified: boolean,
  ): Promise<ApiResponse<Evidence>> => {
    const response = await apiClient.patch(`/evidence/${evidenceId}/verify`, { verified });
    return response.data;
  },

  delete: async (evidenceId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/evidence/${evidenceId}`);
    return response.data;
  },

  getChainOfCustody: async (evidenceId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/evidence/${evidenceId}/chain-of-custody`);
    return response.data;
  },
};
```

### Suspects Service

```tsx
// services/suspects.service.ts
import apiClient from "./api-client";
import type { ApiResponse, PaginationMeta } from "./api-client";
import type { Suspect, SuspectSearch } from "@/types/suspect";

export const suspectsService = {
  search: async (
    query: SuspectSearch,
  ): Promise<ApiResponse<{ items: Suspect[]; meta: PaginationMeta }>> => {
    const response = await apiClient.get("/suspects", { params: query });
    return response.data;
  },

  getById: async (suspectId: string): Promise<ApiResponse<Suspect>> => {
    const response = await apiClient.get(`/suspects/${suspectId}`);
    return response.data;
  },

  create: async (data: Partial<Suspect>): Promise<ApiResponse<Suspect>> => {
    const response = await apiClient.post("/suspects", data);
    return response.data;
  },

  update: async (
    suspectId: string,
    data: Partial<Suspect>,
  ): Promise<ApiResponse<Suspect>> => {
    const response = await apiClient.put(`/suspects/${suspectId}`, data);
    return response.data;
  },

  delete: async (suspectId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/suspects/${suspectId}`);
    return response.data;
  },

  merge: async (
    primaryId: string,
    duplicateId: string,
  ): Promise<ApiResponse<Suspect>> => {
    const response = await apiClient.post(`/suspects/${primaryId}/merge`, {
      duplicateId,
    });
    return response.data;
  },
};
```

### Sightings Service

```tsx
// services/sightings.service.ts
import apiClient, { uploadWithProgress } from "./api-client";
import type { ApiResponse, PaginationMeta } from "./api-client";
import type { Sighting, SightingFilters, SightingCreate } from "@/types/sighting";

export const sightingsService = {
  list: async (
    filters: SightingFilters,
  ): Promise<ApiResponse<{ items: Sighting[]; meta: PaginationMeta }>> => {
    const response = await apiClient.get("/sightings", { params: filters });
    return response.data;
  },

  getById: async (sightingId: string): Promise<ApiResponse<Sighting>> => {
    const response = await apiClient.get(`/sightings/${sightingId}`);
    return response.data;
  },

  create: async (
    data: SightingCreate,
    onProgress?: (percentage: number) => void,
  ): Promise<ApiResponse<Sighting>> => {
    const formData = new FormData();
    formData.append("suspectName", data.suspectName);
    formData.append("description", data.description);
    formData.append("latitude", String(data.latitude));
    formData.append("longitude", String(data.longitude));
    formData.append("timestamp", data.timestamp);
    if (data.phone) formData.append("phone", data.phone);
    if (data.photo) formData.append("photo", data.photo);

    const response = await uploadWithProgress("/sightings", formData, onProgress);
    return response.data;
  },

  verify: async (
    sightingId: string,
    status: "verified" | "duplicate" | "false",
  ): Promise<ApiResponse<Sighting>> => {
    const response = await apiClient.patch(`/sightings/${sightingId}/verify`, { status });
    return response.data;
  },
};
```

### Alerts Service

```tsx
// services/alerts.service.ts
import apiClient from "./api-client";
import type { ApiResponse, PaginationMeta } from "./api-client";
import type { Alert, AlertFilters, AlertCreate } from "@/types/alert";

export const alertsService = {
  list: async (
    filters: AlertFilters,
  ): Promise<ApiResponse<{ items: Alert[]; meta: PaginationMeta }>> => {
    const response = await apiClient.get("/alerts", { params: filters });
    return response.data;
  },

  getById: async (alertId: string): Promise<ApiResponse<Alert>> => {
    const response = await apiClient.get(`/alerts/${alertId}`);
    return response.data;
  },

  create: async (data: AlertCreate): Promise<ApiResponse<Alert>> => {
    const response = await apiClient.post("/alerts", data);
    return response.data;
  },

  dismiss: async (alertId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.patch(`/alerts/${alertId}/dismiss`);
    return response.data;
  },

  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    const response = await apiClient.get("/alerts/unread/count");
    return response.data;
  },
};
```

### Users Service (Admin)

```tsx
// services/users.service.ts
import apiClient from "./api-client";
import type { ApiResponse, PaginationMeta } from "./api-client";
import type { UserProfile, UserFilters, UserCreate } from "@/types/user";

export const usersService = {
  list: async (
    filters: UserFilters,
  ): Promise<ApiResponse<{ items: UserProfile[]; meta: PaginationMeta }>> => {
    const response = await apiClient.get("/admin/users", { params: filters });
    return response.data;
  },

  getById: async (userId: string): Promise<ApiResponse<UserProfile>> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  create: async (data: UserCreate): Promise<ApiResponse<UserProfile>> => {
    const response = await apiClient.post("/admin/users", data);
    return response.data;
  },

  update: async (
    userId: string,
    data: Partial<UserProfile>,
  ): Promise<ApiResponse<UserProfile>> => {
    const response = await apiClient.put(`/admin/users/${userId}`, data);
    return response.data;
  },

  deactivate: async (userId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.patch(`/admin/users/${userId}/deactivate`);
    return response.data;
  },

  delete: async (userId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  },
};
```

### Audit Service (Super Admin)

```tsx
// services/audit.service.ts
import apiClient from "./api-client";
import type { ApiResponse, PaginationMeta } from "./api-client";
import type { AuditLog, AuditFilters } from "@/types/audit";

export const auditService = {
  list: async (
    filters: AuditFilters,
  ): Promise<ApiResponse<{ items: AuditLog[]; meta: PaginationMeta }>> => {
    const response = await apiClient.get("/admin/audit-logs", { params: filters });
    return response.data;
  },

  export: async (filters: AuditFilters): Promise<Blob> => {
    const response = await apiClient.get("/admin/audit-logs/export", {
      params: filters,
      responseType: "blob",
    });
    return response.data;
  },
};
```

### Wanted Feed Service

```tsx
// services/wanted.service.ts
import apiClient from "./api-client";
import type { ApiResponse, PaginationMeta } from "./api-client";
import type { WantedSuspect, WantedFilters } from "@/types/suspect";

export const wantedService = {
  // Public feed (no auth required — called from server component)
  getPublicFeed: async (
    filters: WantedFilters,
  ): Promise<ApiResponse<{ items: WantedSuspect[]; meta: PaginationMeta }>> => {
    const response = await apiClient.get("/wanted/public", { params: filters });
    return response.data;
  },

  // Authenticated feed (full details)
  getFullFeed: async (
    filters: WantedFilters,
  ): Promise<ApiResponse<{ items: WantedSuspect[]; meta: PaginationMeta }>> => {
    const response = await apiClient.get("/wanted", { params: filters });
    return response.data;
  },
};
```

---

## 5. TypeScript Types for API Responses

```tsx
// types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
  timestamp?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
  statusCode?: number;
}

export type RequestStatus = "idle" | "loading" | "success" | "error";

// types/auth.ts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organization?: string;
  phone?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  organization?: string;
  phone?: string;
  emailVerified: boolean;
  createdAt: string;
  lastLogin: string;
}

export type UserRole = "community" | "security" | "leo" | "admin" | "super_admin";

// types/case.ts
export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  crimeCategory: string;
  crimeType: string;
  status: CaseStatus;
  priority: "critical" | "high" | "medium" | "low";
  leadInvestigator: string;
  leadInvestigatorId: string;
  dateOpened: string;
  dateClosed?: string;
  location: string;
  description: string;
  suspectCount: number;
  evidenceCount: number;
  updatedAt: string;
  createdAt: string;
}

export type CaseStatus =
  | "active"
  | "investigating"
  | "pending_review"
  | "closed"
  | "archived";

export interface CaseFilters {
  search?: string;
  status?: CaseStatus;
  type?: string;
  officerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// types/docket.ts
export interface Docket {
  id: string;
  caseId: string;
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

export interface CaseInfo {
  caseNumber: string;
  crimeCategory: string;
  crimeType: string;
  leadInvestigator: string;
  leadInvestigatorId: string;
  dateOpened: string;
  status: CaseStatus;
  priority: "critical" | "high" | "medium" | "low";
}

export interface InvestigationNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt?: string;
}

export type SuspectStatus =
  | "wanted"
  | "investigating"
  | "arrested"
  | "cleared"
  | "deceased"
  | "under_review";

// types/evidence.ts
export interface Evidence {
  id: string;
  type: "image" | "video" | "document" | "audio" | "other";
  title: string;
  description?: string;
  thumbnailUrl?: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  caseId: string;
  docketId?: string;
  tags: string[];
  confidenceScore?: number;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  isFlagged: boolean;
  chainOfCustody: ChainOfCustodyEntry[];
}

export interface ChainOfCustodyEntry {
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
  hash: string;
}

// types/suspect.ts
export interface Suspect {
  id: string;
  fullName: string;
  idNumber: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  nationality: string;
  address: string;
  phone?: string;
  email?: string;
  aliases: string[];
  distinguishingFeatures: string[];
  photoUrl: string;
  faceData?: FaceDetectionData;
  status: SuspectStatus;
  threatLevel: "critical" | "high" | "medium" | "low";
  confidenceScore: number;
}

// types/alert.ts
export interface Alert {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  message: string;
  type: string;
  targetRegion?: string;
  targetRole?: string[];
  createdBy?: string;
  createdAt: string;
  read: boolean;
  dismissed: boolean;
  metadata?: Record<string, any>;
}

// types/sighting.ts
export interface Sighting {
  id: string;
  suspectName: string;
  description: string;
  photoUrl?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  submittedBy: string;
  submittedAt: string;
  status: "pending" | "verified" | "duplicate" | "false";
  verifiedBy?: string;
  verifiedAt?: string;
  referenceNumber: string;
}
```

---

## 6. Error Handling Strategy

### Layer 1: API Client Interceptor

Catches network errors, 401s, 403s, 429s. Handles token refresh transparently.

### Layer 2: React Query (Global Error Handler)

```tsx
// components/providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global error handler for queries
      throwOnError: false, // Don't throw — use error state instead
    },
    mutations: {
      onError: (error: ApiError) => {
        // Global mutation error handler
        toast.error(error.message || "An unexpected error occurred");
      },
    },
  },
});
```

### Layer 3: Component-Level Error Handling

```tsx
// Pattern 1: Query with error state
function CaseList() {
  const { data, isLoading, error } = useCases();

  if (isLoading) return <SkeletonTable />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  return <DataTable data={data.items} />;
}

// Pattern 2: Mutation with error handling
function CreateCaseForm() {
  const createCase = useCreateCase();

  const onSubmit = async (data: CaseFormData) => {
    try {
      await createCase.mutateAsync(data);
      toast.success("Case created successfully");
      router.push("/cases");
    } catch (error: ApiError) {
      // Field-level errors from API
      if (error.errors) {
        Object.entries(error.errors).forEach(([field, messages]) => {
          setError(field, { message: messages[0] });
        });
      }
    }
  };
}
```

### Layer 4: Error Boundary (Unexpected Errors)

```tsx
// app/error.tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a]">
      <GlassCard className="max-w-md p-8 text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
        <h2 className="mb-2 text-xl font-semibold text-white">
          Something went wrong
        </h2>
        <p className="mb-6 text-slate-400">
          {error.message || "An unexpected error occurred"}
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
```

### Error Types and Responses

| HTTP | Code | Message | Handling |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Validation failed | Show field-level errors |
| 401 | `UNAUTHORIZED` | Invalid or expired token | Token refresh → redirect to login |
| 403 | `FORBIDDEN` | Insufficient permissions | Show "Access Denied", hide UI elements |
| 404 | `NOT_FOUND` | Resource not found | Show "Not Found" with back button |
| 409 | `CONFLICT` | Resource already exists | Show conflict message |
| 422 | `UNPROCESSABLE_ENTITY` | Invalid data format | Show field validation errors |
| 429 | `RATE_LIMITED` | Too many requests | Show retry-after countdown |
| 500 | `SERVER_ERROR` | Internal server error | Show generic error with retry |
| 503 | `SERVICE_UNAVAILABLE` | Service under maintenance | Show maintenance page |

### Toast Notification System

```tsx
// lib/toast.ts — Thin wrapper around sonner
import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string, options?: any) =>
    sonnerToast.success(message, {
      duration: 3000,
      ...options,
    }),
  error: (message: string, options?: any) =>
    sonnerToast.error(message, {
      duration: 5000,
      ...options,
    }),
  warning: (message: string, options?: any) =>
    sonnerToast.warning(message, {
      duration: 4000,
      ...options,
    }),
  info: (message: string, options?: any) =>
    sonnerToast.info(message, {
      duration: 3000,
      ...options,
    }),
};
```

---

> **Next Document:** [07-THEME-STYLING.md](./07-THEME-STYLING.md)
