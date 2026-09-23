import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema
} from "drizzle-orm/zod";
import { z } from "zod/v4";

import { labTestSchema } from "#/lib/db/zod/lab.ts";

import {
	auditLogs,
	clinics,
	encounters,
	growthMeasurements,
	guardians,
	immunizations,
	labOrders,
	patientAllergies,
	patientChronicConditions,
	patients,
	prescriptions,
	ROLES,
	staff,
	user,
	vitals,
	whoGrowthData
} from "./schema";
import {
	type activeStatusSchema,
	type appointmentStatusSchema,
	type auditActionSchema,
	type auditEntitySchema,
	type encounterStatusSchema,
	genderSchema,
	immunizationStatusSchema,
	labPrioritySchema,
	labStatusSchema,
	metricTypeSchema,
	type prescriptionStatusSchema,
	roleSchema,
	type visitTypeSchema
} from "./zod/common";

// ============================================================================
// ENUM SCHEMAS
// ============================================================================
//
// Prefer Drizzle's generated enum schemas rather than duplicating the enum
// values with z.enum(...). This keeps the database enum and validation schema
// synchronized automatically.
//
// ============================================================================
// SELECT SCHEMAS
// ============================================================================
//
// These represent rows returned from PostgreSQL.
//

export const clinicSelectSchema = createSelectSchema(clinics);
export const staffSelectSchema = createSelectSchema(staff, {
	role: roleSchema
});
export const patientSelectSchema = createSelectSchema(patients);
export const guardianSelectSchema = createSelectSchema(guardians);
export const patientAllergySelectSchema = createSelectSchema(patientAllergies);
export const patientChronicConditionSelectSchema = createSelectSchema(
	patientChronicConditions
);
export const encounterSelectSchema = createSelectSchema(encounters);
export const vitalSelectSchema = createSelectSchema(vitals);
export const growthMeasurementSelectSchema =
	createSelectSchema(growthMeasurements);
export const immunizationSelectSchema = createSelectSchema(immunizations);
export const prescriptionSelectSchema = createSelectSchema(prescriptions);
export const labOrderSelectSchema = createSelectSchema(labOrders);
export const auditLogSelectSchema = createSelectSchema(auditLogs);
export const whoGrowthDataSelectSchema = createSelectSchema(whoGrowthData);

// ============================================================================
// INSERT SCHEMAS
// ============================================================================
//
// These represent validated data entering the database.
//

export const clinicInsertSchema = createInsertSchema(clinics);
export const staffInsertSchema = createInsertSchema(staff).extend({
	role: z.enum(ROLES)
});
export const patientInsertSchema = createInsertSchema(patients);
export const guardianInsertSchema = createInsertSchema(guardians);
export const patientAllergyInsertSchema = createInsertSchema(patientAllergies);
export const patientChronicConditionInsertSchema = createInsertSchema(
	patientChronicConditions
);
export const encounterInsertSchema = createInsertSchema(encounters);
export const vitalInsertSchema = createInsertSchema(vitals);
export const growthMeasurementInsertSchema =
	createInsertSchema(growthMeasurements);
export const immunizationInsertSchema = createInsertSchema(immunizations, {
	status: immunizationStatusSchema
});
export const prescriptionInsertSchema = createInsertSchema(prescriptions);
export const labOrderInsertSchema = createInsertSchema(labOrders, {
	priority: labPrioritySchema,
	status: labStatusSchema,
	results: z.array(labTestSchema).nullable().optional(),
	testsJson: z.array(labTestSchema).min(1)
});
export const auditLogInsertSchema = createInsertSchema(auditLogs);
export const whoGrowthDataInsertSchema = createInsertSchema(whoGrowthData, {
	gender: genderSchema,
	metricType: metricTypeSchema
});

// ============================================================================
// UPDATE SCHEMAS
// ============================================================================
//
// Drizzle makes update fields optional, which is exactly what we want for
// partial database updates.
//

export const clinicUpdateSchema = createUpdateSchema(clinics);
export const staffUpdateSchema = createUpdateSchema(staff).extend({
	role: z.enum(ROLES).optional()
});
export const patientUpdateSchema = createUpdateSchema(patients);
export const guardianUpdateSchema = createUpdateSchema(guardians);
export const patientAllergyUpdateSchema = createUpdateSchema(patientAllergies);
export const patientChronicConditionUpdateSchema = createUpdateSchema(
	patientChronicConditions
);
export const encounterUpdateSchema = createUpdateSchema(encounters);
export const vitalUpdateSchema = createUpdateSchema(vitals);
export const growthMeasurementUpdateSchema =
	createUpdateSchema(growthMeasurements);
export const immunizationUpdateSchema = createUpdateSchema(immunizations, {
	status: immunizationStatusSchema
});
export const prescriptionUpdateSchema = createUpdateSchema(prescriptions);
export const labOrderUpdateSchema = createUpdateSchema(labOrders);
export const auditLogUpdateSchema = createUpdateSchema(auditLogs);
export const whoGrowthDataUpdateSchema = createUpdateSchema(whoGrowthData, {
	gender: genderSchema,
	metricType: metricTypeSchema
});

// ============================================================================
// INFERRED TYPES
// ============================================================================
//
// Use PascalCase for TypeScript types.
// Keep Select / Insert / Update explicit so the direction of the data flow
// is immediately obvious.
//
export const userSelectSchema = createSelectSchema(user);
export const userUpdateSchema = createUpdateSchema(user);
export const userInsertSchema = createInsertSchema(user);

export type User = z.infer<typeof userSelectSchema>;
export type UserInsert = z.infer<typeof userInsertSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;

export type Clinic = z.infer<typeof clinicSelectSchema>;
export type ClinicInsert = z.infer<typeof clinicInsertSchema>;
export type ClinicUpdate = z.infer<typeof clinicUpdateSchema>;

export type Staff = z.infer<typeof staffSelectSchema>;
export type StaffInsert = z.infer<typeof staffInsertSchema>;
export type StaffUpdate = z.infer<typeof staffUpdateSchema>;

export type PatientSelect = z.infer<typeof patientSelectSchema>;
export type PatientInsert = z.infer<typeof patientInsertSchema>;
export type PatientUpdate = z.infer<typeof patientUpdateSchema>;
export type Patient = PatientSelect;
export type Guardian = z.infer<typeof guardianSelectSchema>;
export type GuardianInsert = z.infer<typeof guardianInsertSchema>;
export type GuardianUpdate = z.infer<typeof guardianUpdateSchema>;

export type PatientAllergy = z.infer<typeof patientAllergySelectSchema>;
export type PatientAllergyInsert = z.infer<typeof patientAllergyInsertSchema>;
export type PatientAllergyUpdate = z.infer<typeof patientAllergyUpdateSchema>;

export type PatientChronicCondition = z.infer<
	typeof patientChronicConditionSelectSchema
>;
export type PatientChronicConditionInsert = z.infer<
	typeof patientChronicConditionInsertSchema
>;
export type PatientChronicConditionUpdate = z.infer<
	typeof patientChronicConditionUpdateSchema
>;

export type Encounter = z.infer<typeof encounterSelectSchema>;
export type EncounterInsert = z.infer<typeof encounterInsertSchema>;
export type EncounterUpdate = z.infer<typeof encounterUpdateSchema>;

export type Vital = z.infer<typeof vitalSelectSchema>;
export type VitalInsert = z.infer<typeof vitalInsertSchema>;
export type VitalUpdate = z.infer<typeof vitalUpdateSchema>;

export type GrowthMeasurement = z.infer<typeof growthMeasurementSelectSchema>;
export type GrowthMeasurementInsert = z.infer<
	typeof growthMeasurementInsertSchema
>;
export type GrowthMeasurementUpdate = z.infer<
	typeof growthMeasurementUpdateSchema
>;

export type Immunization = z.infer<typeof immunizationSelectSchema>;
export type ImmunizationInsert = z.infer<typeof immunizationInsertSchema>;
export type ImmunizationUpdate = z.infer<typeof immunizationUpdateSchema>;

export type Prescription = z.infer<typeof prescriptionSelectSchema>;
export type PrescriptionInsert = z.infer<typeof prescriptionInsertSchema>;
export type PrescriptionUpdate = z.infer<typeof prescriptionUpdateSchema>;

export type LabOrder = z.infer<typeof labOrderSelectSchema>;
export type LabOrderInsert = z.infer<typeof labOrderInsertSchema>;
export type LabOrderUpdate = z.infer<typeof labOrderUpdateSchema>;

export type AuditLog = z.infer<typeof auditLogSelectSchema>;
export type AuditLogInsert = z.infer<typeof auditLogInsertSchema>;
export type AuditLogUpdate = z.infer<typeof auditLogUpdateSchema>;

export type WhoGrowthData = z.infer<typeof whoGrowthDataSelectSchema>;
export type WhoGrowthDataInsert = z.infer<typeof whoGrowthDataInsertSchema>;
export type WhoGrowthDataUpdate = z.infer<typeof whoGrowthDataUpdateSchema>;

// ============================================================================
// ENUM TYPES
// ============================================================================

export type Role = z.infer<typeof roleSchema>;
export type Gender = z.infer<typeof genderSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type ActiveStatus = z.infer<typeof activeStatusSchema>;
export type VisitType = z.infer<typeof visitTypeSchema>;
export type EncounterStatus = z.infer<typeof encounterStatusSchema>;
export type ImmunizationStatus = z.infer<typeof immunizationStatusSchema>;
export type PrescriptionStatus = z.infer<typeof prescriptionStatusSchema>;
export type LabStatus = z.infer<typeof labStatusSchema>;
export type LabPriority = z.infer<typeof labPrioritySchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
export type AuditEntity = z.infer<typeof auditEntitySchema>;
export * from "./zod/appointment";
export * from "./zod/common";
export * from "./zod/encounter";
export * from "./zod/growth";
export * from "./zod/immunization";
export * from "./zod/lab";
export * from "./zod/patient";
export * from "./zod/prescriptions";
export * from "./zod/staff";
export * from "./zod/vitals";
