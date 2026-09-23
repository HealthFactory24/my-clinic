import {
	actionsColumn,
	PRESCRIPTION_STATUS_OPTIONS,
	renderDate,
	renderStatusBadge,
	selectColumn
} from "@/components/table/columns/shared";
import type { Patient, Prescription, PrescriptionItem } from "@/lib/db/schema";

import { createAppColumnHelper } from "../table";

// ─── Row s hape ──────────────────────────────────────────────────────────────
// Uses the DB PrescriptionItem type (json column shape) so it is compatible
// with what the repository returns. The Zod PrescriptionItemValidation type
// is stricter (refills: number vs refills?: number) and should not be used
// here — it belongs only in form schemas.

export interface PrescriptionRow
	extends Omit<Prescription, "prescriptionItems"> {
	prescriptionItems: PrescriptionItem[];
	patient?: Pick<Patient, "id" | "firstName" | "lastName" | "mrn"> | null;
}

// ─── Column helper ──────────────────────────────────────────────────────────

const helper = createAppColumnHelper<PrescriptionRow>();

export const prescriptionColumns = helper.columns([
	selectColumn(helper),

	helper.accessor("rxNumber", {
		id: "rxNumber",
		header: ({ header }) => <header.ColumnHeader title='Rx #' />,
		cell: ({ getValue }) => (
			<span className='font-mono font-semibold text-sm'>{getValue()}</span>
		),
		meta: { label: "Rx Number", variant: "text" },
		size: 120
	}),

	helper.accessor(
		row =>
			row.patient ? `${row.patient.firstName} ${row.patient.lastName}` : "",
		{
			id: "patient",
			header: ({ header }) => <header.ColumnHeader title='Patient' />,
			cell: ({ row }) => {
				const patient = row.original.patient;
				if (!patient) return <span className='text-muted-foreground'>—</span>;
				return (
					<span>
						{patient.firstName} {patient.lastName}
					</span>
				);
			},
			meta: { label: "Patient", variant: "text" },
			size: 180
		}
	),

	helper.accessor(row => row.prescriptionItems?.[0]?.medicationName ?? "", {
		id: "medication",
		header: ({ header }) => <header.ColumnHeader title='Medication' />,
		cell: ({ row }) => {
			const items = row.original.prescriptionItems ?? [];
			if (items.length === 0) {
				return <span className='text-muted-foreground'>—</span>;
			}
			const [first] = items;
			return (
				<div>
					<div className='font-medium text-xs'>
						{first?.medicationName ?? "—"}
					</div>
					{items.length > 1 ? (
						<div className='text-[10px] text-muted-foreground'>
							+{items.length - 1} more
						</div>
					) : null}
				</div>
			);
		},
		meta: { label: "Medication", variant: "text" },
		size: 180
	}),

	helper.accessor("diagnosis", {
		id: "diagnosis",
		header: ({ header }) => <header.ColumnHeader title='Diagnosis' />,
		cell: ({ getValue }) => (
			<span className='line-clamp-1 text-sm'>{getValue() || "—"}</span>
		),
		meta: { label: "Diagnosis", variant: "text" },
		size: 150
	}),

	helper.accessor("prescribedDate", {
		id: "prescribedDate",
		header: ({ header }) => <header.ColumnHeader title='Prescribed' />,
		cell: ({ getValue }) => renderDate(getValue()),
		meta: { label: "Prescribed", variant: "date" },
		size: 120
	}),

	helper.accessor("status", {
		id: "status",
		header: ({ header }) => <header.ColumnHeader title='Status' />,
		cell: ({ getValue }) => renderStatusBadge(getValue()),
		meta: {
			label: "Status",
			variant: "select",
			options: [...PRESCRIPTION_STATUS_OPTIONS]
		},
		size: 120
	}),

	actionsColumn<PrescriptionRow>(
		helper,
		row => `/app/prescriptions/${row.id}`,
		{
			label: "View →",
			maxSize: 90
		}
	)
]);
