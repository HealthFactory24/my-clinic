import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { cn } from "cn";
import {
	Activity,
	AlertTriangle,
	Calendar,
	FlaskRound,
	HeartPulse,
	Pill,
	Syringe
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
import { usePatientDashboard } from "#/hooks/use-patient-dashboard.ts";
import { getFeverClassification } from "#/utils/index.ts";

export const Route = createFileRoute("/_auth/app/patients/$patientId")({
	component: PatientOverviewPage
});

function PatientOverviewPage() {
	const { patientId } = useParams({ from: "/_auth/app/patients/$patientId" });
	const {
		patient,
		encounters,
		vitals,
		growth,
		immunizations,
		prescriptions,
		labOrders,
		isLoading
	} = usePatientDashboard(patientId);

	if (isLoading) {
		return <OverviewSkeleton />;
	}

	if (!patient) return null;

	const latestVital = vitals?.[0];
	const latestGrowth = growth?.[growth.length - 1];
	const activePrescriptions =
		prescriptions?.filter(p => p.status === "Active") ?? [];
	const overdueImmunizations =
		immunizations?.filter(i => i.status === "Overdue") ?? [];
	const pendingLabs =
		labOrders?.filter(
			l => l.status !== "Completed" && l.status !== "Cancelled"
		) ?? [];

	return (
		<div className='space-y-6'>
			{/* Quick stats */}
			<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				<QuickStatCard
					href='/app/patients/$patientId/encounters'
					icon={Calendar}
					patientId={patientId}
					title='Encounters'
					value={encounters?.length ?? 0}
				/>
				<QuickStatCard
					badge={
						overdueImmunizations.length > 0
							? `${overdueImmunizations.length} overdue`
							: undefined
					}
					badgeVariant='destructive'
					href='/app/patients/$patientId/immunizations'
					icon={Syringe}
					patientId={patientId}
					title='Immunizations'
					value={immunizations?.length ?? 0}
				/>
				<QuickStatCard
					badge={activePrescriptions.length > 0 ? "Active" : undefined}
					badgeVariant='default'
					href='/app/patients/$patientId/prescriptions'
					icon={Pill}
					patientId={patientId}
					title='Prescriptions'
					value={activePrescriptions.length}
				/>
				<QuickStatCard
					badge={pendingLabs.length > 0 ? "Pending" : undefined}
					badgeVariant='secondary'
					href='/app/patients/$patientId/labs'
					icon={FlaskRound}
					patientId={patientId}
					title='Lab Orders'
					value={pendingLabs.length}
				/>
			</div>

			<div className='grid gap-6 lg:grid-cols-2'>
				{/* Latest Vitals */}
				<Card>
					<CardHeader className='flex flex-row items-center justify-between'>
						<CardTitle className='flex items-center gap-2'>
							<HeartPulse className='size-4 text-primary' />
							Latest Vitals
						</CardTitle>
						<Button
							asChild
							size='sm'
							variant='ghost'
						>
							<Link
								params={{ patientId }}
								to='/app/patients/$patientId/vitals'
							/>
							View all
						</Button>
					</CardHeader>
					<CardContent>
						{!latestVital ? (
							<EmptyState
								actionHref={`/app/patients/${patientId}/vitals`}
								actionLabel='Record Vitals'
								description='Record the first set of vitals.'
								icon={HeartPulse}
								title='No vitals recorded'
							/>
						) : (
							<div className='grid grid-cols-2 gap-3'>
								<VitalItem
									label='Temperature'
									severity={
										getFeverClassification(latestVital.temperatureC).severity
									}
									value={`${latestVital.temperatureC}°C`}
								/>
								<VitalItem
									label='Heart Rate'
									value={`${latestVital.heartRateBpm} bpm`}
								/>
								<VitalItem
									label='Resp. Rate'
									value={`${latestVital.respiratoryRateBpm}/min`}
								/>
								<VitalItem
									label='SpO₂'
									severity={
										latestVital.oxygenSaturationPercent < 95
											? "danger"
											: "normal"
									}
									value={`${latestVital.oxygenSaturationPercent}%`}
								/>
								{latestVital.weightKg && (
									<VitalItem
										label='Weight'
										value={`${latestVital.weightKg} kg`}
									/>
								)}
								{latestVital.heightCm && (
									<VitalItem
										label='Height'
										value={`${latestVital.heightCm} cm`}
									/>
								)}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Latest Growth */}
				<Card>
					<CardHeader className='flex flex-row items-center justify-between'>
						<CardTitle className='flex items-center gap-2'>
							<Activity className='size-4 text-primary' />
							Latest Growth
						</CardTitle>
						<Button
							asChild
							size='sm'
							variant='ghost'
						>
							<Link
								params={{ patientId }}
								to='/app/patients/$patientId/growth'
							/>
							View charts
						</Button>
					</CardHeader>
					<CardContent>
						{!latestGrowth ? (
							<EmptyState
								actionHref={`/app/patients/${patientId}/growth`}
								actionLabel='Record Growth'
								description='Record a growth measurement.'
								icon={Activity}
								title='No growth data'
							/>
						) : (
							<div className='grid grid-cols-2 gap-3'>
								<VitalItem
									label='Weight'
									value={`${latestGrowth.weightKg} kg`}
								/>
								<VitalItem
									label='Height'
									value={`${latestGrowth.heightCm} cm`}
								/>
								<VitalItem
									label='BMI'
									value={`${latestGrowth.bmi}`}
								/>
								{latestGrowth.headCircumferenceCm && (
									<VitalItem
										label='Head Circ.'
										value={`${latestGrowth.headCircumferenceCm} cm`}
									/>
								)}
								{latestGrowth.weightForAgePercentile !== null && (
									<PercentileItem
										label='Weight %ile'
										value={latestGrowth.weightForAgePercentile}
									/>
								)}
								{latestGrowth.heightForAgePercentile !== null && (
									<PercentileItem
										label='Height %ile'
										value={latestGrowth.heightForAgePercentile}
									/>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Alerts */}
			{(overdueImmunizations.length > 0 || pendingLabs.length > 0) && (
				<Card className='border-amber-200 bg-amber-50/50'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2 text-amber-800'>
							<AlertTriangle className='size-4' />
							Clinical Alerts
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-2'>
						{overdueImmunizations.length > 0 && (
							<div className='flex items-center justify-between rounded-lg bg-white p-3'>
								<div>
									<p className='font-medium text-sm'>
										{overdueImmunizations.length} overdue immunization
										{overdueImmunizations.length > 1 ? "s" : ""}
									</p>
									<p className='text-muted-foreground text-xs'>
										{overdueImmunizations.map(i => i.vaccineName).join(", ")}
									</p>
								</div>
								<Button
									asChild
									size='sm'
									variant='outline'
								>
									<Link
										params={{ patientId }}
										to='/app/patients/$patientId/immunizations'
									/>
									Review
								</Button>
							</div>
						)}
						{pendingLabs.length > 0 && (
							<div className='flex items-center justify-between rounded-lg bg-white p-3'>
								<div>
									<p className='font-medium text-sm'>
										{pendingLabs.length} pending lab order
										{pendingLabs.length > 1 ? "s" : ""}
									</p>
									<p className='text-muted-foreground text-xs'>
										Awaiting results or processing
									</p>
								</div>
								<Button
									size='sm'
									variant='outline'
								>
									<Link
										params={{ patientId }}
										to='/app/patients/$patientId/labs'
									/>
									Review
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function QuickStatCard({
	title,
	value,
	icon: Icon,
	href,
	patientId,
	badge,
	badgeVariant
}: {
	title: string;
	value: number;
	icon: React.ComponentType<{ className?: string }>;
	href: string;
	patientId: string;
	badge?: string;
	badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}) {
	return (
		<Link
			className='rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50'
			params={{ patientId }}
			to={href}
		>
			<div className='flex items-center justify-between'>
				<div className='flex size-10 items-center justify-center rounded-full bg-primary/10'>
					<Icon className='size-5 text-primary' />
				</div>
				{badge && (
					<Badge
						className='text-[10px]'
						variant={badgeVariant ?? "default"}
					>
						{badge}
					</Badge>
				)}
			</div>
			<p className='mt-3 font-bold text-2xl tabular-nums'>{value}</p>
			<p className='text-muted-foreground text-sm'>{title}</p>
		</Link>
	);
}

function VitalItem({
	label,
	value,
	severity = "normal"
}: {
	label: string;
	value: string;
	severity?: "normal" | "warning" | "danger";
}) {
	const colorClass =
		severity === "danger"
			? "text-destructive"
			: severity === "warning"
				? "text-amber-600"
				: "text-foreground";

	return (
		<div className='rounded-lg border border-border bg-muted/30 p-3'>
			<p className='text-muted-foreground text-xs'>{label}</p>
			<p className={cn("mt-0.5 font-bold text-lg tabular-nums", colorClass)}>
				{value}
			</p>
		</div>
	);
}

function PercentileItem({ label, value }: { label: string; value: number }) {
	const isAbnormal = value < 5 || value > 95;
	return (
		<div className='rounded-lg border border-border bg-muted/30 p-3'>
			<p className='text-muted-foreground text-xs'>{label}</p>
			<div className='mt-0.5 flex items-center gap-2'>
				<p className='font-bold text-lg tabular-nums'>{value}%</p>
				{isAbnormal && (
					<Badge
						className='text-[10px]'
						variant='destructive'
					>
						Flag
					</Badge>
				)}
			</div>
		</div>
	);
}

function EmptyState({
	icon: Icon,
	title,
	description,
	actionLabel,
	actionHref
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description: string;
	actionLabel?: string;
	actionHref?: string;
}) {
	return (
		<div className='flex flex-col items-center justify-center py-8 text-center'>
			<div className='mb-3 flex size-12 items-center justify-center rounded-full bg-muted'>
				<Icon className='size-6 text-muted-foreground' />
			</div>
			<p className='font-medium'>{title}</p>
			<p className='mt-0.5 text-muted-foreground text-sm'>{description}</p>
			{actionLabel && actionHref && (
				<Button
					asChild
					className='mt-4'
					size='sm'
				>
					<Link to={actionHref} />

					{actionLabel}
				</Button>
			)}
		</div>
	);
}

function OverviewSkeleton() {
	return (
		<div className='space-y-6'>
			<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				{[1, 2, 3, 4].map(i => (
					<Skeleton
						className='h-28'
						key={i}
					/>
				))}
			</div>
			<div className='grid gap-6 lg:grid-cols-2'>
				<Skeleton className='h-64' />
				<Skeleton className='h-64' />
			</div>
		</div>
	);
}
