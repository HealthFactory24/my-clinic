// src/server/prescriptions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { ServerError } from "#/lib/error.ts";
import {
	adminMiddleware,
	doctorMiddleware,
	freshAdminMiddleware,
	getClinicId,
	staffMiddleware
} from "@/lib/auth/middleware";
import { prescriptionRepository } from "@/lib/db/repositories";
import {
	createPrescriptionSchema,
	updatePrescriptionSchema
} from "@/lib/db/zod";

const prescriptionStatusEnum = z.enum([
	"Active",
	"Completed",
	"Discontinued",
	"Cancelled"
]);

// ─── Queries ───

export const $getPrescriptionById = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const rx = await prescriptionRepository.findById(id, {
			clinicId: getClinicId(context.user)
		});
		if (!rx) throw new ServerError("NOT_FOUND", "Prescription not found");
		return rx;
	});

export const $getPrescriptionByNumber = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: prescriptionNumber }) => {
		const rx = await prescriptionRepository.findByRxNumber(prescriptionNumber);
		if (!rx) throw new ServerError("NOT_FOUND", "Prescription not found");
		return rx;
	});

export const $findPrescriptions = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			status: prescriptionStatusEnum.optional(),
			patientId: z.string().optional(),
			prescribedBy: z.string().optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional(),
			query: z.string().optional()
		})
	)
	.handler(async ({ data, context }) =>
		prescriptionRepository.findAll(data, {
			clinicId: getClinicId(context.user)
		})
	);
export const $findPrescriptionsByPatient = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			status: prescriptionStatusEnum.optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional()
		})
	)
	.handler(async ({ data }) => {
		const { patientId, ...options } = data;
		return prescriptionRepository.findByPatientId(patientId, options);
	});

export const $getActivePrescriptions = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: patientId }) =>
		prescriptionRepository.findActiveByPatientId(patientId)
	);

export const $getPrescriptionStats = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => prescriptionRepository.getPrescriptionStats());

// ─── Mutations ───

export const $createPrescription = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(createPrescriptionSchema)
	.handler(async ({ data }) => prescriptionRepository.create(data));

export const $createPrescriptionsBatch = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.array(createPrescriptionSchema))
	.handler(async ({ data }) => prescriptionRepository.createBatch(data));

export const $updatePrescription = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(updatePrescriptionSchema)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		const updated = await prescriptionRepository.update(id, rest);
		if (!updated) throw new ServerError("NOT_FOUND", "Prescription not found");
		return updated;
	});

export const $updatePrescriptionStatus = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			id: z.string(),
			status: prescriptionStatusEnum
		})
	)
	.handler(async ({ data }) => {
		const updated = await prescriptionRepository.updateStatus(
			data.id,
			data.status
		);
		if (!updated) throw new ServerError("NOT_FOUND", "Prescription not found");
		return updated;
	});

export const $addPrescriptionItems = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			id: z.string(),
			items: z.array(
				z.object({
					medicationName: z.string(),
					dosage: z.string(),
					frequency: z.string(),
					duration: z.string(),
					quantity: z.number(),
					instructions: z.string().optional()
				})
			)
		})
	)
	.handler(async ({ data }) => {
		const updated = await prescriptionRepository.addItems(data.id, data.items);
		if (!updated) throw new ServerError("NOT_FOUND", "Prescription not found");
		return updated;
	});

export const $refillPrescription = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			id: z.string(),
			filledAt: z.iso.date(),
			filledBy: z.uuid()
		})
	)
	.handler(async ({ data, context }) => {
		const userId = context.user.id;
		const updated = await prescriptionRepository.fill(
			data.id,
			userId,
			new Date(data.filledAt)
		);
		if (!updated) throw new ServerError("NOT_FOUND", "Prescription not found");
		return updated;
	});

export const $discontinuePrescription = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			id: z.string(),
			reason: z.string()
		})
	)
	.handler(async ({ data }) => {
		const updated = await prescriptionRepository.discontinue(
			data.id,
			data.reason
		);
		if (!updated) throw new ServerError("NOT_FOUND", "Prescription not found");
		return updated;
	});

export const $deletePrescription = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => prescriptionRepository.delete(id));
