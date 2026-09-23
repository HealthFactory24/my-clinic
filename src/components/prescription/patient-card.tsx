import { ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type Patient = {
	firstName: string;
	lastName: string;
	mrn: string;
	gender: string;
	allergies?: { allergen: string }[] | null;
};

type Age = { ageGroup: string; displayString: string } | null;

export function PatientCard({
	patient,
	age,
	weightKg
}: {
	patient: Patient;
	age: Age;
	weightKg?: number | null;
}) {
	return (
		<div className='rounded-lg border border-teal-200 bg-teal-50/70 p-4'>
			<div className='flex items-start gap-3'>
				<div className='flex size-12 items-center justify-center rounded-2xl bg-white font-bold text-sm text-teal-800 shadow-sm'>
					{patient.firstName?.[0]}
					{patient.lastName?.[0]}
				</div>
				<div className='min-w-0 flex-1'>
					<div className='flex flex-wrap items-center gap-2'>
						<span className='font-bold text-slate-800 text-sm'>
							{patient.firstName} {patient.lastName}
						</span>
						<Badge
							className='px-1.5 text-[10px]'
							variant='outline'
						>
							{age?.ageGroup ?? "—"}
						</Badge>
					</div>
					<div className='mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-600 text-xs'>
						<span className='font-mono'>{patient.mrn}</span>
						<span>•</span>
						<span>{age?.displayString ?? "Unknown age"}</span>
						<span>•</span>
						<span className='capitalize'>{patient.gender}</span>
						{weightKg ? (
							<>
								<span>•</span>
								<span>{weightKg} kg</span>
							</>
						) : null}
					</div>

					{patient.allergies && patient.allergies.length > 0 ? (
						<div className='mt-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800'>
							<ShieldAlert className='mt-0.5 size-3.5 shrink-0 text-rose-600' />
							<span>
								<strong>Allergies:</strong>{" "}
								{patient.allergies.map(a => a.allergen).join(", ")}
							</span>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
