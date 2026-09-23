import { createFileRoute } from "@tanstack/react-router";

import { ImmunizationForm } from "#/components/form/modules/ImmunizationForm.tsx";

export const Route = createFileRoute(
	"/_auth/app/immunizations/$immunizationId/edit"
)({
	component: EditImmunizationPage
});

function EditImmunizationPage() {
	const { immunizationId } = Route.useParams();

	return (
		<ImmunizationForm
			immunizationId={immunizationId}
			redirectTo='/app/immunizations'
		/>
	);
}
