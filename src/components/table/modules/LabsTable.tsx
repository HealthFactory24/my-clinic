"use client";

import { useNavigate } from "@tanstack/react-router";
import {
	AlertCircle,
	ChevronLeft,
	ChevronRight,
	FlaskRound,
	Search,
	X
} from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";

import { useLabOrderList } from "#/hooks/use-labs.ts";
import { useDebounce } from "@/hooks/use-debounce";

import { labColumns } from "../columns/labOrder";
import { DataTable } from "../components/data-table";

/* ------------------------------------------------------------------ */
/* Filter option tables                                                */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS = [
	"All",
	"Ordered",
	"Sample Collected",
	"Processing",
	"Completed",
	"Cancelled"
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const PRIORITY_FILTERS = ["All", "Routine", "Urgent", "Stat"] as const;
type PriorityFilter = (typeof PRIORITY_FILTERS)[number];

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/* Type guards — replace unsafe `as` casts on <select> values          */
/* ------------------------------------------------------------------ */

function isStatusFilter(value: string): value is StatusFilter {
	return (STATUS_FILTERS as readonly string[]).includes(value);
}

function isPriorityFilter(value: string): value is PriorityFilter {
	return (PRIORITY_FILTERS as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface LabsTableProps {
	/** When set, the table is scoped to a single patient. */
	patientId?: string;
}

export const LabsTable: React.FC<LabsTableProps> = ({ patientId }) => {
	const navigate = useNavigate();

	const [searchInput, setSearchInput] = useState("");
	const search = useDebounce(searchInput, 300);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
	const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");
	const [pageIndex, setPageIndex] = useState(0);

	/* -------------------------------------------------------------- */
	/* Query params — memoized so the query key is stable across      */
	/* re-renders that don't change the actual filters.               */
	/* -------------------------------------------------------------- */

	const queryParams = useMemo(
		() => ({
			query: search || undefined,
			status: statusFilter === "All" ? undefined : statusFilter,
			priority: priorityFilter === "All" ? undefined : priorityFilter,
			patientId,
			limit: PAGE_SIZE,
			offset: pageIndex * PAGE_SIZE
		}),
		[search, statusFilter, priorityFilter, patientId, pageIndex]
	);

	const {
		data: result,
		isLoading,
		isError,
		error,
		refetch
	} = useLabOrderList(queryParams);

	// oxlint-disable-next-line react-perf/jsx-no-new-array-as-prop
	const labOrders = result?.data ?? [];
	const total = result?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const hasFilters =
		Boolean(search) || statusFilter !== "All" || priorityFilter !== "All";

	/* -------------------------------------------------------------- */
	/* Callbacks — all stable so child components don't re-render     */
	/* just because the parent did.                                   */
	/* -------------------------------------------------------------- */

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearchInput(e.target.value);
			setPageIndex(0);
		},
		[]
	);

	const handleClearSearch = useCallback(() => {
		setSearchInput("");
		setPageIndex(0);
	}, []);

	const handleStatusChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const value = e.target.value;
			if (!isStatusFilter(value)) return;
			setStatusFilter(value);
			setPageIndex(0);
		},
		[]
	);

	const handlePriorityChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const value = e.target.value;
			if (!isPriorityFilter(value)) return;
			setPriorityFilter(value);
			setPageIndex(0);
		},
		[]
	);

	const handleClearFilters = useCallback(() => {
		setSearchInput("");
		setStatusFilter("All");
		setPriorityFilter("All");
		setPageIndex(0);
	}, []);

	const handleNewLabOrder = useCallback(() => {
		void navigate({
			to: "/app/labs/new",
			search: patientId ? { patientId } : undefined
		});
	}, [navigate, patientId]);

	const handleRetry = useCallback(() => {
		void refetch();
	}, [refetch]);

	const handlePreviousPage = useCallback(() => {
		setPageIndex(p => Math.max(0, p - 1));
	}, []);

	const handleNextPage = useCallback(() => {
		setPageIndex(p => Math.min(pageCount - 1, p + 1));
	}, [pageCount]);

	const handlePageChange = useCallback((page: number) => {
		setPageIndex(page - 1);
	}, []);

	/* -------------------------------------------------------------- */
	/* Error state                                                     */
	/* -------------------------------------------------------------- */

	if (isError) {
		return (
			<div className='rounded-2xl border border-rose-200 bg-rose-50 p-12 text-center'>
				<AlertCircle className='mx-auto mb-3 size-10 text-rose-500' />
				<div className='font-bold text-rose-700 text-sm'>
					Error loading lab orders
				</div>
				<p className='mt-1 text-rose-600 text-xs'>{error?.message}</p>
				<button
					className='mt-4 rounded-xl bg-teal-600 px-4 py-2 font-bold text-white text-xs'
					onClick={handleRetry}
					type='button'
				>
					Retry
				</button>
			</div>
		);
	}

	const showEmptyState = !isLoading && labOrders.length === 0;

	/* -------------------------------------------------------------- */
	/* Render                                                          */
	/* -------------------------------------------------------------- */

	return (
		<div className='space-y-6 pb-12'>
			<header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<div className='flex items-center gap-2'>
						<h1 className='font-bold text-2xl text-slate-800'>Lab Orders</h1>
						<span className='rounded-full bg-teal-100 px-2.5 py-0.5 font-bold text-teal-800 text-xs'>
							{total} total
						</span>
					</div>
					<p className='mt-0.5 text-slate-500 text-xs'>
						{patientId
							? "Laboratory orders for this patient"
							: "Manage laboratory orders and track results"}
					</p>
				</div>

				<button
					className='flex items-center gap-2 self-start rounded-xl bg-teal-600 px-4 py-2.5 font-bold text-white text-xs shadow-xs transition-colors hover:bg-teal-700 sm:self-auto'
					onClick={handleNewLabOrder}
					type='button'
				>
					<FlaskRound className='size-4' />
					New Lab Order
				</button>
			</header>

			<section className='space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs'>
				<div className='flex flex-col gap-3 md:flex-row'>
					{!patientId && (
						<div className='relative flex-1'>
							<Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400' />
							<input
								className='w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-10 pl-9 text-slate-800 text-xs focus:border-teal-500 focus:outline-hidden'
								onChange={handleSearchChange}
								placeholder='Search by order #, patient, or indication...'
								type='search'
								value={searchInput}
							/>
							{searchInput ? (
								<button
									aria-label='Clear search'
									className='absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600'
									onClick={handleClearSearch}
									type='button'
								>
									<X className='size-4' />
								</button>
							) : null}
						</div>
					)}

					<select
						className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700 text-xs focus:border-teal-500 focus:outline-hidden'
						onChange={handleStatusChange}
						value={statusFilter}
					>
						{STATUS_FILTERS.map(s => (
							<option
								key={s}
								value={s}
							>
								{s === "All" ? "All Status" : s}
							</option>
						))}
					</select>

					<select
						className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700 text-xs focus:border-teal-500 focus:outline-hidden'
						onChange={handlePriorityChange}
						value={priorityFilter}
					>
						{PRIORITY_FILTERS.map(p => (
							<option
								key={p}
								value={p}
							>
								{p === "All" ? "All Priorities" : p}
							</option>
						))}
					</select>

					{hasFilters ? (
						<button
							className='rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-600 text-xs transition-colors hover:bg-slate-50'
							onClick={handleClearFilters}
							type='button'
						>
							Clear
						</button>
					) : null}
				</div>
			</section>

			{showEmptyState ? (
				<div className='rounded-2xl border border-slate-300 border-dashed bg-white p-12 text-center'>
					<FlaskRound className='mx-auto mb-3 size-10 text-slate-300' />
					<h3 className='font-bold text-slate-700 text-sm'>
						{hasFilters ? "No matching lab orders" : "No lab orders yet"}
					</h3>
					<p className='mx-auto mt-1 max-w-sm text-slate-500 text-xs'>
						{hasFilters
							? "Try adjusting your search or filter criteria."
							: "Create a lab order to get started."}
					</p>
				</div>
			) : (
				<>
					<DataTable
						columns={labColumns}
						data={labOrders}
						error={null}
						isLoading={isLoading}
						manualPagination
						onPageChange={handlePageChange}
						pageCount={pageCount}
						pageIndex={pageIndex}
						pageSize={PAGE_SIZE}
						refetch={refetch}
					/>

					{pageCount > 1 ? (
						<nav className='flex items-center justify-between border-slate-200 border-t pt-4 text-slate-500 text-xs'>
							<span>
								Showing {pageIndex * PAGE_SIZE + 1}–
								{Math.min((pageIndex + 1) * PAGE_SIZE, total)} of {total}
							</span>
							<div className='flex items-center gap-2'>
								<button
									className='rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
									disabled={pageIndex === 0}
									onClick={handlePreviousPage}
									type='button'
								>
									<ChevronLeft className='size-3.5' />
								</button>
								<span>
									Page {pageIndex + 1} of {pageCount}
								</span>
								<button
									className='rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
									disabled={pageIndex >= pageCount - 1}
									onClick={handleNextPage}
									type='button'
								>
									<ChevronRight className='size-3.5' />
								</button>
							</div>
						</nav>
					) : null}
				</>
			)}
		</div>
	);
};
