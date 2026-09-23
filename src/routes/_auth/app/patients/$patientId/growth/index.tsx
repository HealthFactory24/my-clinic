// src/routes/_auth/app/patients/$patientId/growth/index.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { GrowthChartWithTabs } from "#/components/growth/growth-chart-with-tabs.tsx";
import { GrowthMeasurementsTable } from "#/components/growth/growth-measurements-table.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { usePatientById, usePatientGrowth } from "#/hooks/use-patients.ts";

export const Route = createFileRoute("/_auth/app/patients/$patientId/growth/")({
	component: PatientGrowthDashboardPage
});

function PatientGrowthDashboardPage() {
	const { patientId } = Route.useParams();
	const navigate = useNavigate();

	const { data: patient, isLoading: isPatientLoading } =
		usePatientById(patientId);
	const { data: growth, isLoading: isGrowthLoading } =
		usePatientGrowth(patientId);

	const isLoading = isPatientLoading || isGrowthLoading;

	if (isLoading) {
		return (
			<div className='space-y-4'>
				<Skeleton className='h-9 w-full max-w-md' />
				<Skeleton className='h-96' />
				<Skeleton className='h-64' />
			</div>
		);
	}

	if (!patient) {
		return (
			<div className='rounded-2xl border border-border border-dashed p-12 text-center'>
				<p className='font-medium'>Patient not found</p>
			</div>
		);
	}

	if (!patient.dateOfBirth) {
		return (
			<div className='rounded-2xl border border-border border-dashed p-12 text-center'>
				<p className='font-medium'>Date of birth is required</p>
				<p className='mt-1 text-muted-foreground text-sm'>
					WHO growth charts require a date of birth to compute age.
				</p>
				<Button
					asChild
					className='mt-4'
					variant='outline'
				>
					<a href={`/app/patients/${patientId}/edit`}>Add date of birth</a>
				</Button>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div>
					<h2 className='font-semibold text-lg'>Growth &amp; Development</h2>
					<p className='text-muted-foreground text-sm'>
						WHO child growth standards with percentile bands and z-scores.
					</p>
				</div>
				<Button
					onClick={() => {
						void navigate({
							to: "/app/growth/new",
							search: { patientId }
						});
					}}
					size='sm'
				>
					<Plus className='mr-2 size-4' />
					Record Measurement
				</Button>
			</div>

			<GrowthChartWithTabs
				defaultMetric='weight'
				gender={patient.gender}
				measurements={growth ?? []}
			/>

			<GrowthMeasurementsTable
				compact
				patientId={patientId}
			/>
		</div>
	);
}
