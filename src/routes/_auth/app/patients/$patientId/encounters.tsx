import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";

import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent } from "#/components/ui/card.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { usePatientEncounters } from "#/hooks/use-patients.ts";

export const Route = createFileRoute(
	"/_auth/app/patients/$patientId/encounters"
)({
	component: PatientEncountersPage
});

function PatientEncountersPage() {
	const { patientId } = useParams({ from: "/_auth/app/patients/$patientId" });
	const { data: encounters, isLoading } = usePatientEncounters(patientId);

	if (isLoading) {
		return (
			<div className='space-y-3'>
				{[1, 2, 3].map(i => (
					<Skeleton
						className='h-24'
						key={i}
					/>
				))}
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<h2 className='font-semibold text-lg'>Clinical Encounters</h2>
				<Button
					asChild
					size='sm'
				>
					<Link
						search={{ patientId }}
						to='/app/encounters/new'
					/>
					<Plus className='mr-2 size-4' />
					New Encounter
				</Button>
			</div>

			{!encounters?.length ? (
				<Card>
					<CardContent className='flex flex-col items-center justify-center py-12 text-center'>
						<FileText className='mb-3 size-12 text-muted-foreground' />
						<p className='font-medium'>No encounters recorded</p>
						<p className='mt-0.5 text-muted-foreground text-sm'>
							Start documenting clinical visits for this patient.
						</p>
						<Button
							asChild
							className='mt-4'
						>
							<Link
								search={{ patientId }}
								to='/app/encounters/new'
							/>
							Start Encounter
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className='space-y-3'>
					{encounters.map(encounter => (
						<Link
							className='block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50'
							key={encounter.id}
							params={{ encounterId: encounter.id }}
							to='/app/encounters/$encounterId'
						>
							<div className='flex items-start justify-between gap-4'>
								<div className='min-w-0 flex-1'>
									<div className='flex items-center gap-2'>
										<span className='font-medium'>
											{new Date(encounter.encounterDate).toLocaleDateString(
												"en-US",
												{
													year: "numeric",
													month: "short",
													day: "numeric"
												}
											)}
										</span>
										<Badge
											className='text-[10px]'
											variant='outline'
										>
											{encounter.visitType}
										</Badge>
										<StatusBadge status={encounter.status} />
									</div>
									<p className='mt-1 line-clamp-1 text-muted-foreground text-sm'>
										{encounter.chiefComplaint}
									</p>
									<p className='mt-0.5 text-muted-foreground text-xs'>
										Provider: {encounter.providerName}
									</p>
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const variants: Record<string, "default" | "secondary" | "outline"> = {
		Draft: "secondary",
		Completed: "default",
		Signed: "default",
		Amended: "outline"
	};

	return (
		<Badge
			className='text-[10px]'
			variant={variants[status] ?? "outline"}
		>
			{status}
		</Badge>
	);
}
