import { Link } from "@tanstack/react-router";
import {
	EllipsisVerticalIcon,
	FileTextIcon,
	PencilIcon,
	TrashIcon,
	UserIcon
} from "lucide-react";

import { DataTable } from "@/components/table/components/data-table";
import { createAppColumnHelper } from "@/components/table/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// ─────────────────────────────────────────────────────────────
// Row type — rename to match your clinic domain
// ─────────────────────────────────────────────────────────────

export type TransactionRow = {
	id: string;
	avatar?: string;
	avatarFallback: string;
	name: string;
	email: string;
	amount: number;
	/** Clinic statuses: pending → scheduled → checked-in → completed */
	status: "pending" | "processing" | "paid" | "failed";
	paidBy: "mastercard" | "visa";
	/** Optional: link to patient/encounter */
	patientId?: string;
};

// ─────────────────────────────────────────────────────────────
// Column helper
// ─────────────────────────────────────────────────────────────

const columnHelper = createAppColumnHelper<TransactionRow>();

export const columns = columnHelper.columns([
	columnHelper.accessor("name", {
		header: "Patient",
		cell: ({ row }) => (
			<div className='flex items-center gap-2'>
				<Avatar className='size-9'>
					<AvatarImage
						alt={row.original.name}
						src={row.original.avatar}
					/>
					<AvatarFallback className='text-xs'>
						{row.original.avatarFallback}
					</AvatarFallback>
				</Avatar>
				<div className='flex flex-col text-sm'>
					<span className='font-medium text-card-foreground'>
						{row.getValue("name")}
					</span>
					<span className='text-muted-foreground'>{row.original.email}</span>
				</div>
			</div>
		)
	}),

	columnHelper.accessor("amount", {
		header: "Amount",
		cell: ({ row }) => {
			const amount = Number.parseFloat(String(row.getValue("amount")));
			const formatted = new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "USD"
			}).format(amount);
			return <span className='tabular-nums'>{formatted}</span>;
		}
	}),

	columnHelper.accessor("status", {
		header: "Status",
		cell: ({ row }) => (
			<Badge className='h-auto rounded-sm bg-primary/10 px-1.5 text-primary capitalize'>
				{row.getValue("status")}
			</Badge>
		)
	}),

	columnHelper.accessor("paidBy", {
		header: () => <span className='w-fit'>Paid by</span>,
		cell: ({ row }) => (
			<img
				alt='Payment platform'
				className='w-10.5'
				src={
					row.getValue("paidBy") === "mastercard"
						? "https://cdn.shadcnstudio.com/ss-assets/blocks/data-table/image-1.png"
						: "https://cdn.shadcnstudio.com/ss-assets/blocks/data-table/image-2.png"
				}
			/>
		)
	}),

	columnHelper.display({
		id: "actions",
		header: () => <span className='sr-only'>Actions</span>,
		size: 60,
		enableHiding: false,
		cell: ({ row }) => <RowActions row={row.original} />
	})
]);

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

const TransactionDatatable = ({ data }: { data: TransactionRow[] }) => {
	return (
		<DataTable
			columns={columns}
			data={data}
			// Toolbar, filters, sorting, column visibility, pagination —
			// all handled internally by your <DataTable />
			pageSize={5}
		/>
	);
};

export default TransactionDatatable;

// ─────────────────────────────────────────────────────────────
// Row actions — uses `render` (Base UI), not `asChild` (Radix)
// ─────────────────────────────────────────────────────────────

function RowActions({ row }: { row: TransactionRow }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label='Open row actions'
					size='icon'
					variant='ghost'
				/>

				<EllipsisVerticalIcon
					aria-hidden='true'
					className='size-5'
				/>
			</DropdownMenuTrigger>

			<DropdownMenuContent align='end'>
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link
							params={{ patientId: row.patientId ?? row.id }}
							to='/app/patients/$patientId'
						/>

						<UserIcon className='size-4' />
						<span>View patient</span>
					</DropdownMenuItem>

					<DropdownMenuItem asChild>
						<Link
							search={{ patientId: row.patientId }}
							to='/app/encounters/new'
						/>

						<FileTextIcon className='size-4' />
						<span>New encounter</span>
					</DropdownMenuItem>

					<DropdownMenuItem>
						<PencilIcon className='size-4' />
						<span>Edit</span>
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					onSelect={() => {
						// TODO: wire to useDeleteTransaction / useDeletePatient
					}}
					variant='destructive'
				>
					<TrashIcon className='size-4' />
					<span>Delete</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
