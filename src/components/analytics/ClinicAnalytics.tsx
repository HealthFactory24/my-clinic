// src/components/analytics/ClinicAnalytics.tsx
"use client";

import type { ChartPositionScaleOptions } from "@tanstack/charts";
import { areaY, barY, d3Curve, defineChart, lineY } from "@tanstack/charts";
import { motion } from "@tanstack/charts/motion";
import { RendererChart } from "@tanstack/charts/react/tooltip";
import { tooltip } from "@tanstack/charts/tooltip";
import { scaleBand, scaleLinear, scalePoint } from "d3-scale";
import { curveMonotoneX, curveNatural } from "d3-shape";
import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useClinicInsights } from "../../hooks/use-analytics";
import type { ClinicInsight, InsightSeriesPoint } from "../../types/insights";
import { formatCount } from "../intro-page/format-pedia-age";
import { TrendBadge } from "./TrendBadge";

// ─── Static chart config (hoisted, module-level) ────────────────────────────

const X_SCALE_LINEAR: ChartPositionScaleOptions = {
	scale: scaleLinear,
	grid: true,
	axis: {
		line: false,
		ticks: { size: 4, padding: 8 }
	}
};

const X_SCALE_POINT: ChartPositionScaleOptions = {
	scale: scalePoint,
	axis: {
		line: false,
		ticks: { size: 0, padding: 10 }
	}
};

const X_SCALE_BAND: ChartPositionScaleOptions = {
	scale: scaleBand,
	axis: {
		line: false,
		ticks: { size: 0, padding: 8 }
	}
};

/**
 * Continuous time x-scale for line/area charts. Positions the marks by the
 * bucket timestamp so elapsed time drives spacing, and formats the axis
 * ticks as short dates (adding the year only when the range spans years).
 */
function makeLinearXScale(
	rows: ReadonlyArray<InsightSeriesPoint>
): ChartPositionScaleOptions {
	const times = rows.map(p => Number(p.ts)).filter(Number.isFinite);
	if (times.length === 0) return X_SCALE_POINT;

	const min = Math.min(...times);
	const max = Math.max(...times);
	const multiYear =
		new Date(min).getUTCFullYear() !== new Date(max).getUTCFullYear();

	return {
		...X_SCALE_LINEAR,
		axis: {
			...X_SCALE_LINEAR.axis,
			ticks: {
				size: 4,
				padding: 8,
				format: value =>
					new Date(Number(value)).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						...(multiYear ? { year: "numeric" } : {})
					})
			}
		}
	} satisfies ChartPositionScaleOptions;
}

const Y_SCALE: ChartPositionScaleOptions = {
	scale: scaleLinear,
	grid: true,
	axis: { line: false, ticks: false, tickLabels: false }
};

const CHART_THEME = {
	foreground: "var(--muted-foreground)",
	grid: "var(--border)",
	background: "transparent"
};

const PAD = { top: 20, right: 24, bottom: 36, left: 44 };

const DEFAULT_WIDTH = 700;

// ─── Motion renderer (shared across charts) ─────────────────────────────────

const CHART_RENDERER = motion({
	initial: "always",
	transition: { type: "spring", stiffness: 170, damping: 18, mass: 1 }
});

// ─── Metric config ──────────────────────────────────────────────────────────

type InsightConfig = {
	chartType: "line" | "area" | "bar";
	color: string;
	unit: string;
	xLabel: string;
	yLabel: string;
};

const INSIGHT_CONFIG: Record<string, InsightConfig> = {
	visits: {
		chartType: "area",
		color: "#0d9488",
		unit: "visits",
		xLabel: "Week",
		yLabel: "Visits"
	},
	newPatients: {
		chartType: "bar",
		color: "#6366f1",
		unit: "patients",
		xLabel: "Month",
		yLabel: "New patients"
	},
	immunizations: {
		chartType: "bar",
		color: "#0ea5e9",
		unit: "doses",
		xLabel: "Week",
		yLabel: "Doses administered"
	},
	revenue: {
		chartType: "line",
		color: "#059669",
		unit: "USD",
		xLabel: "Week",
		yLabel: "Revenue"
	}
};

function getInsightConfig(id: string): InsightConfig {
	return (
		INSIGHT_CONFIG[id] ?? {
			chartType: "line",
			color: "var(--primary)",
			unit: "",
			xLabel: "Period",
			yLabel: "Value"
		}
	);
}

function formatInsightValue(
	insight: ClinicInsight,
	config: InsightConfig
): string {
	if (config.unit === "USD") {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			maximumFractionDigits: 0
		}).format(insight.value);
	}
	return formatCount(insight.value);
}

// ─── Main component ─────────────────────────────────────────────────────────

export type ClinicAnalyticsProps = {
	className?: string;
};

export default function ClinicAnalytics({ className }: ClinicAnalyticsProps) {
	const { data, isLoading, isError, error, refetch } = useClinicInsights();

	if (isLoading) {
		return <ClinicAnalyticsSkeleton className={className} />;
	}

	if (isError || !data) {
		return (
			<ClinicAnalyticsError
				className={className}
				message={error?.message ?? "Failed to load clinic insights."}
				onRetry={() => void refetch()}
			/>
		);
	}

	return (
		<div className={cn("space-y-6", className)}>
			<header>
				<h1 className='font-bold text-2xl tracking-tight'>Clinic Analytics</h1>
				<p className='mt-0.5 text-muted-foreground text-sm'>
					Practice-level metrics across patients, visits, immunizations, and
					revenue.
				</p>
			</header>

			{/* Top-line insight cards */}
			<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				{data.insights.map(insight => (
					<InsightCard
						insight={insight}
						key={insight.id}
					/>
				))}
			</div>

			{/* Detailed charts */}
			<div className='grid gap-6 lg:grid-cols-2'>
				{data.insights.map(insight => (
					<InsightChartCard
						insight={insight}
						key={`chart-${insight.id}`}
					/>
				))}
			</div>
		</div>
	);
}

// ─── Insight summary card ───────────────────────────────────────────────────

const InsightCard = React.memo(function InsightCard({
	insight
}: {
	insight: ClinicInsight;
}) {
	const config = getInsightConfig(insight.id);
	const isCurrency = config.unit === "USD";
	return (
		<Card>
			<CardContent className='pt-6'>
				<div className='flex items-center justify-between'>
					<div>
						<p className='font-bold text-muted-foreground text-sm'>
							{insight.label}
						</p>
						<p className='mt-1 font-extrabold text-3xl tabular-nums tracking-tight'>
							{formatInsightValue(insight, config)}
						</p>
						{!isCurrency && (
							<p className='mt-0.5 font-medium text-muted-foreground text-xs'>
								{insight.unit ?? config.unit}
							</p>
						)}
					</div>
					{insight.trend && (
						<TrendBadge
							direction={insight.trend.direction}
							value={insight.trend.value}
						/>
					)}
				</div>
			</CardContent>
		</Card>
	);
});

// ─── Detailed chart card ────────────────────────────────────────────────────

const InsightChartCard = React.memo(function InsightChartCard({
	insight
}: {
	insight: ClinicInsight;
}) {
	const config = getInsightConfig(insight.id);

	const definition = React.useMemo(() => {
		const rows = insight.series.map(p => ({ ...p }));
		if (rows.length === 0) return null;

		const usesTimeX =
			(config.chartType === "line" || config.chartType === "area") &&
			rows.some(p => p.ts != null);
		const xScale = usesTimeX
			? makeLinearXScale(rows)
			: config.chartType === "bar"
				? X_SCALE_BAND
				: X_SCALE_POINT;
		const xAccessor = config.chartType === "bar" || !usesTimeX ? "label" : "ts";

		const marks =
			config.chartType === "bar"
				? [
						barY(rows, {
							id: `bar-${insight.id}`,
							x: xAccessor,
							y: "value",
							fill: config.color,
							radius: 4
						})
					]
				: config.chartType === "area"
					? [
							areaY(rows, {
								id: `area-${insight.id}`,
								x: xAccessor,
								y: "value",
								fill: config.color,
								stroke: config.color,
								strokeWidth: 2,
								curve: d3Curve(curveNatural)
							})
						]
					: [
							lineY(rows, {
								id: `line-${insight.id}`,
								x: xAccessor,
								y: "value",
								stroke: config.color,
								strokeWidth: 2.5,
								curve: d3Curve(curveMonotoneX)
							})
						];

		return defineChart({
			marks,
			scales: {
				x: xScale,
				y: Y_SCALE
			},
			margin: PAD,
			theme: CHART_THEME,
			svgAnimation: false,
			focus: "group-x",
			tooltip: {
				use: tooltip,
				className: "sc-chart-tooltip",
				anchor: "group-center",
				placement: "auto"
			}
		});
	}, [insight.id, insight.series, config.chartType, config.color]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-base'>{insight.label}</CardTitle>
				<p className='text-muted-foreground text-xs'>
					{config.yLabel} by {config.xLabel.toLowerCase()}
				</p>
			</CardHeader>
			<CardContent>
				{definition ? (
					<div style={{ height: 260 }}>
						<RendererChart
							ariaLabel={`${insight.label} chart`}
							definition={definition}
							height={260}
							initialWidth={DEFAULT_WIDTH}
							renderer={CHART_RENDERER}
						/>
					</div>
				) : (
					<EmptyChartState />
				)}
			</CardContent>
		</Card>
	);
});

// ─── Empty / loading / error states ─────────────────────────────────────────

function EmptyChartState() {
	return (
		<div className='flex h-64 items-center justify-center rounded-xl border border-dashed bg-muted/40 text-center'>
			<div>
				<p className='font-medium text-muted-foreground text-sm'>No data yet</p>
				<p className='mt-1 text-muted-foreground/70 text-xs'>
					Insights will appear once the clinic records activity.
				</p>
			</div>
		</div>
	);
}

function ClinicAnalyticsSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("space-y-6", className)}>
			<div className='space-y-2'>
				<Skeleton className='h-8 w-64' />
				<Skeleton className='h-4 w-96' />
			</div>
			<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				{[0, 1, 2, 3].map(i => (
					<Skeleton
						className='h-28'
						key={i}
					/>
				))}
			</div>
			<div className='grid gap-6 lg:grid-cols-2'>
				<Skeleton className='h-80' />
				<Skeleton className='h-80' />
				<Skeleton className='h-80' />
				<Skeleton className='h-80' />
			</div>
		</div>
	);
}

function ClinicAnalyticsError({
	message,
	onRetry,
	className
}: {
	message: string;
	onRetry: () => void;
	className?: string;
}) {
	return (
		<Card className={className}>
			<CardContent className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
				<p className='font-medium'>Couldn't load analytics</p>
				<p className='mt-0.5 text-muted-foreground text-sm'>{message}</p>
				<button
					className='mt-2 rounded-md border px-3 py-1.5 text-sm'
					onClick={onRetry}
					type='button'
				>
					Try again
				</button>
			</CardContent>
		</Card>
	);
}
