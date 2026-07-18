# Sentinel360 — System Overview

> **Document:** System Overview & Scope
> **Parent Document:** Sentinel360 — AI-Powered Crime Detection & Scene Reconstruction System (v1.0)
> **Group:** Alpha Tech
> **Last Updated:** June 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Analysis](#2-problem-analysis)
3. [System Overview](#3-system-overview)
4. [Scope of the System](#4-scope-of-the-system)
5. [System Impact and Expected Outcomes](#5-system-impact-and-expected-outcomes)
6. [Expected Benefits](#6-expected-benefits)

---

## 1. Introduction

### 1.1 Purpose of the Document

This document defines the functional and non-functional requirements for the Sentinel360 system. It provides a clear understanding of the system's expected behaviour, stakeholders, and operational requirements. This document will guide developers, project managers, and stakeholders during system design and development.

Sentinel360 is engineered to transform passive video surveillance into real-time, actionable forensic intelligence. By integrating edge-based deep learning inference and 360-degree spatial analysis, the system identifies suspicious or criminal behaviour as it manifests, bridging the critical technological gap between raw data storage and proactive investigative resolution.

### 1.2 System Context

| Attribute               | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| **System Name**         | Sentinel360                                                        |
| **System Type**         | AI-Powered Surveillance Intelligence Platform                      |
| **Primary Domain**      | Public Safety & Forensic Investigation                             |
| **Target Market**       | South Africa (Law Enforcement, Security Companies, Businesses)     |
| **Technical Focus**     | Computer Vision, Deep Learning, 3D Scene Reconstruction            |
| **Development Group**   | Alpha Tech                                                         |

### 1.3 Document Structure

| Section     | Description                                                |
| ----------- | ---------------------------------------------------------- |
| Section 2   | Problem Analysis — Deficiencies in current safety systems  |
| Section 3   | System Overview — High-level description of Sentinel360    |
| Section 4   | Scope of the System — Boundaries and capabilities          |
| Section 5   | System Impact and Expected Outcomes — Projected improvements |
| Section 6   | Expected Benefits — Value proposition summary              |

---

## 2. Problem Analysis

### 2.1 Current State of Public Safety Infrastructure

The current public safety infrastructure in South Africa is characterised by reactive monitoring and a reliance on legacy CCTV systems that lack analytical capabilities. The following operational deficiencies justify the requirement for an automated intelligence layer:

### 2.2 Identified Deficiencies

#### 2.2.1 Manual Labour Inefficiency

Investigators currently allocate **60% to 80%** of their operational hours to manual footage review, severely limiting active case resolution. This labour-intensive process diverts skilled personnel from higher-value investigative work.

#### 2.2.2 Scale of the Criminal Landscape

With over **2.5 million serious crimes** recorded annually in South Africa, the sheer volume of data surpasses human cognitive capacity for review. Traditional manual approaches cannot scale to meet this demand.

#### 2.2.3 High Investigation Latency

Standard forensic workflows require **10 to 40 hours** of manual review per incident, often delaying suspect identification by weeks. This latency undermines the ability to apprehend suspects while leads remain fresh.

#### 2.2.4 Commercial Loss and Asset Depletion

Businesses suffer significant financial and property losses due to the inability of passive systems to trigger preventative interventions. Surveillance footage is reviewed after the fact, when assets are already lost.

#### 2.2.5 Community Safety Erosion

Inefficient surveillance leads to reduced public safety and slower justice outcomes, undermining community trust in security infrastructure. The perception of ineffective surveillance reduces public cooperation with law enforcement.

#### 2.2.6 Evidentiary Gaps

Manual surveillance is prone to human oversight, resulting in the loss of critical forensic insights and lower conviction rates. Fatigue, bias, and limited attention spans contribute to missed evidence.

### 2.3 Problem Statement

> South Africa's current surveillance infrastructure is overwhelmingly reactive and manually intensive. The volume of crime data far exceeds the capacity of human review, resulting in delayed investigations, lost evidence, reduced conviction rates, and eroded public trust. An intelligent, automated layer is required to transform passive footage into proactive forensic intelligence.

---

## 3. System Overview

### 3.1 What is Sentinel360?

Sentinel360 is an AI-powered surveillance intelligence system designed to transform traditional CCTV surveillance footage into **real-time forensic intelligence**. The system uses computer vision, artificial intelligence, and deep learning technologies to automatically:

- **Detect** suspicious activities within 360-degree visual fields
- **Identify** individuals and vehicles involved in incidents
- **Track** suspect movements across camera networks
- **Reconstruct** crime scenes in immersive 3D or 360-degree models
- **Generate** structured incident reports ready for judicial processing

### 3.2 Core Capabilities

| Capability                          | Description                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| Real-Time AI Behaviour Detection    | Edge-based deep learning inference for behavioural anomaly identification        |
| Automated Entity Attribute Extraction | Granular forensic profiling including facial, clothing, and vehicular attributes |
| Movement Path Tracking & Re-ID      | Inter-camera re-identification and chronological spatial mapping                 |
| 3D Crime Scene Reconstruction       | Spatial synthesis of 360-degree video into interactive forensic models           |
| Structured Incident Reporting       | Automated evidence compilation with forensic timestamps and trajectory logs      |

### 3.3 Operational Principle

Sentinel360 operates on a **detect-extract-track-reconstruct-report** pipeline:

1. **Detect** — Edge-based AI models continuously monitor surveillance feeds for behavioural anomalies and pre-defined threat patterns
2. **Extract** — Upon detection, granular attributes (facial features, clothing, licence plates, vehicle details) are automatically extracted
3. **Track** — Suspects and vehicles are assigned persistent Entity IDs and tracked across camera nodes with chronological path mapping
4. **Reconstruct** — 360-degree video data is synthesised into interactive 3D forensic models for immersive spatial analysis
5. **Report** — All evidence is compiled into structured, court-ready incident reports with cryptographic chain of custody

---

## 4. Scope of the System

### 4.1 In-Scope Capabilities

Sentinel360 will support law enforcement agencies, security companies, and businesses by:

| # | Capability | Description |
|---|-----------|-------------|
| 1 | **Automatic Suspicious Activity Detection** | AI-driven identification of behavioural anomalies from live surveillance footage |
| 2 | **Person and Vehicle Identification** | High-precision extraction of biometric, physical description, and vehicular attributes |
| 3 | **Cross-Camera Suspect Tracking** | Movement path tracking and re-identification across multiple camera nodes |
| 4 | **Incident Visualisation** | 3D and 360-degree reconstruction of crime scenes for immersive investigation |
| 5 | **Structured Investigation Reports** | Automated generation of evidentiary documentation with forensic timestamps |
| 6 | **Real-Time Alerts and Notifications** | Sub-second alert generation to security personnel upon threat detection |

### 4.2 Out-of-Scope Capabilities

The following are explicitly outside the scope of the current Sentinel360 system:

| # | Capability | Rationale |
|---|-----------|-----------|
| 1 | **Physical access control** (door locks, barriers) | Sentinel360 is a surveillance intelligence layer, not a physical security automation system |
| 2 | **Drone or robotics integration** | Hardware integration beyond fixed CCTV cameras is deferred to future releases |
| 3 | **Predictive crime forecasting** | The system detects ongoing incidents; predictive analytics are not within scope |
| 4 | **Social media monitoring** | The system operates exclusively on CCTV footage and user-submitted data |
| 5 | **Direct law enforcement dispatch** | Notifications go to security operators; formal dispatch procedures remain with authorities |

### 4.3 Target Users

| User Type                     | Primary Interaction                                        |
| ----------------------------- | ---------------------------------------------------------- |
| Security Operators            | Monitor live feeds, respond to system-generated alerts     |
| Investigators                 | Review incident data, analyse suspect movements, reconstruct scenes |
| System Administrators         | Manage system configuration, user permissions, data storage |
| Law Enforcement Officials     | Gather digital evidence, support criminal investigations   |
| Community Members             | Submit sightings, receive safety alerts, view wanted feed  |

### 4.4 Integration Boundaries

- **Input:** Existing CCTV infrastructure (360-degree cameras, fixed surveillance cameras)
- **Output:** Alerts (push notifications, in-app), structured reports (XML/JSON), 3D visualisations
- **External Systems:** Law Enforcement Case Management Systems (via XML/JSON export)

---

## 5. System Impact and Expected Outcomes

### 5.1 Measured Improvements

| Metric                       | Current State (Manual)                | Future State (Sentinel360)                                    |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| Review Time Per Incident     | 10 – 40 hours                         | Automated / sub-second alerting                               |
| Personnel Allocation         | 60–80% of time spent on manual search | 90% reduction in review time; personnel focused on resolution |
| Data Utility                 | Passive, siloed recordings            | Structured, actionable forensic intelligence                  |
| Detection Timing             | Post-incident (reactive)              | In-progress (proactive / real-time)                           |
| Public Safety Outcome        | Delayed suspect identification        | Rapid suspect apprehension and evidentiary clarity            |

### 5.2 Operational Impact Summary

| Area                    | Projected Impact                                                   |
| ----------------------- | ------------------------------------------------------------------ |
| Investigation Speed     | Reduction from days/weeks of manual review to sub-second alerting  |
| Personnel Efficiency    | 90% reduction in time spent on manual footage review               |
| Evidence Quality        | Machine-driven objectivity eliminates fatigue-related human errors |
| Response Time           | Real-time detection enables in-progress intervention               |
| Case Resolution         | Structured, court-ready evidence accelerates judicial processes    |

### 5.3 Key Performance Indicators (Target)

| KPI                              | Target Value      |
| -------------------------------- | ----------------- |
| Alert Generation Latency         | < 1 second        |
| Review Time Reduction            | ≥ 90%             |
| AI Inference Confidence (Facial) | ≥ 95%             |
| AI Inference Confidence (LPR)    | ≥ 95%             |
| System Uptime                    | 99.9%             |
| False Positive Rate (Alerts)     | < 5%              |

---

## 6. Expected Benefits

Sentinel360 will deliver the following benefits:

### 6.1 Faster Crime Investigation

Automated detection and alerting reduces investigation timelines from weeks to minutes, enabling law enforcement to act while leads remain fresh.

### 6.2 Reduced Manual Video Review

AI-driven attribute extraction and tracking eliminates 90% of manual footage review, freeing investigators to focus on case resolution rather than evidence discovery.

### 6.3 Improved Suspect Identification Accuracy

High-confidence facial recognition (≥95%) and Automatic Licence Plate Recognition (ALPR) ensure that suspect and vehicle identifications meet evidentiary standards for judicial admissibility.

### 6.4 Better Evidence Collection

Structured, court-ready reporting with cryptographic chain of custody ensures that evidence is collected, preserved, and presented in a legally admissible format.

### 6.5 Increased Public Safety

Proactive, real-time threat detection and community alerting enables preventative interventions and rapid suspect apprehension, strengthening public trust in security infrastructure.

### 6.6 Cost Efficiency

By reducing manual labour requirements and accelerating case resolution, Sentinel360 delivers significant operational cost savings for security companies and law enforcement agencies.

---

## Document Revision History

| Version | Date      | Author     | Description of Changes             |
| ------- | --------- | ---------- | ---------------------------------- |
| 1.0     | June 2026 | Alpha Tech | Initial system overview document   |
