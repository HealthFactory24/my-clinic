import {
	actionsColumn,
	LAB_PRIORITY_OPTIONS,
	LAB_STATUS_OPTIONS,
	renderDate,
	renderStatusBadge,
	selectColumn
} from "@/components/table/columns/shared";
import { Badge } from "@/components/ui/badge";
import type { LabOrder, Patient, Staff } from "@/lib/db/schema";

import { createAppColumnHelper } from "../table";

type FullLabOrder = LabOrder & { patient: Patient; staff: Staff };

const labHelper = createAppColumnHelper<FullLabOrder>();

export const labColumns = labHelper.columns([
	selectColumn(labHelper),

	labHelper.accessor("orderNumber", {
		id: "orderNumber",
		header: ({ header }) => <header.ColumnHeader title='Order #' />,
		cell: ({ getValue }) => (
			<span className='font-mono text-sm'>{getValue()}</span>
		),
		meta: { label: "Order Number", variant: "text" },
		size: 120
	}),

	labHelper.accessor("patient", {
		id: "patient",
		header: ({ header }) => <header.ColumnHeader title='Patient' />,
		cell: ({ getValue }) => {
			const patient = getValue();
			if (!patient) return <span className='text-muted-foreground'>—</span>;
			return (
				<span>
					{patient.firstName} {patient.lastName}
				</span>
			);
		},
		meta: { label: "Patient", variant: "text" },
		size: 180
	}),

	labHelper.accessor("testsJson", {
		id: "tests",
		header: ({ header }) => <header.ColumnHeader title='Tests' />,
		cell: ({ getValue }) => {
			const tests = getValue();
			if (!tests.length)
				return <span className='text-muted-foreground'>—</span>;
			return (
				<div className='flex flex-wrap gap-1'>
					{tests.slice(0, 2).map(test => (
						<Badge
							className='text-[10px]'
							key={test.testName}
							variant='outline'
						>
							{test.testName}
						</Badge>
					))}
					{tests.length > 2 && (
						<Badge
							className='text-[10px]'
							variant='secondary'
						>
							+{tests.length - 2}
						</Badge>
					)}
				</div>
			);
		},
		meta: { label: "Tests", variant: "text" },
		size: 180
	}),

	labHelper.accessor("priority", {
		id: "priority",
		header: ({ header }) => <header.ColumnHeader title='Priority' />,
		cell: ({ getValue }) => {
			const priority = getValue();
			const variants: Record<string, "secondary" | "destructive" | "outline"> =
				{
					Routine: "secondary",
					Urgent: "outline",
					Stat: "destructive"
				};
			return (
				<Badge variant={variants[priority] ?? "secondary"}>{priority}</Badge>
			);
		},
		meta: {
			label: "Priority",
			variant: "select",
			options: [...LAB_PRIORITY_OPTIONS]
		},
		size: 100
	}),

	labHelper.accessor("status", {
		id: "status",
		header: ({ header }) => <header.ColumnHeader title='Status' />,
		cell: ({ getValue }) => renderStatusBadge(getValue()),
		meta: {
			label: "Status",
			variant: "select",
			options: [...LAB_STATUS_OPTIONS]
		},
		size: 130
	}),

	labHelper.accessor("orderDate", {
		id: "orderDate",
		header: ({ header }) => <header.ColumnHeader title='Order Date' />,
		cell: ({ getValue }) => renderDate(getValue()),
		meta: { label: "Order Date", variant: "date" },
		size: 120
	}),

	actionsColumn(labHelper, row => `/app/labs/${row.id}`, { maxSize: 80 })
]);
