// packages/db/src/repositories/dashboard.repository.ts
import { and, desc, eq, gte, lt, type SQL, sql } from "drizzle-orm";

import { db } from "#/lib/db";
import { queryCache } from "#/lib/db/cache";
import {
	appointments as appointmentTable,
	patients as patientTable,
	immunizations as vaccinationTable,
	encounters as visitTable
} from "#/lib/db/schema";
import type { DashboardStats } from "#/types/functions.ts";

// ============================================================
// Constants & helpers
// ============================================================

const CACHE_TTL_MS = 30_000;
const LIST_CACHE_TTL_MS = 15_000;

type Scope = { providerId?: string; clinicId?: string };

/**
 * Build a scope filter for the `patients` table (used when the joined
 * entity does not carry clinic/provider columns directly).
 */
function patientScope(scope: Scope): SQL | undefined {
	const parts: SQL[] = [];
	if (scope.clinicId) parts.push(eq(patientTable.clinicId, scope.clinicId));
	if (scope.providerId)
		parts.push(eq(patientTable.pediatricianId, scope.providerId));
	return parts.length ? and(...parts) : undefined;
}

/**
 * `[start, end)` for a UTC calendar day. Single source of truth so
 * `getTodayAppointmentsCount` and `getAppointmentsByDate` cannot drift.
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
 * `[start, end)` for the ISO week (Monday → next Monday) containing `date`,
 * in UTC. Matches the convention used in `appointment.repository.ts`.
 */
function utcIsoWeekRange(date: Date = new Date()): { start: Date; end: Date } {
	const { start: dayStart } = utcDayRange(date);
	const day = dayStart.getUTCDay(); // 0 = Sun
	const diff = (day + 6) % 7; // Mon → 0, Sun → 6
	const start = new Date(dayStart);
	start.setUTCDate(start.getUTCDate() - diff);
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + 7);
	return { start, end };
}

/**
 * `dueDate` is stored as an ISO text column. Cast to `date` and compare
 * against a UTC `date`, never a JS `Date`, so timezone drift is impossible.
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

/**
 * The seven dashboard count methods all feed `$getStats`, which fires them in
 * parallel. Each used to run its own `COUNT(*)` under its own cache key, so a
 * cold dashboard render cost ~7 round-trips with independent cache misses.
 * This issues ONE query with `COUNT(*) FILTER` scalar subselects (same
 * clinic/provider scoping), so a cold render is one round-trip and the counts
 * are internally consistent.
 *
 * Note: the `postgres` client is configured with `transform: postgres.camel`,
 * so raw `db.execute` rows come back with camelCase keys — the snake_case
 * aliases below are read as `totalPatients` etc.
 */
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

			// Base scope conditions, shared by every subselect that touches the
			// given table. Falls back to `true` when scope is empty so the WHERE
			// clause is never dropped.
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
 * `$getStats` calls the seven count methods in parallel, so guard against a
 * stampede where all seven miss the cold cache and each re-issues the query.
 * The first caller wins; the rest await the same in-flight promise.
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
	// Stats (backed by the single `getAggregateStats` query)
	// ------------------------------------------------------------------

	async getTotalPatientsCount(scope: Scope = {}): Promise<number> {
		return (await loadAggregateStats(scope)).totalPatients;
	},

	async getActivePatientsCount(scope: Scope = {}): Promise<number> {
		return (await loadAggregateStats(scope)).activePatients;
	},

	// ------------------------------------------------------------------
	// Appointment counts
	// ------------------------------------------------------------------

	async getAppointmentsThisWeekCount(scope: Scope = {}): Promise<number> {
		return (await loadAggregateStats(scope)).appointmentsThisWeek;
	},

	async getTodayAppointmentsCount(scope: Scope = {}): Promise<number> {
		return (await loadAggregateStats(scope)).todayAppointments;
	},

	async getAppointmentCompletionRate(scope: Scope = {}): Promise<number> {
		return (await loadAggregateStats(scope)).completionRate;
	},

	async getAppointmentsByDate(
		date: Date,
		scope: Scope = {},
		options: { includeCompleted?: boolean; limit?: number } = {}
	) {
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
		scope: Scope = {}
	) {
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

	async getPendingFollowUpsCount(scope: Scope = {}): Promise<number> {
		return (await loadAggregateStats(scope)).pendingFollowUps;
	},

	async getRecentVisits(scope: Scope = {}, limit = 10, offset = 0) {
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

	async getUpcomingVaccinationsCount(scope: Scope = {}): Promise<number> {
		return (await loadAggregateStats(scope)).upcomingVaccinations;
	},

	async getOverdueVaccinations(scope: Scope = {}, limit = 5) {
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

	async getRecentActivity(scope: Scope = {}, limit = 10) {
		return cached(
			cacheKey("dashboard:activity:recent", scope, limit),
			LIST_CACHE_TTL_MS,
			["dashboard:activity"],
			async () => {
				// Build each branch as a *subquery* so Drizzle can emit valid SQL
				// for the outer `UNION ALL` and outer `ORDER BY`.
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

				// ✅ Chain on builders, THEN call .as() once.
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
