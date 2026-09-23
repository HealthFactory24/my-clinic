// src/server/patients.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { ServerError } from "#/lib/error.ts";
import {
	adminMiddleware,
	doctorMiddleware,
	freshAdminMiddleware,
	freshRequireRoleMiddleware,
	getClinicId,
	staffMiddleware
} from "@/lib/auth/middleware";
import { patientRepository } from "@/lib/db/repositories";
import { conditionDraftSchema, guardianDraftSchema } from "@/lib/db/zod";
import {
	createPatientAllergySchema,
	createPatientSchema,
	updatePatientSchema
} from "@/lib/db/zod/patient";

const activeStatusSchema = z.enum(["Active", "Inactive", "Archived"]);
const genderSchema = z.enum(["male", "female"]);

// ─── Queries ───

export const $listPatients = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			query: z.string().optional(),
			limit: z.number().min(1).max(100).default(20),
			offset: z.number().min(0).default(0),
			activeStatus: activeStatusSchema.optional(),
			gender: genderSchema.optional()
		})
	)
	.handler(async ({ data, context }) =>
		patientRepository.search({ clinicId: getClinicId(context.user) }, data)
	);

export const $getPatientById = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const patient = await patientRepository.findById(id, {
			clinicId: getClinicId(context.user)
		});
		if (!patient) throw new ServerError("NOT_FOUND", "Patient not found");
		return patient;
	});

export const $getPatientByMRN = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: mrn, context }) => {
		const patient = await patientRepository.findByMRN(mrn, {
			clinicId: getClinicId(context.user)
		});
		if (!patient) throw new ServerError("NOT_FOUND", "Patient not found");
		return patient;
	});

export const $searchPatients = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			query: z.string().optional(),
			limit: z.number().min(1).max(100).default(20),
			offset: z.number().min(0).default(0),
			activeStatus: activeStatusSchema.optional(),
			gender: genderSchema.optional(),
			ageRange: z
				.object({ min: z.number().optional(), max: z.number().optional() })
				.optional(),
			pediatricianId: z.string().optional(),
			hasAllergies: z.boolean().optional(),
			hasChronicConditions: z.boolean().optional(),
			orderBy: z
				.enum(["firstName", "lastName", "createdAt", "dateOfBirth"])
				.default("lastName"),
			orderDirection: z.enum(["asc", "desc"]).default("asc")
		})
	)
	.handler(async ({ data, context }) =>
		patientRepository.search({ clinicId: getClinicId(context.user) }, data)
	);

export const $getAllPatients = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			activeStatus: activeStatusSchema.optional(),
			/**
			 * `"summary"` selects only id / firstName / lastName / mrn / dateOfBirth / gender.
			 * `"full"` (default) preserves the existing behavior.
			 */
			projection: z.enum(["summary", "full"]).default("full")
		})
	)
	.handler(async ({ data, context }) => {
		const scope = { clinicId: getClinicId(context.user) };
		const { projection, ...options } = data;

		if (projection === "summary") {
			return patientRepository.findAllSummary(scope, options);
		}

		return patientRepository.findAll(scope, options);
	});
// Optional: prefer this over the union for call-site type safety.
export const $getAllPatientsSummary = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			activeStatus: activeStatusSchema.optional()
		})
	)
	.handler(async ({ data, context }) =>
		patientRepository.findAllSummary(
			{ clinicId: getClinicId(context.user) },
			data
		)
	);

export const $getFullPatientData = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const fullPatient = await patientRepository.getFullPatientData(id, {
			clinicId: getClinicId(context.user)
		});
		if (!fullPatient) throw new ServerError("NOT_FOUND", "Patient not found");
		return fullPatient;
	});

export const $getPatientEncounters = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0)
		})
	)
	.handler(async ({ data }) =>
		patientRepository.getPatientEncounters(data.patientId, {
			limit: data.limit,
			offset: data.offset
		})
	);

export const $getPatientGrowthData = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: patientId }) =>
		patientRepository.getPatientGrowthData(patientId)
	);

export const $getPatientImmunizations = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: patientId }) =>
		patientRepository.getPatientImmunizations(patientId)
	);

export const $getPatientPrescriptions = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			status: z
				.enum(["Active", "Completed", "Discontinued", "Cancelled"])
				.optional()
		})
	)
	.handler(async ({ data }) =>
		patientRepository.getPatientPrescriptions(data.patientId, data.status)
	);

export const $getPatientLabOrders = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			status: z
				.enum([
					"Ordered",
					"Sample Collected",
					"Processing",
					"Completed",
					"Cancelled"
				])
				.optional()
		})
	)
	.handler(async ({ data }) =>
		patientRepository.getPatientLabOrders(data.patientId, data.status)
	);

export const $getPatientVitals = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			limit: z.number().min(1).max(100).default(10)
		})
	)
	.handler(async ({ data }) =>
		patientRepository.getPatientVitals(data.patientId, data.limit)
	);

export const $getPatientStats = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async ({ context }) =>
		patientRepository.getStats({ clinicId: getClinicId(context.user) })
	);

export const $countPatients = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z
			.object({
				activeStatus: activeStatusSchema.optional()
			})
			.optional()
	)
	.handler(async ({ data, context }) => {
		const scope = { clinicId: getClinicId(context.user) };
		const options = { activeStatus: data?.activeStatus };
		return patientRepository.countForClinic(scope, options);
	});

// ─── Mutations ───

export const $createPatient = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(
		z.object({
			patient: createPatientSchema,
			guardians: z.array(guardianDraftSchema).optional(),
			allergies: z.array(createPatientAllergySchema).optional(),
			chronicConditions: z.array(conditionDraftSchema).optional()
		})
	)
	.handler(async ({ data, context }) => {
		const { patient, guardians, allergies, chronicConditions } = data;
		return patientRepository.create(
			{ clinicId: getClinicId(context.user) },
			patient,
			guardians ?? [],
			allergies ?? [],
			chronicConditions ?? []
		);
	});

export const $updatePatient = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(updatePatientSchema)
	.handler(async ({ data, context }) => {
		const { id, ...rest } = data;
		if (!id) throw new ServerError("NOT_FOUND", "Patient id is required");
		const updated = await patientRepository.update(id, rest, {
			clinicId: getClinicId(context.user)
		});
		if (!updated) throw new ServerError("NOT_FOUND", "Patient not found");
		return updated;
	});

export const $deletePatient = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) =>
		patientRepository.delete(id, { clinicId: getClinicId(context.user) })
	);

export const $mergePatients = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(
		z.object({
			sourcePatientId: z.string(),
			targetPatientId: z.string()
		})
	)
	.handler(async ({ data, context }) =>
		patientRepository.mergePatients(
			data.sourcePatientId,
			data.targetPatientId,
			{
				clinicId: getClinicId(context.user)
			}
		)
	);

export const $archivePatient = createServerFn({ method: "POST" })
	.middleware([freshRequireRoleMiddleware(["admin", "doctor"])])
	.validator(z.string())
	.handler(async ({ data: id, context }) =>
		patientRepository.archive(id, { clinicId: getClinicId(context.user) })
	);
