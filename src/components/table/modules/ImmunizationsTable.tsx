"use client";

import { useNavigate } from "@tanstack/react-router";
import { ShieldPlus, Syringe } from "lucide-react";
import { useCallback, useState } from "react";

import { useImmunizationList } from "#/hooks/use-immunizations.ts";

import { immunizationColumns } from "../columns/immunization";
import { DataTable } from "../components/data-table";
import {
	FilterBar,
	TableEmptyState,
	TableErrorState,
	TablePageHeader,
	TablePaginationFooter,
	useListTableState
} from "./shared";

// ─── Types ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
	"All",
	"Administered",
	"Due",
	"Overdue",
	"Upcoming",
	"Deferred",
	"Refused"
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const PAGE_SIZE = 20;

function isStatusFilter(value: string): value is StatusFilter {
	return (STATUS_FILTERS as readonly string[]).includes(value);
}

/**
 * URL-level filter tokens. Distinct from `StatusFilter`: these are what the
 * dashboard passes via `?filter=...`, and they map to a seeded `StatusFilter`
 * on mount.
 */
export type ImmunizationsInitialFilter = "overdue" | "due-soon";

// ─── Props ──────────────────────────────────────────────────────────────────

interface ImmunizationsTableProps {
	/**
	 * When set, the table is scoped to a single patient:
	 *   - the query is filtered by `patientId`
	 *   - the global search bar is hidden (the patient is already the scope)
	 *   - "Record Immunization" pre-fills the patient on the new-form route
	 */
	patientId?: string;
	/**
	 * Seeds `statusFilter` on mount. Used when the dashboard links to
	 * `/app/immunizations?filter=overdue`. Note: because this only seeds
	 * `useState`'s initial value, a same-route navigation to a different
	 * `filter` (without unmounting) will NOT re-seed the filter. If that
	 * becomes a requirement, lift the filter state into the route's
	 * `validateSearch` and read it via `Route.useSearch()`.
	 */
	initialFilter?: ImmunizationsInitialFilter;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ImmunizationsTable({
	patientId,
	initialFilter
}: ImmunizationsTableProps) {
	const navigate = useNavigate();
	const {
		searchInput,
		search,
		pageIndex,
		setPageIndex,
		handleSearchChange,
		resetPage
	} = useListTableState();

	const [statusFilter, setStatusFilter] = useState<StatusFilter>(
		initialFilter === "overdue" ? "Overdue" : "All"
	);

	const {
		data: result,
		isLoading,
		isError,
		error,
		refetch
	} = useImmunizationList({
		query: search || undefined,
		status: statusFilter === "All" ? undefined : statusFilter,
		patientId,
		limit: PAGE_SIZE,
		offset: pageIndex * PAGE_SIZE
	});

	const immunizations = result?.data ?? [];
	const total = result?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const hasFilters = Boolean(search) || statusFilter !== "All";

	const handleOpenNew = useCallback(() => {
		void navigate({
			to: "/app/immunizations/new",
			// Requires `new.tsx`'s `validateSearch` to have an explicit
			// `: { patientId?: string }` return annotation so `search` is
			// optional when no patient is scoped. See the note below.
			search: patientId ? { patientId } : undefined
		});
	}, [navigate, patientId]);

	const handleClearFilters = useCallback(() => {
		handleSearchChange("");
		setStatusFilter("All");
		resetPage();
	}, [handleSearchChange, resetPage]);

	if (isError) {
		return (
			<TableErrorState
				entityName='immunizations'
				message={error?.message}
				onRetry={refetch}
			/>
		);
	}

	const showEmptyState = !isLoading && immunizations.length === 0;

	return (
		<div className='space-y-6 pb-12'>
			<TablePageHeader
				actionIcon={Syringe}
				actionLabel='Record Immunization'
				onAction={handleOpenNew}
				subtitle={
					patientId
						? "Vaccine history for this patient"
						: "Track vaccine schedules, administrations, and adverse reactions"
				}
				title='Immunizations'
				total={total}
			/>

			<FilterBar
				filters={[
					{
						value: statusFilter,
						onChange: v => {
							if (!isStatusFilter(v)) return;
							setStatusFilter(v);
							resetPage();
						},
						options: STATUS_FILTERS,
						allLabel: "All Status"
					}
				]}
				hasFilters={hasFilters}
				hideSearch={Boolean(patientId)}
				onClear={handleClearFilters}
				onSearchChange={handleSearchChange}
				searchPlaceholder='Search by vaccine, patient, or batch number...'
				searchValue={searchInput}
			/>

			{showEmptyState ? (
				<TableEmptyState
					actionLabel='Record Immunization'
					emptyMessage={
						patientId
							? "Record this patient's first immunization to get started."
							: "Start recording immunizations for your patients."
					}
					entityName='immunizations'
					hasFilters={hasFilters}
					icon={ShieldPlus}
					onAction={handleOpenNew}
				/>
			) : (
				<>
					<DataTable
						columns={immunizationColumns}
						data={immunizations}
						error={null}
						isLoading={isLoading}
						manualPagination
						onPageChange={page => setPageIndex(page - 1)}
						pageCount={pageCount}
						pageIndex={pageIndex}
						pageSize={PAGE_SIZE}
						refetch={refetch}
					/>

					<TablePaginationFooter
						onPageChange={setPageIndex}
						pageCount={pageCount}
						pageIndex={pageIndex}
						pageSize={PAGE_SIZE}
						total={total}
					/>
				</>
			)}
		</div>
	);
}
