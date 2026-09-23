// src/components/skeletons/route-fallback.tsx
//
// Unified fallback for route-level <Suspense> boundaries.
// Used in `_auth/app/route.tsx` to prevent each lazy route from needing
// its own pendingComponent while still giving users a meaningful skeleton.
//
// Design decisions:
//   - Renders a *shell-like* skeleton (header + content) so the layout doesn't
//     jump when real content paints. Matches common page patterns in this app
//     (page header, then cards / table / panels).
//   - `role="status"` + `aria-live="polite"` + `aria-busy="true"` so screen
//     readers announce loading once, not on every skeleton block.
//   - Respects `prefers-reduced-motion` — `motion-reduce:animate-none` on the
//     pulse blocks (Tailwind handles this via `motion-reduce:`).
//   - Uses logical properties (`ps-`/`pe-`/`ms-`/`me-`) so RTL locales are
//     correct without a conditional class.
//   - Keyed on `aria-label` from Paraglide so it localizes.

import { useRouterState } from "@tanstack/react-router";
import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/* Shape variants — pick the closest match to the incoming route      */
/* ------------------------------------------------------------------ */

type FallbackVariant = "list" | "detail" | "form" | "dashboard";

function inferVariant(pathname: string): FallbackVariant {
	if (pathname === "/app" || pathname === "/app/") return "dashboard";
	if (pathname.endsWith("/new") || pathname.endsWith("/edit")) return "form";
	if (/\/\$?[^/]+\/?$/.test(pathname) && pathname.split("/").length > 3) {
		// e.g. /app/patients/abc123  → detail
		return "detail";
	}
	return "list";
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function SkeletonLine({
	className,
	...props
}: React.ComponentProps<typeof Skeleton>) {
	return (
		<Skeleton
			className={`h-4 w-full motion-reduce:animate-none ${className ?? ""}`}
			{...props}
		/>
	);
}

function PageHeaderSkeleton() {
	return (
		<div className='flex flex-col gap-2'>
			{/* eyebrow */}
			<SkeletonLine className='h-3 w-24 motion-reduce:animate-none' />
			{/* title */}
			<SkeletonLine className='h-7 w-56 motion-reduce:animate-none' />
			{/* subtitle */}
			<SkeletonLine className='h-3.5 w-80 motion-reduce:animate-none' />
		</div>
	);
}

function CardSkeleton({ rows = 3 }: { rows?: number }) {
	return (
		<div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900'>
			<SkeletonLine className='mb-4 h-4 w-40 motion-reduce:animate-none' />
			<div className='space-y-3'>
				{Array.from({ length: rows }).map((_, i) => (
					<SkeletonLine
						className={`motion-reduce:animate-none ${i % 3 === 2 ? "w-3/4" : "w-full"}`}
						key={i}
					/>
				))}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Variant shells                                                      */
/* ------------------------------------------------------------------ */

function ListSkeleton() {
	return (
		<>
			<PageHeaderSkeleton />

			{/* Filter bar */}
			<div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900'>
				<div className='flex flex-col gap-3 sm:flex-row'>
					<SkeletonLine className='h-9 flex-1 rounded-xl motion-reduce:animate-none' />
					<SkeletonLine className='h-9 w-32 rounded-xl motion-reduce:animate-none' />
					<SkeletonLine className='h-9 w-32 rounded-xl motion-reduce:animate-none' />
				</div>
			</div>

			{/* Table */}
			<div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900'>
				{/* Header row */}
				<div className='flex items-center gap-4 border-slate-200 border-b bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40'>
					{[100, 160, 120, 80, 100].map((w, i) => (
						<SkeletonLine
							className='h-3 motion-reduce:animate-none'
							key={i}
							style={{ width: w }}
						/>
					))}
				</div>
				{/* Body rows */}
				<div className='divide-y divide-slate-100 dark:divide-slate-800'>
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							className='flex items-center gap-4 px-4 py-3.5'
							key={i}
						>
							<Skeleton className='size-9 shrink-0 rounded-xl motion-reduce:animate-none' />
							<SkeletonLine className='h-4 w-40 motion-reduce:animate-none' />
							<SkeletonLine className='h-3 w-24 motion-reduce:animate-none' />
							<SkeletonLine className='ms-auto h-6 w-20 rounded-full motion-reduce:animate-none' />
						</div>
					))}
				</div>
			</div>
		</>
	);
}

function DetailSkeleton() {
	return (
		<>
			<PageHeaderSkeleton />

			<div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
				{/* Left column */}
				<div className='space-y-6 lg:col-span-2'>
					<CardSkeleton rows={4} />
					<CardSkeleton rows={3} />
				</div>

				{/* Right column */}
				<div className='space-y-6'>
					<CardSkeleton rows={5} />
					<CardSkeleton rows={2} />
				</div>
			</div>
		</>
	);
}

function FormSkeleton() {
	return (
		<>
			<PageHeaderSkeleton />

			<div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900'>
				<div className='space-y-6'>
					{Array.from({ length: 3 }).map((_, sectionIdx) => (
						<div
							className='space-y-3'
							key={sectionIdx}
						>
							{/* Section title */}
							<SkeletonLine className='h-3 w-32 motion-reduce:animate-none' />
							<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
								{Array.from({ length: 4 }).map((_, fieldIdx) => (
									<div
										className='space-y-1.5'
										key={fieldIdx}
									>
										<SkeletonLine className='h-3 w-24 motion-reduce:animate-none' />
										<SkeletonLine className='h-9 w-full rounded-lg motion-reduce:animate-none' />
									</div>
								))}
							</div>
						</div>
					))}
				</div>

				{/* Actions */}
				<div className='mt-6 flex justify-end gap-3 border-slate-100 border-t pt-4 dark:border-slate-800'>
					<SkeletonLine className='h-9 w-24 rounded-xl motion-reduce:animate-none' />
					<SkeletonLine className='h-9 w-32 rounded-xl motion-reduce:animate-none' />
				</div>
			</div>
		</>
	);
}

function DashboardSkeleton() {
	return (
		<>
			<PageHeaderSkeleton />

			{/* Stat cards */}
			<div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						className='rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900'
						key={i}
					>
						<Skeleton className='mb-3 size-10 rounded-xl motion-reduce:animate-none' />
						<SkeletonLine className='h-7 w-16 motion-reduce:animate-none' />
						<SkeletonLine className='mt-2 h-3 w-24 motion-reduce:animate-none' />
					</div>
				))}
			</div>

			{/* Two-column content */}
			<div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
				<div className='space-y-6 xl:col-span-2'>
					<CardSkeleton rows={4} />
					<CardSkeleton rows={3} />
				</div>
				<div className='space-y-6'>
					<CardSkeleton rows={4} />
					<CardSkeleton rows={3} />
				</div>
			</div>
		</>
	);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export type RouteFallbackProps = {
	/**
	 * Override the auto-inferred variant. Leave undefined to infer from
	 * the current router pathname.
	 */
	variant?: FallbackVariant;
	/**
	 * Optional accessible label override. Defaults to the localized
	 * "loading" message.
	 */
	label?: string;
};

export function RouteFallback({ variant, label }: RouteFallbackProps) {
	const pathname = useRouterState({
		select: s => s.location.pathname
	});

	const resolvedVariant = variant ?? inferVariant(pathname);
	const ariaLabel = label ?? "loading";

	const Body = React.useMemo(() => {
		switch (resolvedVariant) {
			case "form":
				return <FormSkeleton />;
			case "detail":
				return <DetailSkeleton />;
			case "dashboard":
				return <DashboardSkeleton />;
			default:
				return <ListSkeleton />;
		}
	}, [resolvedVariant]);

	return (
		<div
			aria-busy='true'
			aria-live='polite'
			className='mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8'
			role='status'
			// `dir` is inherited from <html>; logical props handle RTL automatically.
		>
			{/* Visually hidden announcement for screen readers */}
			<span className='sr-only'>{ariaLabel}</span>

			{Body}
		</div>
	);
}
