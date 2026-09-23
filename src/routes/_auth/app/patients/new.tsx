import { createFileRoute } from "@tanstack/react-router";

import { PatientForm } from "#/components/form/modules/PatientForm.tsx";

export const Route = createFileRoute("/_auth/app/patients/new")({
	component: NewPatientPage
});

function NewPatientPage() {
	return <PatientForm redirectTo='/app/patients' />;
}
