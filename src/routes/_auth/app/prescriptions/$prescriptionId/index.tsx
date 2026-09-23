import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Pencil, Pill, User } from "lucide-react";

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
import { usePrescriptionById } from "#/hooks/use-prescriptions.ts";

export const Route = createFileRoute(
	"/_auth/app/prescriptions/$prescriptionId/"
)({
	component: PrescriptionDetailPage
});

function PrescriptionDetailPage() {
	const { prescriptionId } = Route.useParams();
	const { data: prescription, isLoading } = usePrescriptionById(prescriptionId);

	if (isLoading) return <Skeleton className='h-96' />;
	if (!prescription) return <p>Prescription not found</p>;

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between'>
				<Button
					asChild
					className='w-fit'
					size='sm'
					variant='ghost'
				>
					<Link to='/app/prescriptions'>
						<ArrowLeft className='mr-2 size-4' />
						Back to Prescriptions
					</Link>
				</Button>
				<Button
					asChild
					variant='outline'
				>
					<Link
						params={{ prescriptionId }}
						to='/app/prescriptions/$prescriptionId/edit'
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
							<Pill className='size-4 text-primary' />
							{prescription.rxNumber}
						</CardTitle>
						<Badge>{prescription.status}</Badge>
					</div>
				</CardHeader>
				<CardContent className='space-y-4'>
					<InfoRow
						icon={User}
						label='Patient ID'
						value={prescription.patientId}
					/>
					<InfoRow
						icon={User}
						label='Prescriber'
						value={prescription.prescriberName}
					/>
					<InfoRow
						icon={Calendar}
						label='Prescribed Date'
						value={new Date(prescription.prescribedDate).toLocaleDateString()}
					/>
					<InfoRow
						label='Diagnosis'
						value={prescription.diagnosis ?? "—"}
					/>
					{prescription.prescriptionItems &&
						prescription.prescriptionItems.length > 0 && (
							<div>
								<p className='text-muted-foreground text-xs'>Medications</p>
								<ul className='mt-1 space-y-1'>
									{prescription.prescriptionItems.map(item => (
										<li
											className='font-medium'
											key={item.id}
										>
											{item.medicationName} — {item.dose ?? item.frequency}
										</li>
									))}
								</ul>
							</div>
						)}
				</CardContent>
			</Card>
		</div>
	);
}
