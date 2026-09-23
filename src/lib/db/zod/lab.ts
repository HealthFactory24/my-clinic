// db/validation/laboratory.ts

import { createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import { type LabStatus, type LabTest, labOrders } from "../schema";
import {
	dateStringSchema,
	dateTimeSchema,
	idSchema,
	labPrioritySchema,
	labStatusSchema,
	labTestFlagSchema,
	labTestStatusSchema,
	optionalString
} from "./common";

export const labTestSchema = z.object({
	id: idSchema,

	testName: z.string().trim().min(1).max(300),

	testCode: z.string().trim().min(1).max(100),

	category: z.string().trim().min(1).max(100),

	sampleType: optionalString(100),

	result: optionalString(1000),

	referenceRange: optionalString(200),

	flag: labTestFlagSchema.optional(),

	unit: optionalString(50),

	isAbnormal: z.boolean().optional(),

	status: labTestStatusSchema.optional(),

	completedAt: dateStringSchema.optional(),

	notes: optionalString(2000)
});

export const labOrderSchema = z.object({
	id: idSchema,

	orderNumber: z.string().trim().min(1).max(50),

	patientId: idSchema,

	encounterId: idSchema.nullable().optional(),

	orderDate: dateStringSchema,

	orderedBy: idSchema,

	clinicalIndication: z.string().trim().min(1).max(2000),

	testsJson: z.array(labTestSchema).min(1),

	status: labStatusSchema,

	priority: labPrioritySchema,

	completedDate: dateStringSchema.nullable().optional(),

	specimenCollectionNotes: optionalString(2000),

	specimenType: optionalString(100),

	specimenCollectedAt: dateTimeSchema.nullable().optional(),

	resultsReleasedAt: dateTimeSchema.nullable().optional(),

	notes: optionalString(5000),

	instructions: optionalString(5000),

	results: z.array(labTestSchema).nullable().optional(),

	createdAt: z.date(),
	updatedAt: z.date()
});

// export const createLabOrderSchema = labOrderSchema
//   .omit({
//     id: true,
//     createdAt: true,
//     updatedAt: true,
//   })
//   .transform(({ orderDate, completedDate, specimenCollectedAt, resultsReleasedAt, ...rest }) => ({
//     ...rest,
//     orderDate: new Date(orderDate),
//     ...(completedDate !== null &&
//       completedDate !== undefined && {
//         completedDate: new Date(completedDate),
//       }),
//     ...(specimenCollectedAt !== null &&
//       specimenCollectedAt !== undefined && {
//         specimenCollectedAt: new Date(specimenCollectedAt),
//       }),
//     ...(resultsReleasedAt !== null &&
//       resultsReleasedAt !== undefined && {
//         resultsReleasedAt: new Date(resultsReleasedAt),
//       }),
//   }));
export const updateLabOrderSchema = createUpdateSchema(labOrders, {
	id: z.uuid(),
	priority: labPrioritySchema.optional(),
	status: labStatusSchema.optional(),
	testsJson: z.custom<Array<LabTest>>().optional(),
	results: z.custom<Array<LabTest>>().optional()
});

export interface TestResult {
	category: string;
	completedAt?: string;
	flag?: "Normal" | "Abnormal" | "Critical";
	id: string;
	isAbnormal?: boolean;
	notes?: string;
	referenceRange?: string;
	result?: string | number;
	sampleType?: string;
	status?: "Pending" | "In Progress" | "Completed" | "Abnormal" | "Normal";
	testCode: string;
	testName: string;
	unit?: string;
}

export interface LabOrderUpdateData {
	completedDate?: string;
	instructions?: string;
	notes?: string;
	resultsReleasedAt?: Date;
	specimenCollectedAt?: Date;
	specimenCollectionNotes?: string;
	status?: LabStatus;
	testsJson?: Array<LabTest>;
	// Remove updatedAt from here if it's not in LabOrderCreateData
}
export const labFormSchema = labOrderSchema;
export type LabFormValues = z.infer<typeof labFormSchema>;
export type LabTestFormValues = z.infer<typeof labTestSchema>;
