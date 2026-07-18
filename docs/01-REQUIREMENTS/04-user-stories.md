# Sentinel360 — User Stories

> **Document:** User Stories Specification
> **Parent Document:** Sentinel360 — AI-Powered Crime Detection & Scene Reconstruction System (v1.0)
> **Group:** Alpha Tech
> **Last Updated:** June 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [User Types and Roles](#2-user-types-and-roles)
3. [Community Member Stories](#3-community-member-stories)
4. [Security Company Stories](#4-security-company-stories)
5. [AI / CCTV System Stories](#5-ai--cctv-system-stories)
6. [Law Enforcement Stories](#6-law-enforcement-stories)
7. [Admin Stories](#7-admin-stories)
8. [Super Admin Stories](#8-super-admin-stories)
9. [Story Dependency Map](#9-story-dependency-map)

---

## 1. Introduction

### 1.1 Purpose

This document captures all user stories for the Sentinel360 system. User stories describe system functionality from the perspective of each user type, capturing the desired outcome, value, and acceptance criteria for each feature.

### 1.2 Story Format

Each story follows the standard template:

> **As a** [user type], **I want** [action/goal] **so that** [benefit/value].

### 1.3 Story Identification

Each story is assigned a unique ID (`US-NN`) and categorised by user type:

| Prefix     | User Type                               |
| ---------- | --------------------------------------- |
| US-01–04   | Community Member                        |
| US-05–07   | Security Company                        |
| US-08–09   | AI / CCTV System                        |
| US-10–13   | Law Enforcement                         |
| US-14–16   | Admin                                   |
| US-17–19   | Super Admin                             |

### 1.4 Story Priority Definitions

| Priority | Definition                                                                 |
| -------- | -------------------------------------------------------------------------- |
| **P0**   | Critical — Required for minimum viable product                             |
| **P1**   | High — Core functionality for primary use cases                            |
| **P2**   | Medium — Important for operational completeness                            |
| **P3**   | Low — Enhancement for future release                                      |

---

## 2. User Types and Roles

### 2.1 User Role Hierarchy

```
Super Admin
 └── Admin
      ├── Law Enforcement
      │    ├── Security Company
      │    │    └── Community Member
      │    └── (direct access to case data)
      └── (manage criminal profiles, send alerts)
```

### 2.2 Role Definitions

| #  | User Type            | Description                                                                |
| -- | -------------------- | -------------------------------------------------------------------------- |
| 1  | **Community Member** | General public user who can view wanted feeds, submit sightings, and receive safety alerts |
| 2  | **Security Company** | Private security operator who can submit CCTV snapshots and receive operational alerts |
| 3  | **AI / CCTV System** | Automated system component that captures snapshots and assigns confidence scores |
| 4  | **Law Enforcement**  | Police or investigative officer with access to full case data and verification capabilities |
| 5  | **Admin**            | System administrator who manages criminal profiles and sends alerts        |
| 6  | **Super Admin**      | Highest privilege level with complete system control and audit capabilities |

---

## 3. Community Member Stories

### 3.1 Overview

Community Members are general public users who interact with Sentinel360 primarily through the SentinelWatch community safety interface. They contribute to public safety by submitting sightings and staying informed about wanted persons in their area.

### 3.2 Register & Login

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-01                                                               |
| **Priority**      | P0                                                                  |
| **Story**         | As a Community Member, I want to register and log in to SentinelWatch so that I can access community safety features |
| **Dependencies**  | None                                                                |

**Acceptance Criteria:**

| #  | Criterion                                                                        | Verification Method |
| -- | -------------------------------------------------------------------------------- | ------------------- |
| 1  | User can register with name, email, and password                                 | UI test             |
| 2  | Email verification is sent on registration                                       | Integration test    |
| 3  | Successful login redirects to the home dashboard                                 | UI test             |
| 4  | Invalid credentials show a clear error message                                   | UI test             |
| 5  | Password must meet minimum strength requirements (≥ 8 chars, mixed case, number) | Validation test     |
| 6  | Account lockout after 5 failed login attempts                                    | Security test       |
| 7  | "Forgot password" flow sends password reset email                                | Integration test    |

---

### 3.3 View Wanted Feed (Public)

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-02                                                               |
| **Priority**      | P0                                                                  |
| **Story**         | As a Community Member, I want to view the public wanted persons feed so that I can stay informed about suspects in my area |
| **Dependencies**  | None (public feed requires no authentication)                       |

**Acceptance Criteria:**

| #  | Criterion                                                                 | Verification Method |
| -- | ------------------------------------------------------------------------- | ------------------- |
| 1  | Feed displays photo, name, and last known location                        | UI test             |
| 2  | Feed is paginated and loads within 2 seconds                              | Performance test    |
| 3  | No login required to view the public feed                                 | Security test       |
| 4  | Items are sorted by most recent first                                     | UI test             |
| 5  | Feed includes date range filter and region filter                         | UI test             |
| 6  | Each entry links to a detail view with more information                   | UI test             |

---

### 3.4 Submit a Sighting

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-03                                                               |
| **Priority**      | P1                                                                  |
| **Story**         | As a Community Member, I want to submit a sighting of a wanted person so that law enforcement can be alerted quickly |
| **Dependencies**  | US-01 (must be registered)                                          |

**Acceptance Criteria:**

| #  | Criterion                                                                       | Verification Method |
| -- | ------------------------------------------------------------------------------- | ------------------- |
| 1  | User can submit a description, photo, and GPS location                          | UI test             |
| 2  | Submission is confirmed with a reference number                                 | UI test             |
| 3  | Sighting is flagged for law enforcement review                                  | Integration test    |
| 4  | User receives a push notification on status update                              | Integration test    |
| 5  | Photo upload supports JPEG, PNG; max 10 MB                                     | Validation test     |
| 6  | GPS location can be manually entered or auto-detected                           | UI test             |
| 7  | User can view their submission history in their profile                         | UI test             |

---

### 3.5 Receive Alerts

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-04                                                               |
| **Priority**      | P1                                                                  |
| **Story**         | As a Community Member, I want to receive real-time safety alerts for my area so that I can take precautions |
| **Dependencies**  | US-01 (must be registered and logged in)                            |

**Acceptance Criteria:**

| #  | Criterion                                                                     | Verification Method |
| -- | ----------------------------------------------------------------------------- | ------------------- |
| 1  | Alerts are delivered via push notification                                    | Integration test    |
| 2  | Alerts include incident type, location, and time                              | UI test             |
| 3  | User can configure alert radius in settings (1 km, 5 km, 10 km, custom)       | UI test             |
| 4  | Alerts can be dismissed or saved for later                                    | UI test             |
| 5  | Alert delivery latency ≤ 30 seconds from incident detection                   | Performance test    |
| 6  | User can mute alerts during configurable quiet hours                          | UI test             |
| 7  | Alert history is available in the user's profile                              | UI test             |

---

## 4. Security Company Stories

### 4.1 Overview

Security Company operators leverage Sentinel360 to proactively monitor for wanted persons across their surveillance network, submit CCTV evidence for AI analysis, and receive operational alerts when suspects are detected near monitored sites.

### 4.2 View Full Wanted Feed

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-05                                                               |
| **Priority**      | P0                                                                  |
| **Story**         | As a Security Company operator, I want to view the full wanted persons feed so that my team can proactively monitor for suspects |
| **Dependencies**  | None                                                                 |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Full feed includes all active and recently resolved cases                         | UI test             |
| 2  | Can filter by region, crime type, or date                                        | UI test             |
| 3  | Feed updates in real time without page refresh                                    | Integration test    |
| 4  | Accessible via the web dashboard                                                  | UI test             |
| 5  | Can bookmark suspects for team-wide tracking                                     | UI test             |
| 6  | Feed displays confidence level for AI-matched suspects                           | UI test             |
| 7  | Exportable to PDF or CSV for briefing purposes                                    | Integration test    |

---

### 4.3 Submit CCTV Snapshots

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-06                                                               |
| **Priority**      | P0                                                                  |
| **Story**         | As a Security Company operator, I want to submit CCTV snapshots to the system so that AI can analyse and flag potential suspects |
| **Dependencies**  | US-05 (feed access required for cross-referencing)                  |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Supports image and video clip uploads                                              | Integration test    |
| 2  | System confirms receipt and begins AI analysis                                    | UI test             |
| 3  | Operator is notified when analysis is complete                                    | Integration test    |
| 4  | Submission is linked to a location and timestamp                                  | Validation test     |
| 5  | Supported formats: JPEG, PNG, MP4, AVI; max 500 MB per submission                 | Validation test     |
| 6  | Batch submission supported (up to 50 files)                                       | UI test             |
| 7  | Submission history with analysis results visible in dashboard                     | UI test             |

---

### 4.4 Receive Operational Alerts

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-07                                                               |
| **Priority**      | P0                                                                  |
| **Story**         | As a Security Company operator, I want to receive alerts when a suspect is detected near my monitored sites so that I can dispatch a response |
| **Dependencies**  | US-06 (AI analysis pipeline must be operational)                    |

**Acceptance Criteria:**

| #  | Criterion                                                                           | Verification Method |
| -- | ----------------------------------------------------------------------------------- | ------------------- |
| 1  | Alerts are sent when AI detects a match above confidence threshold (≥ 85%)          | Integration test    |
| 2  | Alert includes suspect profile, location, and CCTV timestamp                        | UI test             |
| 3  | Response team can acknowledge or escalate alert                                     | UI test             |
| 4  | All alerts are logged for audit purposes                                            | Integration test    |
| 5  | Alert to operator ≤ 5 seconds from AI match                                         | Performance test    |
| 6  | Escalated alerts are forwarded to Law Enforcement feed                              | Integration test    |
| 7  | Operators can configure per-site alert threshold levels                            | UI test             |

---

## 5. AI / CCTV System Stories

### 5.1 Overview

The AI / CCTV System represents the automated processing layer that continuously captures, analyses, and scores surveillance data without human intervention.

### 5.2 Auto Capture Snapshot

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-08                                                               |
| **Priority**      | P0                                                                  |
| **Story**         | As the AI/CCTV System, I want to automatically capture snapshots from live camera feeds so that potential suspects can be identified without manual intervention |
| **Dependencies**  | Camera integration, edge inference pipeline                        |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | System captures frames when motion or face is detected                            | Integration test    |
| 2  | Snapshots are timestamped and geo-tagged                                          | Validation test     |
| 3  | Captured frames are queued for confidence scoring                                 | Integration test    |
| 4  | Failed captures are logged and retried (up to 3 attempts)                         | Integration test    |
| 5  | Capture rate is configurable (min 1 FPS, max 30 FPS)                             | UI test             |
| 6  | System operates 24/7 without degradation                                          | Performance test    |
| 7  | Local storage buffer holds minimum 24 hours of captures if network is down        | Integration test    |

---

### 5.3 Assign Confidence Score

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-09                                                               |
| **Priority**      | P0                                                                  |
| **Story**         | As the AI/CCTV System, I want to assign a confidence score to each captured snapshot so that reviewers can prioritise high-probability matches |
| **Dependencies**  | US-08 (capture pipeline must be operational)                        |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Score ranges from 0 to 100% based on facial match accuracy                        | Integration test    |
| 2  | Scores above 80% trigger an automatic alert                                      | Integration test    |
| 3  | Scores are visible on the review dashboard                                       | UI test             |
| 4  | Model version used for scoring is recorded per entry                             | Validation test     |
| 5  | Scores are recalculated when new wanted person data is added                      | Integration test    |
| 6  | Scoring latency ≤ 2 seconds per capture                                          | Performance test    |
| 7  | Score breakdown (individual factors) available for transparency                  | UI test             |

---

## 6. Law Enforcement Stories

### 6.1 Overview

Law Enforcement officers are the primary consumers of Sentinel360's forensic intelligence. They verify AI-generated leads, manage case data, and coordinate field responses.

### 6.2 View Wanted Feed

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-10                                                               |
| **Priority**      | P0                                                                  |
| **Story**         | As a Law Enforcement officer, I want to view the full wanted feed so that I can stay updated on active cases and coordinate responses |
| **Dependencies**  | None                                                                 |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Feed shows full case details including evidence links                              | UI test             |
| 2  | Can filter by case status, officer assigned, or region                           | UI test             |
| 3  | Changes to cases are reflected in real time                                       | Integration test    |
| 4  | Feed is accessible on mobile and desktop                                          | UI test             |
| 5  | Feed integrates with internal case management system (XML/JSON)                   | Integration test    |
| 6  | Priority cases are visually highlighted                                           | UI test             |
| 7  | Case detail view includes AI analysis summary, timeline, and evidence count       | UI test             |

---

### 6.3 Verify Snapshots

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-11                                                               |
| **Priority**      | P1                                                                  |
| **Story**         | As a Law Enforcement officer, I want to verify AI-flagged CCTV snapshots so that only accurate matches are acted upon |
| **Dependencies**  | US-09 (confidence scores must be assigned)                          |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Officer can approve, reject, or escalate a snapshot                               | UI test             |
| 2  | Decision is recorded with officer ID and timestamp                                | Validation test     |
| 3  | Rejected snapshots are fed back to improve the AI model                           | Integration test    |
| 4  | Approved snapshots are attached to the case file                                  | Integration test    |
| 5  | Bulk operations supported (approve/reject multiple snapshots)                    | UI test             |
| 6  | Snapshots sorted by confidence score (highest first)                             | UI test             |
| 7  | Escalated snapshots trigger automatic notification to supervisor                 | Integration test    |

---

### 6.4 Verify Sightings

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-12                                                               |
| **Priority**      | P1                                                                  |
| **Story**         | As a Law Enforcement officer, I want to verify community-submitted sightings so that credible reports can be acted upon rapidly |
| **Dependencies**  | US-03 (community member submissions flow)                           |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Officer can view sighting details, photo, and GPS location                        | UI test             |
| 2  | Can mark sighting as verified, duplicate, or false                                | UI test             |
| 3  | Verified sightings trigger a field unit notification                             | Integration test    |
| 4  | Sighting status is visible to the submitting community member                     | Integration test    |
| 5  | Duplicate sightings auto-linked to existing case                                  | Integration test    |
| 6  | False reports logged and tracked for abuse monitoring                            | Validation test     |
| 7  | Geographic map view of all sightings per case                                     | UI test             |

---

### 6.5 Update Criminal Status

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-13                                                               |
| **Priority**      | P1                                                                  |
| **Story**         | As a Law Enforcement officer, I want to update a criminal's status so that the wanted feed reflects the latest information |
| **Dependencies**  | US-10 (must have access to wanted feed)                             |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Status options: Active, Arrested, Cleared, Deceased                               | UI test             |
| 2  | Status change is logged with reason and officer details                            | Validation test     |
| 3  | Arrested status removes the person from the public feed                           | Integration test    |
| 4  | History of all status changes is preserved                                        | Validation test     |
| 5  | Status change triggers notification to involved officers                         | Integration test    |
| 6  | Arrested status requires case reference number                                   | Validation test     |
| 7  | Cleared status can be reversed within 24 hours by authorising officer             | Integration test    |

---

## 7. Admin Stories

### 7.1 Overview

Admins manage the Sentinel360 system's data integrity, including criminal profiles, alert distribution, and quality control of AI-flagged evidence.

### 7.2 Manage Criminal Profiles

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-14                                                               |
| **Priority**      | P0                                                                  |
| **Story**         | As an Admin, I want to create, edit, and archive criminal profiles so that the wanted feed remains accurate and up to date |
| **Dependencies**  | None                                                                 |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Admin can add photo, biometric data, and case notes                               | UI test             |
| 2  | Edits are versioned and reversible                                                | Integration test    |
| 3  | Archived profiles are hidden from the public feed                                 | Integration test    |
| 4  | All changes are audit-logged with user ID and timestamp                          | Validation test     |
| 5  | Biometric data includes face encoding for AI matching pipeline                    | Integration test    |
| 6  | Profile merge function for duplicate records                                      | UI test             |
| 7  | Case notes support rich text and file attachments                                 | UI test             |

---

### 7.3 Send Alerts

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-15                                                               |
| **Priority**      | P1                                                                  |
| **Story**         | As an Admin, I want to send targeted alerts to relevant users so that communities and security teams are informed of active threats |
| **Dependencies**  | US-14 (profiles must exist in the system)                           |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Admin can target alerts by region, role, or user group                            | UI test             |
| 2  | Alert is delivered via push notification and in-app banner                        | Integration test    |
| 3  | Delivery status is tracked per recipient                                         | Integration test    |
| 4  | Alert includes severity level: low, medium, high, critical                        | UI test             |
| 5  | Scheduled alerts supported (immediate or at specified time)                      | Integration test    |
| 6  | Alert template library for common scenarios                                      | UI test             |
| 7  | Alert history dashboard with delivery analytics                                  | UI test             |

---

### 7.4 Verify Snapshots (Quality Control)

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-16                                                               |
| **Priority**      | P2                                                                  |
| **Story**         | As an Admin, I want to review and verify flagged snapshots to ensure quality control before they reach law enforcement |
| **Dependencies**  | US-08, US-09 (snapshot capture and scoring pipeline)                |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Admin sees all snapshots pending verification                                     | UI test             |
| 2  | Can approve, reject, or re-queue for AI re-analysis                              | UI test             |
| 3  | Bulk actions supported for efficiency                                             | UI test             |
| 4  | Verified snapshots are timestamped and attributed                                 | Validation test     |
| 5  | Quality metrics displayed (image resolution, lighting, face angle)               | UI test             |
| 6  | Snapshot queue sorted by priority score (confidence × recency)                   | UI test             |
| 7  | Re-queued snapshots trigger model retraining pipeline                            | Integration test    |

---

## 8. Super Admin Stories

### 8.1 Overview

Super Admins have the highest level of system access, responsible for user management, system compliance, and data integrity maintenance.

### 8.2 Manage Users & Roles

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-17                                                               |
| **Priority**      | P0                                                                  |
| **Story**         | As a Super Admin, I want to manage all user accounts and assign roles so that access control is enforced across the platform |
| **Dependencies**  | None                                                                 |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Can create, deactivate, or delete any user account                                | UI test             |
| 2  | Role assignment: Community, Security, Law Enforcement, Admin                      | UI test             |
| 3  | Role changes take effect immediately                                             | Integration test    |
| 4  | User activity summary is visible per account                                      | UI test             |
| 5  | Bulk user operations supported (CSV import/export)                               | Integration test    |
| 6  | Account deactivation preserves all associated data                                | Validation test     |
| 7  | User activity log accessible from user profile                                    | UI test             |

---

### 8.3 View Audit Logs

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-18                                                               |
| **Priority**      | P1                                                                  |
| **Story**         | As a Super Admin, I want to view a complete audit log of all system activity so that I can ensure accountability and compliance |
| **Dependencies**  | None                                                                 |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Logs include user ID, action, timestamp, and IP address                          | Validation test     |
| 2  | Logs are searchable and filterable by date or user                               | UI test             |
| 3  | Logs cannot be edited or deleted by any user                                     | Security test       |
| 4  | Exportable to CSV for compliance reporting                                       | Integration test    |
| 5  | Real-time log streaming for active monitoring                                    | UI test             |
| 6  | Log retention meets regulatory requirements (minimum 7 years)                    | Validation test     |
| 7  | Anomaly detection on audit log patterns (automated alert on suspicious activity) | Integration test    |

---

### 8.4 Manage Criminal Profiles (Full Control)

| Attribute         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **ID**            | US-19                                                               |
| **Priority**      | P1                                                                  |
| **Story**         | As a Super Admin, I want full control over criminal profiles including permanent deletion so that data integrity is maintained |
| **Dependencies**  | US-14 (Admin profile management)                                    |

**Acceptance Criteria:**

| #  | Criterion                                                                         | Verification Method |
| -- | --------------------------------------------------------------------------------- | ------------------- |
| 1  | Can permanently delete profiles with audit trail                                 | UI test             |
| 2  | Can merge duplicate profiles                                                      | UI test             |
| 3  | All Super Admin actions require two-factor confirmation                           | Security test       |
| 4  | Deletion is irreversible and logged with reason                                   | Validation test     |
| 5  | Permanent deletion requires written justification (text input)                    | UI test             |
| 6  | Deletion cascades to all associated evidence (with warning)                      | Integration test    |
| 7  | Merged profiles maintain full history from both source profiles                   | Validation test     |

---

## 9. Story Dependency Map

### 9.1 Dependency Graph

```
                    ┌─────────────┐
                    │  US-01      │  Community Register/Login
                    │  (P0)       │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  US-04      │  Receive Alerts
                    │  (P1)       │
                    └─────────────┘

                    ┌─────────────┐
                    │  US-02      │  Public Wanted Feed
                    │  (P0)       │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  US-03      │  Submit Sighting
                    │  (P1)       │
                    └─────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  US-08      │◄──►│  US-09      │    │  US-05      │
│  Auto       │    │  Confidence │    │  Full Feed  │
│  Capture   │    │  Score      │    │  (P0)       │
│  (P0)       │    │  (P0)       │    └──────┬──────┘
└──────┬──────┘    └──────┬──────┘          │
       │                  │            ┌──────▼──────┐
       │                  │            │  US-06      │
       │                  │            │  Submit     │
       │                  └────────────┤  Snapshots  │
       │                               │  (P0)       │
       │                               └──────┬──────┘
       │                                      │
       │                               ┌──────▼──────┐
       │                               │  US-07      │
       │                               │  Receive    │
       │                               │  Alerts     │
       │                               │  (P0)       │
       │                               └─────────────┘
       │
       │                  ┌─────────────┐
       │                  │  US-10      │
       │                  │  LE Feed    │
       │                  │  (P0)       │
       │                  └──────┬──────┘
       │                         │
       │                  ┌──────▼──────┐
       ├─────────────────►│  US-11      │
       │                  │  Verify     │
       │                  │  Snapshots  │
       │                  │  (P1)       │
       │                  └─────────────┘
       │
       │                  ┌─────────────┐
       │                  │  US-12      │◄──── US-03
       │                  │  Verify     │
       │                  │  Sightings  │
       │                  │  (P1)       │
       │                  └──────┬──────┘
       │                         │
       │                  ┌──────▼──────┐
       │                  │  US-13      │
       │                  │  Update     │
       │                  │  Status     │
       │                  │  (P1)       │
       │                  └─────────────┘
       │
       │                  ┌─────────────┐
       │                  │  US-14      │
       │                  │  Manage     │
       │                  │  Profiles   │
       │                  │  (P0)       │
       │                  └──────┬──────┘
       │                         │
       │                  ┌──────▼──────┐
       │                  │  US-15      │
       │                  │  Send       │
       │                  │  Alerts     │
       │                  │  (P1)       │
       │                  └─────────────┘
       │
       │                  ┌─────────────┐
       │                  │  US-16      │◄──── US-08/US-09
       │                  │  QC         │
       │                  │  Snapshots  │
       │                  │  (P2)       │
       │                  └─────────────┘
       │
       │                  ┌─────────────┐
       │                  │  US-17      │
       │                  │  Manage     │
       │                  │  Users      │
       │                  │  (P0)       │
       │                  └──────┬──────┘
       │                         │
       │                  ┌──────▼──────┐
       │                  │  US-18      │
       │                  │  Audit      │
       │                  │  Logs       │
       │                  │  (P1)       │
       │                  └─────────────┘
       │
       │                  ┌─────────────┐
       │                  │  US-19      │◄──── US-14
       │                  │  Super      │
       │                  │  Profiles   │
       │                  │  (P1)       │
       │                  └─────────────┘
```

### 9.2 Implementation Order (Recommended)

| Phase | Stories                | Rationale                                                      |
| ----- | ---------------------- | -------------------------------------------------------------- |
| **1** | US-01, US-02, US-05, US-08, US-09, US-10, US-14, US-17 | Core MVP: registration, feeds, AI capture/scoring, profile management, user management |
| **2** | US-03, US-04, US-06, US-07, US-11, US-12 | Community engagement: sightings, alerts, snapshot submission, verification workflow |
| **3** | US-13, US-15, US-16, US-18, US-19 | Complete workflows: status management, alerting, QC, audit, full data control |

---

## Document Revision History

| Version | Date      | Author     | Description of Changes                 |
| ------- | --------- | ---------- | -------------------------------------- |
| 1.0     | June 2026 | Alpha Tech | Initial user stories specification     |
