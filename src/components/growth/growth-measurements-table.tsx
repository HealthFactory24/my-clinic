// src/components/growth/growth-measurements-table.tsx
"use client";

import { useNavigate } from "@tanstack/react-router";
import { Plus, RefreshCw, Ruler, Search } from "lucide-react";
import { useCallback, useState } from "react";

import {
	DataTable,
	DataTableEmptyState,
	DataTableLoading
} from "#/components/table/index.ts";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { useGrowthMeasurementList } from "#/hooks/use-growth.ts";
import type { AgeGroup, PercentileBand } from "#/utils/growth-utils.ts";

import { growthColumns } from "./columns.tsx";

const AGE_GROUP_OPTIONS: ReadonlyArray<{
	value: AgeGroup | "all";
	label: string;
}> = [
	{ value: "all", label: "All ages" },
	{ value: "Newborn", label: "Newborn (0–1m)" },
	{ value: "Infant", label: "Infant (1–12m)" },
	{ value: "Toddler", label: "Toddler (1–3y)" },
	{ value: "Preschool", label: "Preschool (3–6y)" },
	{ value: "School-Age", label: "School age (6–12y)" },
	{ value: "Adolescent", label: "Adolescent (12–20y)" }
];

const PERCENTILE_OPTIONS: ReadonlyArray<{
	value: PercentileBand | "all";
	label: string;
}> = [
	{ value: "all", label: "All percentiles" },
	{ value: "severe-low", label: "< 3rd (flagged)" },
	{ value: "low", label: "3rd – 15th" },
	{ value: "normal", label: "15th – 85th" },
	{ value: "high", label: "85th – 97th" },
	{ value: "severe-high", label: "> 97th (flagged)" }
];

const PAGE_SIZE = 20;

interface GrowthMeasurementsTableProps {
	/** When set, the table is scoped to a single patient. */
	patientId?: string;
	/** Compact mode for embedding inside a patient detail page. */
	compact?: boolean;
}

export function GrowthMeasurementsTable({
	patientId,
	compact = false
}: GrowthMeasurementsTableProps) {
	const navigate = useNavigate();

	const [searchInput, setSearchInput] = useState("");
	const [pageIndex, setPageIndex] = useState(0);
	const [ageGroup, setAgeGroup] = useState<AgeGroup | "all">("all");
	const [percentileBand, setPercentileBand] = useState<PercentileBand | "all">(
		"all"
	);

	// ─── Server-side filter params ──────────────────────────────────────────
	// These map 1:1 to `useGrowthMeasurementList`'s option shape. Every
	// filter below is a real filter — no decorative UI.

	const {
		data: result,
		isLoading,
		isError,
		error,
		refetch
	} = useGrowthMeasurementList({
		patientId,
		query: searchInput.trim() || undefined,
		ageGroup: ageGroup === "all" ? undefined : ageGroup,
		percentileBand: percentileBand === "all" ? undefined : percentileBand,
		limit: PAGE_SIZE,
		offset: pageIndex * PAGE_SIZE
	});

	const measurements = result?.data ?? [];
	const total = result?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const hasFilters =
		searchInput.trim().length > 0 ||
		ageGroup !== "all" ||
		percentileBand !== "all";

	// ─── Handlers ───────────────────────────────────────────────────────────

	const handleSearchChange = useCallback((value: string) => {
		setSearchInput(value);
		setPageIndex(0);
	}, []);

	const handleAgeGroupChange = useCallback((value: AgeGroup | "all") => {
		setAgeGroup(value);
		setPageIndex(0);
	}, []);

	const handlePercentileChange = useCallback(
		(value: PercentileBand | "all") => {
			setPercentileBand(value);
			setPageIndex(0);
		},
		[]
	);

	const handleClearFilters = useCallback(() => {
		setSearchInput("");
		setAgeGroup("all");
		setPercentileBand("all");
		setPageIndex(0);
	}, []);

	const handleOpenNew = useCallback(() => {
		void navigate({
			to: "/app/growth/new",
			search: patientId ? { patientId } : undefined
		});
	}, [navigate, patientId]);

	// ─── Render ─────────────────────────────────────────────────────────────

	if (isError) {
		return (
			<div className='rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center'>
				<p className='font-medium text-destructive'>
					Could not load measurements
				</p>
				<p className='mt-1 text-muted-foreground text-sm'>{error?.message}</p>
				<Button
					className='mt-4'
					onClick={() => void refetch()}
					variant='outline'
				>
					<RefreshCw className='mr-2 size-4' />
					Try again
				</Button>
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			{/* ─── Toolbar ─────────────────────────────────────────────────── */}
			{!compact && (
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<h2 className='flex items-center gap-2 font-semibold text-lg'>
							<Ruler className='size-4 text-primary' />
							Growth Measurements
						</h2>
						<p className='text-muted-foreground text-sm'>
							{total.toLocaleString()} measurement{total === 1 ? "" : "s"}{" "}
							recorded
						</p>
					</div>
					<Button onClick={handleOpenNew}>
						<Plus className='mr-2 size-4' />
						Record Measurement
					</Button>
				</div>
			)}

			{/* ─── Filters ─────────────────────────────────────────────────── */}
			<div className='flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center'>
				{!patientId && (
					<div className='relative flex-1'>
						<Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							className='pl-9'
							onChange={e => handleSearchChange(e.target.value)}
							placeholder='Search by patient, MRN, or recorder…'
							value={searchInput}
						/>
					</div>
				)}

				<select
					aria-label='Filter by age group'
					className='h-8 rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm'
					onChange={e =>
						handleAgeGroupChange(e.target.value as AgeGroup | "all")
					}
					value={ageGroup}
				>
					{AGE_GROUP_OPTIONS.map(opt => (
						<option
							key={opt.value}
							value={opt.value}
						>
							{opt.label}
						</option>
					))}
				</select>

				<select
					aria-label='Filter by percentile band'
					className='h-8 rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm'
					onChange={e =>
						handlePercentileChange(e.target.value as PercentileBand | "all")
					}
					value={percentileBand}
				>
					{PERCENTILE_OPTIONS.map(opt => (
						<option
							key={opt.value}
							value={opt.value}
						>
							{opt.label}
						</option>
					))}
				</select>

				{hasFilters && (
					<Button
						onClick={handleClearFilters}
						size='sm'
						variant='ghost'
					>
						Clear
					</Button>
				)}
			</div>

			{/* ─── Table ───────────────────────────────────────────────────── */}
			{isLoading ? (
				<DataTableLoading
					columns={growthColumns.length}
					rows={5}
				/>
			) : measurements.length === 0 ? (
				<DataTableEmptyState
					icon='activity'
					message={
						hasFilters
							? "Try adjusting the age or percentile filters."
							: patientId
								? "Record this patient's first growth measurement to get started."
								: "Record a growth measurement to see it here."
					}
					title={
						hasFilters ? "No matching measurements" : "No measurements yet"
					}
					{...(hasFilters
						? { actionLabel: "Clear filters", onAction: handleClearFilters }
						: { actionLabel: "Record Measurement", onAction: handleOpenNew })}
				/>
			) : (
				<DataTable
					columns={growthColumns}
					data={measurements}
					manualPagination
					onPageChange={setPageIndex}
					pageCount={pageCount}
					pageIndex={pageIndex}
					pageSize={PAGE_SIZE}
					refetch={refetch}
				/>
			)}
		</div>
	);
}
