// src/routes/_auth/app/prescriptions/$id.edit.tsx

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { _requireRole } from "@/lib/auth/functions";

import { PrescriptionForm } from "../../../../components/form/modules/PrescriptionForm";
import { usePrescription } from "../../../../hooks/use-prescriptions";

export const Route = createFileRoute("/_auth/app/prescriptions/$id/edit")({
	component: EditPrescriptionPage,
	beforeLoad: async () => {
		await _requireRole({ data: ["admin", "doctor", "staff"] });
	}
});

function EditPrescriptionPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data, isLoading, isError, error } = usePrescription(id);

	// If usePrescription returns an array, pick the first item or adjust based on your API
	const prescription = Array.isArray(data) ? data[0] : data;

	if (isLoading) {
		return (
			<div className='flex h-96 items-center justify-center'>
				<Loader2 className='size-8 animate-spin text-teal-600' />
			</div>
		);
	}

	if (isError || !prescription) {
		return (
			<div className='container mx-auto max-w-3xl py-6'>
				<Card>
					<CardContent className='flex flex-col items-center justify-center py-12'>
						<AlertCircle className='size-12 text-rose-400' />
						<h3 className='mt-4 font-bold text-base text-slate-700'>
							Prescription not found
						</h3>
						<p className='mt-1 text-slate-500 text-xs'>
							{error instanceof Error
								? error.message
								: "This prescription no longer exists."}
						</p>
						<Button
							asChild
							className='mt-4'
						>
							<Link to='/app/prescriptions'>Back to Prescriptions</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Block editing of non-Active prescriptions
	if (prescription.status !== "Active") {
		return (
			<div className='container mx-auto max-w-3xl py-6'>
				<Card>
					<CardContent className='flex flex-col items-center justify-center py-12'>
						<AlertCircle className='size-12 text-amber-400' />
						<h3 className='mt-4 font-bold text-base text-slate-700'>
							Cannot edit this prescription
						</h3>
						<p className='mt-1 text-slate-500 text-xs'>
							Only <strong>Active</strong> prescriptions can be edited. This one
							is <strong>{prescription.status}</strong>.
						</p>
						<div className='mt-4 flex gap-2'>
							<Button
								asChild
								variant='outline'
							>
								<Link
									params={{ id }}
									to='/app/prescriptions/$id'
								>
									View Prescription
								</Link>
							</Button>
							<Button onClick={() => navigate({ to: "/app/prescriptions" })}>
								Back to List
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className='container mx-auto max-w-3xl py-6'>
			<PrescriptionForm prescriptionId={id} />
		</div>
	);
}
