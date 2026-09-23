import {
	actionsColumn,
	ENCOUNTER_STATUS_OPTIONS,
	renderPatientName,
	selectColumn,
	VISIT_TYPE_OPTIONS
} from "@/components/table/columns/shared";
import type { Encounter, Patient, Staff } from "@/lib/db/schema";

import { createAppColumnHelper } from "../table";

// Exported so consumers (e.g. EncounterList) can type their row data against
// the same shape the columns expect. patient/staff are optional because the
// API join may omit them, and every cell already guards for that.
export type FullEncounter = Encounter & {
	patient?: Pick<
		Patient,
		"id" | "mrn" | "firstName" | "lastName" | "dateOfBirth" | "gender"
	> | null;
	staff?: Pick<Staff, "id" | "name"> | null;
};

const encounterHelper = createAppColumnHelper<FullEncounter>();

export const encounterColumns = encounterHelper.columns([
	selectColumn(encounterHelper),

	encounterHelper.accessor("encounterDate", {
		id: "encounterDate",
		header: ({ header }) => <header.ColumnHeader title='Date' />,
		cell: ({ cell }) => <cell.DateCell />,
		size: 160,
		meta: { label: "Date", variant: "date" }
	}),

	encounterHelper.accessor("patient", {
		id: "patient",
		header: ({ header }) => <header.ColumnHeader title='Patient' />,
		cell: ({ getValue }) => {
			const patient = getValue();
			if (!patient) return <span className='text-muted-foreground'>—</span>;
			return renderPatientName(patient);
		},
		size: 260,
		meta: { label: "Patient", variant: "text" }
	}),

	encounterHelper.accessor("visitType", {
		id: "visitType",
		header: ({ header }) => <header.ColumnHeader title='Visit Type' />,
		cell: ({ cell }) => <cell.TextCell />,
		size: 150,
		meta: {
			label: "Visit Type",
			variant: "select",
			options: [...VISIT_TYPE_OPTIONS]
		}
	}),

	encounterHelper.accessor("chiefComplaint", {
		id: "chiefComplaint",
		header: ({ header }) => <header.ColumnHeader title='Chief Complaint' />,
		cell: ({ getValue }) => (
			<span className='line-clamp-2 text-sm'>{getValue() || "—"}</span>
		),
		size: 200,
		meta: { label: "Chief Complaint", variant: "text" }
	}),

	encounterHelper.accessor("status", {
		id: "status",
		header: ({ header }) => <header.ColumnHeader title='Status' />,
		cell: ({ cell }) => <cell.StatusCell />,
		size: 100,
		meta: {
			label: "Status",
			variant: "select",
			options: [...ENCOUNTER_STATUS_OPTIONS]
		}
	}),

	actionsColumn(encounterHelper, row => `/app/encounters/${row.id}`, {
		maxSize: 80
	})
]);
