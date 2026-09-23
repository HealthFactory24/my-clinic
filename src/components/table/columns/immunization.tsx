import {
	actionsColumn,
	IMMUNIZATION_STATUS_OPTIONS,
	renderDate,
	renderStatusBadge,
	selectColumn
} from "@/components/table/columns/shared";
import type { Immunization } from "@/lib/db/schema";

import { createAppColumnHelper } from "../table";

const immunizationHelper = createAppColumnHelper<Immunization>();

export const immunizationColumns = immunizationHelper.columns([
	selectColumn(immunizationHelper),

	immunizationHelper.accessor("vaccineName", {
		id: "vaccineName",
		header: ({ header }) => <header.ColumnHeader title='Vaccine' />,
		cell: ({ getValue }) => <span className='font-medium'>{getValue()}</span>,
		meta: { label: "Vaccine", variant: "text" },
		size: 200
	}),

	immunizationHelper.accessor("doseNumber", {
		id: "doseNumber",
		header: ({ header }) => <header.ColumnHeader title='Dose' />,
		cell: ({ getValue, row }) => {
			const dose = getValue();
			const total = row.original.totalDoses;
			return (
				<span>
					Dose {dose}
					{total ? `/${total}` : ""}
				</span>
			);
		},
		meta: { label: "Dose", variant: "number" },
		size: 80
	}),

	immunizationHelper.accessor("targetDisease", {
		id: "targetDisease",
		header: ({ header }) => <header.ColumnHeader title='Disease' />,
		cell: ({ getValue }) => <span className='text-sm'>{getValue()}</span>,
		meta: { label: "Target Disease", variant: "text" },
		size: 160
	}),

	immunizationHelper.accessor("dueDate", {
		id: "dueDate",
		header: ({ header }) => <header.ColumnHeader title='Due Date' />,
		cell: ({ getValue }) => renderDate(getValue()),
		meta: { label: "Due Date", variant: "date" },
		size: 120
	}),

	immunizationHelper.accessor("administeredDate", {
		id: "administeredDate",
		header: ({ header }) => <header.ColumnHeader title='Administered' />,
		cell: ({ getValue }) => {
			const v = getValue();
			return v ? (
				renderDate(v)
			) : (
				<span className='text-muted-foreground'>—</span>
			);
		},
		meta: { label: "Administered", variant: "date" },
		size: 120
	}),

	immunizationHelper.accessor("status", {
		id: "status",
		header: ({ header }) => <header.ColumnHeader title='Status' />,
		cell: ({ getValue }) => renderStatusBadge(getValue()),
		meta: {
			label: "Status",
			variant: "select",
			options: [...IMMUNIZATION_STATUS_OPTIONS]
		},
		size: 120
	}),

	actionsColumn(immunizationHelper, row => `/app/immunizations/${row.id}`, {
		maxSize: 80
	})
]);
