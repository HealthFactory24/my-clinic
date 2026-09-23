// src/components/analytics/TrendBadge.tsx
"use client";

import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "flat";

export type TrendBadgeProps = {
	direction: TrendDirection;
	value: number;
	className?: string;
	/** When true, a positive trend is considered "bad" (e.g. infection rate). */
	invert?: boolean;
};

const TREND_ICONS: Record<
	TrendDirection,
	React.ComponentType<{ className?: string }>
> = {
	up: ArrowUp,
	down: ArrowDown,
	flat: ArrowRight
};

export const TrendBadge = React.memo(function TrendBadge({
	direction,
	value,
	className,
	invert = false
}: TrendBadgeProps) {
	const Icon = TREND_ICONS[direction];

	const toneClass = React.useMemo(() => {
		if (direction === "flat") return "text-muted-foreground";
		const isPositive = invert ? direction === "down" : direction === "up";
		return isPositive
			? "text-emerald-600 dark:text-emerald-400"
			: "text-rose-600 dark:text-rose-400";
	}, [direction, invert]);

	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 font-medium text-[10px] tabular-nums",
				toneClass,
				className
			)}
		>
			<Icon className='size-3' />
			{Math.abs(value).toFixed(1)}%
		</span>
	);
});
