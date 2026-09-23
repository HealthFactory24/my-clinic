import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Pencil, Syringe, User } from "lucide-react";

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
import { useImmunizationById } from "#/hooks/use-immunizations.ts";

export const Route = createFileRoute(
	"/_auth/app/immunizations/$immunizationId/"
)({
	component: ImmunizationDetailPage
});

function ImmunizationDetailPage() {
	const { immunizationId } = Route.useParams();
	const { data: immunization, isLoading } = useImmunizationById(immunizationId);

	if (isLoading) return <Skeleton className='h-96' />;
	if (!immunization) return <p>Immunization not found</p>;

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between'>
				<Button
					asChild
					className='w-fit'
					size='sm'
					variant='ghost'
				>
					<Link to='/app/immunizations'>
						<ArrowLeft className='mr-2 size-4' />
						Back to Immunizations
					</Link>
				</Button>

				<Button
					asChild
					size='sm'
					variant='outline'
				>
					<Link
						params={{ immunizationId }}
						to='/app/immunizations/$immunizationId/edit'
					>
						<Pencil className='mr-2 size-4' />
						Edit
					</Link>
				</Button>
			</div>
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<CardTitle className='flex items-center gap-2'>
							<Syringe className='size-4 text-primary' />
							{immunization.vaccineName}
						</CardTitle>
						<Badge>{immunization.status}</Badge>
					</div>
				</CardHeader>
				<CardContent className='space-y-4'>
					<InfoRow
						icon={User}
						label='Patient ID'
						value={immunization.patientId}
					/>
					<InfoRow
						icon={Syringe}
						label='Vaccine Code'
						value={immunization.vaccineCode}
					/>
					<InfoRow
						icon={Syringe}
						label='Target Disease'
						value={immunization.targetDisease}
					/>
					<InfoRow
						icon={Syringe}
						label='Dose'
						value={`${immunization.doseNumber}`}
					/>
					<InfoRow
						icon={Calendar}
						label='Due Date'
						value={new Date(immunization.dueDate).toLocaleDateString()}
					/>
					{immunization.administeredDate && (
						<InfoRow
							icon={Calendar}
							label='Administered'
							value={new Date(
								immunization.administeredDate
							).toLocaleDateString()}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
