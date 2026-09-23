"use client";

import { useNavigate } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

import { FilterBar } from "#/components/table/modules/shared/FilterBar.tsx";
import { TableEmptyState } from "#/components/table/modules/shared/TableEmptyState.tsx";
import { TableErrorState } from "#/components/table/modules/shared/TableErrorState.tsx";
import { TablePageHeader } from "#/components/table/modules/shared/TablePageHeader.tsx";
import { TablePaginationFooter } from "#/components/table/modules/shared/TablePaginationFooter.tsx";
import { useListTableState } from "#/hooks/use-list-table-state.ts";
import { usePatientList } from "#/hooks/use-patients.ts";

import { patientColumns } from "../columns/patient";
import { DataTable } from "../components/data-table";

// ─── Types ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ["All", "Active", "Inactive", "Archived"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const GENDER_FILTERS = ["All", "male", "female"] as const;
type GenderFilter = (typeof GENDER_FILTERS)[number];

const PAGE_SIZE = 20;

function isStatusFilter(value: string): value is StatusFilter {
	return (STATUS_FILTERS as readonly string[]).includes(value);
}

function isGenderFilter(value: string): value is GenderFilter {
	return (GENDER_FILTERS as readonly string[]).includes(value);
}

// ─── Component ──────────────────────────────────────────────────────────────

export const PatientsTable: React.FC = () => {
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
	const [genderFilter, setGenderFilter] = useState<GenderFilter>("All");

	const {
		data: result,
		isLoading,
		isError,
		error,
		refetch
	} = usePatientList({
		query: search || undefined,
		activeStatus: statusFilter === "All" ? undefined : statusFilter,
		gender: genderFilter === "All" ? undefined : genderFilter,
		limit: PAGE_SIZE,
		offset: pageIndex * PAGE_SIZE
	});

	const patients = result?.data ?? [];
	const total = result?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const hasFilters =
		Boolean(search) || statusFilter !== "All" || genderFilter !== "All";

	const handleOpenNew = useCallback(() => {
		void navigate({ to: "/app/patients/new" });
	}, [navigate]);

	const handleClearFilters = useCallback(() => {
		handleSearchChange("");
		setStatusFilter("All");
		setGenderFilter("All");
		resetPage();
	}, [handleSearchChange, resetPage]);

	if (isError) {
		return (
			<TableErrorState
				entityName='patients'
				message={error?.message}
				onRetry={refetch}
			/>
		);
	}

	const showEmptyState = !isLoading && patients.length === 0;

	return (
		<div className='space-y-6 pb-12'>
			{/* Header */}
			<TablePageHeader
				actionIcon={UserPlus}
				actionLabel='New Patient'
				onAction={handleOpenNew}
				subtitle='Manage patient records, demographics, and clinical history'
				title='Patients'
				total={total}
			/>

			{/* Filter bar */}
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
						value: genderFilter,
						onChange: v => {
							if (!isGenderFilter(v)) return;
							setGenderFilter(v);
							resetPage();
						},
						options: GENDER_FILTERS,
						allLabel: "All Genders",
						formatOption: g => g.charAt(0).toUpperCase() + g.slice(1)
					}
				]}
				hasFilters={hasFilters}
				onClear={handleClearFilters}
				onSearchChange={handleSearchChange}
				searchPlaceholder='Search by name, MRN, or guardian...'
				searchValue={searchInput}
			/>

			{/* Empty state */}
			{showEmptyState ? (
				<TableEmptyState
					actionLabel='Register Patient'
					emptyMessage='Register your first patient to get started.'
					entityName='patients'
					hasFilters={hasFilters}
					icon={UserPlus}
					onAction={handleOpenNew}
				/>
			) : (
				<>
					<DataTable
						columns={patientColumns}
						data={patients}
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
