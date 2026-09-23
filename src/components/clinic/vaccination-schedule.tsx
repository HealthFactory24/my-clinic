// components/clinic/vaccination-schedule.tsx

import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VaccinationScheduleProps {
	patientAgeMonths?: number;
	showCompleted?: boolean;
	showUpcoming?: boolean;
	showOverdue?: boolean;
	vaccineFilter?: "all" | "routine" | "travel" | "optional";
	className?: string;
	children?: React.ReactNode;
}

const vaccineSchedule = [
	{ name: "Hepatitis B", ageMonths: 0, type: "routine" },
	{ name: "DTaP", ageMonths: 2, type: "routine" },
	{ name: "IPV", ageMonths: 2, type: "routine" },
	{ name: "Hib", ageMonths: 2, type: "routine" },
	{ name: "PCV13", ageMonths: 2, type: "routine" },
	{ name: "MMR", ageMonths: 12, type: "routine" },
	{ name: "Varicella", ageMonths: 12, type: "routine" },
	{ name: "Hepatitis A", ageMonths: 12, type: "routine" }
];

export function VaccinationSchedule({
	patientAgeMonths = 6,
	showCompleted = true,
	showUpcoming = true,
	showOverdue = true,
	vaccineFilter = "all",
	className,
	children
}: VaccinationScheduleProps) {
	const filtered = vaccineSchedule.filter(
		v => vaccineFilter === "all" || v.type === vaccineFilter
	);

	const getStatus = (ageMonths: number) => {
		if (ageMonths <= patientAgeMonths) return "completed";
		if (ageMonths <= patientAgeMonths + 2) return "due";
		return "upcoming";
	};

	const visible = filtered.filter(v => {
		const status = getStatus(v.ageMonths);
		if (status === "completed" && !showCompleted) return false;
		if (status === "upcoming" && !showUpcoming) return false;
		if (status === "due" && !showOverdue) return false;
		return true;
	});

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>Vaccination Schedule</CardTitle>
			</CardHeader>
			<CardContent className='space-y-3'>
				{visible.map(vaccine => {
					const status = getStatus(vaccine.ageMonths);
					return (
						<div
							className='flex items-center justify-between rounded-md border p-3'
							key={vaccine.name}
						>
							<div>
								<p className='font-medium'>{vaccine.name}</p>
								<p className='text-muted-foreground text-sm'>
									Recommended at {vaccine.ageMonths} months
								</p>
							</div>
							<Badge
								className='gap-1'
								variant={
									status === "completed"
										? "default"
										: status === "due"
											? "destructive"
											: "secondary"
								}
							>
								{status === "completed" && <CheckCircle2 className='h-3 w-3' />}
								{status === "due" && <AlertCircle className='h-3 w-3' />}
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
