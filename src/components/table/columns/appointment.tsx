import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	APPOINTMENT_STATUS_OPTIONS,
	actionsColumn,
	type BadgeVariant,
	renderDate,
	renderPatientName,
	renderStatusBadge,
	selectColumn,
	VISIT_TYPE_OPTIONS
} from "@/components/table/columns/shared";
import type { Appointment, Patient, Staff } from "@/lib/db/schema";

import { createAppColumnHelper } from "../table";

type FullAppointment = Appointment & { patient: Patient; staff?: Staff };

const appointmentStatusVariants: Record<string, BadgeVariant> = {
	Scheduled: "default",
	"Checked In": "secondary",
	"In Progress": "default",
	Completed: "outline",
	Cancelled: "destructive",
	"No Show": "destructive"
};

const appointmentHelper = createAppColumnHelper<FullAppointment>();

export const appointmentColumns = appointmentHelper.columns([
	selectColumn(appointmentHelper),

	appointmentHelper.accessor("startTime", {
		id: "startTime",
		header: ({ header }) => <header.ColumnHeader title='Date/Time' />,
		cell: ({ getValue }) => renderDate(getValue(), true),
		meta: { label: "Date/Time", variant: "date" },
		size: 160
	}),

	appointmentHelper.accessor("endTime", {
		id: "endTime",
		header: ({ header }) => <header.ColumnHeader title='End Time' />,
		cell: ({ getValue }) => renderDate(getValue(), true),
		meta: { label: "End Time", variant: "date" },
		size: 140
	}),

	appointmentHelper.accessor("patient", {
		id: "patient",
		header: ({ header }) => <header.ColumnHeader title='Patient' />,
		cell: ({ getValue }) => {
			const patient = getValue();
			if (!patient) return <span className='text-muted-foreground'>—</span>;
			return renderPatientName(patient);
		},
		meta: { label: "Patient", variant: "text" },
		size: 260
	}),

	appointmentHelper.accessor("staff", {
		id: "staff",
		header: ({ header }) => <header.ColumnHeader title='Provider' />,
		cell: ({ getValue }) => {
			const staff = getValue();
			return staff ? (
				<div className='flex items-center gap-2'>
					<span className='font-medium text-sm'>{staff.name}</span>
					<Badge
						className='text-[10px]'
						variant='outline'
					>
						{staff.role}
					</Badge>
				</div>
			) : (
				<span className='text-muted-foreground text-sm'>—</span>
			);
		},
		meta: { label: "Provider", variant: "select" },
		size: 180
	}),

	appointmentHelper.accessor("type", {
		id: "type",
		header: ({ header }) => <header.ColumnHeader title='Type' />,
		cell: ({ getValue }) => <span className='text-sm'>{getValue()}</span>,
		meta: {
			label: "Type",
			variant: "select",
			options: [...VISIT_TYPE_OPTIONS]
		},
		size: 140
	}),

	appointmentHelper.accessor("status", {
		id: "status",
		header: ({ header }) => <header.ColumnHeader title='Status' />,
		cell: ({ getValue }) =>
			renderStatusBadge(getValue(), appointmentStatusVariants),
		meta: {
			label: "Status",
			variant: "select",
			options: [...APPOINTMENT_STATUS_OPTIONS]
		},
		size: 120
	}),

	actionsColumn<FullAppointment>(
		appointmentHelper,
		row => `/app/appointments/${row.id}`,
		{
			label: "View",
			maxSize: 120,
			// "More" button alongside the primary link
			renderExtra: () => (
				<Button
					className='size-8 p-0'
					size='sm'
					variant='ghost'
				>
					<span className='sr-only'>More</span>
				</Button>
			)
		}
	)
]);
