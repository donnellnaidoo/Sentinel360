# Sentinel360 — Documentation

> **AI-Powered Crime Detection & Scene Reconstruction System**

## Documentation Map

| # | Directory | Contents |
|---|-----------|----------|
| 01 | `01-REQUIREMENTS/` | System overview, functional/non-functional requirements, user stories, use cases |
| 02 | `02-ARCHITECTURE/` | System architecture — layered, database, API, security, AI pipeline, deployment, components |
| 03 | `03-DOMAIN-MODEL/` | Bounded context specifications — entities, state machines, business rules per domain |
| 04 | `04-BACKEND/` | Backend implementation — setup, database, auth, API, services, testing, file structure |
| 05 | `05-FRONTEND-WEB/` | Web frontend — setup, components, routes, pages, state management, API layer, styling |
| 06 | `06-MOBILE-APP/` | Mobile app — requirements, screens, navigation, API integration, push notifications |
| 07 | `07-DATABASE/` | Database design, schema, relationships, **Supabase migration files** |
| 08 | `08-INFRASTRUCTURE/` | Deployment architecture, CI/CD, monitoring, edge infrastructure |
| 09 | `09-IMPLEMENTATION-PLANS/` | Phased implementation roadmap with milestones |
| 00 | `00-INVESTIGATION-MAP/` | **Complete gap analysis, traceability matrix, SA legal compliance, remediation roadmap, data flow maps, security assessment** |

## System Overview

Sentinel360 transforms passive CCTV surveillance into real-time, actionable forensic intelligence. It serves:

- **Community Members** — View wanted feed, submit sightings, receive alerts (mobile app)
- **Security Operators** — Monitor feeds, submit CCTV snapshots, respond to alerts (web + mobile)
- **Law Enforcement** — Investigate cases, verify evidence, update criminal status (web)
- **Administrators** — Manage criminal profiles, send alerts, QA snapshots (web)
- **Super Administrators** — User/role management, audit logs, system configuration (web)

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Turborepo (Bun workspace) |
| **Backend** | Hono.js + tRPC + better-auth |
| **Web Frontend** | Next.js 16 + React 19 + Tailwind CSS v4 |
| **Mobile** | Expo 55 + React Native 0.83 + Expo Router |
| **Database** | PostgreSQL 17 via Supabase |
| **Auth** | better-auth (email/password, session-based) |
| **Shared** | TypeScript, Zod validation, tRPC type-safe API |

## Quick Links

- [Requirements (EXTRACTED_INFO)](./EXTRACTED_INFO.md)
- [Architecture Overview](./02-ARCHITECTURE/00-SYSTEM-OVERVIEW.md)
- [Database Schema](./02-ARCHITECTURE/02-DATABASE-SCHEMA.md)
- [API Architecture](./02-ARCHITECTURE/03-API-ARCHITECTURE.md)
- [Security Architecture](./02-ARCHITECTURE/04-SECURITY-ARCHITECTURE.md)
- [Supabase Migrations](./07-DATABASE/migrations/)
- [Investigation Map — Executive Summary](./00-INVESTIGATION-MAP/00-EXECUTIVE-SUMMARY.md)
- [Full Traceability Matrix](./00-INVESTIGATION-MAP/01-TRACEABILITY-MATRIX.md)
- [Gap Analysis (80+ Gaps Identified)](./00-INVESTIGATION-MAP/02-GAP-ANALYSIS.md)
- [SA Legal Compliance (POPIA, CPA, ECTA, SAPS)](./00-INVESTIGATION-MAP/03-SA-LEGAL-COMPLIANCE.md)
- [Remediation Roadmap (~1,050h remaining)](./00-INVESTIGATION-MAP/04-REMEDIATION-ROADMAP.md)
- [Data Flow Maps](./00-INVESTIGATION-MAP/05-DATA-FLOW-MAP.md)
- [Security Assessment (Threat Model + OWASP)](./00-INVESTIGATION-MAP/06-SECURITY-ASSESSMENT.md)

## Revision

| Version | Date | Author |
|---------|------|--------|
| 1.0 | June 2026 | Alpha Tech |
