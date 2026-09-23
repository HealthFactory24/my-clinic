// oxlint-disable typescript/no-unsafe-type-assertion
// src/components/table/modules/StaffTable.tsx
"use client";

import { useNavigate } from "@tanstack/react-router";
import { UserPlus, Users } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";

import { useStaffList } from "#/hooks/use-staff.ts";
import type { Role } from "#/lib/auth/roles.ts";

import { staffColumns } from "../columns/staff";
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

const ROLE_FILTERS = ["All", "admin", "doctor", "staff", "patient"] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

const STATUS_FILTERS = ["All", "Active", "Inactive"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const PAGE_SIZE = 20;

function isRoleFilter(value: string): value is RoleFilter {
	return (ROLE_FILTERS as readonly string[]).includes(value);
}

function isStatusFilter(value: string): value is StatusFilter {
	return (STATUS_FILTERS as readonly string[]).includes(value);
}

const ROLE_LABELS: Record<RoleFilter, string> = {
	All: "All Roles",
	admin: "Administrator",
	doctor: "Doctor",
	staff: "Staff",
	patient: "Patient"
};

function formatRoleLabel(option: string): string {
	if (option in ROLE_LABELS) {
		return ROLE_LABELS[option as keyof typeof ROLE_LABELS];
	}
	return option;
}

function formatRoleColumnLabel(role: Role): string {
	return ROLE_LABELS[role] ?? role;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const StaffTable: React.FC = () => {
	const navigate = useNavigate();
	const {
		searchInput,
		search,
		pageIndex,
		setPageIndex,
		handleSearchChange,
		resetPage
	} = useListTableState();

	const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

	const isActive =
		statusFilter === "All" ? undefined : statusFilter === "Active";

	const {
		data: result,
		isLoading,
		isError,
		error,
		refetch
	} = useStaffList({
		search: search || undefined,
		role: roleFilter === "All" ? undefined : roleFilter,
		isActive,
		limit: PAGE_SIZE,
		offset: pageIndex * PAGE_SIZE
	});

	const staff = result?.data ?? [];
	const total = result?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const hasFilters =
		Boolean(search) || roleFilter !== "All" || statusFilter !== "All";

	const handleOpenNew = useCallback(() => {
		void navigate({ to: "/app/staff/new" });
	}, [navigate]);

	const handleClearFilters = useCallback(() => {
		handleSearchChange("");
		setRoleFilter("All");
		setStatusFilter("All");
		resetPage();
	}, [handleSearchChange, resetPage]);

	const handleRoleFilterChange = useCallback(
		(v: string) => {
			if (!isRoleFilter(v)) return;
			setRoleFilter(v);
			resetPage();
		},
		[resetPage]
	);

	const handleStatusFilterChange = useCallback(
		(v: string) => {
			if (!isStatusFilter(v)) return;
			setStatusFilter(v);
			resetPage();
		},
		[resetPage]
	);

	const handlePageChange = useCallback(
		(page: number) => {
			setPageIndex(page - 1);
		},
		[setPageIndex]
	);

	const filters = useMemo(
		() => [
			{
				value: roleFilter,
				onChange: handleRoleFilterChange,
				options: ROLE_FILTERS,
				allLabel: "All Roles",
				formatOption: formatRoleLabel
			},
			{
				value: statusFilter,
				onChange: handleStatusFilterChange,
				options: STATUS_FILTERS,
				allLabel: "All Status"
			}
		],
		[roleFilter, statusFilter, handleRoleFilterChange, handleStatusFilterChange]
	);

	if (isError) {
		return (
			<TableErrorState
				entityName='staff'
				message={error?.message}
				onRetry={refetch}
			/>
		);
	}

	const showEmptyState = !isLoading && staff.length === 0;

	return (
		<div className='space-y-6 pb-12'>
			<TablePageHeader
				actionIcon={UserPlus}
				actionLabel='Add Staff Member'
				onAction={handleOpenNew}
				subtitle='Manage doctors, nurses, administrators, and clinic personnel'
				title='Staff'
				total={total}
			/>

			<FilterBar
				filters={filters}
				hasFilters={hasFilters}
				onClear={handleClearFilters}
				onSearchChange={handleSearchChange}
				searchPlaceholder='Search by name, email, or title...'
				searchValue={searchInput}
			/>

			{showEmptyState ? (
				<TableEmptyState
					actionLabel='Add Staff Member'
					emptyMessage='Add your first staff member to get started.'
					entityName='staff'
					hasFilters={hasFilters}
					icon={Users}
					onAction={handleOpenNew}
				/>
			) : (
				<>
					<DataTable
						columns={staffColumns}
						data={staff}
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

// Keep `formatRoleColumnLabel` exported for column consumers that still need it.
export { formatRoleColumnLabel };

// requires: src/components/table/modules/shared/FilterBar.tsx — FilterConfig.formatOption must be typed as `(option: string) => string` (not a narrower union), OR FilterBarProps must be made generic over the option union so a `(option: Role) => string` formatter is assignable.
