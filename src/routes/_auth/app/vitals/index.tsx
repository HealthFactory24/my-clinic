import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartPulse } from "lucide-react";

import { Card, CardContent } from "#/components/ui/card.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { usePatientList } from "#/hooks/use-patients.ts";

export const Route = createFileRoute("/_auth/app/vitals/")({
	component: VitalsPage
});

function VitalsPage() {
	const { data: result, isLoading } = usePatientList({ limit: 50 });

	return (
		<div className='space-y-6'>
			<header>
				<h1 className='font-bold text-2xl tracking-tight'>Vital Signs</h1>
				<p className='mt-0.5 text-muted-foreground text-sm'>
					Select a patient to view or record vital signs.
				</p>
			</header>

			{isLoading ? (
				<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
					{[1, 2, 3, 4, 5, 6].map(i => (
						<Skeleton
							className='h-32'
							key={i}
						/>
					))}
				</div>
			) : (
				<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
					{result?.data?.map(patient => (
						<Link
							className='rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50'
							key={patient.id}
							params={{ patientId: patient.id }}
							to='/app/patients/$patientId/vitals'
						>
							<div className='flex items-start gap-3'>
								<div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10'>
									<HeartPulse className='size-5 text-primary' />
								</div>
								<div className='min-w-0'>
									<p className='truncate font-medium'>
										{patient.firstName} {patient.lastName}
									</p>
									<p className='font-mono text-muted-foreground text-xs'>
										{patient.mrn}
									</p>
								</div>
							</div>
						</Link>
					))}
				</div>
			)}

			{!isLoading && result?.data?.length === 0 && (
				<Card>
					<CardContent className='flex flex-col items-center justify-center py-12 text-center'>
						<HeartPulse className='mb-3 size-12 text-muted-foreground' />
						<p className='font-medium'>No patients found</p>
						<p className='mt-0.5 text-muted-foreground text-sm'>
							Register a patient to start recording vitals.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
