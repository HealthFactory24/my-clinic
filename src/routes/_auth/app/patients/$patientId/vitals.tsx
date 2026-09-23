import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { VitalsList } from "#/components/table/modules/VitalsTable.tsx";

export const Route = createFileRoute("/_auth/app/patients/$patientId/vitals")({
	component: PatientVitalsPage
});

function PatientVitalsPage() {
	const { patientId } = Route.useParams();
	const navigate = useNavigate();

	const handleAddVitals = useCallback(() => {
		void navigate({
			to: "/app/vitals/new",
			search: { patientId }
		});
	}, [navigate, patientId]);

	return (
		<VitalsList
			onAddVitals={handleAddVitals}
			patientId={patientId}
		/>
	);
}
