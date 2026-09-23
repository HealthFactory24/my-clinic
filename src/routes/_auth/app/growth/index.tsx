import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Baby, RefreshCw } from "lucide-react";

import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent } from "#/components/ui/card.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { usePatientList } from "#/hooks/use-patients.ts";

export const Route = createFileRoute("/_auth/app/growth/")({
	component: GrowthPage
});

function GrowthPage() {
	const {
		data: result,
		isLoading,
		isError,
		error,
		refetch
	} = usePatientList({ limit: 50 });

	const patients = result?.data ?? [];

	return (
		<div className='space-y-6'>
			<header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='font-bold text-2xl tracking-tight'>
						Growth &amp; Development
					</h1>
					<p className='mt-0.5 text-muted-foreground text-sm'>
						Track growth measurements and WHO percentile charts across patients.
					</p>
				</div>
			</header>

			{isLoading ? (
				<GrowthGridSkeleton />
			) : isError ? (
				<GrowthError
					error={error}
					onRetry={() => void refetch()}
				/>
			) : patients.length === 0 ? (
				<GrowthEmpty />
			) : (
				<GrowthGrid patients={patients} />
			)}
		</div>
	);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function GrowthGridSkeleton() {
	return (
		<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
			{Array.from({ length: 6 }, (_, i) => (
				<Skeleton
					className='h-32'
					key={i}
				/>
			))}
		</div>
	);
}

function GrowthError({
	error,
	onRetry
}: {
	error: Error | null;
	onRetry: () => void;
}) {
	return (
		<Card>
			<CardContent className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
				<div className='flex size-12 items-center justify-center rounded-full bg-destructive/10'>
					<Activity className='size-6 text-destructive' />
				</div>
				<div>
					<p className='font-medium'>Couldn't load patients</p>
					<p className='mt-0.5 text-muted-foreground text-sm'>
						{error?.message ?? "An unexpected error occurred."}
					</p>
				</div>
				<Button
					onClick={onRetry}
					variant='outline'
				>
					<RefreshCw className='mr-2 size-4' />
					Try again
				</Button>
			</CardContent>
		</Card>
	);
}

function GrowthEmpty() {
	return (
		<Card>
			<CardContent className='flex flex-col items-center justify-center py-12 text-center'>
				<Baby className='mb-3 size-12 text-muted-foreground' />
				<p className='font-medium'>No patients found</p>
				<p className='mt-0.5 text-muted-foreground text-sm'>
					Register a patient to start tracking growth.
				</p>
				<Button
					asChild
					className='mt-4'
					size='sm'
					variant='ghost'
				>
					<Link to='/app/patients/new' />
					Register Patient
				</Button>
			</CardContent>
		</Card>
	);
}

type GrowthPatient = {
	id: string;
	firstName: string;
	lastName: string;
	mrn: string;
};

function GrowthGrid({ patients }: { patients: GrowthPatient[] }) {
	return (
		<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
			{patients.map(patient => (
				<PatientCard
					key={patient.id}
					patient={patient}
				/>
			))}
		</div>
	);
}

function PatientCard({ patient }: { patient: GrowthPatient }) {
	return (
		<Link
			className='rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
			params={{ patientId: patient.id }}
			to='/app/patients/$patientId/growth'
		>
			<div className='flex items-start gap-3'>
				<div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10'>
					<Activity className='size-5 text-primary' />
				</div>
				<div className='min-w-0'>
					<p className='truncate font-medium'>
						{patient.firstName} {patient.lastName}
					</p>
					<p className='truncate font-mono text-muted-foreground text-xs'>
						{patient.mrn}
					</p>
				</div>
			</div>
		</Link>
	);
}
