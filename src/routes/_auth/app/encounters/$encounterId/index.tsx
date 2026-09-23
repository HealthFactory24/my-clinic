import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, FileText, Pencil, User } from "lucide-react";

import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "#/components/ui/card.tsx";
import { InfoRow } from "#/components/ui/info-row.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { useEncounterById } from "#/hooks/use-encounters.ts";

export const Route = createFileRoute("/_auth/app/encounters/$encounterId/")({
	component: EncounterDetailPage
});

function EncounterDetailPage() {
	const { encounterId } = Route.useParams();
	const { data: encounter, isLoading } = useEncounterById(encounterId);

	if (isLoading) return <Skeleton className='h-96' />;
	if (!encounter) return <p>Encounter not found</p>;

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between'>
				<Button
					asChild
					className='w-fit'
					size='sm'
					variant='ghost'
				>
					<Link to='/app/encounters' />
					<ArrowLeft className='mr-2 size-4' />
					Back to Encounters
				</Button>
				<Button
					asChild
					variant='outline'
				>
					<Link
						params={{ encounterId }}
						to='/app/encounters/$encounterId/edit'
					/>
					<Pencil className='mr-2 size-4' />
					Edit
				</Button>
			</div>

			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<CardTitle>Encounter Details</CardTitle>
						<Badge>{encounter.status}</Badge>
					</div>
				</CardHeader>
				<CardContent className='space-y-4'>
					<InfoRow
						icon={User}
						label='Patient ID'
						value={encounter.patientId}
					/>
					<InfoRow
						icon={User}
						label='Provider'
						value={encounter.providerName}
					/>
					<InfoRow
						icon={Calendar}
						label='Date'
						value={new Date(encounter.encounterDate).toLocaleDateString()}
					/>
					<InfoRow
						icon={FileText}
						label='Visit Type'
						value={encounter.visitType}
					/>
					<div className='flex items-start gap-3'>
						<FileText className='mt-0.5 size-4 text-muted-foreground' />
						<div>
							<p className='text-muted-foreground text-xs'>Chief Complaint</p>
							<p className='font-medium'>{encounter.chiefComplaint}</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
