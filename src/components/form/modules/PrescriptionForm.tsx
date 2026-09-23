// src/components/form/modules/PrescriptionForm.tsx
"use client";

import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";

import { useAppForm, useFormFields } from "#/components/form/core/registry";
import { FormActions } from "#/components/form/layout/FormActions";
import { FormPageLayout } from "#/components/form/layout/FormPageLayout";
import { FormSection } from "#/components/form/layout/FormSection";
import {
	type PrescriptionFormValues,
	type PrescriptionItemFormValues,
	prescriptionFormSchema
} from "#/components/form/schema";
import { useCreatePrescription } from "#/hooks/use-mutations";
import { usePatientById } from "#/hooks/use-patients";
import { useStaffList } from "#/hooks/use-staff";
import { createId } from "#/utils/id";
import { Button } from "@/components/ui/button";

// ─── Props ──────────────────────────────────────────────────────────────────

interface PrescriptionFormProps {
	patientId?: string;
	prescriptionId?: string;
	encounterId?: string;
	redirectTo?: string;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

function newItem(): PrescriptionItemFormValues {
	return {
		id: createId("rx"),
		medicationName: "",
		genericName: "",
		form: "Suspension",
		concentration: "",
		route: "Oral",
		frequency: "",
		durationDays: 5,
		calculatedLiquidDoseMl: 0,
		calculatedDoseMg: 0,
		dose: "",
		dosePerKg: 0,
		patientWeightKg: undefined,
		dispenseQuantity: "",
		refills: 0,
		substitutionAllowed: true,
		instructions: "",
		warnings: "",
		notes: ""
	};
}

const DEFAULT_VALUES = (
	patientId: string,
	encounterId?: string
): PrescriptionFormValues => ({
	rxNumber: "",
	patientId,
	encounterId: encounterId ?? "",
	prescribedDate: new Date().toISOString().slice(0, 10),
	prescriberId: "",
	prescriberName: "",
	prescriberLicense: "",
	patientWeightKg: 0,
	diagnosis: "",
	prescriptionItems: [newItem()],
	notes: "",
	status: "Active",
	discontinuedReason: ""
});

// ─── Options ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
	{ value: "Active", label: "Active" },
	{ value: "Completed", label: "Completed" },
	{ value: "Discontinued", label: "Discontinued" },
	{ value: "Cancelled", label: "Cancelled" }
];

const FORM_OPTIONS = [
	{ value: "Suspension", label: "Suspension" },
	{ value: "Tablet", label: "Tablet" },
	{ value: "Capsule", label: "Capsule" },
	{ value: "Syrup", label: "Syrup" },
	{ value: "Drops", label: "Drops" },
	{ value: "Inhaler", label: "Inhaler" },
	{ value: "Nebule", label: "Nebule" },
	{ value: "Topical", label: "Topical" },
	{ value: "Suppository", label: "Suppository" }
];

const ROUTE_OPTIONS = [
	{ value: "Oral", label: "Oral" },
	{ value: "Inhalation", label: "Inhalation" },
	{ value: "Topical", label: "Topical" },
	{ value: "Rectal", label: "Rectal" },
	{ value: "Ophthalmic", label: "Ophthalmic" },
	{ value: "Otic", label: "Otic" }
];

const FREQUENCY_OPTIONS = [
	{ value: "Once daily", label: "Once daily" },
	{ value: "Every 12 hours (BID)", label: "Every 12 hours (BID)" },
	{ value: "Every 8 hours (TID)", label: "Every 8 hours (TID)" },
	{ value: "Every 6 hours (QID)", label: "Every 6 hours (QID)" },
	{ value: "Every 4-6 hours PRN", label: "Every 4-6 hours PRN" },
	{ value: "As needed for fever/pain", label: "As needed for fever/pain" }
];

// ─── Component ──────────────────────────────────────────────────────────────

export function PrescriptionForm({
	patientId,
	encounterId,
	redirectTo = "/app/prescriptions"
}: PrescriptionFormProps) {
	const navigate = useNavigate();

	const { data: patient } = usePatientById(patientId ?? "");
	const { data: staffPage } = useStaffList({ isActive: true, limit: 100 });
	const { mutateAsync: createPrescription, isPending } =
		useCreatePrescription();

	const staffOptions =
		staffPage?.data.map(s => ({
			value: s.id,
			label: `${s.name} (${s.title})`
		})) ?? [];

	const form = useAppForm({
		defaultValues: DEFAULT_VALUES(patientId ?? "", encounterId),
		validators: { onSubmit: prescriptionFormSchema },
		onSubmit: async ({ value }) => {
			await createPrescription(value);
			void navigate({ to: redirectTo });
		}
	});

	const fields = useFormFields<PrescriptionFormValues>();

	const handleCancel = useCallback(() => {
		void navigate({ to: redirectTo });
	}, [navigate, redirectTo]);

	return (
		<FormPageLayout
			backTo={redirectTo}
			maxWidth='xl'
			title='New Prescription'
		>
			{patient ? (
				<p className='-mt-2 mb-4 text-slate-500 text-xs'>
					{patient.firstName} {patient.lastName} — {patient.mrn}
				</p>
			) : null}

			<form.AppForm>
				<form.Form>
					{/* Prescription metadata */}
					<FormSection
						columns={2}
						title='Prescription'
					>
						<fields.FormTextField
							label='Rx Number'
							name='rxNumber'
							placeholder='RX-2024-0001'
							required
						/>
						<fields.FormDateField
							label='Prescribed Date'
							name='prescribedDate'
							required
						/>
						<fields.FormSelectField
							label='Prescriber'
							name='prescriberId'
							options={staffOptions}
							placeholder='Select a prescriber'
							required
						/>
						<fields.FormTextField
							label='Prescriber Name'
							name='prescriberName'
							required
						/>
						<fields.FormTextField
							label='Prescriber License'
							name='prescriberLicense'
							placeholder='MD-...'
							required
						/>
						<fields.FormTextField
							label='Patient Weight (kg)'
							name='patientWeightKg'
							step='0.1'
							type='number'
						/>
						<fields.FormTextField
							label='Diagnosis'
							name='diagnosis'
							placeholder='e.g. Acute otitis media'
						/>
						<fields.FormSelectField
							label='Status'
							name='status'
							options={STATUS_OPTIONS}
							required
						/>
					</FormSection>

					{/* Medication items */}
					<form.AppField
						mode='array'
						name='prescriptionItems'
					>
						{field => (
							<div className='space-y-4'>
								<div className='flex items-center justify-between'>
									<h3 className='font-semibold text-foreground text-sm'>
										Medications
									</h3>
									<Button
										onClick={() => field.pushValue(newItem())}
										size='sm'
										type='button'
										variant='outline'
									>
										<Plus className='mr-1.5 size-3.5' />
										Add medication
									</Button>
								</div>

								{field.state.value.map((item, index) => (
									<div
										className='space-y-4 rounded-2xl border border-border bg-card p-4'
										key={item.id}
									>
										<div className='flex items-start justify-between'>
											<span className='font-bold text-muted-foreground text-xs uppercase'>
												Medication {index + 1}
											</span>
											{field.state.value.length > 1 ? (
												<Button
													aria-label={`Remove medication ${index + 1}`}
													onClick={() => field.removeValue(index)}
													size='sm'
													type='button'
													variant='ghost'
												>
													<Trash2 className='size-3.5 text-destructive' />
												</Button>
											) : null}
										</div>

										<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
											<fields.FormTextField
												label='Medication Name'
												name={`prescriptionItems[${index}].medicationName`}
												required
											/>
											<fields.FormTextField
												label='Generic Name'
												name={`prescriptionItems[${index}].genericName`}
											/>
											<fields.FormSelectField
												label='Form'
												name={`prescriptionItems[${index}].form`}
												options={FORM_OPTIONS}
												required
											/>
											<fields.FormTextField
												label='Concentration'
												name={`prescriptionItems[${index}].concentration`}
												placeholder='e.g. 250 mg / 5 mL'
											/>
											<fields.FormSelectField
												label='Route'
												name={`prescriptionItems[${index}].route`}
												options={ROUTE_OPTIONS}
												required
											/>
											<fields.FormSelectField
												label='Frequency'
												name={`prescriptionItems[${index}].frequency`}
												options={FREQUENCY_OPTIONS}
												required
											/>
											<fields.FormTextField
												label='Duration (days)'
												name={`prescriptionItems[${index}].durationDays`}
												required
												type='number'
											/>
											<fields.FormTextField
												label='Dose (mg)'
												name={`prescriptionItems[${index}].calculatedDoseMg`}
												required
												step='0.1'
												type='number'
											/>
											<fields.FormTextField
												label='Dose per kg (mg/kg)'
												name={`prescriptionItems[${index}].dosePerKg`}
												required
												step='0.1'
												type='number'
											/>
											<fields.FormTextField
												label='Liquid Dose (mL)'
												name={`prescriptionItems[${index}].calculatedLiquidDoseMl`}
												required
												step='0.1'
												type='number'
											/>
											<fields.FormTextField
												label='Dispense Quantity'
												name={`prescriptionItems[${index}].dispenseQuantity`}
												placeholder='e.g. 100 mL'
											/>
											<fields.FormTextField
												label='Refills'
												name={`prescriptionItems[${index}].refills`}
												type='number'
											/>
											<fields.FormTextField
												label='Patient Weight (kg)'
												name={`prescriptionItems[${index}].patientWeightKg`}
												step='0.1'
												type='number'
											/>
										</div>

										<fields.FormTextareaField
											label='Instructions'
											name={`prescriptionItems[${index}].instructions`}
											placeholder='e.g. Give 5 mL by mouth every 8 hours...'
										/>

										<fields.FormTextareaField
											label='Warnings'
											name={`prescriptionItems[${index}].warnings`}
										/>
									</div>
								))}

								{field.state.value.length === 0 ? (
									<p className='rounded-xl border border-border border-dashed p-8 text-center text-muted-foreground text-xs'>
										No medications yet. Click "Add medication" to start.
									</p>
								) : null}
							</div>
						)}
					</form.AppField>

					{/* Notes */}
					<FormSection
						columns={1}
						title='Notes'
					>
						<fields.FormTextareaField
							label='Prescription Notes'
							maxLength={2000}
							name='notes'
						/>
					</FormSection>

					<FormActions
						isSubmitting={isPending}
						onCancel={handleCancel}
						submitLabel='Create Prescription'
					/>
				</form.Form>
			</form.AppForm>
		</FormPageLayout>
	);
}
