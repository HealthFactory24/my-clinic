import { createFileRoute } from "@tanstack/react-router";

import { EncounterForm } from "#/components/form/modules/EncounterForm.tsx";

export const Route = createFileRoute("/_auth/app/encounters/$encounterId/edit")(
	{
		component: EditEncounterPage
	}
);

function EditEncounterPage() {
	const { encounterId } = Route.useParams();

	return (
		<EncounterForm
			encounterId={encounterId}
			redirectTo={`/app/encounters/${encounterId}`}
		/>
	);
}
