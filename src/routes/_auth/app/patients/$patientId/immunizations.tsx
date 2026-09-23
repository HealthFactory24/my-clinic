import { createFileRoute, useParams } from "@tanstack/react-router";

import { ImmunizationsTable } from "#/components/table/modules/ImmunizationsTable.tsx";

export const Route = createFileRoute(
	"/_auth/app/patients/$patientId/immunizations"
)({
	component: PatientImmunizationsPage
});

function PatientImmunizationsPage() {
	const { patientId } = useParams({ from: "/_auth/app/patients/$patientId" });

	return <ImmunizationsTable patientId={patientId} />;
}
