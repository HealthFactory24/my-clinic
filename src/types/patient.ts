// src/types/patient.ts

/**
 * Slim patient projection used for lookup maps, dropdowns, autocomplete, and
 * anywhere a full `Patient` row (with JSONB allergies, guardians, etc.) would
 * be wasteful to ship over the wire.
 *
 * Kept structurally compatible with the `patients` table columns so the
 * repository can select exactly these fields without a transform step.
 */
export interface PatientSummary {
	id: string;
	firstName: string;
	lastName: string;
	mrn: string;
	dateOfBirth: string;
	gender: "male" | "female";
}

/**
 * Discriminated union of the projection modes accepted by `$getAllPatients`.
 * `"summary"` returns `PatientSummary[]`, `"full"` (default) returns the
 * existing `PatientWithPrimaryGuardian[]` shape.
 */
export type PatientProjection = "summary" | "full";

export interface PatientLookupParams {
	limit?: number;
	offset?: number;
	activeStatus?: "Active" | "Inactive" | "Archived";
	projection?: PatientProjection;
}
