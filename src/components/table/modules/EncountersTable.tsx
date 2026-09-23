"use client";

import { useNavigate } from "@tanstack/react-router";
import { FilePlus, Stethoscope } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

import { useEncounterList } from "#/hooks/use-encounters.ts";

import { encounterColumns } from "../columns/encounter";
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
	"Draft",
	"Completed",
	"Signed",
	"Amended"
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const VISIT_TYPE_FILTERS = [
	"All",
	"Well-Child Check",
	"Sick Visit",
	"Follow-Up",
	"Immunization Visit",
	"Consultation",
	"Lactation Consultation",
	"Emergency/Urgent",
	"Telehealth",
	"Other"
] as const;
type VisitTypeFilter = (typeof VISIT_TYPE_FILTERS)[number];

const PAGE_SIZE = 20;

function isStatusFilter(value: string): value is StatusFilter {
	return (STATUS_FILTERS as readonly string[]).includes(value);
}

function isVisitTypeFilter(value: string): value is VisitTypeFilter {
	return (VISIT_TYPE_FILTERS as readonly string[]).includes(value);
}

// ─── Component ──────────────────────────────────────────────────────────────

export const EncountersTable: React.FC = () => {
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
	const [visitTypeFilter, setVisitTypeFilter] =
		useState<VisitTypeFilter>("All");

	const {
		data: result,
		isLoading,
		isError,
		error,
		refetch
	} = useEncounterList({
		query: search || undefined,
		status: statusFilter === "All" ? undefined : statusFilter,
		visitType: visitTypeFilter === "All" ? undefined : visitTypeFilter,
		limit: PAGE_SIZE,
		offset: pageIndex * PAGE_SIZE
	});

	const encounters = result?.data ?? [];
	const total = result?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const hasFilters =
		Boolean(search) || statusFilter !== "All" || visitTypeFilter !== "All";

	const handleOpenNew = useCallback(() => {
		void navigate({ to: "/app/encounters/new" });
	}, [navigate]);

	const handleClearFilters = useCallback(() => {
		handleSearchChange("");
		setStatusFilter("All");
		setVisitTypeFilter("All");
		resetPage();
	}, [handleSearchChange, resetPage]);

	if (isError) {
		return (
			<TableErrorState
				entityName='encounters'
				message={error?.message}
				onRetry={refetch}
			/>
		);
	}

	const showEmptyState = !isLoading && encounters.length === 0;

	return (
		<div className='space-y-6 pb-12'>
			<TablePageHeader
				actionIcon={FilePlus}
				actionLabel='New Encounter'
				onAction={handleOpenNew}
				subtitle='Clinical visit records and SOAP notes'
				title='Encounters'
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
						value: visitTypeFilter,
						onChange: v => {
							if (!isVisitTypeFilter(v)) return;
							setVisitTypeFilter(v);
							resetPage();
						},
						options: VISIT_TYPE_FILTERS,
						allLabel: "All Visit Types"
					}
				]}
				hasFilters={hasFilters}
				onClear={handleClearFilters}
				onSearchChange={handleSearchChange}
				searchPlaceholder='Search by patient, complaint, or provider...'
				searchValue={searchInput}
			/>

			{showEmptyState ? (
				<TableEmptyState
					actionLabel='Start Encounter'
					emptyMessage='Start documenting clinical encounters.'
					entityName='encounters'
					hasFilters={hasFilters}
					icon={Stethoscope}
					onAction={handleOpenNew}
				/>
			) : (
				<>
					<DataTable
						columns={encounterColumns}
						data={encounters}
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
