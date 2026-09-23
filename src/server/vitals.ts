// src/server/vitals.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { ServerError } from "#/lib/error.ts";
import {
	doctorMiddleware,
	freshAdminMiddleware,
	staffMiddleware
} from "@/lib/auth/middleware";
import { vitalRepository } from "@/lib/db/repositories";
import { createVitalsSchema, updateVitalsSchema } from "@/lib/db/zod/vitals";

// ─── Queries ───

export const $getVitalsByDateRange = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			startDate: z.date(),
			endDate: z.date(),
			patientId: z.string().optional()
		})
	)
	.handler(async ({ data }) => {
		const { startDate, endDate, patientId } = data;
		return vitalRepository.findByDateRange(startDate, endDate, patientId);
	});

export const $getVitalsCount = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			patientId: z.string().optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional()
		})
	)
	.handler(async ({ data }) => {
		const { patientId, startDate, endDate } = data;
		// `countBy` accepts the options bag; `count` expects a raw SQL condition.
		return vitalRepository.countBy({ patientId, startDate, endDate });
	});
export const $findVitals = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			startDate: z.date().optional(),
			endDate: z.date().optional(),
			patientId: z.string().optional(),
			encounterId: z.string().optional()
		})
	)
	.handler(async ({ data }) =>
		vitalRepository.findAll(data.patientId ?? "", data)
	);

export const $getVitalById = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => {
		const vital = await vitalRepository.findById(id);
		if (!vital) throw new ServerError("NOT_FOUND", "Vital signs not found");
		return vital;
	});

export const $findVitalsByPatient = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			startDate: z.date().optional(),
			endDate: z.date().optional()
		})
	)
	.handler(async ({ data }) => {
		const { patientId, ...options } = data;
		return vitalRepository.findByPatientId(patientId, options);
	});

export const $getVitalsByEncounter = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: encounterId }) =>
		vitalRepository.findByEncounterId(encounterId)
	);

export const $getLatestVital = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: patientId }) =>
		vitalRepository.getLatestVital(patientId)
	);

export const $getAbnormalVitals = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			limit: z.number().min(1).max(100).default(20)
		})
	)
	.handler(async ({ data }) =>
		vitalRepository.getAbnormalVitals(data.patientId, { limit: data.limit })
	);

// ─── Mutations ───

export const $createVitals = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(createVitalsSchema)
	.handler(async ({ data }) => vitalRepository.create(data));

export const $updateVitals = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(updateVitalsSchema)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		const updated = await vitalRepository.update(id ?? "", rest);
		if (!updated) throw new ServerError("NOT_FOUND", "Vital signs not found");
		return updated;
	});

export const $deleteVitals = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => vitalRepository.delete(id));
