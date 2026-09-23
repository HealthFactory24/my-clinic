// components/clinic/patient-card.tsx

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PatientCardProps {
	patientName?: string;
	age: number | null;
	dateOfBirth?: string;
	gender?: "male" | "female" | "other";
	lastVisit?: string;
	nextVisit?: string;
	primaryDoctor?: string;
	bloodType?: string;
	allergies?: string;
	notes?: string;
	variant?: "default" | "compact" | "detailed";
	className?: string;
	children?: React.ReactNode;
}

export function PatientCard({
	patientName = "New Patient",
	age = 5,
	dateOfBirth,
	gender = "male",
	lastVisit,
	nextVisit,
	primaryDoctor = "Dr. Smith",
	bloodType,
	allergies,
	notes,
	variant = "default",
	className,
	children
}: PatientCardProps) {
	return (
		<Card className={cn("w-full", variant === "compact" && "p-2", className)}>
			<CardHeader className={cn(variant === "compact" && "p-3")}>
				<div className='flex items-center justify-between'>
					<CardTitle className={cn(variant === "compact" && "text-base")}>
						{patientName}
					</CardTitle>
					<Badge variant='outline'>{age} yrs</Badge>
				</div>
			</CardHeader>
			<CardContent
				className={cn("space-y-2", variant === "compact" && "p-3 pt-0 text-sm")}
			>
				<div className='grid grid-cols-2 gap-2'>
					<div>
						<p className='text-muted-foreground text-xs'>Gender</p>
						<p className='capitalize'>{gender}</p>
					</div>
					<div>
						<p className='text-muted-foreground text-xs'>Primary Doctor</p>
						<p>{primaryDoctor}</p>
					</div>
					{dateOfBirth && (
						<div>
							<p className='text-muted-foreground text-xs'>Date of Birth</p>
							<p>{dateOfBirth}</p>
						</div>
					)}
					{bloodType && (
						<div>
							<p className='text-muted-foreground text-xs'>Blood Type</p>
							<p>{bloodType}</p>
						</div>
					)}
				</div>
				{lastVisit && (
					<div>
						<p className='text-muted-foreground text-xs'>Last Visit</p>
						<p>{lastVisit}</p>
					</div>
				)}
				{nextVisit && (
					<div>
						<p className='text-muted-foreground text-xs'>Next Visit</p>
						<p>{nextVisit}</p>
					</div>
				)}
				{allergies && variant === "detailed" && (
					<div className='rounded-md bg-destructive/10 p-2'>
						<p className='font-medium text-destructive text-xs'>Allergies</p>
						<p className='text-destructive text-sm'>{allergies}</p>
					</div>
				)}
				{notes && variant === "detailed" && (
					<div>
						<p className='text-muted-foreground text-xs'>Notes</p>
						<p className='text-sm'>{notes}</p>
					</div>
				)}
				{children}
			</CardContent>
		</Card>
	);
}
