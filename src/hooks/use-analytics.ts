// src/hooks/use-analytics.ts

import { queryOptions, useQuery } from "@tanstack/react-query";

import { queryKeys } from "#/hooks/query-keys.ts";

import type { ClinicInsightsPayload } from "../types/insights";

// ─── Query options ──────────────────────────────────────────────────────────

export type ClinicInsightsParams = {
	from?: string;
	to?: string;
	clinicId?: string;
};
export const clinicInsightsQueryOptions = (params: ClinicInsightsParams = {}) =>
	queryOptions({
		queryKey: queryKeys.analytics.insights(params),
		queryFn: async (): Promise<ClinicInsightsPayload> => {
			const res = await fetch(
				`/api/analytics/insights?${new URLSearchParams(
					Object.entries(params).filter(([, v]) => v !== undefined) as Array<
						[string, string]
					>
				).toString()}`
			);
			if (!res.ok) {
				throw new Error("Failed to load clinic insights");
			}
			return res.json();
		},
		staleTime: 60_000
	});

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useClinicInsights(params: ClinicInsightsParams = {}) {
	return useQuery(clinicInsightsQueryOptions(params));
}
