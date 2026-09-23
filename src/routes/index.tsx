import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	ArrowRight,
	Clock,
	FlaskConical,
	HeartPulse,
	Pill,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Syringe,
	Users
} from "lucide-react";
import { Suspense } from "react";

import { usePatientCount } from "#/hooks/index.ts";
import { useEncounterStats } from "#/hooks/use-encounters.ts";
import { useAuth } from "#/lib/auth/hooks.ts";

export const Route = createFileRoute("/")({
	component: HomePage,
	pendingComponent: LandingSkeleton
});

// Separate component for the skeleton
function LandingSkeleton() {
	return (
		<div className='min-h-screen animate-pulse bg-background'>
			<div className='container-padded py-16'>
				<div className='mx-auto mb-16 max-w-4xl text-center'>
					<div className='mx-auto h-8 w-48 rounded-full bg-muted' />
					<div className='mx-auto mt-6 h-12 w-3/4 rounded bg-muted' />
					<div className='mx-auto mt-4 h-6 w-1/2 rounded bg-muted' />
				</div>
				<div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
					{[...Array(6)].map((_, i) => (
						<div
							className='h-64 rounded-2xl bg-muted'
							key={i}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

// Stats component with React Query hooks
function StatsDisplay() {
	const { data: patientCount, isLoading: patientsLoading } = usePatientCount({
		activeStatus: "Active"
	});
	const { data: encounterStats, isLoading: encountersLoading } =
		useEncounterStats();

	if (patientsLoading || encountersLoading) {
		return <span className='animate-pulse'>Loading stats...</span>;
	}

	return (
		<span>
			{patientCount ?? 0} Patients • {encounterStats?.total ?? 0} Encounters
		</span>
	);
}

function HomePage() {
	const { user, isPending } = useAuth();

	// Define Bento grid items with sizes
	const features = [
		{
			icon: Users,
			title: "Patient Management",
			description:
				"Complete pediatric patient registry with demographics, allergies, and medical history.",
			href: "/app/patients",
			size: "col-span-2 row-span-1",
			color: "from-blue-50 to-cyan-50",
			badge: "Most Used",
			stats: "Active Registry"
		},
		{
			icon: Stethoscope,
			title: "SOAP Encounters",
			description:
				"Document clinical visits with structured subjective, objective, assessment, and plan notes.",
			href: "/app/encounters",
			size: "col-span-1 row-span-2",
			color: "from-teal-50 to-emerald-50",
			badge: "Daily Use"
		},
		{
			icon: Activity,
			title: "WHO Growth Charts",
			description:
				"Track child growth with WHO standardized percentiles and Z-score calculations.",
			href: "/app/growth",
			size: "col-span-1 row-span-1",
			color: "from-purple-50 to-pink-50"
		},
		{
			icon: Syringe,
			title: "Immunization Tracker",
			description:
				"Manage vaccine schedules, track compliance, and generate immunization certificates.",
			href: "/app/immunizations",
			size: "col-span-1 row-span-1",
			color: "from-amber-50 to-orange-50",
			badge: "Schedule"
		},
		{
			icon: Pill,
			title: "Pediatric Formulary",
			description:
				"Weight-based dosage calculator with safety checks and allergy alerts.",
			href: "/app/prescriptions",
			size: "col-span-1 row-span-1",
			color: "from-rose-50 to-red-50"
		},
		{
			icon: FlaskConical,
			title: "Lab Management",
			description:
				"Order and track diagnostic tests with pediatric reference ranges.",
			href: "/app/labs",
			size: "col-span-1 row-span-1",
			color: "from-indigo-50 to-violet-50"
		}
	];

	return (
		<div className='min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/50'>
			<div className='container-padded py-16'>
				{/* Enhanced Hero Section */}
				<section className='mx-auto mb-16 max-w-4xl text-center'>
					<div className='fade-in mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-medium text-primary text-sm shadow-sm ring-1 ring-primary/20'>
						<HeartPulse className='h-4 w-4 animate-pulse' />
						<span>Pediatric EHR System • v2.0</span>
						<span className='ml-2 h-1 w-1 rounded-full bg-primary/30' />
						<span className='font-normal text-muted-foreground text-xs'>
							100% Local-First
						</span>
					</div>

					<h1 className='mb-6 font-bold font-display text-4xl tracking-tight md:text-5xl lg:text-6xl'>
						<span className='gradient-text bg-gradient-to-r from-primary via-primary/80 to-accent-500'>
							Pediatric Clinical Console
						</span>
					</h1>

					<p className='mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl'>
						Manage infant, child, and adolescent care with{" "}
						<span className='font-medium text-foreground'>
							WHO growth curve tracking
						</span>
						,
						<span className='font-medium text-foreground'>
							{" "}
							SOAP encounter documentation
						</span>
						, and{" "}
						<span className='font-medium text-foreground'>
							milestone immunization registries
						</span>
						.
					</p>

					<div className='mt-8 flex flex-wrap items-center justify-center gap-4'>
						{isPending ? (
							<div className='h-12 w-40 animate-pulse rounded-xl bg-muted' />
						) : user ? (
							<Link
								className='group focus-ring inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-primary/40'
								to='/app'
							>
								Go to Dashboard
								<ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
							</Link>
						) : (
							<>
								<Link
									className='group focus-ring inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-primary/40'
									search={{ redirect: "/" }}
									to='/login'
								>
									Sign In
									<ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
								</Link>
								<Link
									className='group focus-ring inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-medium text-foreground shadow-sm ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800'
									to='/signup'
								>
									Get Started
									<Sparkles className='h-4 w-4 text-accent-500 transition-transform group-hover:rotate-12' />
								</Link>
							</>
						)}
					</div>

					{/* Trust Indicators */}
					<div className='mt-8 flex flex-wrap items-center justify-center gap-6 text-muted-foreground text-xs'>
						<span className='flex items-center gap-1.5'>
							<ShieldCheck className='h-4 w-4 text-emerald-500' />
							HIPAA Compliant
						</span>
						<span className='flex items-center gap-1.5'>
							<Clock className='h-4 w-4 text-primary' />
							<Suspense fallback={<span>Loading stats...</span>}>
								<StatsDisplay />
							</Suspense>
						</span>
						<span className='flex items-center gap-1.5'>
							<span className='h-2 w-2 animate-pulse rounded-full bg-emerald-500' />
							Offline Capable
						</span>
					</div>
				</section>

				{/* Bento Grid Features */}
				<section className='relative'>
					<div className='mb-8 flex items-center justify-between'>
						<h2 className='font-bold text-2xl text-foreground'>
							Clinical Modules
						</h2>
						<span className='text-muted-foreground text-sm'>
							<span className='font-medium text-foreground'>
								{features.length}
							</span>{" "}
							tools available
						</span>
					</div>

					<div className='grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4'>
						{features.map((feature, index) => {
							const Icon = feature.icon;
							const isLarge = feature.size.includes("col-span-2");
							const isTall = feature.size.includes("row-span-2");

							return (
								<Link
									className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${feature.color} p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg ${
										feature.size
									} ${isLarge ? "md:col-span-2" : ""} ${
										isTall ? "md:row-span-2" : ""
									} before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/50 before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100 dark:before:from-black/20`}
									key={feature.title}
									style={{
										animationDelay: `${index * 50}ms`
									}}
									to={feature.href}
								>
									{/* Badge */}
									{feature.badge && (
										<span className='absolute top-3 right-3 rounded-full bg-white/80 px-2.5 py-1 font-medium text-[10px] text-foreground shadow-sm backdrop-blur-sm dark:bg-slate-800/80'>
											{feature.badge}
										</span>
									)}

									<div className='relative z-10 flex h-full flex-col'>
										<div className='mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/60 shadow-sm backdrop-blur-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground dark:bg-slate-800/60'>
											<Icon className='h-6 w-6' />
										</div>

										<h3 className='mb-2 font-semibold text-foreground text-lg'>
											{feature.title}
										</h3>

										<p className='flex-1 text-muted-foreground text-sm'>
											{feature.description}
										</p>

										{feature.stats && (
											<div className='mt-3 flex items-center gap-2 font-medium text-primary text-xs'>
												<span className='h-1.5 w-1.5 rounded-full bg-primary/40' />
												{feature.stats}
											</div>
										)}

										<div className='mt-4 flex items-center gap-1 font-medium text-primary text-sm transition-all group-hover:gap-2'>
											<span>Access Module</span>
											<ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
										</div>
									</div>

									{/* Decorative gradient element */}
									<div className='absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-2xl' />
								</Link>
							);
						})}
					</div>
				</section>

				{/* Enhanced Stats Section */}
				<section className='mt-20 grid grid-cols-1 gap-6 rounded-2xl border border-border/50 bg-white/50 p-8 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4 dark:bg-slate-900/50'>
					{[
						{
							label: "Local-First Data",
							value: "100%",
							icon: ShieldCheck,
							color: "text-emerald-500",
							description: "Zero cloud dependency"
						},
						{
							label: "Growth Standards",
							value: "WHO",
							icon: Activity,
							color: "text-primary",
							description: "Verified percentile charts"
						},
						{
							label: "Immunization Schedule",
							value: "CDC",
							icon: Syringe,
							color: "text-blue-500",
							description: "Up-to-date recommendations"
						},
						{
							label: "Data Privacy",
							value: "Local",
							icon: Clock,
							color: "text-purple-500",
							description: "Never leaves your device"
						}
					].map(stat => {
						const Icon = stat.icon;
						return (
							<div
								className='group flex items-center gap-4 rounded-xl p-4 transition-colors hover:bg-muted/50'
								key={stat.label}
							>
								<div
									className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color} bg-current bg-opacity-10`}
								>
									<Icon className={`h-6 w-6 ${stat.color}`} />
								</div>
								<div>
									<div className='flex items-baseline gap-1'>
										<span className='font-bold text-2xl text-foreground'>
											{stat.value}
										</span>
									</div>
									<div className='font-medium text-foreground text-sm'>
										{stat.label}
									</div>
									<div className='text-muted-foreground text-xs'>
										{stat.description}
									</div>
								</div>
							</div>
						);
					})}
				</section>
			</div>
		</div>
	);
}
