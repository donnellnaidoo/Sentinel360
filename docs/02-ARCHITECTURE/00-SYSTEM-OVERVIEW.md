# Sentinel360 — System Architecture Overview

> **Document:** 00-SYSTEM-OVERVIEW.md  
> **Version:** 1.0  
> **Status:** Approved  
> **Last Updated:** June 2026

---

## Executive Summary

Sentinel360 is an AI-powered crime detection and scene reconstruction system designed to transform passive CCTV surveillance into real-time, actionable forensic intelligence. The system processes live video feeds from 360-degree cameras across distributed urban networks, applying deep learning models at the edge to detect suspicious behaviour, identify persons and vehicles of interest, track movement across camera nodes, and reconstruct crime scenes in 3D for investigative analysis.

The architecture described in this document set is designed for production-grade deployment, serving multiple user tiers — Community Members, Security Operators, Law Enforcement Officers, System Administrators, and Super Administrators — with appropriate access control, auditability, and scalability from day one.

---

## System Purpose

| Goal | Description |
|------|-------------|
| **Real-time Detection** | Identify suspicious behaviour and known persons/vehicles within sub-second latency from camera feed ingestion |
| **Forensic Intelligence** | Generate court-admissible evidence with cryptographic chain-of-custody, confidence scoring, and complete audit trails |
| **Scalable Surveillance** | Support thousands of concurrent camera feeds across geographically distributed sites with elastic resource allocation |
| **Multi-stakeholder Access** | Serve community members, private security, law enforcement, and administrators through a unified platform with role-appropriate interfaces |
| **3D Reconstruction** | Synthesize 360-degree video into interactive 3D crime scene models for immersive investigative analysis |

---

## Architectural Philosophy

### 1. Domain-Driven Design First
Every bounded context in Sentinel360 maps to a real-world domain: Surveillance Ingestion, Person Identification, Case Management, Evidence Chain-of-Custody, Alerting, and User Administration. We decompose by domain before technology.

### 2. Modular Monolith with Extraction Path
We start with a **modular monolith** — strongly-separated domains within a single deployable unit — and extract to microservices only when warranted by independent scaling needs or team autonomy. This avoids premature distributed-system complexity while keeping the extraction path clean.

> **Why not microservices from the start?**  
> The team size (6 members) and early-stage product maturity make a monolith more productive. The modular boundaries are strict enough that extraction later is straightforward.

### 3. Edge + Cloud Hybrid Processing
Heavy inference (facial recognition, ALPR, behaviour detection) runs on **edge nodes** (GPU-equipped devices co-located with cameras) to minimize latency and bandwidth. Aggregation, case management, and long-term storage run in the **cloud**.

### 4. Security by Design
AES-256 encryption at rest and in transit, cryptographic evidence hashing, RBAC with 6 roles, mandatory 2FA for Super Admin, and immutable audit logs are not optional — they are foundational.

### 5. Reversible Decisions
Where possible, architectural decisions favour reversibility. Database technology, queue systems, and deployment topology are chosen to allow migration without rewrites.

---

## Key Design Decisions

| # | Decision | Rationale | Trade-off |
|---|----------|-----------|-----------|
| 1 | Modular monolith > microservices | Team size of 6; simpler DevOps; faster iteration | Independent scaling requires extraction later |
| 2 | PostgreSQL > NoSQL | Strong relational integrity for evidence chain-of-custody; structured case data; ACID compliance | Less flexible for unstructured video metadata (mitigated by JSONB columns) |
| 3 | Edge inference + cloud aggregation | Sub-second alert latency requires local processing; cloud handles cross-camera re-identification | Edge device management complexity; model distribution overhead |
| 4 | Kafka for async pipelines | Durable, replayable event log for video processing pipeline; enables exactly-once semantics | Operational complexity of running Kafka |
| 5 | JWT + refresh token auth | Stateless API authentication; enables mobile and web clients | Token revocation requires blacklist; mitigated by short TTL + refresh flow |
| 6 | CQRS for investigation queries | Case investigation involves complex read models (timeline, evidence, movements) that differ from write models | Two code paths to maintain for reads vs writes |
| 7 | S3-compatible object storage for media | Scalable, cost-effective blob storage with CDN integration | Not a traditional filesystem; requires presigned URLs for access |

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────────────┐
│                        USERS LAYER                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌─────────┐ │
│  │ Community│  │ Security │  │  Law Enf │  │ Admin  │  │SuperAdmin│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  └─────────┘ │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼───────────────────────────────────────────┐
│                      APPLICATION LAYER                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Web Client  │  │  Mobile App  │  │  API Gateway  │               │
│  │ (React/TS)   │  │ (React Native│  │ (Kong/Nginx)  │               │
│  └─────────────┘  └──────────────┘  └──────┬───────┘               │
└─────────────────────────────────────────────┬─────────────────────────┘
                                               │
┌──────────────────────────────────────────────▼────────────────────────┐
│                      AI PROCESSING LAYER                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐     │
│  │  Edge    │  │  Face    │  │  ALPR    │  │  3D Scene        │     │
│  │ Inference│  │  Re-ID   │  │  Engine  │  │  Reconstruction  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘     │
│  ┌──────────┐  ┌──────────────────────────────────────────┐         │
│  │Behaviour │  │  Confidence Scorer & Model Versioning    │         │
│  │Detection │  └──────────────────────────────────────────┘         │
│  └──────────┘                                                       │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────────┐
│                         DATA LAYER                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │PostgreSQL│  │  Redis   │  │  Kafka   │  │  S3 Object Store │   │
│  │ (Relational)│ (Cache)  │ │ (Events)  │  │  (Video/Images)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │360° Cam  │  │ Edge GPU │  │  Docker  │  │  Kubernetes      │   │
│  │Nodes     │  │ (Jetson) │  │Containers│  │  Orchestration   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  CDN (CloudFront/Cloudflare) for media delivery              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Document Map

| Document | Description |
|----------|-------------|
| [01-LAYERED-ARCHITECTURE.md](./01-LAYERED-ARCHITECTURE.md) | Full detail on all 5 layers with component diagrams |
| [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) | Complete normalized database schema with all entities, relationships, and indexes |
| [03-API-ARCHITECTURE.md](./03-API-ARCHITECTURE.md) | RESTful API design, authentication flow, WebSocket design |
| [04-SECURITY-ARCHITECTURE.md](./04-SECURITY-ARCHITECTURE.md) | Comprehensive security model including RBAC matrix, chain of custody |
| [05-AI-PIPELINE-ARCHITECTURE.md](./05-AI-PIPELINE-ARCHITECTURE.md) | AI/ML pipeline design for all detection and reconstruction workflows |
| [06-DEPLOYMENT-ARCHITECTURE.md](./06-DEPLOYMENT-ARCHITECTURE.md) | Deployment strategy, containerization, scaling, CDN |
| [07-COMPONENT-ARCHITECTURE.md](./07-COMPONENT-ARCHITECTURE.md) | Frontend component architecture, state management, route design, Docket Page |

---

## ADR Index

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Modular Monolith with Extraction Path | Accepted |
| ADR-002 | PostgreSQL as Primary Database | Accepted |
| ADR-003 | Edge + Cloud Hybrid Processing | Accepted |
| ADR-004 | Kafka for Asynchronous Pipeline Events | Accepted |
| ADR-005 | JWT Bearer Token Authentication | Accepted |
| ADR-006 | CQRS for Investigation Read Models | Proposed |
| ADR-007 | S3-Compatible Object Storage for Media | Accepted |
| ADR-008 | React + TypeScript for Frontend | Accepted |
| ADR-009 | 2FA for Super Admin Operations | Accepted |
| ADR-010 | Cryptographic Evidence Hashing | Accepted |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | Software Architect | Initial architecture baseline |
