"use client";

import { useNavigate } from "@tanstack/react-router";
import { Ruler } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

import { useGrowthMeasurementList } from "#/hooks/use-growth.ts";
import { useListTableState } from "#/hooks/use-list-table-state.ts";

import { growthColumns } from "../columns/growth";
import { DataTable } from "../components/data-table";
import {
	FilterBar,
	TableEmptyState,
	TableErrorState,
	TablePageHeader,
	TablePaginationFooter
} from "./shared";

// ─── Types ──────────────────────────────────────────────────────────────────

const AGE_GROUP_FILTERS = [
	"All",
	"Newborn",
	"Infant",
	"Toddler",
	"Preschool",
	"School-Age",
	"Adolescent"
] as const;
type AgeGroupFilter = (typeof AGE_GROUP_FILTERS)[number];

const PERCENTILE_FILTERS = [
	"All",
	"Under 5th",
	"5th–95th",
	"Over 95th"
] as const;
type PercentileFilter = (typeof PERCENTILE_FILTERS)[number];

const PAGE_SIZE = 20;

function isAgeGroupFilter(value: string): value is AgeGroupFilter {
	return (AGE_GROUP_FILTERS as readonly string[]).includes(value);
}

function isPercentileFilter(value: string): value is PercentileFilter {
	return (PERCENTILE_FILTERS as readonly string[]).includes(value);
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface GrowthMeasurementsTableProps {
	/**
	 * When set, the table is scoped to a single patient:
	 *   - the query is filtered by `patientId`
	 *   - the global search bar is hidden (the patient is already the scope)
	 *   - "Record Measurement" pre-fills the patient on the new-form route
	 */
	patientId?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const GrowthMeasurementsTable: React.FC<
	GrowthMeasurementsTableProps
> = ({ patientId }) => {
	const navigate = useNavigate();
	const {
		searchInput,
		search,
		pageIndex,
		setPageIndex,
		handleSearchChange,
		resetPage
	} = useListTableState();

	const [ageGroupFilter, setAgeGroupFilter] = useState<AgeGroupFilter>("All");
	const [percentileFilter, setPercentileFilter] =
		useState<PercentileFilter>("All");

	const {
		data: result,
		isLoading,
		isError,
		error,
		refetch
	} = useGrowthMeasurementList({
		patientId,
		query: search || undefined,
		limit: PAGE_SIZE,
		offset: pageIndex * PAGE_SIZE
	});

	const measurements = result?.data ?? [];
	const total = result?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const hasFilters =
		Boolean(search) || ageGroupFilter !== "All" || percentileFilter !== "All";

	const handleOpenNew = useCallback(() => {
		void navigate({
			to: "/app/growth/new",
			search: patientId ? { patientId } : undefined
		});
	}, [navigate, patientId]);

	const handleClearFilters = useCallback(() => {
		handleSearchChange("");
		setAgeGroupFilter("All");
		setPercentileFilter("All");
		resetPage();
	}, [handleSearchChange, resetPage]);

	if (isError) {
		return (
			<TableErrorState
				entityName='growth measurements'
				message={error?.message}
				onRetry={refetch}
			/>
		);
	}

	const showEmptyState = !isLoading && measurements.length === 0;

	return (
		<div className='space-y-6 pb-12'>
			<TablePageHeader
				actionIcon={Ruler}
				actionLabel='Record Measurement'
				onAction={handleOpenNew}
				subtitle={
					patientId
						? "Growth tracking history for this patient"
						: "Track height, weight, BMI, and percentile trends"
				}
				title='Growth Measurements'
				total={total}
			/>

			<FilterBar
				filters={[
					{
						value: ageGroupFilter,
						onChange: v => {
							if (!isAgeGroupFilter(v)) return;
							setAgeGroupFilter(v);
							resetPage();
						},
						options: AGE_GROUP_FILTERS,
						allLabel: "All Age Groups"
					},
					{
						value: percentileFilter,
						onChange: v => {
							if (!isPercentileFilter(v)) return;
							setPercentileFilter(v);
							resetPage();
						},
						options: PERCENTILE_FILTERS,
						allLabel: "All Percentiles"
					}
				]}
				hasFilters={hasFilters}
				hideSearch={Boolean(patientId)}
				onClear={handleClearFilters}
				onSearchChange={handleSearchChange}
				searchPlaceholder='Search by patient, notes, or recorded by...'
				searchValue={searchInput}
			/>

			{showEmptyState ? (
				<TableEmptyState
					actionLabel='Record Measurement'
					emptyMessage={
						patientId
							? "Record this patient's first growth measurement to get started."
							: "Start recording growth measurements for your patients."
					}
					entityName='growth measurements'
					hasFilters={hasFilters}
					icon={Ruler}
					onAction={handleOpenNew}
				/>
			) : (
				<>
					<DataTable
						columns={growthColumns}
						data={measurements}
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
