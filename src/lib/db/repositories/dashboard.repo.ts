// packages/db/src/repositories/dashboard.repository.ts
import { and, asc, desc, eq, gte, lt, type SQL, sql } from "drizzle-orm";

import { db } from "#/lib/db";
import { queryCache } from "#/lib/db/cache";
import {
	appointments as appointmentTable,
	immunizations,
	patients as patientTable,
	payments as paymentTable,
	immunizations as vaccinationTable,
	encounters as visitTable
} from "#/lib/db/schema";
import type { DashboardStats } from "#/types/functions.ts";

// ============================================================
// Types
// ============================================================
export type Scope = {
	providerId?: string;
	clinicId?: string;
};

/**
 * Scope can be passed as:
 *   - a bare `clinicId` string  → `{ clinicId }`
 *   - a full `Scope` object     → used as-is
 *   - nothing                   → `{}`
 *
 * This exists because `$getClinicInsights` calls
 * `dashboardRepository.getVisitsSeries(clinicId, data)`
 * with a string, while internal helpers expect a `Scope`.
 */
type ScopeInput = string | Scope | undefined;

export type SeriesRange = {
	from?: Date | string;
	to?: Date | string;
	/** Number of buckets to look back when `from` is omitted. */
	weeks?: number;
};

export type DateTrunc = "day" | "week" | "month" | "quarter" | "year";

export type InsightSeriesPoint = {
	label: string;
	value: number;
	/** Bucket start time (epoch ms); lets clients use a continuous time x-axis. */
	ts?: number;
};

// ============================================================
// Constants & helpers
// ============================================================

const CACHE_TTL_MS = 30_000;
const LIST_CACHE_TTL_MS = 15_000;
const DEFAULT_WEEKS = 12;

function resolveScope(input: ScopeInput): Scope {
	if (!input) return {};
	if (typeof input === "string") return { clinicId: input };
	return input;
}

/**
 * Build a scope filter for the `patients` table.
 */
function patientScope(scope: Scope): SQL | undefined {
	const parts: SQL[] = [];
	if (scope.clinicId) parts.push(eq(patientTable.clinicId, scope.clinicId));
	if (scope.providerId)
		parts.push(eq(patientTable.pediatricianId, scope.providerId));
	return parts.length ? and(...parts) : undefined;
}

/**
 * `[start, end)` for a UTC calendar day.
 */
function utcDayRange(date: Date = new Date()): { start: Date; end: Date } {
	const start = new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
	);
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + 1);
	return { start, end };
}

/**
 * `[start, end)` for the ISO week (Monday → next Monday) in UTC.
 */
function utcIsoWeekRange(date: Date = new Date()): { start: Date; end: Date } {
	const { start: dayStart } = utcDayRange(date);
	const day = dayStart.getUTCDay();
	const diff = (day + 6) % 7;
	const start = new Date(dayStart);
	start.setUTCDate(start.getUTCDate() - diff);
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + 7);
	return { start, end };
}

/**
 * `dueDate` is stored as ISO text. Cast to `date` for comparisons.
 */
function dueDateAsDate(): SQL {
	return sql`(${vaccinationTable.dueDate})::date`;
}

function cacheKey(
	prefix: string,
	scope: Scope,
	...rest: Array<unknown>
): string {
	return `${prefix}:${scope.clinicId ?? "all"}:${scope.providerId ?? "all"}:${rest.join(":")}`;
}

async function cached<T>(
	key: string,
	ttl: number,
	tags: Array<string>,
	fn: () => Promise<T>
): Promise<T> {
	const hit = queryCache.get<T>(key);
	if (hit !== null) return hit;
	const value = await fn();
	queryCache.set(key, value, { ttl, tags });
	return value;
}

// ============================================================
// Series helpers
// ============================================================

/**
 * Resolve `{ from, to }` for a series query.
 *
 * - If `from` is provided, use it.
 * - Otherwise go back `weeks` (default 12) from `to` (default now).
 * - `end` is inclusive-ish: we add one bucket so the current period is
 *   captured.
 */
function resolveSeriesRange(
	range: SeriesRange,
	defaultWeeks = DEFAULT_WEEKS
): { start: Date; end: Date } {
	const end = range.to ? new Date(range.to) : new Date();

	const start = range.from
		? new Date(range.from)
		: (() => {
				const d = new Date(end);
				d.setUTCDate(d.getUTCDate() - (range.weeks ?? defaultWeeks) * 7);
				return d;
			})();

	return { start, end };
}

/**
 * Postgres `date_trunc` returns a `string` when read through `db.execute`,
 * but a `Date` when read through Drizzle's typed `.select()`. Normalize both.
 */
function coerceBucket(bucket: unknown): Date {
	if (bucket instanceof Date) return bucket;
	if (typeof bucket === "string") return new Date(bucket);
	if (typeof bucket === "number") return new Date(bucket);
	return new Date(0);
}

/**
 * Fill gaps in a time series so the chart has a continuous x-axis.
 *
 * Input rows come from `GROUP BY date_trunc(...)`. Because the DB only
 * returns buckets that have rows, a chart of "visits per week" would
 * otherwise skip weeks with zero visits and compress the axis.
 */
function densifySeries(
	rows: ReadonlyArray<{ bucket: unknown; value: number | string }>,
	start: Date,
	end: Date,
	granularity: DateTrunc
): Array<InsightSeriesPoint> {
	const byKey = new Map<string, number>();
	for (const row of rows) {
		const d = coerceBucket(row.bucket);
		byKey.set(bucketKey(d, granularity), Number(row.value) || 0);
	}

	const out: Array<InsightSeriesPoint> = [];
	const cursor = truncDate(start, granularity);
	const last = truncDate(end, granularity);

	// Safety: cap iterations so a bad range can't hang the request.
	let guard = 0;
	while (cursor <= last && guard < 500) {
		out.push({
			label: formatBucketLabel(cursor, granularity),
			value: byKey.get(bucketKey(cursor, granularity)) ?? 0,
			ts: cursor.getTime()
		});
		advance(cursor, granularity);
		guard += 1;
	}

	return out;
}

function truncDate(d: Date, granularity: DateTrunc): Date {
	const out = new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
	);
	switch (granularity) {
		case "day":
			break;
		case "week": {
			const day = out.getUTCDay();
			const diff = (day + 6) % 7; // Mon = 0
			out.setUTCDate(out.getUTCDate() - diff);
			break;
		}
		case "month":
			out.setUTCDate(1);
			break;
		case "quarter":
			out.setUTCDate(1);
			out.setUTCMonth(Math.floor(out.getUTCMonth() / 3) * 3);
			break;
		case "year":
			out.setUTCDate(1);
			out.setUTCMonth(0);
			break;
	}
	return out;
}

function advance(d: Date, granularity: DateTrunc): void {
	switch (granularity) {
		case "day":
			d.setUTCDate(d.getUTCDate() + 1);
			break;
		case "week":
			d.setUTCDate(d.getUTCDate() + 7);
			break;
		case "month":
			d.setUTCMonth(d.getUTCMonth() + 1);
			break;
		case "quarter":
			d.setUTCMonth(d.getUTCMonth() + 3);
			break;
		case "year":
			d.setUTCFullYear(d.getUTCFullYear() + 1);
			break;
	}
}

function bucketKey(d: Date, granularity: DateTrunc): string {
	return `${granularity}:${d.toISOString().slice(0, 10)}`;
}

function formatBucketLabel(d: Date, granularity: DateTrunc): string {
	switch (granularity) {
		case "day":
			return d.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				timeZone: "UTC"
			});
		case "week":
			return d.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				timeZone: "UTC"
			});
		case "month":
			return d.toLocaleDateString("en-US", {
				month: "short",
				year: "2-digit",
				timeZone: "UTC"
			});
		case "quarter":
			return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${String(
				d.getUTCFullYear()
			).slice(2)}`;
		case "year":
			return String(d.getUTCFullYear());
	}
}

// ============================================================
// Consolidated stats aggregate
// ============================================================

type StatsRow = {
	totalPatients: number;
	activePatients: number;
	todayAppointments: number;
	weekAppointments: number;
	totalAppointments: number;
	completedAppointments: number;
	pendingFollowUps: number;
	upcomingVaccinations: number;
};

async function getAggregateStats(scope: Scope = {}): Promise<DashboardStats> {
	const key = `dashboard:stats:${scope.clinicId ?? "all"}:${scope.providerId ?? "all"}`;
	return cached(
		key,
		CACHE_TTL_MS,
		[
			"dashboard:patients",
			"dashboard:appointments",
			"dashboard:followups",
			"dashboard:vaccinations"
		],
		async () => {
			const { start: todayStart } = utcDayRange();
			const todayEnd = new Date(todayStart);
			todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

			const { start: weekStart, end: weekEnd } = utcIsoWeekRange();

			const sevenDaysOut = new Date(todayStart);
			sevenDaysOut.setUTCDate(sevenDaysOut.getUTCDate() + 7);

			const apptScope = and(
				patientScope(scope),
				scope.providerId
					? eq(appointmentTable.staffId, scope.providerId)
					: undefined
			);
			const followUpScope = and(
				patientScope(scope),
				scope.providerId
					? eq(visitTable.providerId, scope.providerId)
					: undefined
			);
			const vaxScope = and(
				patientScope(scope),
				scope.providerId
					? eq(patientTable.pediatricianId, scope.providerId)
					: undefined
			);
			const patientFilter = patientScope(scope) ?? sql`true`;

			const [row] = await db.execute<StatsRow>(sql`
        SELECT
          (SELECT count(*)::int
             FROM ${patientTable}
            WHERE ${patientFilter}) AS total_patients,
          (SELECT count(*)::int
             FROM ${patientTable}
            WHERE ${and(eq(patientTable.activeStatus, "Active"), patientFilter)}) AS active_patients,
          (SELECT count(*)::int
             FROM ${appointmentTable}
             INNER JOIN ${patientTable} ON ${appointmentTable.patientId} = ${patientTable.id}
            WHERE ${and(
							apptScope,
							gte(appointmentTable.startTime, todayStart),
							lt(appointmentTable.startTime, todayEnd)
						)}) AS today_appointments,
          (SELECT count(*)::int
             FROM ${appointmentTable}
             INNER JOIN ${patientTable} ON ${appointmentTable.patientId} = ${patientTable.id}
            WHERE ${and(
							apptScope,
							gte(appointmentTable.startTime, weekStart),
							lt(appointmentTable.startTime, weekEnd)
						)}) AS week_appointments,
          (SELECT count(*)::int
             FROM ${appointmentTable}
             INNER JOIN ${patientTable} ON ${appointmentTable.patientId} = ${patientTable.id}
            WHERE ${apptScope ?? sql`true`}) AS total_appointments,
          (SELECT count(*) FILTER (WHERE ${appointmentTable.status} = 'Completed')::int
             FROM ${appointmentTable}
             INNER JOIN ${patientTable} ON ${appointmentTable.patientId} = ${patientTable.id}
            WHERE ${apptScope ?? sql`true`}) AS completed_appointments,
          (SELECT count(*)::int
             FROM ${visitTable}
             INNER JOIN ${patientTable} ON ${visitTable.patientId} = ${patientTable.id}
            WHERE ${and(
							followUpScope,
							eq(visitTable.status, "Completed"),
							sql`${visitTable.followUpDate} IS NOT NULL`
						)}) AS pending_follow_ups,
          (SELECT count(*)::int
             FROM ${vaccinationTable}
             INNER JOIN ${patientTable} ON ${vaccinationTable.patientId} = ${patientTable.id}
            WHERE ${and(
							vaxScope,
							eq(vaccinationTable.status, "Due"),
							sql`${dueDateAsDate()} >= ${todayStart.toISOString().slice(0, 10)}::date`,
							sql`${dueDateAsDate()} < ${sevenDaysOut.toISOString().slice(0, 10)}::date`
						)}) AS upcoming_vaccinations
      `);

			const totalAppointments = row?.totalAppointments ?? 0;

			return {
				totalPatients: row?.totalPatients ?? 0,
				activePatients: row?.activePatients ?? 0,
				todayAppointments: row?.todayAppointments ?? 0,
				appointmentsThisWeek: row?.weekAppointments ?? 0,
				pendingFollowUps: row?.pendingFollowUps ?? 0,
				upcomingVaccinations: row?.upcomingVaccinations ?? 0,
				completionRate:
					totalAppointments === 0
						? 0
						: ((row?.completedAppointments ?? 0) / totalAppointments) * 100
			};
		}
	);
}

/**
 * Stampede guard: `$getStats` fires seven count methods in parallel.
 * Without this, all seven miss the cold cache and each re-issues the query.
 */
const statsInFlight = new Map<string, Promise<DashboardStats>>();

async function loadAggregateStats(scope: Scope = {}): Promise<DashboardStats> {
	const key = `dashboard:stats:${scope.clinicId ?? "all"}:${scope.providerId ?? "all"}`;
	const inFlight = statsInFlight.get(key);
	if (inFlight) return inFlight;

	const promise = getAggregateStats(scope).finally(() =>
		statsInFlight.delete(key)
	);
	statsInFlight.set(key, promise);
	return promise;
}

// ============================================================
// Repository
// ============================================================

export const dashboardRepository = {
	// ------------------------------------------------------------------
	// Series (used by `$getClinicInsights`)
	// ------------------------------------------------------------------

	/**
	 * Visits per ISO week.
	 *
	 * Callable as:
	 *   getVisitsSeries("clinic_123")
	 *   getVisitsSeries({ clinicId: "clinic_123", providerId: "staff_1" })
	 *   getVisitsSeries(scope, { weeks: 24 })
	 */
	async getVisitsSeries(
		scopeInput: ScopeInput = {},
		range: SeriesRange = {}
	): Promise<Array<InsightSeriesPoint>> {
		const scope = resolveScope(scopeInput);
		const granularity: DateTrunc = "week";
		const { start, end } = resolveSeriesRange(range, 12);

		return cached(
			cacheKey(
				"dashboard:series:visits",
				scope,
				start.toISOString(),
				end.toISOString(),
				granularity
			),
			LIST_CACHE_TTL_MS,
			["dashboard:visits", "dashboard:series"],
			async () => {
				const rows = await db
					.select({
						bucket: sql<Date>`date_trunc('week', ${visitTable.encounterDate})`,
						value: sql<number>`count(*)::int`
					})
					.from(visitTable)
					.innerJoin(patientTable, eq(visitTable.patientId, patientTable.id))
					.where(
						and(
							patientScope(scope),
							scope.providerId
								? eq(visitTable.providerId, scope.providerId)
								: undefined,
							gte(visitTable.encounterDate, start),
							lt(visitTable.encounterDate, end)
						)
					)
					.groupBy(sql`date_trunc('week', ${visitTable.encounterDate})`)
					.orderBy(asc(sql`date_trunc('week', ${visitTable.encounterDate})`));

				return densifySeries(rows, start, end, granularity);
			}
		);
	},

	/**
	 * New patients per month.
	 * Defaults to 52 weeks (~12 months) for a cohort view.
	 */
	async getNewPatientsSeries(
		scopeInput: ScopeInput = {},
		range: SeriesRange = {}
	): Promise<Array<InsightSeriesPoint>> {
		const scope = resolveScope(scopeInput);
		const granularity: DateTrunc = "month";
		const { start, end } = resolveSeriesRange(range, 52);

		return cached(
			cacheKey(
				"dashboard:series:new-patients",
				scope,
				start.toISOString(),
				end.toISOString(),
				granularity
			),
			LIST_CACHE_TTL_MS,
			["dashboard:patients", "dashboard:series"],
			async () => {
				const rows = await db
					.select({
						bucket: sql<Date>`date_trunc('month', ${patientTable.createdAt})`,
						value: sql<number>`count(*)::int`
					})
					.from(patientTable)
					.where(
						and(
							patientScope(scope),
							gte(patientTable.createdAt, start),
							lt(patientTable.createdAt, end)
						)
					)
					.groupBy(sql`date_trunc('month', ${patientTable.createdAt})`)
					.orderBy(asc(sql`date_trunc('month', ${patientTable.createdAt})`));

				return densifySeries(rows, start, end, granularity);
			}
		);
	},

	/**
	 * Immunizations administered per ISO week.
	 * Uses `administeredDate` when present, falls back to `createdAt`
	 * so historical imports still land in the correct bucket.
	 */
	async getImmunizationsSeries(
		scopeInput: ScopeInput = {},
		range: SeriesRange = {}
	): Promise<Array<InsightSeriesPoint>> {
		const scope = resolveScope(scopeInput);
		const granularity: DateTrunc = "week";
		const { start, end } = resolveSeriesRange(range, 12);

		return cached(
			cacheKey(
				"dashboard:series:immunizations",
				scope,
				start.toISOString(),
				end.toISOString(),
				granularity
			),
			LIST_CACHE_TTL_MS,
			["dashboard:vaccinations", "dashboard:series"],
			async () => {
				const effectiveDate = sql`COALESCE(${vaccinationTable.administeredDate}, ${vaccinationTable.createdAt})`;

				const rows = await db
					.select({
						bucket: sql<Date>`date_trunc('week', ${effectiveDate})`,
						value: sql<number>`count(*)::int`
					})
					.from(vaccinationTable)
					.innerJoin(
						patientTable,
						eq(vaccinationTable.patientId, patientTable.id)
					)
					.where(
						and(
							patientScope(scope),
							scope.providerId
								? eq(patientTable.pediatricianId, scope.providerId)
								: undefined,
							// Only count actually-administered doses, not scheduled ones.
							eq(
								immunizations.status,
								status as "Administered" | "Due" | "Overdue"
							),
							gte(effectiveDate, start),
							lt(effectiveDate, end)
						)
					)
					.groupBy(sql`date_trunc('week', ${effectiveDate})`)
					.orderBy(asc(sql`date_trunc('week', ${effectiveDate})`));

				return densifySeries(rows, start, end, granularity);
			}
		);
	},

	/**
	 * Revenue per ISO week.
	 *
	 * ⚠️ Requires a `payments` table with `paidAt` (timestamptz),
	 * `amountCents` (integer), `status` (text), and `patientId` (text).
	 * If your schema stores dollars, change the `value` SQL to `sum(...)`.
	 */
	async getRevenueSeries(
		scopeInput: ScopeInput = {},
		range: SeriesRange = {}
	): Promise<Array<InsightSeriesPoint>> {
		const scope = resolveScope(scopeInput);
		const granularity: DateTrunc = "week";
		const { start, end } = resolveSeriesRange(range, 12);

		return cached(
			cacheKey(
				"dashboard:series:revenue",
				scope,
				start.toISOString(),
				end.toISOString(),
				granularity
			),
			LIST_CACHE_TTL_MS,
			["dashboard:revenue", "dashboard:series"],
			async () => {
				const rows = await db
					.select({
						bucket: sql<Date>`date_trunc('week', ${paymentTable.paidAt})`,
						// amountCents → dollars. Change to `sum(amount)` if you
						// already store dollars.
						value: sql<number>`COALESCE(sum(${paymentTable.amountCents}), 0)::int / 100`
					})
					.from(paymentTable)
					.innerJoin(patientTable, eq(paymentTable.patientId, patientTable.id))
					.where(
						and(
							patientScope(scope),
							scope.providerId
								? eq(patientTable.pediatricianId, scope.providerId)
								: undefined,
							eq(paymentTable.status, "Completed"),
							gte(paymentTable.paidAt, start),
							lt(paymentTable.paidAt, end)
						)
					)
					.groupBy(sql`date_trunc('week', ${paymentTable.paidAt})`)
					.orderBy(asc(sql`date_trunc('week', ${paymentTable.paidAt})`));

				return densifySeries(rows, start, end, granularity);
			}
		);
	},

	// ------------------------------------------------------------------
	// Stats (backed by the single `getAggregateStats` query)
	// ------------------------------------------------------------------

	async getTotalPatientsCount(scopeInput: ScopeInput = {}): Promise<number> {
		return (await loadAggregateStats(resolveScope(scopeInput))).totalPatients;
	},

	async getActivePatientsCount(scopeInput: ScopeInput = {}): Promise<number> {
		return (await loadAggregateStats(resolveScope(scopeInput))).activePatients;
	},

	// ------------------------------------------------------------------
	// Appointment counts
	// ------------------------------------------------------------------

	async getAppointmentsThisWeekCount(
		scopeInput: ScopeInput = {}
	): Promise<number> {
		return (await loadAggregateStats(resolveScope(scopeInput)))
			.appointmentsThisWeek;
	},

	async getTodayAppointmentsCount(
		scopeInput: ScopeInput = {}
	): Promise<number> {
		return (await loadAggregateStats(resolveScope(scopeInput)))
			.todayAppointments;
	},

	async getAppointmentCompletionRate(
		scopeInput: ScopeInput = {}
	): Promise<number> {
		return (await loadAggregateStats(resolveScope(scopeInput))).completionRate;
	},

	async getAppointmentsByDate(
		date: Date,
		scopeInput: ScopeInput = {},
		options: { includeCompleted?: boolean; limit?: number } = {}
	) {
		const scope = resolveScope(scopeInput);
		const { includeCompleted = false, limit = 20 } = options;
		const { start, end } = utcDayRange(date);

		return cached(
			cacheKey(
				"dashboard:appointments:by-date",
				scope,
				start.toISOString(),
				includeCompleted,
				limit
			),
			LIST_CACHE_TTL_MS,
			["dashboard:appointments"],
			() =>
				db
					.select({
						id: appointmentTable.id,
						patientId: patientTable.id,
						priority: appointmentTable.priority,
						notes: appointmentTable.notes,
						patientName: sql<string>`${patientTable.firstName} || ' ' || ${patientTable.lastName}`,
						appointmentDate: appointmentTable.startTime,
						appointmentType: appointmentTable.type,
						status: appointmentTable.status
					})
					.from(appointmentTable)
					.innerJoin(
						patientTable,
						eq(appointmentTable.patientId, patientTable.id)
					)
					.where(
						and(
							patientScope(scope),
							scope.providerId
								? eq(appointmentTable.staffId, scope.providerId)
								: undefined,
							gte(appointmentTable.startTime, start),
							lt(appointmentTable.startTime, end),
							includeCompleted
								? undefined
								: sql`${appointmentTable.status} <> 'Completed'`
						)
					)
					.orderBy(appointmentTable.startTime)
					.limit(limit)
		);
	},

	async getAppointmentsByDateRange(
		startDate: Date,
		endDate: Date,
		scopeInput: ScopeInput = {}
	) {
		const scope = resolveScope(scopeInput);
		return cached(
			cacheKey(
				"dashboard:appointments:by-range",
				scope,
				startDate.toISOString(),
				endDate.toISOString()
			),
			LIST_CACHE_TTL_MS,
			["dashboard:appointments"],
			() =>
				db
					.select({
						id: appointmentTable.id,
						patientId: patientTable.id,
						priority: appointmentTable.priority,
						notes: appointmentTable.notes,
						patientName: sql<string>`${patientTable.firstName} || ' ' || ${patientTable.lastName}`,
						appointmentDate: appointmentTable.startTime,
						appointmentType: appointmentTable.type,
						status: appointmentTable.status
					})
					.from(appointmentTable)
					.innerJoin(
						patientTable,
						eq(appointmentTable.patientId, patientTable.id)
					)
					.where(
						and(
							patientScope(scope),
							scope.providerId
								? eq(appointmentTable.staffId, scope.providerId)
								: undefined,
							gte(appointmentTable.startTime, startDate),
							lt(appointmentTable.startTime, endDate)
						)
					)
					.orderBy(appointmentTable.startTime)
		);
	},

	// ------------------------------------------------------------------
	// Encounters / visits
	// ------------------------------------------------------------------

	async getPendingFollowUpsCount(scopeInput: ScopeInput = {}): Promise<number> {
		return (await loadAggregateStats(resolveScope(scopeInput)))
			.pendingFollowUps;
	},

	async getRecentVisits(scopeInput: ScopeInput = {}, limit = 10, offset = 0) {
		const scope = resolveScope(scopeInput);
		return cached(
			cacheKey("dashboard:visits:recent", scope, limit, offset),
			LIST_CACHE_TTL_MS,
			["dashboard:visits"],
			() =>
				db
					.select({
						id: visitTable.id,
						patientId: patientTable.id,
						patientName: sql<string>`${patientTable.firstName} || ' ' || ${patientTable.lastName}`,
						visitDate: visitTable.encounterDate,
						visitType: visitTable.visitType
					})
					.from(visitTable)
					.innerJoin(patientTable, eq(visitTable.patientId, patientTable.id))
					.where(
						and(
							patientScope(scope),
							scope.providerId
								? eq(visitTable.providerId, scope.providerId)
								: undefined
						)
					)
					.orderBy(desc(visitTable.encounterDate))
					.limit(limit)
					.offset(offset)
		);
	},

	// ------------------------------------------------------------------
	// Immunizations
	// ------------------------------------------------------------------

	async getUpcomingVaccinationsCount(
		scopeInput: ScopeInput = {}
	): Promise<number> {
		return (await loadAggregateStats(resolveScope(scopeInput)))
			.upcomingVaccinations;
	},

	async getOverdueVaccinations(scopeInput: ScopeInput = {}, limit = 5) {
		const scope = resolveScope(scopeInput);
		const today = utcDayRange();
		return cached(
			cacheKey(
				"dashboard:vaccinations:overdue",
				scope,
				today.start.toISOString(),
				limit
			),
			LIST_CACHE_TTL_MS,
			["dashboard:vaccinations"],
			() =>
				db
					.select({
						patientId: patientTable.id,
						patientName: sql<string>`${patientTable.firstName} || ' ' || ${patientTable.lastName}`,
						vaccineName: vaccinationTable.vaccineName,
						scheduledDate: vaccinationTable.dueDate,
						status: vaccinationTable.status
					})
					.from(vaccinationTable)
					.innerJoin(
						patientTable,
						eq(vaccinationTable.patientId, patientTable.id)
					)
					.where(
						and(
							patientScope(scope),
							scope.providerId
								? eq(patientTable.pediatricianId, scope.providerId)
								: undefined,
							eq(vaccinationTable.status, "Due"),
							sql`${dueDateAsDate()} < ${today.start.toISOString().slice(0, 10)}::date`
						)
					)
					.orderBy(vaccinationTable.dueDate)
					.limit(limit)
		);
	},

	// ------------------------------------------------------------------
	// Recent activity (union)
	// ------------------------------------------------------------------

	async getRecentActivity(scopeInput: ScopeInput = {}, limit = 10) {
		const scope = resolveScope(scopeInput);
		return cached(
			cacheKey("dashboard:activity:recent", scope, limit),
			LIST_CACHE_TTL_MS,
			["dashboard:activity"],
			async () => {
				const encounters = db
					.select({
						id: visitTable.id,
						type: sql<string>`'encounter'`.as("type"),
						timestamp: visitTable.encounterDate,
						patientId: patientTable.id,
						patientName:
							sql<string>`${patientTable.firstName} || ' ' || ${patientTable.lastName}`.as(
								"patient_name"
							),
						description:
							sql<string>`'Encounter: ' || COALESCE(${visitTable.visitType}, 'General')`.as(
								"description"
							)
					})
					.from(visitTable)
					.innerJoin(patientTable, eq(visitTable.patientId, patientTable.id))
					.where(
						and(
							patientScope(scope),
							scope.providerId
								? eq(visitTable.providerId, scope.providerId)
								: undefined
						)
					);

				const appointments = db
					.select({
						id: appointmentTable.id,
						type: sql<string>`'appointment'`.as("type"),
						timestamp: appointmentTable.startTime,
						patientId: patientTable.id,
						patientName:
							sql<string>`${patientTable.firstName} || ' ' || ${patientTable.lastName}`.as(
								"patient_name"
							),
						description:
							sql<string>`'Appointment: ' || COALESCE(${appointmentTable.status}, 'Scheduled')`.as(
								"description"
							)
					})
					.from(appointmentTable)
					.innerJoin(
						patientTable,
						eq(appointmentTable.patientId, patientTable.id)
					)
					.where(
						and(
							patientScope(scope),
							scope.providerId
								? eq(appointmentTable.staffId, scope.providerId)
								: undefined
						)
					);

				const immunizations = db
					.select({
						id: vaccinationTable.id,
						type: sql<string>`'immunization'`.as("type"),
						timestamp: vaccinationTable.createdAt,
						patientId: patientTable.id,
						patientName:
							sql<string>`${patientTable.firstName} || ' ' || ${patientTable.lastName}`.as(
								"patient_name"
							),
						description:
							sql<string>`'Immunization administered: ' || COALESCE(${vaccinationTable.vaccineName}, 'Vaccine')`.as(
								"description"
							)
					})
					.from(vaccinationTable)
					.innerJoin(
						patientTable,
						eq(vaccinationTable.patientId, patientTable.id)
					)
					.where(
						and(
							patientScope(scope),
							scope.providerId
								? eq(patientTable.pediatricianId, scope.providerId)
								: undefined
						)
					);

				const unioned = encounters
					.unionAll(appointments)
					.unionAll(immunizations)
					.as("recent_activities");

				return db
					.select()
					.from(unioned)
					.orderBy(desc(sql`timestamp`))
					.limit(limit);
			}
		);
	}
};

export type DashboardRepository = typeof dashboardRepository;
