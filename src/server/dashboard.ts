// src/server/dashboard.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import type { Role } from "#/lib/auth/roles.ts";
import type { Alert } from "#/types/functions";
import { getClinicId, staffMiddleware } from "@/lib/auth/middleware";
import { dashboardRepository } from "@/lib/db/repositories/dashboard.repo";
import { logger } from "@/lib/logger/server";

// ─────────────────────────────────────────────────────────────────────────────
// Logging helpers
//
// A single `runLogged` wrapper instruments every handler uniformly:
//   - emits an entry log with the function name + input
//   - emits an exit log with duration + a compact result summary
//   - emits an error log with the full message + stack on failure
//
// This keeps the handlers readable while guaranteeing that no server
// function can silently fail without leaving a trace.
// ─────────────────────────────────────────────────────────────────────────────

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [k: string]: JsonValue };

/**
 * Reduce a value to something safe and compact for logging.
 *
 * - Strips functions and symbols (not serializable).
 * - Truncates long strings so a patient note doesn't blow up the log line.
 * - Recursively processes plain objects and arrays.
 *
 * This is a logging-only projection — the actual return value is untouched.
 */
type ServerFnUser = {
	id: string;
	role: Role;
	clinicId: string | null;
};
// src/server/dashboard.ts — inside toLoggable

function toLoggable(value: unknown, depth = 0): JsonValue {
	if (depth > 4) return "[depth-limit]";
	if (value === null || value === undefined) return null;

	const t = typeof value;
	if (t === "string") {
		const s = value as string;
		return s.length > 200 ? `${s.slice(0, 200)}…(${s.length} chars)` : s;
	}
	if (t === "number") return value as number;
	if (t === "boolean") return value as boolean;
	if (t === "bigint") return `${(value as bigint).toString()}n`;
	if (t === "symbol") return (value as symbol).description ?? "[symbol]";
	if (t === "function") {
		const fn = value as (...args: never[]) => unknown;
		return `[function ${fn.name || "anonymous"}]`;
	}
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) {
		const head = value.slice(0, 5).map(v => toLoggable(v, depth + 1));
		return value.length > 5 ? [...head, `…(${value.length} items)`] : head;
	}
	if (t === "object") {
		const out: Record<string, JsonValue> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[k] = toLoggable(v, depth + 1);
		}
		return out;
	}

	// Unreachable: every `typeof` is handled above. Declared explicitly so
	// the linter can prove no value reaches Object's default `toString()`.
	return "[unserializable]";
}
async function timeBranch<T>(
	dashboardStart: number,
	label: string,
	promise: Promise<T>
): Promise<T> {
	const t0 = performance.now();
	try {
		const result = await promise;
		logger.debug({
			msg: `[$getDashboard] ${label} ok`,
			durationMs: Math.round(performance.now() - t0)
		});
		return result;
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		logger.error(
			{
				msg: `[$getDashboard] ${label} failed`,
				durationMs: Math.round(performance.now() - t0),
				sinceDashboardStartMs: Math.round(performance.now() - dashboardStart),
				errorName: err.name,
				errorMessage: err.message
			},
			err
		);
		throw error;
	}
}
/**
 * Wrap a server-function handler with structured logging.
 *
 * `name` is the exported symbol (e.g. `$getStats`). It is included in every
 * log line so a single grep for `"$getStats"` surfaces the entire lifecycle
 * of that function.
 */
function runLogged<TInput, TOutput>(
	name: string,
	handler: (args: {
		data: TInput;
		context: { user: ServerFnUser };
	}) => Promise<TOutput>
): (args: {
	data: TInput;
	context: { user: ServerFnUser };
}) => Promise<TOutput> {
	return async args => {
		const started = performance.now();
		const { data, context } = args;

		logger.info({
			msg: `[${name}] → enter`,
			userId: context?.user?.id,
			role: context?.user?.role,
			input: toLoggable(data)
		});

		try {
			const result = await handler(args);
			const durationMs = Math.round(performance.now() - started);

			// Summarize the result: array length for lists, key count for objects.
			const resultSummary = Array.isArray(result)
				? { kind: "array", length: result.length }
				: result && typeof result === "object"
					? { kind: "object", keys: Object.keys(result) }
					: { kind: typeof result };

			logger.info({
				msg: `[${name}] ← exit`,
				userId: context?.user?.id,
				durationMs,
				result: resultSummary
			});

			return result;
		} catch (error) {
			const durationMs = Math.round(performance.now() - started);
			const err = error instanceof Error ? error : new Error(String(error));

			logger.error(
				{
					msg: `[${name}] ✖ error`,
					userId: context?.user?.id,
					role: context?.user?.role,
					durationMs,
					input: toLoggable(data),
					errorName: err.name,
					errorMessage: err.message,
					// `stack` is captured explicitly so the repo's redact config does
					// not strip it, and so a `logger.error(string, Error)` overload
					// mismatch cannot hide it.
					stack: err.stack
				},
				err
			);

			// Re-throw so TanStack Start's error boundary and the client
			// deserializer see the original failure — logging must never swallow
			// an error.
			throw error;
		}
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Server functions
// ─────────────────────────────────────────────────────────────────────────────

export const $getStats = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			providerId: z.string().optional()
		})
	)
	.handler(
		runLogged("$getStats", async ({ data, context }) => {
			logger.debug({
				msg: "[$getStats] resolving clinic scope",
				userId: context.user.id,
				providerId: data.providerId
			});

			const clinicId = getClinicId(context.user);
			const scope = { clinicId, providerId: data.providerId };

			logger.debug({
				msg: "[$getStats] scope resolved",
				clinicId,
				providerId: data.providerId
			});

			const [
				activePatients,
				todayAppointments,
				pendingFollowUps,
				upcomingVaccinations,
				totalPatients,
				appointmentsThisWeek,
				completionRate
			] = await Promise.all([
				dashboardRepository.getActivePatientsCount(scope),
				dashboardRepository.getTodayAppointmentsCount(scope),
				dashboardRepository.getPendingFollowUpsCount(scope),
				dashboardRepository.getUpcomingVaccinationsCount(scope),
				dashboardRepository.getTotalPatientsCount(scope),
				dashboardRepository.getAppointmentsThisWeekCount(scope),
				dashboardRepository.getAppointmentCompletionRate(scope)
			]);

			logger.debug({
				msg: "[$getStats] repository results",
				activePatients,
				todayAppointments,
				pendingFollowUps,
				upcomingVaccinations,
				totalPatients,
				appointmentsThisWeek,
				completionRate
			});

			return {
				activePatients,
				todayAppointments,
				pendingFollowUps,
				upcomingVaccinations,
				totalPatients,
				appointmentsThisWeek,
				completionRate: Math.round(completionRate * 100) / 100
			};
		})
	);

export const $getTodaySchedule = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			providerId: z.string().optional(),
			date: z.iso.datetime().optional(),
			includeCompleted: z.boolean().optional().default(false),
			limit: z.number().min(1).max(100).default(20)
		})
	)
	.handler(
		runLogged("$getTodaySchedule", async ({ data, context }) => {
			const clinicId = getClinicId(context.user);
			const scope = { clinicId, providerId: data.providerId };

			const scheduleDate = data.date ? new Date(data.date) : new Date();

			logger.debug({
				msg: "[$getTodaySchedule] querying",
				clinicId,
				providerId: data.providerId,
				scheduleDate: scheduleDate.toISOString(),
				includeCompleted: data.includeCompleted,
				limit: data.limit
			});

			const appointments = await dashboardRepository.getAppointmentsByDate(
				scheduleDate,
				scope,
				{
					includeCompleted: data.includeCompleted,
					limit: data.limit
				}
			);

			logger.debug({
				msg: "[$getTodaySchedule] rows returned",
				count: appointments.length
			});

			const now = new Date();

			return appointments.map(apt => {
				const statusLower = apt.status?.toLowerCase() || "";
				return {
					id: apt.id,
					patientId: apt.patientId,
					patientName: apt.patientName,
					time: new Date(apt.appointmentDate).toLocaleTimeString("en-US", {
						hour: "2-digit",
						minute: "2-digit"
					}),
					type: apt.appointmentType,
					status: apt.status,
					isOverdue:
						new Date(apt.appointmentDate) < now &&
						statusLower !== "completed" &&
						statusLower !== "cancelled",
					isUrgent: apt.priority === "Urgent" || apt.priority === "Emergency",
					notes: apt.notes || undefined
				};
			});
		})
	);

export const $getRecentActivity = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			providerId: z.string().optional(),
			limit: z.number().min(1).max(50).default(10),
			offset: z.number().min(0).default(0)
		})
	)
	.handler(
		runLogged("$getRecentActivity", async ({ data, context }) => {
			const clinicId = getClinicId(context.user);
			const scope = { clinicId, providerId: data.providerId };

			logger.debug({
				msg: "[$getRecentActivity] querying",
				clinicId,
				providerId: data.providerId,
				limit: data.limit,
				offset: data.offset
			});

			const visits = await dashboardRepository.getRecentVisits(
				scope,
				data.limit,
				data.offset
			);

			logger.debug({
				msg: "[$getRecentActivity] rows returned",
				count: visits.length
			});

			return visits.map(visit => ({
				id: visit.id,
				patientId: visit.patientId,
				patientName: visit.patientName,
				type: "visit" as const,
				description: `${visit.visitType} visit completed`,
				timestamp: visit.visitDate,
				isUrgent: false
			}));
		})
	);

export const $getAlerts = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			providerId: z.string().optional(),
			limit: z.number().min(1).max(50).default(10),
			severity: z.enum(["low", "medium", "high", "critical"]).optional(),
			includeResolved: z.boolean().optional().default(false)
		})
	)
	.handler(
		runLogged("$getAlerts", async ({ data, context }) => {
			const clinicId = getClinicId(context.user);
			const scope = { clinicId, providerId: data.providerId };

			logger.debug({
				msg: "[$getAlerts] querying overdue vaccinations",
				clinicId,
				providerId: data.providerId,
				limit: data.limit + 5,
				severity: data.severity
			});

			const overdueVaccinations =
				await dashboardRepository.getOverdueVaccinations(scope, data.limit + 5);

			logger.debug({
				msg: "[$getAlerts] overdue vaccinations returned",
				count: overdueVaccinations.length
			});

			const alerts: Array<Alert> = overdueVaccinations.flatMap(vax => {
				if (!vax.scheduledDate) return [];
				if (data.severity && data.severity !== "critical") return [];

				return [
					{
						id: `vax-${vax.patientId}-${vax.scheduledDate}`,
						patientId: vax.patientId,
						patientName: vax.patientName,
						type: "overdue_vaccination",
						message: `${vax.vaccineName} vaccination overdue (${new Date(vax.scheduledDate).toLocaleDateString()})`,
						severity: "critical",
						timestamp: new Date(vax.scheduledDate),
						isResolved: false,
						actionUrl: `/patients/${vax.patientId}/immunizations`
					} satisfies Alert
				];
			});

			const sortedAlerts = alerts
				.toSorted((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
				.filter(
					(alert, index, self) =>
						index ===
						self.findIndex(
							a => a.patientId === alert.patientId && a.type === alert.type
						)
				);

			const filtered = data.includeResolved
				? sortedAlerts
				: sortedAlerts.filter(a => !a.isResolved);

			logger.debug({
				msg: "[$getAlerts] alerts built",
				built: alerts.length,
				afterDedupe: sortedAlerts.length,
				returned: filtered.slice(0, data.limit).length
			});

			return filtered.slice(0, data.limit);
		})
	);

export const $getDashboard = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			date: z
				.date()
				.optional()
				.default(() => new Date()),
			includeAlerts: z.boolean().default(true),
			includeActivity: z.boolean().default(true),
			includeSchedule: z.boolean().default(true)
		})
	)
	.handler(
		runLogged("$getDashboard", async ({ data, context }) => {
			const start = performance.now();
			const providerId =
				context.user.role === "doctor" ? context.user.id : undefined;

			logger.debug({
				msg: "[$getDashboard] fanning out",
				userId: context.user.id,
				role: context.user.role,
				clinicId: context.user.clinicId,
				providerId,
				date: data.date.toISOString(),
				includeSchedule: data.includeSchedule,
				includeActivity: data.includeActivity,
				includeAlerts: data.includeAlerts
			});

			const [stats, schedule, activity, alerts] = await Promise.all([
				timeBranch(start, "$getStats", $getStats({ data: { providerId } })),
				data.includeSchedule
					? timeBranch(
							start,
							"$getTodaySchedule",
							$getTodaySchedule({
								data: {
									providerId,
									date: data.date.toISOString(),
									includeCompleted: false,
									limit: 20
								}
							})
						)
					: Promise.resolve([]),
				data.includeActivity
					? timeBranch(
							start,
							"$getRecentActivity",
							$getRecentActivity({ data: { providerId, limit: 10 } })
						)
					: Promise.resolve([]),
				data.includeAlerts
					? timeBranch(
							start,
							"$getAlerts",
							$getAlerts({ data: { providerId, limit: 10 } })
						)
					: Promise.resolve([])
			]);

			logger.debug({
				msg: "[$getDashboard] all branches resolved",
				durationMs: Math.round(performance.now() - start),
				scheduleCount: Array.isArray(schedule) ? schedule.length : 0,
				activityCount: Array.isArray(activity) ? activity.length : 0,
				alertCount: Array.isArray(alerts) ? alerts.length : 0
			});

			logger.debug({
				msg: "Dashboard data retrieved",
				userId: context.user.id,
				duration: `${(performance.now() - start).toFixed(2)}ms`
			});

			return {
				stats,
				todaySchedule: schedule,
				recentActivity: activity,
				alerts,
				lastUpdated: new Date()
			};
		})
	);

export const $getDashboardStats = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.handler(
		runLogged("$getDashboardStats", async ({ context }) =>
			$getStats({
				data: {
					providerId:
						context.user.role === "doctor" ? context.user.id : undefined
				}
			})
		)
	);
