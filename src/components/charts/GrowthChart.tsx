// oxlint-disable typescript/no-unsafe-type-assertion
// src/components/charts/GrowthChart.tsx
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
import { scaleLinear, scalePoint } from "d3-scale";
import { curveNatural } from "d3-shape";
import * as React from "react";

import { useWhoGrowthData } from "#/hooks/index.ts";
import { calculatePediatricAge } from "#/utils/index.ts";
import type { GrowthMeasurement, MetricType } from "@/lib/db/schema";

export type GrowthMetric = MetricType | "bmi";

// ─── Types ──────────────────────────────────────────────────────────────────

type SDKey = "sd3neg" | "sd2neg" | "sd1neg" | "sd0" | "sd1" | "sd2" | "sd3";

type SDCurvePoint = {
	ageMonths: number;
	sd3neg: number;
	sd2neg: number;
	sd1neg: number;
	sd0: number;
	sd1: number;
	sd2: number;
	sd3: number;
};

type PatientPoint = {
	ageMonths: number;
	id: string;
	recordedAt: Date | string;
	value: number;
	zScore: number | null;
};

export type GrowthChartProps = {
	growthData: Array<GrowthMeasurement>;
	height?: number;
	metric: GrowthMetric;
	patientDOB: string;
	patientGender: "male" | "female";
	patientName?: string;
};

type MetricConfig = {
	apiMetric: GrowthMetric;
	desc: string;
	label: string;
	unit: string;
	valKey: keyof GrowthMeasurement;
	zKey: keyof GrowthMeasurement;
};

// ─── Runtime guards ─────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toNumberOrNull(v: unknown): number | null {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	if (typeof v === "string" && v.trim() !== "") {
		const n = Number(v);
		if (Number.isFinite(n)) return n;
	}
	return null;
}

function toDateOrString(v: unknown): Date | string {
	if (v instanceof Date) return v;
	if (typeof v === "string") return v;
	return String(v);
}

// ─── Metric config ──────────────────────────────────────────────────────────

function getMetricConfig(metric: GrowthMetric): MetricConfig {
	const configs: Record<GrowthMetric, MetricConfig> = {
		weight: {
			apiMetric: "weight",
			label: "Weight-for-Age",
			unit: "kg",
			zKey: "weightForAgeZScore",
			valKey: "weightKg",
			desc: "WHO Weight-for-Age Standards"
		},
		height: {
			apiMetric: "height",
			label: "Length/Height-for-Age",
			unit: "cm",
			zKey: "heightForAgeZScore",
			valKey: "heightCm",
			desc: "WHO Length/Height-for-Age Standards"
		},
		head_circumference: {
			apiMetric: "head_circumference",
			label: "Head Circumference-for-Age",
			unit: "cm",
			zKey: "headCircumferenceZScore",
			valKey: "headCircumferenceCm",
			desc: "WHO Head Circumference Standards"
		},
		bmi: {
			apiMetric: "bmi",
			label: "BMI-for-Age",
			unit: "kg/m²",
			zKey: "bmiForAgeZScore",
			valKey: "bmi",
			desc: "WHO BMI-for-Age Standards"
		}
	};
	return configs[metric];
}

// ─── Color helpers ──────────────────────────────────────────────────────────

function dotColorByZScore(z: number | null | undefined): string {
	if (z === null || z === undefined) return "#6366f1";
	if (z <= -3) return "#dc2626";
	if (z <= -2) return "#ea580c";
	if (z <= -1) return "#ca8a04";
	if (z <= 1) return "#059669";
	if (z <= 2) return "#ca8a04";
	if (z <= 3) return "#ea580c";
	return "#dc2626";
}

function statusLabel(z: number | null | undefined): string {
	if (z === null || z === undefined) return "—";
	if (z <= -3) return "Severe ↓";
	if (z <= -2) return "Moderate ↓";
	if (z <= -1) return "Mild ↓";
	if (z <= 1) return "Normal";
	if (z <= 2) return "At risk ↑";
	if (z <= 3) return "Overweight";
	return "Obese";
}

// ─── SD curve visual config ─────────────────────────────────────────────────

const SD_CURVES: Array<{
	key: SDKey;
	label: string;
	stroke: string;
	dash?: string;
	width: number;
}> = [
	{ key: "sd3neg", label: "−3 SD", stroke: "#ef4444", dash: "4 3", width: 1.2 },
	{ key: "sd2neg", label: "−2 SD", stroke: "#f97316", dash: "6 3", width: 1.5 },
	{ key: "sd1neg", label: "−1 SD", stroke: "#ca8a04", dash: "3 2", width: 1 },
	{ key: "sd0", label: "Median", stroke: "#059669", width: 2.5 },
	{ key: "sd1", label: "+1 SD", stroke: "#ca8a04", dash: "3 2", width: 1 },
	{ key: "sd2", label: "+2 SD", stroke: "#f97316", dash: "6 3", width: 1.5 },
	{ key: "sd3", label: "+3 SD", stroke: "#ef4444", dash: "4 3", width: 1.2 }
];

// ─── Chart layout constants ─────────────────────────────────────────────────

const PAD = { top: 28, right: 56, bottom: 46, left: 52 };

// Scales and theme hoisted to module-level constants with explicit types.
// This is what allows `defineChart`'s spec-object overload to resolve; an
// inline object literal for `scales` fails the overload's structural check.
const X_SCALE: ChartPositionScaleOptions = {
	scale: scalePoint,
	axis: {
		line: false,
		ticks: {
			size: 0,
			padding: 10
		}
	}
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

const DEFAULT_CHART_WIDTH = 700;

const SD_COLOR_DOMAIN = SD_CURVES.map(c => `sd-${c.key}`);
const SD_COLOR_RANGE = SD_CURVES.map(c => c.stroke);

type ChartRow = Record<string, number | null>;

// ─── Memoized components ────────────────────────────────────────────────────
//
// Extracted to satisfy `react-perf/jsx-no-new-object-as-prop`: inline
// `style={{ ... }}` objects are created fresh on every render, defeating
// memoization and producing a stable-reference regression. Each component
// memoizes its own style based on its color prop.

/**
 * A colored swatch for the SD legend and patient marker.
 */
const LegendSwatch = React.memo(function LegendSwatch({
	background,
	className
}: {
	background: string;
	className: string;
}) {
	const style = React.useMemo<React.CSSProperties>(
		() => ({ background }),
		[background]
	);
	return (
		<span
			className={className}
			style={style}
		/>
	);
});

/**
 * A colored status badge used in the measurements table.
 */
const StatusBadge = React.memo(function StatusBadge({
	color,
	status
}: {
	color: string;
	status: string;
}) {
	const style = React.useMemo<React.CSSProperties>(
		() => ({
			color,
			background: `color-mix(in srgb, ${color} 12%, transparent)`
		}),
		[color]
	);
	return (
		<span
			className='rounded-sm px-2 py-0.5 font-bold text-[10px]'
			style={style}
		>
			{status}
		</span>
	);
});

// ─── Main component ─────────────────────────────────────────────────────────

export function GrowthChart({
	growthData,
	patientGender,
	patientDOB,
	metric,
	height: svgHeightProp = 380,
	patientName
}: GrowthChartProps) {
	const config = getMetricConfig(metric);

	const patientPoints = React.useMemo<Array<PatientPoint>>(() => {
		const points: Array<PatientPoint> = [];
		for (const g of growthData) {
			const raw = g;
			const rawAge = raw.ageMonths;
			const ageMonths =
				typeof rawAge === "number" && rawAge > 0
					? rawAge
					: calculatePediatricAge(
							patientDOB,
							new Date(g.recordedAt).toISOString()
						).totalMonths;

			const val = toNumberOrNull(raw[config.valKey]);
			if (val === null || val <= 0) continue;
			const z = toNumberOrNull(raw[config.zKey]);

			points.push({
				ageMonths,
				value: val,
				zScore: z,
				recordedAt: toDateOrString(g.recordedAt),
				id: g.id
			});
		}
		return points.toSorted((a, b) => a.ageMonths - b.ageMonths);
	}, [growthData, patientDOB, config.valKey, config.zKey]);

	const maxAgeMonths = React.useMemo(() => {
		const last = patientPoints.at(-1)?.ageMonths ?? 0;
		return Math.max(24, Math.min(60, Math.ceil(last + 6)));
	}, [patientPoints]);

	const { data: whoData, isLoading } = useWhoGrowthData(
		patientGender,
		config.apiMetric
	);

	const sdCurve = React.useMemo<Array<SDCurvePoint>>(() => {
		if (!whoData || whoData.length === 0) return [];

		const num = (v: unknown): number => (typeof v === "number" ? v : 0);

		const inRange: Array<Record<string, unknown>> = [];
		for (const row of whoData) {
			if (!isRecord(row)) continue;
			const age = toNumberOrNull(row.ageMonths);
			if (age === null || age < 0 || age > maxAgeMonths) continue;
			inRange.push(row);
		}
		if (inRange.length === 0) return [];

		const targetPoints = Math.min(inRange.length, (maxAgeMonths + 1) * 2);
		const step = Math.max(1, Math.floor(inRange.length / targetPoints));

		const build = (r: Record<string, unknown>): SDCurvePoint => ({
			ageMonths: num(r.ageMonths),
			sd3neg: num(r.sd3neg),
			sd2neg: num(r.sd2neg),
			sd1neg: num(r.sd1neg),
			sd0: num(r.sd0) || num(r.M),
			sd1: num(r.sd1),
			sd2: num(r.sd2),
			sd3: num(r.sd3)
		});

		const result: Array<SDCurvePoint> = [];
		for (let i = 0; i < inRange.length; i += step) {
			const r = inRange[i];
			if (!r) continue;
			result.push(build(r));
		}
		const last = inRange.at(-1);
		if (last && result.at(-1)?.ageMonths !== num(last.ageMonths)) {
			result.push(build(last));
		}
		return result;
	}, [whoData, maxAgeMonths]);

	const chartRows = React.useMemo<Array<ChartRow>>(() => {
		const byAge = new Map<number, ChartRow>();
		for (const p of sdCurve) {
			byAge.set(p.ageMonths, {
				ageMonths: p.ageMonths,
				sd3neg: p.sd3neg,
				sd2neg: p.sd2neg,
				sd1neg: p.sd1neg,
				sd0: p.sd0,
				sd1: p.sd1,
				sd2: p.sd2,
				sd3: p.sd3
			});
		}
		for (const p of patientPoints) {
			const nearestAge = [...byAge.keys()].reduce(
				(best, age) =>
					Math.abs(age - p.ageMonths) < Math.abs(best - p.ageMonths)
						? age
						: best,
				p.ageMonths
			);
			const row = byAge.get(nearestAge) ?? { ageMonths: nearestAge };
			row.patientValue = p.value;
			byAge.set(nearestAge, row);
		}
		return [...byAge.values()].toSorted(
			(a, b) => (a.ageMonths ?? 0) - (b.ageMonths ?? 0)
		);
	}, [sdCurve, patientPoints]);

	const renderer = React.useMemo(
		() =>
			motion({
				initial: "always",
				transition: { type: "spring", stiffness: 170, damping: 18, mass: 1 }
			}),
		[]
	);

	// ─── Building the definition ──────────────────────────────────────────────
	//
	// Passed as a single spec object (not the builder-fn overload). The
	// `scales` and `theme` constants are declared above with explicit types so
	// this overload resolves without an `as` cast.

	const definition = React.useMemo(() => {
		if (chartRows.length === 0) return null;

		const marks = [
			areaY(chartRows, {
				id: "band-normal",
				x: "ageMonths",
				y: "sd1",
				curve: d3Curve(curveNatural),
				fill: "rgba(16,185,129,0.12)",
				stroke: "none"
			}),
			areaY(chartRows, {
				id: "band-above-1",
				x: "ageMonths",
				y: "sd2",
				curve: d3Curve(curveNatural),
				fill: "rgba(234,179,8,0.12)",
				stroke: "none"
			}),
			areaY(chartRows, {
				id: "band-above-2",
				x: "ageMonths",
				y: "sd3",
				curve: d3Curve(curveNatural),
				fill: "rgba(249,115,22,0.14)",
				stroke: "none"
			}),
			...SD_CURVES.map(curve =>
				lineY(chartRows, {
					id: `sd-${curve.key}`,
					x: "ageMonths",
					y: curve.key,
					stroke: curve.stroke,
					strokeWidth: curve.width,
					strokeDasharray: curve.dash,
					curve: d3Curve(curveNatural)
				})
			),
			lineY(chartRows, {
				id: "patient",
				x: "ageMonths",
				y: "patientValue",
				stroke: "#e11d48",
				strokeWidth: 2.5,
				curve: d3Curve(curveNatural)
			})
		];

		return defineChart({
			marks,
			scales: {
				x: X_SCALE,
				y: Y_SCALE
			},
			margin: PAD,
			theme: CHART_THEME,
			color: {
				domain: SD_COLOR_DOMAIN,
				range: SD_COLOR_RANGE
			},
			svgAnimation: false,
			focus: "group-x",
			tooltip: {
				use: tooltip,
				className: "sc-chart-tooltip",
				anchor: "group-center",
				placement: "auto",
				sort: "color-domain"
			}
		});
	}, [chartRows]);

	const chartContainerStyle = React.useMemo<React.CSSProperties>(
		() => ({ height: svgHeightProp }),
		[svgHeightProp]
	);

	// ─── Render ───────────────────────────────────────────────────────────────

	if (isLoading) {
		return (
			<div className='flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center'>
				<div>
					<div className='mx-auto size-8 animate-spin rounded-full border-teal-600 border-b-2' />
					<p className='mt-3 text-slate-500 text-sm'>
						Loading WHO growth standards…
					</p>
				</div>
			</div>
		);
	}

	if (patientPoints.length === 0 && sdCurve.length === 0) {
		return (
			<div className='flex h-48 items-center justify-center rounded-2xl border border-slate-200 border-dashed bg-slate-50 p-6 text-center'>
				<div>
					<p className='font-medium text-slate-500 text-sm'>
						No data available
					</p>
					<p className='mt-1 text-slate-400 text-xs'>
						Record a measurement to see this chart
					</p>
				</div>
			</div>
		);
	}

	const reversedPatientPoints = patientPoints.toReversed();

	return (
		<div className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
			{/* Header */}
			<div className='flex flex-col gap-2 border-slate-100 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between'>
				<div>
					<h3 className='font-bold text-slate-800 text-sm'>{config.label}</h3>
					<p className='mt-0.5 text-slate-500 text-xs'>
						{typeof patientName === "string" &&
						patientName.trim().length > 0 ? (
							<span>{patientName} · </span>
						) : null}
						{patientGender === "male" ? "Boys" : "Girls"} · {config.desc} ·{" "}
						{patientPoints.length} measurement
						{patientPoints.length === 1 ? "" : "s"}
					</p>
				</div>
				<SDLegend />
			</div>

			{/* Chart */}
			<div
				className='w-full p-4'
				style={chartContainerStyle}
			>
				{definition ? (
					<RendererChart
						ariaLabel={`${config.label} growth chart`}
						definition={definition}
						height={svgHeightProp}
						initialWidth={DEFAULT_CHART_WIDTH}
						renderer={renderer}
					/>
				) : null}
			</div>

			{/* Per-metric patient data table */}
			{reversedPatientPoints.length > 0 && (
				<div className='border-slate-100 border-t px-5 pt-3 pb-4'>
					<p className='mb-2 font-semibold text-slate-500 text-xs uppercase tracking-wide'>
						Measurements
					</p>
					<div className='overflow-x-auto'>
						<table className='w-full text-left text-[11px]'>
							<thead>
								<tr className='border-slate-100 border-b font-semibold text-[10px] text-slate-400 uppercase'>
									<th className='py-2 pr-4'>Date</th>
									<th className='py-2 pr-4'>Age</th>
									<th className='py-2 pr-4'>{config.unit}</th>
									<th className='py-2 pr-4'>Z-Score</th>
									<th className='py-2'>WHO Status</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-slate-50'>
								{reversedPatientPoints.map(pt => {
									const col = dotColorByZScore(pt.zScore);
									const st = statusLabel(pt.zScore);
									return (
										<tr
											className='hover:bg-slate-50/70'
											key={pt.id}
										>
											<td className='py-2 pr-4 font-mono text-slate-600'>
												{new Date(pt.recordedAt).toLocaleDateString()}
											</td>
											<td className='py-2 pr-4 text-slate-600'>
												{pt.ageMonths.toFixed(1)}m
											</td>
											<td className='py-2 pr-4 font-bold text-slate-800'>
												{pt.value} {config.unit}
											</td>
											<td
												className='py-2 pr-4 font-bold font-mono'
												style={{ color: col }}
											>
												{pt.zScore === null || pt.zScore === undefined
													? "—"
													: pt.zScore.toFixed(2)}
											</td>
											<td className='py-2'>
												<StatusBadge
													color={col}
													status={st}
												/>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}

// ─── SD legend ──────────────────────────────────────────────────────────────

/**
 * Static legend items, memoized once at module load.
 *
 * Every `background` value is a literal string, so the entire array and each
 * object inside it are created exactly once per module load. Passing
 * `item.style` to `<span>` therefore passes a stable reference.
 */
const SD_LEGEND_ITEMS: ReadonlyArray<{
	style: React.CSSProperties;
	label: string;
}> = [
	{ style: { background: "rgba(220,38,38,0.20)" }, label: "< −3 / > +3 SD" },
	{ style: { background: "rgba(249,115,22,0.20)" }, label: "±2–3 SD" },
	{ style: { background: "rgba(234,179,8,0.18)" }, label: "±1–2 SD" },
	{ style: { background: "rgba(16,185,129,0.15)" }, label: "±1 SD (normal)" }
];

const MEDIAN_LINE_STYLE: React.CSSProperties = { background: "#059669" };

function SDLegend() {
	return (
		<div className='flex flex-wrap items-center gap-x-3 gap-y-1 font-medium text-[10px] text-slate-600'>
			{SD_LEGEND_ITEMS.map(item => (
				<span
					className='flex items-center gap-1'
					key={item.label}
				>
					<LegendSwatch
						background={item.style.background as string}
						className='inline-block h-2.5 w-4 rounded-sm'
					/>
					{item.label}
				</span>
			))}
			<span className='flex items-center gap-1'>
				<span
					className='inline-block h-0.5 w-4'
					style={MEDIAN_LINE_STYLE}
				/>
				Median
			</span>
			<span className='flex items-center gap-1'>
				<span className='inline-block size-3 rounded-full bg-rose-500' />
				Patient
			</span>
		</div>
	);
}
