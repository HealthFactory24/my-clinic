// db/validation/prescription.ts

import { createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import { PRESCRIPTION_STATUSES, prescriptions } from "../schema";
import { idSchema, prescriptionStatusSchema } from "./common";

// ============================================================
// PRESCRIPTION ITEM SCHEMAS
// ============================================================

export const prescriptionItemSchema = z.object({
	id: z.string(),
	medicationName: z.string().min(1, "Medication name is required"),
	genericName: z.string().optional().or(z.literal("")),
	form: z.string().min(1, "Form is required"), // e.g., Liquid, Tablet, Syrup
	concentration: z.string().optional().or(z.literal("")), // e.g., 250mg/5ml
	route: z.string().min(1, "Route is required"), // e.g., Oral, Topical
	frequency: z.string().min(1, "Frequency is required"), // e.g., Every 8 hours
	durationDays: z.number().int().positive("Duration must be at least 1 day"),
	calculatedLiquidDoseMl: z
		.number()
		.nonnegative("Liquid dose must be non-negative"),
	calculatedDoseMg: z.number().positive().optional(),
	dose: z.string().optional().or(z.literal("")),
	dosePerKg: z.number().positive().optional(),
	patientWeightKg: z.number().positive().optional(),
	dispenseQuantity: z.string().optional().or(z.literal("")),
	refills: z.number().int().nonnegative().optional().default(0),
	substitutionAllowed: z.boolean().optional().default(true),
	instructions: z.string().optional().or(z.literal("")),
	warnings: z.string().optional().or(z.literal("")),
	notes: z.string().optional().or(z.literal(""))
});

// ============================================================
// BASE & DATABASE SCHEMAS
// ============================================================

export const prescriptionSchema = z.object({
	id: z.string(),
	rxNumber: z.string().min(1, "Rx Number is required"),
	patientId: z.string().min(1, "Patient ID is required"),
	encounterId: z.string().nullable().optional(),
	prescribedDate: z.string().min(1, "Prescribed date is required"),
	prescriberId: z.string().min(1, "Prescriber ID is required"),
	prescriberName: z.string().min(1, "Prescriber name is required"),
	prescriberLicense: z.string().min(1, "Prescriber license is required"),
	patientWeightKg: z.number().positive("Patient weight is required"),
	diagnosis: z.string().nullable().optional(),
	prescriptionItems: z
		.array(prescriptionItemSchema)
		.min(1, "At least one prescription item is required"),
	notes: z.string().nullable().optional(),
	// `refills` REMOVED — `prescriptions` has no such column, and the
	// per-item `refills` field on `prescriptionItemSchema` is the real home.
	status: z.enum(PRESCRIPTION_STATUSES).default("Active"),
	filledAt: z.coerce.date().nullable().optional(),
	filledBy: z.string().nullable().optional(),
	discontinuedAt: z.coerce.date().nullable().optional(),
	discontinuedReason: z.string().nullable().optional(),
	createdAt: z.coerce.date().optional(),
	updatedAt: z.coerce.date().optional()
});
// ============================================================
// UI FORM SCHEMA
// ============================================================

export const createPrescriptionSchema = prescriptionSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

// ============================================================
// INFERRED TYPES
// ============================================================

export type PrescriptionItemValidation = z.infer<typeof prescriptionItemSchema>;

export type PrescriptionValidation = z.infer<typeof prescriptionSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const updatePrescriptionSchema = createUpdateSchema(prescriptions)
	.omit({ prescriptionItems: true, status: true })
	.partial()
	.extend({
		id: idSchema,
		prescriptionItems: z.array(prescriptionItemSchema).min(1).optional(),
		status: prescriptionStatusSchema.optional()
	})
	.transform(({ prescribedDate, ...rest }) => ({
		...rest,
		...(prescribedDate !== undefined && {
			prescribedDate:
				typeof prescribedDate === "string" &&
				!Number.isNaN(Date.parse(prescribedDate))
					? new Date(prescribedDate).toISOString()
					: prescribedDate
		})
	}));
export const prescriptionFormSchema = createPrescriptionSchema;

export type PrescriptionFormValues = z.input<typeof createPrescriptionSchema>;
export type PrescriptionItemFormValues = z.input<
	typeof createPrescriptionSchema
>["prescriptionItems"][number];
