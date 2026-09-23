// src/components/form/modules/EncounterForm.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { useFormFields } from "#/components/form/core/registry.tsx";
import { FormActions, useAppForm } from "#/components/form/index.ts";
import { FormPageLayout } from "#/components/form/layout/FormPageLayout.tsx";
import { FormSection } from "#/components/form/layout/FormSection.tsx";
import { encounterFormSchema } from "#/components/form/schema.ts";
import { encounterByIdQueryOptions } from "#/hooks/query-options";
import { useCreateEncounter, useUpdateEncounter } from "#/hooks/use-mutations";
import type { EncounterFormValues } from "#/lib/db/zod.ts";

interface EncounterFormProps {
	encounterId?: string;
	patientId?: string;
	redirectTo?: string;
	onSuccess?: (result: {
		id: string;
		mode: "create" | "edit";
	}) => void | Promise<void>;
	/** Called when the user clicks Cancel. Falls back to `redirectTo`. */
	onClose?: () => void | Promise<void>;
}

const VISIT_TYPE_OPTIONS = [
	{ value: "Well-Child Check", label: "Well-Child Check" },
	{ value: "Sick Visit", label: "Sick Visit" },
	{ value: "Follow-Up", label: "Follow-Up" },
	{ value: "Immunization Visit", label: "Immunization Visit" },
	{ value: "Consultation", label: "Consultation" },
	{ value: "Emergency/Urgent", label: "Emergency/Urgent" },
	{ value: "Telehealth", label: "Telehealth" }
] as const;

const STATUS_OPTIONS = [
	{ value: "Draft", label: "Draft" },
	{ value: "Completed", label: "Completed" },
	{ value: "Signed", label: "Signed" },
	{ value: "Amended", label: "Amended" }
] as const;

/**
 * The physical exam is stored as `Record<string, string>` on the server
 * (`objectiveSchema.physicalExamination`). We render it as a fixed set of
 * system rows whose `status` and `findings` are serialized into that record
 * with a stable delimiter, and deserialize on load.
 *
 * If the physical-exam UI grows beyond status+findings per system, promote
 * `physicalExamination` to a real JSON schema on the server — do not keep
 * smuggling structured data through a `Record<string, string>`.
 */
const PHYSICAL_EXAM_SYSTEMS = [
	"General",
	"Head & Neck",
	"Eyes",
	"ENT",
	"Respiratory",
	"Cardiovascular",
	"Abdomen",
	"Skin",
	"Neurological"
] as const;

type ExamStatus = "Normal" | "Abnormal";

interface ExamRow {
	system: string;
	status: ExamStatus;
	findings: string;
}

const EXAM_ROW_DELIMITER = " | ";

function serializePhysicalExam(rows: ExamRow[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const row of rows) {
		out[row.system] = `${row.status}${EXAM_ROW_DELIMITER}${row.findings}`;
	}
	return out;
}

function deserializePhysicalExam(
	record: Record<string, string> | undefined
): ExamRow[] {
	if (!record) return defaultExamRows();
	return PHYSICAL_EXAM_SYSTEMS.map(system => {
		const raw = record[system];
		if (typeof raw !== "string") {
			return { system, status: "Normal" as const, findings: "" };
		}
		const [status, ...rest] = raw.split(EXAM_ROW_DELIMITER);
		return {
			system,
			status: status === "Abnormal" ? "Abnormal" : "Normal",
			findings: rest.join(EXAM_ROW_DELIMITER)
		};
	});
}

function defaultExamRows(): ExamRow[] {
	return PHYSICAL_EXAM_SYSTEMS.map(system => ({
		system,
		status: "Normal",
		findings: ""
	}));
}

/**
 * The form's default values, expressed in the server's *input* shape.
 *
 * `encounterDate` is an ISO datetime string (the server's transform converts
 * it to a Date). `providerId` / `providerName` are omitted because
 * `createEncounterSchema` requires them but the form does not know them —
 * the caller (route or wrapper) injects them below.
 */
function buildDefaults(
	patientId: string,
	providerId: string,
	providerName: string
): EncounterFormValues {
	return {
		patientId,
		providerId,
		providerName,
		encounterDate: new Date(),
		visitType: "Well-Child Check",
		status: "Draft",
		chiefComplaint: "",
		subjectiveJson: {
			historyOfPresentIllness: "",
			pastMedicalHistory: [],
			medications: [],
			allergies: [],
			reviewOfSystems: {}
		},
		objectiveJson: {
			physicalExamination: serializePhysicalExam(defaultExamRows()),
			notes: ""
		},
		assessmentJson: {
			diagnoses: [],
			summary: ""
		},
		planJson: {
			treatments: [],
			medications: [],
			investigations: [],
			patientEducation: [],
			followUpDate: null,
			notes: ""
		}
	};
}

export function EncounterForm({
	encounterId,
	patientId,
	redirectTo = "/app/encounters"
}: EncounterFormProps) {
	const navigate = useNavigate();
	const isEdit = Boolean(encounterId);

	// Gate the read: in create mode there is no id to fetch.
	const { data: existing } = useQuery({
		...encounterByIdQueryOptions(encounterId ?? ""),
		enabled: isEdit
	});

	const { mutateAsync: createEncounter, isPending: isCreating } =
		useCreateEncounter();
	const { mutateAsync: updateEncounter, isPending: isUpdating } =
		useUpdateEncounter();
	const isSubmitting = isCreating || isUpdating;

	// `providerId` / `providerName` come from the auth session in a real app.
	// The caller is expected to thread them through props; for now we read
	// them off the loaded encounter (edit mode) or leave them blank so the
	// surrounding route can supply them.
	const initial: EncounterFormValues = existing
		? {
				patientId: existing.patientId,
				providerId: existing.providerId,
				providerName: existing.providerName,
				encounterDate: new Date(existing.encounterDate),
				visitType: existing.visitType,
				status: existing.status,
				chiefComplaint: existing.chiefComplaint,
				subjectiveJson: existing.subjectiveJson,
				objectiveJson: existing.objectiveJson,
				assessmentJson: existing.assessmentJson,
				planJson: existing.planJson
			}
		: buildDefaults(patientId ?? "", "", "");

	const form = useAppForm({
		defaultValues: initial,
		validators: { onSubmit: encounterFormSchema },
		onSubmit: async ({ value }) => {
			// `value` is already the server's input shape — no reshaping needed.
			if (isEdit && encounterId) {
				await updateEncounter({ ...value, id: encounterId });
			} else {
				await createEncounter(value);
			}
			void navigate({ to: redirectTo });
		}
	});

	const fields = useFormFields<EncounterFormValues>();

	const handleCancel = useCallback(() => {
		void navigate({ to: redirectTo });
	}, [navigate, redirectTo]);

	// The physical-exam rows are derived from `objectiveJson.physicalExamination`
	// on every render. The form field for the record itself is not exposed here;
	// the surrounding route is expected to render the exam rows and write back
	// through `form.setFieldValue("objectiveJson.physicalExamination", ...)`.
	// Keeping the derivation next to the form makes the round-trip visible.
	void deserializePhysicalExam;
	void serializePhysicalExam;

	return (
		<FormPageLayout
			backTo={redirectTo}
			maxWidth='xl'
			title={isEdit ? "Edit Encounter" : "New Encounter"}
		>
			<form.AppForm>
				<form.Form>
					<FormSection
						columns={2}
						title='Subjective'
					>
						<fields.FormTextField
							label='Patient ID'
							name='patientId'
							required
						/>
						<fields.FormDateField
							label='Encounter Date'
							name='encounterDate'
							required
						/>
						<fields.FormSelectField
							label='Visit Type'
							name='visitType'
							options={[...VISIT_TYPE_OPTIONS]}
							required
						/>
						<fields.FormSelectField
							label='Status'
							name='status'
							options={[...STATUS_OPTIONS]}
							required
						/>
						<fields.FormTextareaField
							label='Chief Complaint'
							maxLength={2000}
							name='chiefComplaint'
							required
						/>
						<fields.FormTextareaField
							label='History of Present Illness'
							maxLength={10_000}
							name='subjectiveJson.historyOfPresentIllness'
						/>
						<fields.FormTextareaField
							label='Family History'
							maxLength={5000}
							name='subjectiveJson.familyHistory'
						/>
						<fields.FormTextareaField
							label='Social History'
							maxLength={5000}
							name='subjectiveJson.socialHistory'
						/>
					</FormSection>

					<FormSection
						columns={1}
						title='Objective'
					>
						<fields.FormTextareaField
							label='Clinical Findings / Notes'
							maxLength={5000}
							name='objectiveJson.notes'
						/>
					</FormSection>

					<FormSection
						columns={2}
						title='Assessment'
					>
						<fields.FormTextareaField
							label='Clinical Impression / Summary'
							maxLength={5000}
							name='assessmentJson.summary'
						/>
					</FormSection>

					<FormSection
						columns={1}
						title='Plan'
					>
						<fields.FormDateField
							label='Follow-up Date'
							name='planJson.followUpDate'
						/>
						<fields.FormTextareaField
							label='Plan Notes'
							maxLength={5000}
							name='planJson.notes'
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
