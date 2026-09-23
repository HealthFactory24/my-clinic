// routes/_auth/app/immunizations/new.tsx
import { createFileRoute, useSearch } from "@tanstack/react-router";

import { ImmunizationForm } from "#/components/form/modules/ImmunizationForm.tsx";

export const Route = createFileRoute("/_auth/app/immunizations/new")({
	validateSearch: (
		search: Record<string, unknown>
	): { patientId?: string } => ({
		patientId:
			typeof search.patientId === "string" ? search.patientId : undefined
	}),
	component: NewImmunizationPage
});

function NewImmunizationPage() {
	const { patientId } = useSearch({ from: "/_auth/app/immunizations/new" });

	return (
		<ImmunizationForm
			patientId={patientId}
			redirectTo='/app/immunizations'
		/>
	);
}
