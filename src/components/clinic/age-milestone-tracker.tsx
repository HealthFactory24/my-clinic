// components/clinic/age-milestone-tracker.tsx

import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Milestone {
	ageMonths: number;
	label: string;
	description?: string;
}

const MILESTONES: Milestone[] = [
	{ ageMonths: 0, label: "Birth", description: "Newborn exam, hearing screen" },
	{
		ageMonths: 1,
		label: "1 Month",
		description: "Weight check, feeding review"
	},
	{
		ageMonths: 2,
		label: "2 Months",
		description: "First vaccines, head control"
	},
	{
		ageMonths: 4,
		label: "4 Months",
		description: "Rolling over, social smile"
	},
	{
		ageMonths: 6,
		label: "6 Months",
		description: "Sitting with support, solids"
	},
	{ ageMonths: 9, label: "9 Months", description: "Crawling, pincer grasp" },
	{
		ageMonths: 12,
		label: "12 Months",
		description: "First words, MMR vaccine"
	},
	{ ageMonths: 15, label: "15 Months", description: "Walking, DTaP booster" },
	{ ageMonths: 18, label: "18 Months", description: "Vocabulary burst, Hep A" },
	{
		ageMonths: 24,
		label: "24 Months",
		description: "Two-word phrases, running"
	}
];

interface AgeMilestoneTrackerProps {
	/** Patient age in months. */
	ageMonths?: number;
	/** Milestones to render. Defaults to the standard well-child schedule. */
	milestones?: Milestone[];
	/** Show milestones not yet reached. */
	showUpcoming?: boolean;
	/** Show the completion progress bar. */
	showProgress?: boolean;
	className?: string;
	children?: React.ReactNode;
}

type MilestoneStatus = "completed" | "current" | "upcoming";

function statusFor(
	milestoneMonths: number,
	ageMonths: number
): MilestoneStatus {
	// "Current" = the patient is within one month of this milestone.
	if (ageMonths >= milestoneMonths && ageMonths < milestoneMonths + 1)
		return "current";
	if (ageMonths >= milestoneMonths) return "completed";
	return "upcoming";
}

export function AgeMilestoneTracker({
	ageMonths = 6,
	milestones = MILESTONES,
	showUpcoming = true,
	showProgress = true,
	className,
	children
}: AgeMilestoneTrackerProps) {
	const reached = milestones.filter(m => ageMonths >= m.ageMonths).length;
	const percent =
		milestones.length === 0
			? 0
			: Math.round((reached / milestones.length) * 100);

	const visible = showUpcoming
		? milestones
		: milestones.filter(m => ageMonths >= m.ageMonths);

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>Age Milestones</CardTitle>
				{showProgress && (
					<div className='space-y-1'>
						<Progress value={percent} />
						<p className='text-muted-foreground text-xs'>
							{reached} of {milestones.length} milestones reached
						</p>
					</div>
				)}
			</CardHeader>
			<CardContent className='space-y-3'>
				{visible.map(milestone => {
					const status = statusFor(milestone.ageMonths, ageMonths);
					return (
						<div
							className={cn(
								"flex items-start justify-between rounded-md border p-3",
								status === "current" && "border-primary/50 bg-primary/5"
							)}
							key={milestone.label}
						>
							<div className='space-y-0.5'>
								<p className='font-medium'>{milestone.label}</p>
								{milestone.description && (
									<p className='text-muted-foreground text-sm'>
										{milestone.description}
									</p>
								)}
							</div>
							<Badge
								className='gap-1'
								variant={
									status === "completed"
										? "default"
										: status === "current"
											? "secondary"
											: "outline"
								}
							>
								{status === "completed" && <CheckCircle2 className='h-3 w-3' />}
								{status === "current" && <AlertCircle className='h-3 w-3' />}
								{status === "upcoming" && <Clock className='h-3 w-3' />}
								{status}
							</Badge>
						</div>
					);
				})}
				{children}
			</CardContent>
		</Card>
	);
}
