import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { PrescriptionForm } from "#/components/form/modules/PrescriptionForm.tsx";

const searchSchema = z.object({
	patientId: z.string().optional(),
	encounterId: z.string().optional()
});

export const Route = createFileRoute("/_auth/app/prescriptions/new")({
	validateSearch: searchSchema,
	component: NewPrescriptionPage
});

function NewPrescriptionPage() {
	const { patientId, encounterId } = Route.useSearch();

	if (!patientId) {
		return (
			<div className='flex flex-col items-center justify-center py-16 text-center'>
				<p className='font-medium'>Patient ID required</p>
				<p className='mt-0.5 text-muted-foreground text-sm'>
					Navigate from a patient&apos;s page to create a prescription.
				</p>
			</div>
		);
	}

	return (
		<PrescriptionForm
			encounterId={encounterId}
			patientId={patientId}
			redirectTo='/app/prescriptions'
		/>
	);
}
