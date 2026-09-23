"use client";

import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Plus } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

import { usePrescriptions } from "#/hooks/use-prescriptions.ts";

import {
	type PrescriptionRow,
	prescriptionColumns
} from "../columns/prescription";
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
	"Active",
	"Completed",
	"Discontinued",
	"Cancelled"
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const PAGE_SIZE = 20;

function isStatusFilter(value: string): value is StatusFilter {
	return (STATUS_FILTERS as readonly string[]).includes(value);
}

// ─── Component ──────────────────────────────────────────────────────────────

export const PrescriptionTable: React.FC = () => {
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

	const {
		data: result,
		isLoading,
		isError,
		error,
		refetch
	} = usePrescriptions({
		query: search || undefined,
		status: statusFilter === "All" ? undefined : statusFilter,
		limit: PAGE_SIZE,
		offset: pageIndex * PAGE_SIZE
	});

	const prescriptions = (result?.data ?? []) as PrescriptionRow[];
	const total = result?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const hasFilters = Boolean(search) || statusFilter !== "All";

	const handleOpenNew = useCallback(() => {
		void navigate({ to: "/app/prescriptions/new" });
	}, [navigate]);

	const handleClearFilters = useCallback(() => {
		handleSearchChange("");
		setStatusFilter("All");
		resetPage();
	}, [handleSearchChange, resetPage]);

	if (isError) {
		return (
			<TableErrorState
				entityName='prescriptions'
				message={error?.message}
				onRetry={refetch}
			/>
		);
	}

	const showEmptyState = !isLoading && prescriptions.length === 0;

	return (
		<div className='space-y-6 pb-12'>
			<TablePageHeader
				actionIcon={Plus}
				actionLabel='New Prescription'
				onAction={handleOpenNew}
				subtitle='Manage patient prescriptions and medication history'
				title='Prescriptions'
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
				onClear={handleClearFilters}
				onSearchChange={handleSearchChange}
				searchPlaceholder='Search by Rx #, patient, medication, or diagnosis...'
				searchValue={searchInput}
			/>

			{showEmptyState ? (
				<TableEmptyState
					actionLabel='New Prescription'
					emptyMessage='Create a new prescription to get started.'
					entityName='prescriptions'
					hasFilters={hasFilters}
					icon={AlertCircle}
					onAction={handleOpenNew}
				/>
			) : (
				<>
					<DataTable
						columns={prescriptionColumns}
						data={prescriptions}
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
