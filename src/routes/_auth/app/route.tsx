import {
	createFileRoute,
	Link,
	Outlet,
	useRouterState
} from "@tanstack/react-router";
import {
	Activity,
	Baby,
	Calendar,
	FlaskRound,
	HeartPulse,
	LayoutDashboard,
	Menu,
	Pill,
	Stethoscope,
	Syringe,
	Users
} from "lucide-react";
import { useState } from "react";

import { SignOutButton } from "#/components/sign-out-button.tsx";
import ThemeToggle from "#/components/theme-toggle.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle
} from "#/components/ui/sheet.tsx";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/_auth/app")({
	component: AppLayout
});

const NAV_ITEMS = [
	{ to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
	{ to: "/app/patients", label: "Patients", icon: Baby, exact: true },
	{
		to: "/app/appointments",
		label: "Appointments",
		icon: Calendar,
		exact: true
	},
	{
		to: "/app/encounters",
		label: "Encounters",
		icon: Stethoscope,
		exact: true
	},
	{
		to: "/app/immunizations",
		label: "Immunizations",
		icon: Syringe,
		exact: true
	},
	{ to: "/app/prescriptions", label: "Prescriptions", icon: Pill, exact: true },
	{ to: "/app/labs", label: "Lab Orders", icon: FlaskRound, exact: true },
	{ to: "/app/vitals", label: "Vitals", icon: HeartPulse, exact: true },
	{ to: "/app/growth", label: "Growth", icon: Activity, exact: true },
	{ to: "/app/staff", label: "Staff", icon: Users, exact: true }
] as const;

function AppLayout() {
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;
	const [mobileOpen, setMobileOpen] = useState(false);

	const isActive = (item: (typeof NAV_ITEMS)[number]) => {
		if (item.exact) return currentPath === item.to;
		return currentPath.startsWith(item.to);
	};

	return (
		<div className='flex min-h-svh bg-background'>
			{/* Sidebar */}
			<aside className='fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-border border-r bg-card md:flex'>
				<div className='flex h-16 items-center gap-2 border-border border-b px-4'>
					<Baby className='size-6 text-primary' />
					<span className='font-bold text-lg tracking-tight'>Pedia</span>
				</div>

				<nav className='flex-1 space-y-1 overflow-y-auto p-3'>
					{NAV_ITEMS.map(item => {
						const Icon = item.icon;
						const active = isActive(item);
						return (
							<Link
								className={cn(
									"flex items-center gap-3 rounded-xl px-3 py-2 font-medium text-sm transition-colors",
									active
										? "bg-primary/10 text-primary"
										: "text-muted-foreground hover:bg-muted hover:text-foreground"
								)}
								key={item.to}
								to={item.to}
							>
								<Icon className='size-4 shrink-0' />
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className='border-border border-t p-3'>
					<div className='flex items-center justify-between'>
						<ThemeToggle />
						<SignOutButton />
					</div>
				</div>
			</aside>
			{/* Mobile sheet */}
			<Sheet
				onOpenChange={setMobileOpen}
				open={mobileOpen}
			>
				<SheetContent
					className='w-64 p-0'
					side='left'
				>
					<SheetHeader className='border-border border-b p-4 text-left'>
						<SheetTitle className='flex items-center gap-2'>
							<Baby className='size-5 text-primary' />
							Pedia
						</SheetTitle>
					</SheetHeader>
					<nav className='flex-1 space-y-1 overflow-y-auto p-3'>
						{NAV_ITEMS.map(item => {
							const Icon = item.icon;
							const active = isActive(item);
							return (
								<Link
									className={cn(
										"flex items-center gap-3 rounded-xl px-3 py-2 font-medium text-sm transition-colors",
										active
											? "bg-primary/10 text-primary"
											: "text-muted-foreground hover:bg-muted hover:text-foreground"
									)}
									key={item.to}
									onClick={() => setMobileOpen(false)}
									to={item.to}
								>
									<Icon className='size-4 shrink-0' />
									{item.label}
								</Link>
							);
						})}
					</nav>
				</SheetContent>
			</Sheet>

			{/* Main content */}
			<main className='flex-1 md:ml-64'>
				{/* Mobile header */}
				<div className='sticky top-0 z-20 flex h-14 items-center gap-3 border-border border-b bg-background px-4 md:hidden'>
					<Button
						aria-label='Open navigation'
						onClick={() => setMobileOpen(true)}
						size='icon'
						variant='ghost'
					>
						<Menu className='size-5' />
					</Button>
					<Link
						className='flex items-center gap-2 font-semibold'
						to='/app'
					>
						<Baby className='size-5 text-primary' />
						Pedia
					</Link>
				</div>

				<div className='mx-auto max-w-7xl p-4 md:p-8'>
					<Outlet />
				</div>
			</main>
		</div>
	);
}
