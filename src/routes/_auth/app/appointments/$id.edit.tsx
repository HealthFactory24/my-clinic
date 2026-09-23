// src/routes/_auth/app/appointments/$id.edit.tsx

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Calendar, X } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import type * as z from "zod";

import { _requireRole } from "#/lib/auth/functions.ts";
import { AppointmentEditSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/hooks";

import {
	appointmentFormSchema,
	FormActions,
	FormDateField,
	FormErrors,
	FormSection,
	FormSelectField,
	FormTextareaField,
	FormTimeField,
	useAppForm
} from "../../../../components/form";
import {
	useAppointmentById,
	usePatientById,
	useStaffList,
	useUpdateAppointment
} from "../../../../hooks";

export const Route = createFileRoute("/_auth/app/appointments/$id/edit")({
	component: EditAppointmentPage,
	pendingComponent: AppointmentEditSkeleton,
	beforeLoad: async () => {
		await _requireRole({ data: ["admin", "doctor"] });
	}
});

// ============================================================
// Types
// ============================================================

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

// ============================================================
// Helpers
// ============================================================

function toDateInputValue(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

// function toTimeInputValue(date: Date): string {
// 	const h = String(date.getHours()).padStart(2, "0");
// 	const min = String(date.getMinutes()).padStart(2, "0");
// 	return `${h}:${min}`;
// }

function combineDateAndTime(
	dateStr: string,
	timeValue: string | Date | undefined
): Date | null {
	if (!dateStr || !timeValue) return null;

	let hours: number;
	let minutes: number;

	if (timeValue instanceof Date) {
		hours = timeValue.getHours();
		minutes = timeValue.getMinutes();
	} else {
		const parts = timeValue.split(":");
		hours = Number(parts[0]);
		minutes = Number(parts[1] ?? 0);
	}

	if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

	const [y, mo, d] = dateStr.split("-").map(Number);
	return new Date(y, mo - 1, d, hours, minutes);
}

// ============================================================
// Page
// ============================================================

function EditAppointmentPage() {
	const navigate = useNavigate();
	const { id } = Route.useParams();
	const { user } = useAuth();

	const { data: appointment, isLoading: isLoadingAppointment } =
		useAppointmentById(id);

	const patientId = appointment?.patientId ?? "";

	const { data: currentPatientData, isLoading: isLoadingPatient } =
		usePatientById(patientId);

	const { data: staffData, isLoading: isLoadingStaff } = useStaffList({
		limit: 100,
		isActive: true
	});

	const updateAppointment = useUpdateAppointment();

	const isLoading = isLoadingAppointment || isLoadingPatient || isLoadingStaff;

	const staff = useMemo(() => staffData?.data ?? [], [staffData]);

	const patients = useMemo(
		() => (currentPatientData ? [currentPatientData] : []),
		[currentPatientData]
	);

	const currentPatient = currentPatientData;

	const formDefaults = useMemo<AppointmentFormValues | null>(() => {
		if (!appointment) return null;

		const startTime = new Date(appointment.startTime);
		const endTime = new Date(appointment.endTime);
		const dateStr = toDateInputValue(startTime);

		return {
			id: appointment.id,
			patientId: appointment.patientId,
			staffId: appointment.staffId,
			type: appointment.type,
			status: appointment.status,
			endTime: endTime,
			appointmentDate: new Date(dateStr),
			startTime: startTime,
			notes: appointment.notes ?? "",
			createdAt: appointment.createdAt,
			updatedAt: appointment.updatedAt
		} as AppointmentFormValues;
	}, [appointment]);

	const form = useAppForm({
		defaultValues: formDefaults ?? ({} as AppointmentFormValues),
		validators: {
			onSubmit: appointmentFormSchema
		},
		onSubmit: async ({ value }) => {
			if (!user) {
				toast.error("You must be logged in to update an appointment.");
				return;
			}

			const startDateTime = combineDateAndTime(
				value.appointmentDate.toDateString(),
				value.startTime
			);
			const endDateTime = combineDateAndTime(
				value.appointmentDate.toDateString(),
				value.endTime
			);

			if (!startDateTime || !endDateTime) {
				toast.error("Please provide valid start and end times.");
				return;
			}

			if (endDateTime <= startDateTime) {
				toast.error("End time must be after start time.");
				return;
			}

			try {
				await updateAppointment.mutateAsync({
					id: appointment?.id ?? id,
					patientId: value.patientId,
					staffId: value.staffId,
					startTime: startDateTime,
					endTime: endDateTime,
					status: value.status,
					type: value.type,
					notes: value.notes?.trim() || null
				});

				toast.success("Appointment updated successfully.");

				navigate({
					to: "/app/appointments/$id",
					params: { id: appointment?.id ?? id }
				});
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to update appointment."
				);
			}
		}
	});

	if (isLoading) {
		return <AppointmentEditSkeleton />;
	}

	if (!appointment) {
		return (
			<div className='container mx-auto max-w-2xl py-6'>
				<Card>
					<CardContent className='flex flex-col items-center justify-center py-12'>
						<Calendar className='size-12 text-slate-300' />
						<h3 className='mt-4 font-semibold text-lg text-slate-700'>
							Appointment not found
						</h3>
						<p className='text-slate-500 text-sm'>
							The appointment you are trying to edit does not exist.
						</p>
						<Link to='/app/appointments'>
							<Button className='mt-4'>Back to appointments</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		);
	}

	const patientLabel = currentPatient
		? `${currentPatient.firstName} ${currentPatient.lastName}`
		: "Unknown patient";

	return (
		<div className='container mx-auto max-w-2xl py-6'>
			<div className='mb-6 flex items-center justify-between'>
				<div>
					<h1 className='font-bold text-2xl text-slate-800'>
						Edit Appointment
					</h1>
					<p className='text-slate-500 text-sm'>
						Editing appointment for {patientLabel}
					</p>
				</div>
				<Link
					params={{ id: appointment.id }}
					to='/app/appointments/$id'
				>
					<Button
						size='sm'
						variant='ghost'
					>
						<X className='mr-2 size-4' />
						Cancel
					</Button>
				</Link>
			</div>

			<Card>
				<CardContent className='pt-6'>
					<form
						className='space-y-6'
						onSubmit={e => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<FormErrors />

						<FormSection
							columns={2}
							title='Patient & Provider'
						>
							<FormSelectField
								disabled
								label='Patient'
								name='patientId'
								options={patients.map(p => ({
									value: p.id,
									label: `${p.firstName} ${p.lastName} (${p.mrn})`
								}))}
								placeholder='Select patient'
								required
							/>

							<FormSelectField
								label='Provider'
								name='staffId'
								options={staff.map(s => ({
									value: s.id,
									label: `${s.name} (${s.title})`
								}))}
								placeholder='Select provider'
								required
							/>
						</FormSection>

						<FormSection
							columns={2}
							title='Appointment Details'
						>
							<FormSelectField
								label='Type'
								name='type'
								options={[
									{ value: "Well-Child Check", label: "Well-Child Check" },
									{ value: "Sick Visit", label: "Sick Visit" },
									{ value: "Follow-Up", label: "Follow-Up" },
									{ value: "Immunization Visit", label: "Immunization Visit" },
									{ value: "Consultation", label: "Consultation" },
									{ value: "Telehealth", label: "Telehealth" }
								]}
								required
							/>

							<FormSelectField
								label='Status'
								name='status'
								options={[
									{ value: "Scheduled", label: "Scheduled" },
									{ value: "Checked In", label: "Checked In" },
									{ value: "In Progress", label: "In Progress" },
									{ value: "Completed", label: "Completed" },
									{ value: "Cancelled", label: "Cancelled" },
									{ value: "No Show", label: "No Show" }
								]}
								required
							/>
						</FormSection>

						<FormSection
							columns={3}
							title='Date & Time'
						>
							<FormDateField
								label='Date'
								min={new Date().toISOString().split("T")[0]}
								name='startDate'
								required
							/>

							<FormTimeField
								label='Start Time'
								name='startTime'
								required
								step={900}
							/>

							<FormTimeField
								label='End Time'
								name='endTime'
								required
								step={900}
							/>
						</FormSection>

						<FormSection
							columns={1}
							title='Notes'
						>
							<FormTextareaField
								label='Notes'
								name='notes'
								placeholder='Add any relevant notes for this appointment'
								rows={3}
							/>
						</FormSection>

						<FormActions
							cancelLabel='Cancel'
							isSubmitting={updateAppointment.isPending}
							onCancel={() =>
								navigate({
									to: "/app/appointments/$id",
									params: { id: appointment.id }
								})
							}
							submitLabel='Save Changes'
						/>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
