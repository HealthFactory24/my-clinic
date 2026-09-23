// src/server/analytics.ts

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { getClinicId, staffMiddleware } from "#/lib/auth/middleware.ts";
import { dashboardRepository } from "#/lib/db/repositories/dashboard.repo.ts";

import type { ClinicInsightsPayload } from "../types/insights";

const insightsInputSchema = z.object({
	from: z.string().optional(),
	to: z.string().optional()
});

export const $getClinicInsights = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(insightsInputSchema)
	.handler(async ({ data, context }): Promise<ClinicInsightsPayload> => {
		const clinicId = getClinicId(context.user);

		const [visits, newPatients, immunizations, revenue] = await Promise.all([
			dashboardRepository.getVisitsSeries(clinicId, data),
			dashboardRepository.getNewPatientsSeries(clinicId, data),
			dashboardRepository.getImmunizationsSeries(clinicId, data),
			dashboardRepository.getRevenueSeries(clinicId, data)
		]);

		return {
			generatedAt: new Date().toISOString(),
			insights: [
				buildInsight("visits", "Patient visits", visits, {
					unit: "visits",
					trend: "up"
				}),
				buildInsight("newPatients", "New patients", newPatients, {
					unit: "patients",
					trend: "up"
				}),
				buildInsight("immunizations", "Immunizations", immunizations, {
					unit: "doses",
					trend: "up"
				}),
				buildInsight("revenue", "Revenue", revenue, {
					unit: "USD",
					trend: "up"
				})
			]
		};
	});

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildInsight(
	id: string,
	label: string,
	series: ReadonlyArray<{ label: string; value: number }>,
	opts: { unit: string; trend: "up" | "down" | "flat" }
) {
	const total = series.reduce((sum, p) => sum + p.value, 0);
	const first = series[0]?.value ?? 0;
	const last = series.at(-1)?.value ?? 0;
	const delta = first === 0 ? 0 : ((last - first) / first) * 100;

	return {
		id,
		label,
		value: total,
		unit: opts.unit,
		series,
		trend: {
			direction: delta > 1 ? opts.trend : delta < -1 ? "down" : "flat",
			value: delta
		}
	};
}
