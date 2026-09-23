// src/components/ui/chart.tsx
"use client";

import {
	areaY,
	type ChartPoint,
	type ChartPositionScaleOptions,
	d3Curve,
	defineChart
} from "@tanstack/charts";
import { motion } from "@tanstack/charts/motion";
import { RendererChart } from "@tanstack/charts/react/tooltip";
import { tooltip } from "@tanstack/charts/tooltip";
import { scaleLinear, scalePoint } from "d3-scale";
import { curveNatural } from "d3-shape";
import * as React from "react";

import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

const Reg = /-?(bars|lines|areas|slices|values|radar)$/u;

export type ChartConfig = Record<
	string,
	{
		label?: React.ReactNode;
		icon?: React.ComponentType;
		color?: string;
	}
>;

export interface ChartDataPoint {
	[key: string]: string | number;
}

export type ChartSeries = {
	dataKey: string;
	label: string;
	color: string;
};

// ============================================================
// Constants
// ============================================================

const DEFAULT_COLORS = [
	"#3b82f6", // blue
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#f59e0b", // amber
	"#10b981", // emerald
	"#ef4444" // red
];

const CHART_MARGIN = { top: 10, right: 10, bottom: 35, left: 40 };

const CHART_THEME = {
	foreground: "var(--muted-foreground)",
	grid: "var(--border)",
	background: "transparent"
};

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

// ============================================================
// Context
// ============================================================

type ChartContextProps = {
	config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
	const context = React.useContext(ChartContext);
	if (!context) {
		throw new Error("useChart must be used within a <ChartContainer />");
	}
	return context;
}

// ============================================================
// Chart Container
// ============================================================

interface ChartContainerProps extends React.ComponentProps<"div"> {
	children: React.ReactNode;
	config: ChartConfig;
	height?: number;
	width?: number;
}

export function ChartContainer({
	id,
	className,
	children,
	config,
	height = 300,
	width = 600,
	...props
}: ChartContainerProps) {
	const uniqueId = React.useId();
	const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

	const contextValue = React.useMemo<ChartContextProps>(
		() => ({ config }),
		[config]
	);

	const containerStyle = React.useMemo<React.CSSProperties>(
		() => ({ height, width }),
		[height, width]
	);

	return (
		<ChartContext.Provider value={contextValue}>
			<div
				className={cn(
					"flex w-full justify-center text-xs",
					"[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
					"[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
					"[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
					className
				)}
				data-chart={chartId}
				data-slot='chart'
				{...props}
			>
				<div
					className='w-full'
					style={containerStyle}
				>
					{children}
				</div>
			</div>
		</ChartContext.Provider>
	);
}

// ============================================================
// Chart Tooltip content adapter
// ============================================================

function shadcnTooltipContent<TDatum>(points: readonly ChartPoint<TDatum>[]) {
	return {
		title: String(points[0]?.xValue ?? ""),
		rows: points.map(point => ({
			label: String(point.group ?? point.markId.replace(Reg, "")),
			value: Number(point.yValue ?? point.xValue ?? 0).toLocaleString("en-US"),
			color: point.color
		}))
	};
}

// ============================================================
// Shared chart definition
// ============================================================
function useAreaChartDefinition(
	data: ChartDataPoint[],
	dataKeys: string[],
	colors: string[],
	xAxisKey: string,
	fillOpacity: number,
	strokeWidth: number
) {
	return React.useMemo(() => {
		const marks = dataKeys.map((key, index) =>
			areaY(data, {
				id: key,
				x: xAxisKey,
				y: (point: ChartDataPoint) => Number(point[key]),
				curve: d3Curve(curveNatural),
				fill: colors[index % colors.length],
				fillOpacity,
				stroke: colors[index % colors.length],
				strokeWidth
			})
		);

		// Use the builder-function overload (`defineChart(fn, options)`).
		// The builder receives a `ChartBuildContext` and returns a spec. The
		// second argument is `ChartDefinitionOptions` — svgAnimation, focus,
		// tooltip — separated from the spec.
		//
		// Overloads 1 and 4 (spec with `marks` at the top level) require every
		// scale to structurally match `ChartPositionScaleOptions`, which is
		// brittle when using `d3-scale` factories. Overload 5 (builder +
		// options) defers that validation to the runtime and accepts any
		// `CheckedChartSpec` the context can produce.
		return defineChart({
			marks,
			scales: {
				x: X_SCALE,
				y: Y_SCALE
			},
			color: {
				domain: dataKeys,
				range: colors
			},
			margin: CHART_MARGIN,
			theme: CHART_THEME,
			svgAnimation: false,
			focus: "group-x",
			tooltip: {
				use: tooltip,
				className: "sc-chart-tooltip",
				anchor: "group-center",
				placement: "auto",
				sort: "color-domain",
				content: (points: readonly ChartPoint[]) => shadcnTooltipContent(points)
			}
		});
	}, [data, dataKeys, colors, xAxisKey, fillOpacity, strokeWidth]);
}

function useChartRenderer() {
	return React.useMemo(
		() =>
			motion({
				initial: "always",
				transition: { type: "spring", stiffness: 170, damping: 18, mass: 1 }
			}),
		[]
	);
}

function useChartSize(height: number, width: number): React.CSSProperties {
	return React.useMemo(() => ({ width, height }), [width, height]);
}

// ============================================================
// Area / Line / Bar charts
// ============================================================

interface ChartProps {
	colors?: string[];
	data: ChartDataPoint[];
	dataKeys: string[];
	height?: number;
	width?: number;
	xAxisKey?: string;
}

export function AreaChart({
	data,
	dataKeys,
	colors = DEFAULT_COLORS,
	xAxisKey = "month",
	height = 300,
	width = 600
}: ChartProps) {
	const renderer = useChartRenderer();
	const definition = useAreaChartDefinition(
		data,
		dataKeys,
		colors,
		xAxisKey,
		0.4,
		2
	);
	const containerStyle = useChartSize(height, width);

	return (
		<div style={containerStyle}>
			<RendererChart
				ariaLabel='Area chart'
				definition={definition}
				height={height}
				initialWidth={width}
				renderer={renderer}
			/>
		</div>
	);
}

export function LineChart({
	data,
	dataKeys,
	colors = DEFAULT_COLORS,
	xAxisKey = "month",
	height = 300,
	width = 600
}: ChartProps) {
	const renderer = useChartRenderer();
	const definition = useAreaChartDefinition(
		data,
		dataKeys,
		colors,
		xAxisKey,
		0.1,
		2.5
	);
	const containerStyle = useChartSize(height, width);

	return (
		<div style={containerStyle}>
			<RendererChart
				ariaLabel='Line chart'
				definition={definition}
				height={height}
				initialWidth={width}
				renderer={renderer}
			/>
		</div>
	);
}

export function BarChart({
	data,
	dataKeys,
	colors = DEFAULT_COLORS,
	xAxisKey = "month",
	height = 300,
	width = 600
}: ChartProps) {
	const renderer = useChartRenderer();
	const definition = useAreaChartDefinition(
		data,
		dataKeys,
		colors,
		xAxisKey,
		0.8,
		0
	);
	const containerStyle = useChartSize(height, width);

	return (
		<div style={containerStyle}>
			<RendererChart
				ariaLabel='Bar chart'
				definition={definition}
				height={height}
				initialWidth={width}
				renderer={renderer}
			/>
		</div>
	);
}

// ============================================================
// Chart Tooltip Content
// ============================================================

export interface ChartTooltipContentProps {
	active?: boolean;
	label?: string;
	payload?: Array<{
		name: string;
		value: number;
		color: string;
	}>;
}

/**
 * A small colored dot used by both `ChartTooltipContent` and `ChartLegend`.
 *
 * Extracted so the inline `style={{ backgroundColor }}` object is created
 * once per color value rather than on every parent render. Satisfies
 * `react-perf/jsx-no-new-object-as-prop`.
 */
const ColorDot = React.memo(function ColorDot({
	className,
	color
}: {
	className?: string;
	color: string | undefined;
}) {
	const style = React.useMemo<React.CSSProperties>(
		() => ({ backgroundColor: color }),
		[color]
	);
	return (
		<div
			className={className}
			style={style}
		/>
	);
});

export function ChartTooltipContent({
	active,
	payload,
	label
}: ChartTooltipContentProps) {
	if (!(active && payload?.length)) {
		return null;
	}

	return (
		<div className='rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800'>
			{!!label && (
				<p className='mb-2 font-semibold text-slate-800 text-sm dark:text-slate-200'>
					{label}
				</p>
			)}
			<div className='space-y-1'>
				{payload.map(item => (
					<div
						className='flex items-center justify-between gap-4'
						key={item.name}
					>
						<div className='flex items-center gap-2'>
							<ColorDot
								className='size-3 rounded-full'
								color={item.color}
							/>
							<span className='text-slate-600 text-sm dark:text-slate-400'>
								{item.name}
							</span>
						</div>
						<span className='font-semibold text-slate-900 text-sm dark:text-slate-100'>
							{typeof item.value === "number"
								? item.value.toLocaleString()
								: String(item.value)}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================================
// Chart Legend
// ============================================================

export interface ChartLegendProps {
	config: ChartConfig;
}

export function ChartLegend({ config }: ChartLegendProps) {
	const entries = Object.entries(config);

	if (entries.length === 0) {
		return null;
	}

	return (
		<div className='flex flex-wrap items-center justify-center gap-4 pt-3'>
			{entries.map(([key, item]) => (
				<div
					className='flex items-center gap-1.5'
					key={key}
				>
					<ColorDot
						className='size-2 shrink-0 rounded-[2px]'
						color={item.color}
					/>
					<span className='text-muted-foreground text-sm'>{item.label}</span>
				</div>
			))}
		</div>
	);
}

// ============================================================
// Export
// ============================================================

export type { ChartContextProps };
export { ChartContext, useChart };
