import { z } from "zod/v4";

import {
	dateStringSchema,
	dateTimeSchema,
	encounterStatusSchema,
	idSchema,
	nonEmptyString,
	optionalString,
	visitTypeSchema
} from "./common";

const subjectiveSchema = z.object({
	historyOfPresentIllness: optionalString(10_000),

	pastMedicalHistory: z.array(nonEmptyString(500)).default([]),

	medications: z.array(nonEmptyString(500)).default([]),

	allergies: z.array(nonEmptyString(500)).default([]),

	familyHistory: optionalString(5000),

	socialHistory: optionalString(5000),

	reviewOfSystems: z.record(z.string(), z.string()).default({})
});

const objectiveSchema = z.object({
	physicalExamination: z.record(z.string(), z.string()).default({}),

	generalAppearance: optionalString(1000),

	notes: optionalString(5000)
});

const assessmentSchema = z.object({
	diagnoses: z
		.array(
			z.object({
				name: nonEmptyString(300),
				icdCode: optionalString(20),
				primary: z.boolean().default(false)
			})
		)
		.default([]),

	summary: optionalString(5000)
});

const planSchema = z.object({
	treatments: z.array(nonEmptyString(1000)).default([]),

	medications: z.array(nonEmptyString(1000)).default([]),

	investigations: z.array(nonEmptyString(1000)).default([]),

	patientEducation: z.array(nonEmptyString(1000)).default([]),

	followUpDate: dateStringSchema.nullable().optional(),

	notes: optionalString(5000)
});

export const encounterSchema = z.object({
	id: idSchema,

	patientId: idSchema,
	providerId: idSchema,

	providerName: nonEmptyString(200),

	encounterDate: dateTimeSchema,

	visitType: visitTypeSchema,

	chiefComplaint: nonEmptyString(2000),

	subjectiveJson: subjectiveSchema,
	objectiveJson: objectiveSchema,
	assessmentJson: assessmentSchema,
	planJson: planSchema,

	status: encounterStatusSchema.default("Completed"),

	signedAt: dateTimeSchema.nullable().optional(),

	signedBy: idSchema.nullable().optional(),

	durationMinutes: z
		.number()
		.int()
		.min(0)
		.max(24 * 60)
		.nullable()
		.optional(),

	followUpDate: dateStringSchema.nullable().optional(),

	createdAt: z.date(),
	updatedAt: z.date()
});

export const createEncounterSchema = encounterSchema
	.omit({ id: true, createdAt: true, updatedAt: true })
	.transform(({ encounterDate, signedAt, ...rest }) => ({
		...rest,
		encounterDate: new Date(encounterDate),
		...(signedAt !== undefined && {
			signedAt: signedAt === null ? null : new Date(signedAt)
		})
	}));

export const updateEncounterSchema = encounterSchema
	.partial()
	.extend({
		id: idSchema
	})
	.transform(({ encounterDate, signedAt, ...rest }) => ({
		...rest,
		...(encounterDate !== undefined && {
			encounterDate: new Date(encounterDate)
		}),
		...(signedAt !== undefined && {
			signedAt: signedAt === null ? null : new Date(signedAt)
		})
	}));

export const encounterFormSchema = createEncounterSchema;

// Edit mode reuses the same shape but with every field optional, plus a
// required `id` — this is exactly `updateEncounterSchema`.
export const encounterEditFormSchema = updateEncounterSchema;

export type EncounterFormValues = z.input<typeof createEncounterSchema>;
export type EncounterEditFormValues = z.input<typeof updateEncounterSchema>;
