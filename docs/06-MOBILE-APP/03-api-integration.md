# API Integration

This document details how the mobile app communicates with the Sentinel360 backend — from tRPC client setup and authentication to real-time alerts, offline support, and error handling.

---

## tRPC Client Setup

The mobile app uses **tRPC** (`@trpc/client` v11) for fully typed API calls to the Hono.js server. The client is created in `utils/trpc.ts` using `httpBatchLink` for request batching.

### Client Initialisation

```typescript
// utils/trpc.ts
import type { AppRouter } from "@Sentinel360/api/routers/index";
import { env } from "@Sentinel360/env/native";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { Platform } from "react-native";

import { authClient } from "@/lib/auth-client";

export const queryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.EXPO_PUBLIC_SERVER_URL}/trpc`,
      fetch: function (url, options) {
        return fetch(url, {
          ...options,
          credentials: Platform.OS === "web" ? "include" : "omit",
        });
      },
      headers() {
        if (Platform.OS === "web") {
          return {};
        }
        const headers = new Map<string, string>();
        const cookies = authClient.getCookie();
        if (cookies) {
          headers.set("Cookie", cookies);
        }
        return Object.fromEntries(headers);
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
```

### Key Design Decisions

| Decision                    | Rationale                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `httpBatchLink`             | Batches multiple tRPC requests into a single HTTP request within a window. Reduces round-trips significantly on slow mobile networks. |
| `Platform.OS` check         | Web uses `credentials: "include"` (browser handles cookies). Native explicitly forwards the cookie header from SecureStore. |
| `authClient.getCookie()`    | Retrieves the better-auth session cookie from SecureStore storage (set by `@better-auth/expo` plugin). |
| `Map<string, string>`       | Headers are built as a Map then serialised to a plain object for the fetch call.    |
| `createTRPCOptionsProxy`    | Bridges tRPC client with TanStack Query, enabling `trpc.X.useQuery()` style hooks directly. |

### Server-side Compatibility

The server exposes tRPC at `{EXPO_PUBLIC_SERVER_URL}/trpc` using the Hono.js tRPC adapter (`@hono/trpc-server`). The API router is defined in `packages/api/src/routers/index.ts`:

```typescript
// packages/api/src/routers/index.ts
export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    user: ctx.session.user,
  })),
});
```

The router distinguishes between:
- **`publicProcedure`** — No session required (e.g., health check, public wanted feed).
- **`protectedProcedure`** — Requires valid session; throws `TRPCError` (`UNAUTHORIZED`) if missing.

---

## better-auth Integration

The app uses **better-auth** with the `@better-auth/expo` plugin for session management.

### Auth Client Setup

```typescript
// lib/auth-client.ts
import { expoClient } from "@better-auth/expo/client";
import { env } from "@Sentinel360/env/native";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: env.EXPO_PUBLIC_SERVER_URL,
  plugins: [
    expoClient({
      scheme: Constants.expoConfig?.scheme as string,
      storagePrefix: Constants.expoConfig?.scheme as string,
      storage: SecureStore,
    }),
  ],
});
```

### Session Flow

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  Mobile App  │   HTTP    │  Hono Server │          │  SecureStore │
│  (Expo)      │◄────────►│  (better-auth)│          │  (Device)    │
└──────┬───────┘          └──────────────┘          └──────▲───────┘
       │                                                   │
       │  signIn.email()         ┌─────────────────────┐   │
       ├────────────────────────►│ Server validates    │   │
       │◄────────────────────────┤ credentials,        │   │
       │  Set-Cookie: session=…  │ creates session     │   │
       │                         └─────────────────────┘   │
       │                                                    │
       │  expoClient plugin                                 │
       ├────────────────────────────────────────────────────►
       │  Stores session cookie                             │
       │  in SecureStore with scheme prefix                 │
       │                                                    │
       │  getCookie()                                       │
       ├────────────────────────────────────────────────────►
       │◄────────────────────────────────────────────────────
       │  Returns stored session cookie                     │
```

### Session Persistence

| Mechanism            | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| **SecureStore**      | Native keychain/keystore storage for session tokens              |
| **storagePrefix**    | Uses the Expo scheme (`Sentinel360`) as namespace prefix         |
| **Auto-restore**     | `authClient.useSession()` hook reads from SecureStore on mount   |

### Token Refresh

better-auth handles token refresh transparently:

1. When the session cookie expires, better-auth attempts a refresh using the stored refresh token.
2. If refresh succeeds → new cookie is stored in SecureStore.
3. If refresh fails → `authClient.useSession().data` returns `null`, triggering the unauthenticated redirect to `/onboarding`.

### Biometric Authentication

Expo SecureStore supports biometric protection on iOS (Face ID / Touch ID) and Android (BiometricPrompt). Enabling biometric auth for app unlock is planned in Settings:

```typescript
// Planned implementation
import * as LocalAuthentication from "expo-local-authentication";

const isBiometricAvailable = await LocalAuthentication.hasHardwareAsync();
if (isBiometricAvailable) {
  const result = await LocalAuthentication.authenticateAsync();
  if (result.success) {
    // Unlock app / auto-fill credentials
  }
}
```

---

## TanStack Query Usage

TanStack React Query (`@tanstack/react-query`) is the server-state layer, tightly integrated with tRPC via `@trpc/tanstack-react-query`.

### QueryClient Configuration

```typescript
// utils/trpc.ts
export const queryClient = new QueryClient();
```

The `QueryClient` is provided to the app at the root level (`app/_layout.tsx`):

```typescript
<QueryClientProvider client={queryClient}>
  { /* App providers and screens */ }
</QueryClientProvider>
```

### Using tRPC Hooks via TanStack Query

```typescript
// Example: Wanted feed query
const wantedFeed = trpc.wanted.getFeed.useQuery(
  { page: 1, region: "oakwood" },
  {
    staleTime: 30_000,        // 30 seconds before refetch
    gcTime: 5 * 60_000,       // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Disabled for mobile
  },
);

// Example: Sighting submission mutation
const submitSighting = trpc.sighting.submit.useMutation({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["wanted"] });
    toast.show({ variant: "success", label: "Sighting submitted" });
  },
});
```

### Cache Invalidation Strategy

| Event                          | Invalidated Queries                                           |
| ------------------------------ | ------------------------------------------------------------- |
| New sighting submitted         | `["wanted"]`, `["sighting", "myHistory"]`                    |
| Alert acknowledged             | `["alerts"]`, `["alerts", "active"]`                         |
| Wanted person status update    | `["wanted"]`, `["wanted", personId]`                         |
| User preferences updated       | `["user", "preferences"]`                                    |
| Push notification received     | `["alerts"]`, `["notifications"]` (conditional)              |

### Optimistic Updates

For sighting submission (planned):

```typescript
const submitSighting = trpc.sighting.submit.useMutation({
  onMutate: async (newSighting) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ["sighting", "myHistory"] });
    // Snapshot previous state
    const previous = queryClient.getQueryData(["sighting", "myHistory"]);
    // Optimistically add to cache
    queryClient.setQueryData(["sighting", "myHistory"], (old) => [
      { ...newSighting, status: "pending", id: "temp-id" },
      ...(old ?? []),
    ]);
    return { previous };
  },
  onError: (err, newSighting, context) => {
    // Rollback on error
    queryClient.setQueryData(["sighting", "myHistory"], context?.previous);
    toast.show({ variant: "danger", label: "Sighting failed to submit" });
  },
  onSettled: () => {
    // Always refetch
    queryClient.invalidateQueries({ queryKey: ["sighting", "myHistory"] });
  },
});
```

---

## Push Notifications

Push notifications are delivered via **FCM** (Android) and **APNs** (iOS) through Expo's push notification service.

### Registration Flow

```
1. App launches
2. Expo Notifications.getPermissionsAsync()
3. If not granted → requestPermissionsAsync() with rationale
4. Expo Notifications.getExpoPushTokenAsync()
5. Send token to server via tRPC mutation: "user.registerPushToken"
6. Server stores token linked to user account
7. Server sends alerts via Expo Push API
```

### Notification Types

| Type                | Trigger                          | Priority | Payload                                               |
| ------------------- | -------------------------------- | -------- | ----------------------------------------------------- |
| Safety Alert        | Admin / AI threat detection      | High     | `{ type, severity, location, timestamp, alertId }`  |
| Wanted Update       | Status change on wanted person   | Normal   | `{ personId, newStatus, name }`                     |
| Sighting Status     | LE officer reviews your sighting | Normal   | `{ sightingId, status, referenceNumber }`           |
| Community Post      | New verified community update    | Low      | `{ postId, title, area }`                           |

### Deep Linking

Each notification payload includes a `data` object that Expo Router parses for deep linking:

```json
{
  "data": {
    "route": "/(drawer)/(tabs)/alerts",
    "params": { "alertId": "alert_abc123" }
  }
}
```

### Notification Channels (Android)

| Channel ID    | Name              | Importance | Description                     |
| ------------- | ----------------- | ---------- | ------------------------------- |
| `alerts`      | Safety Alerts     | High       | Critical safety alerts          |
| `wanted`      | Wanted Updates    | Default    | Wanted person status changes    |
| `sightings`   | Sighting Status   | Default    | Updates on submitted sightings  |
| `community`   | Community Updates | Low        | Non-urgent community posts      |

---

## Offline Support

The app supports graceful degradation when the network is unavailable.

### AsyncStorage Caching

| Data                  | Cache Strategy             | TTL        |
| --------------------- | -------------------------- | ---------- |
| Wanted feed           | Stale-while-revalidate     | 1 hour     |
| Recent alerts         | Stale-while-revalidate     | 15 minutes |
| User preferences      | Write-through              | Immediate  |
| Sighting drafts       | Local queue until synced   | Persistent |

### TanStack Query Persister (Planned)

```typescript
// Planned: Persist query cache to AsyncStorage
import { AsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const asyncPersister = new AsyncStoragePersister({
  storage: AsyncStorage,
  key: "SENTINEL360_QUERY_CACHE",
});

await persistQueryClient({
  queryClient,
  persister: asyncPersister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});
```

### Offline State Detection

```typescript
// Planned: Network context provider
import { useNetworkState } from "expo-network";

function useOnlineStatus() {
  const networkState = useNetworkState();
  return networkState.isInternetReachable ?? true;
}
```

### Sighting Draft Queue

When offline, sighting submissions are queued locally:

```typescript
// Planned: Offline sighting queue
interface PendingSighting {
  id: string;
  imageUri: string;
  description: string;
  location: { latitude: number; longitude: number };
  createdAt: string;
  retryCount: number;
}
```

1. Sighting saved to AsyncStorage queue on submit attempt.
2. Network listener detects connectivity restoration.
3. Queue processed FIFO with exponential backoff on failure.
4. Successful submissions removed from queue; failures persist for manual retry.

---

## File Uploads

Sighting media (photos, videos) are uploaded to **S3** via **presigned URLs** to avoid proxying large files through the Hono.js server.

### Upload Flow

```
1. User selects photo/video from camera or gallery
2. App compresses image via expo-image-manipulator
3. tRPC mutation: sighting.createPresignedUrl
   Request:  { fileName: "sighting_123.jpg", contentType: "image/jpeg" }
   Response: { uploadUrl: "https://s3.region.amazonaws.com/…", fileKey: "uploads/abc123.jpg" }
4. App PUTs the file directly to the S3 presigned URL
   → XMLHttpRequest with upload progress tracking
5. tRPC mutation: sighting.submit
   Request:  { fileKey, description, location, anonymous }
   Response: { referenceNumber: "S360-20260613-XXXXX" }
6. Toast confirmation with reference number
```

### Implementation Details

| Step                | Technology                        | Notes                                       |
| ------------------- | --------------------------------- | ------------------------------------------- |
| Image picker        | `expo-image-picker`               | Camera + gallery with permission handling   |
| Image compression   | `expo-image-manipulator`          | Resize to max 1920px, JPEG quality 0.8      |
| Upload              | `XMLHttpRequest` (not fetch)      | Allows progress tracking; `fetch` lacks `onprogress` for uploads |
| Progress tracking   | `xhr.upload.onprogress`           | Update UI progress bar                      |
| Presigned URL TTL   | 15 minutes (configured on server) | Must upload within window                   |
| Retry on failure    | 3 attempts with backoff           | Automatic for network errors                |

### Upload Component (Planned)

```typescript
// Planned: Upload progress hook
function useFileUpload() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  const upload = async (presignedUrl: string, fileUri: string) => {
    setStatus("uploading");
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      const percent = Math.round((event.loaded / event.total) * 100);
      setProgress(percent);
    };

    return new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          setStatus("done");
          resolve(true);
        } else {
          setStatus("error");
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () => {
        setStatus("error");
        reject(new Error("Network upload error"));
      };
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", "image/jpeg");
      xhr.send({ uri: fileUri, type: "image/jpeg", name: "upload.jpg" } as any);
    });
  };

  return { upload, progress, status };
}
```

---

## Real-time Alerts

Real-time alert delivery uses a **WebSocket** connection managed by the app for low-latency updates.

### Connection Management

```
1. App authenticates → obtain session cookie
2. Open WebSocket to wss://{server}/ws with session cookie
3. Server authenticates connection via cookie
4. Server pushes alerts matching user's region + radius
5. Client receives alert → update TanStack Query cache + trigger push notification
6. On app background → WebSocket disconnected
7. On app foreground → WebSocket reconnected
```

### WebSocket Client (Planned)

```typescript
// Planned: WebSocket connection manager
import { useRef, useEffect, useCallback } from "react";
import { AppState } from "react-native";

function useAlertWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const cookies = authClient.getCookie();
    ws.current = new WebSocket(`wss://${env.EXPO_PUBLIC_SERVER_URL}/ws`, {
      headers: { Cookie: cookies },
    });

    ws.current.onmessage = (event) => {
      const alert = JSON.parse(event.data);
      // Update query cache
      queryClient.setQueryData(["alerts"], (old) => [alert, ...(old ?? [])]);
      // Trigger in-app banner
    };

    ws.current.onclose = () => {
      reconnectTimeout.current = setTimeout(connect, 5000); // Reconnect after 5s
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") connect();
      if (state === "background") ws.current?.close();
    });
    return () => subscription.remove();
  }, [connect]);

  // Cleanup on unmount
  useEffect(() => () => {
    ws.current?.close();
    clearTimeout(reconnectTimeout.current);
  }, []);
}
```

### Connection States

| State          | Handling                                            |
| -------------- | --------------------------------------------------- |
| **Connected**  | Alerts received in real-time, cache is fresh        |
| **Disconnected** | Fallback to polling every 30 seconds for alerts    |
| **Reconnecting** | Exponential backoff: 1s, 2s, 4s, 8s → max 30s   |
| **Failed**     | Banner: "Live alerts unavailable. Retrying..."       |

---

## Error Handling Strategy

A layered approach ensures errors at every level are handled gracefully.

### Layer 1: tRPC Client

All tRPC calls have built-in error handling via the `onError` callback on mutations and query error states:

```typescript
const query = trpc.someQuery.useQuery(undefined, {
  onError: (error) => {
    if (error.data?.code === "UNAUTHORIZED") {
      // Session expired → redirect to sign-in
      authClient.signOut();
      router.replace("/sign-in");
    }
  },
});
```

### Layer 2: Global Error Boundary

A React error boundary wraps the navigation tree to catch component rendering crashes:

```typescript
// Planned: ErrorBoundary component
function AppErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Something went wrong</Text>
          <Button onPress={() => queryClient.clear()} title="Restart" />
        </View>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Layer 3: Network Error Handling

| Error Scenario                | Detection                          | User Experience                        |
| ----------------------------- | ---------------------------------- | -------------------------------------- |
| No internet connection        | `expo-network` listener            | Offline banner: "You're offline"       |
| Request timeout (>15s)        | tRPC client timeout                | Toast: "Request timed out. Retry?"     |
| Server 5xx                    | tRPC error code `INTERNAL_SERVER_ERROR` | Toast: "Server error. Try again."   |
| Rate limited (429)            | tRPC error code `TOO_MANY_REQUESTS` | Toast: "Too many requests. Slow down." |
| Session expired (401)         | tRPC `UNAUTHORIZED`                | Sign out → redirect to sign-in         |
| Upload failed (network drop)  | XHR error handler                  | Inline error on upload card + retry    |

### Layer 4: Offline Queues (Sightings)

Failed sighting submissions are queued with retry logic:

```typescript
// Planned: Queued submission retry
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // ms

async function processQueue() {
  const queue = await AsyncStorage.getItem("sighting_queue");
  const items = JSON.parse(queue ?? "[]");

  for (const item of items) {
    if (item.retryCount >= MAX_RETRIES) continue;

    try {
      await submitSighting(item);
      // Remove from queue
      await removeFromQueue(item.id);
    } catch {
      item.retryCount += 1;
      await updateQueue(item);
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[item.retryCount - 1]));
    }
  }
}
```

### Error Response Format

The server returns errors in a consistent format that the client can parse:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description must be at least 10 characters",
    "field": "description"
  }
}
```

The tRPC server uses `TRPCError` which serialises to this structure automatically. The client's `getErrorMessage` utility in `components/AuthScreen.tsx` recursively extracts human-readable messages from any error shape.

---

## Environment & Constants

| Variable                  | Type     | Used In                  | Description                |
| ------------------------- | -------- | ------------------------ | -------------------------- |
| `EXPO_PUBLIC_SERVER_URL`  | `z.url()`| tRPC client, auth, WS    | Base URL of Hono.js server |
| `scheme` (app.json)       | string   | better-auth OAuth        | Expo scheme for redirects  |

The `@Sentinel360/env/native` package validates `EXPO_PUBLIC_SERVER_URL` at runtime using `@t3-oss/env-core`, ensuring the app fails early if the environment variable is missing or malformed.
