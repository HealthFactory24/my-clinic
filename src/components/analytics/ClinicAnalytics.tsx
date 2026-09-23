// src/components/analytics/ClinicAnalytics.tsx

import { AlertCircle, FlaskConical, Stethoscope, Users } from "lucide-react";
import { useMemo } from "react";

import {
	useAllOverdueImmunizations,
	useAllPatients,
	useEncounterList,
	useLabOrderList
} from "../../hooks";
import type { Encounter, LabOrder } from "../../lib/db/schema";
import { calculatePediatricAge } from "../../utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const AGE_GROUPS = [
	"Neonate",
	"Infant",
	"Toddler",
	"Preschooler",
	"School Age",
	"Adolescent"
] as const;
type AgeGroup = (typeof AGE_GROUPS)[number];

const AGE_GROUP_TONE: Record<AgeGroup, string> = {
	Neonate: "bg-violet-500",
	Infant: "bg-sky-500",
	Toddler: "bg-teal-500",
	Preschooler: "bg-emerald-500",
	"School Age": "bg-amber-500",
	Adolescent: "bg-rose-500"
};

// ─── Normalizers ────────────────────────────────────────────────────────────

type AssessmentShape = {
	diagnoses?: Array<{ name?: string; primary?: boolean }>;
	primaryDiagnosis?: string;
	secondaryDiagnoses?: string[];
	summary?: string;
};

/**
 * Extract the primary diagnosis from an assessment JSON blob. Returns `null`
 * when nothing usable is present, so callers can exclude the encounter from
 * aggregate counts rather than lumping it into a fake "Unspecified" bucket.
 */
function pickPrimaryDiagnosis(assessment: unknown): string | null {
	if (!assessment || typeof assessment !== "object") return null;
	const a = assessment as AssessmentShape;

	if (typeof a.primaryDiagnosis === "string" && a.primaryDiagnosis.trim()) {
		return a.primaryDiagnosis.trim();
	}

	const primary = a.diagnoses?.find(d => d.primary) ?? a.diagnoses?.[0];
	const name = primary?.name?.trim();
	return name ? name : null;
}

/**
 * Accepts either a bare array or `{ data: [...] }`. Used by list hooks whose
 * server-fn return shape varies across call sites.
 */
function unwrapList<T>(value: unknown): T[] {
	if (Array.isArray(value)) return value as T[];
	if (value && typeof value === "object" && "data" in value) {
		const inner = (value as { data?: unknown }).data;
		if (Array.isArray(inner)) return inner as T[];
	}
	return [];
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ClinicAnalytics() {
	// ── Data ────────────────────────────────────────────────────────────────
	const patientsQuery = useAllPatients({ activeStatus: "Active", limit: 1000 });
	const patients = useMemo(
		() => patientsQuery.data?.data ?? [],
		[patientsQuery.data]
	);

	const encountersQuery = useEncounterList({ limit: 10 });
	const encounters = useMemo(
		() => unwrapList<Encounter>(encountersQuery.data),
		[encountersQuery.data]
	);

	const overdueQuery = useAllOverdueImmunizations();
	const overdueImmunizations = useMemo(
		() => unwrapList(overdueQuery.data),
		[overdueQuery.data]
	);

	const labsQuery = useLabOrderList({ limit: 10 });
	const labOrders = useMemo(
		() => unwrapList<LabOrder>(labsQuery.data),
		[labsQuery.data]
	);

	// ── Derived: age distribution ───────────────────────────────────────────
	const ageGroups = useMemo(() => {
		const counts = Object.fromEntries(AGE_GROUPS.map(g => [g, 0])) as Record<
			AgeGroup,
			number
		>;

		for (const p of patients) {
			const info = calculatePediatricAge(p.dateOfBirth);
			if ((AGE_GROUPS as readonly string[]).includes(info.ageGroup)) {
				counts[info.ageGroup as AgeGroup] += 1;
			}
		}
		return counts;
	}, [patients]);

	// ── Derived: top diagnoses ──────────────────────────────────────────────
	const topDiagnoses = useMemo(() => {
		const counts = new Map<string, number>();
		for (const e of encounters) {
			const dx = pickPrimaryDiagnosis(e.assessmentJson);
			if (!dx) continue; // skip encounters with no usable diagnosis
			counts.set(dx, (counts.get(dx) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
	}, [encounters]);

	// ── Derived: visit-type mix ─────────────────────────────────────────────
	const visitTypes = useMemo(() => {
		const counts = new Map<string, number>();
		for (const e of encounters) {
			const key = e.visitType || "Other";
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
	}, [encounters]);

	// ── Derived: counters ───────────────────────────────────────────────────
	const pendingLabOrders = useMemo(
		() =>
			labOrders.filter(
				l => l.status !== "Completed" && l.status !== "Cancelled"
			).length,
		[labOrders]
	);

	const isLoading =
		patientsQuery.isLoading ||
		encountersQuery.isLoading ||
		overdueQuery.isLoading ||
		labsQuery.isLoading;

	const hasError =
		patientsQuery.isError ||
		encountersQuery.isError ||
		overdueQuery.isError ||
		labsQuery.isError;

	if (hasError) {
		return (
			<div className='rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center'>
				<AlertCircle className='mx-auto mb-3 size-10 text-rose-500' />
				<p className='font-bold text-rose-700 text-sm'>
					Could not load analytics
				</p>
				<p className='mt-1 text-rose-600 text-xs'>
					One or more data sources failed. Try refreshing the page.
				</p>
			</div>
		);
	}

	return (
		<div className='space-y-6 pb-12'>
			{/* Header */}
			<header>
				<div className='flex items-center space-x-2'>
					<h1 className='font-bold text-2xl text-slate-800'>
						Clinic Analytics
					</h1>
					<span className='rounded-full bg-teal-100 px-2.5 py-0.5 font-bold text-teal-800 text-xs'>
						Live
					</span>
				</div>
				<p className='mt-0.5 text-slate-500 text-xs'>
					Snapshot of your active patient cohort, visit mix, and pending work.
				</p>
			</header>

			{/* Highlights */}
			<section className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				<StatCard
					accent='bg-teal-500'
					label='Active Patients'
					sub='Currently enrolled and active'
					tone='text-teal-600'
					value={isLoading ? null : patients.length}
				/>
				<StatCard
					accent='bg-rose-500'
					label='Overdue Vaccines'
					sub={
						overdueImmunizations.length > 0
							? "Requires outreach"
							: "All up to date"
					}
					tone={
						overdueImmunizations.length > 0
							? "text-rose-600"
							: "text-emerald-600"
					}
					value={isLoading ? null : overdueImmunizations.length}
				/>
				<StatCard
					accent='bg-blue-500'
					label='Recent Encounters'
					sub='Documented visits on file'
					tone='text-blue-600'
					value={isLoading ? null : encounters.length}
				/>
				<StatCard
					accent='bg-purple-500'
					label='Pending Labs'
					sub='Awaiting results or review'
					tone='text-purple-600'
					value={isLoading ? null : pendingLabOrders}
				/>
			</section>

			{/* Charts row */}
			<section className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
				{/* Age demographics */}
				<Panel
					empty={
						patients.length === 0 ? "No active patients to chart yet." : null
					}
					icon={<Users className='size-4 text-teal-600' />}
					title='Age Distribution'
				>
					<div className='space-y-3'>
						{AGE_GROUPS.map(group => {
							const count = ageGroups[group];
							const pct =
								patients.length > 0
									? Math.round((count / patients.length) * 100)
									: 0;
							return (
								<div
									className='space-y-1'
									key={group}
								>
									<div className='flex items-center justify-between text-xs'>
										<span className='font-semibold text-slate-700'>
											{group}
										</span>
										<span className='font-bold text-slate-900'>
											{count} ({pct}%)
										</span>
									</div>
									<div className='h-2.5 w-full overflow-hidden rounded-full bg-slate-100'>
										<div
											className={`h-full rounded-full transition-all duration-500 ${AGE_GROUP_TONE[group]}`}
											style={{
												width: `${count === 0 ? 0 : Math.max(pct, 4)}%`
											}}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</Panel>

				{/* Top diagnoses */}
				<Panel
					empty={
						topDiagnoses.length === 0
							? "No encounter diagnoses recorded yet."
							: null
					}
					icon={<Stethoscope className='size-4 text-blue-600' />}
					title='Top Diagnoses'
				>
					<ol className='space-y-3'>
						{topDiagnoses.map(([dx, count], idx) => (
							<li
								className='flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs'
								key={dx}
							>
								<div className='flex min-w-0 items-center gap-2.5'>
									<span className='flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-[10px] text-teal-800'>
										{idx + 1}
									</span>
									<span className='truncate font-semibold text-slate-800'>
										{dx}
									</span>
								</div>
								<span className='shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-0.5 font-bold text-slate-800'>
									{count} {count === 1 ? "visit" : "visits"}
								</span>
							</li>
						))}
					</ol>
				</Panel>
			</section>

			{/* Visit-type mix */}
			{visitTypes.length > 0 ? (
				<Panel
					icon={<FlaskConical className='size-4 text-purple-600' />}
					title='Visit Type Mix'
				>
					<div className='flex flex-wrap gap-2'>
						{visitTypes.map(([type, count]) => (
							<span
								className='rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 text-xs'
								key={type}
							>
								{type}
								<span className='ml-2 text-slate-400'>{count}</span>
							</span>
						))}
					</div>
				</Panel>
			) : null}
		</div>
	);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
	label,
	value,
	sub,
	accent,
	tone
}: {
	label: string;
	value: number | null;
	sub: string;
	accent: string;
	tone: string;
}) {
	return (
		<div className='relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs'>
			<span
				aria-hidden='true'
				className={`absolute inset-y-0 left-0 w-1 ${accent}`}
			/>
			<span className='font-bold text-slate-500 text-xs uppercase tracking-wider'>
				{label}
			</span>
			<div className='mt-2 font-extrabold text-3xl text-slate-800'>
				{value === null ? (
					<span className='inline-block h-8 w-12 animate-pulse rounded bg-slate-200' />
				) : (
					value
				)}
			</div>
			<p className={`mt-1 font-medium text-xs ${tone}`}>{sub}</p>
		</div>
	);
}

function Panel({
	title,
	icon,
	empty,
	children
}: {
	title: string;
	icon?: React.ReactNode;
	empty?: string | null;
	children: React.ReactNode;
}) {
	return (
		<div className='space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs'>
			<h3 className='flex items-center font-bold text-base text-slate-800'>
				{icon ? <span className='mr-2'>{icon}</span> : null}
				{title}
			</h3>
			{empty ? (
				<p className='rounded-xl bg-slate-50 p-4 text-center text-slate-500 text-xs'>
					{empty}
				</p>
			) : (
				children
			)}
		</div>
	);
}
