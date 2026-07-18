# Sentinel360 — South African Legal Compliance Framework

> **Document:** SA Legal & Regulatory Compliance Assessment
> **Group:** Alpha Tech
> **Jurisdiction:** Republic of South Africa
> **Last Updated:** June 2026

---

## 1. Applicable South African Legislation

| Law / Regulation | Relevance to Sentinel360 | Key Requirements |
|------------------|--------------------------|------------------|
| **POPIA** (Protection of Personal Information Act, 2013) | Processing of personal information of data subjects (suspects, community members, officers) | 8 conditions: accountability, purpose limitation, minimisation, retention, SAR, security, openness, data subject participation |
| **Criminal Procedure Act 51 of 1977** | Admissibility of digital evidence in criminal proceedings | Chain of custody, authenticity, integrity of evidence |
| **Electronic Communications and Transactions Act 25 of 2002** | Admissibility of electronic evidence | Section 15: admissibility of electronic documents; Section 17: digital signatures |
| **South African Police Service (SAPS) Standing Orders** | Integration with law enforcement systems | Data format standards, evidence handling protocols |
| **Regulation of Interception of Communications Act (RICA) 70 of 2002** | Surveillance and monitoring of communications | Lawful interception requirements; restrictions on monitoring |
| **National Key Points Act 102 of 1980** | Security of designated national infrastructure | If deployed at a National Key Point |
| **Consumer Protection Act 68 of 2008** | Community-facing interfaces (mobile app) | Fair marketing, privacy notices |

---

## 2. POPIA Compliance Assessment

### 2.1 The 8 POPIA Conditions

| # | Condition | Requirement | Sentinel360 Status | Gap |
|---|-----------|-------------|-------------------|-----|
| 1 | **Accountability** | Responsible party must ensure compliance | 📝 Not documented or assigned | No POPIA compliance officer role; no compliance framework |
| 2 | **Purpose Limitation** | Data collected only for specified, lawful purpose | ✅ Stated purpose (crime detection, forensic investigation) | Acceptable but should be formalised in privacy policy |
| 3 | **Minimisation** | Only necessary data collected | 📝 Stated in NFR-07-001 but not enforced | No technical controls limiting data collection scope |
| 4 | **Retention Limitation** | Data not kept longer than necessary | 📝 7-year retention documented; no enforcement | No automated retention/archival/deletion service |
| 5 | **Subject Access Requests** | Data subjects can request access to their data | ❌ Not implemented | No SAR API, no data export for individuals |
| 6 | **Security Safeguards** | Appropriate security measures | 🔶 Partially (encryption, RBAC middleware) | Missing: chain of custody, audit immutability, IDS |
| 7 | **Openness** | Documentation and notification | 📝 Privacy policy referenced but not written | No privacy policy document; no data processing notice |
| 8 | **Data Subject Participation** | Right to correct or delete data | ❌ Not implemented | No profile correction/deletion for community members |

### 2.2 POPIA-Specific Mechanisms Required

| Mechanism | Description | Priority | Implementation Reference |
|-----------|-------------|----------|--------------------------|
| **Privacy Policy** | Published privacy notice explaining data processing | **High** | New document in docs/ + link in app footer |
| **Consent Mechanism** | Opt-in consent for data collection at registration | **Critical** | Add to registration flow |
| **Data Subject Access Request (SAR) API** | API for individuals to request their data | **High** | New tRPC router + admin interface |
| **Data Deletion Request API** | API to request deletion of personal data | **High** | New tRPC router with verification workflow |
| **Data Breach Notification** | Automated breach detection + notification workflow | **Medium** | New service + notification template |
| **Retention Schedule** | Configurable per-data-type retention periods | **High** | Build on Phase 6 data retention service |
| **Processing Register** | Record of all data processing activities | **Medium** | New admin page + database table |

---

## 3. Criminal Procedure Act — Evidence Admissibility

### 3.1 Requirements for Digital Evidence

| Requirement | Sentinel360 Implementation | Status |
|-------------|---------------------------|--------|
| **Originality** | Evidence must be original or admissible copy | ❌ No evidence capture pipeline |
| **Authenticity** | Must prove evidence is what it claims to be | 📝 SHA-256 hashing planned but not built |
| **Integrity** | Must show evidence hasn't been tampered with | 📝 Chain of custody planned but not built |
| **Chain of Custody** | Every transfer/access must be logged | ❌ Not implemented |
| **Reliability** | System producing evidence must be reliable | ❌ No AI model validation records |
| **Witness Statement** | Operator/investigator can testify to process | 📝 UI audit trail planned |

### 3.2 Section 15 of ECTA — Electronic Evidence

| Requirement | Implementation Plan | Status |
|-------------|-------------------|--------|
| **Output of computer system** | Evidence must be produced by a system that was operating correctly | 📝 System health logs needed |
| **System integrity** | Must show the system was functioning properly at the time | ❌ No operational logging |
| **Collateral evidence** | Evidence may be challenged with proof of system malfunction | 📝 Audit logs should capture system errors |

---

## 4. SAPS Integration Standards

### 4.1 Data Format Requirements

| Standard | Sentinel360 Alignment | Status |
|----------|----------------------|--------|
| SAPS Case Number Format | Must align with existing SAPS docket numbering | ❌ Not researched |
| SAPS Evidence Categories | Must use standardised crime category codes | 📝 Reference in FR-05-004 |
| SAPS XML/JSON Schema | Must produce exports compatible with SAPS CMS | ❌ Not aligned |
| SAPS Chain of Custody Forms | Must produce equivalent digital chain | 📝 Planned in Phase 3 |
| SAPS ID Requirements | Must use SA ID number format validation | 🔶 Not implemented in profile forms |

### 4.2 Recommended Integration Approach

```
┌──────────────────┐         ┌──────────────────┐
│  Sentinel360      │         │  SAPS CMS        │
│                   │         │                  │
│  Export Service ──┼─────────┼──> Import API    │
│  (XML/JSON/PDF)   │  HTTPS  │  (Webhook/SFTP)  │
│                   │  mTLS   │                  │
│  Webhook Engine ──┼─────────┼──> Event Stream   │
│  (Case Updates)   │  Auth   │  (Real-time)     │
└──────────────────┘         └──────────────────┘
```

---

## 5. RICA Compliance

### 5.1 Assessment

| Requirement | Application to Sentinel360 | Status |
|-------------|---------------------------|--------|
| **Lawful Interception** | Only applicable if intercepting communications | 🔶 Unclear — CCTV is visual surveillance, not communications |
| **Interception Direction** | Must have judicial authorisation | 📝 System is for post-incident investigation, not live interception |
| **Restrictions** | Cannot intercept without authorisation | ✅ System designed for public spaces / private property with consent |

> **Note:** Sentinel360 processes publicly visible activity in public spaces and private property with consent. RICA compliance is not the primary regulatory concern, but legal advice should be sought for specific deployments.

---

## 6. Recommended Compliance Controls Implementation

### 6.1 Priority Matrix

| Control | Regulation | Impact | Effort | Priority |
|---------|-----------|--------|--------|----------|
| SHA-256 Chain of Custody | CPA, ECTA | Legal admissibility | 20h | P0 |
| Consent at Registration | POPIA Section 11 | Legal basis for processing | 8h | P0 |
| Privacy Policy | POPIA Section 17 | Transparency | 4h | P0 |
| Audit Log Immutability | CPA, POPIA | Evidence integrity | 16h | P0 |
| Retention Policy Engine | POPIA Section 14 | Data minimisation | 12h | P1 |
| SAR API | POPIA Section 23 | Data subject rights | 10h | P1 |
| Deletion API | POPIA Section 24 | Data subject rights | 10h | P1 |
| SAPS Schema Alignment | FR-05-004 | Interoperability | 16h | P1 |
| Breach Notification | POPIA Section 22 | Incident response | 8h | P2 |
| Processing Register | POPIA Section 14 | Accountability | 6h | P2 |
| SA ID Validation | SAPS Standards | Data quality | 4h | P2 |
| Data Residency Policy | POPIA, NFR-07-003 | Jurisdiction | 2h | P2 |

### 6.2 POPIA Implementation Roadmap

```
Phase 1 (MVP):    Privacy Policy + Consent + Basic Audit Logs
Phase 2 (Core):   SHA-256 Chain of Custody + Retention Policy + SAR API
Phase 3 (Complete): Breach Notification + Deletion API + Processing Register
```

---

## 7. Liability & Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| POPIA fine for non-compliance | Medium | R10M+ or 10% turnover | Implement Phase 1 POPIA controls before live deployment |
| Evidence ruled inadmissible | High | Case dismissed | SHA-256 chain + audit immutability must be in place |
| SAPS integration rejection | Medium | No adoption | Align with SAPS standards from Phase 2; iterate with feedback |
| Data breach of surveillance data | Low | R10M+ fine + reputation | Encryption + IDS + access controls + breach notification |
| Wrongful identification (AI error) | Medium | Civil liability | Human-in-the-loop verification; confidence thresholds |
| Privacy violation lawsuit | Medium | Civil damages | Consent mechanism + privacy policy + purpose limitation |
