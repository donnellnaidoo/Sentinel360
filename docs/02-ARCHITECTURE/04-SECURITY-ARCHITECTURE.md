# Sentinel360 — Security Architecture

> **Document:** 04-SECURITY-ARCHITECTURE.md  
> **Version:** 1.0  
> **Status:** Approved  
> **Last Updated:** June 2026

---

## Security Philosophy

Sentinel360 processes sensitive law enforcement and surveillance data. Security is not a bolt-on feature — it is the foundation of the entire system. Every architectural decision is evaluated against the principle of **least privilege**, **defense in depth**, and **forensic admissibility**.

### Key Principles

1. **Defense in Depth** — Multiple layers of security controls; no single point of failure
2. **Least Privilege** — Every user and service has the minimum permissions required
3. **Zero Trust** — No request is trusted by default; every request is authenticated and authorized
4. **Immutable Audit** — All security-relevant actions are logged and cannot be modified or deleted
5. **Cryptographic Integrity** — Evidence integrity is verifiable through cryptographic hashing
6. **Secure by Default** — Secure configurations are the default; insecure configurations are explicit opt-in

---

## Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SECURITY CONTROL LAYERS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 1: Network & Infrastructure                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │ TLS 1.3  │ │ WAF      │ │ DDoS     │ │ Network          │  │   │
│  │  │ Everywhere│ │ (ModSec) │ │ Protection│ │ Segmentation     │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 2: Authentication & Authorization                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │ JWT +    │ │ RBAC     │ │ 2FA      │ │ API Key          │  │   │
│  │  │ Refresh  │ │ Matrix   │ │ (TOTP)   │ │ (Edge Nodes)     │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 3: Application Security                                 │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │ Input    │ │ CSRF     │ │ Rate     │ │ Output           │  │   │
│  │  │ Validation│ │ Tokens   │ │ Limiting │ │ Encoding         │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 4: Data Security                                        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │ AES-256  │ │ At Rest  │ │ In Tran- │ │ Cryptographic    │  │   │
│  │  │ Encryption│ │ (DB/S3)  │ │ sit (mTLS)│ │ Chain of Custody │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 5: Audit & Compliance                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │ Immutable│ │Tamper-   │ │ Search & │ │ Compliance       │  │   │
│  │  │ Audit Log│ │Proof     │ │ Export   │ │ Reporting        │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Network & Infrastructure Security

### 1.1 TLS Everywhere

| Connection | Protocol | Cipher Suite |
|------------|----------|-------------|
| Client → API Gateway | TLS 1.3 | TLS_AES_256_GCM_SHA384 |
| API Gateway → Services | TLS 1.3 (mTLS optional) | TLS_AES_256_GCM_SHA384 |
| Services → Database | TLS 1.2+ | PostgreSQL SSL with certificate validation |
| Edge → Cloud | TLS 1.3 | TLS_AES_256_GCM_SHA384 |
| Kafka | TLS 1.2 + SASL/SCRAM | TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 |

### 1.2 Web Application Firewall (WAF)

- **Rule Set:** OWASP Core Rule Set (CRS) 3.3
- **Blocked:** SQL injection, XSS, path traversal, remote file inclusion, command injection
- **Rate-based rules:** IP-based rate limiting per endpoint
- **Geo-blocking:** Optional restriction by country
- **Custom rules:** Sentinel360-specific patterns (e.g., block direct S3 URL access)

### 1.3 DDoS Protection

- **Level 3/4:** AWS Shield Advanced / Cloudflare DDoS protection
- **Level 7:** WAF rate limiting + API Gateway throttling
- **Spoofing:** VPC with private subnets, no public IPs on services

### 1.4 Network Segmentation

```
┌─────────────────────────────────────────────────────────────┐
│                     VPC (10.0.0.0/16)                        │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │  Public Subnet          │  │  Private Subnet          │  │
│  │  10.0.1.0/24            │  │  10.0.2.0/24             │  │
│  │                         │  │                          │  │
│  │  - API Gateway (ALB)    │  │  - Backend Services      │  │
│  │  - CDN Origin           │  │  - Database (RDS)        │  │
│  │  - WebSocket LB         │  │  - Redis (ElastiCache)   │  │
│  └─────────────────────────┘  │  - Kafka (MSK)           │  │
│                                │  - Elasticsearch         │  │
│  ┌─────────────────────────┐  └─────────────────────────┘  │
│  │  Isolated Subnet        │                               │
│  │  10.0.3.0/24            │  ┌─────────────────────────┐  │
│  │  - GPU Compute Pods     │  │  Management Subnet       │  │
│  │  - 3D Reconstruction    │  │  10.0.4.0/24             │  │
│  └─────────────────────────┘  │  - Bastion Host          │  │
│                                │  - CI/CD Runner          │  │
│                                └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.5 Edge Device Security

- All edge devices (Jetson Orin) ship with **signed firmware** and **measured boot**
- **Mutual TLS (mTLS)** between edge devices and cloud services
- Device identity via **X.509 certificates** provisioned during deployment
- **Local firewall**: Only outbound connections to defined cloud endpoints on ports 443 and 9094
- **Physical tamper detection**: Case intrusion sensor triggers automatic key erasure

---

## Layer 2: Authentication & Authorization

### 2.1 JWT Authentication

| Setting | Value |
|---------|-------|
| **Algorithm** | RS256 (asymmetric) |
| **Private key** | Stored in HSM / AWS KMS, never in application code |
| **Public key** | Exposed via `/.well-known/jwks.json` |
| **Access token TTL** | 15 minutes |
| **Refresh token TTL** | 7 days |
| **Claims** | `sub`, `roles[]`, `org`, `iat`, `exp`, `jti`, `session_id` |

### 2.2 RBAC Matrix

| Resource \ Role | Community | Security Operator | Law Enforcement | Admin | Super Admin |
|-----------------|-----------|-------------------|-----------------|-------|-------------|
| **Public Feed** | ✅ Read | ✅ Read | ✅ Read | ✅ Read | ✅ Read |
| **Own Profile** | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ CRUD |
| **User Management** | ❌ | ❌ | ❌ | ✅ Limited¹ | ✅ Full |
| **Criminal Profiles** | ❌ Read² | ✅ Read | ✅ Read | ✅ CRUD³ | ✅ CRUD³ |
| **Profile Status** | ❌ | ❌ | ✅ Update | ✅ Update | ✅ Update |
| **Profile Permanent Delete** | ❌ | ❌ | ❌ | ❌ | ✅ (with 2FA) |
| **Profile Merge** | ❌ | ❌ | ❌ | ❌ | ✅ (with 2FA) |
| **Cases (Create)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Cases (Read)** | ❌ | ✅ Assigned | ✅ All | ✅ All | ✅ All |
| **Cases (Update)** | ❌ | ❌ | ✅ Assigned | ✅ All | ✅ All |
| **Cases (Delete)** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Evidence (Upload)** | ❌ | ✅ Limited⁴ | ✅ | ✅ | ✅ |
| **Evidence (Read)** | ❌ | ✅ Own | ✅ Case-linked | ✅ All | ✅ All |
| **Evidence (Verify)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Evidence (Delete)** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Evidence (Chain of Custody)** | ❌ | ❌ | ✅ Read | ✅ Read | ✅ Read |
| **Sightings (Submit)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sightings (Read)** | ✅ Own | ✅ Own | ✅ All | ✅ All | ✅ All |
| **Sightings (Verify)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Alerts (Receive)** | ✅ Own region | ✅ Own region | ✅ Own region | ✅ All | ✅ All |
| **Alerts (Create)** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Alerts (Bulk Send)** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Analytics** | ❌ | ❌ | ✅ Limited | ✅ Full | ✅ Full |
| **Audit Logs (View)** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Audit Logs (Export)** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **System Config** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **AI Model Management** | ❌ | ❌ | ❌ | ✅ Read | ✅ Full |
| **Role Management** | ❌ | ❌ | ❌ | ❌ | ✅ |

> ¹ Admin: Can manage community and security accounts only. Cannot manage admin or super admin accounts.
> ² Community: Can view public profiles on wanted feed only (limited fields).
> ³ Admin/Super Admin: Cannot delete permanently without 2FA.
> ⁴ Security: Can upload CCTV snapshots only. Cannot upload witness statements or documents.

### 2.3 Two-Factor Authentication (2FA)

**Required for:** Super Admin (all destructive actions), optional for Admin

| Action | 2FA Requirement |
|--------|-----------------|
| Super Admin login | ✅ Required (TOTP) |
| Permanent profile deletion | ✅ TOTP re-verification |
| Profile merging | ✅ TOTP re-verification |
| System configuration changes | ✅ TOTP re-verification |
| Role/permission changes | ✅ TOTP re-verification |
| Audit log export | ✅ TOTP re-verification |
| Admin login | Optional (configurable) |

**Implementation:**
- TOTP (RFC 6238) with 30-second window
- 10 backup codes (one-time use) provided at setup
- Rate-limited verification: max 5 attempts per 5 minutes
- Failed 2FA attempts logged as security events

### 2.4 API Key Authentication (Edge Devices)

- Edge devices authenticate via **X.509 client certificates** (mTLS)
- Device-specific API keys with **limited scope** (video ingestion only)
- Keys rotated every 90 days
- Compromised keys can be revoked immediately via device management console

---

## Layer 3: Application Security

### 3.1 Input Validation

| Validation | Implementation |
|------------|----------------|
| **All user input** | class-validator (NestJS) decorators with strict whitelisting |
| **File uploads** | MIME type verification, magic byte checking, virus scanning (ClamAV) |
| **Image uploads** | Re-encode on server to strip EXIF/metadata; max 20MB; dimension limits |
| **Video uploads** | Transcode to H.264/AAC; max 500MB; duration limits; scene-change detection |
| **String inputs** | Stripped of HTML tags (DOMPurify server-side); length limits |
| **Numeric inputs** | Range-checked; type-coerced |
| **Geo coordinates** | Validated against WGS84 bounds | 
| **Pagination** | Max page size enforced (100); cursor validated |

### 3.2 CSRF Protection

- **Web client:** SameSite=Strict cookies + CSRF tokens for state-changing requests
- **Mobile client:** No CSRF risk (no cookie-based auth); Bearer tokens in Authorization header
- **API Gateway:** CSRF validation middleware for cookie-authenticated requests

### 3.3 XSS Prevention

| Layer | Measure |
|-------|---------|
| **Output encoding** | All dynamic content HTML-escaped in responses |
| **CSP Headers** | `Content-Security-Policy: default-src 'self'; img-src 'self' https://media.sentinel360.io; script-src 'self'` |
| **HTTP-only cookies** | Refresh tokens stored in HTTP-only, Secure, SameSite=Strict cookies |
| **Input sanitization** | DOMPurify on all rich text fields |
| **React** | React's built-in XSS protection (JSX escapes values) |

### 3.4 Rate Limiting

See [API Architecture § Rate Limiting](./03-API-ARCHITECTURE.md#rate-limiting)

Additional security rate limits:

| Action | Limit | Duration | Consequence |
|--------|-------|----------|-------------|
| Login attempts | 5 | 15 minutes | Account locked 30 min |
| 2FA attempts | 5 | 5 minutes | Temporary IP block |
| Password reset | 3 | 1 hour | Account flagged |
| Sightings submission | 10 | 1 hour | Temporary submission block |
| API key generation | 3 | 24 hours | Super Admin only |

### 3.5 File Upload Security

```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│  Client   │────►│ API Gateway  │────►│ Backend  │────►│  S3      │
└──────────┘     └──────────────┘     └────┬─────┘     └──────────┘
                                           │
                                    ┌──────▼──────┐
                                    │ File Scanner │
                                    │ (ClamAV)     │
                                    └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │ Re-encoder   │
                                    │ (FFmpeg/     │
                                    │  Sharp)      │
                                    └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │ Hash        │
                                    │ (SHA-256)   │
                                    └─────────────┘
```

**Upload Validation Chain:**
1. MIME type check (whitelist: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `application/pdf`)
2. File size check (images: 20MB max, video: 500MB max)
3. Magic byte verification (server-side `file` command)
4. Virus scan (ClamAV)
5. Image: Re-encode to clean JPEG/PNG (strips EXIF/metadata)
6. Video: Transcode to H.264 + AAC in MP4 container
7. Compute SHA-256 hash of final file
8. Store in S3 with hash as metadata tag
9. Original file deleted after successful processing

### 3.6 API Security Headers

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; img-src 'self' https://media.sentinel360.io; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self "https://app.sentinel360.io")
Cache-Control: no-store, no-cache, must-revalidate
```

---

## Layer 4: Data Security

### 4.1 Encryption at Rest

| Data Store | Encryption Method | Key Management |
|------------|-------------------|----------------|
| **PostgreSQL (RDS)** | AES-256 (AWS RDS encryption) | AWS KMS (auto-rotation) |
| **S3 Objects** | AES-256 (SSE-S3 or SSE-KMS) | AWS KMS with Customer Master Key |
| **Redis (ElastiCache)** | AES-256 (encryption at rest) | AWS KMS |
| **Kafka (MSK)** | AES-256 (encryption at rest) | AWS KMS |
| **Elasticsearch (AOS)** | AES-256 (encryption at rest) | AWS KMS |
| **Edge device storage** | LUKS full-disk encryption | TPM-backed key storage |
| **Backups** | AES-256 (S3 Glacier with Glacier Encrypt) | AWS KMS |

### 4.2 Encryption in Transit

| Path | Protocol | Notes |
|------|----------|-------|
| Client → API | TLS 1.3 | Mandatory; HTTP upgrade to HTTPS |
| API → Backend | TLS 1.3 | Internal ALB with TLS termination |
| Backend → DB | TLS 1.2+ | PostgreSQL SSL with certificate pinning |
| Backend → Redis | TLS + AUTH | In-transit encryption enabled |
| Backend → Kafka | TLS + SASL/SCRAM-SHA-512 | Mutual authentication |
| Backend → S3 | HTTPS (TLS 1.3) | SigV4 signing |
| Edge → Cloud | TLS 1.3 + mTLS | Device certificate authentication |
| Backend → Elasticsearch | HTTPS (TLS 1.3) | HTTP basic auth |

### 4.3 Cryptographic Chain of Custody

Every piece of evidence has an immutable cryptographic chain of custody record.

```
Algorithm: SHA-256

Chain Entry Hash = SHA-256(
    previous_entry_hash  ||
    evidence_id          ||
    action               ||
    user_id              ||
    timestamp            ||
    nonce
)

Chain Validation:
    For each entry E_i in chain:
        Verify H(E_i) == SHA-256(E_{i-1}.hash || evidence_id || action || user_id || timestamp || nonce)
        Verify E_i.previous_hash == E_{i-1}.current_hash
```

#### Chain Entry Structure

```json
{
  "id": "uuid",
  "evidenceId": "uuid",
  "action": "created",  // created, accessed, viewed, exported, verified, modified, archived
  "performedBy": {
    "userId": "uuid",
    "name": "Officer Sarah Mokoena",
    "role": "law_enforcement"
  },
  "performedAt": "2026-06-04T15:00:00Z",
  "ipAddress": "192.168.1.100",
  "previousHash": "a1b2c3d4...",
  "currentHash": "e5f6g7h8...",
  "evidenceHash": "x9y8z7w6..."  // SHA-256 of the actual evidence file
}
```

#### Evidence Integrity Verification

```
Given: evidence_file, chain_of_custody[]
1. Compute SHA-256 of evidence_file → file_hash
2. Verify file_hash matches first chain entry's evidenceHash
3. For each subsequent chain entry:
   a. Recompute current_hash using previous_hash + fields
   b. Verify recomputed hash matches stored current_hash
4. If all hashes match → evidence is intact
5. If any hash mismatch → evidence tampered; flag for forensic review
```

### 4.4 Sensitive Data Handling

| Data Type | Classification | Handling |
|-----------|---------------|----------|
| Facial images | Highly sensitive | Encrypted at rest; access logged; auto-purge after case closure (configurable) |
| Biometric embeddings | Highly sensitive | Encrypted at rest; only used for matching; never exported |
| GPS coordinates | Sensitive | Encrypted at rest; only visible to authorized roles |
| Personal information (names, ID numbers) | Sensitive | Encrypted at rest; masked in audit logs |
| License plates | Sensitive | Encrypted at rest; searchable only by authorized roles |
| Passwords | Critical | bcrypt (cost factor 12) + per-user salt; never stored in plaintext |
| JWT secrets | Critical | Stored in AWS KMS; rotated every 90 days |
| API keys | Critical | bcrypt hashed in database; plaintext shown once at creation |

### 4.5 Password Policy

| Policy | Requirement |
|--------|-------------|
| Minimum length | 12 characters |
| Complexity | Upper + lower + number + special character |
| Password history | 5 previous passwords remembered |
| Maximum age | 90 days |
| Account lockout | After 5 failed attempts (30-minute lockout) |
| Breach check | Password checked against HaveIBeenPwned API at registration |

---

## Layer 5: Audit & Compliance

### 5.1 Immutable Audit Log

```sql
-- The audit_logs table is APPEND-ONLY.
-- No UPDATE or DELETE privileges are granted to ANY role, including super_admin.
-- Only the Audit Service has INSERT privileges.
-- This is enforced at the database level via triggers and permissions.

CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. No modifications or deletions are allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER trg_prevent_audit_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
```

### 5.2 Audit Events Logged

| Category | Events |
|----------|--------|
| **Authentication** | Login, logout, login failure, password change, 2FA setup, 2FA verification, token refresh |
| **User Management** | User created, user deactivated, user reactivated, user deleted, role assigned, role revoked |
| **Profile Management** | Profile created, profile updated, profile deleted, profile merged, profile status changed, photo added/removed |
| **Case Management** | Case created, case updated, case status changed, case deleted, investigator assigned |
| **Evidence** | Evidence uploaded, evidence verified, evidence rejected, evidence accessed, evidence exported, evidence deleted |
| **Sightings** | Sighting submitted, sighting verified, sighting rejected, sighting matched to profile |
| **Alerts** | Alert created, alert sent, alert acknowledged, alert expired |
| **AI Operations** | Model promoted, model deprecated, AI analysis initiated, AI analysis completed |
| **System** | Configuration changed, backup completed, restore initiated, system health event |
| **Security** | Failed login, rate limit exceeded, suspicious IP detected, 2FA failure, permission denied |

### 5.3 Audit Log Enrichment

Each audit entry captures:

```json
{
  "id": "uuid",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "law_enforcement",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "sessionId": "uuid"
  },
  "action": "evidence.accessed",
  "resource": {
    "type": "evidence",
    "id": "uuid",
    "caseNumber": "S360-2026-00042"
  },
  "context": {
    "requestId": "uuid",
    "traceId": "abc123",
    "geoLocation": {"latitude": -33.9, "longitude": 18.4}
  },
  "changes": {
    "previous": null,
    "current": null,
    "summary": "User viewed evidence file 'suspect_face.jpg'"
  },
  "timestamp": "2026-06-04T15:00:00.000Z"
}
```

### 5.4 Security Monitoring & Alerting

| Monitor | Trigger | Action |
|---------|---------|--------|
| Failed login spike | >10 failures from same IP in 5min | Block IP for 1 hour; alert security team |
| Unusual access times | Access outside 06:00-22:00 for non-LE | Flag for review |
| Bulk data export | >100 records exported in 1 hour | Require 2FA re-verification; alert super admin |
| Permission denied spike | >10 403s from same user in 5min | Temporary account suspension; security review |
| Evidence hash mismatch | Chain-of-custody verification fails | Critical alert; freeze evidence; initiate forensic audit |
| New device/login | Login from unrecognized device/location | Email notification to user; alert super admin |
| Edge device offline | No heartbeat for >5 minutes | Alert edge device administrator |

### 5.5 Compliance Considerations

| Standard | Relevance | Controls |
|----------|-----------|----------|
| **POPIA** (South Africa) | Personal data protection | Consent management, data minimization, purpose limitation, breach notification |
| **GDPR** | EU data subjects (if applicable) | Right to erasure, data portability, DPA |
| **ISO 27001** | Information security management | Risk assessment, security controls, continuous improvement |
| **SAPS Forensics** | Evidence admissibility | Chain of custody, cryptographic integrity, access controls |

---

## Security Incident Response Plan

### Tiers

| Tier | Severity | Response Time | Example |
|------|----------|---------------|---------|
| 1 | Critical | < 15 minutes | Evidence hash mismatch, unauthorized data access, system compromise |
| 2 | High | < 1 hour | Account takeover, successful brute force, malware detection |
| 3 | Medium | < 4 hours | Failed login spike, unusual access patterns, policy violation |
| 4 | Low | < 24 hours | Configuration weakness, outdated dependency, minor policy violation |

### Response Flow

```
1. DETECT      → Automated monitoring or manual report
2. TRIAGE      → Assess severity, assign incident handler
3. CONTAIN     → Limit blast radius (revoke tokens, isolate systems)
4. INVESTIGATE → Audit logs, determine root cause
5. REMEDIATE   → Fix vulnerability, rotate keys, restore from backup
6. DOCUMENT    → Incident report, lessons learned, control improvements
```

---

## Security Testing Regime

| Test Type | Frequency | Scope |
|-----------|-----------|-------|
| SAST (Static Analysis) | Every commit | Codebase (SonarQube, ESLint security rules) |
| DAST (Dynamic Analysis) | Weekly | Deployed staging environment (OWASP ZAP) |
| Dependency scanning | Every commit | npm/yarn audit, Snyk, Dependabot |
| Container scanning | Every build | Docker image scan (Trivy, Clair) |
| Secret scanning | Every commit | git-secrets, pre-commit hooks |
| Penetration testing | Quarterly | Full-scope test by external firm |
| Bug bounty | Ongoing | HackerOne / Intigriti program |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | Software Architect | Initial security architecture |
