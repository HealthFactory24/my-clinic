import { Download, HeartPulse, Search, X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";

import { usePatientById, useVitalsByPatient } from "#/hooks/index.ts";
import type { VitalSigns } from "@/lib/db/schema";

import { vitalColumns } from "../columns/vital";
import { DataTable } from "../components/data-table";
import {
	TableEmptyState,
	TablePageHeader,
	TablePaginationFooter
} from "./shared";
import { exportVitalsToCSV } from "./vitals/export-csv";
import { VitalDetailsModal } from "./vitals/VitalDetailsModal";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

interface VitalsListProps {
	onAddVitals?: () => void;
	patientId: string;
}

export const VitalsList: React.FC<VitalsListProps> = ({
	patientId,
	onAddVitals
}) => {
	const [search, setSearch] = useState("");
	const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>(
		{}
	);
	const [pageIndex, setPageIndex] = useState(0);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [selectedVital, setSelectedVital] = useState<VitalSigns | null>(null);

	const { data: patient } = usePatientById(patientId);
	const {
		data: vitalsResponse,
		isLoading,
		refetch
	} = useVitalsByPatient(patientId);
	const vitals = useMemo(
		() => vitalsResponse?.data ?? [],
		[vitalsResponse?.data]
	);
	const total = vitalsResponse?.total ?? 0;

	const filteredVitals = useMemo(() => {
		let filtered = vitals;

		if (dateRange.start) {
			const start = new Date(dateRange.start);
			filtered = filtered.filter(v => new Date(v.recordedAt) >= start);
		}
		if (dateRange.end) {
			const end = new Date(dateRange.end);
			end.setHours(23, 59, 59, 999);
			filtered = filtered.filter(v => new Date(v.recordedAt) <= end);
		}

		return filtered;
	}, [vitals, dateRange]);

	const pageCount = Math.max(1, Math.ceil(filteredVitals.length / pageSize));
	const pageStart = pageIndex * pageSize;
	const pagedVitals = useMemo(
		() => filteredVitals.slice(pageStart, pageStart + pageSize),
		[filteredVitals, pageStart, pageSize]
	);

	const hasActiveFilter = Boolean(search || dateRange.start || dateRange.end);

	const handlePageSizeChange = (nextSize: number) => {
		setPageSize(nextSize);
		setPageIndex(0);
	};

	const handleExport = () => {
		exportVitalsToCSV(filteredVitals, patientId);
	};

	if (isLoading) {
		return (
			<div className='animate-pulse space-y-6'>
				<div className='mb-4 h-8 w-48 rounded bg-slate-200' />
				<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
					{[1, 2, 3, 4].map(i => (
						<div
							className='h-32 rounded-2xl border border-slate-200 bg-white p-4'
							key={i}
						>
							<div className='mb-2 h-4 w-24 rounded bg-slate-200' />
							<div className='h-8 w-16 rounded bg-slate-200' />
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			<TablePageHeader
				actionIcon={HeartPulse}
				actionLabel='Add Vitals'
				onAction={onAddVitals ?? (() => {})}
				subtitle={
					patient
						? `${patient.firstName} ${patient.lastName} · Temperature, heart rate, respiratory rate, SpO2, and pain scores`
						: "Temperature, heart rate, respiratory rate, SpO2, and pain scores"
				}
				title='Vital Signs History'
				total={total}
			/>

			{/* Custom filter row: search + date range + export (not FilterBar-shaped) */}
			<section className='space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs'>
				<div className='flex flex-col gap-3 sm:flex-row'>
					<div className='relative flex-1'>
						<Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400' />
						<input
							className='w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-slate-800 text-xs focus:border-teal-500 focus:outline-hidden'
							onChange={e => {
								setSearch(e.target.value);
								setPageIndex(0);
							}}
							placeholder='Search by notes, method, or provider...'
							type='text'
							value={search}
						/>
						{search ? (
							<button
								className='absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600'
								onClick={() => {
									setSearch("");
									setPageIndex(0);
								}}
								type='button'
							>
								<X className='size-4' />
							</button>
						) : null}
					</div>

					<div className='flex items-center space-x-2'>
						<input
							className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 text-xs'
							onChange={e => {
								setDateRange(prev => ({ ...prev, start: e.target.value }));
								setPageIndex(0);
							}}
							type='date'
							value={dateRange.start || ""}
						/>
						<span className='text-slate-400'>to</span>
						<input
							className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 text-xs'
							onChange={e => {
								setDateRange(prev => ({ ...prev, end: e.target.value }));
								setPageIndex(0);
							}}
							type='date'
							value={dateRange.end || ""}
						/>
						<button
							className='rounded-xl px-3 py-2 text-slate-500 text-xs hover:text-slate-700'
							onClick={() => {
								setDateRange({});
								setPageIndex(0);
							}}
							type='button'
						>
							Clear
						</button>
					</div>

					<button
						className='flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 text-xs shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50'
						disabled={filteredVitals.length === 0}
						onClick={handleExport}
						type='button'
					>
						<Download className='size-3.5' />
						<span>Export</span>
					</button>
				</div>
			</section>

			{filteredVitals.length === 0 ? (
				<TableEmptyState
					actionLabel='Record Vitals'
					emptyMessage='Start recording vital signs for this patient.'
					entityName='vitals'
					hasFilters={hasActiveFilter}
					icon={HeartPulse}
					onAction={onAddVitals}
				/>
			) : (
				<>
					<DataTable
						columns={vitalColumns}
						data={pagedVitals}
						isLoading={false}
						manualPagination
						onPageChange={page => setPageIndex(page - 1)}
						pageCount={pageCount}
						pageIndex={pageIndex}
						pageSize={pageSize}
					/>

					<TablePaginationFooter
						onPageChange={setPageIndex}
						onPageSizeChange={handlePageSizeChange}
						pageCount={pageCount}
						pageIndex={pageIndex}
						pageSize={pageSize}
						pageSizeOptions={PAGE_SIZE_OPTIONS}
						total={filteredVitals.length}
					/>
				</>
			)}

			{selectedVital ? (
				<VitalDetailsModal
					onClose={() => setSelectedVital(null)}
					onDelete={() => {
						refetch();
						setSelectedVital(null);
					}}
					vital={selectedVital}
				/>
			) : null}
		</div>
	);
};
