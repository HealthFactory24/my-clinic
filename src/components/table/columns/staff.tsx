import {
	actionsColumn,
	ROLE_OPTIONS,
	renderStatusBadge,
	selectColumn
} from "@/components/table/columns/shared";
import { Badge } from "@/components/ui/badge";
import type { Staff } from "@/lib/db/schema";

import { createAppColumnHelper } from "../table";

const staffHelper = createAppColumnHelper<Staff>();

export const staffColumns = staffHelper.columns([
	selectColumn(staffHelper),

	staffHelper.accessor("name", {
		id: "name",
		header: ({ header }) => <header.ColumnHeader title='Name' />,
		cell: ({ getValue, row }) => {
			const name = getValue();
			const staff = row.original;
			// oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- avatarColor is runtime data
			const avatarStyle = { backgroundColor: staff.avatarColor || "#6B7280" };
			return (
				<div className='flex items-center gap-3'>
					<div
						className='flex size-9 shrink-0 items-center justify-center rounded-full font-semibold text-sm text-white'
						style={avatarStyle}
					>
						{name
							.split(" ")
							.map(n => n[0])
							.join("")
							.toUpperCase()
							.slice(0, 2)}
					</div>
					<div>
						<div className='font-medium text-foreground'>{name}</div>
						<div className='text-muted-foreground text-xs'>{staff.title}</div>
					</div>
				</div>
			);
		},
		meta: { label: "Name", variant: "text" },
		size: 220
	}),

	staffHelper.accessor("email", {
		id: "email",
		header: ({ header }) => <header.ColumnHeader title='Email' />,
		cell: ({ getValue }) => <span className='text-sm'>{getValue()}</span>,
		meta: { label: "Email", variant: "text" },
		size: 200
	}),

	staffHelper.accessor("role", {
		id: "role",
		header: ({ header }) => <header.ColumnHeader title='Role' />,
		cell: ({ getValue }) => renderStatusBadge(getValue()),
		meta: {
			label: "Role",
			variant: "select",
			options: [...ROLE_OPTIONS]
		},
		size: 100
	}),

	staffHelper.accessor("specialty", {
		id: "specialty",
		header: ({ header }) => <header.ColumnHeader title='Specialty' />,
		cell: ({ getValue }) => (
			<span className='text-sm'>{getValue() || "—"}</span>
		),
		meta: { label: "Specialty", variant: "text" },
		size: 150
	}),

	staffHelper.accessor("isActive", {
		id: "isActive",
		header: ({ header }) => <header.ColumnHeader title='Status' />,
		cell: ({ getValue }) => (
			<Badge variant={getValue() ? "default" : "secondary"}>
				{getValue() ? "Active" : "Inactive"}
			</Badge>
		),
		meta: {
			label: "Status",
			variant: "select",
			options: [
				{ label: "Active", value: "true" },
				{ label: "Inactive", value: "false" }
			]
		},
		size: 100
	}),

	actionsColumn(staffHelper, row => `/app/staff/${row.id}`, { maxSize: 80 })
]);
