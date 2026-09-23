import { createFileRoute, useParams } from "@tanstack/react-router";

import { LabsTable } from "#/components/table/modules/LabsTable.tsx";

export const Route = createFileRoute("/_auth/app/patients/$patientId/labs")({
	component: PatientLabsPage
});

function PatientLabsPage() {
	const { patientId } = useParams({ from: "/_auth/app/patients/$patientId" });

	return <LabsTable patientId={patientId} />;
}
