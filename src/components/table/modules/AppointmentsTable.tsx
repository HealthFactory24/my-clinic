"use client";

import { useNavigate } from "@tanstack/react-router";
import { CalendarPlus } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";

import { useAppointmentList } from "#/hooks/use-appointments.ts";
import { useListTableState } from "#/hooks/use-list-table-state.ts";

import { appointmentColumns } from "../columns/appointment";
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
	"Scheduled",
	"Checked In",
	"In Progress",
	"Completed",
	"Cancelled",
	"No Show"
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const DATE_RANGE_FILTERS = ["All", "Today", "Upcoming", "Past"] as const;
type DateRangeFilter = (typeof DATE_RANGE_FILTERS)[number];

const PAGE_SIZE = 20;

function isStatusFilter(value: string): value is StatusFilter {
	return (STATUS_FILTERS as readonly string[]).includes(value);
}

function isDateRangeFilter(value: string): value is DateRangeFilter {
	return (DATE_RANGE_FILTERS as readonly string[]).includes(value);
}

function getDateRange(range: DateRangeFilter): {
	startDate?: Date;
	endDate?: Date;
} {
	const now = new Date();

	switch (range) {
		case "Today": {
			const start = new Date(now);
			start.setHours(0, 0, 0, 0);
			const end = new Date(now);
			end.setHours(23, 59, 59, 999);
			return { startDate: start, endDate: end };
		}
		case "Upcoming": {
			const start = new Date(now);
			start.setHours(0, 0, 0, 0);
			return { startDate: start };
		}
		case "Past": {
			const end = new Date(now);
			end.setHours(0, 0, 0, 0);
			return { endDate: end };
		}
		default:
			return {};
	}
}

// ─── Component ──────────────────────────────────────────────────────────────

export const AppointmentsTable: React.FC = () => {
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
	const [dateRangeFilter, setDateRangeFilter] =
		useState<DateRangeFilter>("All");

	const {
		data: result,
		isLoading,
		isError,
		error,
		refetch
	} = useAppointmentList({
		query: search || undefined,
		status: statusFilter === "All" ? undefined : statusFilter,
		...getDateRange(dateRangeFilter),
		limit: PAGE_SIZE,
		offset: pageIndex * PAGE_SIZE
	});

	const appointments = result?.data ?? [];
	const total = result?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const hasFilters =
		Boolean(search) || statusFilter !== "All" || dateRangeFilter !== "All";

	const handleOpenNew = useCallback(() => {
		void navigate({ to: "/app/appointments/new" });
	}, [navigate]);

	const handlePageChange = useCallback(
		(page: number) => setPageIndex(page - 1),
		[setPageIndex]
	);

	const handleClearFilters = useCallback(() => {
		handleSearchChange("");
		setStatusFilter("All");
		setDateRangeFilter("All");
		resetPage();
	}, [handleSearchChange, resetPage]);

	if (isError) {
		return (
			<TableErrorState
				entityName='appointments'
				message={error?.message}
				onRetry={refetch}
			/>
		);
	}

	const showEmptyState = !isLoading && appointments.length === 0;

	return (
		<div className='space-y-6 pb-12'>
			<TablePageHeader
				actionIcon={CalendarPlus}
				actionLabel='New Appointment'
				onAction={handleOpenNew}
				subtitle='Schedule and manage patient appointments'
				title='Appointments'
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
						value: dateRangeFilter,
						onChange: v => {
							if (!isDateRangeFilter(v)) return;
							setDateRangeFilter(v);
							resetPage();
						},
						options: DATE_RANGE_FILTERS,
						allLabel: "All Dates"
					}
				]}
				hasFilters={hasFilters}
				onClear={handleClearFilters}
				onSearchChange={handleSearchChange}
				searchPlaceholder='Search by patient, provider, or notes...'
				searchValue={searchInput}
			/>

			{showEmptyState ? (
				<TableEmptyState
					actionLabel='Schedule Appointment'
					emptyMessage='Schedule your first appointment to get started.'
					entityName='appointments'
					hasFilters={hasFilters}
					icon={CalendarPlus}
					onAction={handleOpenNew}
				/>
			) : (
				<>
					<DataTable
						columns={appointmentColumns}
						data={appointments}
						error={null}
						isLoading={isLoading}
						manualPagination
						onPageChange={handlePageChange}
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
