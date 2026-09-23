import { Link } from "@tanstack/react-router";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
	MiniBarChart,
	type MiniBarChartProps
} from "@/components/analytics/MiniBarChart";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Trend = "up" | "down" | "flat";

type StatisticsCardProps = {
	icon: ReactNode;
	value: string | number;
	title: string;
	/** e.g. "+18.2%" | "-8.7%" | "0%" — sign is auto-detected */
	changePercentage: string;
	/** What the change is compared to. Defaults to "vs last week". */
	comparisonLabel?: string;
	/** Optional: makes the whole card a link to a drill-down page */
	href?: string;
	/** Optional: caption under the value (e.g. "of 60 scheduled") */
	subtitle?: string;
	/** Force trend direction; otherwise inferred from `changePercentage` */
	trend?: Trend;
	/** Show loading skeleton */
	isLoading?: boolean;
	/** Optional mini bar chart rendered at the bottom of the card */
	sparkline?: MiniBarChartProps["data"];
	className?: string;
};

/** Infer trend from a "+12.3%" / "-4.5%" / "0%" string. */
function inferTrend(change: string, explicit?: Trend): Trend {
	if (explicit) return explicit;
	const trimmed = change.trim();
	if (trimmed.startsWith("-")) return "down";
	if (trimmed.startsWith("+")) return "up";
	return "flat";
}

const TREND_STYLES: Record<Trend, { wrapper: string; icon: ReactNode }> = {
	up: {
		wrapper: "text-emerald-600 dark:text-emerald-400",
		icon: <ArrowUpRightIcon className='size-3.5' />
	},
	down: {
		wrapper: "text-rose-600 dark:text-rose-400",
		icon: <ArrowDownRightIcon className='size-3.5' />
	},
	flat: {
		wrapper: "text-muted-foreground",
		icon: <MinusIcon className='size-3.5' />
	}
};

const StatisticsCard = ({
	icon,
	value,
	title,
	changePercentage,
	comparisonLabel = "vs last week",
	href,
	subtitle,
	trend,
	isLoading,
	sparkline,
	className
}: StatisticsCardProps) => {
	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader className='flex items-center gap-2'>
					<Skeleton className='size-8 rounded-sm' />
					<Skeleton className='h-8 w-16' />
				</CardHeader>
				<CardContent className='flex flex-col gap-2'>
					<Skeleton className='h-5 w-32' />
					<Skeleton className='h-4 w-40' />
				</CardContent>
			</Card>
		);
	}

	const direction = inferTrend(changePercentage, trend);
	const trendStyle = TREND_STYLES[direction];

	const body = (
		<Card
			className={cn(
				"transition-colors",
				href && "cursor-pointer hover:border-primary/40 hover:bg-accent/40",
				className
			)}
		>
			<CardHeader className='flex items-center gap-2'>
				<div className='flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary'>
					{icon}
				</div>
				<span className='font-semibold text-2xl tabular-nums'>{value}</span>
			</CardHeader>
			<CardContent className='flex flex-col gap-2'>
				<span className='font-semibold text-base'>{title}</span>
				{subtitle && (
					<span className='-mt-1 text-muted-foreground text-xs'>
						{subtitle}
					</span>
				)}
				<p className='flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm'>
					<span
						className={cn(
							"inline-flex items-center gap-0.5 font-medium",
							trendStyle.wrapper
						)}
					>
						{trendStyle.icon}
						{changePercentage}
					</span>
					<span className='text-muted-foreground'>{comparisonLabel}</span>
				</p>
				{sparkline && sparkline.length > 0 && (
					<div className='mt-1 flex justify-end overflow-hidden'>
						<MiniBarChart
							data={sparkline}
							height={32}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);

	if (href) {
		return (
			<Link
				className='block focus-visible:outline-none'
				to={href}
			>
				{body}
			</Link>
		);
	}

	return body;
};

export default StatisticsCard;
