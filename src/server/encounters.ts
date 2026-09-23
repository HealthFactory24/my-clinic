// src/server/encounters.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import {
	adminMiddleware,
	doctorMiddleware,
	freshAdminMiddleware,
	getClinicId
} from "@/lib/auth/middleware";
import { encounterRepository } from "@/lib/db/repositories";
import { encounterStatusSchema, visitTypeSchema } from "@/lib/db/zod";
import {
	createEncounterSchema,
	updateEncounterSchema
} from "@/lib/db/zod/encounter";
import { ServerError } from "@/lib/error";

// ─── Queries ───

export const $getEncounterById = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const encounter = await encounterRepository.findById(id, {
			clinicId: getClinicId(context.user)
		});
		if (!encounter) throw new ServerError("NOT_FOUND", "Encounter not found");
		return encounter;
	});

export const $getEncountersByPatientId = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			visitType: visitTypeSchema.optional(),
			status: encounterStatusSchema.optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional()
		})
	)
	.handler(async ({ data }) => {
		const { patientId, ...options } = data;
		return encounterRepository.findByPatientId(patientId, options);
	});

// ✅ FIXED: visitType optional, page/pageSize accepted, search normalized
export const $searchEncounters = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			query: z.string().optional(),
			// Accept both page/pageSize (preferred) and limit/offset (legacy)
			page: z.number().min(0).default(0),
			pageSize: z.number().min(1).max(100).default(20),
			limit: z.number().min(1).max(100).optional(),
			offset: z.number().min(0).optional(),
			patientId: z.string().optional(),
			providerId: z.string().optional(),
			visitType: visitTypeSchema.optional(), // ✅ was required — now optional
			status: encounterStatusSchema.optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional()
		})
	)
	.handler(async ({ data }) => {
		// Normalize to limit/offset for the repository
		const limit = data.limit ?? data.pageSize;
		const offset = data.offset ?? data.page * data.pageSize;

		return encounterRepository.search({
			query: data.query,
			limit,
			offset,
			patientId: data.patientId,
			providerId: data.providerId,
			visitType: data.visitType,
			status: data.status,
			startDate: data.startDate,
			endDate: data.endDate
		});
	});

export const $getRecentEncounters = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(z.number().min(1).max(50).default(10))
	.handler(async ({ data: limit }) =>
		encounterRepository.getRecentEncounters(limit)
	);

export const $getEncounterStats = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => encounterRepository.getStats());

// ─── Mutations ───

export const $createEncounter = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(createEncounterSchema)
	.handler(async ({ data }) => encounterRepository.create(data));

export const $createEncountersBatch = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.array(createEncounterSchema))
	.handler(async ({ data }) => encounterRepository.createBatch(data));

export const $updateEncounter = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(updateEncounterSchema)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		const updated = await encounterRepository.update(id, rest);
		if (!updated) throw new ServerError("NOT_FOUND", "Encounter not found");
		return updated;
	});

export const $addEncounterVitals = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			encounterId: z.string(),
			temperatureC: z.number().min(25).max(45),
			heartRateBpm: z.number().int().min(20).max(300),
			respiratoryRateBpm: z.number().int().min(5).max(150),
			systolicBp: z.number().int().min(30).max(250).optional(),
			diastolicBp: z.number().int().min(20).max(200).optional(),
			oxygenSaturationPercent: z.number().int().min(50).max(100),
			painScore: z.number().int().min(0).max(10).default(0),
			weightKg: z.number().positive().max(300).optional(),
			heightCm: z.number().positive().max(250).optional(),
			notes: z.string().optional()
		})
	)
	.handler(async ({ data }) => {
		const updated = await encounterRepository.addVitals(data.encounterId, {
			temperatureC: data.temperatureC,
			heartRateBpm: data.heartRateBpm,
			respiratoryRateBpm: data.respiratoryRateBpm,
			systolicBp: data.systolicBp,
			diastolicBp: data.diastolicBp,
			oxygenSaturationPercent: data.oxygenSaturationPercent,
			painScore: data.painScore,
			weightKg: data.weightKg,
			heightCm: data.heightCm,
			notes: data.notes,
			recordedAt: new Date()
		});
		if (!updated) throw new ServerError("NOT_FOUND", "Encounter not found");
		return updated;
	});

export const $addEncounterDiagnosis = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			encounterId: z.string(),
			name: z.string().min(1).max(300),
			icdCode: z.string().optional(),
			primary: z.boolean().default(false)
		})
	)
	.handler(async ({ data }) => {
		const updated = await encounterRepository.addDiagnosis(data.encounterId, {
			name: data.name,
			icdCode: data.icdCode,
			primary: data.primary
		});
		if (!updated) throw new ServerError("NOT_FOUND", "Encounter not found");
		return updated;
	});

export const $addEncounterTreatmentPlan = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			encounterId: z.string(),
			treatments: z.array(z.string()).default([]),
			medications: z.array(z.string()).default([]),
			investigations: z.array(z.string()).default([]),
			patientEducation: z.array(z.string()).default([]),
			followUpDate: z.string().optional(),
			notes: z.string().optional()
		})
	)
	.handler(async ({ data }) => {
		const updated = await encounterRepository.addTreatmentPlan(
			data.encounterId,
			{
				treatments: data.treatments,
				medications: data.medications,
				investigations: data.investigations,
				patientEducation: data.patientEducation,
				followUpDate: data.followUpDate,
				notes: data.notes
			}
		);
		if (!updated) throw new ServerError("NOT_FOUND", "Encounter not found");
		return updated;
	});

export const $signEncounter = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.object({ id: z.string(), signedBy: z.string() }))
	.handler(async ({ data }) => {
		const updated = await encounterRepository.sign(data.id, data.signedBy);
		if (!updated) throw new ServerError("NOT_FOUND", "Encounter not found");
		return updated;
	});

export const $deleteEncounter = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => encounterRepository.delete(id));
