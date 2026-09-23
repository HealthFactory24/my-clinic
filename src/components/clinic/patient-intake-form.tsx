// components/clinic/patient-intake-form.tsx
"use client";

import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";

import {
	FormActions,
	FormPageLayout,
	FormSection,
	useAppForm,
	useFormFields
} from "#/components/form/index.ts";
import { GENDER_OPTIONS } from "#/components/table/columns/shared/options.ts";
import { useCreatePatient } from "#/hooks/use-mutations";
import {
	type PatientIntakeFormValues,
	patientIntakeSchema
} from "#/lib/schemas";

import type { Gender } from "../../lib/db/schema";

interface PatientIntakeFormProps {
	/** Where to send the user after successful intake. Defaults to the patient list. */
	redirectTo?: string;
}

export function PatientIntakeForm({
	redirectTo = "/app/patients"
}: PatientIntakeFormProps) {
	const navigate = useNavigate();
	const { mutateAsync: createPatient, isPending } = useCreatePatient();

	const form = useAppForm({
		defaultValues: {
			firstName: "",
			lastName: "",
			dateOfBirth: "",
			gender: "male" as Gender,
			parentPhone: ""
		} satisfies PatientIntakeFormValues,

		validators: { onSubmit: patientIntakeSchema },

		onSubmit: async ({ value }: { value: PatientIntakeFormValues }) => {
			try {
				await createPatient({
					patient: {
						firstName: value.firstName.trim(),
						lastName: value.lastName.trim(),
						dateOfBirth: value.dateOfBirth,
						gender: value.gender,
						// Server generates MRN — see note below.
						mrn: "",
						contactNumber: value.parentPhone.trim(),
						bloodGroup: "Unknown",
						activeStatus: "Active",
						userId: ""
					},
					guardians: [],
					allergies: [],
					chronicConditions: []
				});

				toast.success(
					`Patient ${value.firstName} ${value.lastName} registered.`
				);

				void navigate({ to: redirectTo });
			} catch (error) {
				// The mutation's own onError already toasts; this catch is only
				// here to prevent unhandled-rejection noise in the console.
				if (import.meta.env.DEV) {
					console.error("[PatientIntakeForm] create failed", error);
				}
			}
		}
	});

	const fields = useFormFields<PatientIntakeFormValues>();

	const handleCancel = useCallback(() => {
		void navigate({ to: redirectTo });
	}, [navigate, redirectTo]);

	return (
		<FormPageLayout
			backTo={redirectTo}
			maxWidth='md'
			title='Patient Intake'
		>
			<form.AppForm>
				<form.Form>
					<FormSection
						columns={2}
						title='Patient'
					>
						<fields.FormTextField
							label='First Name'
							name='firstName'
							placeholder='John'
							required
						/>

						<fields.FormTextField
							label='Last Name'
							name='lastName'
							placeholder='Doe'
							required
						/>

						<fields.FormDateField
							label='Date of Birth'
							name='dateOfBirth'
							required
						/>

						<fields.FormSelectField
							label='Gender'
							name='gender'
							options={GENDER_OPTIONS}
							placeholder='Select gender'
							required
						/>
					</FormSection>

					<FormSection
						columns={1}
						title='Contact'
					>
						<fields.FormTextField
							description='Primary contact number for this patient.'
							label='Parent / Guardian Phone'
							name='parentPhone'
							placeholder='+1 555 123 4567'
							required
							type='tel'
						/>
					</FormSection>

					<FormActions
						isSubmitting={isPending}
						onCancel={handleCancel}
						submitLabel='Submit Intake'
					/>
				</form.Form>
			</form.AppForm>
		</FormPageLayout>
	);
}
