import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Area, AreaChart } from "recharts";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type StatTrend = "up" | "down" | "neutral";

export type StatSparkPoint = {
	/** X label (date, hour, etc.) — used for tooltip only */
	label: string;
	/** Y value */
	value: number;
};

export type StatisticsCardProps = {
	/** Leading icon (e.g., <BabyIcon className='size-4' />) */
	icon: ReactNode;
	/** Main numeric value shown large */
	value: string;
	/** Supporting label */
	title: string;
	/** Percentage string, e.g., "+18.2%" */
	changePercentage: string;
	/** Trend direction — auto-inferred if omitted */
	trend?: StatTrend | "up-inverted" | "down-inverted";
	/** Comparison suffix. Defaults to "vs. yesterday" */
	comparisonText?: string;
	/** Amber/destructive treatment for critical items */
	isAlert?: boolean;
	/** Loading skeleton */
	isLoading?: boolean;
	/** Click handler → renders as button */
	onClick?: () => void;
	/** Sparkline data. If provided, renders chart below title */
	sparkline?: StatSparkPoint[];
	/** Sparkline variant layout. Default: "inline" */
	variant?: "default" | "inline" | "stacked";
	/** Optional caption rendered below the title (e.g. "of 60 scheduled") */
	subtitle?: string;
	className?: string;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function inferTrend(changePercentage: string): StatTrend {
	const trimmed = changePercentage.trim();
	if (trimmed.startsWith("+")) return "up";
	if (trimmed.startsWith("-")) return "down";
	return "neutral";
}

function resolveTrendVisuals(
	trend: StatisticsCardProps["trend"],
	changePercentage: string
) {
	const normalized: StatTrend =
		trend === "up-inverted"
			? "down"
			: trend === "down-inverted"
				? "up"
				: (trend ?? inferTrend(changePercentage));

	const inverted = trend === "up-inverted" || trend === "down-inverted";

	const arrowDirection: StatTrend =
		trend === "up-inverted"
			? "up"
			: trend === "down-inverted"
				? "down"
				: normalized;

	const Icon =
		arrowDirection === "up"
			? TrendingUpIcon
			: arrowDirection === "down"
				? TrendingDownIcon
				: MinusIcon;

	// Medical semantics: emerald = healthy, destructive = warning
	const colorClass = inverted
		? normalized === "up"
			? "text-destructive"
			: normalized === "down"
				? "text-emerald-600 dark:text-emerald-500"
				: "text-muted-foreground"
		: normalized === "up"
			? "text-emerald-600 dark:text-emerald-500"
			: normalized === "down"
				? "text-destructive"
				: "text-muted-foreground";

	// CSS var for sparkline — emerald or destructive
	const sparkColor = inverted
		? normalized === "up"
			? "var(--destructive)"
			: normalized === "down"
				? "var(--color-emerald-500, oklch(0.696 0.17 162.48))"
				: "var(--muted-foreground)"
		: normalized === "up"
			? "var(--color-emerald-500, oklch(0.696 0.17 162.48))"
			: normalized === "down"
				? "var(--destructive)"
				: "var(--muted-foreground)";

	return { Icon, colorClass, sparkColor };
}

// ─────────────────────────────────────────────────────────────
// Sparkline sub-component
// ─────────────────────────────────────────────────────────────

function StatSparkline({
	data,
	color,
	className
}: {
	data: StatSparkPoint[];
	color: string;
	className?: string;
}) {
	const config = {
		value: { label: "Value", color }
	} satisfies ChartConfig;

	// Stable gradient id per card instance
	const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;

	return (
		<ChartContainer
			className={cn("aspect-auto w-full", className)}
			config={config}
		>
			<AreaChart
				data={data}
				margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
			>
				<defs>
					<linearGradient
						id={gradientId}
						x1='0'
						x2='0'
						y1='0'
						y2='1'
					>
						<stop
							offset='0%'
							stopColor={color}
							stopOpacity={0.35}
						/>
						<stop
							offset='100%'
							stopColor={color}
							stopOpacity={0}
						/>
					</linearGradient>
				</defs>
				<Area
					dataKey='value'
					dot={false}
					fill={`url(#${gradientId})`}
					isAnimationActive={false}
					stroke={color}
					strokeWidth={1.75}
					type='monotone'
				/>
			</AreaChart>
		</ChartContainer>
	);
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

const StatisticsCard = ({
	icon,
	value,
	title,
	changePercentage,
	trend,
	comparisonText = "vs. yesterday",
	isAlert = false,
	isLoading = false,
	onClick,
	sparkline,
	variant = "default",
	subtitle,
	className
}: StatisticsCardProps) => {
	const { Icon, colorClass, sparkColor } = resolveTrendVisuals(
		trend,
		changePercentage
	);
	const showSpark = sparkline && sparkline.length > 0;
	const CardRoot = onClick ? "button" : "div";

	// ── Loading ────────────────────────────────────────────
	if (isLoading) {
		return (
			<Card className={cn("relative overflow-hidden", className)}>
				<CardHeader className='flex items-center justify-between pb-2'>
					<div className='flex items-center gap-2'>
						<Skeleton className='size-9 shrink-0 rounded-md' />
						<Skeleton className='h-7 w-20' />
					</div>
				</CardHeader>
				<CardContent className='flex flex-col gap-2 pt-0'>
					<Skeleton className='h-5 w-36' />
					<Skeleton className='h-4 w-28' />
					{showSpark && <Skeleton className='mt-2 h-10 w-full' />}
				</CardContent>
			</Card>
		);
	}

	// ── Default variant (unchanged behavior) ───────────────
	if (variant === "default" || !showSpark) {
		return (
			<Card
				className={cn(
					"transition-all duration-200 hover:shadow-sm",
					isAlert &&
						"border-destructive/50 bg-destructive/5 dark:bg-destructive/10",
					onClick && "cursor-pointer hover:bg-accent/40",
					className
				)}
			>
				<CardRoot
					{...(onClick ? { type: "button" as const, onClick } : {})}
					className={cn(
						"w-full text-start",
						onClick ? "cursor-pointer" : undefined
					)}
				>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<div className='flex items-center gap-2.5'>
							<div
								className={cn(
									"flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
									isAlert && "bg-destructive/10 text-destructive"
								)}
							>
								{icon}
							</div>
							<span className='font-bold text-2xl tabular-nums tracking-tight'>
								{value}
							</span>
						</div>
						{isAlert && <AlertDot />}
					</CardHeader>

					<CardContent className='flex flex-col gap-1.5 pt-0'>
						<span className='font-medium text-muted-foreground text-sm'>
							{title}
						</span>
						{subtitle && (
							<span className='-mt-0.5 text-muted-foreground/70 text-xs'>
								{subtitle}
							</span>
						)}
						<TrendRow
							changePercentage={changePercentage}
							colorClass={colorClass}
							comparisonText={comparisonText}
							Icon={Icon}
						/>
					</CardContent>
				</CardRoot>
			</Card>
		);
	}

	// ── Sparkline variants ─────────────────────────────────

	// "inline" — sparkline sits to the right of value/title
	if (variant === "inline") {
		return (
			<Card
				className={cn(
					"transition-all duration-200 hover:shadow-sm",
					isAlert &&
						"border-destructive/50 bg-destructive/5 dark:bg-destructive/10",
					onClick && "cursor-pointer hover:bg-accent/40",
					className
				)}
			>
				<CardRoot
					{...(onClick ? { type: "button" as const, onClick } : {})}
					className={cn(
						"w-full text-start",
						onClick ? "cursor-pointer" : undefined
					)}
				>
					<CardHeader className='flex flex-row items-start justify-between gap-3 space-y-0 pb-2'>
						<div className='flex min-w-0 flex-col gap-2'>
							<div className='flex items-center gap-2.5'>
								<div
									className={cn(
										"flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
										isAlert && "bg-destructive/10 text-destructive"
									)}
								>
									{icon}
								</div>
								<span className='font-bold text-2xl tabular-nums tracking-tight'>
									{value}
								</span>
							</div>
							<span className='font-medium text-muted-foreground text-sm'>
								{title}
							</span>
						</div>

						<div className='flex flex-col items-end gap-1.5'>
							{isAlert && <AlertDot />}
							<StatSparkline
								className='h-12 w-24'
								color={sparkColor}
								data={sparkline}
							/>
						</div>
					</CardHeader>

					<CardContent className='pt-0'>
						<TrendRow
							changePercentage={changePercentage}
							colorClass={colorClass}
							comparisonText={comparisonText}
							Icon={Icon}
						/>
					</CardContent>
				</CardRoot>
			</Card>
		);
	}

	// "stacked" — sparkline spans full width below the trend row
	return (
		<Card
			className={cn(
				"transition-all duration-200 hover:shadow-sm",
				isAlert &&
					"border-destructive/50 bg-destructive/5 dark:bg-destructive/10",
				onClick && "cursor-pointer hover:bg-accent/40",
				className
			)}
		>
			<CardRoot
				{...(onClick ? { type: "button" as const, onClick } : {})}
				className={cn(
					"w-full text-start",
					onClick ? "cursor-pointer" : undefined
				)}
			>
				<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
					<div className='flex items-center gap-2.5'>
						<div
							className={cn(
								"flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
								isAlert && "bg-destructive/10 text-destructive"
							)}
						>
							{icon}
						</div>
						<span className='font-bold text-2xl tabular-nums tracking-tight'>
							{value}
						</span>
					</div>
					{isAlert && <AlertDot />}
				</CardHeader>

				<CardContent className='flex flex-col gap-1.5 pt-0'>
					<span className='font-medium text-muted-foreground text-sm'>
						{title}
					</span>
					{subtitle && (
						<span className='-mt-0.5 text-muted-foreground/70 text-xs'>
							{subtitle}
						</span>
					)}
					<TrendRow
						changePercentage={changePercentage}
						colorClass={colorClass}
						comparisonText={comparisonText}
						Icon={Icon}
					/>
					<StatSparkline
						className='mt-2 h-10 w-full'
						color={sparkColor}
						data={sparkline}
					/>
				</CardContent>
			</CardRoot>
		</Card>
	);
};

// ─────────────────────────────────────────────────────────────
// Small shared bits
// ─────────────────────────────────────────────────────────────

function TrendRow({
	Icon,
	colorClass,
	changePercentage,
	comparisonText
}: {
	Icon: typeof TrendingUpIcon;
	colorClass: string;
	changePercentage: string;
	comparisonText: string;
}) {
	return (
		<p className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs'>
			<span
				className={cn(
					"inline-flex items-center gap-0.5 font-semibold",
					colorClass
				)}
			>
				<Icon
					aria-hidden='true'
					className='size-3.5 shrink-0'
				/>
				<span className='tabular-nums'>{changePercentage}</span>
			</span>
			<span className='text-muted-foreground/80'>{comparisonText}</span>
		</p>
	);
}

function AlertDot() {
	return (
		<span className='relative flex h-2 w-2'>
			<span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75' />
			<span className='relative inline-flex h-2 w-2 rounded-full bg-destructive' />
		</span>
	);
}

export default StatisticsCard;
