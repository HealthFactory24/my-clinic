// src/lib/auth/middleware.ts
import { createMiddleware } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseStatus
} from "@tanstack/react-start/server";

import { _getUser } from "#/lib/auth/functions.ts";
import type { Role } from "#/lib/auth/roles.ts";

// https://tanstack.com/start/latest/docs/framework/react/guide/middleware

/**
 * Canonical call form for `getClinicId`:
 *
 *     getClinicId(context.user)
 *
 * Every server fn in `src/server/*` passes `context.user` (which carries
 * `clinicId: string | null`). Do NOT pass `context` directly — `context`
 * has no top-level `clinicId`, so `getClinicId(context)` would silently
 * receive `undefined` and throw the wrong error.
 */

/**
 * Middleware to force authentication on server requests (including server functions), and add the user to the context.
 *
 * Follows the cookieCache option in the auth config (template default: 5 mins).
 * This is recommended for most cases, like route-level data fetching operations where some staleness may be acceptable and reduced database load is beneficial.
 *
 * @see https://better-auth.com/docs/concepts/session-management#cookie-cache
 */
export const authMiddleware = createMiddleware().server(async ({ next }) => {
	const user = await _getUser();

	if (!user) {
		setResponseStatus(401);
		throw new Error("Unauthorized");
	}

	return next({ context: { user } });
});

/**
 * Middleware to force authentication on server requests (including server functions), and add the user to the context.
 *
 * Auth cookie cache is disabled, and fresh user session is always fetched from database.
 * This is recommended for sensitive/destructive operations and mutations that require the freshest auth state, e.g. to prevent a user from performing an action after their session has expired or been revoked.
 *
 * @see https://better-auth.com/docs/concepts/session-management#cookie-cache
 */
export const freshAuthMiddleware = createMiddleware().server(
	async ({ next }) => {
		const user = await _getUser({
			// ensure session is fresh
			// https://better-auth.com/docs/concepts/session-management#cookie-cache
			disableCookieCache: true
		});

		if (!user) {
			setResponseStatus(401);
			throw new Error("Unauthorized");
		}

		return next({ context: { user } });
	}
);

/**
 * Role-gated authentication using the cookie-cached session.
 *
 * Use for reads and low-risk mutations where up to `cookieCache.maxAge`
 * (60s in `auth.ts`) of role staleness is acceptable. For destructive
 * writes, use `freshRequireRoleMiddleware` or `freshAdminMiddleware`.
 *
 * Standalone middleware — do NOT chain after another middleware whose
 * context you depend on; this returns a fresh `{ user }` context.
 */
export const requireRoleMiddleware = (allowedRoles: Role | Array<Role>) =>
	createMiddleware().server(async ({ next }) => {
		const user = await _getUser();

		if (!user) {
			setResponseStatus(401);
			throw new Error("Unauthorized");
		}

		const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
		const userRole = user.role;

		if (!userRole || !roles.includes(userRole)) {
			setResponseStatus(403);
			throw new Error(
				`Forbidden: Requires one of the following roles: ${roles.join(", ")}`
			);
		}

		return next({ context: { user } });
	});

/**
 * Role-gated authentication using a fresh (uncached) session.
 *
 * Use for destructive writes: deletes, merges, archives, role changes,
 * suspensions, activations. Prevents a user demoted or banned within the
 * cookie-cache window from completing the action.
 */
export const freshRequireRoleMiddleware = (allowedRoles: Role | Array<Role>) =>
	createMiddleware().server(async ({ next }) => {
		const user = await _getUser({ disableCookieCache: true });

		if (!user) {
			setResponseStatus(401);
			throw new Error("Unauthorized");
		}

		const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
		const userRole = user.role;

		if (!userRole || !roles.includes(userRole)) {
			setResponseStatus(403);
			throw new Error(
				`Forbidden: Requires one of the following roles: ${roles.join(", ")}`
			);
		}

		return next({ context: { user } });
	});

/**
 * Staff-and-above: `admin`, `doctor`, or `staff`.
 * Uses the cookie-cached session — adequate for reads and routine writes.
 */
export const staffMiddleware = requireRoleMiddleware([
	"admin",
	"doctor",
	"staff"
]);

/**
 * Doctor-and-above: `admin` or `doctor`.
 * Uses the cookie-cached session — adequate for clinical writes.
 *
 * If a handler guarded by this middleware must not admit a `staff` or
 * `patient` role, the role check below is the enforcement point.
 */
export const doctorMiddleware = requireRoleMiddleware(["admin", "doctor"]);

/**
 * Admin-only using the cookie-cached session.
 * Use for admin READS (`$listUsers`, `$getUserById`, `$findAuditLogs`, stats).
 * For admin WRITES, use `freshAdminMiddleware`.
 */
export const adminMiddleware = createMiddleware({ type: "function" })
	.middleware([authMiddleware])
	.server(async ({ next, context }) => {
		if (context.user.role !== "admin") {
			setResponseStatus(403);
			throw new Error("FORBIDDEN");
		}
		return next({ context });
	});

/**
 * Admin-only using a fresh (uncached) session.
 *
 * Use for every destructive admin handler:
 *   `$deleteUser`, `$suspendUser`, `$activateUser`, `$updateUserRole`,
 *   `$deletePatient`, `$mergePatients`,
 *   `$deleteAppointment`, `$deleteEncounter`, `$deleteImmunization`,
 *   `$deleteLabOrder`, `$deletePrescription`, `$deleteVitals`,
 *   `$deleteGrowthMeasurement`, `$deleteStaff`, `$toggleStaffActive`.
 */
export const freshAdminMiddleware = createMiddleware({ type: "function" })
	.middleware([freshAuthMiddleware])
	.server(async ({ next, context }) => {
		if (context.user.role !== "admin") {
			setResponseStatus(403);
			throw new Error("FORBIDDEN");
		}
		return next({ context });
	});

export const publicMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) =>
		next({
			context: {
				request: { headers: getRequestHeaders() }
			}
		})
);

/**
 * Read the current user's clinic ID, or throw if the user is not assigned
 * to a clinic.
 *
 * Canonical call form (see top-of-file note):
 *
 *     getClinicId(context.user)
 *
 * @throws {Error} "Clinic ID is required" when `ctx.clinicId` is null/empty.
 *   Handlers that call this must ensure the user is clinic-scoped (all
 *   `staff`/`doctor`/`admin` users created by the app are). An admin with
 *   `clinicId === null` will crash the handler.
 */
export function getClinicId(ctx: { clinicId: string | null }): string {
	if (!ctx.clinicId) throw new Error("Clinic ID is required");
	return ctx.clinicId;
}
