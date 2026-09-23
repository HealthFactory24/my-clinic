"use client";

import {
	createFileRoute,
	Link,
	Outlet,
	useParams
} from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft, Pencil, User } from "lucide-react";

import { formatPediatricAge } from "#/components/intro-page/format-pedia-age.ts";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { usePatientById } from "#/hooks/use-patients.ts";
import { calculatePediatricAge } from "#/utils/index.ts";

export const Route = createFileRoute("/_auth/app/patients/$patientId")({
	component: PatientLayout
});

const TABS = [
	{ to: "/app/patients/$patientId", label: "Overview", exact: true },
	{
		to: "/app/patients/$patientId/encounters",
		label: "Encounters",
		exact: true
	},
	{ to: "/app/patients/$patientId/vitals", label: "Vitals", exact: true },
	{ to: "/app/patients/$patientId/growth", label: "Growth", exact: true },
	{
		to: "/app/patients/$patientId/immunizations",
		label: "Immunizations",
		exact: true
	},
	{
		to: "/app/patients/$patientId/prescriptions",
		label: "Prescriptions",
		exact: true
	},
	{ to: "/app/patients/$patientId/labs", label: "Labs", exact: true }
] as const;

function PatientLayout() {
	const { patientId } = useParams({ from: "/_auth/app/patients/$patientId" });
	const { data: patient, isLoading } = usePatientById(patientId);

	if (isLoading) {
		return <PatientHeaderSkeleton />;
	}

	if (!patient) {
		return (
			<div className='flex flex-col items-center justify-center py-16 text-center'>
				<User className='mb-3 size-12 text-muted-foreground' />
				<p className='font-medium'>Patient not found</p>
				<Button
					asChild
					className='mt-4'
				>
					<Link to='/app/patients'>Back to Patients</Link>
				</Button>
			</div>
		);
	}

	const age = calculatePediatricAge(patient.dateOfBirth);
	const compactAge = formatPediatricAge(age.totalMonths, age.days);

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex flex-col gap-4'>
				<Button
					asChild
					className='w-fit'
					size='sm'
					variant='ghost'
				>
					<Link to='/app/patients'>
						<ArrowLeft className='mr-2 size-4' />
						Back to Patients
					</Link>
				</Button>

				<div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
					<div className='flex items-start gap-4'>
						<div
							className={cn(
								"flex size-14 shrink-0 items-center justify-center rounded-full font-bold text-lg",
								patient.gender === "male"
									? "bg-blue-100 text-blue-700"
									: "bg-pink-100 text-pink-700"
							)}
						>
							{patient.firstName[0]}
							{patient.lastName[0]}
						</div>
						<div>
							<h1 className='font-bold text-2xl tracking-tight'>
								{patient.firstName} {patient.lastName}
							</h1>
							<div className='mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-sm'>
								<span className='font-mono'>{patient.mrn}</span>
								<span>•</span>
								<span className='capitalize'>{patient.gender}</span>
								<span>•</span>
								<span>{compactAge}</span>
								<Badge
									className='text-[10px]'
									variant='outline'
								>
									{age.ageGroup}
								</Badge>
							</div>
						</div>
					</div>

					<Button
						asChild
						variant='outline'
					>
						<Link
							params={{ patientId }}
							to='/app/patients/$patientId/edit'
						>
							<Pencil className='mr-2 size-4' />
							Edit
						</Link>
					</Button>
				</div>

				{/* Tabs */}
				<nav className='flex gap-1 overflow-x-auto border-border border-b pb-px'>
					{TABS.map(tab => (
						<Link
							activeOptions={{ exact: tab.exact }}
							activeProps={{
								className: "border-b-2 border-primary text-primary"
							}}
							className='shrink-0 rounded-t-lg px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground'
							key={tab.to}
							params={{ patientId }}
							to={tab.to}
						>
							{tab.label}
						</Link>
					))}
				</nav>
			</div>

			<Outlet />
		</div>
	);
}

function PatientHeaderSkeleton() {
	return (
		<div className='space-y-6'>
			<Skeleton className='h-8 w-32' />
			<div className='flex items-start gap-4'>
				<Skeleton className='size-14 rounded-full' />
				<div className='space-y-2'>
					<Skeleton className='h-8 w-64' />
					<Skeleton className='h-4 w-48' />
				</div>
			</div>
			<Skeleton className='h-10 w-full' />
		</div>
	);
}
