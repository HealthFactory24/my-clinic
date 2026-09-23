// src/routes/_auth/app/patients/$patientId/growth/route.tsx
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { User } from "lucide-react";

import { Badge } from "#/components/ui/badge.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { usePatientById } from "#/hooks/use-patients.ts";

export const Route = createFileRoute("/_auth/app/patients/$patientId/growth")({
	component: PatientGrowthLayout
});

const TABS = [
	{
		to: "/app/patients/$patientId/growth",
		label: "Dashboard",
		exact: true
	},
	{
		to: "/app/patients/$patientId/growth/history",
		label: "History",
		exact: true
	}
] as const;

function PatientGrowthLayout() {
	const { patientId } = Route.useParams();
	const { data: patient, isLoading } = usePatientById(patientId);

	if (isLoading) {
		return <GrowthLayoutSkeleton />;
	}

	if (!patient) {
		return (
			<div className='flex flex-col items-center justify-center py-16 text-center'>
				<User className='mb-3 size-12 text-muted-foreground' />
				<p className='font-medium'>Patient not found</p>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			<div className='space-y-1.5'>
				<h1 className='font-semibold text-xl tracking-tight'>
					Growth Tracking: {patient.firstName} {patient.lastName}
				</h1>
				<div className='flex flex-wrap items-center gap-2 text-muted-foreground text-sm'>
					<span className='font-mono'>{patient.mrn}</span>
					<span>•</span>
					<span className='capitalize'>
						{patient.gender === "male" ? "Boy" : "Girl"}
					</span>
					<span>•</span>
					<span>
						DOB:{" "}
						{patient.dateOfBirth
							? new Date(patient.dateOfBirth).toLocaleDateString()
							: "—"}
					</span>
					{!patient.dateOfBirth && (
						<Badge variant='destructive'>Date of birth missing</Badge>
					)}
				</div>
			</div>

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

			<Outlet />
		</div>
	);
}

function GrowthLayoutSkeleton() {
	return (
		<div className='space-y-6'>
			<Skeleton className='h-7 w-64' />
			<Skeleton className='h-4 w-56' />
			<Skeleton className='h-10 w-full max-w-md' />
		</div>
	);
}
