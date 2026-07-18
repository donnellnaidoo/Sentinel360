# Sentinel360 — API Architecture

> **Document:** 03-API-ARCHITECTURE.md  
> **Version:** 1.0  
> **Status:** Approved  
> **Last Updated:** June 2026

---

## API Design Principles

1. **RESTful** — Resources map to domain entities; HTTP methods express operations
2. **Resource-oriented URLs** — `/api/v1/{resource}/{id}` with nested resources for sub-entities
3. **Consistent pagination** — Cursor-based for streams, offset-based for static collections
4. **Standard error format** — RFC 7807 Problem Details for all error responses
5. **Versioned** — URL-prefixed versioning (`/api/v1/`) for backward compatibility
6. **Idempotency** — PUT and DELETE are idempotent; POST supports idempotency keys
7. **Filtering & sorting** — Consistent query parameter conventions across all list endpoints

---

## API Base URL

| Environment | URL |
|-------------|-----|
| **Production** | `https://api.sentinel360.io/api/v1` |
| **Staging** | `https://api-staging.sentinel360.io/api/v1` |
| **Development** | `https://api-dev.sentinel360.io/api/v1` |

---

## Authentication & Authorization Flow

### JWT Token Flow

```
┌─────────┐          ┌──────────────┐          ┌──────────┐
│ Client  │          │ API Gateway  │          │ Auth Svc │
└────┬────┘          └──────┬───────┘          └────┬─────┘
     │                     │                       │
     │  1. POST /auth/login │                       │
     │  {email, password}   │                       │
     ├─────────────────────►│                       │
     │                     │  2. Validate creds     │
     │                     ├──────────────────────►│
     │                     │  3. {access_token,    │
     │                     │     refresh_token}    │
     │                     │◄──────────────────────┤
     │  4. 200 OK          │                       │
     │  {access_token,     │                       │
     │   refresh_token,    │                       │
     │   expires_in}       │                       │
     │◄─────────────────────┤                       │
     │                     │                       │
     │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
     │                     │                       │
     │  5. GET /cases      │                       │
     │  Authorization:     │                       │
     │  Bearer <access>    │                       │
     ├─────────────────────►│                       │
     │                     │  6. Validate JWT      │
     │                     │  7. Check RBAC        │
     │                     │  8. Route to service  │
     │  9. 200 OK          │                       │
     │  {data: [...]}      │                       │
     │◄─────────────────────┤                       │
     │                     │                       │
     │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
     │                     │                       │
     │  10. POST /auth/refresh                      │
     │  {refresh_token}    │                       │
     ├─────────────────────►│                       │
     │                     │  11. Validate refresh │
     │                     ├──────────────────────►│
     │                     │  12. New tokens       │
     │                     │◄──────────────────────┤
     │  13. 200 OK         │                       │
     │  {access_token,     │                       │
     │   refresh_token}    │                       │
     │◄─────────────────────┤                       │
     └──────────────────────────────────────────────┘
```

### Token Specification

| Token | TTL | Storage | Payload |
|-------|-----|---------|---------|
| **Access Token** | 15 minutes | Client memory (web) / Secure storage (mobile) | `{sub, roles, org, iat, exp}` |
| **Refresh Token** | 7 days | HTTP-only Secure cookie + Redis | `{sub, jti, iat, exp}` |
| **2FA Token** | 5 minutes | Client memory | `{sub, purpose, iat, exp}` |

### Token Revocation

- Immediate revocation via Redis blacklist (check on every API call)
- Refresh token rotation: each refresh invalidates the previous refresh token
- All tokens invalidated on password change, role change, or account suspension

---

## Authentication Endpoints

### `POST /api/v1/auth/register`

Register a new community member.

```json
// Request
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+27123456789"
}

// Response 201
{
  "userId": "uuid",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "community",
  "emailVerified": false,
  "createdAt": "2026-06-04T10:00:00Z"
}
```

### `POST /api/v1/auth/login`

```json
// Request
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "deviceInfo": {
    "type": "mobile",
    "os": "iOS 18",
    "appVersion": "1.0.0"
  }
}

// Response 200
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "community",
    "requires2fa": false
  }
}
```

### `POST /api/v1/auth/refresh`

```json
// Request
{
  "refreshToken": "eyJhbG..."
}

// Response 200
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### `POST /api/v1/auth/logout`

```json
// Request (Authorization: Bearer <token>)
{
  "refreshToken": "eyJhbG..."
}

// Response 204 (No Content)
```

### `POST /api/v1/auth/2fa/setup` (Super Admin only)

```json
// Response 200
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "otpauth://totp/Sentinel360:admin@...",
  "backupCodes": ["12345678", "23456789", ...]
}
```

### `POST /api/v1/auth/2fa/verify`

```json
// Request
{
  "totpCode": "123456"
}

// Response 200
{
  "verified": true,
  "backupCodesRemaining": 8
}
```

---

## API Endpoint Catalog

### Users Domain

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/users/me` | Get current user profile | All authenticated |
| `PATCH` | `/users/me` | Update own profile | All authenticated |
| `GET` | `/users` | List all users (paginated) | admin, super_admin |
| `GET` | `/users/{id}` | Get user details | admin, super_admin |
| `POST` | `/users` | Create new user | super_admin |
| `PATCH` | `/users/{id}` | Update user | admin (limited), super_admin |
| `DELETE` | `/users/{id}` | Deactivate user | super_admin |
| `GET` | `/users/{id}/sessions` | List user sessions | super_admin |
| `DELETE` | `/users/{id}/sessions/{sessionId}` | Revoke session | super_admin |

### Roles & Permissions

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/roles` | List all roles | admin, super_admin |
| `GET` | `/roles/{id}/permissions` | Get role permissions | admin, super_admin |
| `PATCH` | `/roles/{id}/permissions` | Update role permissions | super_admin |
| `GET` | `/users/{id}/roles` | Get user roles | admin, super_admin |
| `POST` | `/users/{id}/roles` | Assign role to user | super_admin |
| `DELETE` | `/users/{id}/roles/{roleId}` | Remove role from user | super_admin |

### Cases (Dockets) Domain

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/cases` | List cases (paginated, filterable) | security, law_enforcement, admin, super_admin |
| `POST` | `/cases` | Create new case | law_enforcement, admin, super_admin |
| `GET` | `/cases/{id}` | Get case details | security (assigned), law_enforcement, admin, super_admin |
| `PATCH` | `/cases/{id}` | Update case | law_enforcement (assigned), admin, super_admin |
| `DELETE` | `/cases/{id}` | Soft-delete case | super_admin |
| `GET` | `/cases/{id}/timeline` | Get case timeline | security, law_enforcement, admin, super_admin |
| `POST` | `/cases/{id}/timeline` | Add timeline entry | law_enforcement, admin, super_admin |
| `GET` | `/cases/{id}/evidence` | List case evidence | security, law_enforcement, admin, super_admin |
| `POST` | `/cases/{id}/evidence` | Link evidence to case | law_enforcement, admin, super_admin |
| `DELETE` | `/cases/{id}/evidence/{evidenceId}` | Remove evidence from case | law_enforcement, admin, super_admin |
| `GET` | `/cases/{id}/criminals` | List criminals linked to case | security, law_enforcement, admin, super_admin |
| `POST` | `/cases/{id}/criminals` | Link criminal profile to case | law_enforcement, admin, super_admin |
| `PATCH` | `/cases/{id}/status` | Update case status | law_enforcement, admin, super_admin |
| `GET` | `/cases/{id}/activity` | Get case activity log | security, law_enforcement, admin, super_admin |
| `GET` | `/cases/{id}/notes` | Get case notes | security (own), law_enforcement, admin, super_admin |
| `POST` | `/cases/{id}/notes` | Add case note | security, law_enforcement, admin, super_admin |
| `GET` | `/cases/stats` | Case statistics | law_enforcement, admin, super_admin |

### Criminal Profiles Domain

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/profiles` | List profiles (paginated, filterable) | security, law_enforcement, admin, super_admin |
| `GET` | `/profiles/public` | Public wanted feed | All (no auth required) |
| `POST` | `/profiles` | Create criminal profile | admin, super_admin |
| `GET` | `/profiles/{id}` | Get profile details | security, law_enforcement, admin, super_admin |
| `PATCH` | `/profiles/{id}` | Update profile | admin, super_admin |
| `DELETE` | `/profiles/{id}` | Soft-delete profile | admin, super_admin |
| `DELETE` | `/profiles/{id}/permanent` | Permanent delete (with 2FA) | super_admin |
| `POST` | `/profiles/{id}/merge` | Merge duplicate profiles | super_admin |
| `GET` | `/profiles/{id}/photos` | List profile photos | security, law_enforcement, admin, super_admin |
| `POST` | `/profiles/{id}/photos` | Add profile photo | admin, super_admin |
| `DELETE` | `/profiles/{id}/photos/{photoId}` | Delete photo | admin, super_admin |
| `GET` | `/profiles/{id}/biometrics` | Get biometric data | law_enforcement, admin, super_admin |
| `POST` | `/profiles/{id}/biometrics` | Add biometric data | admin, super_admin |
| `GET` | `/profiles/{id}/associates` | List known associates | law_enforcement, admin, super_admin |
| `POST` | `/profiles/{id}/associates` | Add known associate | admin, super_admin |
| `DELETE` | `/profiles/{id}/associates/{associateId}` | Remove association | admin, super_admin |
| `GET` | `/profiles/{id}/locations` | Get location history | law_enforcement, admin, super_admin |
| `POST` | `/profiles/{id}/locations` | Record last known location | law_enforcement, admin |
| `POST` | `/profiles/{id}/threat-assessment` | Create threat assessment | law_enforcement, admin, super_admin |
| `PATCH` | `/profiles/{id}/status` | Update status (active/arrested/cleared) | law_enforcement, admin, super_admin |

### Evidence Domain

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/evidence` | List evidence (paginated, filterable) | security, law_enforcement, admin, super_admin |
| `POST` | `/evidence` | Upload new evidence | security (limited), law_enforcement, admin, super_admin |
| `GET` | `/evidence/{id}` | Get evidence details | security, law_enforcement, admin, super_admin |
| `PATCH` | `/evidence/{id}` | Update evidence metadata | admin, super_admin |
| `DELETE` | `/evidence/{id}` | Soft-delete evidence | super_admin |
| `GET` | `/evidence/{id}/chain-of-custody` | Get chain of custody records | law_enforcement, admin, super_admin |
| `GET` | `/evidence/{id}/download` | Get presigned download URL | security (verified), law_enforcement, admin, super_admin |
| `POST` | `/evidence/{id}/verify` | Verify evidence | admin, law_enforcement |
| `GET` | `/evidence/{id}/hash` | Get cryptographic hash details | law_enforcement, admin, super_admin |

### Sightings Domain

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `POST` | `/sightings` | Submit a sighting | community, security |
| `GET` | `/sightings` | List sightings (paginated) | law_enforcement, admin, super_admin |
| `GET` | `/sightings/{id}` | Get sighting details | community (own), law_enforcement, admin, super_admin |
| `PATCH` | `/sightings/{id}/status` | Update sighting status | law_enforcement, admin, super_admin |
| `POST` | `/sightings/{id}/verify` | Verify sighting | law_enforcement, admin |
| `GET` | `/sightings/{id}/media` | Get sighting media | community (own), law_enforcement, admin, super_admin |
| `GET` | `/sightings/my` | Get current user's sightings | community, security |

### Alerts Domain

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/alerts` | List alerts (paginated, filterable) | All authenticated |
| `GET` | `/alerts/{id}` | Get alert details | All authenticated |
| `POST` | `/alerts` | Create manual alert | admin, super_admin |
| `PATCH` | `/alerts/{id}/read` | Mark alert as read | All authenticated (own) |
| `POST` | `/alerts/{id}/acknowledge` | Acknowledge alert | security, law_enforcement |
| `GET` | `/alerts/unread-count` | Get unread alert count | All authenticated |

### Analytics Domain

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/analytics/dashboard` | Main dashboard metrics | admin, super_admin |
| `GET` | `/analytics/cases-by-category` | Cases breakdown by category | admin, super_admin |
| `GET` | `/analytics/cases-by-status` | Cases by status | admin, super_admin |
| `GET` | `/analytics/cases-trend` | Case volume over time | admin, super_admin |
| `GET` | `/analytics/alerts-by-severity` | Alert distribution | admin, super_admin |
| `GET` | `/analytics/sightings-by-region` | Sighting density by region | law_enforcement, admin, super_admin |
| `GET` | `/analytics/ai-performance` | AI model performance metrics | admin, super_admin |
| `GET` | `/analytics/user-activity` | User activity metrics | super_admin |
| `GET` | `/analytics/response-times` | Alert response time metrics | admin, super_admin |

### Admin Domain

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `GET` | `/admin/dashboard` | Admin dashboard | admin, super_admin |
| `GET` | `/admin/snapshots/pending` | List pending snapshots for QA | admin, super_admin |
| `POST` | `/admin/snapshots/{id}/approve` | Approve snapshot | admin, super_admin |
| `POST` | `/admin/snapshots/{id}/reject` | Reject snapshot | admin, super_admin |
| `POST` | `/admin/snapshots/batch-approve` | Batch approve snapshots | admin, super_admin |
| `GET` | `/admin/audit-logs` | View audit logs | super_admin |
| `GET` | `/admin/audit-logs/export` | Export audit logs (CSV) | super_admin |
| `GET` | `/admin/system-config` | Get system configuration | super_admin |
| `PATCH` | `/admin/system-config/{key}` | Update system config | super_admin |
| `GET` | `/admin/model-versions` | List AI model versions | admin, super_admin |
| `POST` | `/admin/model-versions/{id}/promote` | Promote model to production | super_admin |

### AI/System Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `POST` | `/ai/analyze` | Submit media for AI analysis | security, law_enforcement, admin |
| `GET` | `/ai/analyze/{jobId}` | Check analysis status | security, law_enforcement, admin |
| `POST` | `/ai/face-compare` | Compare face to wanted profiles | law_enforcement, admin |
| `GET` | `/health` | System health check | Public |
| `GET` | `/health/ready` | Readiness probe | Monitoring |

---

## Critical Endpoint Shapes

### `GET /api/v1/cases/{id}` — Full Case Detail

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "caseNumber": "S360-2026-00042",
  "title": "Armed Robbery — Green Point Shopping Centre",
  "description": "Armed robbery at Green Point Shopping Centre at 14:30. Three suspects involved.",
  "category": "armed_robbery",
  "priority": "high",
  "status": "under_investigation",
  "statusChangedAt": "2026-06-03T16:30:00Z",
  "assignedInvestigator": {
    "id": "uuid",
    "firstName": "Sarah",
    "lastName": "Mokoena",
    "badgeNumber": "LE-2024-0189"
  },
  "incidentLocation": {
    "latitude": -33.9091,
    "longitude": 18.4163,
    "address": "Green Point Shopping Centre, Cape Town"
  },
  "incidentStartedAt": "2026-06-03T14:30:00Z",
  "incidentEndedAt": "2026-06-03T14:35:00Z",
  "reportedAt": "2026-06-03T14:40:00Z",
  "criminals": [
    {
      "id": "uuid",
      "profileId": "uuid",
      "role": "suspect",
      "firstName": "Unknown",
      "lastName": "Suspect #1",
      "status": "active",
      "primaryPhoto": {
        "cdnUrl": "https://media.sentinel360.io/snapshots/abc123.jpg",
        "isPrimary": true
      },
      "aiConfidenceScore": 92.5
    }
  ],
  "evidence": [
    {
      "id": "uuid",
      "type": "snapshot",
      "title": "AI Capture — Suspect #1 Face",
      "sha256Hash": "a1b2c3d4...",
      "cdnUrl": "https://media.sentinel360.io/evidence/def456.jpg",
      "aiConfidenceScore": 95.2,
      "status": "verified",
      "capturedAt": "2026-06-03T14:31:15Z"
    }
  ],
  "timeline": {
    "entries": [
      {
        "id": "uuid",
        "eventType": "incident_occurred",
        "title": "Armed robbery reported",
        "occurredAt": "2026-06-03T14:30:00Z",
        "source": "system",
        "description": "AI behaviour detection triggered at Green Point node"
      },
      {
        "id": "uuid",
        "eventType": "suspect_identified",
        "title": "Suspect #1 identified via facial recognition",
        "occurredAt": "2026-06-03T14:31:15Z",
        "source": "ai_detection"
      }
    ],
    "totalCount": 12
  },
  "createdAt": "2026-06-03T14:45:00Z",
  "updatedAt": "2026-06-04T09:00:00Z"
}
```

### `POST /api/v1/sightings` — Submit Sighting

```json
// Request (multipart/form-data)
{
  "description": "I saw this person at the Green Point taxi rank at 15:00",
  "latitude": -33.9085,
  "longitude": 18.4170,
  "observedAt": "2026-06-04T15:00:00Z",
  "isAnonymous": false,
  "media": [File]  // up to 3 images
}

// Response 201
{
  "id": "uuid",
  "referenceNumber": "ST-2026-00153",
  "status": "pending",
  "description": "I saw this person...",
  "location": {
    "latitude": -33.9085,
    "longitude": 18.4170
  },
  "observedAt": "2026-06-04T15:00:00Z",
  "media": [
    {
      "id": "uuid",
      "cdnUrl": "https://media.sentinel360.io/sightings/ghi789.jpg",
      "mediaType": "image",
      "isPrimary": true
    }
  ],
  "aiAnalysis": {
    "status": "queued",
    "estimatedCompletionTime": "2026-06-04T15:01:00Z"
  },
  "createdAt": "2026-06-04T15:00:30Z"
}
```

### `POST /api/v1/evidence` — Upload Evidence

```json
// Request (multipart/form-data)
{
  "evidenceType": "snapshot",
  "title": "AI Capture — Vehicle ALPR",
  "description": "License plate capture of suspect vehicle",
  "file": [File],
  "capturedAt": "2026-06-03T14:31:20Z",
  "latitude": -33.9091,
  "longitude": 18.4163,
  "cameraId": "CAM-GP-001"
}

// Response 201
{
  "id": "uuid",
  "evidenceType": "snapshot",
  "sha256Hash": "a1b2c3d4e5f6...",
  "chainPosition": 1,
  "cdnUrl": "https://media.sentinel360.io/evidence/def456.jpg",
  "fileSizeBytes": 2456789,
  "mimeType": "image/jpeg",
  "status": "pending",
  "createdAt": "2026-06-03T14:45:00Z"
}
```

### `GET /api/v1/profiles/public` — Public Wanted Feed

```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "Unknown",
      "lastName": "Suspect #1",
      "aliases": ["John Doe", "Slick Mike"],
      "primaryPhoto": {
        "cdnUrl": "https://media.sentinel360.io/public/suspect1.jpg",
        "width": 640,
        "height": 800
      },
      "lastKnownLocation": {
        "latitude": -33.9091,
        "longitude": 18.4163,
        "address": "Green Point, Cape Town"
      },
      "lastSeenAt": "2026-06-03T14:30:00Z",
      "riskLevel": "high",
      "wantedFor": ["armed_robbery", "assault"],
      "caseNumber": "S360-2026-00042",
      "status": "active"
    }
  ],
  "pagination": {
    "cursor": "eyJpZCI6IjEyMzQ1Njc4OTAi...",
    "hasMore": true,
    "nextCursor": "eyJpZCI6Ijk4NzY1NDMyMTAi..."
  }
}
```

### `POST /api/v1/ai/analyze` — Submit for AI Analysis

```json
// Request
{
  "mediaUrl": "https://media.sentinel360.io/uploads/video123.mp4",
  "analysisType": "full",  // face, alpr, behaviour, full
  "callbackUrl": "https://api.sentinel360.io/webhooks/ai-result",
  "priority": "normal"
}

// Response 202
{
  "jobId": "uuid",
  "status": "queued",
  "analysisType": "full",
  "estimatedCompletionTime": "2026-06-04T15:05:00Z",
  "queuePosition": 4
}
```

---

## Pagination Strategy

| Type | When | How |
|------|------|-----|
| **Cursor-based** | Real-time feeds (alerts, sightings feed, public wanted feed) | `?cursor=eyJpZCI6IjE...&limit=20` |
| **Offset-based** | Static collections (cases list, evidence list, user list) | `?page=1&perPage=20` (max 100) |
| **Keyset** | Large sorted datasets (audit logs, timeline entries) | `?after=2026-06-01T00:00:00Z&limit=50` |

### Pagination Response Format

```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6IjE...",
    "nextCursor": "eyJpZCI6Ijk4...",
    "hasMore": true,
    "limit": 20,
    "total": 1562
  }
}
```

---

## Filtering & Sorting

### Filter Convention

```
GET /api/v1/cases?status=open,under_investigation&category=armed_robbery&priority=high,critical
GET /api/v1/cases?assignedInvestigator=uuid
GET /api/v1/cases?createdAfter=2026-01-01&createdBefore=2026-06-01
GET /api/v1/cases?q=search+term  (full-text search)
GET /api/v1/evidence?type=snapshot,video_clip&status=verified&confidenceMin=80
GET /api/v1/profiles?status=active&riskLevel=high,critical&isPublic=true
GET /api/v1/alerts?severity=high,critical&type=wanted_person_sighting&unread=true
GET /api/v1/sightings?status=pending,under_review&region=-33.9,18.4,10km
```

### Sort Convention

```
GET /api/v1/cases?sort=createdAt:desc,priority:asc
GET /api/v1/evidence?sort=capturedAt:desc
GET /api/v1/profiles?sort=lastName:asc
GET /api/v1/alerts?sort=createdAt:desc,severity:desc
```

### Filter Operators

| Operator | Syntax | Example |
|----------|--------|---------|
| Equals | `field=value` | `status=open` |
| In list | `field=val1,val2` | `status=open,closed` |
| Range | `fieldMin=`, `fieldMax=` | `confidenceMin=80` |
| Date range | `fieldAfter=`, `fieldBefore=` | `createdAfter=2026-01-01` |
| Full-text | `q=term` | `q=armed+robbery` |
| Geographic | `region=lat,lng,radius` | `region=-33.9,18.4,10km` |
| Null check | `field=null` or `field=!null` | `assignedInvestigator=null` |

---

## Rate Limiting

| Tier | Requests/Minute | Burst | Applied To |
|------|----------------|-------|------------|
| **Community** | 100 | 20 | All endpoints |
| **Security** | 300 | 50 | All endpoints |
| **Law Enforcement** | 500 | 100 | All endpoints |
| **Admin** | 1000 | 200 | All endpoints |
| **Super Admin** | 2000 | 500 | All endpoints |
| **Unauthenticated** | 30 | 10 | Public endpoints only |
| **AI Pipeline** | 5000 | 1000 | Internal endpoints |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1622803200
Retry-After: 45
```

---

## WebSocket Design (Real-time Alerts)

### Connection

```
wss://api.sentinel360.io/ws?token=<access_token>
```

### Protocol

Using Socket.IO for web and standard WebSocket for mobile.

### Event Types

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `alert.new` | Server → Client | `{alert}` | New alert created |
| `alert.updated` | Server → Client | `{id, status}` | Alert status change |
| `sighting.match` | Server → Client | `{sightingId, profileId, confidence}` | AI matched a sighting |
| `case.updated` | Server → Client | `{caseId, changes}` | Case updated |
| `evidence.added` | Server → Client | `{caseId, evidence}` | New evidence added to case |
| `heartbeat` | Bidirectional | `{timestamp}` | Connection keepalive (30s) |
| `subscribe` | Client → Server | `{channels: ["alerts:my", "case:uuid"]}` | Channel subscription |
| `unsubscribe` | Client → Server | `{channels: ["alerts:my"]}` | Channel unsubscribe |

### Channel Subscription Model

```
// Client subscribes to channels after connection
{ "event": "subscribe", "data": { "channels": [
    "alerts:all",              // All alerts (admin/super_admin only)
    "alerts:region:-33.9,18.4",    // Geofenced alerts
    "case:S360-2026-00042",   // Specific case updates
    "sightings:pending"        // Pending sighting notifications (LE only)
]}}

// Server sends alert
{ "event": "alert.new", "data": {
    "id": "uuid",
    "type": "wanted_person_sighting",
    "severity": "high",
    "title": "Wanted person sighted: Unknown Suspect #1",
    "description": "AI detected a match at Green Point node",
    "location": { "latitude": -33.9091, "longitude": 18.4163 },
    "createdAt": "2026-06-04T15:30:00Z"
}}
```

### Connection Lifecycle

1. Client connects with JWT token in query parameter
2. API Gateway validates token, upgrades to WebSocket
3. Client subscribes to channels based on role
4. Server sends `alert.new` events in real-time
5. Heartbeat every 30 seconds; if no heartbeat for 60s, connection is closed
6. Client reconnects with exponential backoff (1s, 2s, 4s, 8s, max 30s)

---

## Error Handling (RFC 7807)

### Error Response Format

```json
{
  "type": "https://api.sentinel360.io/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request body contains invalid fields",
  "instance": "/api/v1/cases",
  "errors": {
    "title": ["Title is required", "Title must be at least 10 characters"],
    "category": ["Category must be one of: theft, assault, robbery, ..."]
  },
  "traceId": "abc-123-def-456"
}
```

### Standard Error Types

| HTTP Status | Type | When |
|-------------|------|------|
| 400 | `bad-request` | Malformed request syntax |
| 401 | `unauthorized` | Missing or invalid authentication |
| 403 | `forbidden` | Authenticated but insufficient permissions |
| 404 | `not-found` | Resource does not exist |
| 409 | `conflict` | Resource conflict (duplicate, stale version) |
| 422 | `validation-error` | Request body validation failed |
| 429 | `rate-limited` | Rate limit exceeded |
| 500 | `internal-error` | Unexpected server error |

---

## Request/Response Standards

### Common Headers

| Header | Description |
|--------|-------------|
| `Authorization: Bearer <token>` | JWT access token |
| `X-Idempotency-Key: <uuid>` | Idempotency key for POST requests |
| `X-Request-ID: <uuid>` | Client-generated request identifier |
| `Accept-Language: en-ZA` | Localization |
| `If-None-Match: <etag>` | Conditional GET for caching |

### Standard Response Envelope

```json
// Success
{
  "data": { ... } | [ ... ],
  "pagination": { ... },  // only for list endpoints
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-06-04T15:00:00Z"
  }
}

// Error
{
  "type": "https://api.sentinel360.io/errors/...",
  "title": "...",
  "status": 400,
  "detail": "...",
  "instance": "...",
  "traceId": "uuid"
}
```

---

## Webhooks

For external system integration (Law Enforcement Case Management Systems).

| Event | Trigger | Payload |
|-------|---------|---------|
| `case.closed` | Case status → closed | Full case summary + evidence bundle |
| `evidence.verified` | Evidence approved | Evidence metadata + download URL |
| `sighting.verified` | Sighting confirmed | Sighting details + matched profile |
| `alert.critical` | Critical alert published | Alert details + location |

Webhooks are delivered via POST to a registered callback URL with HMAC signature header for verification.

---

## API Versioning Strategy

- URL-prefixed: `/api/v1/`, `/api/v2/`
- Minimum 6-month deprecation period
- `Deprecated` header on v1 endpoints when v2 is active
- `Sunset` header indicating deprecation date
- All versions documented in OpenAPI 3.1 spec

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | Software Architect | Initial API architecture |
