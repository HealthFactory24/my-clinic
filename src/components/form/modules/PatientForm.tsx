// src/components/form/modules/PatientForm.tsx
"use client";

import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { useAppForm, useFormFields } from "#/components/form/core/registry";
import { FormActions } from "#/components/form/layout/FormActions.tsx";
import { FormPageLayout } from "#/components/form/layout/FormPageLayout";
import { FormSection } from "#/components/form/layout/FormSection.tsx";
import {
	type PatientFormValues,
	patientFormSchema
} from "#/components/form/schema";
import {
	BLOOD_GROUP_OPTIONS,
	GENDER_OPTIONS
} from "#/components/table/columns/index.ts";
import { useCreatePatient, useUpdatePatient } from "#/hooks/use-mutations";
import { usePatientById } from "#/hooks/use-patients";
import type { $getPatientById } from "#/server/patients";

interface PatientFormProps {
	patientId?: string;
	redirectTo?: string;
}

const DEFAULT_VALUES: PatientFormValues = {
	userId: "",
	firstName: "",
	lastName: "",
	dateOfBirth: "",
	gender: "male",
	bloodGroup: "Unknown",
	mrn: "",
	preferredLanguage: "English",
	email: "",
	gestationWeeksAtBirth: 36,
	activeStatus: "Active",
	deliveryMethod: "Assisted",
	notes: "",
	guardians: [],
	allergies: [],
	chronicConditions: []
};

type ServerPatient = Awaited<ReturnType<typeof $getPatientById>>;

/**
 * Map a server row into the form's value shape.
 *
 * Fields are enumerated explicitly, not spread, so server-only columns
 * (`clinicId`, `pediatricianId`, timestamps) can never leak into form
 * state and be posted back on submit.
 *
 * Nullable columns are normalized to `undefined` so the form value type
 * matches `PatientFormValues` (which uses `| undefined`, not `| null`).
 */
function normalizeExisting(p: ServerPatient): PatientFormValues {
	return {
		userId: p.userId,
		firstName: p.firstName,
		lastName: p.lastName,
		dateOfBirth: p.dateOfBirth,
		gender: p.gender,
		bloodGroup: p.bloodGroup,
		mrn: p.mrn,
		preferredLanguage: p.preferredLanguage ?? undefined,
		email: p.email ?? undefined,
		gestationWeeksAtBirth: p.gestationWeeksAtBirth ?? 36,
		birthWeightKg: p.birthWeightKg ?? undefined,
		birthLengthCm: p.birthLengthCm ?? undefined,
		birthHeadCircumferenceCm: p.birthHeadCircumferenceCm ?? undefined,
		contactNumber: p.contactNumber ?? undefined,
		activeStatus: p.activeStatus,
		deliveryMethod: p.deliveryMethod ?? undefined,
		notes: p.notes ?? undefined,
		allergies: p.allergies ?? []
	};
}

/** Split the flat form values into the server fn's nested input shape. */
function toServerInput(value: PatientFormValues) {
	const { guardians, allergies, chronicConditions, ...patient } = value;
	return {
		patient: {
			...patient,
			// allergies is a JSON blob on the patient row, not the relational table
			allergies: (allergies ?? []).map(({ allergen, severity, reaction }) => ({
				allergen,
				severity,
				reaction
			})),
			deliveryMethod: patient.deliveryMethod ?? undefined
		},
		guardians: guardians ?? [],
		// top-level allergies = relational patientAllergies table; form doesn't populate those
		allergies: [],
		chronicConditions: chronicConditions ?? []
	};
}

/** Shape `$updatePatient` expects — flat values plus a required id. */
function toUpdateInput(value: PatientFormValues, id: string) {
	return {
		...value,
		id,
		deliveryMethod: value.deliveryMethod ?? undefined,
		allergies: value.allergies ?? undefined,
		guardians: undefined,
		chronicConditions: undefined
	};
}

export function PatientForm({
	patientId,
	redirectTo = "/app/patients"
}: PatientFormProps) {
	const navigate = useNavigate();
	const isEdit = Boolean(patientId);

	const { data: existing } = usePatientById(patientId ?? "");
	const { mutateAsync: createPatient, isPending: isCreating } =
		useCreatePatient();
	const { mutateAsync: updatePatient, isPending: isUpdating } =
		useUpdatePatient();

	const isSubmitting = isCreating || isUpdating;

	const form = useAppForm({
		defaultValues: existing ? normalizeExisting(existing) : DEFAULT_VALUES,
		validators: {
			onSubmit: patientFormSchema
		},
		onSubmit: async ({ value }) => {
			if (isEdit && patientId) {
				await updatePatient(toUpdateInput(value, patientId));
			} else {
				await createPatient(toServerInput(value));
			}
			void navigate({ to: redirectTo });
		}
	});

	const fields = useFormFields<PatientFormValues>();

	const handleCancel = useCallback(() => {
		void navigate({ to: redirectTo });
	}, [navigate, redirectTo]);

	return (
		<FormPageLayout
			backTo={redirectTo}
			title={isEdit ? "Edit Patient" : "New Patient"}
		>
			<form.AppForm>
				<form.Form>
					<FormSection
						columns={2}
						title='Identity'
					>
						<fields.FormTextField
							label='First Name'
							name='firstName'
							required
						/>
						<fields.FormTextField
							label='Last Name'
							name='lastName'
							required
						/>
						<fields.FormTextField
							label='Medical Record Number'
							name='mrn'
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
							required
						/>

						<fields.FormSelectField
							label='Blood Group'
							name='bloodGroup'
							options={BLOOD_GROUP_OPTIONS}
						/>
					</FormSection>

					<FormSection
						columns={2}
						title='Contact'
					>
						<fields.FormTextField
							label='Email'
							name='email'
							type='email'
						/>
						<fields.FormTextField
							label='Preferred Language'
							name='preferredLanguage'
						/>
					</FormSection>

					<FormSection
						columns={1}
						title='Notes'
					>
						<fields.FormTextareaField
							label='Clinical Notes'
							maxLength={2000}
							name='notes'
							placeholder='Any additional context for this patient...'
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
