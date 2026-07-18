# Sentinel360 — Non-Functional Requirements

> **Document:** Non-Functional Requirements Specification
> **Parent Document:** Sentinel360 — AI-Powered Crime Detection & Scene Reconstruction System (v1.0)
> **Group:** Alpha Tech
> **Last Updated:** June 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [NFR-01: System Performance and Scalability](#2-nfr-01-system-performance-and-scalability)
3. [NFR-02: Processing Accuracy and Evidentiary Quality](#3-nfr-02-processing-accuracy-and-evidentiary-quality)
4. [NFR-03: Data Security and Integrity](#4-nfr-03-data-security-and-integrity)
5. [NFR-04: Availability and Reliability](#5-nfr-04-availability-and-reliability)
6. [NFR-05: Usability and Accessibility](#6-nfr-05-usability-and-accessibility)
7. [NFR-06: Maintainability and Portability](#7-nfr-06-maintainability-and-portability)
8. [NFR-07: Compliance and Legal](#8-nfr-07-compliance-and-legal)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the non-functional requirements for the Sentinel360 system. Non-functional requirements define the overall qualities, constraints, and characteristics of the system — how well the system performs, how secure it is, how available it must be, and how it must comply with legal and regulatory standards.

### 1.2 Requirement Identification

Each requirement is identified by a unique ID following the format `NFR-XX-NNN`, where:

- `NFR` = Non-Functional Requirement
- `XX` = Category number
- `NNN` = Sequential requirement number

### 1.3 Requirement Priority Definitions

| Priority | Definition                                                         |
| -------- | ------------------------------------------------------------------ |
| **P0**   | Critical — System cannot function without this requirement         |
| **P1**   | High — Core quality attribute required for operational viability   |
| **P2**   | Medium — Important for long-term sustainability and user adoption  |
| **P3**   | Low — Enhancement for future optimisation                         |

---

## 2. NFR-01: System Performance and Scalability

### 2.1 Overview

The system must support concurrent processing of large volumes of high-bitrate video footage across distributed urban networks while maintaining real-time performance characteristics. Scalability must be elastic to accommodate growth in camera nodes and user base without degradation.

### 2.2 Requirements

#### NFR-01-001: Data Throughput

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-01-001                                                     |
| **Title**        | Data Throughput Capacity                                       |
| **Priority**     | P0                                                             |
| **Description**  | The architecture must support the concurrent processing of thousands of hours of high-bitrate video footage across distributed urban networks |
| **Rationale**    | Urban deployments involve hundreds to thousands of cameras generating continuous high-resolution feeds |

**Specifications:**

| Specification             | Target Value                                               |
| ------------------------- | ---------------------------------------------------------- |
| Concurrent Streams (min)  | 500 simultaneous 4K streams                                |
| Concurrent Streams (max)  | 5,000 simultaneous streams (scaled)                        |
| Stream Resolution Support | 720p, 1080p, 4K, 8K                                       |
| Bitrate Tolerance         | Up to 50 Mbps per 4K stream                                |
| Aggregate Throughput      | ≥ 250 Gbps across the processing cluster                   |
| Storage Write Throughput  | ≥ 10 GB/s for video ingest                                 |

#### NFR-01-002: Processing Latency

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-01-002                                                     |
| **Title**        | End-to-End Processing Latency                                  |
| **Priority**     | P0                                                             |
| **Description**  | The system is mandated to achieve "Real-Time" status, defined as sub-second alert generation from the moment of behaviour detection |
| **Rationale**    | Enables proactive intervention; delays reduce operational value |

**Specifications:**

| Metric                         | Target                       | Measurement Point                             |
| ------------------------------ | ---------------------------- | --------------------------------------------- |
| Detection-to-Alert Latency     | < 1,000 ms                   | Behaviour occurs → alert delivered            |
| Frame Processing Time          | < 33 ms per frame            | Frame received → inference complete           |
| Attribute Extraction Latency   | < 500 ms per detection       | Detection → attributes available              |
| Re-ID Association Latency      | < 2,000 ms                   | New node detection → entity linked to existing ID |
| 3D Reconstruction Initiation   | < 30 seconds post-incident   | Incident flagged → reconstruction begins      |
| Dashboard Query Response       | < 500 ms for 95th percentile | User query → results displayed                |
| API Response Time (p95)        | < 200 ms                     | Request received → response sent              |

#### NFR-01-003: Elastic Scalability

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-01-003                                                     |
| **Title**        | Elastic Scalability                                           |
| **Priority**     | P0                                                             |
| **Description**  | The system shall use elastic compute resource allocation to prevent performance degradation during high-activity periods or network expansion |
| **Rationale**    | Crime patterns and camera network growth require dynamic resource management |

**Specifications:**

| Specification                | Target Value                                                 |
| ---------------------------- | ------------------------------------------------------------ |
| Scaling Model                | Horizontal (add/remove nodes) with automatic load balancing  |
| Auto-scaling Trigger         | CPU > 70% utilisation or queue depth > 1,000 frames          |
| Scale-up Time                | New node operational within 5 minutes of trigger              |
| Scale-down Time              | Node decommissioned within 2 minutes of decreased demand      |
| Max Nodes (Cluster)          | Unlimited (cloud); 50 nodes per site (on-premises)            |
| Storage Scaling              | Petabyte-scale with automatic tiering (hot/warm/cold)        |

#### NFR-01-004: Resource Efficiency

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-01-004                                                     |
| **Title**        | Resource Efficiency                                           |
| **Priority**     | P2                                                             |
| **Description**  | Edge inference models must operate within the resource constraints of typical edge hardware (e.g., NVIDIA Jetson, Raspberry Pi with AI accelerator) |
| **Rationale**    | Reduces deployment cost and enables installation at sites without server infrastructure |

**Specifications:**

| Specification            | Target Value                                       |
| ------------------------ | -------------------------------------------------- |
| Edge Device RAM Usage    | ≤ 4 GB                                             |
| Edge Device GPU/TPU      | ≤ 30 TOPS (trillion operations per second)         |
| Model Size               | ≤ 500 MB per model                                 |
| Power Consumption        | ≤ 25 W per edge device (excluding camera)          |
| Storage per Edge Node    | ≥ 256 GB SSD (local buffering)                     |

---

## 3. NFR-02: Processing Accuracy and Evidentiary Quality

### 3.1 Overview

AI models must achieve high confidence scores to ensure forensic admissibility, and the system must provide objective, machine-driven analysis to eliminate human subjectivity and fatigue-related oversight.

### 3.2 Requirements

#### NFR-02-001: Inference Confidence Thresholds

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-02-001                                                     |
| **Title**        | Minimum Inference Confidence Thresholds                        |
| **Priority**     | P0                                                             |
| **Description**  | AI models must achieve a minimum confidence score of 95% for facial and LPR (Licence Plate Recognition) attribute extraction to ensure forensic admissibility |
| **Rationale**    | Court-admissible evidence requires high certainty in identification |

**Specifications:**

| Detection Task              | Minimum Confidence | Target Confidence | Measurement Method               |
| --------------------------- | ------------------ | ----------------- | -------------------------------- |
| Facial Recognition (match)  | 95%                | 98%               | ROC curve, True Positive Rate    |
| ALPR — Text Extraction      | 95%                | 97%               | Character Error Rate (CER)       |
| Person Detection            | 95%                | 98%               | mAP (mean Average Precision)     |
| Vehicle Detection           | 95%                | 98%               | mAP                              |
| Abnormal Activity Detection | 90%                | 95%               | Precision / Recall               |
| Attribute Classification    | 85%                | 92%               | Top-1 Accuracy                   |
| Re-identification Matching  | 85%                | 95%               | Rank-1 Accuracy                  |

#### NFR-02-002: Error Mitigation

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-02-002                                                     |
| **Title**        | Human Error Mitigation                                        |
| **Priority**     | P1                                                             |
| **Description**  | The system must provide objective, machine-driven analysis to eliminate the subjectivity and fatigue-related oversights inherent in manual surveillance review |
| **Rationale**    | Core value proposition; distinguishes Sentinel360 from passive systems |

**Specifications:**

| Specification               | Target Value                                      |
| --------------------------- | ------------------------------------------------- |
| False Positive Rate         | ≤ 5% for Person/Vehicle detection alerts         |
| False Negative Rate         | ≤ 3% for confirmed incident detection             |
| Alert Consistency           | Same input produces identical output (deterministic) |
| Fatigue Impact              | Performance invariant over 24-hour operation      |
| Comparison Benchmark        | ≥ 90% improvement in detection rate vs. unaided human review |

#### NFR-02-003: Model Validation and Versioning

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-02-003                                                     |
| **Title**        | AI Model Validation and Versioning                            |
| **Priority**     | P1                                                             |
| **Description**  | All AI models shall be versioned, and each inference output shall record the model version used |
| **Rationale**    | Forensic admissibility requires traceability of the analytical method |

**Specifications:**

| Specification         | Detail                                                        |
| --------------------- | ------------------------------------------------------------- |
| Model Versioning      | Semantic versioning (MAJOR.MINOR.PATCH)                       |
| Validation Dataset    | Held-out test set with ground-truth labels                     |
| Validation Frequency  | Before every deployment; minimum quarterly re-validation       |
| Performance Regression | Automated CI/CD check: no degradation > 1% on key metrics    |
| Model Registry        | Central repository of all deployed models with metadata       |

#### NFR-02-004: Adversarial Robustness

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-02-004                                                     |
| **Title**        | Adversarial Robustness                                        |
| **Priority**     | P2                                                             |
| **Description**  | The system shall be resistant to common adversarial techniques (e.g., occlusion, camouflage, patterned clothing intended to confuse AI) |
| **Rationale**    | Suspects may actively attempt to evade AI detection            |

**Specifications:**

| Specification            | Target Value                                  |
| ------------------------ | --------------------------------------------- |
| Occlusion Robustness     | Maintain detection at ≤ 50% occlusion         |
| Adversarial Patch Test   | < 10% degradation against known patch attacks |
| Low-Light Performance    | Maintain ≥ 85% confidence at 10 lux           |
| Weather Robustness       | Maintain ≥ 80% confidence in rain/fog (simulated) |

---

## 4. NFR-03: Data Security and Integrity

### 4.1 Overview

The system must implement rigorous security controls to ensure the confidentiality, integrity, and availability of forensic evidence, and to maintain the legal chain of custody required for court admissibility.

### 4.2 Requirements

#### NFR-03-001: Forensic Chain of Custody

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-03-001                                                     |
| **Title**        | Cryptographic Chain of Custody                                |
| **Priority**     | P0                                                             |
| **Description**  | The system shall implement cryptographic hashing on all extracted evidence to prevent tampering and ensure legal admissibility |
| **Rationale**    | Without chain of custody, evidence is inadmissible in court    |

**Specifications:**

| Specification            | Detail                                                         |
| ------------------------ | -------------------------------------------------------------- |
| Hash Algorithm           | SHA-256 (minimum)                                              |
| Evidence Types Covered   | Video clips, still images, attribute data, 3D models, reports  |
| Hash Granularity         | Per evidence item AND per incident package                     |
| Hash Storage             | Immutable audit log (append-only)                              |
| Verification Mechanism   | Built-in verification tool to validate evidence integrity      |
| Chain Documentation     | Every access, transfer, or export logged with user ID and timestamp |

#### NFR-03-002: Encryption at Rest

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-03-002                                                     |
| **Title**        | Encryption at Rest                                            |
| **Priority**     | P0                                                             |
| **Description**  | All forensic insights, raw video data, and metadata stored by the system must be encrypted using AES-256 encryption |
| **Rationale**    | Protects sensitive surveillance data from unauthorised access in the event of storage media compromise |

**Specifications:**

| Specification             | Target Value                                                |
| ------------------------- | ----------------------------------------------------------- |
| Algorithm                 | AES-256 (GCM mode preferred)                                |
| Key Management            | Hardware Security Module (HSM) or cloud KMS                 |
| Key Rotation Policy       | Every 90 days                                               |
| Scope                     | All databases, object storage, backups, logs                |
| Performance Impact        | < 5% overhead on read/write operations                      |
| Re-encryption on Demand   | Support for ad-hoc re-encryption if key compromised          |

#### NFR-03-003: Encryption in Transit

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-03-003                                                     |
| **Title**        | Encryption in Transit                                         |
| **Priority**     | P0                                                             |
| **Description**  | All data transmitted between system components and external integrations must be encrypted using TLS 1.3 |
| **Rationale**    | Prevents interception of surveillance intelligence during transmission |

**Specifications:**

| Specification        | Target Value                                       |
| -------------------- | -------------------------------------------------- |
| Protocol             | TLS 1.3 (TLS 1.2 minimum fallback)                 |
| Certificate          | Valid X.509 from trusted CA                        |
| Cipher Suites        | Forward-secrecy ciphers only                       |
| mTLS for Intra-system| Mutual TLS for service-to-service communication    |
| API Security         | OAuth 2.0 + JWT for all API endpoints              |

#### NFR-03-004: Role-Based Access Control (RBAC)

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-03-004                                                     |
| **Title**        | Role-Based Access Control                                     |
| **Priority**     | P0                                                             |
| **Description**  | The system shall implement RBAC to ensure sensitive surveillance intelligence is only accessible by authorised personnel |
| **Rationale**    | Prevents unauthorised access to sensitive forensic data        |

**Specifications:**

| Role            | Access Level                                                        |
| --------------- | ------------------------------------------------------------------- |
| Community Member | Public wanted feed, submit sightings, receive alerts                |
| Security Company | Wanted feed + CCTV submission + operational alerts                  |
| Law Enforcement  | Full case data, snapshot verification, sighting verification, status updates |
| Admin            | Profile management, alert management, snapshot quality control      |
| Super Admin      | All permissions + user management, audit logs, system configuration |

**RBAC Enforcement:**

| Specification          | Detail                                              |
| ---------------------- | --------------------------------------------------- |
| Access Control Model   | Attribute-Based Access Control (ABAC) + RBAC        |
| Permission Granularity | Per-action, per-entity type, per-geographic region  |
| Session Management     | Token-based (JWT) with configurable expiry          |
| Multi-Factor Auth      | Required for Admin and Super Admin roles            |
| Inactivity Timeout     | Auto-logout after 15 minutes of inactivity          |

#### NFR-03-005: Audit Logging

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-03-005                                                     |
| **Title**        | Comprehensive Audit Logging                                   |
| **Priority**     | P1                                                             |
| **Description**  | All system access and data modifications shall be logged in an immutable audit trail |
| **Rationale**    | Required for accountability, compliance, and forensic integrity |

**Specifications:**

| Specification          | Detail                                                  |
| ---------------------- | ------------------------------------------------------- |
| Events Logged          | Login/logout, data access, data modification, alerts, exports |
| Log Data               | User ID, timestamp, IP address, action type, resource   |
| Log Storage            | Append-only, immutable (WORM storage)                   |
| Retention Period       | Minimum 7 years (legal requirement for forensic evidence) |
| Log Protection         | Logs cannot be edited or deleted by any user (including Super Admin) |
| Log Export             | Exportable to CSV, JSON, SIEM-compatible formats        |

#### NFR-03-006: Data Backup and Disaster Recovery

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-03-006                                                     |
| **Title**        | Backup and Disaster Recovery                                  |
| **Priority**     | P1                                                             |
| **Description**  | The system shall implement automated backup and disaster recovery procedures to prevent data loss |
| **Rationale**    | Forensic evidence cannot be reconstructed if lost              |

**Specifications:**

| Specification             | Target Value                                     |
| ------------------------- | ------------------------------------------------ |
| Backup Frequency          | Continuous (real-time replication) + daily snapshots |
| Recovery Point Objective (RPO) | ≤ 5 minutes of data loss                       |
| Recovery Time Objective (RTO) | ≤ 1 hour for full system restoration          |
| Backup Storage            | Geographically separate location                 |
| Backup Encryption         | AES-256 (same as primary storage)               |
| DR Testing                | Full restore test minimum quarterly              |

#### NFR-03-007: Intrusion Detection and Prevention

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-03-007                                                     |
| **Title**        | Intrusion Detection and Prevention                            |
| **Priority**     | P2                                                             |
| **Description**  | The system shall implement network-level intrusion detection and prevention mechanisms |
| **Rationale**    | Critical infrastructure requires protection against cyber attacks |

**Specifications:**

| Specification     | Target Value                                       |
| ----------------- | -------------------------------------------------- |
| IDS/IPS           | Signature-based + behavioural anomaly detection    |
| Rate Limiting     | Per-IP and per-API-key rate limiting               |
| DDoS Protection   | Mitigation at network edge                         |
| Security Monitoring | 24/7 automated monitoring + incident alerting    |
| Vulnerability Scanning | Weekly automated scans; quarterly penetration tests |

---

## 5. NFR-04: Availability and Reliability

### 5.1 Overview

The system must maintain high availability and reliability to support continuous 24/7 surveillance operations. Downtime directly impacts public safety.

### 5.2 Requirements

#### NFR-04-001: System Availability

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-04-001                                                     |
| **Title**        | System Availability Target                                     |
| **Priority**     | P0                                                             |
| **Description**  | The system shall achieve 99.9% uptime, with planned maintenance windows not exceeding 4 hours per month |
| **Rationale**    | Continuous surveillance requires near-constant system availability |

**Specifications:**

| Metric                   | Target Value                    |
| ------------------------ | ------------------------------- |
| Annual Uptime            | 99.9% (≤ 8.76 hours downtime/year) |
| Planned Maintenance      | ≤ 4 hours/month, announced ≥ 7 days in advance |
| Unplanned Downtime       | ≤ 30 minutes per incident       |
| Degraded Mode            | Core detection continues during partial outages |

#### NFR-04-002: Redundancy

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-04-002                                                     |
| **Title**       | System Redundancy                                              |
| **Priority**     | P1                                                             |
| **Description**  | Critical system components shall be deployed with N+1 redundancy |
| **Rationale**    | Single points of failure must not cause system-wide outage     |

**Specifications:**

| Component           | Redundancy Model       | Failover Time       |
| ------------------- | ---------------------- | ------------------- |
| Processing Servers  | Active-active cluster  | < 10 seconds         |
| Database            | Primary-replica (synchronous) | < 30 seconds  |
| Storage             | RAID 6 + replication   | No interruption     |
| Network             | Dual-path, redundant switches | < 1 second     |
| Edge Nodes          | Local buffering + failover to adjacent node | < 5 seconds |

#### NFR-04-003: Graceful Degradation

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-04-003                                                     |
| **Title**        | Graceful Degradation                                          |
| **Priority**     | P2                                                             |
| **Description**  | During partial system failures, the system shall continue to provide core detection and alerting capabilities |
| **Rationale**    | Safety-critical system must not completely fail on component loss |

**Degradation Modes:**

| Failure Scenario                  | System Behaviour                                                      |
| --------------------------------- | --------------------------------------------------------------------- |
| Central DB Unavailable            | Edge nodes continue detection; alerts queued locally                  |
| Network Partition                 | Edge nodes operate autonomously; sync when reconnected                |
| AI Inference Node Down            | Traffic redistributed to remaining nodes                              |
| Storage Full                      | Auto-archiving and oldest data eviction (configurable policy)         |
| Camera Feed Lost                  | Alert raised; system continues monitoring remaining feeds             |

---

## 6. NFR-05: Usability and Accessibility

### 6.1 Overview

The system interfaces must be designed for efficient use by diverse user types ranging from security operators to law enforcement officials, with minimal training required.

### 6.2 Requirements

#### NFR-05-001: User Interface Responsiveness

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-05-001                                                     |
| **Title**        | UI Responsiveness                                             |
| **Priority**     | P1                                                             |
| **Description**  | All user interface interactions shall complete within 2 seconds |
| **Rationale**    | Delays during incident response reduce operational effectiveness |

**Specifications:**

| Interaction                  | Maximum Response Time |
| ---------------------------- | --------------------- |
| Page Load (initial)          | 3 seconds             |
| Page Load (subsequent)       | 1 second              |
| Search Query                  | 500 ms                |
| Filter/Sort                   | 500 ms                |
| Image Load                   | 1 second              |
| 3D Model Load                | 5 seconds             |
| Alert Acknowledgment         | 200 ms                |

#### NFR-05-002: Mobile Accessibility

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-05-002                                                     |
| **Title**        | Mobile Accessibility                                          |
| **Priority**     | P2                                                             |
| **Description**  | The system shall provide a responsive web interface and mobile-optimised views for critical functions |
| **Rationale**    | Security personnel and law enforcement require mobile access during field operations |

**Supported Platforms:**

| Platform        | Support Level         |
| --------------- | --------------------- |
| Mobile Web      | Full responsive design |
| iOS Safari      | Full support (latest 2 major versions) |
| Android Chrome  | Full support (latest 2 major versions) |
| Tablet          | Optimised layout      |

#### NFR-05-003: Accessibility Compliance

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-05-003                                                     |
| **Title**        | Accessibility Compliance                                      |
| **Priority**     | P2                                                             |
| **Description**  | The system shall comply with WCAG 2.1 Level AA accessibility standards |
| **Rationale**    | Ensures usability for all personnel regardless of ability      |

**Specifications:**

| Guideline     | Target Level |
| ------------- | ------------ |
| WCAG 2.1      | Level AA     |
| Colour Contrast | ≥ 4.5:1 for normal text |
| Keyboard Navigation | All functions accessible via keyboard |
| Screen Reader Support | ARIA labels on all interactive elements |

---

## 7. NFR-06: Maintainability and Portability

### 7.1 Overview

The system must be designed for ease of maintenance, update, and deployment across diverse hardware environments.

### 7.2 Requirements

#### NFR-06-001: Modular Architecture

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-06-001                                                     |
| **Title**        | Modular Architecture                                          |
| **Priority**     | P1                                                             |
| **Description**  | The system shall use a modular, microservices-based architecture allowing independent deployment and updates of components |
| **Rationale**    | Enables continuous updates without system-wide downtime        |

**Specifications:**

| Service               | Function                                          |
| --------------------- | ------------------------------------------------- |
| Detection Service     | AI inference and behaviour analysis               |
| Extraction Service    | Attribute extraction and profiling                |
| Tracking Service      | Re-identification and path mapping                |
| Reconstruction Service| 3D scene synthesis                                |
| Reporting Service     | Report generation and export                      |
| Notification Service  | Alert routing and delivery                        |
| Auth Service          | Authentication and authorisation                  |

#### NFR-06-002: Containerisation

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-06-002                                                     |
| **Title**        | Containerisation                                              |
| **Priority**     | P1                                                             |
| **Description**  | All system components shall be containerised (Docker) for consistent deployment across environments |
| **Rationale**    | Ensures reproducibility and simplifies deployment             |

**Specifications:**

| Specification       | Detail                                     |
| ------------------- | ------------------------------------------ |
| Container Runtime   | Docker + Kubernetes (or equivalent)        |
| Image Registry      | Private registry with vulnerability scanning |
| Orchestration       | Kubernetes for auto-scaling and self-healing |
| Health Checks       | Liveness, readiness, and startup probes    |
| Resource Limits     | CPU and memory limits per container        |

#### NFR-06-003: Monitoring and Observability

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-06-003                                                     |
| **Title**        | Monitoring and Observability                                  |
| **Priority**     | P1                                                             |
| **Description**  | The system shall expose metrics, logs, and traces for comprehensive monitoring |
| **Rationale**    | Essential for operational management and incident response     |

**Specifications:**

| Metric Type    | Tool/Framework      | Examples                                      |
| -------------- | ------------------- | --------------------------------------------- |
| Metrics        | Prometheus          | CPU, memory, latency, throughput, error rates |
| Logging        | Structured (JSON)   | Application logs, audit logs, access logs     |
| Tracing        | OpenTelemetry       | End-to-end request tracing                   |
| Dashboards     | Grafana             | Real-time operational dashboards             |
| Alerts         | Alertmanager        | PagerDuty, email, Slack integrations         |

---

## 8. NFR-07: Compliance and Legal

### 8.1 Overview

The system must comply with applicable laws, regulations, and standards governing surveillance, data protection, and forensic evidence.

### 8.2 Requirements

#### NFR-07-001: Data Protection Compliance

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-07-001                                                     |
| **Title**        | Data Protection Compliance                                    |
| **Priority**     | P1                                                             |
| **Description**  | The system shall comply with the Protection of Personal Information Act (POPIA) and applicable data protection regulations |
| **Rationale**    | Legal requirement for processing personal information in South Africa |

**Specifications:**

| Requirement                  | Implementation                                       |
| ---------------------------- | ---------------------------------------------------- |
| Purpose Limitation           | Data collected only for specified surveillance purpose |
| Data Minimisation            | Only necessary attributes extracted and stored       |
| Retention Limitation         | Configurable retention policy with auto-deletion     |
| Subject Access Requests      | API to export/delete personal data on request        |
| Consent Management           | Notice and consent mechanism where required          |
| Data Breach Notification     | Automated breach detection and notification workflow  |

#### NFR-07-002: Forensic Evidence Standards

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-07-002                                                     |
| **Title**        | Forensic Evidence Standards                                   |
| **Priority**     | P1                                                             |
| **Description**  | The system shall comply with recognised forensic evidence handling standards (e.g., ISO/IEC 27037, SWGDE) |
| **Rationale**    | Ensures evidence is admissible and defensible in court         |

**Specifications:**

| Standard                  | Applicability                   |
| ------------------------- | ------------------------------- |
| ISO/IEC 27037:2012        | Digital evidence handling       |
| SWGDE Best Practices      | Forensic video analysis         |
| SAPS Evidence Guidelines  | South African Police Service    |

#### NFR-07-003: Data Residency

| Attribute        | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **ID**           | NFR-07-003                                                     |
| **Title**        | Data Residency                                                |
| **Priority**     | P2                                                             |
| **Description**  | All surveillance data and forensic evidence shall be stored within South African borders |
| **Rationale**    | Legal and jurisdictional requirements for law enforcement data |

**Specifications:**

| Requirement              | Detail                                                 |
| ------------------------ | ------------------------------------------------------ |
| Data Storage Location    | South Africa (primary and backup)                      |
| Cloud Provider           | Must support SA-based data centres (AWS Cape Town, Azure SA North) |
| Cross-Border Transfer    | Prohibited unless explicitly authorised by law         |

---

## Document Revision History

| Version | Date      | Author     | Description of Changes                         |
| ------- | --------- | ---------- | ---------------------------------------------- |
| 1.0     | June 2026 | Alpha Tech | Initial non-functional requirements specification |
