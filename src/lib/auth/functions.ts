// src/lib/auth/functions.ts
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import {
	getRequest,
	getRequestHeaders,
	setResponseHeader
} from "@tanstack/react-start/server";

import { auth } from "#/lib/auth/auth.ts";

import type { Role } from "./auth-client";

/**
 * This server function is meant to be called via authQueryOptions() in queries.ts,
 * which is used in the _auth layout route to protect all child routes under it (e.g. _auth/app/*)
 *
 * For securing server functions or API routes,
 * consider using authMiddleware from middleware.ts instead.
 */
export const $getUser = createServerFn({ method: "GET" }).handler(async () => {
	const user = await _getUser();
	return user;
});

export const $getSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await _getSession();
		return session ? { user: session.user, session: session.session } : null;
	}
);

interface GetUserServerQuery {
	disableCookieCache?: boolean | undefined;
	disableRefresh?: boolean | undefined;
}

/**
 * Server-only util, meant to be used by the $getUser server function and auth middleware so logic can be shared with optional query params.
 *
 * For server app logic, consider using authMiddleware instead.
 */
export const _getUser = createServerOnlyFn(
	async (query?: GetUserServerQuery) => {
		const session = await auth.api.getSession({
			headers: getRequest().headers,
			query,
			returnHeaders: true
		});

		// Forward any Set-Cookie headers to the client, e.g. for session/cache refresh
		const cookies = session.headers?.getSetCookie();
		if (cookies?.length) {
			setResponseHeader("Set-Cookie", cookies);
		}

		return session.response?.user || null;
	}
);

// oxlint-disable-next-line no-underscore-dangle
export const _getSession = createServerOnlyFn(
	async (query?: GetUserServerQuery) => {
		const session = await auth.api.getSession({
			headers: getRequest().headers,
			query,
			returnHeaders: true
		});

		const cookies = session.headers?.getSetCookie();
		if (cookies?.length) {
			setResponseHeader("Set-Cookie", cookies);
		}

		return session.response || null;
	}
);

/**
 * Server-only utility to enforce role-based access control. Throws an error if the user lacks the required role.
 */
export const $requireRole = createServerOnlyFn(
	async (allowedRoles: Role | Array<Role>) => {
		const user = await _getUser();
		if (!user) {
			throw new Error("Unauthorized: Authentication required");
		}

		const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
		const userRole = (user as { role?: Role }).role;

		if (!userRole || !roles.includes(userRole)) {
			throw new Error(
				`Forbidden: Requires one of the following roles: ${roles.join(", ")}`
			);
		}

		return user;
	}
);
export const _requireRole = createServerFn({ method: "GET" })
	.validator((roles: Array<Role>) => roles)
	.handler(async ({ data: roles }) => {
		return $requireRole(roles); // now runs on server only
	});
export const signIn = createServerFn({ method: "POST" })
	.validator((data: { email: string; password: string }) => data)
	.handler(async ({ data }) => {
		try {
			const headers = getRequestHeaders();
			return await auth.api.signInEmail({ body: data, headers });
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "An unknown error occurred during sign up";
			throw new Error(message, { cause: error });
		}
	});

export const signUp = createServerFn({ method: "POST" })
	.validator(
		(data: { email: string; password: string; name: string; role?: Role }) =>
			data
	)
	.handler(async ({ data }) => {
		try {
			const headers = getRequestHeaders();
			return await auth.api.signUpEmail({ body: data, headers });
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "An unknown error occurred during sign up";
			throw new Error(message, { cause: error });
		}
	});

export type AuthQueryResult = Awaited<ReturnType<typeof _getUser>>;
export type SessionQueryResult = Awaited<ReturnType<typeof _getSession>>;
