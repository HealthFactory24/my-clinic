// db/validation/vitals.ts

import { createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import { vitals } from "../schema";
import { dateTimeSchema, idSchema, optionalString } from "./common";

export const vitalsSchema = z.object({
	id: idSchema,

	patientId: idSchema,

	encounterId: idSchema.nullable().optional(),

	recordedAt: dateTimeSchema,

	temperatureC: z.number().min(25).max(45),

	temperatureMethod: z.string().trim().max(50),

	heartRateBpm: z.number().int().min(20).max(300),

	respiratoryRateBpm: z.number().int().min(5).max(150),

	systolicBp: z.number().int().min(30).max(250).nullable().optional(),

	diastolicBp: z.number().int().min(20).max(200).nullable().optional(),

	meanArterialPressure: z.number().int().min(20).max(220).nullable().optional(),

	oxygenSaturationPercent: z.number().int().min(50).max(100),

	painScore: z.number().int().min(0).max(10),

	painScaleType: z.string().trim().max(50),

	weightKg: z.number().positive().max(300).nullable().optional(),

	heightCm: z.number().positive().max(250).nullable().optional(),

	headCircumferenceCm: z.number().positive().max(100).nullable().optional(),

	bmi: z.number().positive().max(100).nullable().optional(),

	notes: optionalString(2000),

	recordedBy: idSchema,

	createdAt: z.date().optional(),
	updatedAt: z.date().optional()
});

export const createVitalsSchema = vitalsSchema
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true
	})
	.transform(({ recordedAt, ...rest }) => ({
		...rest,
		recordedAt: new Date(recordedAt)
	}));

export const updateVitalsSchema = createUpdateSchema(vitals);
export const vitalsFormSchema = vitalsSchema;
export type VitalsFormValues = z.infer<typeof vitalsFormSchema>;
