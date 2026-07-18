# Sentinel360 — Security Posture Assessment

> **Document:** Security Assessment & Threat Model
> **Group:** Alpha Tech
> **Last Updated:** June 2026

---

## 1. Threat Model

### 1.1 Assets

| # | Asset | Classification | Description |
|---|-------|---------------|-------------|
| A1 | Surveillance video feeds | **Restricted** | Raw CCTV footage from all cameras |
| A2 | Criminal profile data | **Restricted** | PII, biometrics, case history |
| A3 | Evidence records | **Restricted** | Hashed evidence, chain of custody |
| A4 | Authentication credentials | **Critical** | Password hashes, session tokens |
| A5 | API keys / secrets | **Critical** | Supabase keys, Better-Auth secrets, S3 keys |
| A6 | AI models | **Internal** | Trained ML models, model weights |
| A7 | Audit logs | **Restricted** | Immutable action records |
| A8 | System configuration | **Internal** | Feature flags, retention policies |

### 1.2 Threat Actors

| Actor | Motivation | Capability | Access |
|-------|-----------|------------|--------|
| **External Attacker** | Data theft, system disruption | Moderate-High | Network-level |
| **Malicious Insider** | Data exfiltration, sabotage | High | Authorised access |
| **Competitor** | Industrial espionage | Moderate | Limited |
| **Organised Crime** | Evidence tampering, counter-surveillance | High | Targeted |
| **Unprivileged User** | Privilege escalation | Low | Own account |

### 1.3 STRIDE Analysis

| Threat | Affected Assets | Risk | Mitigation | Status |
|--------|-----------------|------|------------|--------|
| **Spoofing** — Impersonate user/device | A4, A5 | **High** | Multi-factor auth, device certificates | 🔶 Partial (no 2FA) |
| **Tampering** — Modify evidence/hashes | A3, A7 | **Critical** | SHA-256 chain of custody, immutable audit | ❌ Not built |
| **Repudiation** — Deny actions | A7 | **High** | Immutable audit logs, digital signatures | ❌ Not built |
| **Information Disclosure** — Data leak | A1, A2, A3 | **Critical** | AES-256, RBAC, TLS 1.3 | 🔶 Partial |
| **Denial of Service** — System outage | All | **High** | Rate limiting, auto-scaling, DDoS protection | ❌ Not built |
| **Elevation of Privilege** — Role escalation | A4 | **Critical** | RBAC enforcement, permission resolution | 🔶 Partial |

---

## 2. Current Security Controls

### 2.1 Implemented Controls

| Control | Location | Effectiveness |
|---------|----------|---------------|
| TLS 1.3 for all external traffic | Hono server, Supabase | ✅ Strong |
| AES-256 encryption at rest | Supabase managed | ✅ Strong |
| Password hashing (Better-Auth) | Better-Auth | ✅ Strong (bcrypt/argon2) |
| Session-based authentication | Better-Auth + cookies | ✅ Moderate |
| Role-based middleware (basic) | Web middleware.ts | 🔶 Basic (app_metadata only) |
| CORS configuration | Hono server | ✅ Configured |
| Environment variable isolation | packages/env | ✅ Good |

### 2.2 Missing Controls (Critical)

| Control | NFR Reference | Risk | Effort to Implement |
|---------|---------------|------|---------------------|
| **Chain of custody** | NFR-03-001 | Evidence inadmissible | 20h |
| **Immutable audit logs** | NFR-03-005 | No accountability | 16h |
| **Permission resolution service** | NFR-03-004 | Privilege escalation | 12h |
| **Rate limiting** | NFR-03-007 | DoS vulnerability | 8h |
| **2FA for Super Admin** | NFR-03-004 | Account takeover | 10h |
| **Input validation (all endpoints)** | General | Injection attacks | Partially done (Zod) |
| **File upload validation** | General | Malware upload | 6h |
| **API key rotation** | General | Key compromise | 4h |
| **Security headers (CSP, HSTS)** | General | XSS, clickjacking | 4h |
| **SQL injection prevention** | General | Data breach | ✅ Zod + Drizzle ORM |
| **DDoS protection** | NFR-03-007 | System downtime | Infra-level |

---

## 3. OWASP Top 10 (2021) Assessment

| # | Category | Sentinel360 Status | Risk |
|---|----------|-------------------|------|
| **A01** | Broken Access Control | 🔶 Role middleware exists but no granular permission resolution | **High** |
| **A02** | Cryptographic Failures | ✅ TLS + AES-256; ❌ No chain-of-custody hashing | **Medium** |
| **A03** | Injection | ✅ Zod validation + Drizzle ORM (parameterised queries) | **Low** |
| **A04** | Insecure Design | 🔶 AI pipeline not built; no threat modelling done | **Medium** |
| **A05** | Security Misconfiguration | 🔶 Environment-based config but no security headers | **Medium** |
| **A06** | Vulnerable Components | ⚠️ Need dependency audit; Bun catalog may have outdated packages | **Medium** |
| **A07** | Auth Failures | 🔶 Better-Auth is strong but no 2FA, no lockout, no email verification wired | **High** |
| **A08** | Data Integrity Failures | ❌ No chain of custody; no evidence hash verification | **Critical** |
| **A09** | Logging & Monitoring | ❌ No structured logging; no SIEM integration | **High** |
| **A10** | SSRF | ⚠️ Webhook engine (Phase 6) needs SSRF protection | **Future** |

---

## 4. Security Architecture (Target State)

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Web Browser  │  │ Mobile App   │  │ External     │   │
│  │ HSTS + CSP   │  │ Certificate  │  │ System       │   │
│  │              │  │ Pinning      │  │ mTLS         │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
└─────────┼─────────────────┼──────────────────┼────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌──────────────────────────────────────────────────────────┐
│                  EDGE LAYER (CDN/WAF)                     │
│  • Cloudflare / AWS CloudFront                           │
│  • DDoS protection                                        │
│  • WAF rules (SQLi, XSS, rate limiting)                   │
│  • Bot management                                         │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  API GATEWAY (Hono)                       │
│  • TLS 1.3 termination                                   │
│  • Rate limiting per API key / user                      │
│  • Request validation (Zod)                              │
│  • Security headers (CSP, HSTS, X-Frame-Options)         │
│  • CORS strict origin                                    │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│            APPLICATION LAYER (tRPC Routers)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Router  │  │ Domain       │  │ Admin Router │  │
│  │ • Session    │  │ Routers      │  │ • Audit      │  │
│  │ • RBAC guard │  │ • Role guard │  │ • 2FA check  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  Permission Resolution Service                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 1. Extract user + roles from session               │  │
│  │ 2. Resolve permissions: user_roles → role_         │  │
│  │    permissions → effective permissions              │  │
│  │ 3. Check: can(user, resource, action) → bool       │  │
│  │ 4. Deny by default                                 │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  DATA LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ PostgreSQL   │  │ Redis        │  │ MinIO/S3     │   │
│  │ • AES-256    │  │ • TLS        │  │ • AES-256    │   │
│  │ • RLS        │  │ • Auth       │  │ • Presigned  │   │
│  │ • Auditing   │  │              │  │   URLs       │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│  Chain of Custody Service                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Immutable, append-only hash chain                  │  │
│  │ SHA-256(prev_hash + action + timestamp + user)     │  │
│  │ Verification endpoint for court evidence            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Secrets Management Audit

| Secret | Location | Protected? | Risk if leaked |
|--------|----------|------------|----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` + `admin.ts` | ⚠️ Plain text in .env | Full DB access |
| `DATABASE_URL` | `.env` | ⚠️ Plain text | DB read/write |
| `BETTER_AUTH_SECRET` | `.env` (not set) | ❌ Not configured | Session forgery |
| `BETTER_AUTH_URL` | `.env` (not set) | ❌ Not configured | Auth flow broken |
| `CORS_ORIGIN` | `.env` (not set) | ❌ Not configured | CORS misconfig |
| Google/GitHub OAuth keys | `.env` (likely) | ⚠️ Plain text | OAuth account access |
| Supabase anon key | `.env` + `web.ts` | ✅ Public by design | Limited (RLS-bound) |

### 5.1 Remediation

| Action | Priority |
|--------|----------|
| Move secrets to environment variables only (never in code) | **Immediate** |
| Set `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` + `CORS_ORIGIN` | **Immediate** |
| Add `.env` to `.gitignore` (verify it's already there) | **Verify** |
| Use Supabase RLS + service_role key only in server context | **Verify** |
| Rotate all keys if `.env` has ever been committed | **Critical** |

---

## 6. Security Recommendations by Priority

### 6.1 Critical (Week 1)

1. **Set all missing env vars** (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`)
2. **Add security headers** (CSP, HSTS, X-Content-Type-Options, X-Frame-Options) to Hono server
3. **Implement rate limiting** on auth endpoints (5 attempts/minute per IP)
4. **Verify .gitignore** excludes `.env` and any credential files

### 6.2 High (Phase 1-2)

5. **Build permission resolution service** (user_roles → role_permissions → effective permissions)
6. **Add input validation + size limits** on all file upload endpoints
7. **Implement immutable audit logging** for all write operations
8. **Add account lockout** after 5 failed login attempts
9. **Integrate file upload malware scanning** (ClamAV)

### 6.3 Medium (Phase 3-4)

10. **Implement 2FA/TOTP** for Super Admin accounts
11. **Add API key rotation policy** + automated rotation
12. **Set up WAF** (Web Application Firewall) rules
13. **Implement session management** (list active sessions, remote revoke)
14. **Add audit log anomaly detection** (automated alert on suspicious patterns)

### 6.4 Low (Phase 5-6)

15. **Penetration testing** (quarterly)
16. **Bug bounty program** (future)
17. **Hardware Security Module (HSM)** for key management (future)
18. **Zero-trust architecture** (future)
