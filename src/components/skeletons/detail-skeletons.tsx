// src/components/skeletons/detail-skeletons.tsx

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Skeleton } from "../ui/skeleton";

// ============================================================
// Encounter Skeletons
// ============================================================

export function EncounterDetailSkeleton() {
	return (
		<div className='container mx-auto max-w-4xl space-y-6 py-6'>
			{/* Header skeleton */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-3'>
					<div className='h-8 w-20 animate-pulse rounded bg-slate-200' />
					<div className='h-8 w-48 animate-pulse rounded bg-slate-200' />
				</div>
				<div className='flex items-center gap-2'>
					<div className='h-8 w-20 animate-pulse rounded bg-slate-200' />
					<div className='h-8 w-16 animate-pulse rounded bg-slate-200' />
				</div>
			</div>

			<Card>
				<CardHeader className='border-b'>
					<div className='flex flex-wrap items-start justify-between gap-4'>
						<div className='flex items-start gap-3'>
							<div className='h-12 w-12 animate-pulse rounded-xl bg-slate-200' />
							<div className='space-y-2'>
								<div className='h-6 w-40 animate-pulse rounded bg-slate-200' />
								<div className='h-4 w-64 animate-pulse rounded bg-slate-200' />
							</div>
						</div>
						<div className='h-6 w-20 animate-pulse rounded-full bg-slate-200' />
					</div>
				</CardHeader>
				<CardContent className='space-y-4 pt-6'>
					{/* Patient card skeleton */}
					<div className='h-24 animate-pulse rounded-lg bg-slate-100' />
					{/* Chief complaint skeleton */}
					<div className='h-16 animate-pulse rounded-lg bg-slate-100' />
					{/* SOAP sections */}
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							className='h-32 animate-pulse rounded-lg bg-slate-100'
							key={i}
						/>
					))}
					{/* Metadata */}
					<div className='h-12 animate-pulse rounded-lg bg-slate-100' />
				</CardContent>
			</Card>
		</div>
	);
}

// ============================================================
// Appointment Skeletons
// ============================================================

export function AppointmentDetailSkeleton() {
	return (
		<div className='container mx-auto max-w-4xl space-y-6 py-6'>
			<div className='h-8 w-48 animate-pulse rounded bg-slate-200' />
			<Card>
				<CardContent className='space-y-4 py-6'>
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							className='h-12 animate-pulse rounded bg-slate-100'
							key={i}
						/>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

export function AppointmentEditSkeleton() {
	return (
		<div className='container mx-auto max-w-2xl py-6'>
			{/* Header */}
			<div className='mb-6 flex items-center justify-between'>
				<div className='space-y-2'>
					<div className='h-8 w-48 animate-pulse rounded bg-slate-200' />
					<div className='h-4 w-64 animate-pulse rounded bg-slate-200' />
				</div>
				<div className='h-8 w-20 animate-pulse rounded bg-slate-200' />
			</div>

			<Card>
				<CardContent className='space-y-4 py-6'>
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							className='h-16 animate-pulse rounded-lg bg-slate-100'
							key={i}
						/>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

// ============================================================
// Prescription Skeletons
// ============================================================

export function PrescriptionDetailSkeleton() {
	return (
		<div className='container mx-auto max-w-4xl space-y-6 py-6'>
			<div className='h-8 w-48 animate-pulse rounded bg-slate-200' />
			<Card>
				<CardHeader>
					<div className='h-6 w-40 animate-pulse rounded bg-slate-200' />
					<div className='mt-2 h-4 w-64 animate-pulse rounded bg-slate-200' />
				</CardHeader>
				<CardContent className='space-y-4'>
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							className='h-16 animate-pulse rounded bg-slate-100'
							key={i}
						/>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

// ============================================================
// Patient Skeletons
// ============================================================

export function PatientEditSkeleton() {
	return (
		<div className='container mx-auto max-w-2xl py-6'>
			<Card>
				<CardHeader className='animate-pulse space-y-2'>
					<div className='h-6 w-32 rounded bg-slate-200' />
					<div className='h-4 w-48 rounded bg-slate-200' />
				</CardHeader>
				<CardContent className='space-y-4'>
					{[...new Array(6)].map((_, i) => (
						<div
							className='h-12 animate-pulse rounded bg-slate-100'
							key={i}
						/>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

export function PatientDetailSkeleton() {
	return (
		<div className='container mx-auto max-w-5xl space-y-6 py-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='h-8 w-48 animate-pulse rounded bg-slate-200' />
				<div className='flex gap-2'>
					<div className='h-8 w-20 animate-pulse rounded bg-slate-200' />
					<div className='h-8 w-20 animate-pulse rounded bg-slate-200' />
				</div>
			</div>

			{/* Patient info card */}
			<Card>
				<CardContent className='space-y-4 py-6'>
					<div className='h-24 animate-pulse rounded-lg bg-slate-100' />
					<div className='grid grid-cols-2 gap-4'>
						{Array.from({ length: 6 }).map((_, i) => (
							<div
								className='h-12 animate-pulse rounded bg-slate-100'
								key={i}
							/>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Tabs / sections */}
			{Array.from({ length: 3 }).map((_, i) => (
				<div
					className='h-48 animate-pulse rounded-lg bg-slate-100'
					key={i}
				/>
			))}
		</div>
	);
}

// ============================================================
// Growth Skeletons
// ============================================================

export function GrowthChartSkeleton() {
	return (
		<div className='container mx-auto space-y-6 px-4 py-6'>
			<div className='flex items-center justify-between'>
				<div className='space-y-2'>
					<div className='h-8 w-64 animate-pulse rounded bg-slate-200' />
					<div className='h-4 w-48 animate-pulse rounded bg-slate-200' />
				</div>
				<div className='h-10 w-40 animate-pulse rounded bg-slate-200' />
			</div>
			<div className='h-[500px] animate-pulse rounded-lg bg-slate-100' />
		</div>
	);
}

export function GrowthHistorySkeleton() {
	return (
		<div className='container mx-auto px-4 py-6'>
			<div className='mb-6 space-y-2'>
				<div className='h-8 w-64 animate-pulse rounded bg-slate-200' />
				<div className='h-4 w-48 animate-pulse rounded bg-slate-200' />
			</div>
			<div className='space-y-2'>
				{Array.from({ length: 8 }).map((_, i) => (
					<div
						className='h-12 animate-pulse rounded bg-slate-100'
						key={i}
					/>
				))}
			</div>
		</div>
	);
}

// ============================================================
// Generic Loading Skeletons
// ============================================================

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
	return (
		<div className='container mx-auto max-w-4xl space-y-4 py-6'>
			<div className='h-8 w-48 animate-pulse rounded bg-slate-200' />
			<div className='space-y-2'>
				{Array.from({ length: rows }).map((_, i) => (
					<div
						className='h-16 animate-pulse rounded-lg bg-slate-100'
						key={i}
					/>
				))}
			</div>
		</div>
	);
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
	return (
		<div className='container mx-auto max-w-2xl py-6'>
			<Card>
				<CardContent className='space-y-4 py-6'>
					{Array.from({ length: fields }).map((_, i) => (
						<div
							className='h-14 animate-pulse rounded bg-slate-100'
							key={i}
						/>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
export function ImmunizationTrackerSkeleton() {
	return (
		<div className='space-y-6 pb-12'>
			{/* Header */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='space-y-2'>
					<div className='flex items-center gap-2'>
						<Skeleton className='h-7 w-64' />
						<Skeleton className='h-6 w-24 rounded-full' />
					</div>
					<Skeleton className='h-3 w-80' />
				</div>
				<div className='flex gap-2'>
					<Skeleton className='h-10 w-40' />
					<Skeleton className='h-10 w-40' />
				</div>
			</div>

			{/* Patient strip */}
			<div className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
				<div className='flex flex-col justify-between gap-4 border-border border-b pb-4 sm:flex-row sm:items-center'>
					<div className='flex items-center gap-3'>
						<Skeleton className='h-11 w-11 rounded-xl' />
						<div className='space-y-1.5'>
							<Skeleton className='h-4 w-40' />
							<Skeleton className='h-3 w-56' />
						</div>
					</div>
					<div className='flex gap-3'>
						<Skeleton className='h-14 w-20 rounded-xl' />
						<Skeleton className='h-14 w-20 rounded-xl' />
						<Skeleton className='h-14 w-20 rounded-xl' />
					</div>
				</div>
				<div className='flex flex-col gap-3 pt-3 sm:flex-row sm:items-center'>
					<Skeleton className='h-10 flex-1' />
					<div className='flex gap-1.5'>
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton
								className='h-8 w-16 rounded-md'
								key={i}
							/>
						))}
					</div>
				</div>
			</div>

			{/* Table */}
			<div className='space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm'>
				<div className='flex items-center justify-between'>
					<Skeleton className='h-5 w-64' />
					<Skeleton className='h-3 w-20' />
				</div>
				<div className='space-y-2 pt-2'>
					{/* Header row */}
					<div className='grid grid-cols-7 gap-3 border-border border-b pb-3'>
						{Array.from({ length: 7 }).map((_, i) => (
							<Skeleton
								className='h-3 w-full'
								key={i}
							/>
						))}
					</div>
					{/* Body rows */}
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							className='grid grid-cols-7 gap-3 py-2'
							key={i}
						>
							{Array.from({ length: 7 }).map((_, j) => (
								<Skeleton
									className='h-4 w-full'
									key={j}
								/>
							))}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
export function ImmunizationDetailSkeleton() {
	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
			<div
				aria-busy='true'
				aria-live='polite'
				className='w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl'
				role='status'
			>
				{/* Header */}
				<div className='flex items-center justify-between border-border border-b pb-4'>
					<div className='flex items-center gap-2.5'>
						<Skeleton className='h-8 w-8 rounded-xl' />
						<div className='space-y-1.5'>
							<Skeleton className='h-4 w-40' />
							<Skeleton className='h-3 w-56' />
						</div>
					</div>
					<div className='flex gap-2'>
						<Skeleton className='h-8 w-8 rounded-lg' />
						<Skeleton className='h-8 w-8 rounded-lg' />
					</div>
				</div>

				{/* Body */}
				<div className='mt-4 space-y-4'>
					{/* Status row */}
					<div className='flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3'>
						<Skeleton className='h-3 w-16' />
						<Skeleton className='h-5 w-20 rounded-full' />
					</div>

					{/* Vaccine details — 2×2 grid */}
					<div className='grid grid-cols-2 gap-3'>
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								className='space-y-1.5 rounded-xl border border-border bg-muted/40 p-3'
								key={i}
							>
								<Skeleton className='h-2.5 w-20' />
								<Skeleton className='h-3.5 w-32' />
							</div>
						))}
					</div>

					{/* Administration panel */}
					<div className='space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4'>
						<Skeleton className='h-3 w-40' />
						<div className='grid grid-cols-2 gap-3'>
							{Array.from({ length: 4 }).map((_, i) => (
								<div
									className='space-y-1.5'
									key={i}
								>
									<Skeleton className='h-2.5 w-24' />
									<Skeleton className='h-3.5 w-28' />
								</div>
							))}
						</div>
					</div>

					{/* Batch & manufacturer — 2 cols */}
					<div className='grid grid-cols-2 gap-3'>
						{Array.from({ length: 2 }).map((_, i) => (
							<div
								className='space-y-1.5 rounded-xl border border-border bg-muted/40 p-3'
								key={i}
							>
								<Skeleton className='h-2.5 w-24' />
								<Skeleton className='h-3.5 w-32' />
							</div>
						))}
					</div>

					{/* Notes */}
					<div className='space-y-1.5 rounded-xl border border-border bg-muted/40 p-3'>
						<Skeleton className='h-2.5 w-24' />
						<Skeleton className='h-3.5 w-full' />
						<Skeleton className='h-3.5 w-3/4' />
					</div>

					{/* Footer meta */}
					<div className='flex justify-between border-border border-t pt-3'>
						<Skeleton className='h-3 w-32' />
						<Skeleton className='h-3 w-32' />
					</div>
				</div>
			</div>
		</div>
	);
}
