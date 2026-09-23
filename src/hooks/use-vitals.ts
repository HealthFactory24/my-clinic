// src/hooks/use-vitals.ts

import { useQuery } from "@tanstack/react-query";

import type { VitalSearchParams } from "./query-keys.ts";
import {
	abnormalVitalsQueryOptions,
	latestVitalQueryOptions,
	vitalByIdQueryOptions,
	vitalListQueryOptions,
	vitalsByEncounterQueryOptions,
	vitalsByPatientQueryOptions,
	vitalsCountQueryOptions
} from "./query-options.ts";

export function useVitalById(id: string) {
	return useQuery(vitalByIdQueryOptions(id));
}

export function useVitalList(params: VitalSearchParams) {
	return useQuery(vitalListQueryOptions(params));
}

export function useVitalsByPatient(
	patientId: string,
	params: Omit<VitalSearchParams, "patientId"> = {}
) {
	return useQuery(vitalsByPatientQueryOptions(patientId, params));
}

export function useVitalsByEncounter(encounterId: string) {
	return useQuery(vitalsByEncounterQueryOptions(encounterId));
}

export function useLatestVital(patientId: string) {
	return useQuery(latestVitalQueryOptions(patientId));
}

export function useAbnormalVitals(patientId: string, limit = 20) {
	return useQuery(abnormalVitalsQueryOptions(patientId, limit));
}

export function useVitalsCount(
	params: { patientId?: string; startDate?: Date; endDate?: Date } = {}
) {
	return useQuery(vitalsCountQueryOptions(params));
}
