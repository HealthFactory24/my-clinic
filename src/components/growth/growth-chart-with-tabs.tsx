// src/components/growth/growth-chart-with-tabs.tsx
"use client";

import { useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs.tsx";
import type { GrowthMeasurement, MetricType } from "#/lib/db/schema";
import { cn } from "#/lib/utils.ts";

import { GrowthChart } from "./growth-chart.tsx";

const METRIC_TABS: ReadonlyArray<{ value: MetricType; label: string }> = [
	{ value: "weight", label: "Weight" },
	{ value: "height", label: "Height" },
	{ value: "head_circumference", label: "Head" },
	{ value: "bmi", label: "BMI" }
];

interface GrowthChartWithTabsProps {
	measurements: GrowthMeasurement[];
	gender: "male" | "female";
	defaultMetric?: MetricType;
	className?: string;
}

export function GrowthChartWithTabs({
	measurements,
	gender,
	defaultMetric = "weight",
	className
}: GrowthChartWithTabsProps) {
	const [metric, setMetric] = useState<MetricType>(defaultMetric);

	return (
		<div className={cn("space-y-4", className)}>
			<Tabs
				onValueChange={v => setMetric(v as MetricType)}
				value={metric}
			>
				<TabsList>
					{METRIC_TABS.map(tab => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
						>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			<GrowthChart
				gender={gender}
				measurements={measurements}
				metric={metric}
			/>
		</div>
	);
}
