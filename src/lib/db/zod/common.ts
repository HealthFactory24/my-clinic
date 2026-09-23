// db/validation/common.ts

import { z } from "zod/v4";

import { MEDICAL_RECORD_STATUSES, MEDICAL_RECORD_TYPES } from "../schema";
import {
	ACTIVE_STATUSES,
	ALLERGY_CATEGORIES,
	ALLERGY_SEVERITIES,
	ALLERGY_STATUSES,
	APPOINTMENT_STATUSES,
	AUDIT_ACTIONS,
	AUDIT_ENTITIES,
	BLOOD_GROUPS,
	CONDITION_SEVERITIES,
	CONDITION_STATUSES,
	DELIVERY_METHODS,
	ENCOUNTER_STATUSES,
	GENDERS,
	GUARDIAN_RELATIONSHIPS,
	IMMUNIZATION_STATUSES,
	LAB_PRIORITIES,
	LAB_STATUSES,
	LAB_TEST_FLAGS,
	LAB_TEST_STATUSES,
	METRIC_TYPES,
	PRESCRIPTION_STATUSES,
	ROLES,
	VISIT_TYPES
} from "../schema/enums";

// ============================================================================
// Primitive/domain schemas
// ============================================================================

export const idSchema = z.string().trim().min(1);

export const optionalIdSchema = idSchema.optional();

export const nonEmptyString = (max = 255) => z.string().trim().min(1).max(max);

export const optionalString = (max = 255) =>
	z.string().trim().max(max).optional();

export const dateStringSchema = z.iso.date();

export const dateTimeSchema = z.date();

// ============================================================================
// Enums
// ============================================================================

export const roleSchema = z.enum(ROLES);

export const genderSchema = z.enum(GENDERS);

export const bloodGroupSchema = z.enum(BLOOD_GROUPS);

export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);

export const activeStatusSchema = z.enum(ACTIVE_STATUSES);

export const visitTypeSchema = z.enum(VISIT_TYPES);
export const encounterStatusSchema = z.enum(ENCOUNTER_STATUSES);

export const immunizationStatusSchema = z.enum(IMMUNIZATION_STATUSES);

export const metricTypeSchema = z.enum(METRIC_TYPES);

export const prescriptionStatusSchema = z.enum(PRESCRIPTION_STATUSES);

export const labStatusSchema = z.enum(LAB_STATUSES);

export const labPrioritySchema = z.enum(LAB_PRIORITIES);

export const auditActionSchema = z.enum(AUDIT_ACTIONS);

export const auditEntitySchema = z.enum(AUDIT_ENTITIES);

export const deliveryMethodSchema = z.enum(DELIVERY_METHODS);

export const guardianRelationshipSchema = z.enum(GUARDIAN_RELATIONSHIPS);

export const allergyCategorySchema = z.enum(ALLERGY_CATEGORIES);

export const allergySeveritySchema = z.enum(ALLERGY_SEVERITIES);

export const allergyStatusSchema = z.enum(ALLERGY_STATUSES);

export const conditionStatusSchema = z.enum(CONDITION_STATUSES);

export const conditionSeveritySchema = z.enum(CONDITION_SEVERITIES);

export const labTestFlagSchema = z.enum(LAB_TEST_FLAGS);

export const labTestStatusSchema = z.enum(LAB_TEST_STATUSES);
export const medicalRecordTypeSchema = z.enum(MEDICAL_RECORD_TYPES);
export const medicalRecordStatusSchema = z.enum(MEDICAL_RECORD_STATUSES);
// ============================================================================
// Common pagination
// ============================================================================

export const paginationSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50),

	offset: z.coerce.number().int().min(0).default(0)
});

export const guardianDraftSchema = z.object({
	name: z.string().min(1, "Name is required"),
	relationship: guardianRelationshipSchema,
	phone: z.string().min(1, "Phone number is required"),
	email: z
		.email("Invalid email address")
		.nullable()
		.optional()
		.or(z.literal("")),
	address: z.string().nullable().optional(),
	isPrimary: z.boolean(),
	emergencyContact: z.boolean(),
	contactOrder: z
		.number()
		.int()
		.min(1, "Contact order must be a positive integer"),
	notes: z.string().nullable().optional()
});

export const allergyDraftSchema = z.object({
	id: z.uuid(),
	allergen: z.string().min(1, "Allergen name is required"),
	category: allergyCategorySchema,
	severity: allergySeveritySchema,
	reaction: z.string().min(1, "Reaction is required"),
	identifiedDate: z.string().nullable().optional()
});

export const conditionDraftSchema = z.object({
	id: z.string().optional(),
	condition: z.string().min(1, "Condition name is required"),
	icdCode: z.string().optional(),
	diagnosedDate: z.string().min(1, "Diagnosis date is required"),
	status: conditionStatusSchema,
	notes: z.string().optional()
});

// Inferred TypeScript Types directly from Zod
export type GuardianDraft = z.infer<typeof guardianDraftSchema>;
export type AllergyDraft = z.infer<typeof allergyDraftSchema>;
export type ConditionDraft = z.infer<typeof conditionDraftSchema>;
