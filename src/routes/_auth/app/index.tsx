// oxlint-disable react-perf/jsx-no-jsx-as-prop -- Base UI's `render` prop takes JSX by design; the rule doesn't apply to it

import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Calendar,
	Clock,
	Info,
	Syringe,
	TrendingUp,
	UserPlus,
	Users
} from "lucide-react";

import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "#/components/ui/card.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { useDashboard } from "#/hooks/use-dashboard.ts";
import { useAllOverdueImmunizations } from "#/hooks/use-immunizations.ts";
import { useAuthSuspense } from "#/lib/auth/hooks.ts";
// FIX: `formatAge` was called but never imported. Import from the canonical
// pediatric module (or its barrel) rather than duplicating the logic here.
import { cn } from "#/lib/utils.ts";
import {
	formatOverdueDuration,
	formatRelative,
	formatTime
} from "#/utils/format.ts";
import { formatAgeShort } from "#/utils/index.ts";

export const Route = createFileRoute("/_auth/app/")({
	component: DashboardPage
});

// ─── Component ──────────────────────────────────────────────────────────────

function DashboardPage() {
	const { user } = useAuthSuspense();

	const {
		data: dashboard,
		isLoading,
		isError,
		error,
		refetch
	} = useDashboard({
		includeAlerts: true,
		includeActivity: true,
		includeSchedule: true
	});

	const {
		data: overdueImmunizations,
		isLoading: isLoadingImmunizations,
		isError: isOverdueError
	} = useAllOverdueImmunizations();

	if (isLoading) {
		return <DashboardSkeleton />;
	}

	if (isError) {
		return (
			<DashboardError
				message={error?.message ?? "Failed to load dashboard"}
				// oxlint-disable-next-line react-perf/jsx-no-new-function-as-prop
				onRetry={() => void refetch()}
			/>
		);
	}

	const stats = dashboard?.stats;
	const schedule = dashboard?.todaySchedule ?? [];
	const alerts = dashboard?.alerts ?? [];
	const activity = dashboard?.recentActivity ?? [];
	const overdue = overdueImmunizations ?? [];

	return (
		<div className='space-y-6'>
			<Header userName={user?.name} />

			{/* Stats Grid */}
			<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				<StatCard
					accent='sky'
					description={`${stats?.totalPatients ?? 0} total`}
					href='/app/patients'
					icon={Users}
					title='Active Patients'
					value={stats?.activePatients ?? 0}
				/>
				<StatCard
					accent='green'
					description={`${stats?.appointmentsThisWeek ?? 0} this week`}
					href='/app/appointments'
					icon={Calendar}
					title="Today's Appointments"
					value={stats?.todayAppointments ?? 0}
				/>
				<StatCard
					accent='amber'
					description='Requires attention'
					href='/app/appointments?filter=follow-up'
					icon={Clock}
					title='Pending Follow-ups'
					tone={(stats?.pendingFollowUps ?? 0) > 0 ? "warning" : "default"}
					value={stats?.pendingFollowUps ?? 0}
				/>
				<StatCard
					accent='rose'
					description={isOverdueError ? "Couldn't load" : "Needs scheduling"}
					href='/app/immunizations?filter=overdue'
					icon={Syringe}
					title='Overdue Vaccines'
					tone={overdue.length > 0 ? "destructive" : "default"}
					value={
						isLoadingImmunizations
							? (stats?.upcomingVaccinations ?? 0)
							: overdue.length
					}
				/>
			</div>

			<div className='grid gap-6 lg:grid-cols-3'>
				{/* Today's Schedule */}
				<Card className='lg:col-span-2'>
					<CardHeader className='flex flex-row items-center justify-between'>
						<CardTitle className='font-bold'>Today's Schedule</CardTitle>
						<Button
							asChild
							size='sm'
							variant='ghost'
						>
							<Link to='/app/appointments' />
							View all
						</Button>
					</CardHeader>
					<CardContent>
						{schedule.length === 0 ? (
							<EmptyState
								description='Your schedule is clear for today.'
								icon={Calendar}
								title='No appointments today'
							/>
						) : (
							<ul className='space-y-3'>
								{schedule.map(apt => (
									<li key={apt.id}>
										<Link
											className='flex items-center gap-4 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50'
											params={{ appointmentId: apt.id }}
											to='/app/appointments/$appointmentId'
										>
											<time
												className='flex size-12 shrink-0 flex-col items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs'
												dateTime={apt.time}
											>
												{formatTime(apt.time)}
											</time>
											<div className='min-w-0 flex-1'>
												<p className='truncate font-medium'>
													{apt.patientName}
													{apt.patientDateOfBirth && (
														<span className='ml-2 font-normal text-muted-foreground text-xs'>
															{formatAgeShort(apt.patientDateOfBirth)}
														</span>
													)}
												</p>
												<p className='truncate text-muted-foreground text-xs'>
													{apt.type}
												</p>
											</div>
											<div className='flex items-center gap-2'>
												{apt.isUrgent && (
													<Badge
														className='text-[10px]'
														variant='destructive'
													>
														Urgent
													</Badge>
												)}
												{apt.isOverdue && (
													<Badge
														className='text-[10px]'
														variant='outline'
													>
														Overdue
													</Badge>
												)}
												<StatusBadge status={apt.status} />
											</div>
										</Link>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				{/* Alerts */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2 font-bold'>
							<AlertCircle className='size-4 text-destructive' />
							Alerts
						</CardTitle>
					</CardHeader>
					<CardContent>
						{alerts.length === 0 ? (
							<EmptyState
								description='Everything looks good.'
								icon={Activity}
								title='No alerts'
							/>
						) : (
							<ul className='space-y-3'>
								{alerts.slice(0, 5).map(alert => (
									<li key={alert.id}>
										<Link
											className='block rounded-xl border border-border p-3 transition-colors hover:bg-muted/50'
											to={alert.actionUrl ?? "/app"}
										>
											<div className='flex items-start gap-2'>
												<AlertSeverityIcon severity={alert.severity} />
												<div className='min-w-0'>
													<p className='font-medium text-sm'>
														{alert.patientName}
													</p>
													<p className='mt-0.5 text-muted-foreground text-xs'>
														{alert.message}
													</p>
												</div>
											</div>
										</Link>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Overdue Immunizations — a new card, because in pediatrics this is the highest-signal alert */}
			{!isLoadingImmunizations && overdue.length > 0 && (
				<Card>
					<CardHeader className='flex flex-row items-center justify-between'>
						<CardTitle className='flex items-center gap-2 font-bold'>
							<Syringe className='size-4 text-destructive' />
							Overdue Immunizations
							<Badge
								className='ml-1'
								variant='destructive'
							>
								{overdue.length}
							</Badge>
						</CardTitle>

						<Button
							asChild
							size='sm'
							variant='ghost'
						>
							<Link
								search={{ filter: "overdue" }}
								to='/app/immunizations'
							/>
							View all
						</Button>
					</CardHeader>
					<CardContent>
						<ul className='divide-y divide-border'>
							{overdue.slice(0, 5).map(imm => (
								<li key={imm.id}>
									<Link
										className='flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/50'
										params={{ immunizationId: imm.id }}
										to='/app/immunizations/$immunizationId'
									>
										<div className='min-w-0'>
											<p className='truncate font-medium text-sm'>
												{imm.patient.firstName}
												{imm.patient.dateOfBirth && (
													<span className='ml-2 font-normal text-muted-foreground text-xs'>
														{formatAgeShort(imm.patient.dateOfBirth)}
													</span>
												)}
											</p>
											<p className='truncate text-muted-foreground text-xs'>
												{imm.vaccineName}
												{imm.doseNumber ? ` · Dose ${imm.doseNumber}` : ""}
											</p>
										</div>
										{/* FIX: `formatAge(dueDate)` computed "time since due date"
                        and rendered "— overdue" for future due dates. Use the
                        dedicated overdue formatter, which returns null in that
                        case so the badge is simply not rendered. */}
										<OverdueBadge dueDate={imm.dueDate} />
									</Link>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{/* Recent Activity */}
			<Card>
				<CardHeader>
					<CardTitle className='font-bold'>Recent Activity</CardTitle>
				</CardHeader>
				<CardContent>
					{activity.length === 0 ? (
						<EmptyState
							description='Activity will appear here.'
							icon={TrendingUp}
							title='No recent activity'
						/>
					) : (
						<ul className='space-y-3'>
							{activity.slice(0, 8).map(item => (
								<li
									className='flex items-center gap-3 rounded-xl border border-border p-3'
									key={item.id}
								>
									<div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-muted'>
										<Activity className='size-4 text-muted-foreground' />
									</div>
									<div className='min-w-0 flex-1'>
										<p className='truncate font-medium text-sm'>
											{item.patientName}
										</p>
										<p className='truncate text-muted-foreground text-xs'>
											{item.description}
										</p>
									</div>
									{/* FIX: `item.timestamp` is already a `Date` (it exposes
                      `.toISOString()`), so `new Date(item.timestamp)` was a
                      redundant allocation on every render. */}
									<time
										className='shrink-0 text-muted-foreground text-xs'
										dateTime={item.timestamp.toISOString()}
										title={item.timestamp.toLocaleString()}
									>
										{formatRelative(item.timestamp.toISOString())}
									</time>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Header({ userName }: { userName: string | null | undefined }) {
	const firstName = userName?.trim().split(/\s+/)[0];
	const hour = new Date().getHours();
	const greeting =
		hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

	return (
		<header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
			<div>
				<h1 className='font-extrabold text-2xl tracking-tight sm:text-3xl'>
					{greeting},{" "}
					<span className='bg-gradient-to-r from-primary to-brand-accent-deep bg-clip-text text-transparent'>
						{firstName || "Doctor"}
					</span>
				</h1>
				<p className='mt-0.5 text-muted-foreground text-sm'>
					Here's what's happening at your clinic today.
				</p>
			</div>
			<div className='flex gap-2'>
				<Button asChild>
					<Link to='/app/patients/new' />
					<UserPlus className='mr-2 size-4' />
					New Patient
				</Button>
				<Button
					asChild
					variant='outline'
				>
					<Link to='/app/appointments/new' />
					<Calendar className='mr-2 size-4' />
					Schedule
				</Button>
			</div>
		</header>
	);
}

type StatTone = "default" | "warning" | "destructive";
type StatAccent = "primary" | "sky" | "green" | "amber" | "rose";

const STAT_ACCENTS: Record<StatAccent, string> = {
	primary: "bg-primary/10 text-primary",
	sky: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300",
	green:
		"bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
	amber: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
	rose: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300"
};

function StatCard({
	title,
	value,
	icon: Icon,
	description,
	href,
	tone = "default",
	accent = "primary"
}: {
	title: string;
	value: number;
	icon: React.ComponentType<{ className?: string }>;
	description?: string;
	href?: string;
	tone?: StatTone;
	accent?: StatAccent;
}) {
	const valueClass = cn(
		"mt-1 font-extrabold text-3xl tabular-nums tracking-tight",
		tone === "warning" && "text-amber-600 dark:text-amber-500",
		tone === "destructive" && "text-destructive"
	);

	const iconWrapClass = cn(
		"flex size-12 items-center justify-center rounded-2xl shadow-sm",
		tone === "destructive"
			? "bg-destructive/15 text-destructive"
			: STAT_ACCENTS[accent]
	);

	const content = (
		<CardContent className='pt-6'>
			<div className='flex items-center justify-between'>
				<div>
					<p className='font-bold text-muted-foreground text-sm'>{title}</p>
					<p className={valueClass}>{value.toLocaleString()}</p>
					{description && (
						<p className='mt-0.5 font-medium text-muted-foreground text-xs'>
							{description}
						</p>
					)}
				</div>
				<div className={iconWrapClass}>
					<Icon className='size-6' />
				</div>
			</div>
		</CardContent>
	);

	if (!href) return <Card>{content}</Card>;

	return (
		<Link
			className='block rounded-xl transition-shadow hover:shadow-md'
			to={href}
		>
			<Card>{content}</Card>
		</Link>
	);
}

/**
 * Status badge. Falls back to a neutral style for unknown statuses so a new
 * server-side status doesn't render as unstyled text.
 */
function StatusBadge({ status }: { status: string }) {
	const variants: Record<string, string> = {
		scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
		"checked in":
			"bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
		"in progress":
			"bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
		completed:
			"bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
		cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
		"no show":
			"bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
	};

	const key = status.toLowerCase().replace(/[-_]/g, " ");
	const style = variants[key] ?? "bg-muted text-muted-foreground";

	return (
		<span
			className={cn(
				"rounded-full px-2 py-0.5 font-bold text-[10px] uppercase",
				style
			)}
		>
			{status}
		</span>
	);
}

/**
 * Alert severity is conveyed by both color and icon, so colorblind users can
 * still distinguish levels.
 */
function AlertSeverityIcon({ severity }: { severity: string }) {
	const map: Record<
		string,
		{
			Icon: React.ComponentType<{ className?: string }>;
			className: string;
			label: string;
		}
	> = {
		critical: {
			Icon: AlertCircle,
			className: "text-destructive",
			label: "Critical alert"
		},
		warning: {
			Icon: AlertTriangle,
			className: "text-amber-500",
			label: "Warning"
		},
		info: { Icon: Info, className: "text-blue-500", label: "Information" }
	};

	const entry = map[severity] ?? map.info;
	if (!entry) return null;

	return (
		<span
			aria-label={entry.label}
			className='mt-0.5 shrink-0'
			role='img'
		>
			<entry.Icon className={cn("size-3.5", entry.className)} />
		</span>
	);
}

// FIX: new component — renders nothing when the due date is in the future or
// invalid, so the caller no longer produces "— overdue".
function OverdueBadge({
	dueDate
}: {
	dueDate: string | Date | null | undefined;
}) {
	const duration = formatOverdueDuration(dueDate);
	if (!duration) return null;
	return (
		<Badge
			className='shrink-0 text-[10px]'
			variant='outline'
		>
			{duration} overdue
		</Badge>
	);
}

function EmptyState({
	icon: Icon,
	title,
	description
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description: string;
}) {
	return (
		<div className='flex flex-col items-center justify-center py-8 text-center'>
			<div className='mb-3 flex size-12 items-center justify-center rounded-full bg-muted'>
				<Icon className='size-6 text-muted-foreground' />
			</div>
			<p className='font-medium'>{title}</p>
			<p className='mt-0.5 text-muted-foreground text-sm'>{description}</p>
		</div>
	);
}

function DashboardError({
	message,
	onRetry
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		<Card>
			<CardContent className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
				<div className='flex size-12 items-center justify-center rounded-full bg-destructive/10'>
					<AlertCircle className='size-6 text-destructive' />
				</div>
				<div>
					<p className='font-medium'>Couldn't load dashboard</p>
					<p className='mt-0.5 text-muted-foreground text-sm'>{message}</p>
				</div>
				<Button
					onClick={onRetry}
					variant='outline'
				>
					Try again
				</Button>
			</CardContent>
		</Card>
	);
}

function DashboardSkeleton() {
	return (
		<div className='space-y-6'>
			<div className='space-y-2'>
				<Skeleton className='h-8 w-64' />
				<Skeleton className='h-4 w-96' />
			</div>
			<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				{[1, 2, 3, 4].map(i => (
					<Skeleton
						className='h-28'
						key={i}
					/>
				))}
			</div>
			<div className='grid gap-6 lg:grid-cols-3'>
				<Skeleton className='h-96 lg:col-span-2' />
				<Skeleton className='h-96' />
			</div>
		</div>
	);
}
