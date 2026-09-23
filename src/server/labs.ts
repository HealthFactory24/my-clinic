// src/server/labs.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { ServerError } from "#/lib/error.ts";
// import { getClinicId } from "@/lib/auth/middleware";
import {
	adminMiddleware,
	doctorMiddleware,
	freshAdminMiddleware,
	staffMiddleware
} from "@/lib/auth/middleware";
import { labRepository } from "@/lib/db/repositories";
import { labOrderInsertSchema } from "@/lib/db/zod";
import { updateLabOrderSchema } from "@/lib/db/zod/lab";

const labStatusEnum = z.enum([
	"Ordered",
	"Sample Collected",
	"Processing",
	"Completed",
	"Cancelled"
]);

const labPriorityEnum = z.enum(["Routine", "Urgent", "Stat"]);

// ─── Queries ───

export const $getLabOrderById = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => {
		const lab = await labRepository.findById(id);
		if (!lab) throw new ServerError("NOT_FOUND", "Lab order not found");
		return lab;
	});

export const $getLabOrderByNumber = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: orderNumber }) => {
		const lab = await labRepository.findByOrderNumber(orderNumber);
		if (!lab) throw new ServerError("NOT_FOUND", "Lab order not found");
		return lab;
	});

export const $findLabOrders = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			status: labStatusEnum.optional(),
			priority: labPriorityEnum.optional(),
			patientId: z.string().optional(),
			orderedBy: z.string().optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional(),
			query: z.string().optional()
		})
	)
	.handler(async ({ data }) => labRepository.findOrders(data));

export const $findLabOrdersByPatient = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			status: labStatusEnum.optional(),
			priority: labPriorityEnum.optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional()
		})
	)
	.handler(async ({ data }) => {
		const { patientId, ...options } = data;
		return labRepository.findByPatientId(patientId, options);
	});

export const $getPendingLabOrders = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string().optional())
	.handler(async ({ data: patientId }) => labRepository.findPending(patientId));

export const $getLabStats = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => labRepository.getLabStats());

export const $getAbnormalLabResults = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: patientId }) =>
		labRepository.getAbnormalResults(patientId)
	);

// ─── Mutations ───

export const $createLabOrder = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(labOrderInsertSchema)
	.handler(async ({ data }) => labRepository.create(data));

export const $createLabOrdersBatch = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.array(labOrderInsertSchema))
	.handler(async ({ data }) => labRepository.createBatch(data));

export const $updateLabOrder = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(updateLabOrderSchema)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		const updated = await labRepository.update(id, rest);
		if (!updated) throw new ServerError("NOT_FOUND", "Lab order not found");
		return updated;
	});

export const $updateLabOrderStatus = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.object({ id: z.string(), status: labStatusEnum }))
	.handler(async ({ data }) => {
		const updated = await labRepository.updateStatus(data.id, data.status);
		if (!updated) throw new ServerError("NOT_FOUND", "Lab order not found");
		return updated;
	});

export const $addLabResults = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			id: z.string(),
			results: z.array(
				z.object({
					id: z.string(),
					testName: z.string(),
					testCode: z.string(),
					category: z.string(),
					result: z.string().optional(),
					referenceRange: z.string().optional(),
					flag: z.enum(["Normal", "Abnormal", "Critical"]).optional(),
					unit: z.string().optional(),
					isAbnormal: z.boolean().optional()
				})
			),
			status: labStatusEnum.default("Completed")
		})
	)
	.handler(async ({ data }) => {
		const updated = await labRepository.addResults(
			data.id,
			data.results,
			data.status
		);
		if (!updated) throw new ServerError("NOT_FOUND", "Lab order not found");
		return updated;
	});

export const $submitLabResults = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			id: z.string(),
			results: z.array(
				z.object({
					testName: z.string(),
					value: z.string(),
					unit: z.string(),
					referenceRange: z.string()
				})
			),
			notes: z.string().optional()
		})
	)
	.handler(async ({ data }) => {
		const updated = await labRepository.submitResults(
			data.id,
			data.results,
			data.notes
		);
		if (!updated) throw new ServerError("NOT_FOUND", "Lab order not found");
		return updated;
	});

export const $collectLabSample = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			id: z.string(),
			specimenCollectedAt: z.date(),
			specimenType: z.string(),
			collectionNotes: z.string().optional()
		})
	)
	.handler(async ({ data }) => {
		const updated = await labRepository.collectSample(
			data.id,
			data.specimenCollectedAt,
			data.specimenType,
			data.collectionNotes
		);
		if (!updated) throw new ServerError("NOT_FOUND", "Lab order not found");
		return updated;
	});

export const $cancelLabOrder = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.object({ id: z.string(), reason: z.string() }))
	.handler(async ({ data }) => {
		const updated = await labRepository.cancel(data.id, data.reason);
		if (!updated) throw new ServerError("NOT_FOUND", "Lab order not found");
		return updated;
	});

export const $deleteLabOrder = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => labRepository.delete(id));
