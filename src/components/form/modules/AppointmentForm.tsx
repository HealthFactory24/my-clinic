// src/components/form/modules/AppointmentForm.tsx
"use client";

import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import {
	type AppointmentFormValues,
	FormActions,
	FormPageLayout,
	FormSection,
	useAppForm,
	useFormFields
} from "#/components/form/index.ts";
import { appointmentFormSchema } from "#/components/form/schema.ts";
import { useAppointmentById } from "#/hooks/use-appointments";
import {
	useCreateAppointment,
	useUpdateAppointment
} from "#/hooks/use-mutations";
import { useStaffList } from "#/hooks/use-staff";
import { createId } from "#/utils/id.ts";

// ─── Props ──────────────────────────────────────────────────────────────────

interface AppointmentFormProps {
	appointmentId?: string;
	/** Pre-fill the patient when creating from a patient detail page. */
	patientId?: string;
	redirectTo?: string;
}

// ─── Default values ─────────────────────────────────────────────────────────

const DEFAULT_VALUES: AppointmentFormValues = {
	id: createId("appointment"),
	patientId: "",
	staffId: "",
	appointmentDate: new Date(),
	startTime: new Date(),
	endTime: new Date(),
	status: "Scheduled",
	type: "Well-Child Check",
	notes: "",
	createdAt: new Date(),
	updatedAt: new Date()
};

const STATUS_OPTIONS = [
	{ value: "Scheduled", label: "Scheduled" },
	{ value: "Checked In", label: "Checked In" },
	{ value: "In Progress", label: "In Progress" },
	{ value: "Completed", label: "Completed" },
	{ value: "Cancelled", label: "Cancelled" },
	{ value: "No Show", label: "No Show" }
];

const VISIT_TYPE_OPTIONS = [
	{ value: "Well-Child Check", label: "Well-Child Check" },
	{ value: "Sick Visit", label: "Sick Visit" },
	{ value: "Follow-Up", label: "Follow-Up" },
	{ value: "Immunization Visit", label: "Immunization Visit" },
	{ value: "Consultation", label: "Consultation" },
	{ value: "Lactation Consultation", label: "Lactation Consultation" },
	{ value: "Emergency/Urgent", label: "Emergency/Urgent" },
	{ value: "Telehealth", label: "Telehealth" },
	{ value: "Other", label: "Other" }
];

// ─── Component ──────────────────────────────────────────────────────────────

export function AppointmentForm({
	appointmentId,
	patientId,
	redirectTo = "/app/appointments"
}: AppointmentFormProps) {
	const navigate = useNavigate();
	const isEdit = Boolean(appointmentId);

	const { data: existing } = useAppointmentById(appointmentId ?? "");
	const { data: staffPage } = useStaffList({ isActive: true, limit: 100 });
	const { mutateAsync: createAppointment, isPending: isCreating } =
		useCreateAppointment();
	const { mutateAsync: updateAppointment, isPending: isUpdating } =
		useUpdateAppointment();

	const isSubmitting = isCreating || isUpdating;

	const staffOptions =
		staffPage?.data.map(s => ({ value: s.id, label: s.name })) ?? [];

	const initial: AppointmentFormValues = existing
		? {
				id: existing.id,
				patientId: existing.patientId,
				staffId: existing.staffId,
				appointmentDate: new Date(existing.appointmentDate),
				startTime: new Date(existing.startTime),
				endTime: new Date(existing.endTime),
				status: existing.status,
				type: existing.type,
				notes: existing.notes ?? "",
				createdAt: new Date(),
				updatedAt: new Date()
			}
		: { ...DEFAULT_VALUES, patientId: patientId ?? "" };

	const form = useAppForm({
		defaultValues: initial,
		validators: { onSubmit: appointmentFormSchema },
		onSubmit: async ({ value }) => {
			// Coerce the string-shaped form values back into Dates for the server fn.
			const payload = {
				...value,
				appointmentDate: new Date(value.appointmentDate),
				startTime: new Date(
					`${value.appointmentDate.toISOString()}T${value.startTime.toISOString()}`
				),
				endTime: new Date(
					`${value.appointmentDate.toISOString()}T${value.endTime.toISOString()}`
				)
			};

			if (isEdit && appointmentId) {
				await updateAppointment({ ...payload, id: appointmentId });
			} else {
				await createAppointment(payload);
			}
			void navigate({ to: redirectTo });
		}
	});

	const fields = useFormFields<AppointmentFormValues>();

	const handleCancel = useCallback(() => {
		void navigate({ to: redirectTo });
	}, [navigate, redirectTo]);

	return (
		<FormPageLayout
			backTo={redirectTo}
			title={isEdit ? "Edit Appointment" : "New Appointment"}
		>
			<form.AppForm>
				<form.Form>
					<FormSection
						columns={2}
						title='Scheduling'
					>
						<fields.FormTextField
							label='Patient ID'
							name='patientId'
							placeholder='pat_...'
							required
						/>
						<fields.FormSelectField
							label='Provider'
							name='staffId'
							options={staffOptions}
							placeholder='Select a provider'
							required
						/>
						<fields.FormDateField
							label='Date'
							name='appointmentDate'
							required
						/>
						<fields.FormTimeField
							label='Start Time'
							name='startTime'
							required
						/>
						<fields.FormTimeField
							label='End Time'
							name='endTime'
							required
						/>
					</FormSection>

					<FormSection
						columns={3}
						title='Classification'
					>
						<fields.FormSelectField
							label='Visit Type'
							name='type'
							options={VISIT_TYPE_OPTIONS}
							required
						/>
						<fields.FormSelectField
							label='Status'
							name='status'
							options={STATUS_OPTIONS}
							required
						/>
					</FormSection>

					<FormSection
						columns={1}
						title='Notes'
					>
						<fields.FormTextareaField
							label='Reason for Visit'
							maxLength={1000}
							name='notes'
							placeholder='Chief complaint, reason for scheduling, or special instructions...'
						/>
					</FormSection>

					<FormActions
						isSubmitting={isSubmitting}
						onCancel={handleCancel}
					/>
				</form.Form>
			</form.AppForm>
		</FormPageLayout>
	);
}
