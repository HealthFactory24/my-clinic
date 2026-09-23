// components/clinic/opening-hours-card.tsx

import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OpeningHours {
	/** Day label, e.g. "Monday". */
	day: string;
	/** Opening time in 24h `HH:MM` format. `null` = closed. */
	open?: string | null;
	/** Closing time in 24h `HH:MM` format. `null` = closed. */
	close?: string | null;
}

const DEFAULT_HOURS: OpeningHours[] = [
	{ day: "Monday", open: "08:00", close: "18:00" },
	{ day: "Tuesday", open: "08:00", close: "18:00" },
	{ day: "Wednesday", open: "08:00", close: "18:00" },
	{ day: "Thursday", open: "08:00", close: "18:00" },
	{ day: "Friday", open: "08:00", close: "16:00" },
	{ day: "Saturday", open: "09:00", close: "13:00" },
	{ day: "Sunday", open: null, close: null }
];

function formatTime(time: string): string {
	const [hourStr, minuteStr] = time.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return time;
	const period = hour >= 12 ? "PM" : "AM";
	const displayHour = hour % 12 || 12;
	return `${displayHour}:${minuteStr ?? "00"} ${period}`;
}

interface OpeningHoursCardProps {
	/** Weekly schedule. Defaults to a standard clinic week. */
	hours?: OpeningHours[];
	/** Day to highlight as "today", e.g. "Monday". */
	today?: string;
	/** Emergency / after-hours phone line shown in the footer. */
	afterHoursPhone?: string;
	/** Card heading. Set to `null` to omit. */
	title?: string | null;
	className?: string;
	children?: React.ReactNode;
}

export function OpeningHoursCard({
	hours = DEFAULT_HOURS,
	today,
	afterHoursPhone,
	title = "Opening Hours",
	className,
	children
}: OpeningHoursCardProps) {
	const isClosed = (entry: OpeningHours) => !entry.open || !entry.close;

	return (
		<Card className={className}>
			{title !== null && (
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<Clock className='h-4 w-4 text-muted-foreground' />
						{title}
					</CardTitle>
				</CardHeader>
			)}
			<CardContent className='space-y-2'>
				{hours.map(entry => {
					const closed = isClosed(entry);
					const isToday = today?.toLowerCase() === entry.day.toLowerCase();
					return (
						<div
							className={cn(
								"flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
								isToday && "bg-primary/5 font-medium"
							)}
							key={entry.day}
						>
							<span className={cn("capitalize", isToday && "text-primary")}>
								{entry.day}
							</span>
							{closed ? (
								<Badge variant='secondary'>Closed</Badge>
							) : (
								<span className='text-muted-foreground tabular-nums'>
									{formatTime(entry.open ?? "")} –{" "}
									{formatTime(entry.close ?? "")}
								</span>
							)}
						</div>
					);
				})}

				{afterHoursPhone && (
					<p className='border-t pt-3 text-muted-foreground text-xs'>
						After-hours emergencies:{" "}
						<span className='font-medium text-foreground'>
							{afterHoursPhone}
						</span>
					</p>
				)}

				{children}
			</CardContent>
		</Card>
	);
}
