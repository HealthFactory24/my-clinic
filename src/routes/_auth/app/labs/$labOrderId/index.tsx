import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FlaskRound, Pencil } from "lucide-react";

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
import { useLabOrderById } from "#/hooks/use-labs.ts";

export const Route = createFileRoute("/_auth/app/labs/$labOrderId/")({
	component: LabOrderDetailPage
});

function LabOrderDetailPage() {
	const { labOrderId } = Route.useParams();
	const { data: labOrder, isLoading } = useLabOrderById(labOrderId);

	if (isLoading) return <Skeleton className='h-96' />;
	if (!labOrder) return <p>Lab order not found</p>;

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between'>
				<Button
					asChild
					className='w-fit'
					size='sm'
					variant='ghost'
				>
					<Link to='/app/labs' />
					<ArrowLeft className='mr-2 size-4' />
					Back to Lab Orders
				</Button>
				<Button
					asChild
					variant='outline'
				>
					<Link
						params={{ labOrderId }}
						to='/app/labs/$labOrderId/edit'
					/>
					<Pencil className='mr-2 size-4' />
					Edit
				</Button>
			</div>

			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<CardTitle className='flex items-center gap-2'>
							<FlaskRound className='size-4 text-primary' />
							{labOrder.orderNumber}
						</CardTitle>
						<Badge>{labOrder.status}</Badge>
					</div>
				</CardHeader>
				<CardContent className='space-y-4'>
					<InfoRow
						label='Patient ID'
						value={labOrder.patientId}
					/>
					<InfoRow
						label='Ordered By'
						value={labOrder.orderedBy}
					/>
					<InfoRow
						label='Order Date'
						value={new Date(labOrder.orderDate).toLocaleDateString()}
					/>
					<InfoRow
						label='Priority'
						value={labOrder.priority}
					/>
					<InfoRow
						label='Clinical Indication'
						value={labOrder.clinicalIndication}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
