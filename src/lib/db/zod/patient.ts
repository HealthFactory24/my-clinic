// db/validation/patient.ts

import { createInsertSchema, createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import { patients } from "../schema";
import {
	activeStatusSchema,
	allergyCategorySchema,
	allergySeveritySchema,
	allergyStatusSchema,
	bloodGroupSchema,
	conditionDraftSchema,
	dateStringSchema,
	deliveryMethodSchema,
	genderSchema,
	guardianDraftSchema,
	guardianRelationshipSchema,
	idSchema,
	nonEmptyString,
	optionalString
} from "./common";

// ============================================================================
// Patient allergy JSON
// ============================================================================

export const patientAllergyJsonSchema = z.object({
	allergen: nonEmptyString(200),
	severity: nonEmptyString(50),
	reaction: nonEmptyString(500)
});

export const patientAllergiesJsonSchema = z.array(patientAllergyJsonSchema);

// ============================================================================
// Patient
// ============================================================================

export const patientSchema = z.object({
	id: idSchema,
	mrn: nonEmptyString(50),
	email: z.email(),
	firstName: nonEmptyString(100),
	lastName: nonEmptyString(100),

	dateOfBirth: dateStringSchema,

	gender: genderSchema,

	bloodGroup: bloodGroupSchema.default("Unknown"),

	gestationWeeksAtBirth: z.number().min(20).max(45).nullable().optional(),

	birthWeightKg: z.number().positive().max(10).nullable().optional(),

	birthLengthCm: z.number().positive().max(100).nullable().optional(),

	birthHeadCircumferenceCm: z.number().positive().max(70).nullable().optional(),

	deliveryMethod: deliveryMethodSchema.nullable().optional(),

	preferredLanguage: optionalString(50),

	contactNumber: optionalString(50),

	activeStatus: activeStatusSchema.default("Active"),

	notes: optionalString(5000),

	userId: idSchema,

	allergies: patientAllergiesJsonSchema.default([]),

	pediatricianId: idSchema.nullable().optional(),

	clinicId: idSchema.nullable().optional(),

	createdAt: z.date(),
	updatedAt: z.date()
});

// ============================================================================
// Patient commands
// ============================================================================
export const createPatientSchema = createInsertSchema(patients, {
	gender: genderSchema,
	bloodGroup: bloodGroupSchema,
	deliveryMethod: deliveryMethodSchema.optional(),
	activeStatus: activeStatusSchema,
	allergies: patientAllergiesJsonSchema.optional()
});

export const updatePatientSchema = createUpdateSchema(patients, {
	dateOfBirth: dateStringSchema.optional(),
	gender: genderSchema.optional(),
	bloodGroup: bloodGroupSchema.optional(),
	deliveryMethod: deliveryMethodSchema.optional(),
	activeStatus: activeStatusSchema.optional(),
	allergies: patientAllergiesJsonSchema.optional()
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
// ============================================================================
// Guardian
// ============================================================================

export const guardianSchema = z.object({
	id: idSchema,
	patientId: idSchema,

	name: nonEmptyString(200),

	userId: idSchema.nullable().optional(),

	relationship: guardianRelationshipSchema,

	phone: nonEmptyString(50),

	email: z.email().nullable().optional(),

	address: optionalString(500),

	isPrimary: z.boolean().default(true),

	emergencyContact: z.boolean().default(true),

	contactOrder: z.number().int().min(1).nullable().optional(),

	notes: optionalString(2000),

	createdAt: z.date().optional(),
	updatedAt: z.date().optional()
});

export const createGuardianSchema = guardianSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const updateGuardianSchema = createGuardianSchema.partial().extend({
	id: idSchema
});

// ============================================================================
// Patient allergy
// ============================================================================

export const patientAllergySchema = z.object({
	id: idSchema,
	patientId: idSchema,

	allergen: nonEmptyString(200),

	category: allergyCategorySchema,

	severity: allergySeveritySchema,

	reaction: nonEmptyString(500),

	identifiedDate: dateStringSchema.nullable().optional(),

	onsetDate: dateStringSchema.nullable().optional(),

	resolutionDate: dateStringSchema.nullable().optional(),

	status: allergyStatusSchema.default("Active"),

	notes: optionalString(2000),

	createdAt: z.date().optional(),
	updatedAt: z.date().optional()
});
export const createPatientAllergySchema = patientAllergySchema
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true
	})
	.extend({
		identifiedDate: z
			.union([z.string(), z.date()])
			.optional()
			.nullable()
			.transform(val => (val instanceof Date ? val.toISOString() : val)),
		onsetDate: z
			.union([z.string(), z.date()])
			.optional()
			.nullable()
			.transform(val => (val instanceof Date ? val.toISOString() : val)),
		resolutionDate: z
			.union([z.string(), z.date()])
			.optional()
			.nullable()
			.transform(val => (val instanceof Date ? val.toISOString() : val))
	});
export const updatePatientAllergySchema = patientAllergySchema.partial();
// ============================================================================
// Chronic condition
// ============================================================================

export const chronicConditionSchema = z.object({
	id: idSchema,
	patientId: idSchema,

	condition: nonEmptyString(300),

	icdCode: optionalString(20),

	diagnosedDate: dateStringSchema,

	status: z.enum(["Active", "Resolved", "In Remission"]),

	severity: z.enum(["Mild", "Moderate", "Severe"]).nullable().optional(),

	notes: optionalString(2000),

	createdAt: z.date().optional(),
	updatedAt: z.date().optional()
});

export const createChronicConditionSchema = chronicConditionSchema
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true
	})
	.transform(({ diagnosedDate, ...rest }) => ({
		...rest,
		diagnosedDate
	}));

export const updateChronicConditionSchema = chronicConditionSchema
	.partial()
	.extend({
		id: idSchema
	})
	.transform(({ diagnosedDate, ...rest }) => ({
		...rest,
		...(diagnosedDate !== undefined && {
			diagnosedDate: new Date(diagnosedDate)
		})
	}));

export type PatientInput = z.infer<typeof createPatientSchema>;

export type PatientUpdateInput = z.infer<typeof updatePatientSchema>;
export const allergySchema = z.object({
	allergen: z.string(),
	severity: z.string(),
	reaction: z.string()
});

export const patientFormSchema = z.object({
	id: z.string().optional(),
	userId: z.uuid(),
	firstName: z.string().min(2, "First name must be at least 2 characters"),
	lastName: z.string().min(2, "Last name must be at least 2 characters"),
	dateOfBirth: z.string().min(1, "Date of birth is required"),
	gender: genderSchema,
	bloodGroup: bloodGroupSchema,
	mrn: z.string().min(1, "MRN is required"),
	gestationWeeksAtBirth: z.number().min(20).max(45).nullable(),
	birthWeightKg: z.number().nullable().optional(),
	birthLengthCm: z.number().nullable().optional(),
	contactNumber: z.string().nullable().optional(),
	birthHeadCircumferenceCm: z.number().nullable().optional(),
	deliveryMethod: z.enum(["Vaginal", "Cesarean", "Assisted"]).nullish(),
	email: z.email("Invalid email").nullish().or(z.literal("")),
	preferredLanguage: z.string().nullish(),
	activeStatus: activeStatusSchema,
	notes: z.string().nullish(),
	guardians: z.array(guardianDraftSchema).nullish(),
	allergies: z.array(allergySchema).nullish(),
	chronicConditions: z.array(conditionDraftSchema).nullish()
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;
