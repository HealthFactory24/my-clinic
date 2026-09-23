// src/components/analytics/MiniBarChart.tsx
"use client";

import type { ChartPositionScaleOptions } from "@tanstack/charts";
import { barY, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand, scaleLinear } from "d3-scale";
import * as React from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MiniBarChartProps = {
	color?: string;
	data: ReadonlyArray<{ label: string; value: number }>;
	height?: number;
	width?: number;
	className?: string;
};

// ─── Static scale options (hoisted, module-level) ───────────────────────────

const X_SCALE: ChartPositionScaleOptions = {
	scale: scaleBand,
	axis: { line: false, ticks: false, tickLabels: false }
};

const Y_SCALE: ChartPositionScaleOptions = {
	scale: scaleLinear,
	axis: { line: false, ticks: false, tickLabels: false }
};

const CHART_THEME = {
	foreground: "var(--muted-foreground)",
	grid: "transparent",
	background: "transparent"
};

const PAD = { top: 4, right: 2, bottom: 2, left: 2 };

// ─── Component ──────────────────────────────────────────────────────────────

export const MiniBarChart = React.memo(function MiniBarChart({
	data,
	color = "var(--primary)",
	height = 52,
	width = 72,
	className
}: MiniBarChartProps) {
	const rows = React.useMemo(() => data.map(d => ({ ...d })), [data]);

	const definition = React.useMemo(() => {
		if (rows.length === 0) return null;

		return defineChart({
			marks: [
				barY(rows, {
					id: "mini-bar",
					x: "label",
					y: "value",
					fill: color,
					radius: 2
				})
			],
			scales: { x: X_SCALE, y: Y_SCALE },
			margin: PAD,
			theme: CHART_THEME
		});
	}, [rows, color]);

	const containerStyle = React.useMemo<React.CSSProperties>(
		() => ({ height, width }),
		[height, width]
	);

	if (!definition) return null;

	return (
		<div
			className={className}
			style={containerStyle}
		>
			<Chart
				ariaLabel='Mini bar chart'
				definition={definition}
				height={height}
				initialWidth={width}
			/>
		</div>
	);
});
