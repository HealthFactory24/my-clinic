// src/server/growth.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

// import { getClinicId } from "@/lib/auth/middleware";
import {
	doctorMiddleware,
	freshAdminMiddleware,
	staffMiddleware
} from "@/lib/auth/middleware";
import { growthRepository, whoGrowthRepository } from "@/lib/db/repositories";
import { genderSchema, metricTypeSchema } from "@/lib/db/zod";
import {
	createGrowthMeasurementSchema,
	updateGrowthMeasurementSchema
} from "@/lib/db/zod/growth";
import { ServerError } from "@/lib/error";

// ─── Queries ───

export const $getGrowthMeasurementById = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => {
		const m = await growthRepository.findById(id);
		if (!m) throw new ServerError("NOT_FOUND", "Growth measurement not found");
		return m;
	});

export const $findGrowthMeasurementsByPatient = createServerFn({
	method: "GET"
})
	.middleware([staffMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			startDate: z.date().optional(),
			endDate: z.date().optional(),
			minAgeMonths: z.number().min(0).optional(),
			maxAgeMonths: z.number().max(240).optional()
		})
	)
	.handler(async ({ data }) => {
		const { patientId, ...options } = data;
		return growthRepository.findByPatientId(patientId, options);
	});

export const $getLatestGrowthMeasurement = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: patientId }) =>
		growthRepository.findLatestByPatientId(patientId)
	);

export const $getGrowthChartData = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			metric: metricTypeSchema.default("weight")
		})
	)
	.handler(async ({ data }) =>
		growthRepository.getGrowthChartData(data.patientId, data.metric)
	);

export const $getGrowthStats = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: patientId }) =>
		growthRepository.getGrowthStats(patientId)
	);

export const $getGrowthPercentiles = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: patientId }) =>
		growthRepository.getPercentiles(patientId)
	);

// ─── WHO Growth Reference Queries ───

export const $getWHOData = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			gender: genderSchema,
			metricType: metricTypeSchema
		})
	)
	.handler(async ({ data }) =>
		whoGrowthRepository.getByGenderAndMetric(data.gender, data.metricType)
	);

export const $getWHOPercentileCurve = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			gender: genderSchema,
			metricType: metricTypeSchema,
			ageMonths: z.array(z.number().min(0).max(240))
		})
	)
	.handler(async ({ data }) =>
		whoGrowthRepository.getPercentileCurve(
			data.gender,
			data.metricType,
			data.ageMonths
		)
	);

export const $getWHOLMSParameters = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			gender: genderSchema,
			metricType: metricTypeSchema,
			ageMonths: z.number().min(0).max(240)
		})
	)
	.handler(async ({ data }) =>
		whoGrowthRepository.getLMSParameters(
			data.gender,
			data.metricType,
			data.ageMonths
		)
	);

export const $getWHOAgeRange = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			gender: genderSchema,
			metricType: metricTypeSchema
		})
	)
	.handler(async ({ data }) =>
		whoGrowthRepository.getAgeRange(data.gender, data.metricType)
	);

// ─── Mutations ───

export const $createGrowthMeasurement = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(createGrowthMeasurementSchema)
	.handler(async ({ data }) => growthRepository.create(data));

export const $createGrowthMeasurementsBatch = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.array(createGrowthMeasurementSchema))
	.handler(async ({ data }) => growthRepository.createBatch(data));

export const $updateGrowthMeasurement = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(updateGrowthMeasurementSchema)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		const updated = await growthRepository.update(id, rest);
		if (!updated)
			throw new ServerError("NOT_FOUND", "Growth measurement not found");
		return updated;
	});

export const $deleteGrowthMeasurement = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => growthRepository.delete(id));
