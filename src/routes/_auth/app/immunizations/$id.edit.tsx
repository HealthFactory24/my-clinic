// src/routes/_auth/app/immunizations/$id.edit.tsx

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ImmunizationForm } from "@/components/form/modules/ImmunizationForm";
import { ImmunizationDetailSkeleton } from "@/components/skeletons";
import { _requireRole } from "@/lib/auth/functions";

export const Route = createFileRoute("/_auth/app/immunizations/$id/edit")({
	component: EditImmunizationPage,
	pendingComponent: ImmunizationDetailSkeleton,
	beforeLoad: async () => {
		await _requireRole({ data: ["admin", "doctor"] });
	}
});

function EditImmunizationPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();

	const handleClose = () => {
		navigate({ to: "/app/immunizations/$id", params: { id } });
	};

	const handleSuccess = () => {
		navigate({ to: "/app/immunizations/$id", params: { id } });
	};

	return (
		<ImmunizationForm
			immunizationId={id}
			onClose={handleClose}
			onSuccess={handleSuccess}
			redirectTo='/app/immunizations'
		/>
	);
}
