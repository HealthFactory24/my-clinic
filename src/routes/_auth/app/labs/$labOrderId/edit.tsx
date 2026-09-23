// src/routes/_auth/app/labs/$labOrderId/edit.tsx
import { createFileRoute } from "@tanstack/react-router";

import { LabOrderForm } from "#/components/form/modules/LabOrderForm.tsx";

export const Route = createFileRoute("/_auth/app/labs/$labOrderId/edit")({
	component: EditLabOrderPage
});

function EditLabOrderPage() {
	const { labOrderId } = Route.useParams();

	return (
		<LabOrderForm
			labOrderId={labOrderId}
			redirectTo={`/app/labs/${labOrderId}`}
		/>
	);
}
