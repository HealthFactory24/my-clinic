// src/server/immunizations.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import {
	doctorMiddleware,
	freshAdminMiddleware,
	staffMiddleware
} from "@/lib/auth/middleware";
import { immunizationRepository } from "@/lib/db/repositories";
import {
	immunizationInsertSchema,
	immunizationStatusSchema,
	immunizationUpdateSchema
} from "@/lib/db/zod";
import { ServerError } from "@/lib/error";

// ─── Shared enums ───

const immunizationStatusFilterSchema = z.enum([
	"Administered",
	"Due",
	"Overdue",
	"Upcoming",
	"Deferred",
	"Refused"
]);

// ─── Queries ───

export const $getImmunizationById = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => {
		const immunization = await immunizationRepository.findById(id);
		if (!immunization)
			throw new ServerError("NOT_FOUND", "Immunization not found");
		return immunization;
	});

export const $getImmunizationsByPatientId = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			status: immunizationStatusFilterSchema.optional()
		})
	)
	.handler(async ({ data }) =>
		immunizationRepository.findByPatientId(data.patientId, {
			status: data.status
		})
	);

export const $getOverdueImmunizations = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: patientId }) =>
		immunizationRepository.getOverdueImmunizations(patientId)
	);

export const $getUpcomingImmunizations = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			daysAhead: z.number().min(1).max(365).default(30)
		})
	)
	.handler(async ({ data }) =>
		immunizationRepository.getUpcomingImmunizations(
			data.patientId,
			data.daysAhead
		)
	);

export const $getAllOverdueImmunizations = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.handler(async () => immunizationRepository.getAllOverdueImmunizations());

export const $getVaccineComplianceRate = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: patientId }) =>
		immunizationRepository.getVaccineComplianceRate(patientId)
	);

// src/server/immunizations.ts

export const $getImmunizations = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			query: z.string().optional(),
			status: immunizationStatusFilterSchema.optional(),
			dateRange: z.enum(["Due Soon", "Overdue", "Completed"]).optional(),
			patientId: z.string().optional(),
			limit: z.number().optional(),
			offset: z.number().optional()
		})
	)
	.handler(async ({ data }) => {
		const { patientId, status } = data;

		// Patient-scoped: use the dedicated method, which already filters by
		// patientId and optionally by status. No separate count query is needed
		// because the array length IS the total.
		if (patientId) {
			const items = await immunizationRepository.findByPatientId(patientId, {
				status
			});
			return { data: items, total: items.length };
		}

		// Unscoped list: delegate to whichever repository method backs the
		// global view. If your repository exposes a paginated search, wire it
		// here. If not, this branch needs a new repository method — see below.
		const items = await immunizationRepository.listAll({
			query: data.query,
			status,
			dateRange: data.dateRange,
			limit: data.limit ?? 50,
			offset: data.offset ?? 0
		});

		return items;
	});

// ─── Mutations ───

export const $createImmunization = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(immunizationInsertSchema)
	.handler(async ({ data }) => immunizationRepository.create(data));

export const $createImmunizationsBatch = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.array(immunizationInsertSchema))
	.handler(async ({ data }) => immunizationRepository.createBatch(data));

export const $updateImmunization = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(immunizationUpdateSchema)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		const updated = await immunizationRepository.update(id ?? "", {
			...rest,
			status: rest.status
		});
		if (!updated) throw new ServerError("NOT_FOUND", "Immunization not found");
		return updated;
	});

export const $administerImmunization = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			id: z.string(),
			administeredDate: z.iso.datetime(),
			administeredBy: z.string(),
			batchNumber: z.string().optional(),
			site: z.string().optional(),
			route: z.string().optional()
		})
	)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		const updated = await immunizationRepository.administer(
			id,
			rest.administeredDate,
			rest.administeredBy,
			rest.batchNumber,
			rest.site,
			rest.route
		);
		if (!updated) throw new ServerError("NOT_FOUND", "Immunization not found");
		return updated;
	});

export const $deleteImmunization = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => immunizationRepository.delete(id));

export const $deferImmunization = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			id: z.string(),
			reason: z.string(),
			deferredUntil: z.date(),
			deferredBy: z.string()
		})
	)
	.handler(async ({ data }) => {
		const updated = await immunizationRepository.defer(
			data.id,
			data.reason,
			data.deferredUntil,
			data.deferredBy
		);
		if (!updated) throw new ServerError("NOT_FOUND", "Immunization not found");
		return updated;
	});

export const $refuseImmunization = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			id: z.string(),
			reason: z.string(),
			refusedBy: z.string(),
			parentConsent: z.boolean().optional()
		})
	)
	.handler(async ({ data }) => {
		const updated = await immunizationRepository.refuse(
			data.id,
			data.reason,
			data.refusedBy,
			data.parentConsent
		);
		if (!updated) throw new ServerError("NOT_FOUND", "Immunization not found");
		return updated;
	});

export const $recordAdverseReaction = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			id: z.string(),
			reaction: z.string(),
			severity: z.string(),
			reportedBy: z.string()
		})
	)
	.handler(async ({ data }) => {
		const updated = await immunizationRepository.recordAdverseReaction(
			data.id,
			data.reaction,
			data.severity,
			data.reportedBy
		);
		if (!updated) throw new ServerError("NOT_FOUND", "Immunization not found");
		return updated;
	});
export const $getImmunizationCount = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			patientId: z.string().optional(),
			status: immunizationStatusSchema.optional()
		})
	)
	.handler(async ({ data }) => {
		const count = await immunizationRepository.countBy({
			patientId: data.patientId,
			status: data.status
		});
		return { count };
	});
