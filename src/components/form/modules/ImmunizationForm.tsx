// src/components/form/modules/ImmunizationForm.tsx
"use client";

import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { useAppForm, useFormFields } from "#/components/form/core/registry";
import { FormActions } from "#/components/form/layout/FormActions";
import { FormPageLayout } from "#/components/form/layout/FormPageLayout";
import { FormSection } from "#/components/form/layout/FormSection";
import {
	type ImmunizationFormValues,
	immunizationFormSchema
} from "#/components/form/schema";
import { useImmunizationById } from "#/hooks/use-immunizations";
import {
	useCreateImmunization,
	useUpdateImmunization
} from "#/hooks/use-mutations";
import { usePatientById } from "#/hooks/use-patients";
import { createId } from "#/utils/id";

// ─── Props ──────────────────────────────────────────────────────────────────
interface ImmunizationFormProps {
	/** When provided, the form runs in edit mode. */
	immunizationId?: string;
	/** Pre-fill the patient when creating from a patient detail page. */
	patientId?: string;
	/** Where the form navigates after a successful save, if neither
	 *  `onSuccess` nor `onClose` is provided. */
	redirectTo?: string;
	/**
	 * Called after a successful save, before any navigation.
	 * When provided, it takes precedence over `redirectTo` — the form
	 * will NOT navigate on its own, letting the caller decide.
	 */
	onSuccess?: (result: {
		id: string;
		mode: "create" | "edit";
	}) => void | Promise<void>;
	/** Called when the user clicks Cancel. Falls back to `redirectTo`. */
	onClose?: () => void | Promise<void>;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_VALUES = (patientId: string): ImmunizationFormValues => ({
	id: createId("immunization"),
	patientId,
	vaccineCode: "",
	vaccineName: "",
	targetDisease: "",
	doseNumber: 1,
	totalDoses: null,
	recommendedAgeLabel: "",
	recommendedAgeMonths: 0,
	dueDate: new Date(),
	administeredDate: null,
	status: "Due",
	manufacturer: "",
	brandName: "",
	batchNumber: "",
	expiryDate: null,
	administrationSite: "",
	administrationRoute: "",
	administeredBy: "",
	adverseReactions: "",
	parentConsent: false,
	consentFormId: null,
	notes: "",
	createdAt: new Date(),
	updatedAt: new Date()
});

// ─── Options ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
	{ value: "Administered", label: "Administered" },
	{ value: "Due", label: "Due" },
	{ value: "Overdue", label: "Overdue" },
	{ value: "Upcoming", label: "Upcoming" },
	{ value: "Deferred", label: "Deferred" },
	{ value: "Refused", label: "Refused" }
];

const ROUTE_OPTIONS = [
	{ value: "Intramuscular", label: "Intramuscular" },
	{ value: "Subcutaneous", label: "Subcutaneous" },
	{ value: "Intradermal", label: "Intradermal" },
	{ value: "Oral", label: "Oral" },
	{ value: "Intranasal", label: "Intranasal" }
];

const SITE_OPTIONS = [
	{ value: "Right Anterolateral Thigh", label: "Right Anterolateral Thigh" },
	{ value: "Left Anterolateral Thigh", label: "Left Anterolateral Thigh" },
	{ value: "Right Deltoid", label: "Right Deltoid" },
	{ value: "Left Deltoid", label: "Left Deltoid" },
	{ value: "Subcutaneous Right Arm", label: "Subcutaneous Right Arm" },
	{ value: "Subcutaneous Left Arm", label: "Subcutaneous Left Arm" },
	{ value: "Oral", label: "Oral" }
];
function toServerInput(value: ImmunizationFormValues) {
	const { id, createdAt, updatedAt, ...rest } = value;
	void id;
	void createdAt;
	void updatedAt;

	return {
		...rest,
		dueDate: rest.dueDate.toISOString(),
		administeredDate: rest.administeredDate
			? rest.administeredDate.toISOString()
			: undefined,
		expiryDate: rest.expiryDate ? rest.expiryDate.toISOString() : undefined
	};
}
// ─── Component ──────────────────────────────────────────────────────────────

export function ImmunizationForm({
	immunizationId,
	patientId,
	redirectTo = "/app/immunizations"
}: ImmunizationFormProps) {
	const navigate = useNavigate();
	const isEdit = Boolean(immunizationId);

	const { data: existing } = useImmunizationById(immunizationId ?? "");
	const { data: patient } = usePatientById(
		patientId ?? existing?.patientId ?? ""
	);
	const { mutateAsync: createImmunization, isPending: isCreating } =
		useCreateImmunization();
	const { mutateAsync: updateImmunization, isPending: isUpdating } =
		useUpdateImmunization();

	const isSubmitting = isCreating || isUpdating;

	const initial: ImmunizationFormValues = existing
		? {
				id: existing.id,
				patientId: existing.patientId,
				vaccineCode: existing.vaccineCode,
				vaccineName: existing.vaccineName,
				targetDisease: existing.targetDisease,
				doseNumber: existing.doseNumber,
				totalDoses: existing.totalDoses ?? null,
				recommendedAgeLabel: existing.recommendedAgeLabel,
				recommendedAgeMonths: existing.recommendedAgeMonths,
				dueDate: new Date(existing.dueDate),
				administeredDate: existing.administeredDate
					? new Date(existing.administeredDate)
					: null,
				status: existing.status,
				manufacturer: existing.manufacturer ?? "",
				brandName: existing.brandName ?? "",
				batchNumber: existing.batchNumber ?? "",
				expiryDate: existing.expiryDate ? new Date(existing.expiryDate) : null,
				administrationSite: existing.administrationSite ?? "",
				administrationRoute: existing.administrationRoute ?? "",
				administeredBy: existing.administeredBy ?? "",
				adverseReactions: existing.adverseReactions ?? "",
				parentConsent: existing.parentConsent ?? false,
				consentFormId: existing.consentFormId ?? null,
				notes: existing.notes ?? "",
				createdAt: new Date(existing.createdAt),
				updatedAt: new Date(existing.updatedAt)
			}
		: DEFAULT_VALUES(patientId ?? "");

	const form = useAppForm({
		defaultValues: initial,
		validators: { onSubmit: immunizationFormSchema },
		onSubmit: async ({ value }) => {
			const input = toServerInput(value);
			if (isEdit && immunizationId) {
				await updateImmunization({ ...input, id: immunizationId });
			} else {
				await createImmunization(input);
			}
			void navigate({ to: redirectTo });
		}
	});

	const fields = useFormFields<ImmunizationFormValues>();

	const handleCancel = useCallback(() => {
		void navigate({ to: redirectTo });
	}, [navigate, redirectTo]);

	return (
		<FormPageLayout
			backTo={redirectTo}
			maxWidth='lg'
			title={isEdit ? "Edit Immunization" : "Record Immunization"}
		>
			{patient ? (
				<p className='-mt-2 mb-4 text-slate-500 text-xs'>
					{patient.firstName} {patient.lastName}
				</p>
			) : null}

			<form.AppForm>
				<form.Form>
					{/* Vaccine identity */}
					<FormSection
						columns={2}
						title='Vaccine'
					>
						<fields.FormTextField
							label='Vaccine Name'
							name='vaccineName'
							placeholder='e.g. Hepatitis B (Dose 1)'
							required
						/>
						<fields.FormTextField
							label='Vaccine Code'
							name='vaccineCode'
							placeholder='e.g. HepB-1'
							required
						/>
						<fields.FormTextField
							label='Target Disease'
							name='targetDisease'
							placeholder='e.g. Hepatitis B Virus'
							required
						/>
						<fields.FormTextField
							label='Recommended Age Label'
							name='recommendedAgeLabel'
							placeholder='e.g. Birth, 2 Months'
							required
						/>
						<fields.FormTextField
							label='Recommended Age (months)'
							name='recommendedAgeMonths'
							step='0.1'
							type='number'
						/>
						<fields.FormTextField
							label='Dose Number'
							name='doseNumber'
							type='number'
						/>
						<fields.FormTextField
							label='Total Doses'
							name='totalDoses'
							type='number'
						/>
					</FormSection>

					{/* Schedule & status */}
					<FormSection
						columns={2}
						title='Schedule'
					>
						<fields.FormDateField
							label='Due Date'
							name='dueDate'
							required
						/>
						<fields.FormSelectField
							label='Status'
							name='status'
							options={STATUS_OPTIONS}
							required
						/>
						<fields.FormDateField
							label='Administered Date'
							name='administeredDate'
						/>
						<fields.FormTextField
							label='Administered By'
							name='administeredBy'
							placeholder='Staff name or ID'
						/>
					</FormSection>

					{/* Administration details */}
					<FormSection
						columns={3}
						title='Administration'
					>
						<fields.FormSelectField
							label='Route'
							name='administrationRoute'
							options={ROUTE_OPTIONS}
						/>
						<fields.FormSelectField
							label='Site'
							name='administrationSite'
							options={SITE_OPTIONS}
						/>
						<fields.FormTextField
							label='Batch Number'
							name='batchNumber'
							placeholder='LOT-...'
						/>
						<fields.FormTextField
							label='Manufacturer'
							name='manufacturer'
						/>
						<fields.FormTextField
							label='Brand Name'
							name='brandName'
						/>
						<fields.FormDateField
							label='Expiry Date'
							name='expiryDate'
						/>
					</FormSection>

					{/* Consent & reactions */}
					<FormSection
						columns={1}
						title='Consent & Reactions'
					>
						<fields.FormCheckboxField
							description='Parent or guardian gave informed consent'
							label='Parent consent obtained'
							name='parentConsent'
						/>
						<fields.FormTextareaField
							label='Adverse Reactions'
							maxLength={2000}
							name='adverseReactions'
							placeholder='Any observed reactions post-administration...'
						/>
						<fields.FormTextareaField
							label='Notes'
							maxLength={2000}
							name='notes'
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
