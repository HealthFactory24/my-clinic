"use client";

import { useNavigate } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

import { useLabOrderList } from "#/hooks/index.ts";
import { useListTableState } from "#/hooks/use-list-table-state.ts";

import { labColumns } from "../columns/labOrder";
import { DataTable } from "../components/data-table";
import {
	FilterBar,
	TableEmptyState,
	TableErrorState,
	TablePageHeader,
	TablePaginationFooter
} from "./shared";

// ─── Types ──────────────────────────────────────────────────────────────────

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

function isStatusFilter(value: string): value is StatusFilter {
	return (STATUS_FILTERS as readonly string[]).includes(value);
}

function isPriorityFilter(value: string): value is PriorityFilter {
	return (PRIORITY_FILTERS as readonly string[]).includes(value);
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface LabOrdersTableProps {
	/**
	 * When set, the table is scoped to a single patient:
	 *   - the query is filtered by `patientId`
	 *   - the global search bar is hidden (the patient is already the scope)
	 *   - "New Lab Order" pre-fills the patient on the new-form route
	 */
	patientId?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const LabOrdersTable: React.FC<LabOrdersTableProps> = ({
	patientId
}) => {
	const navigate = useNavigate();
	const {
		searchInput,
		search,
		pageIndex,
		setPageIndex,
		handleSearchChange,
		resetPage
	} = useListTableState();

	const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
	const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");

	const {
		data: result,
		isLoading,
		isError,
		error,
		refetch
	} = useLabOrderList({
		query: search || undefined,
		status: statusFilter === "All" ? undefined : statusFilter,
		priority: priorityFilter === "All" ? undefined : priorityFilter,
		patientId,
		limit: PAGE_SIZE,
		offset: pageIndex * PAGE_SIZE
	});

	const labOrders = result?.data ?? [];
	const total = result?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const hasFilters =
		Boolean(search) || statusFilter !== "All" || priorityFilter !== "All";

	const handleOpenNew = useCallback(() => {
		void navigate({
			to: "/app/labs/new",
			search: patientId ? { patientId } : undefined
		});
	}, [navigate, patientId]);

	const handleClearFilters = useCallback(() => {
		handleSearchChange("");
		setStatusFilter("All");
		setPriorityFilter("All");
		resetPage();
	}, [handleSearchChange, resetPage]);

	if (isError) {
		return (
			<TableErrorState
				entityName='lab orders'
				message={error?.message}
				onRetry={refetch}
			/>
		);
	}

	const showEmptyState = !isLoading && labOrders.length === 0;

	return (
		<div className='space-y-6 pb-12'>
			<TablePageHeader
				actionIcon={FlaskConical}
				actionLabel='New Lab Order'
				onAction={handleOpenNew}
				subtitle={
					patientId
						? "Laboratory orders for this patient"
						: "Order and track laboratory tests and results"
				}
				title='Lab Orders'
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
					},
					{
						value: priorityFilter,
						onChange: v => {
							if (!isPriorityFilter(v)) return;
							setPriorityFilter(v);
							resetPage();
						},
						options: PRIORITY_FILTERS,
						allLabel: "All Priorities"
					}
				]}
				hasFilters={hasFilters}
				hideSearch={Boolean(patientId)}
				onClear={handleClearFilters}
				onSearchChange={handleSearchChange}
				searchPlaceholder='Search by order #, patient, or test name...'
				searchValue={searchInput}
			/>

			{showEmptyState ? (
				<TableEmptyState
					actionLabel='Create Lab Order'
					emptyMessage={
						patientId
							? "Order this patient's first lab test to get started."
							: "Start ordering lab tests for your patients."
					}
					entityName='lab orders'
					hasFilters={hasFilters}
					icon={FlaskConical}
					onAction={handleOpenNew}
				/>
			) : (
				<>
					<DataTable
						columns={labColumns}
						data={labOrders}
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
};
