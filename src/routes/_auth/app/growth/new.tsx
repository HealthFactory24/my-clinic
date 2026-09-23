import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Baby } from "lucide-react";
import { useCallback, useState } from "react";
import { z } from "zod/v4";

import {
	FormActions,
	FormPageLayout,
	FormSection,
	useAppForm,
	useFormFields
} from "#/components/form/index.ts";
import {
	type GrowthFormValues,
	growthFormSchema
} from "#/components/form/schema.ts";
import { useCreateGrowthMeasurement } from "#/hooks/use-mutations";
import { usePatientById } from "#/hooks/use-patients";
import { createId } from "#/utils/id";
import { calculateBMI } from "#/utils/pedia";

const growthNewSearchSchema = z.object({
	patientId: z.string().optional()
});

export const Route = createFileRoute("/_auth/app/growth/new")({
	validateSearch: growthNewSearchSchema, // ← no adapter
	component: NewGrowthPage
});

function PatientIdRequired() {
	return (
		<div className='flex flex-col items-center justify-center py-16 text-center'>
			<Baby className='mb-3 size-10 text-muted-foreground' />
			<p className='font-medium'>Patient ID required</p>
			<p className='mt-0.5 text-muted-foreground text-sm'>
				Navigate from a patient&apos;s page to record a growth measurement.
			</p>
		</div>
	);
}

function NewGrowthPage() {
	const { patientId } = Route.useSearch();

	// Guard BEFORE any hooks that depend on patientId. Narrows patientId to
	// `string` for the rest of the tree — no `?? ""` anywhere below.
	if (!patientId) {
		return <PatientIdRequired />;
	}

	return <NewGrowthForm patientId={patientId} />;
}

function NewGrowthForm({ patientId }: { patientId: string }) {
	const navigate = useNavigate();

	const { data: patient } = usePatientById(patientId);
	const { mutateAsync: createGrowth, isPending } = useCreateGrowthMeasurement();

	// Lazy initializer — runs exactly once per mount. This is what prevents
	// the "form resets on every parent re-render" bug.
	const [defaults] = useState<GrowthFormValues>(() => ({
		id: createId("growth"),
		patientId,
		encounterId: null,
		recordedAt: new Date(),
		ageMonths: 0,
		ageDays: null,
		weightKg: 0,
		heightCm: 0,
		headCircumferenceCm: null,
		bmi: 0,
		weightForAgeZScore: null,
		weightForAgePercentile: null,
		heightForAgeZScore: null,
		heightForAgePercentile: null,
		bmiForAgeZScore: null,
		bmiForAgePercentile: null,
		headCircumferenceZScore: null,
		headCircumferencePercentile: null,
		weightVelocity: null,
		heightVelocity: null,
		recordedBy: "",
		notes: null
	}));

	const form = useAppForm({
		defaultValues: defaults,
		validators: { onSubmit: growthFormSchema },
		onSubmit: async ({ value }) => {
			const payload = {
				...value,
				// Always trust the URL for patientId — never the form value.
				patientId,
				// Derive BMI if user left it at 0.
				bmi:
					value.bmi > 0
						? value.bmi
						: calculateBMI(value.weightKg, value.heightCm)
			};

			await createGrowth(payload);
			void navigate({
				to: "/app/patients/$patientId/growth",
				params: { patientId }
			});
		}
	});

	const fields = useFormFields<GrowthFormValues>();

	const handleCancel = useCallback(() => {
		void navigate({
			to: "/app/patients/$patientId/growth",
			params: { patientId }
		});
	}, [navigate, patientId]);

	return (
		<FormPageLayout
			backTo={`/app/patients/${patientId}/growth`}
			maxWidth='lg'
			title='Record Growth Measurement'
		>
			{patient ? (
				<p className='-mt-2 mb-4 text-slate-500 text-xs'>
					{patient.firstName} {patient.lastName} — {patient.mrn}
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
							placeholder='Staff name or ID'
							required
						/>
					</FormSection>

					<FormSection
						columns={3}
						title='Anthropometrics'
					>
						<fields.FormTextField
							label='Weight (kg)'
							name='weightKg'
							required
							step='0.01'
							type='number'
						/>
						<fields.FormTextField
							label='Height (cm)'
							name='heightCm'
							required
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
							label='Notes'
							maxLength={2000}
							name='notes'
						/>
					</FormSection>

					<FormActions
						isSubmitting={isPending}
						onCancel={handleCancel}
						submitLabel='Record Measurement'
					/>
				</form.Form>
			</form.AppForm>
		</FormPageLayout>
	);
}
