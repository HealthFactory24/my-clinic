// src/components/growth/growth-chart.tsx
"use client";

import {
	areaY,
	type ChartPositionScaleOptions,
	d3Curve,
	defineChart,
	lineY
} from "@tanstack/charts";
import { motion } from "@tanstack/charts/motion";
import { RendererChart } from "@tanstack/charts/react/tooltip";
import { tooltip } from "@tanstack/charts/tooltip";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { scaleLinear, scalePoint } from "d3-scale";
import { curveMonotoneX } from "d3-shape";
import * as React from "react";

import { Skeleton } from "#/components/ui/skeleton.tsx";
import { growthRepository } from "#/lib/db/repositories";
import type { GrowthMeasurement, MetricType } from "#/lib/db/schema";
import { cn } from "#/lib/utils.ts";

import { formatAge, formatPercentileOrdinal } from "../../utils/growth-utils";

// ─── Metric config ─────────────────────────────────────────────────────────

type MetricConfig = {
	label: string;
	unit: string;
	valueKey: keyof GrowthMeasurement;
	zKey: keyof GrowthMeasurement;
	pctKey: keyof GrowthMeasurement;
	/** Reference data channel for WHO LMS lookup. */
	whoMetric: MetricType;
	/** Y-axis domain padding in the metric's unit. */
	yPadding: number;
};

const METRIC_CONFIG: Record<MetricType, MetricConfig> = {
	weight: {
		label: "Weight-for-Age",
		unit: "kg",
		valueKey: "weightKg",
		zKey: "weightForAgeZScore",
		pctKey: "weightForAgePercentile",
		whoMetric: "weight",
		yPadding: 2
	},
	height: {
		label: "Length/Height-for-Age",
		unit: "cm",
		valueKey: "heightCm",
		zKey: "heightForAgeZScore",
		pctKey: "heightForAgePercentile",
		whoMetric: "height",
		yPadding: 5
	},
	head_circumference: {
		label: "Head Circumference-for-Age",
		unit: "cm",
		valueKey: "headCircumferenceCm",
		zKey: "headCircumferenceZScore",
		pctKey: "headCircumferencePercentile",
		whoMetric: "head_circumference",
		yPadding: 2
	},
	bmi: {
		label: "BMI-for-Age",
		unit: "kg/m²",
		valueKey: "bmi",
		zKey: "bmiForAgeZScore",
		pctKey: "bmiForAgePercentile",
		whoMetric: "bmi",
		yPadding: 3
	}
};

// ─── Chart config (module-level, stable identity) ──────────────────────────

const PAD = { top: 24, right: 56, bottom: 40, left: 48 };

const X_SCALE: ChartPositionScaleOptions = {
	scale: scalePoint,
	axis: { line: false, ticks: { size: 0, padding: 10 } }
};

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

const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 380;

// WHO SD curve visual config. Colors follow the pediatric convention: green
// median, amber ±1–2 SD, red ±3 SD. Same palette as the table badges.
const SD_CURVES = [
	{ key: "sd3neg", label: "−3 SD", stroke: "#ef4444", dash: "4 3", width: 1.2 },
	{ key: "sd2neg", label: "−2 SD", stroke: "#f97316", dash: "6 3", width: 1.5 },
	{ key: "sd1neg", label: "−1 SD", stroke: "#ca8a04", dash: "3 2", width: 1 },
	{ key: "sd0", label: "Median", stroke: "#059669", dash: "", width: 2.5 },
	{ key: "sd1", label: "+1 SD", stroke: "#ca8a04", dash: "3 2", width: 1 },
	{ key: "sd2", label: "+2 SD", stroke: "#f97316", dash: "6 3", width: 1.5 },
	{ key: "sd3", label: "+3 SD", stroke: "#ef4444", dash: "4 3", width: 1.2 }
] as const;

// ─── Props ─────────────────────────────────────────────────────────────────

export interface GrowthChartProps {
	/** Patient's measurements, already sorted ascending by `ageMonths`. */
	measurements: GrowthMeasurement[];
	gender: "male" | "female";
	metric: MetricType;
	height?: number;
	width?: number;
	className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function GrowthChart({
	measurements,
	gender,
	metric,
	height = DEFAULT_HEIGHT,
	width = DEFAULT_WIDTH,
	className
}: GrowthChartProps) {
	const config = METRIC_CONFIG[metric];

	// ── WHO reference data ─────────────────────────────────────────────────
	const maxAge = React.useMemo(
		() => Math.max(24, ...measurements.map(m => m.ageMonths)) + 3,
		[measurements]
	);

	const whoQuery = useQuery({
		queryKey: ["who-percentiles", gender, config.whoMetric, maxAge],
		queryFn: () =>
			growthRepository.findWhoReference({
				gender,
				metricType: config.whoMetric,
				maxAgeMonths: maxAge
			}),
		staleTime: 24 * 60 * 60 * 1000, // 24h — reference data is static
		placeholderData: keepPreviousData
	});

	// ── Patient points ─────────────────────────────────────────────────────
	const patientPoints = React.useMemo(
		() =>
			measurements
				.map(m => ({
					ageMonths: m.ageMonths,
					value: m[config.valueKey] as number | null,
					zScore: m[config.zKey] as number | null,
					percentile: m[config.pctKey] as number | null,
					id: m.id,
					recordedAt: m.recordedAt
				}))
				.filter(
					(p): p is typeof p & { value: number } =>
						p.value != null && p.value > 0
				)
				.sort((a, b) => a.ageMonths - b.ageMonths),
		[measurements, config.valueKey, config.zKey, config.pctKey]
	);

	// ── Chart rows: WHO curves + patient values at matching ages ───────────
	const chartRows = React.useMemo(() => {
		if (!whoQuery.data) return [];

		type Row = {
			ageMonths: number;
			sd3neg?: number;
			sd2neg?: number;
			sd1neg?: number;
			sd0?: number;
			sd1?: number;
			sd2?: number;
			sd3?: number;
			patientValue?: number;
		};

		const byAge = new Map<number, Row>();

		for (const row of whoQuery.data) {
			byAge.set(row.ageMonths, {
				ageMonths: row.ageMonths,
				sd3neg: row.sd3neg ?? undefined,
				sd2neg: row.sd2neg ?? undefined,
				sd1neg: row.sd1neg ?? undefined,
				sd0: row.sd0 ?? row.M ?? undefined,
				sd1: row.sd1 ?? undefined,
				sd2: row.sd2 ?? undefined,
				sd3: row.sd3 ?? undefined
			});
		}

		// Snap each patient point to the nearest WHO row's age so the point
		// renders on the same x-tick as the SD curves.
		const ages = Array.from(byAge.keys()).sort((a, b) => a - b);
		for (const p of patientPoints) {
			const nearest =
				ages.reduce<number | null>(
					(best, age) =>
						best == null ||
						Math.abs(age - p.ageMonths) < Math.abs(best - p.ageMonths)
							? age
							: best,
					null
				) ?? p.ageMonths;

			const row = byAge.get(nearest) ?? { ageMonths: nearest };
			row.patientValue = p.value;
			byAge.set(nearest, row);
		}

		return Array.from(byAge.values()).sort((a, b) => a.ageMonths - b.ageMonths);
	}, [whoQuery.data, patientPoints]);

	// ── Chart definition ───────────────────────────────────────────────────
	const renderer = React.useMemo(
		() =>
			motion({
				initial: "always",
				transition: { type: "spring", stiffness: 170, damping: 18, mass: 1 }
			}),
		[]
	);

	const definition = React.useMemo(() => {
		if (chartRows.length === 0) return null;

		const marks = [
			// Shaded "normal" band: between −2 SD and +2 SD
			areaY(chartRows, {
				id: "band-normal",
				x: "ageMonths",
				y1: "sd2neg",
				y2: "sd2",
				curve: d3Curve(curveMonotoneX),
				fill: "rgba(16, 185, 129, 0.10)",
				stroke: "none"
			}),

			// SD curve lines
			...SD_CURVES.map(curve =>
				lineY(chartRows, {
					id: `sd-${curve.key}`,
					x: "ageMonths",
					y: curve.key,
					stroke: curve.stroke,
					strokeWidth: curve.width,
					strokeDasharray: curve.dash,
					curve: d3Curve(curveMonotoneX)
				})
			),

			// Patient trajectory (solid rose line)
			lineY(chartRows, {
				id: "patient",
				x: "ageMonths",
				y: "patientValue",
				stroke: "#e11d48",
				strokeWidth: 2.5,
				curve: d3Curve(curveMonotoneX)
			})
		];

		return defineChart({
			marks,
			scales: { x: X_SCALE, y: Y_SCALE },
			margin: PAD,
			theme: CHART_THEME,
			color: {
				domain: [...SD_CURVES.map(c => `sd-${c.key}`), "patient"],
				range: [...SD_CURVES.map(c => c.stroke), "#e11d48"]
			},
			svgAnimation: false,
			focus: "group-x",
			tooltip: {
				use: tooltip,
				className: "sc-chart-tooltip",
				anchor: "group-center",
				placement: "auto",
				sort: "color-domain",
				content: points => ({
					title: `Age ${formatAge(Number(points[0]?.xValue ?? 0))}`,
					rows: points.map(p => ({
						label: String(p.group ?? p.markId),
						value: Number(p.yValue ?? 0).toFixed(2),
						color: p.color
					}))
				})
			}
		});
	}, [chartRows]);

	// ── Loading state ──────────────────────────────────────────────────────
	if (whoQuery.isPending) {
		return (
			<Skeleton className={cn("h-[420px] w-full rounded-2xl", className)} />
		);
	}

	// ── Empty state ────────────────────────────────────────────────────────
	if (patientPoints.length === 0 && chartRows.length === 0) {
		return (
			<div
				className={cn(
					"flex h-[300px] items-center justify-center rounded-2xl border border-border border-dashed bg-muted/30",
					className
				)}
			>
				<p className='text-muted-foreground text-sm'>
					No {config.label} data to plot.
				</p>
			</div>
		);
	}

	// ── Render ─────────────────────────────────────────────────────────────
	return (
		<div className={cn("rounded-2xl border border-border bg-card", className)}>
			<div className='flex flex-col gap-1 border-border/60 border-b px-5 py-4'>
				<h3 className='font-semibold text-sm'>{config.label}</h3>
				<p className='text-muted-foreground text-xs'>
					WHO Child Growth Standards · {gender === "male" ? "Boys" : "Girls"} ·{" "}
					{patientPoints.length} measurement
					{patientPoints.length === 1 ? "" : "s"}
				</p>
			</div>

			<div
				className='w-full p-4'
				style={{ height: height + PAD.top + PAD.bottom }}
			>
				{definition ? (
					<RendererChart
						ariaLabel={`${config.label} growth chart`}
						definition={definition}
						height={height}
						initialWidth={width}
						renderer={renderer}
					/>
				) : null}
			</div>

			<div className='border-border/60 border-t px-5 py-3'>
				<SDLegend />
			</div>

			{/* Below-chart summary table */}
			{patientPoints.length > 0 && (
				<div className='border-border/60 border-t px-5 py-4'>
					<h4 className='mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider'>
						Recent Measurements
					</h4>
					<div className='overflow-x-auto'>
						<table className='w-full text-left text-sm'>
							<thead>
								<tr className='border-border/60 border-b text-muted-foreground text-xs uppercase'>
									<th className='py-2 pr-4'>Age</th>
									<th className='py-2 pr-4'>{config.unit}</th>
									<th className='py-2 pr-4'>Percentile</th>
									<th className='py-2'>Z-score</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-border/30'>
								{patientPoints
									.slice(-5)
									.reverse()
									.map(pt => (
										<tr
											className='hover:bg-muted/30'
											key={pt.id}
										>
											<td className='py-2 pr-4 font-mono text-xs'>
												{formatAge(pt.ageMonths)}
											</td>
											<td className='py-2 pr-4 font-mono tabular-nums'>
												{pt.value.toFixed(metric === "weight" ? 2 : 1)}
											</td>
											<td className='py-2 pr-4'>
												{pt.percentile != null
													? formatPercentileOrdinal(pt.percentile)
													: "—"}
											</td>
											<td className='py-2 font-mono text-xs tabular-nums'>
												{pt.zScore != null ? pt.zScore.toFixed(2) : "—"}
											</td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Legend ────────────────────────────────────────────────────────────────

const SD_LEGEND_ITEMS = [
	{ style: { background: "#059669" }, label: "Median (50th)" },
	{
		style: { background: "#ca8a04", opacity: 0.6 },
		label: "±1 SD (15th–85th)"
	},
	{ style: { background: "#f97316", opacity: 0.6 }, label: "±2 SD (3rd–97th)" },
	{ style: { background: "#ef4444", opacity: 0.6 }, label: "±3 SD" },
	{ style: { background: "#e11d48" }, label: "Patient" }
] as const;

function SDLegend() {
	return (
		<ul className='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground text-xs'>
			{SD_LEGEND_ITEMS.map(item => (
				<li
					className='flex items-center gap-1.5'
					key={item.label}
				>
					<span
						aria-hidden='true'
						className='inline-block h-2.5 w-4 rounded-sm'
						style={item.style}
					/>
					<span>{item.label}</span>
				</li>
			))}
		</ul>
	);
}
