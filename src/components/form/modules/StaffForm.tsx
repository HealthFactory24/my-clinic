// src/components/form/modules/StaffForm.tsx
"use client";

import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { useAppForm, useFormFields } from "#/components/form/core/registry";
import { FormActions } from "#/components/form/layout/FormActions";
import { FormPageLayout } from "#/components/form/layout/FormPageLayout";
import { FormSection } from "#/components/form/layout/FormSection";
import {
	type StaffFormValues,
	staffFormSchema
} from "#/components/form/schema";
import { useCreateStaff, useUpdateStaff } from "#/hooks/use-mutations";
import { useStaffById } from "#/hooks/use-staff";
import { createId } from "#/utils/id";

// ─── Props ──────────────────────────────────────────────────────────────────

interface StaffFormProps {
	/** When provided, the form runs in edit mode. */
	staffId?: string;
	/**
	 * Required when creating a new staff member. The staff record's `userId`
	 * is a foreign key into the `user` table — the caller is expected to
	 * resolve or create the user account first and pass the id here.
	 */
	userId?: string;
	redirectTo?: string;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_VALUES = (userId: string): StaffFormValues => ({
	id: createId("staff"),
	name: "",
	title: "",
	role: "staff",
	licenseNumber: "",
	avatarColor: "#6366f1",
	pinHash: "",
	userId,
	email: "",
	specialty: "General Pediatrics",
	department: "General",
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date()
});

// ─── Options ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
	{ value: "admin", label: "Administrator" },
	{ value: "doctor", label: "Doctor / Pediatrician" },
	{ value: "staff", label: "Clinic Staff" },
	{ value: "patient", label: "Patient" }
];

const SPECIALTY_OPTIONS = [
	{ value: "General Pediatrics", label: "General Pediatrics" },
	{ value: "Neonatology", label: "Neonatology" },
	{ value: "Pediatric Cardiology", label: "Pediatric Cardiology" },
	{ value: "Pediatric Neurology", label: "Pediatric Neurology" },
	{ value: "Pediatric Endocrinology", label: "Pediatric Endocrinology" },
	{ value: "Pediatric Pulmonology", label: "Pediatric Pulmonology" },
	{ value: "Pediatric Gastroenterology", label: "Pediatric Gastroenterology" },
	{
		value: "Pediatric Infectious Disease",
		label: "Pediatric Infectious Disease"
	},
	{
		value: "Pediatric Emergency Medicine",
		label: "Pediatric Emergency Medicine"
	},
	{ value: "Lactation Consulting", label: "Lactation Consulting" }
];

const DEPARTMENT_OPTIONS = [
	{ value: "General", label: "General" },
	{ value: "Outpatient", label: "Outpatient" },
	{ value: "Inpatient", label: "Inpatient" },
	{ value: "Emergency", label: "Emergency" },
	{ value: "NICU", label: "NICU" },
	{ value: "PICU", label: "PICU" },
	{ value: "Lactation", label: "Lactation" },
	{ value: "Administration", label: "Administration" }
];

/** Preset avatar colors, kept in sync with `columns/staff.tsx` fallbacks. */
const AVATAR_PRESETS = [
	"#6366f1",
	"#8b5cf6",
	"#ec4899",
	"#ef4444",
	"#f59e0b",
	"#10b981",
	"#06b6d4",
	"#3b82f6",
	"#4f46e5",
	"#a855f7"
];

// ─── Component ──────────────────────────────────────────────────────────────

export function StaffForm({
	staffId,
	userId,
	redirectTo = "/app/staff"
}: StaffFormProps) {
	const navigate = useNavigate();
	const isEdit = Boolean(staffId);

	const { data: existing } = useStaffById(staffId ?? "");
	const { mutateAsync: createStaff, isPending: isCreating } = useCreateStaff();
	const { mutateAsync: updateStaff, isPending: isUpdating } = useUpdateStaff();

	const isSubmitting = isCreating || isUpdating;

	const initial: StaffFormValues = existing
		? {
				id: existing.id,
				name: existing.name,
				title: existing.title,
				role: existing.role,
				licenseNumber: existing.licenseNumber,
				avatarColor: existing.avatarColor,
				pinHash: existing.pinHash,
				userId: existing.userId,
				email: existing.email,
				specialty: existing.specialty ?? "General Pediatrics",
				department: existing.department ?? "General",
				isActive: existing.isActive,
				createdAt: new Date(existing.createdAt),
				updatedAt: new Date(existing.updatedAt)
			}
		: DEFAULT_VALUES(userId ?? "");

	const form = useAppForm({
		defaultValues: initial,
		validators: { onSubmit: staffFormSchema },
		onSubmit: async ({ value }) => {
			if (isEdit && staffId) {
				await updateStaff({ ...value, id: staffId });
			} else {
				await createStaff(value);
			}
			void navigate({ to: redirectTo });
		}
	});

	const fields = useFormFields<StaffFormValues>();

	const handleCancel = useCallback(() => {
		void navigate({ to: redirectTo });
	}, [navigate, redirectTo]);

	return (
		<FormPageLayout
			backTo={redirectTo}
			maxWidth='lg'
			title={isEdit ? "Edit Staff Member" : "Add Staff Member"}
		>
			<form.AppForm>
				<form.Form>
					{/* Identity */}
					<FormSection
						columns={2}
						title='Identity'
					>
						<fields.FormTextField
							label='Full Name'
							name='name'
							placeholder='e.g. Dr. Sarah Johnson'
							required
						/>
						<fields.FormTextField
							label='Title / Position'
							name='title'
							placeholder='e.g. Senior Pediatrician'
							required
						/>
						<fields.FormSelectField
							label='Role'
							name='role'
							options={ROLE_OPTIONS}
							required
						/>
						<fields.FormTextField
							label='License Number'
							name='licenseNumber'
							placeholder='e.g. MD-123456'
							required
						/>
						<fields.FormTextField
							label='Email'
							name='email'
							placeholder='name@clinic.example'
							required
							type='email'
						/>
					</FormSection>

					{/* Clinical assignment */}
					<FormSection
						columns={2}
						title='Clinical Assignment'
					>
						<fields.FormSelectField
							label='Specialty'
							name='specialty'
							options={SPECIALTY_OPTIONS}
						/>
						<fields.FormSelectField
							label='Department'
							name='department'
							options={DEPARTMENT_OPTIONS}
						/>
					</FormSection>

					{/* Appearance */}
					<FormSection
						columns={1}
						title='Appearance'
					>
						<fields.FormColorField
							label='Avatar Color'
							name='avatarColor'
							presetColors={AVATAR_PRESETS}
							previewSize='md'
							showPresets
							showPreview
						/>
					</FormSection>

					{/* Access */}
					<FormSection
						columns={1}
						title='Access'
					>
						<fields.FormSwitchField
							description='Inactive staff cannot sign in or be assigned to new appointments.'
							label='Active'
							name='isActive'
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
