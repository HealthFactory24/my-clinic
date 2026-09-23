import { createFileRoute } from "@tanstack/react-router";

import { PrescriptionForm } from "#/components/form/modules/PrescriptionForm.tsx";

export const Route = createFileRoute(
	"/_auth/app/prescriptions/$prescriptionId/edit"
)({
	component: EditPrescriptionPage
});

function EditPrescriptionPage() {
	const { prescriptionId } = Route.useParams();

	return (
		<PrescriptionForm
			prescriptionId={prescriptionId}
			redirectTo={`/app/prescriptions/${prescriptionId}`}
		/>
	);
}
