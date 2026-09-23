// components/clinic/appointment-reminder.tsx

import {
	Bell,
	Calendar,
	CheckCircle2,
	Clock,
	MapPin,
	Stethoscope,
	User,
	XCircle
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ReminderStatus =
	| "upcoming"
	| "today"
	| "tomorrow"
	| "overdue"
	| "cancelled";

interface AppointmentReminderProps {
	/** Patient name. */
	patientName?: string;
	/** Provider name. */
	pediatrician?: string;
	/** Appointment date (ISO string or formatted). */
	date?: string;
	/** Appointment time, e.g. "10:00 AM". */
	time?: string;
	/** Appointment end time, e.g. "10:30 AM". */
	endTime?: string;
	/** Visit type label, e.g. "Well-Child Check". */
	visitType?: string;
	/** Clinic location. */
	location?: string;
	/** Reminder status. */
	status?: ReminderStatus;
	/** Additional notes or preparation instructions. */
	notes?: string;
	/** Phone number to confirm or reschedule. */
	contactPhone?: string;
	/** Action: confirm appointment. */
	onConfirm?: () => void;
	/** Action: reschedule appointment. */
	onReschedule?: () => void;
	/** Action: cancel appointment. */
	onCancel?: () => void;
	/** Visual variant. */
	variant?: "default" | "compact" | "banner";
	/** Card heading. Set to `null` to omit. */
	title?: string | null;
	className?: string;
	children?: React.ReactNode;
}

const STATUS_CONFIG: Record<
	ReminderStatus,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
		color: string;
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	upcoming: {
		label: "Upcoming",
		variant: "secondary",
		color: "text-blue-700 bg-blue-50 border-blue-200",
		icon: Calendar
	},
	today: {
		label: "Today",
		variant: "default",
		color: "text-emerald-700 bg-emerald-50 border-emerald-200",
		icon: Bell
	},
	tomorrow: {
		label: "Tomorrow",
		variant: "outline",
		color: "text-amber-700 bg-amber-50 border-amber-200",
		icon: Clock
	},
	overdue: {
		label: "Overdue",
		variant: "destructive",
		color: "text-red-700 bg-red-50 border-red-200",
		icon: XCircle
	},
	cancelled: {
		label: "Cancelled",
		variant: "destructive",
		color: "text-gray-700 bg-gray-50 border-gray-200",
		icon: XCircle
	}
};

export function AppointmentReminder({
	patientName = "John Doe",
	pediatrician = "Dr. Smith",
	date = "2026-09-22",
	time = "10:00 AM",
	endTime = "10:30 AM",
	visitType = "Well-Child Check",
	location = "Main Clinic — Room 101",
	status = "today",
	notes,
	contactPhone = "(555) 123-4567",
	onConfirm,
	onReschedule,
	onCancel,
	variant = "default",
	title = "Appointment Reminder",
	className,
	children
}: AppointmentReminderProps) {
	const statusConfig = STATUS_CONFIG[status];
	const StatusIcon = statusConfig.icon;
	const isCompact = variant === "compact";
	const isBanner = variant === "banner";

	// ─── Banner variant ────────────────────────────────────────────────────────
	if (isBanner) {
		return (
			<div
				className={cn(
					"flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between",
					statusConfig.color,
					className
				)}
			>
				<div className='flex items-start gap-3'>
					<StatusIcon className='mt-0.5 h-5 w-5 shrink-0' />
					<div>
						<p className='font-semibold'>
							{patientName} — {visitType}
						</p>
						<p className='text-sm opacity-90'>
							{date} · {time}
							{endTime ? ` – ${endTime}` : ""} · {pediatrician}
						</p>
					</div>
				</div>
				<div className='flex flex-wrap items-center gap-2'>
					{onConfirm && status !== "cancelled" && status !== "overdue" && (
						<Button
							className='gap-1.5'
							onClick={onConfirm}
							size='sm'
							variant='default'
						>
							<CheckCircle2 className='h-3.5 w-3.5' />
							Confirm
						</Button>
					)}
					{onReschedule && (
						<Button
							className='gap-1.5'
							onClick={onReschedule}
							size='sm'
							variant='outline'
						>
							<Calendar className='h-3.5 w-3.5' />
							Reschedule
						</Button>
					)}
					{onCancel && (
						<Button
							className='gap-1.5'
							onClick={onCancel}
							size='sm'
							variant='ghost'
						>
							<XCircle className='h-3.5 w-3.5' />
							Cancel
						</Button>
					)}
					<Badge
						className='gap-1 text-xs'
						variant={statusConfig.variant}
					>
						{statusConfig.label}
					</Badge>
				</div>
				{children}
			</div>
		);
	}

	// ─── Detail block shared between default & compact ─────────────────────────
	const detailRows = (
		<div className={cn("space-y-2", isCompact && "space-y-1.5")}>
			<div className='flex items-center gap-2 text-sm'>
				<User className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
				<span className={cn("font-medium", isCompact && "text-xs")}>
					{patientName}
				</span>
			</div>
			<div className='flex items-center gap-2 text-sm'>
				<Calendar className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
				<span className={cn(isCompact && "text-xs")}>{date}</span>
			</div>
			<div className='flex items-center gap-2 text-sm'>
				<Clock className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
				<span className={cn("tabular-nums", isCompact && "text-xs")}>
					{time}
					{endTime ? ` – ${endTime}` : ""}
				</span>
			</div>
			<div className='flex items-center gap-2 text-sm'>
				<Stethoscope className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
				<span className={cn(isCompact && "text-xs")}>{pediatrician}</span>
			</div>
			<div className='flex items-center gap-2 text-sm'>
				<MapPin className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
				<span className={cn("text-muted-foreground", isCompact && "text-xs")}>
					{location}
				</span>
			</div>
		</div>
	);

	const actions = (
		<div className={cn("flex flex-wrap gap-2", isCompact && "gap-1.5")}>
			{onConfirm && status !== "cancelled" && status !== "overdue" && (
				<Button
					className='gap-1.5'
					onClick={onConfirm}
					size={isCompact ? "sm" : "default"}
					variant='default'
				>
					<CheckCircle2 className={cn("h-4 w-4", isCompact && "h-3.5 w-3.5")} />
					Confirm
				</Button>
			)}
			{onReschedule && (
				<Button
					className='gap-1.5'
					onClick={onReschedule}
					size={isCompact ? "sm" : "default"}
					variant='outline'
				>
					<Calendar className={cn("h-4 w-4", isCompact && "h-3.5 w-3.5")} />
					Reschedule
				</Button>
			)}
			{onCancel && (
				<Button
					className='gap-1.5'
					onClick={onCancel}
					size={isCompact ? "sm" : "default"}
					variant='ghost'
				>
					<XCircle className={cn("h-4 w-4", isCompact && "h-3.5 w-3.5")} />
					Cancel
				</Button>
			)}
		</div>
	);

	// ─── Compact variant ───────────────────────────────────────────────────────
	if (isCompact) {
		return (
			<div className={cn("space-y-3 rounded-lg border p-3", className)}>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<StatusIcon className='h-4 w-4 text-muted-foreground' />
						<span className='font-medium text-sm'>{visitType}</span>
					</div>
					<Badge
						className={cn("gap-1 text-xs", statusConfig.color)}
						variant='outline'
					>
						{statusConfig.label}
					</Badge>
				</div>
				{detailRows}
				{notes && <p className='text-muted-foreground text-xs'>{notes}</p>}
				{(onConfirm || onReschedule || onCancel) && (
					<>
						<Separator />
						{actions}
					</>
				)}
				{children}
			</div>
		);
	}

	// ─── Default card variant ──────────────────────────────────────────────────
	const cardContent = (
		<div className='space-y-4'>
			<div
				className={cn(
					"flex items-center gap-2 rounded-md border p-2",
					statusConfig.color
				)}
			>
				<StatusIcon className='h-4 w-4 shrink-0' />
				<span className='font-medium text-sm'>
					{statusConfig.label} — {visitType}
				</span>
			</div>

			{detailRows}

			{notes && (
				<>
					<Separator />
					<div className='rounded-md bg-muted/50 p-3'>
						<p className='mb-1 font-medium text-xs'>Preparation Notes</p>
						<p className='text-muted-foreground text-sm'>{notes}</p>
					</div>
				</>
			)}

			{contactPhone && (
				<p className='text-muted-foreground text-xs'>
					To confirm by phone, call{" "}
					<span className='font-medium text-foreground'>{contactPhone}</span>
				</p>
			)}

			{(onConfirm || onReschedule || onCancel) && (
				<>
					<Separator />
					{actions}
				</>
			)}

			{children}
		</div>
	);

	if (title === null) {
		return <div className={className}>{cardContent}</div>;
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<Bell className='h-4 w-4 text-muted-foreground' />
					{title}
				</CardTitle>
				<CardDescription>
					Upcoming appointment details and confirmation
				</CardDescription>
			</CardHeader>
			<CardContent>{cardContent}</CardContent>
		</Card>
	);
}
