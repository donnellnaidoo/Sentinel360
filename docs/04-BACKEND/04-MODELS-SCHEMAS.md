# 04 — Models & Schemas

> **Sentinel360 Backend — Complete Data Models & Validation Schemas**
> Version: 1.0 | Last Updated: June 2026

---

## Table of Contents

1. [Complete TypeScript Type Definitions](#1-complete-typescript-type-definitions)
2. [Enum Definitions](#2-enum-definitions)
3. [API Request/Response Schemas](#3-api-requestresponse-schemas)
4. [Serialization & Deserialization](#4-serialization--deserialization)
5. [Database Views & Materialized Views](#5-database-views--materialized-views)

---

## 1. Complete TypeScript Type Definitions

```typescript
// src/types/models.ts

// ============================================================================
// ENUMS
// ============================================================================

export enum UserRole {
  COMMUNITY = "COMMUNITY",
  SECURITY = "SECURITY",
  LAW_ENFORCEMENT = "LAW_ENFORCEMENT",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum UserStatus {
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DEACTIVATED = "DEACTIVATED",
  LOCKED = "LOCKED",
}

export enum CaseStatus {
  OPEN = "OPEN",
  UNDER_INVESTIGATION = "UNDER_INVESTIGATION",
  CLOSED = "CLOSED",
  ARCHIVED = "ARCHIVED",
  COLD = "COLD",
}

export enum CasePriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum EvidenceType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
  AUDIO = "AUDIO",
  OTHER = "OTHER",
}

export enum EvidenceStatus {
  PENDING_REVIEW = "PENDING_REVIEW",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  ADMITTED = "ADMITTED",
  EXPUNGED = "EXPUNGED",
}

export enum ChainOfCustodyAction {
  UPLOADED = "UPLOADED",
  REVIEWED = "REVIEWED",
  VERIFIED = "VERIFIED",
  TRANSFERRED = "TRANSFERRED",
  EXPORTED = "EXPORTED",
  ARCHIVED = "ARCHIVED",
  EXPUNGED = "EXPUNGED",
}

export enum CriminalProfileStatus {
  ACTIVE = "ACTIVE",
  ARRESTED = "ARRESTED",
  CLEARED = "CLEARED",
  DECEASED = "DECEASED",
  ARCHIVED = "ARCHIVED",
}

export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum SightingStatus {
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
  VERIFIED = "VERIFIED",
  DISMISSED = "DISMISSED",
  DUPLICATE = "DUPLICATE",
  ACTIONED = "ACTIONED",
}

export enum AlertType {
  SIGHTING_MATCH = "SIGHTING_MATCH",
  BEHAVIOR_DETECTION = "BEHAVIOR_DETECTION",
  CASE_UPDATE = "CASE_UPDATE",
  SYSTEM_ALERT = "SYSTEM_ALERT",
  SECURITY_BULLETIN = "SECURITY_BULLETIN",
  COMMUNITY_ALERT = "COMMUNITY_ALERT",
}

export enum AlertSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum AlertDeliveryStatus {
  PENDING = "PENDING",
  DELIVERED = "DELIVERED",
  READ = "READ",
  DISMISSED = "DISMISSED",
  FAILED = "FAILED",
}

export enum DetectionType {
  SUSPICIOUS_BEHAVIOR = "SUSPICIOUS_BEHAVIOR",
  FACIAL_MATCH = "FACIAL_MATCH",
  LICENSE_PLATE = "LICENSE_PLATE",
  VEHICLE_MATCH = "VEHICLE_MATCH",
  INTRUSION = "INTRUSION",
  WEAPON_DETECTION = "WEAPON_DETECTION",
  LOITERING = "LOITERING",
  TRESPASSING = "TRESPASSING",
}

export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  VIEW = "VIEW",
  EXPORT = "EXPORT",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  VERIFY = "VERIFY",
  REJECT = "REJECT",
  APPROVE = "APPROVE",
  ARCHIVE = "ARCHIVE",
  RESTORE = "RESTORE",
  PERMANENT_DELETE = "PERMANENT_DELETE",
}

// ============================================================================
// INTERFACE DEFINITIONS
// ============================================================================

/** Geographic coordinates */
export interface GeoPoint {
  lat: number;        // -90 to 90
  lng: number;        // -180 to 180
}

export interface LocationData extends GeoPoint {
  address?: string;
  region?: string;     // e.g. "Gauteng", "Western Cape"
  country?: string;    // ISO 3166-1 alpha-2
  postalCode?: string;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Cursor-based pagination */
export interface CursorPaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

/** API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: PaginationMeta | CursorPaginationMeta;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Authenticated user context (attached to request) */
export interface AuthUser {
  id: string;
  role: UserRole;
  tokenId: string;
}

// ============================================================================
// USER MODELS
// ============================================================================

export interface UserData {
  id: string;
  email: string;
  name: string;
  phoneNumber: string | null;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  alertRadius: number | null;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  alertRadius?: number;           // km
  notifications?: {
    push?: boolean;
    email?: boolean;
    inApp?: boolean;
    sms?: boolean;
  };
  theme?: "light" | "dark" | "system";
  language?: string;              // locale code
  timezone?: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UserRegistrationResult {
  user: Omit<UserData, "preferences">;
  requiresEmailVerification: boolean;
}

// ============================================================================
// CRIMINAL PROFILE MODELS
// ============================================================================

export interface PhysicalDescription {
  height?: string;            // e.g. "180cm"
  build?: string;             // "slim", "athletic", "heavy"
  eyeColor?: string;
  hairColor?: string;
  hairStyle?: string;
  scars?: string[];
  tattoos?: string[];
  distinctiveMarkers?: string[];
  clothing?: string;
  accessories?: string[];
  race?: string;
  gender?: string;
  ageRange?: { min: number; max: number };
}

export interface VehicleInfo {
  plate: string;
  make: string;
  model: string;
  color: string;
  year?: number;
  type?: string;              // "sedan", "SUV", "truck", "motorcycle"
  notes?: string;
}

export interface CaseNote {
  id: string;
  note: string;
  authorId: string;
  authorName: string;
  timestamp: string;
}

export interface Warrant {
  warrantNumber: string;
  issuingAuthority: string;
  charges: string[];
  issuedDate: string;
  expiryDate?: string;
  jurisdiction?: string;
}

export interface BiometricData {
  faceEncoding?: number[];    // Face embedding vector
  irisCode?: string;          // Encrypted iris data
  fingerprintHash?: string;   // Hash of fingerprint data
  dnaProfileHash?: string;    // Hash of DNA data (privacy preserved)
  voicePrint?: string;        // Voice biometric reference
}

export interface CriminalProfileData {
  id: string;
  fullName: string;
  aliases: string[];
  dateOfBirth: string | null;
  nationality: string | null;
  idNumber: string | null;
  riskLevel: RiskLevel;
  status: CriminalProfileStatus;
  photoUrl: string | null;
  physicalDescription: PhysicalDescription | null;
  biometricData: BiometricData | null;
  vehicleInfo: VehicleInfo[];
  lastKnownLocation: LocationData | null;
  wantedSince: string | null;
  caseNotes: CaseNote[];
  warrants: Warrant[];
  rewardAmount: number | null;
  sightingCount: number;
  createdById: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCriminalProfileInput {
  fullName: string;
  aliases?: string[];
  dateOfBirth?: string;
  nationality?: string;
  idNumber?: string;
  riskLevel?: RiskLevel;
  physicalDescription?: PhysicalDescription;
  vehicleInfo?: VehicleInfo[];
  lastKnownLocation?: LocationData;
  photoUrl?: string;
  caseNotes?: { note: string }[];
}

export interface UpdateCriminalProfileInput {
  fullName?: string;
  aliases?: string[];
  dateOfBirth?: string;
  nationality?: string;
  idNumber?: string;
  riskLevel?: RiskLevel;
  physicalDescription?: PhysicalDescription;
  vehicleInfo?: VehicleInfo[];
  lastKnownLocation?: LocationData;
  photoUrl?: string;
}

// ============================================================================
// CASE MODELS
// ============================================================================

export interface CaseData {
  id: string;
  caseNumber: string;
  title: string;
  description: string | null;
  status: CaseStatus;
  priority: CasePriority;
  incidentDate: string | null;
  incidentLocation: LocationData | null;
  crimeType: string | null;
  assignedTo: UserBrief | null;
  createdBy: UserBrief;
  evidenceCount: number;
  suspectCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDetailData extends CaseData {
  evidence: EvidenceData[];
  suspects: CaseSuspectData[];
  timeline: CaseEvent[];
}

export interface UserBrief {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface CreateCaseInput {
  title: string;
  description?: string;
  crimeType?: string;
  priority?: CasePriority;
  incidentDate?: string;
  incidentLocation?: LocationData;
  assignedToId?: string;
  createdById: string;
}

export interface UpdateCaseInput {
  title?: string;
  description?: string;
  crimeType?: string;
  priority?: CasePriority;
  incidentDate?: string;
  incidentLocation?: LocationData;
  assignedToId?: string;
  status?: CaseStatus;
}

/** Case event timeline entry */
export interface CaseEvent {
  id: string;
  type: "CASE_CREATED" | "EVIDENCE_ADDED" | "SUSPECT_ADDED"
      | "STATUS_CHANGED" | "ASSIGNED" | "NOTE_ADDED" | "EVIDENCE_VERIFIED";
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// EVIDENCE MODELS
// ============================================================================

export interface ChainOfCustodyEntry {
  id: string;
  evidenceId: string;
  action: ChainOfCustodyAction;
  performedById: string;
  performedByName: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface EvidenceData {
  id: string;
  caseId: string;
  fileName: string;
  fileType: EvidenceType;
  mimeType: string;
  fileSize: number;
  filePath: string;
  thumbnailPath: string | null;
  sha256Hash: string;
  status: EvidenceStatus;
  description: string | null;
  metadata: EvidenceMetadata;
  uploadedBy: UserBrief;
  chainOfCustody: ChainOfCustodyEntry[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceMetadata {
  width?: number;                     // Image/video width
  height?: number;                    // Image/video height
  duration?: number;                  // Video duration in seconds
  gpsLatitude?: number;
  gpsLongitude?: number;
  captureTimestamp?: string;
  cameraModel?: string;
  cameraId?: string;
  aiAnalysisId?: string;              // Reference to AI analysis results
  aiConfidence?: number;
  aiDetections?: AIDetection[];
  exifData?: Record<string, unknown>;
}

export interface AIDetection {
  type: DetectionType;
  confidence: number;
  boundingBox: BoundingBox;
  attributes?: Record<string, unknown>;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CreateEvidenceInput {
  file: Express.Multer.File;
  description?: string;
  uploadedById: string;
  metadata?: Partial<EvidenceMetadata>;
}

// ============================================================================
// SIGHTING MODELS
// ============================================================================

export interface SightingData {
  id: string;
  userId: string;
  userName: string;
  profileId: string | null;
  profileName?: string | null;
  location: LocationData;
  description: string | null;
  photoUrl: string | null;
  confidence: number | null;
  status: SightingStatus;
  referenceNumber: string;
  verifiedBy: UserBrief | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSightingInput {
  profileId?: string;
  description: string;
  location: LocationData;
  photo?: string;
}

// ============================================================================
// ALERT MODELS
// ============================================================================

export interface AlertData {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  body: string | null;
  caseId: string | null;
  profileId: string | null;
  location: LocationData | null;
  deliveryStatus: AlertDeliveryStatus;  // For the current user
  readAt: string | null;
  createdAt: string;
}

export interface CreateAlertInput {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  body?: string;
  caseId?: string;
  profileId?: string;
  location?: LocationData;
  targetRoles?: UserRole[];
  targetRegions?: string[];
  scheduledFor?: string;
  expiresAt?: string;
  createdById: string;
}

// ============================================================================
// DETECTION EVENT MODELS
// ============================================================================

export interface DetectionEventData {
  id: string;
  cameraId: string;
  detectionType: DetectionType;
  confidence: number;
  timestamp: string;
  location: GeoPoint | null;
  boundingBox: BoundingBox | null;
  snapshotUrl: string | null;
  thumbnailUrl: string | null;
  entityId: string | null;
  attributes: DetectionAttributes | null;
  modelVersion: string;
  processed: boolean;
  caseId: string | null;
}

export interface DetectionAttributes {
  age?: string;           // Estimated age range
  gender?: string;        // Estimated gender
  clothing?: {
    color?: string;
    type?: string;
  };
  vehicle?: {
    plate?: string;
    make?: string;
    model?: string;
    color?: string;
  };
  behavior?: string[];    // Detected behavior flags
  speed?: number;         // For vehicle tracking
  direction?: string;     // Movement direction
}

// ============================================================================
// AUDIT LOG MODELS
// ============================================================================

export interface AuditLogData {
  id: string;
  userId: string | null;
  userName: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ============================================================================
// SEARCH MODELS
// ============================================================================

export interface SearchQuery {
  q: string;                      // Search term
  type?: "all" | "profiles" | "cases" | "evidence" | "sightings";
  status?: string;                // Filter by status
  region?: string;                // Filter by region
  dateFrom?: string;              // ISO date filter
  dateTo?: string;                // ISO date filter
  page?: number;
  limit?: number;
}

export interface SearchResult {
  profiles: SearchHit[];
  cases: SearchHit[];
  evidence: SearchHit[];
  sightings: SearchHit[];
  total: number;
}

export interface SearchHit {
  id: string;
  type: string;
  title: string;
  description: string;
  url: string;                    // API URL to fetch full details
  score: number;                  // Relevance score
  highlights?: string[];          // Matching text snippets
  thumbnail?: string;             // Thumbnail URL if applicable
  createdAt: string;
}

// ============================================================================
// DASHBOARD / ANALYTICS MODELS
// ============================================================================

export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  openCases: number;
  totalProfiles: number;
  activeProfiles: number;
  totalSightings: number;
  pendingSightings: number;
  totalAlertsSent: number;
  alertsToday: number;
  totalEvidence: number;
  pendingEvidence: number;
  totalUsers: number;
  activeUsers: number;
  recentDetections: number;
  caseResolutionRate: number;     // Percentage
  averageResolutionDays: number;
}

export interface TimeSeriesDataPoint {
  date: string;                   // YYYY-MM-DD
  value: number;
}

export interface AnalyticsReport {
  alertsOverTime: TimeSeriesDataPoint[];
  casesByStatus: { status: string; count: number }[];
  casesByPriority: { priority: string; count: number }[];
  casesByRegion: { region: string; count: number }[];
  casesByType: { type: string; count: number }[];
  sightingsByStatus: { status: string; count: number }[];
  topWantedProfiles: { id: string; name: string; sightings: number }[];
  detectionByType: { type: string; count: number }[];
  userActivity: TimeSeriesDataPoint[];
}

// ============================================================================
// WEBSOCKET MODELS
// ============================================================================

export interface WSMessage {
  type: "subscribe" | "unsubscribe" | "ping" | "pong";
  channels?: string[];
}

export interface WSAlertEvent {
  type: "alert";
  data: {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    body?: string;
    channels: string[];
    userIds?: string[];
    timestamp: string;
  };
}

export interface WSConnectionEvent {
  type: "connected";
  data: {
    userId: string | undefined;
    timestamp: string;
  };
}
```

---

## 2. Enum Definitions

### 2.1 Enum Values Table

| Enum | Values | Purpose |
|------|--------|---------|
| **UserRole** | COMMUNITY, SECURITY, LAW_ENFORCEMENT, ADMIN, SUPER_ADMIN | User access hierarchy |
| **UserStatus** | PENDING_VERIFICATION, ACTIVE, SUSPENDED, DEACTIVATED, LOCKED | User account lifecycle |
| **CaseStatus** | OPEN, UNDER_INVESTIGATION, CLOSED, ARCHIVED, COLD | Case workflow state |
| **CasePriority** | LOW, MEDIUM, HIGH, CRITICAL | Investigation urgency |
| **EvidenceType** | IMAGE, VIDEO, DOCUMENT, AUDIO, OTHER | File classification |
| **EvidenceStatus** | PENDING_REVIEW, VERIFIED, REJECTED, ADMITTED, EXPUNGED | Evidence lifecycle |
| **CriminalProfileStatus** | ACTIVE, ARRESTED, CLEARED, DECEASED, ARCHIVED | Person status workflow |
| **RiskLevel** | LOW, MEDIUM, HIGH, CRITICAL | Threat assessment |
| **SightingStatus** | PENDING_VERIFICATION, VERIFIED, DISMISSED, DUPLICATE, ACTIONED | Community report workflow |
| **AlertType** | SIGHTING_MATCH, BEHAVIOR_DETECTION, CASE_UPDATE, SYSTEM_ALERT, SECURITY_BULLETIN, COMMUNITY_ALERT | Notification categorization |
| **AlertSeverity** | LOW, MEDIUM, HIGH, CRITICAL | Alert urgency |
| **DetectionType** | SUSPICIOUS_BEHAVIOR, FACIAL_MATCH, LICENSE_PLATE, VEHICLE_MATCH, INTRUSION, WEAPON_DETECTION, LOITERING, TRESPASSING | AI detection categories |
| **AuditAction** | CREATE, UPDATE, DELETE, VIEW, EXPORT, LOGIN, LOGOUT, VERIFY, REJECT, APPROVE, ARCHIVE, RESTORE, PERMANENT_DELETE | Audited system actions |
| **ChainOfCustodyAction** | UPLOADED, REVIEWED, VERIFIED, TRANSFERRED, EXPORTED, ARCHIVED, EXPUNGED | Evidence handling history |

### 2.2 Enum Validation Rules

```typescript
// src/types/enum-helpers.ts

/**
 * Validate a value against an enum
 */
export function isValidEnum<T extends Record<string, string>>(
  enumObj: T,
  value: string,
): value is T[keyof T] {
  return Object.values(enumObj).includes(value as T[keyof T]);
}

/**
 * Get valid enum values as array
 */
export function getEnumValues<T extends Record<string, string>>(
  enumObj: T,
): string[] {
  return Object.values(enumObj);
}

/**
 * Create Zod enum from TypeScript enum
 */
export function zodEnum<T extends Record<string, string>>(enumObj: T) {
  return z.enum(getEnumValues(enumObj) as [string, ...string[]]);
}
```

---

## 3. API Request/Response Schemas

### 3.1 Request Validation Schemas

```typescript
// src/validators/auth.validator.ts

import { z } from "zod";

// Password regex: 8+ chars, uppercase, lowercase, number, special
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+[\]{}|;:',.<>/?`~])[A-Za-z\d@$!%*?&#^()\-_=+[\]{}|;:',.<>/?`~]{8,}$/,
    "Password must contain uppercase, lowercase, number, and special character",
  );

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name too long")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255)
    .transform((e) => e.toLowerCase().trim()),
  password: passwordSchema,
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number (E.164 format)")
    .optional(),
  role: z
    .enum(["COMMUNITY", "SECURITY"])
    .optional()
    .default("COMMUNITY"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .transform((e) => e.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
});

export const twoFactorSetupSchema = z.object({});

export const twoFactorConfirmSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric"),
});

export const twoFactorVerifySchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric"),
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1, "Password is required"),
});
```

```typescript
// src/validators/profile.validator.ts

import { z } from "zod";

export const createProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255)
    .trim(),
  aliases: z.array(z.string().max(255)).max(20).optional().default([]),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format").optional(),
  nationality: z.string().max(100).optional(),
  idNumber: z.string().max(50).optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().default("MEDIUM"),
  physicalDescription: z.object({
    height: z.string().max(50).optional(),
    build: z.string().max(50).optional(),
    eyeColor: z.string().max(50).optional(),
    hairColor: z.string().max(50).optional(),
    hairStyle: z.string().max(50).optional(),
    scars: z.array(z.string()).optional(),
    tattoos: z.array(z.string()).optional(),
    distinctiveMarkers: z.array(z.string()).optional(),
    clothing: z.string().max(255).optional(),
    accessories: z.array(z.string()).optional(),
    gender: z.string().max(50).optional(),
  }).optional(),
  vehicleInfo: z.array(z.object({
    plate: z.string().max(20),
    make: z.string().max(50),
    model: z.string().max(50),
    color: z.string().max(30),
    year: z.number().int().min(1900).max(2030).optional(),
    notes: z.string().max(500).optional(),
  })).max(10).optional(),
  lastKnownLocation: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().max(500).optional(),
    region: z.string().max(100).optional(),
  }).optional(),
  photoUrl: z.string().url().max(500).optional(),
});

export const updateProfileSchema = createProfileSchema.partial();

export const profileStatusSchema = z.object({
  status: z.enum(["ACTIVE", "ARRESTED", "CLEARED", "DECEASED", "ARCHIVED"]),
  reason: z.string().min(10).max(1000),
  arrestDate: z.string().datetime().optional(),
  arrestingOfficer: z.string().max(255).optional(),
});

export const profileQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(["ACTIVE", "ARRESTED", "CLEARED", "DECEASED", "ARCHIVED"]).optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  search: z.string().max(200).optional(),
  region: z.string().max(100).optional(),
  sortBy: z.enum(["createdAt", "fullName", "wantedSince", "updatedAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
```

```typescript
// src/validators/search.validator.ts

import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters").max(200),
  type: z.enum(["all", "profiles", "cases", "evidence", "sightings"]).optional().default("all"),
  status: z.string().max(50).optional(),
  region: z.string().max(100).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
```

### 3.2 Response Schema Registry

```typescript
// src/types/responses.ts

// Registry of all API response schemas for documentation & client generation

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    database: "healthy" | "unhealthy";
    redis: "healthy" | "unhealthy";
    storage: "healthy" | "unhealthy";
    search: "healthy" | "unhealthy";
  };
}

export interface LoginResponse {
  user: UserData;
  accessToken: string;
  expiresIn: number;
  requiresTwoFactor?: false;
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  sessionId: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface EvidenceUploadResponse {
  id: string;
  fileName: string;
  fileType: EvidenceType;
  fileSize: number;
  sha256Hash: string;
  thumbnailUrl: string | null;
}

export interface CaseTimelineResponse {
  caseId: string;
  events: CaseEvent[];
}

export interface AlertUnreadCountResponse {
  unread: number;
  total: number;
}
```

---

## 4. Serialization & Deserialization

### 4.1 Response Serialization

```typescript
// src/utils/serialize.ts

/**
 * Serializes database models to API response format.
 * Strips sensitive fields, converts dates to ISO strings,
 * and formats nested relations.
 */

import { User, Case, Evidence, CriminalProfile, Sighting, Alert } from "@prisma/client";

export function serializeUser(user: User): Omit<UserData, "preferences"> {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phoneNumber: user.phoneNumber,
    role: user.role as UserRole,
    status: user.status as UserStatus,
    avatarUrl: user.avatarUrl,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    twoFactorEnabled: user.twoFactorEnabled,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    alertRadius: user.alertRadius,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function serializeUserBrief(user: { id: string; name: string; email?: string; avatarUrl?: string | null }): UserBrief {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export function serializeCase(caseData: any): CaseData {
  return {
    id: caseData.id,
    caseNumber: caseData.caseNumber,
    title: caseData.title,
    description: caseData.description,
    status: caseData.status as CaseStatus,
    priority: caseData.priority as CasePriority,
    incidentDate: caseData.incidentDate?.toISOString() ?? null,
    incidentLocation: caseData.incidentLocation as LocationData | null,
    crimeType: caseData.crimeType,
    assignedTo: caseData.assignedTo ? serializeUserBrief(caseData.assignedTo) : null,
    createdBy: serializeUserBrief(caseData.createdBy),
    evidenceCount: caseData._count?.evidence ?? (caseData.evidence?.length ?? 0),
    suspectCount: caseData._count?.suspects ?? (caseData.suspects?.length ?? 0),
    version: caseData.version,
    createdAt: caseData.createdAt.toISOString(),
    updatedAt: caseData.updatedAt.toISOString(),
  };
}

export function serializeEvidence(evidence: any): EvidenceData {
  return {
    id: evidence.id,
    caseId: evidence.caseId,
    fileName: evidence.fileName,
    fileType: evidence.fileType as EvidenceType,
    mimeType: evidence.mimeType,
    fileSize: evidence.fileSize,
    filePath: evidence.filePath,
    thumbnailPath: evidence.thumbnailPath,
    sha256Hash: evidence.sha256Hash,
    status: evidence.status as EvidenceStatus,
    description: evidence.description,
    metadata: (evidence.metadata ?? {}) as EvidenceMetadata,
    uploadedBy: serializeUserBrief(evidence.uploadedBy),
    chainOfCustody: (evidence.chainOfCustody ?? []) as ChainOfCustodyEntry[],
    version: evidence.version,
    createdAt: evidence.createdAt.toISOString(),
    updatedAt: evidence.updatedAt.toISOString(),
  };
}

export function serializeProfile(profile: any): CriminalProfileData {
  return {
    id: profile.id,
    fullName: profile.fullName,
    aliases: (profile.aliases ?? []) as string[],
    dateOfBirth: profile.dateOfBirth?.toISOString() ?? null,
    nationality: profile.nationality,
    idNumber: profile.idNumber,
    riskLevel: profile.riskLevel as RiskLevel,
    status: profile.status as CriminalProfileStatus,
    photoUrl: profile.photoUrl,
    physicalDescription: profile.physicalDescription as PhysicalDescription | null,
    biometricData: profile.biometricData as BiometricData | null,
    vehicleInfo: (profile.vehicleInfo ?? []) as VehicleInfo[],
    lastKnownLocation: profile.lastKnownLocation as LocationData | null,
    wantedSince: profile.wantedSince?.toISOString() ?? null,
    caseNotes: (profile.caseNotes ?? []) as CaseNote[],
    warrants: (profile.warrants ?? []) as Warrant[],
    rewardAmount: profile.rewardAmount ? Number(profile.rewardAmount) : null,
    sightingCount: profile._count?.sightings ?? 0,
    createdById: profile.createdById,
    version: profile.version,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function serializeSighting(sighting: any): SightingData {
  return {
    id: sighting.id,
    userId: sighting.userId,
    userName: sighting.user?.name ?? "Anonymous",
    profileId: sighting.profileId,
    profileName: sighting.profile?.fullName ?? null,
    location: sighting.location as LocationData,
    description: sighting.description,
    photoUrl: sighting.photoUrl,
    confidence: sighting.confidence ? Number(sighting.confidence) : null,
    status: sighting.status as SightingStatus,
    referenceNumber: sighting.referenceNumber,
    verifiedBy: sighting.verifiedBy ? serializeUserBrief(sighting.verifiedBy) : null,
    verifiedAt: sighting.verifiedAt?.toISOString() ?? null,
    rejectionReason: sighting.rejectionReason,
    evidenceCount: sighting.evidence?.length ?? 0,
    createdAt: sighting.createdAt.toISOString(),
    updatedAt: sighting.updatedAt.toISOString(),
  };
}

export function serializeAlert(alert: any, deliveryStatus?: AlertDeliveryStatus): AlertData {
  return {
    id: alert.id,
    type: alert.type as AlertType,
    severity: alert.severity as AlertSeverity,
    title: alert.title,
    body: alert.body,
    caseId: alert.caseId,
    profileId: alert.profileId,
    location: alert.location as LocationData | null,
    deliveryStatus: deliveryStatus ?? "DELIVERED",
    readAt: alert.readAt?.toISOString() ?? alert.recipients?.[0]?.readAt?.toISOString() ?? null,
    createdAt: alert.createdAt.toISOString(),
  };
}

/**
 * Serializes dates in objects to ISO strings recursively
 */
export function deepSerializeDates(obj: unknown): unknown {
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSerializeDates);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepSerializeDates(value);
    }
    return result;
  }
  return obj;
}
```

### 4.2 Deserialization (Input Parsing)

```typescript
// src/utils/deserialize.ts

/**
 * Deserializes API request input into service-level objects.
 * Handles string-to-date conversion, JSON parsing from form data, etc.
 */

export function parseDateInput(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

export function parseJsonField(value: string | object | undefined | null): object | undefined {
  if (!value) return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function parseNumeric(value: string | number | undefined | null): number | undefined {
  if (value === null || value === undefined) return undefined;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? undefined : num;
}

export function parseBoolean(value: string | boolean | undefined | null): boolean | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  return value === "true" || value === "1" || value === "yes";
}
```

---

## 5. Database Views & Materialized Views

### 5.1 Materialized View: Wanted Feed

```sql
-- src/models/views/wanted-feed.sql

CREATE MATERIALIZED VIEW mv_wanted_feed AS
SELECT
  cp.id,
  cp.full_name,
  cp.photo_url,
  cp.risk_level,
  cp.status,
  cp.last_known_location,
  cp.wanted_since,
  cp.reward_amount,
  COALESCE(s.sighting_count, 0) AS total_sightings,
  COALESCE(s.recent_sighting, NULL) AS last_sighting_at,
  cp.updated_at
FROM criminal_profiles cp
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS sighting_count,
    MAX(s.created_at) AS recent_sighting
  FROM sightings s
  WHERE s.profile_id = cp.id
    AND s.status = 'VERIFIED'
) s ON true
WHERE cp.status = 'ACTIVE'
  AND cp.deleted_at IS NULL
ORDER BY cp.wanted_since DESC;

CREATE UNIQUE INDEX idx_mv_wanted_feed_id ON mv_wanted_feed (id);
CREATE INDEX idx_mv_wanted_feed_date ON mv_wanted_feed (wanted_since DESC);
CREATE INDEX idx_mv_wanted_feed_risk ON mv_wanted_feed (risk_level);
```

### 5.2 View: Active Cases Summary

```sql
CREATE VIEW v_active_cases AS
SELECT
  c.id,
  c.case_number,
  c.title,
  c.status,
  c.priority,
  c.crime_type,
  c.incident_location->>'region' AS region,
  c.created_at,
  c.updated_at,
  u.name AS assigned_to,
  COALESCE(e.evidence_count, 0) AS evidence_count,
  COALESCE(s.suspect_count, 0) AS suspect_count,
  COALESCE(a.alert_count, 0) AS alert_count,
  CASE
    WHEN c.updated_at > NOW() - INTERVAL '7 days' THEN 'recent'
    WHEN c.updated_at > NOW() - INTERVAL '30 days' THEN 'normal'
    ELSE 'stale'
  END AS activity_level
FROM cases c
LEFT JOIN users u ON c.assigned_to_id = u.id
LEFT JOIN (SELECT case_id, COUNT(*) AS evidence_count FROM evidence WHERE deleted_at IS NULL GROUP BY case_id) e ON c.id = e.case_id
LEFT JOIN (SELECT case_id, COUNT(*) AS suspect_count FROM case_suspects GROUP BY case_id) s ON c.id = s.case_id
LEFT JOIN (SELECT case_id, COUNT(*) AS alert_count FROM alerts GROUP BY case_id) a ON c.id = a.case_id
WHERE c.deleted_at IS NULL;
```

### 5.3 View: Sighting Leaderboard

```sql
CREATE VIEW v_sighting_leaderboard AS
SELECT
  cp.id,
  cp.full_name,
  cp.photo_url,
  cp.risk_level,
  COUNT(s.id) AS total_sightings,
  COUNT(s.id) FILTER (WHERE s.status = 'VERIFIED') AS verified_sightings,
  COUNT(s.id) FILTER (WHERE s.created_at > NOW() - INTERVAL '7 days') AS sightings_this_week,
  MAX(s.created_at) AS last_sighting
FROM criminal_profiles cp
JOIN sightings s ON cp.id = s.profile_id
WHERE cp.deleted_at IS NULL
GROUP BY cp.id, cp.full_name, cp.photo_url, cp.risk_level
ORDER BY total_sightings DESC;
```

---

## Summary

- **Complete TypeScript type definitions** for all 14 entity types with comprehensive interfaces
- **14 enum definitions** covering all statuses, roles, and categorizations with validation helpers
- **Validation schemas** using Zod for every API endpoint with granular field rules
- **Response schemas** for documentation and auto-generated client types
- **Serialization layer** that strips sensitive fields, converts dates, and formats nested relations
- **Database views** with materialized view for wanted feed performance optimization
- **Type safety** throughout the stack from database to API responses
