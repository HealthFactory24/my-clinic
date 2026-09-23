import { createInsertSchema, createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod";

import { immunizations } from "../schema"; // adjust path as needed
import {
	dateTimeSchema,
	idSchema,
	immunizationStatusSchema,
	optionalString
} from "./common";

export const immunizationSchema = z.object({
	id: idSchema,

	patientId: idSchema,

	vaccineCode: z.string().min(1).max(50),

	vaccineName: z.string().min(1).max(255),

	targetDisease: z.string().min(1).max(255),

	doseNumber: z.number().int().positive(),

	totalDoses: z.number().int().positive().nullable().optional(),

	recommendedAgeLabel: z.string().min(1).max(100),

	recommendedAgeMonths: z.number().min(0).max(240),

	dueDate: dateTimeSchema,

	administeredDate: dateTimeSchema.nullable().optional(),

	status: immunizationStatusSchema,

	manufacturer: optionalString(100),

	brandName: optionalString(100),

	batchNumber: optionalString(100),

	expiryDate: dateTimeSchema.nullable().optional(),

	administrationSite: optionalString(100),

	administrationRoute: optionalString(100),

	administeredBy: optionalString(100),

	adverseReactions: optionalString(2000),

	parentConsent: z.boolean(),

	consentFormId: idSchema.nullable().optional(),

	notes: optionalString(2000),

	createdAt: z.date().optional(),

	updatedAt: z.date().optional()
});

export const createImmunizationSchema = createInsertSchema(immunizations, {
	status: immunizationStatusSchema.optional()
});

export const updateImmunizationSchema = createUpdateSchema(immunizations, {
	id: z.string(),
	status: immunizationStatusSchema.optional()
});

export const immunizationFormSchema = immunizationSchema;

export type ImmunizationFormValues = z.infer<typeof immunizationFormSchema>;
