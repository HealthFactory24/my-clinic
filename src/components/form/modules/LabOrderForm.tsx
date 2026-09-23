// src/components/form/modules/LabOrderForm.tsx
"use client";

import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo } from "react";

import { useAppForm, useFormFields } from "#/components/form/core/registry";
import { FormActions } from "#/components/form/layout/FormActions";
import { FormPageLayout } from "#/components/form/layout/FormPageLayout";
import { FormSection } from "#/components/form/layout/FormSection";
import {
	type LabFormValues,
	type LabTestFormValues,
	labFormSchema
} from "#/components/form/schema";
import { useLabOrderById } from "#/hooks/use-labs";
import { useCreateLabOrder, useUpdateLabOrder } from "#/hooks/use-mutations";
import { usePatientById } from "#/hooks/use-patients";
import { useActiveStaff } from "#/hooks/use-staff";
import { createId } from "#/utils/id";
import { Button } from "@/components/ui/button";

interface LabOrderFormProps {
	/** Required when creating. Ignored when editing (patient comes from the order). */
	patientId?: string;
	encounterId?: string;
	/** When provided, the form runs in edit mode. */
	labOrderId?: string;
	redirectTo?: string;
}

// ─── Options ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
	{ value: "Ordered", label: "Ordered" },
	{ value: "Sample Collected", label: "Sample Collected" },
	{ value: "Processing", label: "Processing" },
	{ value: "Completed", label: "Completed" },
	{ value: "Cancelled", label: "Cancelled" }
] as const;

const PRIORITY_OPTIONS = [
	{ value: "Routine", label: "Routine" },
	{ value: "Urgent", label: "Urgent" },
	{ value: "Stat", label: "Stat" }
] as const;

const SAMPLE_TYPE_OPTIONS = [
	{ value: "Blood", label: "Blood" },
	{ value: "Urine", label: "Urine" },
	{ value: "Throat Swab", label: "Throat Swab" },
	{ value: "Nasal Swab", label: "Nasal Swab" },
	{ value: "Stool", label: "Stool" },
	{ value: "CSF", label: "CSF" },
	{ value: "Other", label: "Other" }
] as const;

const CATEGORY_OPTIONS = [
	{ value: "Hematology", label: "Hematology" },
	{ value: "Biochemistry", label: "Biochemistry" },
	{ value: "Microbiology", label: "Microbiology" },
	{ value: "Urinalysis", label: "Urinalysis" },
	{ value: "Immunology", label: "Immunology" },
	{ value: "Molecular", label: "Molecular" },
	{ value: "Other", label: "Other" }
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function newTest(): LabTestFormValues {
	return {
		id: createId("lab"),
		testName: "",
		testCode: "",
		category: "",
		sampleType: undefined,
		result: undefined,
		referenceRange: undefined,
		unit: undefined,
		isAbnormal: false,
		status: "Pending",
		completedAt: undefined,
		notes: undefined
	};
}

/** `<input type="date">` value: `YYYY-MM-DD`. */
function toIsoDate(date: Date | string | null | undefined): string | null {
	if (date === null || date === undefined) return null;
	const d = typeof date === "string" ? new Date(date) : date;
	return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Coerce a form ISO date string (or null) to a server-side `Date | undefined`. */
function toDate(value: string | null | undefined): Date | undefined {
	if (!value) return undefined;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

// ─── Form value builders ────────────────────────────────────────────────────

function buildDefaults(
	patientId: string,
	encounterId: string | undefined
): LabFormValues {
	return {
		id: createId("lab"),
		orderNumber: "",
		patientId,
		encounterId,
		orderDate: toIsoDate(new Date()) ?? "",
		orderedBy: "",
		clinicalIndication: "",
		testsJson: [newTest()],
		status: "Ordered",
		priority: "Routine",
		completedDate: null,
		specimenCollectionNotes: undefined,
		specimenType: undefined,
		specimenCollectedAt: null,
		resultsReleasedAt: null,
		notes: undefined,
		instructions: undefined,
		results: undefined, // ← `undefined`, not `null` (see toServerInput)
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

type ExistingLabOrder = NonNullable<ReturnType<typeof useLabOrderById>["data"]>;

function fromExisting(existing: ExistingLabOrder): LabFormValues {
	return {
		id: existing.id,
		orderNumber: existing.orderNumber,
		patientId: existing.patientId,
		encounterId: existing.encounterId ?? undefined,
		orderDate: toIsoDate(existing.orderDate) ?? "",
		orderedBy: existing.orderedBy,
		clinicalIndication: existing.clinicalIndication,
		testsJson: existing.testsJson,
		status: existing.status,
		priority: existing.priority,
		completedDate: toIsoDate(existing.completedDate),
		specimenCollectionNotes: existing.specimenCollectionNotes ?? undefined,
		specimenType: existing.specimenType ?? undefined,
		specimenCollectedAt: existing.specimenCollectedAt ?? null,
		resultsReleasedAt: existing.resultsReleasedAt ?? null,
		notes: existing.notes ?? undefined,
		instructions: existing.instructions ?? undefined,
		results: existing.results ?? undefined, // ← not `?? null`
		createdAt: new Date(existing.createdAt),
		updatedAt: new Date(existing.updatedAt)
	};
}

/**
 * Convert form values (ISO date strings) to the server fn's input shape
 * (`Date` objects, `undefined` for absent JSON blobs).
 *
 * The `results: null` mismatch (form schema allows `null`, server input type
 * allows only `undefined`) is normalized here — one boundary, one place.
 */
function toServerInput(value: LabFormValues) {
	const {
		// id,
		// createdAt,
		// updatedAt,
		orderDate,
		completedDate,
		specimenCollectedAt,
		resultsReleasedAt,
		results,
		...rest
	} = value;
	// void id;
	// void createdAt;
	// void updatedAt;

	return {
		...rest,
		orderDate: new Date(orderDate),
		completedDate: toDate(completedDate),
		specimenCollectedAt: specimenCollectedAt,
		resultsReleasedAt: resultsReleasedAt,
		results: results ?? undefined
	};
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LabOrderForm({
	patientId,
	encounterId,
	labOrderId,
	redirectTo = "/app/labs"
}: LabOrderFormProps) {
	const navigate = useNavigate();
	const isEdit = Boolean(labOrderId);

	const { data: existing } = useLabOrderById(labOrderId ?? "");
	const effectivePatientId = patientId ?? existing?.patientId;

	const { data: patient } = usePatientById(effectivePatientId ?? "");
	const { data: staff, isLoading: isLoadingStaff } = useActiveStaff();

	const { mutateAsync: createLabOrder, isPending: isCreating } =
		useCreateLabOrder();
	const { mutateAsync: updateLabOrder, isPending: isUpdating } =
		useUpdateLabOrder();

	const isSubmitting = isCreating || isUpdating;

	const staffOptions = useMemo(
		() =>
			staff?.map(s => ({ value: s.id, label: `${s.name} — ${s.title}` })) ?? [],
		[staff]
	);

	// Stable defaults — memoized so `useAppForm` doesn't reset on every render.
	const defaults = useMemo<LabFormValues>(
		() =>
			existing
				? fromExisting(existing)
				: buildDefaults(patientId ?? "", encounterId),
		[existing, patientId, encounterId]
	);

	const form = useAppForm({
		defaultValues: defaults,
		validators: { onSubmit: labFormSchema },
		onSubmit: async ({ value }) => {
			const payload = toServerInput(value);
			if (isEdit && labOrderId) {
				await updateLabOrder({ ...payload, id: labOrderId });
			} else {
				await createLabOrder(payload);
			}
			void navigate({ to: redirectTo });
		}
	});

	const fields = useFormFields<LabFormValues>();

	const handleCancel = useCallback(() => {
		void navigate({ to: redirectTo });
	}, [navigate, redirectTo]);

	return (
		<FormPageLayout
			backTo={redirectTo}
			maxWidth='xl'
			title={isEdit ? "Edit Lab Order" : "New Lab Order"}
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
						title='Order'
					>
						<fields.FormDateField
							label='Order Date'
							name='orderDate'
							required
						/>
						<fields.FormSelectField
							disabled={isLoadingStaff}
							label='Ordered By'
							name='orderedBy'
							options={staffOptions}
							placeholder={
								isLoadingStaff ? "Loading staff…" : "Select staff member"
							}
							required
						/>
						<fields.FormSelectField
							label='Priority'
							name='priority'
							options={[...PRIORITY_OPTIONS]}
							required
						/>
						<fields.FormSelectField
							label='Status'
							name='status'
							options={[...STATUS_OPTIONS]}
							required
						/>
						<fields.FormSelectField
							label='Specimen Type'
							name='specimenType'
							options={[...SAMPLE_TYPE_OPTIONS]}
						/>
					</FormSection>

					<FormSection
						columns={1}
						title='Clinical Indication'
					>
						<fields.FormTextareaField
							label='Reason for Ordering'
							maxLength={2000}
							name='clinicalIndication'
							placeholder='e.g. Fever workup, monitor therapy, routine screening...'
							required
						/>
					</FormSection>

					<form.AppField
						mode='array'
						name='testsJson'
					>
						{field => (
							<LabTestsField
								field={field}
								fields={fields}
							/>
						)}
					</form.AppField>

					<FormSection
						columns={1}
						title='Specimen Collection'
					>
						<fields.FormTextareaField
							label='Collection Notes'
							maxLength={2000}
							name='specimenCollectionNotes'
							placeholder='Patient prep, collection timing, special handling...'
						/>
						<fields.FormTextareaField
							label='Instructions'
							maxLength={5000}
							name='instructions'
							placeholder='Instructions for the lab or patient...'
						/>
					</FormSection>

					<FormSection
						columns={1}
						title='Notes'
					>
						<fields.FormTextareaField
							label='Additional Notes'
							maxLength={5000}
							name='notes'
						/>
					</FormSection>

					<FormActions
						isSubmitting={isSubmitting}
						onCancel={handleCancel}
						submitLabel={isEdit ? "Save Changes" : "Create Lab Order"}
					/>
				</form.Form>
			</form.AppForm>
		</FormPageLayout>
	);
}

// ─── Extracted array field ──────────────────────────────────────────────────

/**
 * Extracted so the outer component's JSX stays shallow and the array
 * rendering logic — which is the most complex part of this form — has its
 * own scope. `fields` is passed through because `useFormFields` must run
 * inside the `form.AppForm` provider.
 */
function LabTestsField({
	field,
	fields
}: {
	field: {
		pushValue: (v: LabTestFormValues) => void;
		removeValue: (i: number) => void;
		state: { value: LabTestFormValues[] };
	};
	fields: ReturnType<typeof useFormFields<LabFormValues>>;
}) {
	const handleAdd = useCallback(() => {
		field.pushValue(newTest());
	}, [field]);

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<h3 className='font-semibold text-foreground text-sm'>
					Laboratory Tests
				</h3>
				<Button
					onClick={handleAdd}
					size='sm'
					type='button'
					variant='outline'
				>
					<Plus className='mr-1.5 size-3.5' />
					Add test
				</Button>
			</div>

			{field.state.value.map((row, index) => (
				<LabTestRow
					fields={fields}
					index={index}
					key={row.id}
					removeValue={field.removeValue}
					showRemove={field.state.value.length > 1}
				/>
			))}

			{field.state.value.length === 0 ? (
				<p className='rounded-xl border border-border border-dashed p-8 text-center text-muted-foreground text-xs'>
					No tests yet. Click &ldquo;Add test&rdquo; to start.
				</p>
			) : null}
		</div>
	);
}

function LabTestRow({
	fields,
	index,
	removeValue,
	showRemove
}: {
	fields: ReturnType<typeof useFormFields<LabFormValues>>;
	index: number;
	removeValue: (i: number) => void;
	showRemove: boolean;
}) {
	const handleRemove = useCallback(() => {
		removeValue(index);
	}, [removeValue, index]);

	return (
		<div className='space-y-4 rounded-2xl border border-border bg-card p-4'>
			<div className='flex items-start justify-between'>
				<span className='font-bold text-muted-foreground text-xs uppercase'>
					Test {index + 1}
				</span>
				{showRemove ? (
					<Button
						aria-label={`Remove test ${index + 1}`}
						onClick={handleRemove}
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
					label='Test Name'
					name={`testsJson[${index}].testName`}
					placeholder='e.g. Complete Blood Count'
					required
				/>
				<fields.FormTextField
					label='Test Code'
					name={`testsJson[${index}].testCode`}
					placeholder='e.g. CBC'
					required
				/>
				<fields.FormSelectField
					label='Category'
					name={`testsJson[${index}].category`}
					options={[...CATEGORY_OPTIONS]}
					required
				/>
				<fields.FormSelectField
					label='Sample Type'
					name={`testsJson[${index}].sampleType`}
					options={[...SAMPLE_TYPE_OPTIONS]}
				/>
			</div>
		</div>
	);
}
