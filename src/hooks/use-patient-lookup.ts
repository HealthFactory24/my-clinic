// src/hooks/use-patient-lookup.ts

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import appConfig from "#/config/app.config.ts";
import { patientSummaryListQueryOptions } from "#/hooks/query-options.ts";
import type { PatientSummary } from "#/types/patient.ts";

/**
 * Maximum number of patient summaries fetched for the lookup Map.
 *
 * Sourced from the app's global pagination cap so the lookup stays in sync
 * with the server-side `z.number().max(...)` validator. If your clinic
 * exceeds this, the lookup will silently miss patients — see the overflow
 * toast below.
 */
const LOOKUP_PAGE_LIMIT = appConfig.pagination.maxLimit;

export function usePatientLookup(): Map<string, PatientSummary> {
	const { data: page } = useQuery(
		patientSummaryListQueryOptions({
			limit: LOOKUP_PAGE_LIMIT,
			offset: 0
		})
	);

	// One toast per session is plenty — React Query re-runs the selector on
	// every refetch, and we don't want to spam the user.
	const warnedRef = useMemo(() => ({ current: false }), []);

	return useMemo(() => {
		const patients = page?.data ?? [];

		if (patients.length >= LOOKUP_PAGE_LIMIT && !warnedRef.current) {
			warnedRef.current = true;
			toast.warning("Patient lookup truncated");
		}

		return new Map(patients.map(p => [p.id, p] as const));
	}, [page, warnedRef]);
}
