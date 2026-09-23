import { createFileRoute } from "@tanstack/react-router";

import { PrescriptionTable } from "#/components/table/modules/PrescriptionTable.tsx";

export const Route = createFileRoute("/_auth/app/prescriptions/")({
	component: PrescriptionsPage
});

function PrescriptionsPage() {
	return <PrescriptionTable />;
}
