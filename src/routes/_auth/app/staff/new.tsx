import { createFileRoute } from "@tanstack/react-router";

import { StaffForm } from "#/components/form/modules/StaffForm.tsx";

export const Route = createFileRoute("/_auth/app/staff/new")({
	component: NewStaffPage
});

function NewStaffPage() {
	return <StaffForm redirectTo='/app/staff' />;
}
