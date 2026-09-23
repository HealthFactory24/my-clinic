// src/routes/_auth/app/appointments/$id.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

import { useAppointmentById } from "#/hooks/use-appointments.ts";
import { AppointmentDetailSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { AppointmentCard } from "../../../../components/appointment/AppointmentCard";

export const Route = createFileRoute("/_auth/app/appointments/$id")({
	component: AppointmentDetailPage,
	pendingComponent: AppointmentDetailSkeleton
});

function AppointmentDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();

	const {
		data: appointment,
		isLoading,
		isError,
		error,
		refetch
	} = useAppointmentById(id);

	const goToList = () => navigate({ to: "/app/appointments" });

	if (isLoading) {
		return <AppointmentDetailSkeleton />;
	}

	if (isError) {
		return (
			<div className='container mx-auto max-w-4xl py-6'>
				<Card>
					<CardContent className='flex flex-col items-center justify-center py-12 text-center'>
						<AlertCircle className='mb-3 size-10 text-destructive' />
						<h3 className='font-semibold text-foreground text-lg'>
							Could not load appointment
						</h3>
						<p className='mt-1 max-w-md text-muted-foreground text-sm'>
							{error instanceof Error
								? error.message
								: "An unexpected error occurred while fetching this appointment."}
						</p>
						<div className='mt-4 flex gap-2'>
							<Button
								onClick={() => refetch()}
								type='button'
								variant='outline'
							>
								Try again
							</Button>
							<Button
								onClick={goToList}
								type='button'
							>
								Back to appointments
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!appointment) {
		return (
			<div className='container mx-auto max-w-4xl py-6'>
				<Card>
					<CardContent className='flex flex-col items-center justify-center py-12 text-center'>
						<h3 className='font-semibold text-foreground text-lg'>
							Appointment not found
						</h3>
						<p className='mt-1 max-w-md text-muted-foreground text-sm'>
							This appointment may have been deleted or you may not have
							permission to view it.
						</p>
						<Button
							className='mt-4'
							onClick={goToList}
							type='button'
						>
							Back to appointments
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<AppointmentCard
			appointment={appointment}
			onClose={goToList}
			onEdit={() =>
				navigate({
					to: "/app/appointments/$id/edit",
					params: { id: appointment.id }
				})
			}
			onPatientSelect={patientId =>
				navigate({
					to: "/app/patients/$patientId",
					params: { patientId }
				})
			}
			onSuccess={refetch}
		/>
	);
}
