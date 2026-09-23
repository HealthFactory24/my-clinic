// src/routes/_auth/app/settings/index.tsx
import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "#/components/settings/settings-page.tsx";

export const Route = createFileRoute("/_auth/app/settings/")({
	component: SettingsIndexRoute,
	head: () => ({
		meta: [{ title: "Settings — Smart Clinic" }]
	})
});

function SettingsIndexRoute() {
	// The `/_auth` layout has already validated the session before this renders,
	// so we don't need `useAuthSuspense()` here. `SettingsPage` reads the user
	// only where it needs to (e.g. the Account tab).
	return <SettingsPage />;
}
