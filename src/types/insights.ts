// src/lib/db/types/insights.ts

import type { TrendDirection } from "@/components/analytics/TrendBadge";

export type InsightSeriesPoint = {
	label: string;
	value: number;
	/** Bucket start time (epoch ms); lets clients use a continuous time x-axis. */
	ts?: number;
};

export type ClinicInsight = {
	id: string;
	label: string;
	value: number;
	unit?: string;
	color?: string;
	series: ReadonlyArray<InsightSeriesPoint>;
	trend?: {
		direction: TrendDirection;
		value: number;
	};
};

export type ClinicInsightsPayload = {
	insights: ReadonlyArray<ClinicInsight>;
	generatedAt: string;
};
