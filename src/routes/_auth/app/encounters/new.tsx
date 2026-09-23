import { createFileRoute, useSearch } from "@tanstack/react-router";

import { EncounterForm } from "#/components/form/modules/EncounterForm.tsx";

export const Route = createFileRoute("/_auth/app/encounters/new")({
	validateSearch: (
		search: Record<string, unknown>
	): { patientId?: string } => ({
		patientId:
			typeof search.patientId === "string" ? search.patientId : undefined
	}),
	component: NewEncounterPage
});

function NewEncounterPage() {
	const { patientId } = useSearch({ from: "/_auth/app/encounters/new" });

	return (
		<EncounterForm
			patientId={patientId}
			redirectTo='/app/encounters'
		/>
	);
}
