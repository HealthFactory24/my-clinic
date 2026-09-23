import { createFileRoute, useParams } from "@tanstack/react-router";

import { PatientForm } from "#/components/form/modules/PatientForm.tsx";

export const Route = createFileRoute("/_auth/app/patients/$patientId/edit")({
	component: EditPatientPage
});

function EditPatientPage() {
	const { patientId } = useParams({ from: "/_auth/app/patients/$patientId" });

	return (
		<PatientForm
			patientId={patientId}
			redirectTo={`/app/patients/${patientId}`}
		/>
	);
}
