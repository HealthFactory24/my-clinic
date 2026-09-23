// db/validation/growth.ts

import { z } from "zod/v4";

import { idSchema } from "./common";

export const growthMeasurementSchema = z.object({
	id: z.string(),
	patientId: z.string().min(1, "Patient ID is required"),
	encounterId: z.string().nullable().optional(),
	recordedAt: z.date(),
	ageMonths: z.number().nonnegative(),
	ageDays: z.number().int().nonnegative().nullable().optional(),
	weightKg: z.number().positive("Weight must be greater than 0"),
	heightCm: z.number().positive("Height must be greater than 0"),
	headCircumferenceCm: z.number().positive().nullable().optional(),
	bmi: z.number().positive(),
	weightForAgeZScore: z.number().nullable().optional(),
	weightForAgePercentile: z.number().nullable().optional(),
	heightForAgeZScore: z.number().nullable().optional(),
	heightForAgePercentile: z.number().nullable().optional(),
	bmiForAgeZScore: z.number().nullable().optional(),
	bmiForAgePercentile: z.number().nullable().optional(),
	headCircumferenceZScore: z.number().nullable().optional(),
	headCircumferencePercentile: z.number().nullable().optional(),
	weightVelocity: z.number().nullable().optional(),
	heightVelocity: z.number().nullable().optional(),
	recordedBy: z.string().min(1, "Recorder name is required"),
	notes: z.string().nullable().optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional()
});

// Schema for API payloads / Insert mutations
export const createGrowthMeasurementSchema = growthMeasurementSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

// Exported Types inferred from Zod schemas
export type GrowthMeasurement = z.infer<typeof growthMeasurementSchema>;
export type CreateGrowthMeasurementInput = z.infer<
	typeof createGrowthMeasurementSchema
>;

export const updateGrowthMeasurementSchema = growthMeasurementSchema
	.partial()
	.extend({
		id: idSchema
	})
	.transform(({ recordedAt, ...rest }) => ({
		...rest,
		...(recordedAt !== undefined && { recordedAt: new Date(recordedAt) })
	}));

export const growthFormSchema = growthMeasurementSchema;
export type GrowthFormValues = z.infer<typeof growthFormSchema>;
