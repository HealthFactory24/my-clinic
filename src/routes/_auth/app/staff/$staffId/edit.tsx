import { createFileRoute, useParams } from "@tanstack/react-router";

import { StaffForm } from "#/components/form/modules/StaffForm.tsx";

export const Route = createFileRoute("/_auth/app/staff/$staffId/edit")({
	component: EditStaffPage
});

function EditStaffPage() {
	const { staffId } = useParams({ from: "/_auth/app/staff/$staffId/edit" });

	return (
		<StaffForm
			redirectTo={`/app/staff/${staffId}`}
			staffId={staffId}
		/>
	);
}
