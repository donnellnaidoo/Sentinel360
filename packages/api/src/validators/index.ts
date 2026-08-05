import { z } from "zod";

export const emailSchema = z.object({
  email: z.string().email(),
});

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const forgotPasswordSchema = emailSchema;

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  image: z.string().url().optional(),
});

export const idSchema = z.object({
  id: z.string().min(1),
});

export const userIdSchema = z.object({
  userId: z.string().min(1),
});

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordSchema.optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  organizationId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(100).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  image: z.string().url().optional(),
  isActive: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  organizationId: z.string().uuid().nullable().optional(),
});

export const userListSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.union([z.literal("active"), z.literal("inactive"), z.literal("locked")]).optional(),
  organizationId: z.string().uuid().optional(),
});

export const sessionIdSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
});

export const createRoleSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const updateRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
});

export const permissionSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

export const assignRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().uuid(),
});

export const removeRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().uuid(),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.union([z.literal("security_company"), z.literal("police_department"), z.literal("community_group")]),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(20).optional(),
  address: z.record(z.string(), z.unknown()).optional(),
});

export const updateOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(200).optional(),
  type: z.union([z.literal("security_company"), z.literal("police_department"), z.literal("community_group")]).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(20).optional(),
  address: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Shared free-form location shape (used by sightings, alerts, and the case
// judicial lifecycle's arrest records).
export const sightingLocationSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().max(500).optional(),
});

// --- Cases (dockets) ---

export const caseStatusSchema = z.enum([
  "OPEN",
  "UNDER_INVESTIGATION",
  "AWAITING_REVIEW",
  "CLOSED",
  "ARCHIVED",
]);

export const casePrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const createCaseSchema = z.object({
  caseType: z.string().min(2).max(100),
  title: z.string().min(2).max(300),
  description: z.string().max(10000).optional(),
  priority: casePrioritySchema.default("MEDIUM"),
  assignedToUserId: z.string().min(1).optional(),
  isSensitive: z.boolean().default(false),
});

export const updateCaseSchema = z.object({
  id: z.string().uuid(),
  caseType: z.string().min(2).max(100).optional(),
  title: z.string().min(2).max(300).optional(),
  description: z.string().max(10000).optional(),
  priority: casePrioritySchema.optional(),
  assignedToUserId: z.string().min(1).nullable().optional(),
  isSensitive: z.boolean().optional(),
});

export const updateCaseStatusSchema = z.object({
  id: z.string().uuid(),
  status: caseStatusSchema,
  reason: z.string().max(2000).optional(),
});

export const caseListSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  status: caseStatusSchema.optional(),
  priority: casePrioritySchema.optional(),
  assignedToUserId: z.string().min(1).optional(),
});

export const createInvestigationNoteSchema = z.object({
  caseId: z.string().uuid(),
  noteType: z.string().min(2).max(50),
  content: z.string().min(1).max(10000),
});

export const linkIncidentSchema = z.object({
  caseId: z.string().uuid(),
  incidentId: z.string().uuid(),
});

export const linkEvidenceSchema = z.object({
  caseId: z.string().uuid(),
  evidenceEntityType: z.string().min(1).max(50).default("MEDIA_ASSET"),
  evidenceEntityId: z.string().min(1),
  relationshipDescription: z.string().max(1000).optional(),
});

export const caseIdSchema = z.object({
  caseId: z.string().uuid(),
});

export const assignCaseInvestigatorSchema = z.object({
  caseId: z.string().uuid(),
  // null unassigns the case (returns it to OPEN's "no investigator" state).
  userId: z.string().min(1).nullable(),
});

// --- Case judicial lifecycle: suspects, arrest, prosecution, court hearings ---

export const caseCriminalRoleSchema = z.enum([
  "SUSPECT",
  "PERSON_OF_INTEREST",
  "WITNESS",
  "VICTIM",
  "ARRESTED",
]);

export const linkCaseCriminalSchema = z.object({
  caseId: z.string().uuid(),
  entityProfileId: z.string().uuid(),
  role: caseCriminalRoleSchema,
  notes: z.string().max(2000).optional(),
});

export const caseCriminalIdSchema = z.object({
  id: z.string().uuid(),
});

export const custodyStatusSchema = z.enum([
  "IN_CUSTODY",
  "RELEASED_ON_BAIL",
  "RELEASED_NO_CHARGE",
  "ESCAPED",
]);

export const recordCaseArrestSchema = z.object({
  caseId: z.string().uuid(),
  entityProfileId: z.string().uuid(),
  arrestedAt: z.coerce.date(),
  arrestedByOfficerId: z.string().uuid().optional(),
  withWarrant: z.boolean().default(false),
  warrantNumber: z.string().max(100).optional(),
  location: sightingLocationSchema.optional(),
  rightsInformedAt: z.coerce.date().optional(),
  custodyStatus: custodyStatusSchema.default("IN_CUSTODY"),
  notes: z.string().max(2000).optional(),
});

export const prosecutionDecisionSchema = z.enum([
  "PROCEED_TO_TRIAL",
  "DECLINE_TO_PROSECUTE",
  "DIVERSION",
  "FURTHER_INVESTIGATION",
  "PLEA_BARGAIN",
]);

export const recordProsecutionDecisionSchema = z.object({
  caseId: z.string().uuid(),
  decision: prosecutionDecisionSchema,
  prosecutorName: z.string().max(200).optional(),
  decidedAt: z.coerce.date().optional(),
  reason: z.string().max(2000).optional(),
});

export const hearingTypeSchema = z.enum([
  "FIRST_APPEARANCE",
  "BAIL_HEARING",
  "PRE_TRIAL",
  "PLEA",
  "TRIAL",
  "SENTENCING",
  "APPEAL",
  "POSTPONEMENT",
]);

export const hearingOutcomeTypeSchema = z.enum([
  "PENDING",
  "POSTPONED",
  "PROCEEDED",
  "GUILTY",
  "NOT_GUILTY",
  "SENTENCED",
  "WITHDRAWN",
  "STRUCK_OFF_ROLL",
]);

export const bailScheduleClassificationSchema = z.enum([
  "SCHEDULE_1",
  "SCHEDULE_5",
  "SCHEDULE_6",
  "NONE",
]);

export const bailDecisionSchema = z.enum(["GRANTED", "DENIED"]);

export const scheduleCaseHearingSchema = z.object({
  caseId: z.string().uuid(),
  hearingType: hearingTypeSchema,
  scheduledAt: z.coerce.date(),
  courtName: z.string().max(300).optional(),
  caseRollNumber: z.string().max(100).optional(),
  presidingOfficer: z.string().max(200).optional(),
  bailScheduleClassification: bailScheduleClassificationSchema.optional(),
  bailAmount: z.number().nonnegative().optional(),
  bailConditions: z.string().max(2000).optional(),
});

export const recordCaseHearingOutcomeSchema = z.object({
  id: z.string().uuid(),
  outcomeType: hearingOutcomeTypeSchema,
  outcomeNotes: z.string().max(2000).optional(),
  nextHearingAt: z.coerce.date().optional(),
  bailDecision: bailDecisionSchema.optional(),
});

// --- Evidence ---

export const createEvidenceSchema = z.object({
  caseId: z.string().uuid().optional(),
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  source: z.string().min(1).max(100),
  sourceCameraId: z.string().max(100).optional(),
  originalFilename: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  fileSize: z.number().int().positive(),
  fileBase64: z.string().min(1),
  gpsLatitude: z.number().min(-90).max(90).optional(),
  gpsLongitude: z.number().min(-180).max(180).optional(),
  relationshipDescription: z.string().max(1000).optional(),
});

export const evidenceListSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  caseId: z.string().uuid().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
});

export const evidenceCustodyActionSchema = z.object({
  evidenceId: z.string().uuid(),
  action: z.enum(["ACCESSED", "TRANSFERRED", "VERIFIED", "EXPORTED", "ANALYZED"]),
  toUserId: z.string().min(1).optional(),
  reason: z.string().min(1).max(1000),
  location: z.string().max(300).optional(),
});

export const verifyEvidenceIntegritySchema = z.object({
  evidenceId: z.string().uuid(),
});

// --- Entity / suspect profiles ---

export const entityTypeSchema = z.enum(["PERSON", "VEHICLE", "OBJECT"]);

// A raw photo upload — mirrors createEvidenceSchema's fileBase64 shape.
// Unlike evidence, the resulting file lands in a public bucket since it's
// meant to be shown on the public wanted feed and community mobile app.
export const entityProfilePhotoSchema = z.object({
  fileBase64: z.string().min(1),
  originalFilename: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(100),
});

// physicalDescription/charges are stored inside the `attributes` jsonb
// column (there's no dedicated column for them) but are typed and exposed
// as first-class fields here so forms don't have to know that detail.
export const createEntityProfileSchema = z.object({
  entityType: entityTypeSchema,
  displayName: z.string().min(1).max(200).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  physicalDescription: z.string().max(2000).optional(),
  charges: z.array(z.string().min(1).max(200)).max(20).optional(),
  notes: z.string().max(5000).optional(),
  photo: entityProfilePhotoSchema.optional(),
});

export const updateEntityProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(200).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  physicalDescription: z.string().max(2000).optional(),
  charges: z.array(z.string().min(1).max(200)).max(20).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MERGED"]).optional(),
  notes: z.string().max(5000).optional(),
  photo: entityProfilePhotoSchema.optional(),
});

export const entityProfileListSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  entityType: entityTypeSchema.optional(),
  watchlistStatus: z.string().optional(),
});

export const addToWatchlistSchema = z.object({
  entityProfileId: z.string().uuid(),
  priorityLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  reason: z.string().min(1).max(2000),
  caseId: z.string().uuid().optional(),
  expiryDate: z.coerce.date().optional(),
});

// --- Sightings ---
// community_sighting.moderation_status is the review decision (matches
// this enum); community_sighting.status is a separate lifecycle field
// (SUBMITTED/RESOLVED) set automatically by the router, not exposed here.

export const sightingModerationStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "DUPLICATE",
]);

export const submitSightingSchema = z.object({
  sightingType: z.string().min(1).max(50).default("WANTED_PERSON_SIGHTING"),
  description: z.string().min(1).max(5000),
  location: sightingLocationSchema.optional(),
  observedAt: z.coerce.date().optional(),
  isAnonymous: z.boolean().default(false),
  // Photo is optional for this MVP pass (no camera/gallery picker wired on
  // native yet) — the documented "at least one media" rule is relaxed.
  photoBase64: z.string().min(1).optional(),
  mimeType: z.string().min(1).max(200).optional(),
  originalFilename: z.string().min(1).max(500).optional(),
  fileSize: z.number().int().positive().optional(),
});

export const sightingListSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  moderationStatus: sightingModerationStatusSchema.optional(),
});

export const verifySightingSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED", "DUPLICATE"]),
  notes: z.string().max(2000).optional(),
});

// --- Alerts ---

export const alertSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const alertTargetRoleSchema = z.enum([
  "COMMUNITY",
  "SECURITY_OPERATOR",
  "LAW_ENFORCEMENT",
  "ADMIN",
  "ALL",
]);

export const createAlertSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().max(5000).optional(),
  alertType: z.string().min(2).max(50),
  severity: alertSeveritySchema.default("MEDIUM"),
  targetRole: alertTargetRoleSchema.default("COMMUNITY"),
  expiresAt: z.coerce.date().optional(),
  location: sightingLocationSchema.optional(),
});

export const alertListSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  severity: alertSeveritySchema.optional(),
});

export const acknowledgeAlertSchema = z.object({
  alertId: z.string().uuid(),
});

// --- Settings ---

export const upsertSystemSettingSchema = z.object({
  settingKey: z.string().min(1).max(200),
  settingValue: z.unknown(),
  settingType: z.string().min(1).max(50).default("json"),
});

export const createFeatureFlagSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  isEnabled: z.boolean().default(false),
  rolloutPercentage: z.number().min(0).max(1).optional(),
});

export const toggleFeatureFlagSchema = z.object({
  id: z.string().uuid(),
  isEnabled: z.boolean(),
});

// --- Audit ---

export const auditListSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  domain: z.string().optional(),
  eventType: z.string().optional(),
});

// --- POPIA (subject access / deletion requests) ---

export const requestDataDeletionSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export const dataDeletionStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "COMPLETED"]);

export const reviewDataDeletionRequestSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(2000).optional(),
});

export const dataDeletionRequestListSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  status: dataDeletionStatusSchema.optional(),
});
