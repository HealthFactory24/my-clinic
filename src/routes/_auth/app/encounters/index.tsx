import { createFileRoute } from "@tanstack/react-router";

import { EncountersTable } from "#/components/table/modules/EncountersTable.tsx";

export const Route = createFileRoute("/_auth/app/encounters/")({
	component: EncountersPage
});

function EncountersPage() {
	return <EncountersTable />;
}
