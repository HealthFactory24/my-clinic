// src/components/analytics/ClinicInsightsCard.tsx
"use client";

import * as React from "react";

import { MiniBarChart } from "@/components/analytics/MiniBarChart";
import { TrendBadge } from "@/components/analytics/TrendBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ClinicInsight } from "@/types/insights";

export type ClinicInsightsCardProps = {
	insights: ReadonlyArray<ClinicInsight>;
	className?: string;
	publishedAt?: Date | string;
};

export function ClinicInsightsCard({
	insights,
	className,
	publishedAt = new Date()
}: ClinicInsightsCardProps) {
	const formattedDate = React.useMemo(() => {
		return new Date(publishedAt).toLocaleString("en-US", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit"
		});
	}, [publishedAt]);

	return (
		<Card className={className}>
			<CardHeader className='flex justify-between'>
				<div className='flex flex-col gap-1'>
					<span className='font-semibold text-lg'>Clinic insights</span>
					<span className='text-muted-foreground text-sm'>
						Updated {formattedDate}
					</span>
				</div>
			</CardHeader>
			<CardContent>
				<Separator />
			</CardContent>
			<CardContent className='space-y-4'>
				{insights.map(insight => (
					<InsightRow
						insight={insight}
						key={insight.id}
					/>
				))}
			</CardContent>
		</Card>
	);
}

// ─── Insight row (memoized) ─────────────────────────────────────────────────

type InsightRowProps = {
	insight: ClinicInsight;
};

const InsightRow = React.memo(function InsightRow({
	insight
}: InsightRowProps) {
	return (
		<div className='flex items-center justify-between gap-1'>
			<div className='flex flex-col gap-1'>
				<div className='flex items-center gap-2'>
					<span className='text-xs'>{insight.label}</span>
					{insight.trend && (
						<TrendBadge
							direction={insight.trend.direction}
							value={insight.trend.value}
						/>
					)}
				</div>
				<span className='font-semibold text-2xl tabular-nums'>
					{insight.value.toLocaleString()}
					{insight.unit ? (
						<span className='ml-1 font-normal text-muted-foreground text-sm'>
							{insight.unit}
						</span>
					) : null}
				</span>
			</div>
			<MiniBarChart
				color={insight.color ?? "var(--primary)"}
				data={insight.series}
			/>
		</div>
	);
});
