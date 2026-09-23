// src/routes/_auth/app/patients/$patientId/growth/history.tsx
import { createFileRoute } from "@tanstack/react-router";

import { GrowthMeasurementsTable } from "#/components/growth/growth-measurements-table.tsx";
import { GrowthHistorySkeleton } from "#/components/skeletons/detail-skeletons.tsx";
import { usePatientById } from "#/hooks/use-patients.ts";

export const Route = createFileRoute(
	"/_auth/app/patients/$patientId/growth/history"
)({
	component: PatientGrowthHistoryPage,
	pendingComponent: GrowthHistorySkeleton
});

function PatientGrowthHistoryPage() {
	const { patientId } = Route.useParams();
	const { data: patient } = usePatientById(patientId);

	return (
		<div className='space-y-4'>
			<div>
				<h2 className='font-semibold text-lg'>Growth History</h2>
				<p className='text-muted-foreground text-sm'>
					{patient
						? `${patient.firstName} ${patient.lastName} · full measurement log with age and percentile filters.`
						: "Full measurement log with age and percentile filters."}
				</p>
			</div>

			<GrowthMeasurementsTable patientId={patientId} />
		</div>
	);
}
