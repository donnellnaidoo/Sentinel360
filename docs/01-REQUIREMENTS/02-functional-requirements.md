# Sentinel360 — Functional Requirements

> **Document:** Functional Requirements Specification
> **Parent Document:** Sentinel360 — AI-Powered Crime Detection & Scene Reconstruction System (v1.0)
> **Group:** Alpha Tech
> **Last Updated:** June 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [FR-01: Real-Time AI Behaviour Detection](#2-fr-01-real-time-ai-behaviour-detection)
3. [FR-02: Automated Entity Attribute Extraction](#3-fr-02-automated-entity-attribute-extraction)
4. [FR-03: Movement Path Tracking & Re-identification](#4-fr-03-movement-path-tracking--re-identification)
5. [FR-04: 3D Crime Scene Reconstruction](#5-fr-04-3d-crime-scene-reconstruction)
6. [FR-05: Structured Incident Reporting & Metadata Integration](#6-fr-05-structured-incident-reporting--metadata-integration)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional requirements for the Sentinel360 system. Each requirement defines a specific behaviour, feature, or capability that the system must implement. Requirements are organised by functional area and include detailed specifications, data definitions, and performance criteria.

### 1.2 Requirement Identification

Each requirement is identified by a unique ID following the format `FR-XX-NNN`, where:

- `FR` = Functional Requirement
- `XX` = Functional area number
- `NNN` = Sequential requirement number

### 1.3 Requirement Priority Definitions

| Priority | Definition                                                         |
| -------- | ------------------------------------------------------------------ |
| **P0**   | Critical — System cannot function without this requirement         |
| **P1**   | High — Core capability required for primary use cases              |
| **P2**   | Medium — Important for operational effectiveness                   |
| **P3**   | Low — Enhancement for future releases                              |

---

## 2. FR-01: Real-Time AI Behaviour Detection

### 2.1 Overview

The system shall employ deep learning inference at the edge to identify behavioural anomalies within 360-degree visual fields. This is the foundational detection layer upon which all downstream processing depends.

### 2.2 Requirements

#### FR-01-001: Class-Specific Detection

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-01-001                                                    |
| **Title**        | Class-Specific Detection                                     |
| **Priority**     | P0                                                           |
| **Description**  | The system must maintain high-precision detection for three primary classes: Person, Vehicle, and Abnormal Activity Patterns |
| **Rationale**    | Core detection capability; all subsequent processing depends on accurate class identification |

**Specifications:**

| Specification         | Detail                                                        |
| --------------------- | ------------------------------------------------------------- |
| Detection Classes     | Person, Vehicle, Abnormal Activity Patterns                   |
| Minimum Confidence    | 95% for Person and Vehicle; 90% for Abnormal Activity         |
| Frame Processing Rate | ≥ 30 frames per second (FPS) per camera stream                |
| False Positive Rate   | ≤ 5% across all detection classes                             |

#### FR-01-002: Continuous Behavioural Inference

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-01-002                                                    |
| **Title**        | Continuous Behavioural Inference                             |
| **Priority**     | P0                                                           |
| **Description**  | The system shall perform 24/7 automated monitoring of all integrated nodes to detect deviations from baseline environmental activity |
| **Rationale**    | Uninterrupted surveillance is essential for real-time threat detection |

**Specifications:**

| Specification            | Detail                                                         |
| ------------------------ | -------------------------------------------------------------- |
| Operational Uptime       | 99.9% (≤ 8.76 hours downtime per year)                         |
| Monitoring Cadence       | Continuous, real-time                                          |
| Baseline Learning        | System shall automatically establish activity baselines per camera node |
| Deviation Threshold      | Configurable per deployment site                               |
| Recovery After Outage    | Full operational capability restored within 60 seconds of reconnection |

#### FR-01-003: Threat Triggering

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-01-003                                                    |
| **Title**        | Threat Triggering and Alert Generation                       |
| **Priority**     | P0                                                           |
| **Description**  | The system shall automatically generate sub-second alerts when pre-defined suspicious or criminal behaviours are identified within the surveillance perimeter |
| **Rationale**    | Real-time alerting enables proactive intervention |

**Specifications:**

| Specification           | Detail                                                            |
| ----------------------- | ----------------------------------------------------------------- |
| Alert Latency           | Sub-second (< 1,000 ms) from detection to alert generation        |
| Alert Channels          | Push notification, in-app alert, email (configurable)             |
| Alert Severity Levels   | Low, Medium, High, Critical                                       |
| Configurable Rules      | Administrators can define custom threat rules per camera/node     |
| Alert Deduplication     | Same-threat alerts merged within a configurable cooldown period   |

#### FR-01-004: Edge Inference

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-01-004                                                    |
| **Title**        | Edge-Based Inference Processing                              |
| **Priority**     | P1                                                           |
| **Description**  | The system shall execute detection models at the edge (on or near the camera node) to minimise latency and bandwidth requirements |
| **Rationale**    | Reduces dependence on centralised cloud processing and network bandwidth |

**Specifications:**

| Specification               | Detail                                                         |
| --------------------------- | -------------------------------------------------------------- |
| Inference Location          | Edge device (camera node or local gateway)                     |
| Model Update Mechanism      | Over-the-air (OTA) model updates without service interruption  |
| Offline Operation           | Continue detection during network outages; queue alerts        |
| Bandwidth Optimisation      | Only metadata and flagged events transmitted to central system |

---

## 3. FR-02: Automated Entity Attribute Extraction

### 3.1 Overview

The system shall automatically execute granular attribute extraction to facilitate the creation of high-fidelity forensic profiles of persons and vehicles detected within surveillance footage.

### 3.2 Requirements

#### FR-02-001: Biometric / Human Attribute Extraction

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-02-001                                                    |
| **Title**        | Biometric and Human Attribute Extraction                     |
| **Priority**     | P1                                                           |
| **Description**  | The system shall extract high-resolution facial images and identify distinctive physical markers from detected persons |
| **Rationale**    | Enables suspect identification and re-identification across the surveillance network |

**Extraction Data Points:**

| Data Point               | Description                                             | Minimum Quality Threshold        |
| ------------------------ | ------------------------------------------------------- | -------------------------------- |
| Facial Image             | High-resolution face capture suitable for recognition   | ≥ 80 × 80 pixels face region     |
| Distinctive Markers      | Tattoos, scars, birthmarks, visible piercings           | Detected and classified by type  |
| Gait Pattern             | Walking style markers for re-identification             | Extracted when full body visible |
| Facial Landmarks         | 68-point facial landmark mapping                        | Required for matching pipeline   |

#### FR-02-002: Physical Description Extraction

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-02-002                                                    |
| **Title**        | Physical Description Extraction                              |
| **Priority**     | P1                                                           |
| **Description**  | The system shall perform algorithmic estimation of height and multi-point clothing colour and type analysis |
| **Rationale**    | Physical descriptions are critical for suspect alerts and witness coordination |

**Extraction Data Points:**

| Data Point             | Description                                            | Accuracy Target |
| ---------------------- | ------------------------------------------------------ | --------------- |
| Estimated Height       | Algorithmic height estimation from calibrated cameras  | ± 5 cm          |
| Clothing — Upper Body  | Colour and type (e.g., "black jacket")                 | ≥ 90% accuracy  |
| Clothing — Lower Body  | Colour and type (e.g., "blue jeans")                   | ≥ 90% accuracy  |
| Clothing — Footwear    | Colour and approximate type                            | ≥ 85% accuracy  |
| Accessories            | Hat, bag, glasses detection and classification         | ≥ 85% accuracy  |

#### FR-02-003: Vehicular Data Extraction

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-02-003                                                    |
| **Title**        | Vehicular Data Extraction                                    |
| **Priority**     | P1                                                           |
| **Description**  | The system shall perform Automatic Licence Plate Recognition (ALPR), vehicle make, and colour classification |
| **Rationale**    | Vehicle identification is essential for tracking suspect movements and establishing timelines |

**Extraction Data Points:**

| Data Point              | Description                                            | Accuracy Target |
| ----------------------- | ------------------------------------------------------ | --------------- |
| Licence Plate Number    | ALPR — alphanumeric text extraction                    | ≥ 95% accuracy  |
| Licence Plate Region    | Province or registration authority                     | ≥ 90% accuracy  |
| Vehicle Make            | Manufacturer (e.g., Toyota, BMW, Ford)                 | ≥ 90% accuracy  |
| Vehicle Model           | Model classification (e.g., Corolla, 3 Series)         | ≥ 85% accuracy  |
| Vehicle Colour          | Primary colour classification                          | ≥ 90% accuracy  |
| Vehicle Type            | Sedan, SUV, hatchback, truck, motorcycle               | ≥ 95% accuracy  |

#### FR-02-004: Extraction Pipeline Integrity

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-02-004                                                    |
| **Title**        | Extraction Pipeline Integrity                                |
| **Priority**     | P2                                                           |
| **Description**  | All extracted attributes shall be cryptographically hashed to maintain the forensic chain of custody |
| **Rationale**    | Ensures legal admissibility of extracted evidence            |

**Specifications:**

| Specification          | Detail                                                  |
| ---------------------- | ------------------------------------------------------- |
| Hash Algorithm         | SHA-256                                                 |
| Timestamp Source       | NTP-synchronised, tamper-evident timestamp              |
| Attribute Versioning   | Each extraction records model version used              |
| Audit Trail            | All extractions logged with device ID, timestamp, model |

---

## 4. FR-03: Movement Path Tracking & Re-identification

### 4.1 Overview

The system shall track the trajectory of entities across the entire surveillance network, maintaining persistent identities as subjects move between camera nodes.

### 4.2 Requirements

#### FR-03-001: Inter-camera Re-identification (Re-ID)

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-03-001                                                    |
| **Title**        | Inter-camera Re-identification (Re-ID)                       |
| **Priority**     | P0                                                           |
| **Description**  | The system must maintain a persistent Entity ID for suspects and vehicles as they transition between different 360-degree camera nodes |
| **Rationale**    | Enables end-to-end movement tracking across the surveillance network |

**Specifications:**

| Specification                  | Detail                                                    |
| ------------------------------ | --------------------------------------------------------- |
| Entity ID Persistence          | Unique ID assigned at first detection; maintained throughout |
| Re-ID Matching Method          | Multi-modal (facial + clothing + gait + vehicle features) |
| Re-ID Confidence Threshold     | ≥ 85% for automatic linking; below threshold flags for review |
| Maximum Transition Gap         | Entity can be tracked across up to 30-minute gaps between detections |
| Cross-Node Association Latency | ≤ 2 seconds from detection at new node                     |

#### FR-03-002: Chronological Spatial Mapping

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-03-002                                                    |
| **Title**        | Chronological Spatial Mapping                                |
| **Priority**     | P1                                                           |
| **Description**  | The system shall synthesise movement data to establish a comprehensive chronological timeline, documenting the subject's pathing before, during, and after an incident |
| **Rationale**    | Provides investigators with full contextual movement history |

**Specifications:**

| Specification             | Detail                                                       |
| ------------------------- | ------------------------------------------------------------ |
| Timeline Granularity      | Second-level precision with NTP synchronisation              |
| Data Points per Event     | Timestamp, camera node ID, GPS coordinates (if available), entity ID |
| Path Visualisation        | Movement path overlay on map interface                       |
| Timeline Export           | Exportable as CSV, JSON, or KML for external analysis        |
| Pre/Post Incident Window  | Configurable window (default: 30 minutes before and after)   |

#### FR-03-003: Spatial Heat Mapping

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-03-003                                                    |
| **Title**        | Spatial Heat Mapping                                         |
| **Priority**     | P2                                                           |
| **Description**  | The system shall generate spatial heat maps showing high-activity areas and common movement corridors |
| **Rationale**    | Supports pattern analysis and resource allocation decisions  |

**Specifications:**

| Specification         | Detail                                             |
| --------------------- | -------------------------------------------------- |
| Heat Map Resolution   | Adjustable grid size (default: 10 m × 10 m)        |
| Update Frequency      | Near real-time (≤ 30 second refresh)               |
| Time Range Filtering  | Filterable by date range and time of day            |
| Entity Type Filtering | Filterable by Person, Vehicle, or All              |

---

## 5. FR-04: 3D Crime Scene Reconstruction

### 5.1 Overview

The system must perform a spatial synthesis of 360-degree video data to generate interactive 3D or 360-degree forensic models. These models shall provide investigators with immersive spatial context, allowing for volumetric analysis of the scene that exceeds the capabilities of traditional two-dimensional video playback.

### 5.2 Requirements

#### FR-04-001: Spatial Synthesis from 360° Video

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-04-001                                                    |
| **Title**        | Spatial Synthesis from 360° Video                            |
| **Priority**     | P1                                                           |
| **Description**  | The system shall process 360-degree video streams to generate spatial 3D point clouds and mesh models of incident scenes |
| **Rationale**    | Provides immersive spatial context for investigators         |

**Specifications:**

| Specification            | Detail                                                         |
| ------------------------ | -------------------------------------------------------------- |
| Input Source             | 360-degree camera video streams (equirectangular projection)   |
| Output Formats           | Point cloud (.PLY, .XYZ), textured mesh (.OBJ, .GLTF)         |
| Spatial Resolution       | ≤ 5 cm point spacing for near-field (0–10 m)                  |
| Reconstruction Time      | ≤ 5 minutes for a standard incident scene                     |
| Multi-camera Fusion      | Supports fusion of multiple 360° camera views                  |

#### FR-04-002: Interactive 3D Viewer

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-04-002                                                    |
| **Title**        | Interactive 3D Viewer                                        |
| **Priority**     | P1                                                           |
| **Description**  | The system shall provide an interactive 3D viewer allowing investigators to rotate, zoom, pan, and annotate reconstructed scenes |
| **Rationale**    | Enables volumetric analysis and evidence marking             |

**Specifications:**

| Specification          | Detail                                                     |
| ---------------------- | ---------------------------------------------------------- |
| Interaction Controls   | Rotate, pan, zoom, orbit                                   |
| Annotation Tools       | Distance measurement, angle measurement, point marking     |
| Time Scrubbing         | Navigate through reconstructed timeline                    |
| Cross-section View     | Ability to slice the model for interior analysis           |
| Browser Compatibility  | Chrome, Firefox, Edge (latest 2 major versions)            |
| Minimum Frame Rate     | 30 FPS for smooth interaction on target hardware           |

#### FR-04-003: Entity Overlay in 3D Scene

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-04-003                                                    |
| **Title**        | Entity Overlay in 3D Scene                                   |
| **Priority**     | P2                                                           |
| **Description**  | The system shall overlay detected entities (persons, vehicles) as 3D markers within the reconstructed scene, linked to their movement trajectories |
| **Rationale**    | Provides clear visual context for entity positions during incidents |

**Specifications:**

| Specification          | Detail                                                     |
| ---------------------- | ---------------------------------------------------------- |
| Entity Representation  | 3D bounding box or simplified avatar                       |
| Trajectory Lines       | Colour-coded path lines per entity                         |
| Click Interaction      | Click entity to view extracted attribute data               |
| Temporal Playback      | Animate entity positions along timeline                    |

#### FR-04-004: Evidence Preservation in 3D Models

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-04-004                                                    |
| **Title**        | Evidence Preservation in 3D Models                           |
| **Priority**     | P1                                                           |
| **Description**  | All reconstructed 3D models shall be cryptographically signed to ensure evidentiary integrity |
| **Rationale**    | Legal admissibility requires tamper-evident preservation     |

**Specifications:**

| Specification      | Detail                                              |
| ------------------ | --------------------------------------------------- |
| Signing Algorithm  | SHA-256 hash embedded in model metadata             |
| Chain of Custody   | All model access logged with user ID and timestamp  |
| Export Controls    | Models exportable with embedded hash manifest       |
| Archival Format    | Immutable archive format with verification manifest |

---

## 6. FR-05: Structured Incident Reporting & Metadata Integration

### 6.1 Overview

The system shall automate the generation of evidentiary documentation ready for judicial processing, and provide integration capabilities for existing Law Enforcement Case Management Systems.

### 6.2 Requirements

#### FR-05-001: Automated Evidence Compilation

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-05-001                                                    |
| **Title**        | Automated Evidence Compilation                               |
| **Priority**     | P1                                                           |
| **Description**  | The system shall aggregate relevant video segments and high-resolution stills into structured incident packages |
| **Rationale**    | Reduces manual evidence gathering time for investigators     |

**Specifications:**

| Specification            | Detail                                                  |
| ------------------------ | ------------------------------------------------------- |
| Video Segment Extraction | Automatically clip footage before, during, and after incident |
| Still Frame Extraction   | High-resolution stills of key events and entity captures |
| Package Format           | Single ZIP archive with structured directory layout     |
| Package Size Limit       | Configurable; default 2 GB per incident                 |
| Package Naming           | Incident ID + timestamp                                 |

#### FR-05-002: Forensic Timestamping

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-05-002                                                    |
| **Title**        | Forensic Timestamping                                        |
| **Priority**     | P0                                                           |
| **Description**  | The system shall maintain synchronised chronological logging of all entity interactions and detection events |
| **Rationale**    | Accurate timelines are essential for evidentiary admissibility |

**Specifications:**

| Specification            | Detail                                                       |
| ------------------------ | ------------------------------------------------------------ |
| Time Source              | NTP-synchronised network time                                |
| Timestamp Precision      | Millisecond precision                                        |
| Logged Events            | Detection, attribute extraction, re-identification, alert generation |
| Drift Tolerance          | ≤ 100 ms drift across all system nodes                       |
| Time Zone Handling       | All timestamps stored in UTC; display in local time zone     |

#### FR-05-003: Trajectory Logs

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-05-003                                                    |
| **Title**        | Trajectory Logs                                              |
| **Priority**     | P1                                                           |
| **Description**  | The system shall generate exportable coordinate data for suspect and vehicle movement paths |
| **Rationale**    | Enables external analysis and visualisation of movement patterns |

**Specifications:**

| Specification      | Detail                                                |
| ------------------ | ----------------------------------------------------- |
| Export Formats     | CSV, JSON, KML, GPX                                   |
| Data Per Waypoint  | Timestamp, latitude, longitude, camera node ID, entity ID |
| Path Continuity    | Interpolated path between detections (linear or spline) |
| Export Scope       | Configurable by time range and entity ID              |

#### FR-05-004: LEO Metadata Integration

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-05-004                                                    |
| **Title**        | Law Enforcement Metadata Integration                         |
| **Priority**     | P1                                                           |
| **Description**  | The system shall export data in standardised formats (XML / JSON) for seamless ingestion into existing Law Enforcement Case Management Systems |
| **Rationale**    | Ensures interoperability with existing police and justice systems |

**Specifications:**

| Specification           | Detail                                                     |
| ----------------------- | ---------------------------------------------------------- |
| Export Formats          | XML (XSD-schema validated), JSON (JSON Schema validated)   |
| Schema Standard         | Aligned with South African Police Service (SAPS) data standards |
| Data Included           | Case ID, entity profiles, timeline, evidence manifest, chain of custody |
| Transport Protocol      | Secure REST API (HTTPS) or SFTP file drop                  |
| Authentication          | API key + OAuth 2.0 for automated system-to-system transfer |
| Schema Versioning       | Explicit version field in all exports; backwards-compatible |

#### FR-05-005: Report Generation Dashboard

| Attribute        | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| **ID**           | FR-05-005                                                    |
| **Title**        | Report Generation Dashboard                                  |
| **Priority**     | P2                                                           |
| **Description**  | The system shall provide a dashboard interface for reviewing, editing, and approving incident reports before export |
| **Rationale**    | Allows quality control before evidence submission            |

**Specifications:**

| Specification          | Detail                                                   |
| ---------------------- | -------------------------------------------------------- |
| Report Preview         | Full report preview with all sections visible            |
| Editing Capabilities   | Add case notes, redact sensitive content, reorder evidence |
| Approval Workflow      | Review → Approve → Export with digital signature          |
| Export Triggers        | Manual export or automated on approval                   |
| Report Templates       | Configurable templates per jurisdiction                  |

---

## Document Revision History

| Version | Date      | Author     | Description of Changes                     |
| ------- | --------- | ---------- | ------------------------------------------ |
| 1.0     | June 2026 | Alpha Tech | Initial functional requirements specification |
