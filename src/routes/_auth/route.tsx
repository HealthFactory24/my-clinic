import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authQueryOptions } from "#/lib/auth/queries.ts";

/**
 * This is the _auth layout, which enables 'protected routes'
 * for all child routes under _auth (e.g. _auth/app/*)
 */
export const Route = createFileRoute("/_auth")({
	component: Outlet,
	beforeLoad: async ({ context }) => {
		const user = await context.queryClient.query({
			...authQueryOptions(),
			retry: true,
			staleTime: 60000
		});
		if (!user) {
			throw redirect({
				to: "/login",
				search: prev => ({ ...prev, redirect: "/app" })
			});
		}
	}
});
