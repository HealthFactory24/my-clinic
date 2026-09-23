import { createFileRoute, useSearch } from "@tanstack/react-router";

import { AppointmentForm } from "#/components/form/modules/AppointmentForm.tsx";

export const Route = createFileRoute("/_auth/app/appointments/new")({
	validateSearch: (
		search: Record<string, unknown>
	): { patientId?: string } => ({
		patientId:
			typeof search.patientId === "string" ? search.patientId : undefined
	}),
	component: NewAppointmentPage
});

function NewAppointmentPage() {
	const { patientId } = useSearch({ from: "/_auth/app/appointments/new" });

	return (
		<AppointmentForm
			patientId={patientId}
			redirectTo='/app/appointments'
		/>
	);
}
