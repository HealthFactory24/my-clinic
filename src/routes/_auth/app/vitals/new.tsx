import { createFileRoute, useSearch } from "@tanstack/react-router";

import { VitalsForm } from "#/components/form/modules/VitalsForm.tsx";

type VitalsNewSearch = {
	patientId: string | undefined;
	encounterId?: string | undefined;
};

export const Route = createFileRoute("/_auth/app/vitals/new")({
	validateSearch: (search: Record<string, unknown>): VitalsNewSearch => ({
		patientId:
			typeof search.patientId === "string" ? search.patientId : undefined,
		encounterId:
			typeof search.encounterId === "string" ? search.encounterId : undefined
	}),
	component: NewVitalsPage
});

function NewVitalsPage() {
	const { patientId, encounterId } = useSearch({
		from: "/_auth/app/vitals/new"
	});

	if (!patientId) {
		return (
			<div className='flex flex-col items-center justify-center py-16 text-center'>
				<p className='font-medium'>Patient ID required</p>
				<p className='mt-0.5 text-muted-foreground text-sm'>
					Navigate from a patient&apos;s page to record vitals.
				</p>
			</div>
		);
	}

	return (
		<VitalsForm
			encounterId={encounterId}
			patientId={patientId}
			redirectTo={`/app/patients/${patientId}/vitals`}
		/>
	);
}
