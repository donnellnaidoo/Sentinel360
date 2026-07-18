# Sentinel360 – AI-Powered Crime Detection & Scene Reconstruction System

> **Requirements Document | Version 1.0**
> **Group Name:** Alpha Tech
> **Last Updated:** June 2026

---

## Group Members

| Name              | Student Number | Role                 |
| ----------------- | -------------- | -------------------- |
| Patricia Mashasha | 223106544      | Project Manager      |
| Serati Shai       | 223161884      | Front End Developer  |
| Tashen Moodley    | 223110572      | Back End Developer   |
| Donnell Naidoo    | 223197140      | Full Stack Developer |
| Trinity Chauke    | 223001067      | Full Stack Developer |
| Kgahlisho Tladi   | 216002328      | Business Analyst     |

---

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Problem Analysis](#2-problem-analysis)
- [3. System Overview](#3-system-overview)
- [4. Scope of the System](#4-scope-of-the-system)
- [5. Functional Requirements](#5-functional-requirements)
  - [5.1 Real-Time AI Behaviour Detection](#51-real-time-ai-behaviour-detection)
  - [5.2 Automated Entity Attribute Extraction](#52-automated-entity-attribute-extraction)
  - [5.3 Movement Path Tracking & Re-identification](#53-movement-path-tracking--re-identification)
  - [5.4 3D Crime Scene Reconstruction](#54-3d-crime-scene-reconstruction)
  - [5.5 Structured Incident Reporting & Metadata Integration](#55-structured-incident-reporting--metadata-integration)
- [6. Non-Functional Requirements](#6-non-functional-requirements)
  - [6.1 System Performance and Scalability](#61-system-performance-and-scalability)
  - [6.2 Processing Accuracy and Evidentiary Quality](#62-processing-accuracy-and-evidentiary-quality)
  - [6.3 Data Security and Integrity](#63-data-security-and-integrity)
- [7. System Impact and Expected Outcomes](#7-system-impact-and-expected-outcomes)
- [8. Architecture Overview](#8-architecture-overview)
- [9. System Users](#9-system-users)
- [10. Use Case Overview](#10-use-case-overview)
- [11. Expected Benefits](#11-expected-benefits)
- [User Stories](#user-stories)
  - [Community Member](#-community-member)
  - [Security Company](#-security-company)
  - [AI / CCTV System](#-ai--cctv-system)
  - [Law Enforcement](#-law-enforcement)
  - [Admin](#-admin)
  - [Super Admin](#-super-admin)

---

## 1. Introduction

### 1.1 Purpose of the Document

The purpose of this document is to define the functional and non-functional requirements for the Sentinel360 system. It provides a clear understanding of the system's expected behaviour, stakeholders, and operational requirements. The document will guide developers, project managers, and stakeholders during system design and development.

Sentinel360 is engineered to transform passive video surveillance into real-time, actionable forensic intelligence. By integrating edge-based deep learning inference and 360-degree spatial analysis, the system identifies suspicious or criminal behaviour as it manifests, bridging the critical technological gap between raw data storage and proactive investigative resolution.

---

## 2. Problem Analysis

The current public safety infrastructure in South Africa is characterised by reactive monitoring and a reliance on legacy CCTV systems that lack analytical capabilities. The following operational deficiencies justify the requirement for an automated intelligence layer:

- **Manual Labour Inefficiency**: Investigators currently allocate 60% to 80% of their operational hours to manual footage review, severely limiting active case resolution.
- **Scale of the Criminal Landscape**: With over 2.5 million serious crimes recorded annually in South Africa, the sheer volume of data surpasses human cognitive capacity for review.
- **High Investigation Latency**: Standard forensic workflows require 10 to 40 hours of manual review per incident, often delaying suspect identification by weeks.
- **Commercial Loss and Asset Depletion**: Businesses suffer significant financial and property losses due to the inability of passive systems to trigger preventative interventions.
- **Community Safety Erosion**: Inefficient surveillance leads to reduced public safety and slower justice outcomes, undermining community trust in security infrastructure.
- **Evidentiary Gaps**: Manual surveillance is prone to human oversight, resulting in the loss of critical forensic insights and lower conviction rates.

---

## 3. System Overview

Sentinel360 is an AI-powered surveillance intelligence system designed to transform traditional CCTV surveillance footage into real-time forensic intelligence. The system uses computer vision, artificial intelligence, and deep learning technologies to automatically:

- Detect suspicious activities
- Identify individuals and vehicles
- Reconstruct crime scenes
- Generate incident reports for investigators

The system aims to reduce manual video review, improve investigation efficiency, and enhance public safety.

---

## 4. Scope of the System

Sentinel360 will support law enforcement agencies, security companies, and businesses by:

- Automatically detecting suspicious activities from surveillance footage
- Identifying people and vehicles involved in incidents
- Tracking suspect movements across cameras
- Reconstructing incidents using 360-degree or 3D visualisation
- Generating structured investigation reports
- Providing alerts and notifications to security personnel

---

## 5. Functional Requirements

### 5.1 Real-Time AI Behaviour Detection

The system shall employ deep learning inference at the edge to identify behavioural anomalies within 360-degree visual fields.

1. **Class-Specific Detection**: The system must maintain high-precision detection for three primary classes: Person, Vehicle, and Abnormal Activity Patterns.
2. **Continuous Behavioural Inference**: Perform 24/7 automated monitoring of all integrated nodes to detect deviations from baseline environmental activity.
3. **Threat Triggering**: Automatically generate sub-second alerts when pre-defined suspicious or criminal behaviours are identified within the surveillance perimeter.

### 5.2 Automated Entity Attribute Extraction

The system shall automatically execute granular attribute extraction to facilitate the creation of high-fidelity forensic profiles.

| Attribute Category   | Specific Data Point                                                                 |
| -------------------- | ----------------------------------------------------------------------------------- |
| Biometric / Human    | High-resolution facial images and distinctive physical markers                      |
| Physical Description | Algorithmic estimation of height and multi-point clothing colour and type analysis  |
| Vehicular Data       | Automatic Licence Plate Recognition (ALPR), vehicle make, and colour classification |

### 5.3 Movement Path Tracking & Re-identification

The system shall track the trajectory of entities across the entire surveillance network. This requirement includes:

- **Inter-camera Re-identification (Re-ID)**: The system must maintain a persistent Entity ID for suspects and vehicles as they transition between different 360-degree camera nodes.
- **Chronological Spatial Mapping**: The system shall synthesise movement data to establish a comprehensive chronological timeline, documenting the subject's pathing before, during, and after an incident.

### 5.4 3D Crime Scene Reconstruction

The system must perform a spatial synthesis of 360-degree video data to generate interactive 3D or 360-degree forensic models. These models shall provide investigators with immersive spatial context, allowing for volumetric analysis of the scene that exceeds the capabilities of traditional two-dimensional video playback.

### 5.5 Structured Incident Reporting & Metadata Integration

The system shall automate the generation of evidentiary documentation ready for judicial processing.

- **Automated Evidence Compilation**: Aggregation of relevant video segments and high-resolution stills
- **Forensic Timestamping**: Synchronised chronological logging of all entity interactions
- **Trajectory Logs**: Exportable coordinate data for suspect and vehicle movement paths
- **LEO Metadata Integration**: The ability to export data in standardised formats (XML / JSON) for seamless ingestion into existing Law Enforcement Case Management Systems

---

## 6. Non-Functional Requirements

### 6.1 System Performance and Scalability

- **Data Throughput**: Architecture must support the concurrent processing of thousands of hours of high-bitrate video footage across distributed urban networks.
- **Processing Latency**: The system is mandated to achieve "Real-Time" status, defined as sub-second alert generation from the moment of behaviour detection.
- **Scalability**: Elastic compute resource allocation to prevent performance degradation during high-activity periods or network expansion.

### 6.2 Processing Accuracy and Evidentiary Quality

- **Inference Confidence**: AI models must achieve a high confidence score (minimum 95% threshold) for facial and LPR attribute extraction to ensure forensic admissibility.
- **Error Mitigation**: The system must provide objective, machine-driven analysis to eliminate the subjectivity and fatigue-related oversights inherent in manual surveillance review.

### 6.3 Data Security and Integrity

- **Forensic Chain of Custody**: Implement cryptographic hashing on all extracted evidence to prevent tampering and ensure legal admissibility.
- **Encryption at Rest and in Transit**: All forensic insights and raw metadata must be protected via AES-256 encryption.
- **Access Control**: Role-based access control (RBAC) to ensure sensitive surveillance intelligence is only accessible by authorised personnel.

---

## 7. System Impact and Expected Outcomes

| Metric                   | Current State (Manual)                | Future State (Sentinel360)                                    |
| ------------------------ | ------------------------------------- | ------------------------------------------------------------- |
| Review Time Per Incident | 10 – 40 hours                         | Automated / sub-second alerting                               |
| Personnel Allocation     | 60–80% of time spent on manual search | 90% reduction in review time; personnel focused on resolution |
| Data Utility             | Passive, siloed recordings            | Structured, actionable forensic intelligence                  |
| Detection Timing         | Post-incident (reactive)              | In-progress (proactive / real-time)                           |
| Public Safety Outcome    | Delayed suspect identification        | Rapid suspect apprehension and evidentiary clarity            |

---

## 8. Architecture Overview

The Sentinel360 system is composed of five logical layers:

| Layer                    | Description                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Users Layer**          | Investigators, law enforcement, private security, and businesses who interact with the system                                           |
| **Application Layer**    | Investigation Interface for visual analysis of 3D models, and Incident Report Generator for structured forensic reports with timestamps |
| **AI Processing Layer**  | Deep learning and 360-degree analysis for detection, attribute extraction, movement tracking, and scene reconstruction                  |
| **Data Layer**           | Raw surveillance video storage alongside structured intelligence extracted by the AI, ensuring evidentiary quality                      |
| **Infrastructure Layer** | Existing CCTV hardware and urban surveillance networks providing the physical input feed                                                |

---

## 9. System Users

| #   | User Type                     | Responsibilities                                                              |
| --- | ----------------------------- | ----------------------------------------------------------------------------- |
| 1   | **Security Operators**        | Monitor real-time surveillance feeds and respond to system-generated alerts   |
| 2   | **Investigators**             | Review incident data, analyse suspect movements, and reconstruct crime scenes |
| 3   | **System Administrators**     | Manage system configuration, user permissions, and data storage               |
| 4   | **Law Enforcement Officials** | Gather digital evidence and support criminal investigations                   |

---

## 10. Use Case Overview

| #   | Use Case                     | Actor                | Description                                                                           |
| --- | ---------------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| 1   | Monitor Surveillance Footage | Security Operator    | The operator monitors CCTV footage through the Sentinel360 interface                  |
| 2   | Detect Suspicious Behaviour  | System               | The system automatically detects unusual activities and generates alerts              |
| 3   | Investigate Incident         | Investigator         | The investigator reviews surveillance data and analyses the reconstructed crime scene |
| 4   | Generate Incident Report     | System               | The system generates a structured report containing evidence and timestamps           |
| 5   | Manage System Users          | System Administrator | The administrator creates, updates, or removes user accounts                          |

---

## 11. Expected Benefits

The Sentinel360 system will provide several benefits:

- **Faster crime investigation** through automated detection and alerting
- **Reduced manual video review** via AI-driven attribute extraction and tracking
- **Improved accuracy in suspect identification** with high-confidence facial and LPR matching
- **Better evidence collection** through structured, court-ready reporting with chain of custody
- **Increased public safety** via proactive, real-time threat detection and community alerting

---

## User Stories

### 👤 Community Member

| ID    | User Story                                                                                                                                                  | Acceptance Criteria                                                                                                                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-01 | **Register & Login** — As a Community Member, I want to register and log in to SentinelWatch so that I can access community safety features.                | ✓ User can register with name, email, and password<br>✓ Email verification is sent on registration<br>✓ Successful login redirects to the home dashboard<br>✓ Invalid credentials show a clear error message              |
| US-02 | **View Wanted Feed (Public)** — As a Community Member, I want to view the public wanted persons feed so that I can stay informed about suspects in my area. | ✓ Feed displays photo, name, and last known location<br>✓ Feed is paginated and loads within 2 seconds<br>✓ No login required to view the public feed<br>✓ Items are sorted by most recent first                          |
| US-03 | **Submit a Sighting** — As a Community Member, I want to submit a sighting of a wanted person so that law enforcement can be alerted quickly.               | ✓ User can submit a description, photo, and GPS location<br>✓ Submission is confirmed with a reference number<br>✓ Sighting is flagged for law enforcement review<br>✓ User receives a push notification on status update |
| US-04 | **Receive Alerts** — As a Community Member, I want to receive real-time safety alerts for my area so that I can take precautions.                           | ✓ Alerts are delivered via push notification<br>✓ Alerts include incident type, location, and time<br>✓ User can configure alert radius in settings<br>✓ Alerts can be dismissed or saved for later                       |

### 🏢 Security Company

| ID    | User Story                                                                                                                                                                 | Acceptance Criteria                                                                                                                                                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-05 | **View Full Wanted Feed** — As a Security Company operator, I want to view the full wanted persons feed so that my team can proactively monitor for suspects.              | ✓ Full feed includes all active and recently resolved cases<br>✓ Can filter by region, crime type, or date<br>✓ Feed updates in real time without page refresh<br>✓ Accessible via the web dashboard                                      |
| US-06 | **Submit CCTV Snapshots** — As a Security Company operator, I want to submit CCTV snapshots to the system so that AI can analyse and flag potential suspects.              | ✓ Supports image and video clip uploads<br>✓ System confirms receipt and begins AI analysis<br>✓ Operator is notified when analysis is complete<br>✓ Submission is linked to a location and timestamp                                     |
| US-07 | **Receive Operational Alerts** — As a Security Company operator, I want to receive alerts when a suspect is detected near my monitored sites so I can dispatch a response. | ✓ Alerts are sent when AI detects a match above confidence threshold<br>✓ Alert includes suspect profile, location, and CCTV timestamp<br>✓ Response team can acknowledge or escalate alert<br>✓ All alerts are logged for audit purposes |

### 🤖 AI / CCTV System

| ID    | User Story                                                                                                                                                                                    | Acceptance Criteria                                                                                                                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-08 | **Auto Capture Snapshot** — As the AI/CCTV System, I want to automatically capture snapshots from live camera feeds so that potential suspects can be identified without manual intervention. | ✓ System captures frames when motion or face is detected<br>✓ Snapshots are timestamped and geo-tagged<br>✓ Captured frames are queued for confidence scoring<br>✓ Failed captures are logged and retried               |
| US-09 | **Assign Confidence Score** — As the AI/CCTV System, I want to assign a confidence score to each captured snapshot so that reviewers can prioritise high-probability matches.                 | ✓ Score ranges from 0 to 100% based on facial match accuracy<br>✓ Scores above 80% trigger an automatic alert<br>✓ Scores are visible on the review dashboard<br>✓ Model version used for scoring is recorded per entry |

### 🔵 Law Enforcement

| ID    | User Story                                                                                                                                                    | Acceptance Criteria                                                                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-10 | **View Wanted Feed** — As a Law Enforcement officer, I want to view the full wanted feed so that I can stay updated on active cases and coordinate responses. | ✓ Feed shows full case details including evidence links<br>✓ Can filter by case status, officer assigned, or region<br>✓ Changes to cases are reflected in real time<br>✓ Feed is accessible on mobile and desktop                                |
| US-11 | **Verify Snapshots** — As a Law Enforcement officer, I want to verify AI-flagged CCTV snapshots so that only accurate matches are acted upon.                 | ✓ Officer can approve, reject, or escalate a snapshot<br>✓ Decision is recorded with officer ID and timestamp<br>✓ Rejected snapshots are fed back to improve the AI model<br>✓ Approved snapshots are attached to the case file                  |
| US-12 | **Verify Sightings** — As a Law Enforcement officer, I want to verify community-submitted sightings so that credible reports can be acted upon rapidly.       | ✓ Officer can view sighting details, photo, and GPS location<br>✓ Can mark sighting as verified, duplicate, or false<br>✓ Verified sightings trigger a field unit notification<br>✓ Sighting status is visible to the submitting community member |
| US-13 | **Update Criminal Status** — As a Law Enforcement officer, I want to update a criminal's status so that the wanted feed reflects the latest information.      | ✓ Status options: Active, Arrested, Cleared, Deceased<br>✓ Status change is logged with reason and officer details<br>✓ Arrested status removes the person from the public feed<br>✓ History of all status changes is preserved                   |

### 🛡️ Admin

| ID    | User Story                                                                                                                                                 | Acceptance Criteria                                                                                                                                                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-14 | **Manage Criminal Profiles** — As an Admin, I want to create, edit, and archive criminal profiles so that the wanted feed remains accurate and up to date. | ✓ Admin can add photo, biometric data, and case notes<br>✓ Edits are versioned and reversible<br>✓ Archived profiles are hidden from the public feed<br>✓ All changes are audit-logged                                                 |
| US-15 | **Send Alerts** — As an Admin, I want to send targeted alerts to relevant users so that communities and security teams are informed of active threats.     | ✓ Admin can target alerts by region, role, or user group<br>✓ Alert is delivered via push notification and in-app banner<br>✓ Delivery status is tracked per recipient<br>✓ Alert includes severity level: low, medium, high, critical |
| US-16 | **Verify Snapshots** — As an Admin, I want to review and verify flagged snapshots to ensure quality control before they reach law enforcement.             | ✓ Admin sees all snapshots pending verification<br>✓ Can approve, reject, or re-queue for AI re-analysis<br>✓ Bulk actions supported for efficiency<br>✓ Verified snapshots are timestamped and attributed                             |

### 👑 Super Admin

| ID    | User Story                                                                                                                                                     | Acceptance Criteria                                                                                                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-17 | **Manage Users & Roles** — As a Super Admin, I want to manage all user accounts and assign roles so that access control is enforced across the platform.       | ✓ Can create, deactivate, or delete any user account<br>✓ Role assignment: Community, Security, Law Enforcement, Admin<br>✓ Role changes take effect immediately<br>✓ User activity summary is visible per account  |
| US-18 | **View Audit Logs** — As a Super Admin, I want to view a complete audit log of all system activity so that I can ensure accountability and compliance.         | ✓ Logs include user ID, action, timestamp, and IP address<br>✓ Logs are searchable and filterable by date or user<br>✓ Logs cannot be edited or deleted by any user<br>✓ Exportable to CSV for compliance reporting |
| US-19 | **Manage Criminal Profiles** — As a Super Admin, I want full control over criminal profiles including permanent deletion so that data integrity is maintained. | ✓ Can permanently delete profiles with audit trail<br>✓ Can merge duplicate profiles<br>✓ All Super Admin actions require two-factor confirmation<br>✓ Deletion is irreversible and logged with reason              |

---

## Document Revision History

| Version | Date      | Author     | Description of Changes        |
| ------- | --------- | ---------- | ----------------------------- |
| 1.0     | June 2026 | Alpha Tech | Initial requirements document |
