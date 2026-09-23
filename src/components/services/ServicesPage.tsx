import { useSelector } from "@tanstack/react-store";
import {
	type CellContext,
	type ColumnDef,
	type HeaderContext,
	type SortingState,
	stockFeatures,
	useTable
} from "@tanstack/react-table";
import {
	Activity,
	ChevronDown,
	ChevronsUpDown,
	ChevronUp,
	CirclePause,
	CirclePlay,
	Clock,
	DollarSign,
	Filter,
	Plus,
	Search,
	X
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAppHotkeys } from "@/hooks/useHotkeys";
import { cn } from "@/lib/utils";

import { type ClinicService, servicesStore } from "../../lib/store/services";
import { useAppForm } from "../form";

// ─── Validation ───────────────────────────────────────────────────────────────

const serviceSchema = z.object({
	name: z.string().trim().min(2, "Name is required"),
	category: z.enum(["Consultation", "Diagnostics", "Prevention", "Procedure"]),
	duration: z.number().int().positive(),
	price: z.number().nonnegative()
});

// ─── Column types ─────────────────────────────────────────────────────────────

type TableFeatures = typeof stockFeatures;
type HeaderCtx = HeaderContext<TableFeatures, ClinicService>;
type CellCtx = CellContext<TableFeatures, ClinicService>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
	Consultation: "bg-blue-50 text-blue-700 border-blue-200",
	Diagnostics: "bg-purple-50 text-purple-700 border-purple-200",
	Prevention: "bg-emerald-50 text-emerald-700 border-emerald-200",
	Procedure: "bg-amber-50 text-amber-700 border-amber-200"
};

function SortHeader({ label, ctx }: { label: string; ctx: HeaderCtx }) {
	const sorted = ctx.column.getIsSorted();
	return (
		<button
			className='flex items-center gap-1 font-semibold hover:text-teal-700'
			onClick={() => ctx.column.toggleSorting()}
			type='button'
		>
			{label}
			{sorted === "asc" && <ChevronUp className='h-3.5 w-3.5' />}
			{sorted === "desc" && <ChevronDown className='h-3.5 w-3.5' />}
			{!sorted && <ChevronsUpDown className='h-3.5 w-3.5 opacity-50' />}
		</button>
	);
}

// ─── Column definitions ───────────────────────────────────────────────────────

const createColumns = (
	toggleStatus: (id: string) => void
): Array<ColumnDef<TableFeatures, ClinicService>> => [
	{
		id: "name",
		accessorFn: (row: ClinicService) => row.name,
		header: (ctx: HeaderCtx) => (
			<SortHeader
				ctx={ctx}
				label='Service'
			/>
		),
		cell: (ctx: CellCtx) => (
			<div>
				<p className='font-semibold text-slate-800'>{ctx.row.original.name}</p>
				<p className='text-slate-400 text-xs'>Pediatric care catalog</p>
			</div>
		),
		size: 250
	},
	{
		id: "category",
		accessorFn: (row: ClinicService) => row.category,
		header: (ctx: HeaderCtx) => (
			<SortHeader
				ctx={ctx}
				label='Category'
			/>
		),
		cell: (ctx: CellCtx) => {
			const { category } = ctx.row.original;
			return (
				<span
					className={cn(
						"rounded-full border px-3 py-1 font-semibold text-xs",
						CATEGORY_COLORS[category] ?? "bg-slate-50 text-slate-700"
					)}
				>
					{category}
				</span>
			);
		},
		size: 150
	},
	{
		id: "duration",
		accessorFn: (row: ClinicService) => row.duration,
		header: (ctx: HeaderCtx) => (
			<SortHeader
				ctx={ctx}
				label='Duration'
			/>
		),
		cell: (ctx: CellCtx) => (
			<span className='font-medium text-slate-700'>
				{ctx.row.original.duration} min
			</span>
		),
		size: 120
	},
	{
		id: "price",
		accessorFn: (row: ClinicService) => row.price,
		header: (ctx: HeaderCtx) => (
			<SortHeader
				ctx={ctx}
				label='Price'
			/>
		),
		cell: (ctx: CellCtx) => (
			<span className='font-bold text-slate-800'>
				${ctx.row.original.price.toFixed(2)}
			</span>
		),
		size: 120
	},
	{
		id: "status",
		accessorFn: (row: ClinicService) => row.status,
		header: (ctx: HeaderCtx) => (
			<SortHeader
				ctx={ctx}
				label='Status'
			/>
		),
		cell: (ctx: CellCtx) => {
			const { status } = ctx.row.original;
			return (
				<span
					className={cn(
						"rounded-full px-3 py-1 font-semibold text-[11px]",
						status === "Active"
							? "border border-emerald-200 bg-emerald-50 text-emerald-700"
							: "border border-slate-200 bg-slate-100 text-slate-500"
					)}
				>
					{status}
				</span>
			);
		},
		size: 120
	},
	{
		id: "actions",
		header: () => <span className='sr-only'>Actions</span>,
		cell: (ctx: CellCtx) => {
			const { original: service } = ctx.row;
			return (
				<button
					className='rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700'
					onClick={(e: React.MouseEvent) => {
						e.stopPropagation();
						toggleStatus(service.id);
						toast.success(
							`${service.name} ${service.status === "Active" ? "paused" : "activated"}`
						);
					}}
					title='Toggle service status'
					type='button'
				>
					{service.status === "Active" ? (
						<CirclePause className='h-4 w-4' />
					) : (
						<CirclePlay className='h-4 w-4 text-emerald-600' />
					)}
				</button>
			);
		},
		size: 80
	}
];

// ─── Main page ────────────────────────────────────────────────────────────────

export function ServicesPage() {
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("All");
	const [statusFilter, setStatusFilter] = useState("All");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
	const [isAdding, setIsAdding] = useState(false);

	const services = useSelector(servicesStore, state => state.services);

	const handleSearchChange = useCallback((value: string) => {
		setSearch(value);
		const timer = setTimeout(() => setDebouncedSearch(value), 300);
		return () => clearTimeout(timer);
	}, []);

	const toggleStatus = useCallback((id: string) => {
		servicesStore.setState(state => ({
			services: state.services.map(s =>
				s.id === id
					? { ...s, status: s.status === "Active" ? "Paused" : "Active" }
					: s
			)
		}));
	}, []);

	const filteredServices = useMemo(() => {
		let result = services;
		if (debouncedSearch) {
			const q = debouncedSearch.toLowerCase();
			result = result.filter(
				s =>
					s.name.toLowerCase().includes(q) ||
					s.category.toLowerCase().includes(q)
			);
		}
		if (categoryFilter !== "All") {
			result = result.filter(s => s.category === categoryFilter);
		}
		if (statusFilter !== "All") {
			result = result.filter(s => s.status === statusFilter);
		}
		return result;
	}, [services, debouncedSearch, categoryFilter, statusFilter]);

	const columns = useMemo(() => createColumns(toggleStatus), [toggleStatus]);

	const table = useTable({
		features: stockFeatures,
		data: filteredServices,
		columns,
		state: { sorting, pagination },
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		globalFilterFn: (row, _columnId, filterValue: string) => {
			const s = row.original;
			const q = filterValue.toLowerCase();
			return (
				s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
			);
		}
	});

	// Read pagination state from the table atom (same pattern as other table modules)
	const paginationState = useSelector(table.atoms.pagination) as {
		pageIndex: number;
		pageSize: number;
	};
	const { pageIndex, pageSize } = paginationState;

	useAppHotkeys({ onSubmitForm: () => setIsAdding(true) });

	const metrics = useMemo(() => {
		const active = services.filter(s => s.status === "Active").length;
		const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
		const avgPrice =
			services.length > 0
				? services.reduce((sum, s) => sum + s.price, 0) / services.length
				: 0;
		return { active, totalDuration, avgPrice };
	}, [services]);

	const pageCount = table.getPageCount();
	const hasFilters =
		Boolean(search) || categoryFilter !== "All" || statusFilter !== "All";

	return (
		<div className='space-y-6 pb-12'>
			{/* Header */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<p className='font-semibold text-teal-700 text-xs uppercase tracking-[0.2em]'>
						Operations
					</p>
					<h1 className='mt-1 font-bold text-3xl text-slate-900'>Services</h1>
					<p className='mt-1 max-w-2xl text-slate-500 text-sm'>
						Manage the care menu your team uses when scheduling pediatric visits
						and procedures.
					</p>
				</div>
				<Button
					className='flex items-center gap-2 self-start sm:self-auto'
					onClick={() => setIsAdding(true)}
				>
					<Plus className='h-4 w-4' />
					Add Service
				</Button>
			</div>

			{/* Metrics */}
			<div className='grid gap-4 sm:grid-cols-3'>
				<div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
					<div className='flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide'>
						<Activity className='size-4 text-teal-600' />
						Active Services
					</div>
					<p className='mt-3 font-bold text-2xl text-slate-900'>
						{metrics.active}
					</p>
					<p className='mt-1 text-slate-500 text-xs'>
						of {services.length} total
					</p>
				</div>
				<div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
					<div className='flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide'>
						<Clock className='size-4 text-teal-600' />
						Total Duration
					</div>
					<p className='mt-3 font-bold text-2xl text-slate-900'>
						{metrics.totalDuration} min
					</p>
					<p className='mt-1 text-slate-500 text-xs'>Across all services</p>
				</div>
				<div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
					<div className='flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide'>
						<DollarSign className='size-4 text-teal-600' />
						Average Price
					</div>
					<p className='mt-3 font-bold text-2xl text-slate-900'>
						${metrics.avgPrice.toFixed(0)}
					</p>
					<p className='mt-1 text-slate-500 text-xs'>Per service</p>
				</div>
			</div>

			{/* Filters */}
			<div className='space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs'>
				<div className='flex flex-col gap-3 md:flex-row'>
					<div className='relative flex-1'>
						<Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400' />
						<input
							className='w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-slate-800 text-xs focus:border-teal-500 focus:outline-hidden'
							onChange={e => handleSearchChange(e.target.value)}
							placeholder='Search by name or category…'
							type='text'
							value={search}
						/>
					</div>
					<div className='flex items-center gap-2'>
						<span className='flex items-center font-medium text-[11px] text-slate-400'>
							<Filter className='mr-1 h-3 w-3' /> Category:
						</span>
						<select
							className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-700 text-xs focus:border-teal-500 focus:outline-hidden'
							onChange={e => setCategoryFilter(e.target.value)}
							value={categoryFilter}
						>
							<option value='All'>All Categories</option>
							<option value='Consultation'>Consultation</option>
							<option value='Diagnostics'>Diagnostics</option>
							<option value='Prevention'>Prevention</option>
							<option value='Procedure'>Procedure</option>
						</select>
					</div>
					<div className='flex items-center gap-2'>
						<span className='flex items-center font-medium text-[11px] text-slate-400'>
							<Activity className='mr-1 h-3 w-3' /> Status:
						</span>
						<select
							className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-700 text-xs focus:border-teal-500 focus:outline-hidden'
							onChange={e => setStatusFilter(e.target.value)}
							value={statusFilter}
						>
							<option value='All'>All Status</option>
							<option value='Active'>Active</option>
							<option value='Paused'>Paused</option>
						</select>
					</div>
				</div>
			</div>

			{/* Empty state or table */}
			{filteredServices.length === 0 ? (
				<div className='rounded-2xl border border-slate-200 bg-white p-12 text-center'>
					<Activity className='mx-auto mb-3 h-12 w-12 text-slate-300' />
					<h3 className='font-bold text-base text-slate-700'>
						{hasFilters ? "No matching services" : "No services yet"}
					</h3>
					<p className='mx-auto mt-1 max-w-sm text-slate-500 text-xs'>
						{hasFilters
							? "Try adjusting your search or filter criteria."
							: "Add a new service to your pediatric care catalog."}
					</p>
					<Button
						className='mt-4'
						onClick={() => setIsAdding(true)}
					>
						<Plus className='mr-2 h-4 w-4' />
						Add Service
					</Button>
				</div>
			) : (
				<>
					<div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs'>
						<div className='overflow-x-auto'>
							<table className='w-full text-left text-sm'>
								<thead className='border-slate-200 border-b bg-slate-50 font-semibold text-[10px] text-slate-500 uppercase'>
									{table.getHeaderGroups().map(headerGroup => (
										<tr key={headerGroup.id}>
											{headerGroup.headers.map(header => (
												<th
													className='px-4 py-3 text-left'
													key={header.id}
													style={{ width: header.getSize() }}
												>
													{header.isPlaceholder
														? null
														: typeof header.column.columnDef.header ===
																"function"
															? header.column.columnDef.header(
																	header.getContext()
																)
															: header.column.columnDef.header}
												</th>
											))}
										</tr>
									))}
								</thead>
								<tbody className='divide-y divide-slate-100 text-slate-700'>
									{table.getRowModel().rows.map(row => (
										<tr
											className='transition-colors hover:bg-teal-50/40'
											key={row.id}
										>
											{row.getVisibleCells().map(cell => (
												<td
													className='px-4 py-3'
													key={cell.id}
												>
													{typeof cell.column.columnDef.cell === "function"
														? cell.column.columnDef.cell(cell.getContext())
														: cell.getValue<string>()}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{pageCount > 1 && (
						<div className='flex items-center justify-between border-slate-200 border-t pt-4 text-slate-500 text-xs'>
							<div className='flex items-center gap-2'>
								<span>
									Showing {pageIndex * pageSize + 1}–
									{Math.min(
										(pageIndex + 1) * pageSize,
										filteredServices.length
									)}{" "}
									of {filteredServices.length}
								</span>
								<select
									className='rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs'
									onChange={e => table.setPageSize(Number(e.target.value))}
									value={pageSize}
								>
									{[5, 10, 20, 50].map(size => (
										<option
											key={size}
											value={size}
										>
											{size} per page
										</option>
									))}
								</select>
							</div>
							<div className='flex items-center gap-1'>
								<button
									className='rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
									disabled={!table.getCanPreviousPage()}
									onClick={() => table.previousPage()}
									type='button'
								>
									Previous
								</button>
								<span className='px-3 py-1.5'>
									Page {pageIndex + 1} of {pageCount}
								</span>
								<button
									className='rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
									disabled={!table.getCanNextPage()}
									onClick={() => table.nextPage()}
									type='button'
								>
									Next
								</button>
							</div>
						</div>
					)}
				</>
			)}

			{isAdding ? (
				<ServiceForm
					onClose={() => setIsAdding(false)}
					onSuccess={() => {
						setIsAdding(false);
						toast.success("Service added successfully");
					}}
				/>
			) : null}
		</div>
	);
}

// ─── Service form modal ───────────────────────────────────────────────────────

function ServiceForm({
	onClose,
	onSuccess
}: {
	onClose: () => void;
	onSuccess?: () => void;
}) {
	const form = useAppForm({
		defaultValues: {
			name: "",
			category: "Consultation" as ClinicService["category"],
			duration: 30,
			price: 0
		},
		validators: { onChange: serviceSchema },
		onSubmit: async ({ value }) => {
			servicesStore.setState(state => ({
				services: [
					...state.services,
					{
						...value,
						id: `service-${Date.now()}`,
						status: "Active" as const
					}
				]
			}));
			toast.success("Service added to the catalog");
			onSuccess?.();
		}
	});

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm'
			onClick={e => {
				if (e.target === e.currentTarget) onClose();
			}}
			role='presentation'
		>
			<div
				className='w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl'
				role='dialog'
			>
				<div className='flex items-center justify-between border-slate-100 border-b px-5 py-4'>
					<div>
						<h2 className='font-bold text-slate-900'>Add Service</h2>
						<p className='text-slate-500 text-xs'>
							Create a schedulable clinic offering.
						</p>
					</div>
					<Button
						aria-label='Close'
						onClick={onClose}
						size='sm'
						type='button'
						variant='ghost'
					>
						<X className='h-4 w-4' />
					</Button>
				</div>

				<form.AppForm>
					<form.Form className='p-5'>
						<div className='space-y-4'>
							<form.TextField
								label='Service Name'
								name='name'
								placeholder='e.g., Asthma Review'
								required
							/>
							<form.SelectField
								label='Category'
								name='category'
								options={[
									{ label: "Consultation", value: "Consultation" },
									{ label: "Diagnostics", value: "Diagnostics" },
									{ label: "Prevention", value: "Prevention" },
									{ label: "Procedure", value: "Procedure" }
								]}
							/>
							<div className='grid gap-4 sm:grid-cols-2'>
								<form.TextField
									label='Duration (minutes)'
									min={1}
									name='duration'
									type='number'
								/>
								<form.TextField
									label='Price (USD)'
									min={0}
									name='price'
									step={0.01}
									type='number'
								/>
							</div>
						</div>
						<div className='mt-6 flex justify-end gap-2 border-slate-100 border-t pt-4'>
							<Button
								onClick={onClose}
								type='button'
								variant='outline'
							>
								Cancel
							</Button>
							<form.SubmitButton>Add Service</form.SubmitButton>
						</div>
					</form.Form>
				</form.AppForm>
			</div>
		</div>
	);
}
