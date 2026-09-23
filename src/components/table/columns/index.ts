// Re-export every shared primitive first so column files can import from
// "@/components/table/columns/shared" or from this barrel interchangeably.

// Entity column sets
export { appointmentColumns } from "./appointment";
export { encounterColumns } from "./encounter";
export { growthColumns } from "./growth";
export { immunizationColumns } from "./immunization";
export { labColumns } from "./labOrder";
export { patientColumns } from "./patient";
export { type PrescriptionRow, prescriptionColumns } from "./prescription";
// Registry — exhaustiveness type + lookup map
export {
	allColumns,
	COLUMN_ENTITIES,
	type ColumnEntity,
	type ColumnMap
} from "./registry";
export * from "./shared";
export { staffColumns } from "./staff";
export { vitalColumns } from "./vital";
