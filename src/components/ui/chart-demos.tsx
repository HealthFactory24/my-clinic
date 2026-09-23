"use client";

import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	Pie,
	PieChart,
	XAxis
} from "recharts";

import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from "@/components/ui/chart";

// Sample data for demos
const areaData = [
	{ month: "Jan", desktop: 186, mobile: 80 },
	{ month: "Feb", desktop: 305, mobile: 200 },
	{ month: "Mar", desktop: 237, mobile: 120 },
	{ month: "Apr", desktop: 73, mobile: 190 },
	{ month: "May", desktop: 209, mobile: 130 },
	{ month: "Jun", desktop: 214, mobile: 140 }
];

const barData = [
	{ month: "Jan", desktop: 186, mobile: 80 },
	{ month: "Feb", desktop: 305, mobile: 200 },
	{ month: "Mar", desktop: 237, mobile: 120 },
	{ month: "Apr", desktop: 73, mobile: 190 },
	{ month: "May", desktop: 209, mobile: 130 },
	{ month: "Jun", desktop: 214, mobile: 140 }
];

const lineData = [
	{ month: "Jan", desktop: 186, mobile: 80 },
	{ month: "Feb", desktop: 305, mobile: 200 },
	{ month: "Mar", desktop: 237, mobile: 120 },
	{ month: "Apr", desktop: 73, mobile: 190 },
	{ month: "May", desktop: 209, mobile: 130 },
	{ month: "Jun", desktop: 214, mobile: 140 }
];

const pieData = [
	{ browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
	{ browser: "safari", visitors: 200, fill: "var(--color-safari)" },
	{ browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
	{ browser: "edge", visitors: 173, fill: "var(--color-edge)" },
	{ browser: "other", visitors: 90, fill: "var(--color-other)" }
];

const chartConfig = {
	desktop: {
		label: "Desktop",
		color: "hsl(var(--chart-1))"
	},
	mobile: {
		label: "Mobile",
		color: "hsl(var(--chart-2))"
	}
} satisfies ChartConfig;

const pieChartConfig = {
	visitors: { label: "Visitors" },
	chrome: { label: "Chrome", color: "hsl(var(--chart-1))" },
	safari: { label: "Safari", color: "hsl(var(--chart-2))" },
	firefox: { label: "Firefox", color: "hsl(var(--chart-3))" },
	edge: { label: "Edge", color: "hsl(var(--chart-4))" },
	other: { label: "Other", color: "hsl(var(--chart-5))" }
} satisfies ChartConfig;

export function AreaChartDemo({ className }: { className?: string }) {
	return (
		<ChartContainer
			className={className}
			config={chartConfig}
		>
			<AreaChart
				accessibilityLayer
				data={areaData}
				margin={{ left: 12, right: 12 }}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					axisLine={false}
					dataKey='month'
					tickFormatter={value => value.slice(0, 3)}
					tickLine={false}
					tickMargin={8}
				/>
				<ChartTooltip
					content={<ChartTooltipContent />}
					cursor={false}
				/>
				<Area
					dataKey='desktop'
					fill='var(--color-desktop)'
					fillOpacity={0.4}
					stackId='a'
					stroke='var(--color-desktop)'
					type='natural'
				/>
				<Area
					dataKey='mobile'
					fill='var(--color-mobile)'
					fillOpacity={0.4}
					stackId='a'
					stroke='var(--color-mobile)'
					type='natural'
				/>
			</AreaChart>
		</ChartContainer>
	);
}

export function BarChartDemo({ className }: { className?: string }) {
	return (
		<ChartContainer
			className={className}
			config={chartConfig}
		>
			<BarChart
				accessibilityLayer
				data={barData}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					axisLine={false}
					dataKey='month'
					tickFormatter={value => value.slice(0, 3)}
					tickLine={false}
					tickMargin={10}
				/>
				<ChartTooltip
					content={<ChartTooltipContent indicator='dashed' />}
					cursor={false}
				/>
				<Bar
					dataKey='desktop'
					fill='var(--color-desktop)'
					radius={4}
				/>
				<Bar
					dataKey='mobile'
					fill='var(--color-mobile)'
					radius={4}
				/>
			</BarChart>
		</ChartContainer>
	);
}

export function LineChartDemo({ className }: { className?: string }) {
	return (
		<ChartContainer
			className={className}
			config={chartConfig}
		>
			<LineChart
				accessibilityLayer
				data={lineData}
				margin={{ left: 12, right: 12 }}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					axisLine={false}
					dataKey='month'
					tickFormatter={value => value.slice(0, 3)}
					tickLine={false}
					tickMargin={8}
				/>
				<ChartTooltip
					content={<ChartTooltipContent />}
					cursor={false}
				/>
				<Line
					dataKey='desktop'
					dot={false}
					stroke='var(--color-desktop)'
					strokeWidth={2}
					type='monotone'
				/>
				<Line
					dataKey='mobile'
					dot={false}
					stroke='var(--color-mobile)'
					strokeWidth={2}
					type='monotone'
				/>
			</LineChart>
		</ChartContainer>
	);
}

export function PieChartDemo({ className }: { className?: string }) {
	return (
		<ChartContainer
			className={className}
			config={pieChartConfig}
		>
			<PieChart>
				<ChartTooltip
					content={<ChartTooltipContent hideLabel />}
					cursor={false}
				/>
				<Pie
					data={pieData}
					dataKey='visitors'
					innerRadius={60}
					nameKey='browser'
					strokeWidth={5}
				/>
			</PieChart>
		</ChartContainer>
	);
}
