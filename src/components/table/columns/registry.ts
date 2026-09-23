import { appointmentColumns } from "./appointment";
import { encounterColumns } from "./encounter";
import { growthColumns } from "./growth";
import { immunizationColumns } from "./immunization";
import { labColumns } from "./labOrder";
import { patientColumns } from "./patient";
import { prescriptionColumns } from "./prescription";
import { staffColumns } from "./staff";
import { vitalColumns } from "./vital";

// ─── Exhaustiveness guard ────────────────────────────────────────────────────
// Adding a new entity without registering it in `allColumns` will produce a
// compile error because `allColumns` must satisfy `Record<ColumnEntity, unknown>`.
type ColumnRegistry = Record<ColumnEntity, unknown>;

export const COLUMN_ENTITIES = [
	"patients",
	"appointments",
	"staff",
	"encounters",
	"vitals",
	"growth",
	"immunizations",
	"prescriptions",
	"labs"
] as const;

export type ColumnEntity = (typeof COLUMN_ENTITIES)[number];

export const allColumns: ColumnRegistry = {
	patients: patientColumns,
	appointments: appointmentColumns,
	staff: staffColumns,
	encounters: encounterColumns,
	vitals: vitalColumns,
	growth: growthColumns,
	immunizations: immunizationColumns,
	prescriptions: prescriptionColumns,
	labs: labColumns
};

export type ColumnMap = typeof allColumns;
