// src/components/form/modules/VitalsForm.tsx
"use client";

import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { useAppForm, useFormFields } from "#/components/form/core/registry.tsx";
import { FormActions, type VitalsFormValues } from "#/components/form/index.ts";
import { FormPageLayout } from "#/components/form/layout/FormPageLayout.tsx";
import { FormSection } from "#/components/form/layout/FormSection.tsx";
import { vitalsFormSchema } from "#/components/form/schema.ts";
import { useCreateVitals } from "#/hooks/use-mutations";
import { usePatientById } from "#/hooks/use-patients";
import { createId, getFeverClassification } from "#/utils/index";

// ─── Props ──────────────────────────────────────────────────────────────────

interface VitalsFormProps {
	patientId: string;
	encounterId?: string;
	redirectTo?: string;
	onSuccess?: () => void;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_VALUES = (
	patientId: string,
	encounterId?: string
): VitalsFormValues => ({
	id: createId("vital"),
	patientId,
	encounterId: encounterId ?? null,
	recordedAt: new Date(),
	temperatureC: 37.0,
	temperatureMethod: "Axillary",
	heartRateBpm: 100,
	respiratoryRateBpm: 24,
	systolicBp: null,
	diastolicBp: null,
	meanArterialPressure: null,
	oxygenSaturationPercent: 98,
	painScore: 0,
	painScaleType: "Wong-Baker",
	weightKg: null,
	heightCm: null,
	headCircumferenceCm: null,
	bmi: null,
	notes: "",
	recordedBy: ""
});

const PAIN_SCALE_OPTIONS = [
	{ value: "0", label: "0 — No hurt" },
	{ value: "2", label: "2 — Hurts little bit" },
	{ value: "4", label: "4 — Hurts little more" },
	{ value: "6", label: "6 — Hurts even more" },
	{ value: "8", label: "8 — Hurts whole lot" },
	{ value: "10", label: "10 — Hurts worst" }
];

// ─── Component ──────────────────────────────────────────────────────────────

export function VitalsForm({
	patientId,
	encounterId,
	redirectTo,
	onSuccess
}: VitalsFormProps) {
	const navigate = useNavigate();

	const { data: patient } = usePatientById(patientId);
	const { mutateAsync: createVitals, isPending } = useCreateVitals();

	const form = useAppForm({
		defaultValues: DEFAULT_VALUES(patientId, encounterId),
		validators: { onSubmit: vitalsFormSchema },
		onSubmit: async ({ value }) => {
			await createVitals({
				...value,
				recordedAt: new Date(value.recordedAt)
			});
			if (onSuccess) {
				onSuccess();
			} else if (redirectTo) {
				void navigate({ to: redirectTo });
			}
		}
	});

	const fields = useFormFields<VitalsFormValues>();

	// Live fever indicator driven by the temperature field.
	const temperatureC = form.state.values.temperatureC;
	const fever = getFeverClassification(temperatureC ?? 37);

	const handleCancel = useCallback(() => {
		if (redirectTo) {
			void navigate({ to: redirectTo });
		} else {
			void navigate({ to: "/app/patients/$patientId", params: { patientId } });
		}
	}, [navigate, redirectTo, patientId]);

	return (
		<FormPageLayout
			backTo={redirectTo}
			maxWidth='lg'
			title='Record Vital Signs'
		>
			{patient ? (
				<p className='-mt-2 mb-4 text-slate-500 text-xs'>
					{patient.firstName} {patient.lastName}
				</p>
			) : null}

			<form.AppForm>
				<form.Form>
					<FormSection
						columns={2}
						title='Measurement'
					>
						<fields.FormDateTimeField
							label='Recorded At'
							name='recordedAt'
							required
						/>
						<fields.FormTextField
							label='Recorded By'
							name='recordedBy'
							placeholder='Staff ID or name'
							required
						/>
						<fields.FormTextField
							label='Temperature (°C)'
							name='temperatureC'
							step='0.1'
							type='number'
						/>
						<fields.FormSelectField
							label='Temperature Method'
							name='temperatureMethod'
							options={[
								{ value: "Axillary", label: "Axillary" },
								{ value: "Oral", label: "Oral" },
								{ value: "Tympanic", label: "Tympanic" },
								{ value: "Temporal", label: "Temporal" },
								{ value: "Rectal", label: "Rectal" }
							]}
						/>
						<fields.FormTextField
							label='Heart Rate (bpm)'
							name='heartRateBpm'
							type='number'
						/>
						<fields.FormTextField
							label='Respiratory Rate (/min)'
							name='respiratoryRateBpm'
							type='number'
						/>
						<fields.FormTextField
							label='Oxygen Saturation (%)'
							name='oxygenSaturationPercent'
							type='number'
						/>
						<fields.FormSelectField
							label='Pain Score'
							name='painScore'
							options={PAIN_SCALE_OPTIONS}
						/>
					</FormSection>

					<FormSection
						columns={2}
						title='Blood Pressure (optional)'
					>
						<fields.FormTextField
							label='Systolic (mmHg)'
							name='systolicBp'
							type='number'
						/>
						<fields.FormTextField
							label='Diastolic (mmHg)'
							name='diastolicBp'
							type='number'
						/>
					</FormSection>

					<FormSection
						columns={3}
						title='Anthropometrics (optional)'
					>
						<fields.FormTextField
							label='Weight (kg)'
							name='weightKg'
							step='0.1'
							type='number'
						/>
						<fields.FormTextField
							label='Height (cm)'
							name='heightCm'
							step='0.1'
							type='number'
						/>
						<fields.FormTextField
							label='Head Circumference (cm)'
							name='headCircumferenceCm'
							step='0.1'
							type='number'
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
							placeholder='Any additional observations...'
						/>
					</FormSection>

					{/* Fever indicator */}
					{temperatureC != null ? (
						<p className={`font-medium text-sm ${fever.color.split(" ")[0]}`}>
							{fever.label}
						</p>
					) : null}

					<FormActions
						isSubmitting={isPending}
						onCancel={handleCancel}
						submitLabel='Record Vitals'
					/>
				</form.Form>
			</form.AppForm>
		</FormPageLayout>
	);
}
