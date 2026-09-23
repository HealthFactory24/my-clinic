// components/clinic/allergy-alert.tsx

import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AllergySeverity = "mild" | "moderate" | "severe" | "anaphylactic";

interface Allergy {
	/** Allergen name, e.g. "Penicillin". */
	allergen: string;
	/** Reaction description, e.g. "Hives, rash". */
	reaction?: string;
	/** Severity level. */
	severity?: AllergySeverity;
}

interface AllergyAlertProps {
	/** List of allergies to display. */
	allergies?: Allergy[];
	/** Patient name for context. */
	patientName?: string;
	/** Show the "No known allergies" state when list is empty. */
	showEmptyState?: boolean;
	/** Visual variant. */
	variant?: "default" | "compact" | "banner";
	/** Card heading. Set to `null` to omit. */
	title?: string | null;
	className?: string;
	children?: React.ReactNode;
}

const SEVERITY_CONFIG: Record<
	AllergySeverity,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
		color: string;
	}
> = {
	mild: {
		label: "Mild",
		variant: "secondary",
		color: "text-blue-700 bg-blue-50 border-blue-200"
	},
	moderate: {
		label: "Moderate",
		variant: "outline",
		color: "text-amber-700 bg-amber-50 border-amber-200"
	},
	severe: {
		label: "Severe",
		variant: "destructive",
		color: "text-orange-700 bg-orange-50 border-orange-200"
	},
	anaphylactic: {
		label: "Anaphylactic",
		variant: "destructive",
		color: "text-red-700 bg-red-50 border-red-200"
	}
};

const DEFAULT_ALLERGIES: Allergy[] = [
	{ allergen: "Penicillin", reaction: "Hives, rash", severity: "moderate" },
	{ allergen: "Peanuts", reaction: "Anaphylaxis", severity: "anaphylactic" },
	{ allergen: "Latex", reaction: "Contact dermatitis", severity: "mild" }
];

function SeverityIcon({ severity }: { severity: AllergySeverity }) {
	switch (severity) {
		case "anaphylactic":
			return <ShieldAlert className='h-4 w-4 text-red-600' />;
		case "severe":
			return <AlertTriangle className='h-4 w-4 text-orange-600' />;
		case "moderate":
			return <AlertTriangle className='h-4 w-4 text-amber-600' />;
		default:
			return <Info className='h-4 w-4 text-blue-600' />;
	}
}

function EmptyAllergyState() {
	return (
		<div className='flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3'>
			<div className='flex size-6 items-center justify-center rounded-full bg-emerald-100'>
				<span className='text-emerald-600 text-xs'>✓</span>
			</div>
			<div>
				<p className='font-medium text-emerald-800 text-sm'>
					No Known Allergies
				</p>
				<p className='text-emerald-600 text-xs'>
					No allergies have been documented for this patient.
				</p>
			</div>
		</div>
	);
}

export function AllergyAlert({
	allergies = DEFAULT_ALLERGIES,
	patientName,
	showEmptyState = true,
	variant = "default",
	title = "Allergy Alerts",
	className,
	children
}: AllergyAlertProps) {
	const isCompact = variant === "compact";
	const isBanner = variant === "banner";

	if (allergies.length === 0) {
		if (!showEmptyState) return null;

		if (isBanner) {
			return (
				<div
					className={cn(
						"rounded-lg border border-emerald-200 bg-emerald-50 p-3",
						className
					)}
				>
					<p className='font-medium text-emerald-800 text-sm'>
						No Known Allergies
					</p>
					{children}
				</div>
			);
		}

		const content = <EmptyAllergyState />;

		if (title === null) {
			return <div className={className}>{content}</div>;
		}

		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle>{title}</CardTitle>
				</CardHeader>
				<CardContent>{content}</CardContent>
			</Card>
		);
	}

	const allergyList = (
		<div className='space-y-2'>
			{allergies.map(allergy => {
				const config = SEVERITY_CONFIG[allergy.severity ?? "mild"];
				return (
					<div
						className={cn(
							"flex items-start justify-between rounded-md border p-3",
							config.color
						)}
						key={allergy.allergen}
					>
						<div className='flex items-start gap-2'>
							<SeverityIcon severity={allergy.severity ?? "mild"} />
							<div className='space-y-0.5'>
								<p className='font-medium'>{allergy.allergen}</p>
								{allergy.reaction && (
									<p className='text-sm opacity-80'>{allergy.reaction}</p>
								)}
							</div>
						</div>
						<Badge variant={config.variant}>{config.label}</Badge>
					</div>
				);
			})}
		</div>
	);

	if (isBanner) {
		return (
			<div
				className={cn(
					"flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4",
					className
				)}
			>
				<ShieldAlert className='h-5 w-5 shrink-0 text-red-600' />
				<div className='flex-1'>
					<p className='font-semibold text-red-900'>
						{patientName ? `${patientName} — ` : ""}Allergy Alert
					</p>
					<div className='mt-2 flex flex-wrap gap-2'>
						{allergies.map(allergy => (
							<Badge
								className='border-red-300 bg-red-100 text-red-800'
								key={allergy.allergen}
								variant='outline'
							>
								{allergy.allergen}
								{allergy.severity === "anaphylactic" && " ⚠️"}
							</Badge>
						))}
					</div>
				</div>
				{children}
			</div>
		);
	}

	if (isCompact) {
		return (
			<div
				className={cn(
					"rounded-md border border-red-200 bg-red-50 p-2",
					className
				)}
			>
				<div className='flex flex-wrap gap-1'>
					{allergies.map(allergy => (
						<Badge
							className='border-red-300 bg-red-100 text-red-800 text-xs'
							key={allergy.allergen}
							variant='outline'
						>
							{allergy.allergen}
						</Badge>
					))}
				</div>
				{children}
			</div>
		);
	}

	if (title === null) {
		return <div className={className}>{allergyList}</div>;
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<ShieldAlert className='h-4 w-4 text-red-600' />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{allergyList}
				{children}
			</CardContent>
		</Card>
	);
}
