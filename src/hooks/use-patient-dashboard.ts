// src/hooks/use-patient-dashboard.ts

import { useQueries, useSuspenseQueries } from "@tanstack/react-query";

import type {
	Encounter,
	GrowthMeasurement,
	Immunization,
	LabOrder,
	Patient,
	Prescription,
	VitalSigns
} from "#/lib/db/schema/types.ts";

import {
	fullPatientQueryOptions,
	patientEncountersQueryOptions,
	patientGrowthQueryOptions,
	patientImmunizationsQueryOptions,
	patientLabOrdersQueryOptions,
	patientPrescriptionsQueryOptions,
	patientVitalsQueryOptions
} from "./query-options.ts";

export interface PatientDashboardData {
	patient: Patient | undefined;
	encounters: Encounter[] | undefined;
	vitals: VitalSigns[] | undefined;
	growth: GrowthMeasurement[] | undefined;
	immunizations: Immunization[] | undefined;
	prescriptions: Prescription[] | undefined;
	labOrders: LabOrder[] | undefined;
	isLoading: boolean;
	isError: boolean;
	refetch: () => Promise<void>;
}

/**
 * Combined hook for the patient detail page.
 *
 * Issues full-patient + encounters + vitals + growth + immunizations +
 * prescriptions + labOrders in parallel via `useQueries`. This does NOT
 * introduce a combined server fn — the whole point is to parallelize the
 * existing per-resource server fns client-side.
 */
export function usePatientDashboard(patientId: string): PatientDashboardData {
	const results = useQueries({
		queries: [
			fullPatientQueryOptions(patientId),
			patientEncountersQueryOptions(patientId),
			patientVitalsQueryOptions(patientId),
			patientGrowthQueryOptions(patientId),
			patientImmunizationsQueryOptions(patientId),
			patientPrescriptionsQueryOptions(patientId),
			patientLabOrdersQueryOptions(patientId)
		]
	});

	const [
		patientResult,
		encountersResult,
		vitalsResult,
		growthResult,
		immunizationsResult,
		prescriptionsResult,
		labOrdersResult
	] = results;

	const isLoading = results.some(r => r.isLoading);
	const isError = results.some(r => r.isError);

	const refetch = async () => {
		await Promise.all(results.map(r => r.refetch()));
	};

	return {
		patient: patientResult?.data,
		encounters: encountersResult?.data,
		vitals: vitalsResult?.data,
		growth: growthResult?.data,
		immunizations: immunizationsResult?.data,
		prescriptions: prescriptionsResult?.data,
		labOrders: labOrdersResult?.data,
		isLoading,
		isError,
		refetch
	};
}

/**
 * Suspense variant for route-loader prefetching.
 *
 * Pair with `queryClient.ensureQueryData(...)` in a route loader, then call
 * `usePatientDashboardSuspense(patientId)` in the component to get a cache hit.
 */
export function usePatientDashboardSuspense(
	patientId: string
): PatientDashboardData {
	const results = useSuspenseQueries({
		queries: [
			fullPatientQueryOptions(patientId),
			patientEncountersQueryOptions(patientId),
			patientVitalsQueryOptions(patientId),
			patientGrowthQueryOptions(patientId),
			patientImmunizationsQueryOptions(patientId),
			patientPrescriptionsQueryOptions(patientId),
			patientLabOrdersQueryOptions(patientId)
		]
	});

	const [
		patientResult,
		encountersResult,
		vitalsResult,
		growthResult,
		immunizationsResult,
		prescriptionsResult,
		labOrdersResult
	] = results;

	const refetch = async () => {
		await Promise.all(results.map(r => r.refetch()));
	};

	return {
		patient: patientResult.data,
		encounters: encountersResult.data,
		vitals: vitalsResult.data,
		growth: growthResult.data,
		immunizations: immunizationsResult.data,
		prescriptions: prescriptionsResult.data,
		labOrders: labOrdersResult.data,
		isLoading: false,
		isError: false,
		refetch
	};
}
