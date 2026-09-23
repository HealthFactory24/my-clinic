// src/hooks/use-immunizations.ts

import { useQuery } from "@tanstack/react-query";

import type { ImmunizationStatus } from "#/lib/db/schema/types.ts";

import {
	allOverdueImmunizationsQueryOptions,
	immunizationByIdQueryOptions,
	immunizationCountQueryOptions,
	immunizationListQueryOptions,
	immunizationsByPatientQueryOptions,
	overdueImmunizationsQueryOptions,
	upcomingImmunizationsQueryOptions,
	vaccineComplianceQueryOptions
} from "./query-options.ts";

export function useImmunizationById(id: string) {
	return useQuery(immunizationByIdQueryOptions(id));
}

export function useImmunizationsByPatient(
	patientId: string,
	status?: ImmunizationStatus
) {
	return useQuery(immunizationsByPatientQueryOptions(patientId, status));
}

export function useOverdueImmunizations(patientId: string) {
	return useQuery(overdueImmunizationsQueryOptions(patientId));
}

export function useUpcomingImmunizations(patientId: string, daysAhead = 30) {
	return useQuery(upcomingImmunizationsQueryOptions(patientId, daysAhead));
}

export function useAllOverdueImmunizations() {
	return useQuery(allOverdueImmunizationsQueryOptions());
}

export function useVaccineCompliance(patientId: string) {
	return useQuery(vaccineComplianceQueryOptions(patientId));
}

export function useImmunizationCount(
	params: { patientId?: string; status?: ImmunizationStatus } = {}
) {
	return useQuery(immunizationCountQueryOptions(params));
}
export function useImmunizationList(params: {
	query?: string;
	status?: ImmunizationStatus;
	dateRange?: "Due Soon" | "Overdue" | "Completed";
	patientId?: string;
	limit?: number;
	offset?: number;
}) {
	return useQuery(immunizationListQueryOptions(params));
}
