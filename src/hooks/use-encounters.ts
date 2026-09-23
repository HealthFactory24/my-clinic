// src/hooks/use-encounters.ts

import { useQuery } from "@tanstack/react-query";

import type { EncounterSearchParams } from "./query-keys.ts";
import {
	encounterByIdQueryOptions,
	encounterListQueryOptions,
	encounterStatsQueryOptions,
	encountersByPatientQueryOptions,
	recentEncountersQueryOptions
} from "./query-options.ts";

export function useEncounterById(id: string) {
	return useQuery(encounterByIdQueryOptions(id));
}

export function useEncounterList(params: EncounterSearchParams) {
	return useQuery(encounterListQueryOptions(params));
}

export function useEncountersByPatient(
	patientId: string,
	params: Omit<EncounterSearchParams, "patientId"> = {}
) {
	return useQuery(encountersByPatientQueryOptions(patientId, params));
}

export function useRecentEncounters(limit = 10) {
	return useQuery(recentEncountersQueryOptions(limit));
}

export function useEncounterStats() {
	return useQuery(encounterStatsQueryOptions());
}
