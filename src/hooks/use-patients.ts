// src/hooks/use-patients.ts

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import type { PatientCountParams, PatientSearchParams } from "./query-keys.ts";
import {
	allPatientsQueryOptions,
	fullPatientQueryOptions,
	patientByIdQueryOptions,
	patientByMrnQueryOptions,
	patientCountQueryOptions,
	patientEncountersQueryOptions,
	patientGrowthQueryOptions,
	patientImmunizationsQueryOptions,
	patientLabOrdersQueryOptions,
	patientListQueryOptions,
	patientPrescriptionsQueryOptions,
	patientSearchQueryOptions,
	patientStatsQueryOptions,
	patientVitalsQueryOptions
} from "./query-options.ts";

export function usePatientList(params: PatientSearchParams) {
	return useQuery(patientListQueryOptions(params));
}

export function usePatientSearch(params: PatientSearchParams) {
	return useQuery(patientSearchQueryOptions(params));
}

export function useAllPatients(params: {
	limit?: number;
	offset?: number;
	activeStatus?: "Active" | "Inactive" | "Archived";
}) {
	return useQuery(allPatientsQueryOptions(params));
}

export function usePatientById(id: string) {
	return useQuery(patientByIdQueryOptions(id));
}

export function usePatientByMrn(mrn: string) {
	return useQuery(patientByMrnQueryOptions(mrn));
}

export function useFullPatient(id: string) {
	return useQuery(fullPatientQueryOptions(id));
}

export function useFullPatientSuspense(id: string) {
	return useSuspenseQuery(fullPatientQueryOptions(id));
}

export function usePatientEncounters(id: string) {
	return useQuery(patientEncountersQueryOptions(id));
}

export function usePatientGrowth(id: string) {
	return useQuery(patientGrowthQueryOptions(id));
}

export function usePatientImmunizations(id: string) {
	return useQuery(patientImmunizationsQueryOptions(id));
}

export function usePatientPrescriptions(id: string) {
	return useQuery(patientPrescriptionsQueryOptions(id));
}

export function usePatientLabOrders(id: string) {
	return useQuery(patientLabOrdersQueryOptions(id));
}

export function usePatientVitals(id: string) {
	return useQuery(patientVitalsQueryOptions(id));
}

export function usePatientStats() {
	return useQuery(patientStatsQueryOptions());
}

export function usePatientCount(params: PatientCountParams = {}) {
	return useQuery(patientCountQueryOptions(params));
}
