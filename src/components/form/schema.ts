import { appointmentFormSchema } from "#/lib/db/zod/appointment.ts";
import { encounterFormSchema } from "#/lib/db/zod/encounter.ts";
import { growthFormSchema } from "#/lib/db/zod/growth.ts";
import { immunizationFormSchema } from "#/lib/db/zod/immunization.ts";
import { labFormSchema } from "#/lib/db/zod/lab.ts";
import { prescriptionFormSchema } from "#/lib/db/zod/prescriptions.ts";
import { staffFormSchema } from "#/lib/db/zod/staff.ts";
import { vitalsFormSchema } from "#/lib/db/zod/vitals.ts";
import {
	type AppointmentFormValues,
	allergyDraftSchema,
	conditionDraftSchema,
	type GrowthFormValues,
	guardianDraftSchema,
	type ImmunizationFormValues,
	type LabFormValues,
	type LabTestFormValues,
	type PatientFormValues,
	type PrescriptionFormValues,
	type PrescriptionItemFormValues,
	patientFormSchema,
	type StaffFormValues,
	type VitalsFormValues
} from "#/lib/db/zod.ts";

export const schemas = {
	patient: patientFormSchema,
	appointment: appointmentFormSchema,
	encounter: encounterFormSchema,
	growth: growthFormSchema,
	immunization: immunizationFormSchema,
	lab: labFormSchema,
	prescription: prescriptionFormSchema,
	staff: staffFormSchema,
	vitals: vitalsFormSchema,
	guardian: guardianDraftSchema,
	allergy: allergyDraftSchema,
	condition: conditionDraftSchema
} as const;

export type {
	AppointmentFormValues,
	GrowthFormValues,
	ImmunizationFormValues,
	LabFormValues,
	LabTestFormValues,
	PatientFormValues,
	PrescriptionFormValues,
	PrescriptionItemFormValues,
	StaffFormValues,
	VitalsFormValues
};
export {
	appointmentFormSchema,
	conditionDraftSchema,
	encounterFormSchema,
	growthFormSchema,
	guardianDraftSchema,
	immunizationFormSchema,
	labFormSchema,
	patientFormSchema,
	prescriptionFormSchema,
	staffFormSchema,
	vitalsFormSchema
};
