import { createFileRoute } from "@tanstack/react-router";

import { PrescriptionTable } from "#/components/table/modules/PrescriptionTable.tsx";

export const Route = createFileRoute(
	"/_auth/app/patients/$patientId/prescriptions"
)({
	component: PatientPrescriptionsPage
});

function PatientPrescriptionsPage() {
	return <PrescriptionTable />;
}
