// src/hooks/use-growth.ts

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { growthRepository } from "#/lib/db/repositories";
import type { MetricType } from "#/lib/db/schema/index.ts";
import {
	AGE_GROUP_RANGES,
	type AgeGroup,
	type PercentileBand
} from "#/utils/growth-utils.ts";

import type { GrowthSearchParams } from "./query-keys.ts";
import {
	growthChartDataQueryOptions,
	growthMeasurementByIdQueryOptions,
	growthMeasurementsByPatientQueryOptions,
	growthPercentilesQueryOptions,
	growthStatsQueryOptions,
	latestGrowthMeasurementQueryOptions,
	whoAgeRangeQueryOptions,
	whoGrowthDataQueryOptions,
	whoLmsParametersQueryOptions,
	whoPercentileCurveQueryOptions
} from "./query-options.ts";

export function useGrowthMeasurementById(id: string) {
	return useQuery(growthMeasurementByIdQueryOptions(id));
}

export function useGrowthMeasurementsByPatient(
	patientId: string,
	params: Omit<GrowthSearchParams, "patientId"> = {}
) {
	return useQuery(growthMeasurementsByPatientQueryOptions(patientId, params));
}

export function useLatestGrowthMeasurement(patientId: string) {
	return useQuery(latestGrowthMeasurementQueryOptions(patientId));
}

export function useGrowthChartData(
	patientId: string,
	metric: MetricType = "weight"
) {
	return useQuery(growthChartDataQueryOptions(patientId, metric));
}

export function useGrowthStats(patientId: string) {
	return useQuery(growthStatsQueryOptions(patientId));
}

export function useGrowthPercentiles(patientId: string) {
	return useQuery(growthPercentilesQueryOptions(patientId));
}

export function useWhoGrowthData(
	gender: "male" | "female",
	metricType: "weight" | "height" | "head_circumference" | "bmi"
) {
	return useQuery(whoGrowthDataQueryOptions(gender, metricType));
}

export function useWhoPercentileCurve(
	gender: "male" | "female",
	metricType: "weight" | "height" | "head_circumference" | "bmi",
	ageMonths: number[]
) {
	return useQuery(
		whoPercentileCurveQueryOptions(gender, metricType, ageMonths)
	);
}

export function useWhoLmsParameters(
	gender: "male" | "female",
	metricType: "weight" | "height" | "head_circumference" | "bmi",
	ageMonths: number
) {
	return useQuery(whoLmsParametersQueryOptions(gender, metricType, ageMonths));
}

export function useWhoAgeRange(
	gender: "male" | "female",
	metricType: "weight" | "height" | "head_circumference" | "bmi"
) {
	return useQuery(whoAgeRangeQueryOptions(gender, metricType));
}

export interface GrowthMeasurementListOptions {
	patientId?: string;
	query?: string;
	ageGroup?: AgeGroup;
	percentileBand?: PercentileBand;
	limit?: number;
	offset?: number;
}

export function useGrowthMeasurementList({
	patientId,
	query,
	ageGroup,
	percentileBand,
	limit = 20,
	offset = 0
}: GrowthMeasurementListOptions = {}) {
	const ageRange = ageGroup ? AGE_GROUP_RANGES[ageGroup] : undefined;

	return useQuery({
		queryKey: [
			"growth",
			"list",
			{ patientId, query, ageGroup, percentileBand, limit, offset }
		],
		queryFn: () =>
			growthRepository.findForTable({
				patientId,
				query,
				ageRange,
				percentileBand,
				limit,
				offset
			}),
		placeholderData: keepPreviousData,
		staleTime: 30_000
	});
}
