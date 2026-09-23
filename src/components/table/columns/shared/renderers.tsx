import { Badge } from "@/components/ui/badge";
import type { Guardian, Patient, PatientAllergy } from "@/lib/db/schema";
import { cn, toSentenceCase } from "@/lib/utils";
import { calculatePediatricAge } from "@/utils/index";

import { type BadgeVariant, STATUS_VARIANTS } from "./variants";

/** Date renderer — optionally includes time on a second line. */
export function renderDate(date: string | Date, includeTime = false) {
	const d = typeof date === "string" ? new Date(date) : date;
	if (includeTime) {
		return (
			<div className='flex flex-col'>
				<span>{d.toLocaleDateString()}</span>
				<span className='text-muted-foreground text-xs'>
					{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
				</span>
			</div>
		);
	}
	return <span>{d.toLocaleDateString()}</span>;
}

export function renderStatusBadge(
	status: string,
	overrides?: Record<string, BadgeVariant>
) {
	const variants = STATUS_VARIANTS as Record<string, BadgeVariant>;
	const variant = overrides?.[status] ?? variants[status] ?? "default";

	return <Badge variant={variant}>{toSentenceCase(status)}</Badge>;
}
/** Patient avatar + name + MRN + age line. */
export function renderPatientName(
	patient: Pick<
		Patient,
		"firstName" | "lastName" | "mrn" | "gender" | "dateOfBirth"
	>
) {
	const age = calculatePediatricAge(patient.dateOfBirth);
	const initials =
		`${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`.toUpperCase();
	const isMale = patient.gender === "male";

	return (
		<div className='flex items-center gap-3 py-1'>
			<div
				className={cn(
					"flex size-9 shrink-0 items-center justify-center rounded-full font-bold text-xs shadow-sm",
					isMale
						? "border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400"
						: "border border-pink-500/20 bg-pink-500/10 text-pink-700 dark:text-pink-400"
				)}
			>
				{initials}
			</div>
			<div className='flex flex-col truncate'>
				<div className='flex items-center gap-2'>
					<span className='truncate font-semibold text-foreground'>
						{patient.firstName} {patient.lastName}
					</span>
					<Badge
						className='px-1.5 text-[10px]'
						variant='outline'
					>
						{age.ageGroup}
					</Badge>
				</div>
				<div className='flex items-center gap-1.5 text-muted-foreground text-xs'>
					<span className='font-mono'>{patient.mrn}</span>
					<span>•</span>
					<span className='capitalize'>{patient.gender}</span>
					<span>•</span>
					<span>{age.displayString}</span>
				</div>
			</div>
		</div>
	);
}
export const renderGuardian = (guardian: Guardian | null | undefined) => {
	if (!guardian)
		return <span className='text-muted-foreground text-xs'>—</span>;
	return (
		<div className='text-xs'>
			<div className='font-medium text-foreground'>{guardian.name}</div>
			<div className='text-muted-foreground'>{guardian.relationship}</div>
			{Boolean(guardian.phone) && (
				<div className='text-[10px] text-muted-foreground'>
					{guardian.phone}
				</div>
			)}
		</div>
	);
};

/**
 * Render allergies with severity indicators
 */
export const renderAllergies = (allergies: PatientAllergy[]) => {
	if (allergies.length === 0) {
		return (
			<div className='flex items-center text-emerald-600 text-xs'>
				<span className='mr-1.5 size-1.5 rounded-full bg-emerald-500' />
				No known allergies
			</div>
		);
	}

	const severityColors: Record<string, string> = {
		Mild: "border-blue-200 bg-blue-50 text-blue-700",
		Moderate: "border-amber-200 bg-amber-50 text-amber-700",
		Severe: "border-orange-200 bg-orange-50 text-orange-700",
		Anaphylactic: "border-rose-200 bg-rose-50 text-rose-700"
	};

	return (
		<div className='flex flex-wrap gap-1'>
			{allergies.slice(0, 3).map(allergy => (
				<Badge
					className={cn(
						"border px-1.5 py-0.5 text-[10px]",
						severityColors[allergy.severity] || "border-gray-200 bg-gray-50"
					)}
					key={allergy.id}
					variant='outline'
				>
					{allergy.allergen}
				</Badge>
			))}
			{allergies.length > 3 && (
				<Badge
					className='px-1.5 text-[10px]'
					variant='secondary'
				>
					+{allergies.length - 3}
				</Badge>
			)}
		</div>
	);
};
