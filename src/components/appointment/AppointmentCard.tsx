// src/components/appointments/AppointmentCard.tsx
import {
	AlertTriangle,
	CalendarDays,
	CheckCircle2,
	ClipboardList,
	Clock,
	FileText,
	Stethoscope,
	User,
	UserCheck,
	XCircle
} from "lucide-react";
import { useCallback, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Appointment, Patient, Staff } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { calculatePediatricAge } from "@/utils/index";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AppointmentWithRelations = Appointment & {
	patient?: Pick<
		Patient,
		| "id"
		| "firstName"
		| "lastName"
		| "mrn"
		| "dateOfBirth"
		| "gender"
		| "contactNumber"
		| "allergies"
	> | null;
	staff?: Pick<Staff, "id" | "name" | "role" | "title"> | null;
};

type AppointmentStatus = NonNullable<Appointment["status"]>;

export interface AppointmentCardProps {
	appointment: AppointmentWithRelations;
	onClose?: () => void;
	onEdit?: () => void;
	onPatientSelect?: (patientId: string) => void;
	onSuccess?: () => void;
	onStatusChange?: (next: AppointmentStatus) => void | Promise<void>;
	readOnly?: boolean;
	variant?: "card" | "compact" | "banner";
	className?: string;
}

// ─── Status config ──────────────────────────────────────────────────────────

type StatusConfig = {
	label: string;
	badgeVariant: "default" | "secondary" | "destructive" | "outline";
	accent: string;
	icon: React.ComponentType<{ className?: string }>;
	next?: {
		label: string;
		status: AppointmentStatus;
		variant: "default" | "outline" | "destructive";
	};
};

const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
	Scheduled: {
		label: "Scheduled",
		badgeVariant: "default",
		accent: "bg-blue-500",
		icon: CalendarDays,
		next: { label: "Check in", status: "Checked In", variant: "default" }
	},
	"Checked In": {
		label: "Checked In",
		badgeVariant: "secondary",
		accent: "bg-amber-500",
		icon: UserCheck,
		next: { label: "Start visit", status: "In Progress", variant: "default" }
	},
	"In Progress": {
		label: "In Progress",
		badgeVariant: "default",
		accent: "bg-emerald-500",
		icon: Stethoscope,
		next: { label: "Mark completed", status: "Completed", variant: "default" }
	},
	Completed: {
		label: "Completed",
		badgeVariant: "outline",
		accent: "bg-slate-400",
		icon: CheckCircle2
	},
	Cancelled: {
		label: "Cancelled",
		badgeVariant: "destructive",
		accent: "bg-rose-500",
		icon: XCircle
	},
	"No Show": {
		label: "No Show",
		badgeVariant: "destructive",
		accent: "bg-rose-500",
		icon: AlertTriangle
	}
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	month: "short",
	day: "numeric",
	year: "numeric"
});

const TIME_FMT = new Intl.DateTimeFormat(undefined, {
	hour: "numeric",
	minute: "2-digit"
});

function fmtDate(d: Date | string | null | undefined): string {
	if (!d) return "—";
	const date = d instanceof Date ? d : new Date(d);
	return Number.isNaN(date.getTime()) ? "—" : DATE_FMT.format(date);
}

function fmtTime(d: Date | string | null | undefined): string {
	if (!d) return "—";
	const date = d instanceof Date ? d : new Date(d);
	return Number.isNaN(date.getTime()) ? "—" : TIME_FMT.format(date);
}

function fmtRange(
	start: Date | string | null | undefined,
	end: Date | string | null | undefined
): string {
	const s = fmtTime(start);
	const e = fmtTime(end);
	return s === "—" ? e : e === "—" ? s : `${s} – ${e}`;
}

type AllergyEntry = { allergen?: string; severity?: string };

function normalizeAllergies(raw: unknown): AllergyEntry[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((a): a is AllergyEntry => !!a && typeof a === "object")
		.filter(
			a => typeof a.allergen === "string" && a.allergen.trim().length > 0
		);
}

function isAnaphylactic(a: AllergyEntry): boolean {
	return (a.severity ?? "").toLowerCase() === "anaphylactic";
}

function relativeDayLabel(
	target: Date | string | null | undefined
): string | null {
	if (!target) return null;
	const d = target instanceof Date ? target : new Date(target);
	if (Number.isNaN(d.getTime())) return null;

	const now = new Date();
	const startOfDay = (x: Date) =>
		new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
	const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Tomorrow";
	if (diffDays === -1) return "Yesterday";
	if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
	if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
	return null;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function InfoRow({
	icon: Icon,
	label,
	value,
	muted,
	mono
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: React.ReactNode;
	muted?: boolean;
	mono?: boolean;
}) {
	return (
		<div className='flex items-start gap-2.5'>
			<Icon
				aria-hidden='true'
				className='mt-0.5 size-4 shrink-0 text-muted-foreground'
			/>
			<div className='min-w-0'>
				<p className='text-[11px] text-muted-foreground uppercase tracking-wide'>
					{label}
				</p>
				<p
					className={cn(
						"truncate font-medium text-sm",
						muted && "text-muted-foreground",
						mono && "font-mono tabular-nums"
					)}
				>
					{value}
				</p>
			</div>
		</div>
	);
}

function PatientAvatar({
	firstName,
	lastName,
	gender
}: {
	firstName: string;
	lastName: string;
	gender?: string | null;
}) {
	const initials =
		`${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?";
	const isMale = gender === "male";
	return (
		<div
			aria-hidden='true'
			className={cn(
				"flex size-11 shrink-0 items-center justify-center rounded-xl border font-bold text-sm shadow-sm",
				isMale
					? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400"
					: "border-pink-500/20 bg-pink-500/10 text-pink-700 dark:text-pink-400"
			)}
		>
			{initials}
		</div>
	);
}

function AllergyPill({ allergy }: { allergy: AllergyEntry }) {
	const severe = isAnaphylactic(allergy);
	return (
		<Badge
			className={cn(
				"gap-1 border font-semibold text-[10px]",
				severe
					? "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
					: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
			)}
			variant='outline'
		>
			<AlertTriangle
				aria-hidden='true'
				className='size-3'
			/>
			{allergy.allergen}
			{severe ? " · anaphylaxis" : ""}
		</Badge>
	);
}

// ─── Main component ─────────────────────────────────────────────────────────

export function AppointmentCard({
	appointment,
	onClose,
	onEdit,
	onPatientSelect,
	onSuccess,
	onStatusChange,
	readOnly = false,
	variant = "card",
	className
}: AppointmentCardProps) {
	const status = (appointment.status ?? "Scheduled") as AppointmentStatus;
	const config = STATUS_CONFIG[status];
	const StatusIcon = config.icon;

	const patient = appointment.patient ?? null;
	const staff = appointment.staff ?? null;
	const allergies = useMemo(
		() => normalizeAllergies(patient?.allergies),
		[patient?.allergies]
	);

	const ageInfo = useMemo(
		() =>
			patient?.dateOfBirth ? calculatePediatricAge(patient.dateOfBirth) : null,
		[patient?.dateOfBirth]
	);

	const relative = relativeDayLabel(appointment.appointmentDate);
	const timeRange = fmtRange(appointment.startTime, appointment.endTime);
	const dateLabel = fmtDate(appointment.appointmentDate);

	const handleAdvance = useCallback(async () => {
		if (!config.next) return;
		try {
			await onStatusChange?.(config.next.status);
			onSuccess?.();
		} catch {
			// Parent surfaces its own error toast.
		}
	}, [config.next, onStatusChange, onSuccess]);

	// ─── Banner variant ────────────────────────────────────────────────────
	if (variant === "banner") {
		return (
			<div
				className={cn(
					"relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
					className
				)}
			>
				<span
					aria-hidden='true'
					className={cn("absolute inset-y-0 left-0 w-1", config.accent)}
				/>
				<div className='flex min-w-0 items-center gap-3 ps-2'>
					{patient && (
						<PatientAvatar
							firstName={patient.firstName}
							gender={patient.gender}
							lastName={patient.lastName}
						/>
					)}
					<div className='min-w-0'>
						<p className='truncate font-semibold text-sm'>
							{patient
								? `${patient.firstName} ${patient.lastName}`
								: "Unassigned patient"}
							{relative ? (
								<span className='ms-2 font-normal text-muted-foreground text-xs'>
									· {relative}
								</span>
							) : null}
						</p>
						<p className='truncate text-muted-foreground text-xs'>
							{dateLabel} · {timeRange}
							{staff ? ` · ${staff.name}` : ""}
						</p>
					</div>
				</div>

				<div className='flex items-center gap-2 ps-2 sm:ps-0'>
					<Badge
						aria-live='polite'
						className='gap-1'
						variant={config.badgeVariant}
					>
						<StatusIcon
							aria-hidden='true'
							className='size-3'
						/>
						{config.label}
					</Badge>
					{!readOnly && config.next && (
						<Button
							onClick={handleAdvance}
							size='sm'
							variant={config.next.variant}
						>
							{config.next.label}
						</Button>
					)}
					{!readOnly && onEdit && (
						<Button
							onClick={onEdit}
							size='sm'
							variant='outline'
						>
							Edit
						</Button>
					)}
				</div>
			</div>
		);
	}

	// ─── Compact variant ───────────────────────────────────────────────────
	if (variant === "compact") {
		return (
			<div
				className={cn(
					"relative overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm",
					className
				)}
			>
				<div className='flex items-start justify-between gap-3'>
					<div className='flex min-w-0 items-center gap-2.5'>
						{patient && (
							<PatientAvatar
								firstName={patient.firstName}
								gender={patient.gender}
								lastName={patient.lastName}
							/>
						)}
						<div className='min-w-0'>
							<p className='truncate font-semibold text-sm'>
								{patient
									? `${patient.firstName} ${patient.lastName}`
									: "Unassigned patient"}
							</p>
							<p className='truncate text-muted-foreground text-xs'>
								{timeRange} · {appointment.type}
							</p>
						</div>
					</div>
					<Badge
						className='shrink-0 gap-1 text-[10px]'
						variant={config.badgeVariant}
					>
						<StatusIcon
							aria-hidden='true'
							className='size-3'
						/>
						{config.label}
					</Badge>
				</div>

				{allergies.length > 0 && (
					<div className='mt-2 flex flex-wrap gap-1'>
						{allergies.slice(0, 2).map(a => (
							<AllergyPill
								allergy={a}
								key={a.allergen}
							/>
						))}
						{allergies.length > 2 && (
							<Badge
								className='text-[10px]'
								variant='secondary'
							>
								+{allergies.length - 2}
							</Badge>
						)}
					</div>
				)}

				{!readOnly && (onPatientSelect || config.next || onEdit) && (
					<div className='mt-2 flex flex-wrap gap-1.5'>
						{patient && onPatientSelect && (
							<Button
								className='h-7 px-2 text-xs'
								onClick={() => onPatientSelect(patient.id)}
								size='sm'
								variant='ghost'
							>
								Open chart
							</Button>
						)}
						{config.next && (
							<Button
								className='h-7 px-2 text-xs'
								onClick={handleAdvance}
								size='sm'
								variant={config.next.variant}
							>
								{config.next.label}
							</Button>
						)}
						{onEdit && (
							<Button
								className='h-7 px-2 text-xs'
								onClick={onEdit}
								size='sm'
								variant='outline'
							>
								Edit
							</Button>
						)}
					</div>
				)}
			</div>
		);
	}

	// ─── Card variant (default) ────────────────────────────────────────────
	return (
		<Card className={cn("overflow-hidden", className)}>
			<div className='relative'>
				<span
					aria-hidden='true'
					className={cn("absolute inset-y-0 left-0 w-1.5", config.accent)}
				/>
				<CardHeader className='flex flex-row items-center justify-between gap-3 ps-6 pb-3'>
					<div className='flex items-center gap-2'>
						<StatusIcon
							aria-hidden='true'
							className='size-4 text-muted-foreground'
						/>
						<CardTitle className='font-mono text-base tabular-nums'>
							{appointment.id.slice(0, 8).toUpperCase()}
						</CardTitle>
						<Badge
							aria-live='polite'
							className='gap-1'
							variant={config.badgeVariant}
						>
							{config.label}
						</Badge>
						{relative && (
							<Badge
								className='text-[10px]'
								variant='outline'
							>
								{relative}
							</Badge>
						)}
					</div>
					{!readOnly && onEdit && (
						<Button
							onClick={onEdit}
							size='sm'
							variant='ghost'
						>
							<FileText
								aria-hidden='true'
								className='me-1.5 size-3.5'
							/>
							Edit
						</Button>
					)}
				</CardHeader>
			</div>

			<CardContent className='space-y-5 ps-6'>
				{patient ? (
					<div className='flex items-start gap-3'>
						<PatientAvatar
							firstName={patient.firstName}
							gender={patient.gender}
							lastName={patient.lastName}
						/>
						<div className='min-w-0 flex-1 space-y-1'>
							<div className='flex flex-wrap items-center gap-2'>
								<button
									className={cn(
										"truncate text-start font-semibold text-base",
										onPatientSelect &&
											"rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									)}
									disabled={!onPatientSelect}
									onClick={() => onPatientSelect?.(patient.id)}
									type='button'
								>
									{patient.firstName} {patient.lastName}
								</button>
								{ageInfo && (
									<Badge
										className='text-[10px]'
										variant='outline'
									>
										{ageInfo.displayString} · {ageInfo.ageGroup}
									</Badge>
								)}
							</div>
							<div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs'>
								<span className='font-mono'>{patient.mrn}</span>
								<span className='capitalize'>{patient.gender}</span>
								{patient.contactNumber && (
									<span className='flex items-center gap-1'>
										{patient.contactNumber}
									</span>
								)}
							</div>

							{allergies.length > 0 && (
								<div className='mt-2 flex flex-wrap gap-1.5'>
									{allergies.map(a => (
										<AllergyPill
											allergy={a}
											key={a.allergen}
										/>
									))}
								</div>
							)}
						</div>
					</div>
				) : (
					<div className='flex items-center gap-3 rounded-lg border border-border border-dashed bg-muted/30 p-3 text-muted-foreground text-sm'>
						<User
							aria-hidden='true'
							className='size-4'
						/>
						Patient record unavailable
					</div>
				)}

				<Separator />

				<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
					<InfoRow
						icon={CalendarDays}
						label='Date'
						value={dateLabel}
					/>
					<InfoRow
						icon={Clock}
						label='Time'
						mono
						value={timeRange}
					/>
					<InfoRow
						icon={ClipboardList}
						label='Visit type'
						value={appointment.type || "—"}
					/>
					<InfoRow
						icon={Stethoscope}
						label='Provider'
						muted={!staff}
						value={
							staff ? (
								<span className='flex items-center gap-2'>
									{staff.name}
									{staff.role && (
										<Badge
											className='text-[10px]'
											variant='outline'
										>
											{staff.role}
										</Badge>
									)}
								</span>
							) : (
								<span className='text-muted-foreground'>Unassigned</span>
							)
						}
					/>
					{appointment.notes && (
						<div className='sm:col-span-2'>
							<InfoRow
								icon={FileText}
								label='Reason for visit'
								value={
									<span className='line-clamp-3 whitespace-pre-wrap font-normal'>
										{appointment.notes}
									</span>
								}
							/>
						</div>
					)}
				</div>

				{!readOnly && (
					<>
						<Separator />
						<div className='flex flex-wrap items-center justify-between gap-2'>
							<div className='flex flex-wrap gap-2'>
								{onClose && (
									<Button
										onClick={onClose}
										variant='ghost'
									>
										Back
									</Button>
								)}
								{patient && onPatientSelect && (
									<Button
										onClick={() => onPatientSelect(patient.id)}
										variant='outline'
									>
										<User
											aria-hidden='true'
											className='me-1.5 size-4'
										/>
										Open patient chart
									</Button>
								)}
							</div>

							<div className='flex flex-wrap gap-2'>
								{status !== "Cancelled" &&
									status !== "No Show" &&
									status !== "Completed" && (
										<Button
											onClick={() => onStatusChange?.("Cancelled")}
											variant='outline'
										>
											<XCircle
												aria-hidden='true'
												className='me-1.5 size-4'
											/>
											Cancel
										</Button>
									)}
								{config.next && (
									<Button
										onClick={handleAdvance}
										variant={config.next.variant}
									>
										<CheckCircle2
											aria-hidden='true'
											className='me-1.5 size-4'
										/>
										{config.next.label}
									</Button>
								)}
							</div>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
