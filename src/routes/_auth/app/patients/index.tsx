import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";

import { PatientsTable } from "#/components/table/modules/PatientsTable.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/_auth/app/patients/")({
	component: PatientsPage
});

function PatientsPage() {
	const navigate = useNavigate();

	return (
		<div className='space-y-6'>
			<header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='font-bold text-2xl tracking-tight'>Patients</h1>
					<p className='mt-0.5 text-muted-foreground text-sm'>
						Manage patient records, demographics, and clinical history.
					</p>
				</div>
				<Button onClick={() => navigate({ to: "/app/patients/new" })}>
					<UserPlus className='mr-2 size-4' />
					New Patient
				</Button>
			</header>

			<PatientsTable />
		</div>
	);
}
