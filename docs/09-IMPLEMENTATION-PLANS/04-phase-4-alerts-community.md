# Phase 4: Engagement — Alerts & Community

> **Sentinel360 Implementation Plan — Phase 4**
> **Version:** 1.0 | **Last Updated:** June 2026
> **Estimated Effort:** 4–5 weeks / 160–200 person-hours
> **Dependencies:** Phase 1 (Auth & RBAC), Phase 2 (Profiles & Cases), Phase 3 (Evidence & Sightings)

---

## 1. Objective

Implement the alerting, notification, and community engagement layer of Sentinel360. This phase enables real-time alert generation and delivery across push, in-app, and email channels; community safety features including a public feed and safety map; geofenced alert targeting; and the foundational WebSocket infrastructure for real-time communication. Alerts tie together detections from AI (Phase 5), sightings (Phase 3), and case updates (Phase 2) into actionable notifications for the right recipients.

**Corresponding Requirements:**
- **US-04** — Receive Alerts (Community Member)
- **US-07** — Receive Operational Alerts (Security Company)
- **US-15** — Send Alerts (Admin)
- **§5.1** — Real-Time AI Behaviour Detection (threat triggering, sub-second alerts)
- **§5.5** — Structured Incident Reporting & Metadata Integration

---

## 2. Key Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | **Database — Alerts & Notifications schema** | Alerts, alert_recipients, alert_delivery_logs, notifications, notification_preferences |
| 2 | **Database — Community & Geofence schema** | Community_posts, community_comments, geofences, user_geofence_subscriptions |
| 3 | **Alert service** | Alert creation, targeting (role, region, user group), severity system |
| 4 | **Notification delivery service** | Push notification (FCM/APNS), in-app notification, email notification |
| 5 | **Geofence service** | Create/manage geofenced areas, resolve user-location matches |
| 6 | **WebSocket infrastructure** | Real-time event broadcasting to subscribed clients |
| 7 | **Alert routing engine** | Route alerts to correct recipients based on role, region, and preferences |
| 8 | **Web: Alert history page** | Paginated alert list with filters (type, severity, date) |
| 9 | **Web: Notification center** | In-app notification dropdown/bell icon, read/unread state |
| 10 | **Web: Community feed** | Community posts, comments, safety tips |
| 11 | **Web: Alert creation interface (Admin)** | Create and send targeted alerts |
| 12 | **Web: Geofence management** | Create/manage geofenced areas on map |
| 13 | **Mobile: Push notifications** | Register device token, receive push alerts |
| 14 | **Mobile: Alerts list** | Native alerts list with read/unread, filters |
| 15 | **Mobile: Home map** | Map view with nearby alerts and incidents |
| 16 | **Mobile: Community feed** | Native community feed with posts |

---

## 3. Database Tables

### 3.1 Schema Additions

| Table | Purpose | Dependencies |
|-------|---------|--------------|
| `alerts` | Alert records (all types and severities) | `users`, `cases`, `criminal_profiles` |
| `alert_recipients` | Individual alert delivery targets | `alerts`, `users` |
| `alert_delivery_logs` | Delivery status per channel | `alerts`, `alert_recipients` |
| `notifications` | In-app notification records | `users` |
| `notification_preferences` | Per-user notification channel settings | `users` |
| `geofences` | Named geographic areas for targeting | `users` (created_by) |
| `user_geofence_subscriptions` | User subscriptions to geofenced areas | `geofences`, `users` |
| `community_posts` | Community feed posts | `users` |
| `community_comments` | Comments on community posts | `community_posts`, `users` |
| `device_tokens` | Mobile push notification device tokens | `users` |

### 3.2 Key Tables Detail

#### `alerts`
```sql
CREATE TABLE alerts (
    id                  TEXT PRIMARY KEY,
    alert_type          VARCHAR(50) NOT NULL,    -- wanted_person_sighting, suspicious_behavior, vehicle_match, threat_alert, case_update, system
    severity            VARCHAR(20) NOT NULL,    -- low, medium, high, critical
    title               VARCHAR(300) NOT NULL,
    description         TEXT NOT NULL,
    
    -- Source
    source              VARCHAR(50) NOT NULL,    -- ai_detection, sighting, manual, system
    source_id           TEXT,
    case_id             TEXT REFERENCES cases(id),
    profile_id          TEXT REFERENCES criminal_profiles(id),
    
    -- Targeting
    target_roles        TEXT[],                  -- array of role names
    target_region       GEOGRAPHY(Polygon, 4326),
    target_radius_meters DECIMAL(10,2),
    
    -- Location
    location            GEOGRAPHY(Point, 4326),
    location_address    TEXT,
    
    -- Timing
    expires_at          TIMESTAMPTZ,
    
    -- Audit
    created_by          TEXT REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);
```

#### `alert_recipients`
```sql
CREATE TABLE alert_recipients (
    id              TEXT PRIMARY KEY,
    alert_id        TEXT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    dismissed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alert_id, user_id)
);
```

#### `alert_delivery_logs`
```sql
CREATE TABLE alert_delivery_logs (
    id                  TEXT PRIMARY KEY,
    alert_id            TEXT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    recipient_id        TEXT REFERENCES alert_recipients(id),
    channel             VARCHAR(30) NOT NULL,   -- push_notification, in_app, email, sms
    status              VARCHAR(30) NOT NULL,   -- pending, delivered, failed, bounced
    delivered_at        TIMESTAMPTZ,
    failed_at           TIMESTAMPTZ,
    failure_reason      TEXT,
    retry_count         INTEGER NOT NULL DEFAULT 0,
    provider_message_id VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `geofences`
```sql
CREATE TABLE geofences (
    id              TEXT PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    area            GEOGRAPHY(Polygon, 4326) NOT NULL,
    center_point    GEOGRAPHY(Point, 4326),
    radius_meters   DECIMAL(10,2),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      TEXT REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
```

#### `notifications`
```sql
CREATE TABLE notifications (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,   -- alert, sighting_update, case_update, system, comment
    title           VARCHAR(300) NOT NULL,
    body            TEXT,
    data            JSONB,                   -- additional payload for deep linking
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.3 Prisma Schema Updates

Add to `packages/db/prisma/schema.prisma`:
- `Alert`, `AlertRecipient`, `AlertDeliveryLog`
- `Notification`, `NotificationPreference`
- `Geofence`, `UserGeofenceSubscription`
- `CommunityPost`, `CommunityComment`
- `DeviceToken`

---

## 4. API Endpoints

### 4.1 Alert Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/alerts` | List alerts (paginated, filterable by type/severity/date) | All authenticated |
| `GET`    | `/api/v1/alerts/{id}` | Get alert details | All authenticated |
| `POST`   | `/api/v1/alerts` | Create manual alert | admin, super_admin |
| `PATCH`  | `/api/v1/alerts/{id}` | Update alert | admin, super_admin |
| `DELETE` | `/api/v1/alerts/{id}` | Soft-delete alert | super_admin |
| `PATCH`  | `/api/v1/alerts/{id}/read` | Mark alert as read | All authenticated (own) |
| `POST`   | `/api/v1/alerts/{id}/acknowledge` | Acknowledge alert (for security/LEO responders) | security, law_enforcement |
| `POST`   | `/api/v1/alerts/{id}/dismiss` | Dismiss alert | All authenticated (own) |
| `GET`    | `/api/v1/alerts/unread-count` | Get unread alert count | All authenticated |

### 4.2 Notification Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/notifications` | List notifications (paginated) | All authenticated |
| `GET`    | `/api/v1/notifications/unread-count` | Get unread notification count | All authenticated |
| `PATCH`  | `/api/v1/notifications/{id}/read` | Mark notification as read | All authenticated (own) |
| `POST`   | `/api/v1/notifications/read-all` | Mark all as read | All authenticated |
| `GET`    | `/api/v1/notifications/preferences` | Get notification preferences | All authenticated |
| `PATCH`  | `/api/v1/notifications/preferences` | Update notification preferences | All authenticated |

### 4.3 Geofence Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/geofences` | List active geofences | admin, super_admin |
| `POST`   | `/api/v1/geofences` | Create geofence (GeoJSON polygon) | admin, super_admin |
| `GET`    | `/api/v1/geofences/{id}` | Get geofence details | admin, super_admin |
| `PATCH`  | `/api/v1/geofences/{id}` | Update geofence | admin, super_admin |
| `DELETE` | `/api/v1/geofences/{id}` | Deactivate geofence | super_admin |
| `POST`   | `/api/v1/geofences/{id}/subscribe` | Subscribe to geofence alerts | All authenticated |
| `DELETE` | `/api/v1/geofences/{id}/subscribe` | Unsubscribe from geofence | All authenticated |
| `GET`    | `/api/v1/geofences/nearby` | Get geofences near location | All authenticated |

### 4.4 Community Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET`    | `/api/v1/community/posts` | List community posts (paginated) | All authenticated |
| `POST`   | `/api/v1/community/posts` | Create community post | All authenticated |
| `GET`    | `/api/v1/community/posts/{id}` | Get post with comments | All authenticated |
| `PATCH`  | `/api/v1/community/posts/{id}` | Update own post | All authenticated (own) |
| `DELETE` | `/api/v1/community/posts/{id}` | Delete own post | All authenticated (own), admin+ |
| `POST`   | `/api/v1/community/posts/{id}/comments` | Add comment | All authenticated |

### 4.5 Device Token Endpoints

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `POST`   | `/api/v1/devices/register` | Register device push token | All authenticated |
| `PATCH`  | `/api/v1/devices/{id}` | Update device token | All authenticated (own) |
| `DELETE` | `/api/v1/devices/{id}` | Unregister device | All authenticated (own) |

### 4.6 WebSocket

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WebSocket | `wss://api.sentinel360.io/ws?token=<access_token>` | Real-time event connection |
| Socket.IO | `https://api.sentinel360.io/socket.io/` | Web fallback with auto-reconnect |

**Events:**
| Event | Direction | Payload |
|-------|-----------|---------|
| `alert.new` | Server → Client | Full alert object |
| `alert.updated` | Server → Client | `{id, status}` |
| `notification.new` | Server → Client | Notification object |
| `sighting.match` | Server → Client | `{sightingId, profileId, confidence}` |
| `case.updated` | Server → Client | `{caseId, changes}` |
| `heartbeat` | Bidirectional | `{timestamp}` (30s interval) |

---

## 5. Frontend Components (Web — Next.js)

### 5.1 Route Structure

| Route | Component | Description | Auth |
|-------|-----------|-------------|------|
| `/alerts` | `AlertListPage` | Paginated alert history with filters | Auth |
| `/alerts/{id}` | `AlertDetailPage` | Alert detail with map, source info | Auth |
| `/admin/alerts/new` | `AlertCreatePage` | Create and send targeted alert | admin+ |
| `/admin/geofences` | `GeofenceManagementPage` | Geofence list, create, edit on map | admin+ |
| `/notifications` | `NotificationCenterPage` | Full notification history | Auth |
| `/community` | `CommunityFeedPage` | Community posts feed | Auth |
| `/community/post/{id}` | `CommunityPostDetailPage` | Post with comments | Auth |

### 5.2 Key Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `AlertTable` | Filterable, sortable alert list | AlertListPage |
| `AlertCard` | Alert summary card (type icon, severity colour, title) | AlertTable, Mobile |
| `AlertDetail` | Full alert with location map, source, recipients | AlertDetailPage |
| `AlertSeverityBadge` | Coloured severity indicator | Multiple |
| `AlertTypeIcon` | Type-specific icon | Multiple |
| `AlertCreateForm` | Multi-step alert creation (targeting, content, schedule) | AlertCreatePage |
| `RecipientTargetSelector` | Role/region/user-group targeting UI | AlertCreateForm |
| `GeofenceMap` | Interactive map for drawing/editing geofences | GeofenceManagementPage |
| `GeofenceList` | Table of geofences with status toggle | GeofenceManagementPage |
| `NotificationBell` | Header icon with unread count badge | Global header |
| `NotificationDropdown` | Recent notifications dropdown | Global header |
| `NotificationList` | Full notification list with read/unread state | NotificationCenterPage |
| `NotificationCard` | Individual notification item | NotificationDropdown, NotificationList |
| `CommunityPostCard` | Post summary with author, date, comment count | CommunityFeedPage |
| `CommunityPostDetail` | Full post with comments, like/reply | CommunityPostDetailPage |
| `CommentThread` | Nested comment display | CommunityPostDetailPage |
| `CommentForm` | Add comment text area | CommunityPostDetailPage |
| `AlertMap` | Map showing alert location and radius | AlertDetailPage |

### 5.3 Global Notification Center

The notification bell is a persistent UI element in the app header:

```
+--------------------------------------------------+
|  🔔 Notifications  (3 unread)     [See all]      |
+--------------------------------------------------+
| ● New alert: Wanted person sighted in your area   |
|   Green Point, Cape Town · 2 min ago              |
+--------------------------------------------------+
| ● Sighting #ST-2026-00153 has been verified       |
|   · 15 min ago                                    |
+--------------------------------------------------+
| ○ Case S360-2026-0042 status changed              |
|   to "Under Investigation" · 1 hour ago           |
+--------------------------------------------------+
| [View all notifications →]                        |
+--------------------------------------------------+
```

---

## 6. Mobile Screens (Expo)

### 6.1 Screen Structure

| Screen | Route | Description | Auth |
|--------|-------|-------------|------|
| `AlertListScreen` | `/alerts` | Native alerts list with filters | Auth |
| `AlertDetailScreen` | `/alerts/{id}` | Alert detail with navigation | Auth |
| `AlertMapScreen` | `/alerts/map` | Map view of alerts near user | Auth |
| `NotificationScreen` | `/notifications` | Full notification center | Auth |
| `CommunityFeedScreen` | `/community` | Community posts feed | Auth |
| `CommunityPostScreen` | `/community/{id}` | Post with comments | Auth |

### 6.2 Key Mobile Components

| Component | Description |
|-----------|-------------|
| `AlertListItem` | Swipeable alert item (read/unread, severity) |
| `AlertMapView` | Map with alert pins, clustering |
| `NotificationListItem` | Notification item with deep-link tap |
| `CommunityPostListItem` | Post summary card |
| `CommentListItem` | Comment with author, timestamp |
| `PushTokenRegister` | Background component for FCM/APNS token management |
| `NotificationHandler` | Foreground/background notification handler |

### 6.3 Push Notification Flow

```
1. App launches → Register device token via Expo Notifications
2. POST /api/v1/devices/register { token, platform, deviceId }
3. Server sends push via Firebase Cloud Messaging (Android) / APNS (iOS)
4. App receives push in foreground → show in-app banner
5. App receives push in background → system notification tray
6. User taps notification → deep link to relevant screen
7. Token refreshed → POST /api/v1/devices/update
8. User logs out/uninstalls → DELETE /api/v1/devices/{id}
```

---

## 7. Testing Focus

### 7.1 Unit Tests

| Area | Tests | Coverage |
|------|-------|----------|
| **Alert service** | Create, target resolution, severity sorting, expiry | 90%+ |
| **Notification delivery** | Channel selection, FCM/APNS send, retry logic | 90%+ |
| **Geofence service** | Point-in-polygon resolution, radius calculation | 95%+ |
| **Alert routing engine** | Role-based targeting, region-based targeting, preference overrides | 95%+ |
| **WebSocket manager** | Connection lifecycle, channel subscription, heartbeat | 90%+ |
| **Device token management** | Register, update, unregister | 100% |

### 7.2 Integration Tests

| Test | Description |
|------|-------------|
| Alert creation → routing | Create alert for region, verify recipients resolved correctly |
| Alert → notification delivery | Alert created → notification appears in recipients' notification list |
| Push notification send | Register device token, send push, verify delivery log |
| Geofence point-in-polygon | Create geofence, query with location, verify match |
| WebSocket subscription | Connect, subscribe to channel, receive broadcast event |
| WebSocket reconnection | Simulate disconnect, verify reconnect with backoff |
| Alert read/acknowledge flow | Mark read, acknowledge, verify status changes |
| Community post + comment | Create post, add comment, verify thread |

### 7.3 E2E Tests (Playwright)

| Test | Description |
|------|-------------|
| `alert-history.spec.ts` | View alert list, filter by severity and type |
| `alert-create.spec.ts` | Admin creates targeted alert, verifies delivery |
| `notification-center.spec.ts` | View notifications, mark as read, mark all read |
| `alert-detail.spec.ts` | View alert detail with map |
| `geofence-crud.spec.ts` | Create, edit, delete geofence on map |
| `community-feed.spec.ts` | View community feed, create post, add comment |
| `alert-acknowledge.spec.ts` | Security operator acknowledges alert |

### 7.4 E2E Tests (Detox — Mobile)

| Test | Description |
|------|-------------|
| `alert-list.spec.ts` | View alerts, filter, tap to detail |
| `push-notification.spec.ts` | Receive push, verify banner, tap to navigate |
| `community-feed.spec.ts` | View feed, create post |

---

## 8. Estimated Effort Breakdown

| Task | Hours | Assigned To |
|------|-------|-------------|
| **Database — Alerts & Notifications schema** | 8 | Backend Dev |
| **Database — Community & Geofence schema** | 6 | Backend Dev |
| **Alert service** (CRUD, targeting, severity, expiry) | 16 | Full Stack Dev |
| **Alert routing engine** (role/region/preference resolver) | 12 | Backend Dev |
| **Notification delivery service** (push, in-app, email) | 20 | Full Stack Dev |
| **Geofence service** (create, query, point-in-polygon) | 10 | Backend Dev |
| **WebSocket server** (connection, channels, broadcasting) | 16 | Backend Dev |
| **Device token management** | 6 | Full Stack Dev |
| **Web: Alert history + detail pages** | 14 | Frontend Dev |
| **Web: Alert create page (Admin)** | 10 | Frontend Dev |
| **Web: Notification center + bell** | 12 | Frontend Dev |
| **Web: Geofence management page** | 10 | Frontend Dev |
| **Web: Community feed** | 12 | Frontend Dev |
| **Mobile: Alert list + detail screens** | 14 | Frontend Dev |
| **Mobile: Alert map screen** | 10 | Frontend Dev |
| **Mobile: Push notification registration + handling** | 12 | Frontend Dev |
| **Mobile: Notification screen** | 8 | Frontend Dev |
| **Mobile: Community feed** | 10 | Frontend Dev |
| **Tests** (unit, integration, E2E) | 20 | All |
| **Documentation** | 4 | PM / BA |
| **Total** | **230** | |

---

## 9. Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Push notification certificate management | Delayed mobile notifications | Use Expo push service as intermediate; configure FCM/APNS early |
| WebSocket scaling across multiple server instances | Missed real-time events | Redis Pub/Sub for cross-instance event broadcasting |
| Alert flood during high-incident periods | User notification fatigue | Rate-limit alerts per user (max 5/hour); aggregate similar alerts |
| Geofence query performance with many polygons | Slow alert routing | Index geofences with GIST spatial index; cache resolved user-geofence matches |
| Expo push token expiration | Failed push delivery | Handle push failure by re-registering token; retry with exponential backoff |

---

## 10. Definition of Done

- [ ] All alert, notification, geofence, and community tables created and migrated
- [ ] Alert creation with role, region, and user-group targeting operational
- [ ] Alert routing engine resolves recipients correctly for all targeting modes
- [ ] Push notifications delivered via FCM (Android) and APNS (iOS)
- [ ] In-app notifications appear in real-time via WebSocket
- [ ] Email notifications sent for critical alerts (configurable)
- [ ] Geofence CRUD working with spatial queries
- [ ] WebSocket server handling 100+ concurrent connections
- [ ] Web alert history, notification center, and community feed functional
- [ ] Mobile alert list, map, push notifications, and community feed working
- [ ] All device token registration/update/unregister endpoints working
- [ ] Unit + integration test coverage > 85%
- [ ] E2E tests passing for all critical alert and notification flows
