"use client";

import { type ChartPoint, d3Curve, defineChart, lineY } from "@tanstack/charts";
import { motion } from "@tanstack/charts/motion";
import { RendererChart } from "@tanstack/charts/react/tooltip";
import { tooltip } from "@tanstack/charts/tooltip";
import { scaleLinear, scalePoint } from "d3-scale";
import { curveNatural } from "d3-shape";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";

// ─────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────

interface GrowthDatum {
	age: string;
	series: "weight" | "height";
	value: number;
}

const growthData: readonly GrowthDatum[] = [
	{ age: "0m", series: "weight", value: 3.3 },
	{ age: "6m", series: "weight", value: 7.9 },
	{ age: "12m", series: "weight", value: 9.6 },
	{ age: "24m", series: "weight", value: 12.5 },

	{ age: "0m", series: "height", value: 50 },
	{ age: "6m", series: "height", value: 67 },
	{ age: "12m", series: "height", value: 75 },
	{ age: "24m", series: "height", value: 85 }
];

const series = ["weight", "height"] as const;

const chartColors = [
	"var(--chart-1, var(--ts-chart-1))",
	"var(--chart-2, var(--ts-chart-2))"
] as const;

// ─────────────────────────────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────────────────────────────

function growthTheme() {
	return {
		foreground: "var(--muted-foreground, var(--muted))",
		grid: "var(--border)",
		background: "transparent"
	};
}

// ─────────────────────────────────────────────────────────────────────
// X Axis
// ─────────────────────────────────────────────────────────────────────

function growthXAxis() {
	return {
		scale: scalePoint,
		axis: {
			line: false,
			ticks: {
				size: 0,
				padding: 10,
				format: (value: string) => value
			}
		}
	};
}

// ─────────────────────────────────────────────────────────────────────
// Tooltip
// ─────────────────────────────────────────────────────────────────────

function growthTooltipContent(points: readonly ChartPoint<GrowthDatum>[]) {
	return {
		title: String(points[0]?.xValue ?? ""),
		rows: points.map(point => {
			const group = String(point.group ?? "");

			const label =
				group === "weight"
					? "Weight (kg)"
					: group === "height"
						? "Height (cm)"
						: group;

			return {
				label,
				value: Number(point.yValue ?? 0).toLocaleString("en-US", {
					maximumFractionDigits: 1
				}),
				color: point.color
			};
		})
	};
}

// ─────────────────────────────────────────────────────────────────────
// Chart Definition
// ─────────────────────────────────────────────────────────────────────

function createGrowthChart() {
	const curve = curveNatural;

	return defineChart(
		{
			marks: [
				lineY(growthData, {
					id: "growth-lines",
					x: "age",
					y: "value",
					z: "series",
					color: "series",
					key: datum => `${datum.age}:${datum.series}`,
					curve: d3Curve(curve),
					strokeWidth: 2.5
				})
			],

			scales: {
				x: growthXAxis(),

				y: {
					scale: scaleLinear,
					nice: true,
					grid: true,
					axis: {
						line: false,
						ticks: {
							size: 0
						}
					}
				}
			},

			color: {
				domain: series,
				range: chartColors
			},

			margin: {
				top: 8,
				right: 12,
				bottom: 32,
				left: 12
			},

			theme: growthTheme()
		},
		{
			svgAnimation: false,

			focus: "group-x",

			tooltip: {
				use: tooltip,
				className: "sc-chart-tooltip",
				anchor: "group-center",
				placement: "auto",
				sort: "color-domain",

				content: points =>
					growthTooltipContent(points as readonly ChartPoint<GrowthDatum>[])
			}
		}
	);
}

const growthChartDefinition = createGrowthChart();

// ─────────────────────────────────────────────────────────────────────
// Animation
// ─────────────────────────────────────────────────────────────────────

const renderer = motion({
	initial: "always",
	transition: {
		type: "spring",
		stiffness: 170,
		damping: 18,
		mass: 1
	}
});

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export function GrowthChartCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Growth Chart</CardTitle>

				<CardDescription>
					Weight and height progression from birth to 24 months
				</CardDescription>
			</CardHeader>

			<CardContent>
				<div className='h-[300px] w-full'>
					<RendererChart
						ariaLabel='Pediatric growth chart showing weight and height progression from birth to 24 months'
						definition={growthChartDefinition}
						height={300}
						initialWidth={600}
						renderer={renderer}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
