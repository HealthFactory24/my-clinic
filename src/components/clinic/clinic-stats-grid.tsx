// components/clinic/clinic-stats-grid.tsx

import {
	Activity,
	Calendar,
	ClipboardList,
	Heart,
	Stethoscope,
	Syringe,
	TrendingDown,
	TrendingUp,
	UserPlus,
	Users
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Trend = "up" | "down" | "neutral";

interface StatItem {
	/** Unique identifier for the stat. */
	id: string;
	/** Display label. */
	label: string;
	/** Main value to display. */
	value: string | number;
	/** Optional unit suffix, e.g. "%". */
	unit?: string;
	/** Optional description or subtitle. */
	description?: string;
	/** Change indicator value. */
	change?: string;
	/** Trend direction. */
	trend?: Trend;
	/** Icon name from the available set. */
	icon?: StatIcon;
}

type StatIcon =
	| "users"
	| "calendar"
	| "activity"
	| "heart"
	| "syringe"
	| "clipboard"
	| "stethoscope"
	| "userPlus";

interface ClinicStatsGridProps {
	/** Array of stat items to display. */
	stats?: StatItem[];
	/** Number of columns in the grid. */
	columns?: 2 | 3 | 4;
	/** Card heading. Set to `null` to omit. */
	title?: string | null;
	/** Optional description below the title. */
	description?: string;
	/** Visual variant. */
	variant?: "default" | "compact" | "detailed";
	className?: string;
	children?: React.ReactNode;
}

const ICON_MAP: Record<
	StatIcon,
	React.ComponentType<{ className?: string }>
> = {
	users: Users,
	calendar: Calendar,
	activity: Activity,
	heart: Heart,
	syringe: Syringe,
	clipboard: ClipboardList,
	stethoscope: Stethoscope,
	userPlus: UserPlus
};

const DEFAULT_STATS: StatItem[] = [
	{
		id: "patients",
		label: "Total Patients",
		value: "1,247",
		change: "+12%",
		trend: "up",
		icon: "users",
		description: "Active patient records"
	},
	{
		id: "appointments",
		label: "Today's Appointments",
		value: 28,
		change: "+3",
		trend: "up",
		icon: "calendar",
		description: "Scheduled for today"
	},
	{
		id: "vaccinations",
		label: "Vaccinations Due",
		value: 15,
		change: "-5",
		trend: "down",
		icon: "syringe",
		description: "Overdue immunizations"
	},
	{
		id: "visits",
		label: "Monthly Visits",
		value: "342",
		change: "+8%",
		trend: "up",
		icon: "stethoscope",
		description: "Patient encounters this month"
	}
];

const COLUMN_CLASSES = {
	2: "grid-cols-1 sm:grid-cols-2",
	3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
	4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
} as const;

function TrendIndicator({ change, trend }: { change?: string; trend?: Trend }) {
	if (!change) return null;

	const isUp = trend === "up";
	const isDown = trend === "down";

	return (
		<div
			className={cn(
				"flex items-center gap-1 text-xs",
				isUp && "text-emerald-600",
				isDown && "text-red-600",
				trend === "neutral" && "text-muted-foreground"
			)}
		>
			{isUp && <TrendingUp className='h-3 w-3' />}
			{isDown && <TrendingDown className='h-3 w-3' />}
			<span>{change}</span>
		</div>
	);
}

function StatCard({
	stat,
	variant
}: {
	stat: StatItem;
	variant: "default" | "compact" | "detailed";
}) {
	const IconComponent = stat.icon ? ICON_MAP[stat.icon] : null;
	const isCompact = variant === "compact";
	const isDetailed = variant === "detailed";

	return (
		<Card className={cn(isCompact && "p-0")}>
			<CardContent className={cn("pt-6", isCompact && "p-4 pt-4")}>
				<div className='flex items-start justify-between'>
					<div className='space-y-1'>
						<p
							className={cn(
								"text-muted-foreground text-sm",
								isCompact && "text-xs"
							)}
						>
							{stat.label}
						</p>
						<div className='flex items-baseline gap-1'>
							<span
								className={cn(
									"font-bold text-2xl tabular-nums",
									isCompact && "text-xl",
									isDetailed && "text-3xl"
								)}
							>
								{stat.value}
							</span>
							{stat.unit && (
								<span className='text-muted-foreground text-sm'>
									{stat.unit}
								</span>
							)}
						</div>
						{stat.description && !isCompact && (
							<p className='text-muted-foreground text-xs'>
								{stat.description}
							</p>
						)}
					</div>
					{IconComponent && (
						<div
							className={cn(
								"flex size-10 items-center justify-center rounded-lg bg-primary/10",
								isCompact && "size-8"
							)}
						>
							<IconComponent
								className={cn("h-5 w-5 text-primary", isCompact && "h-4 w-4")}
							/>
						</div>
					)}
				</div>
				{stat.change && (
					<div className='mt-3'>
						<TrendIndicator
							change={stat.change}
							trend={stat.trend}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export function ClinicStatsGrid({
	stats = DEFAULT_STATS,
	columns = 4,
	title = "Clinic Overview",
	description,
	variant = "default",
	className,
	children
}: ClinicStatsGridProps) {
	const gridContent = (
		<div className={cn("grid gap-4", COLUMN_CLASSES[columns])}>
			{stats.map(stat => (
				<StatCard
					key={stat.id}
					stat={stat}
					variant={variant}
				/>
			))}
			{children}
		</div>
	);

	if (title === null) {
		return <div className={className}>{gridContent}</div>;
	}

	return (
		<div className={cn("space-y-4", className)}>
			<div className='flex items-center justify-between'>
				<div>
					<h2 className='font-semibold text-lg'>{title}</h2>
					{description && (
						<p className='text-muted-foreground text-sm'>{description}</p>
					)}
				</div>
			</div>
			{gridContent}
		</div>
	);
}
