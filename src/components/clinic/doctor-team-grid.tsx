// components/clinic/doctor-team-grid.tsx

import { Award, Mail, Phone, Stethoscope } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Doctor {
	/** Unique identifier. */
	id: string;
	/** Doctor's full name. */
	name: string;
	/** Specialty or title. */
	specialty: string;
	/** Optional bio. */
	bio?: string;
	/** Email address. */
	email?: string;
	/** Phone number. */
	phone?: string;
	/** Years of experience. */
	experience?: number;
	/** Avatar image URL. */
	avatarUrl?: string;
	/** Whether the doctor is currently accepting patients. */
	acceptingPatients?: boolean;
}

interface DoctorTeamGridProps {
	/** List of doctors to display. */
	doctors?: Doctor[];
	/** Card heading. Set to `null` to omit. */
	title?: string | null;
	/** Optional description below the title. */
	description?: string;
	/** Number of columns in the grid. */
	columns?: 2 | 3 | 4;
	/** Visual variant. */
	variant?: "default" | "compact" | "detailed";
	className?: string;
	children?: React.ReactNode;
}

const DEFAULT_DOCTORS: Doctor[] = [
	{
		id: "1",
		name: "Dr. Sarah Johnson",
		specialty: "General Pediatrics",
		experience: 15,
		acceptingPatients: true,
		email: "s.johnson@clinic.example"
	},
	{
		id: "2",
		name: "Dr. Michael Chen",
		specialty: "Pediatric Cardiology",
		experience: 12,
		acceptingPatients: true,
		email: "m.chen@clinic.example"
	},
	{
		id: "3",
		name: "Dr. Emily Rodriguez",
		specialty: "Pediatric Neurology",
		experience: 8,
		acceptingPatients: false,
		email: "e.rodriguez@clinic.example"
	},
	{
		id: "4",
		name: "Dr. James Williams",
		specialty: "Neonatology",
		experience: 20,
		acceptingPatients: true,
		email: "j.williams@clinic.example"
	}
];

const COLUMN_CLASSES = {
	2: "grid-cols-1 sm:grid-cols-2",
	3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
	4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
} as const;

function getInitials(name: string): string {
	return name
		.split(" ")
		.map(part => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function DoctorCard({
	doctor,
	variant
}: {
	doctor: Doctor;
	variant: "default" | "compact" | "detailed";
}) {
	const isCompact = variant === "compact";
	const isDetailed = variant === "detailed";

	return (
		<Card className={cn("overflow-hidden", isCompact && "p-0")}>
			<CardContent className={cn("pt-6", isCompact && "p-4 pt-4")}>
				<div className='flex items-start gap-3'>
					<div
						className={cn(
							"flex size-12 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
							isCompact && "size-10 text-sm"
						)}
					>
						{doctor.avatarUrl ? (
							<img
								alt={doctor.name}
								className='size-full rounded-full object-cover'
								src={doctor.avatarUrl}
							/>
						) : (
							getInitials(doctor.name)
						)}
					</div>
					<div className='flex-1 space-y-1'>
						<div className='flex items-center gap-2'>
							<h3 className={cn("font-semibold", isCompact && "text-sm")}>
								{doctor.name}
							</h3>
							{doctor.acceptingPatients && (
								<Badge
									className='bg-emerald-100 text-emerald-800 text-xs'
									variant='outline'
								>
									Accepting
								</Badge>
							)}
						</div>
						<p className='text-muted-foreground text-sm'>{doctor.specialty}</p>
						{doctor.experience && !isCompact && (
							<div className='flex items-center gap-1 text-muted-foreground text-xs'>
								<Award className='h-3 w-3' />
								<span>{doctor.experience} years experience</span>
							</div>
						)}
						{isDetailed && doctor.bio && (
							<p className='text-muted-foreground text-sm'>{doctor.bio}</p>
						)}
					</div>
				</div>

				{!isCompact && (
					<div className='mt-4 flex flex-wrap gap-2'>
						{doctor.email && (
							<Button
								className='gap-1.5'
								size='sm'
								variant='outline'
							>
								<Mail className='h-3.5 w-3.5' />
								Email
							</Button>
						)}
						{doctor.phone && (
							<Button
								className='gap-1.5'
								size='sm'
								variant='outline'
							>
								<Phone className='h-3.5 w-3.5' />
								Call
							</Button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export function DoctorTeamGrid({
	doctors = DEFAULT_DOCTORS,
	title = "Our Medical Team",
	description,
	columns = 4,
	variant = "default",
	className,
	children
}: DoctorTeamGridProps) {
	const gridContent = (
		<div className={cn("grid gap-4", COLUMN_CLASSES[columns])}>
			{doctors.map(doctor => (
				<DoctorCard
					doctor={doctor}
					key={doctor.id}
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
			<div className='flex items-center gap-2'>
				<Stethoscope className='h-5 w-5 text-muted-foreground' />
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
