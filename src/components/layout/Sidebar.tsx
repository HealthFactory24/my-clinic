// src/components/layout/Sidebar.tsx
import { Link, useRouterState } from "@tanstack/react-router";
import {
	BarChart3Icon,
	CalendarDaysIcon,
	ClipboardListIcon,
	FlaskConicalIcon,
	PillIcon,
	SettingsIcon,
	StethoscopeIcon,
	SyringeIcon,
	TrendingUpIcon,
	UsersIcon
} from "lucide-react";

import { cn } from "#/lib/utils";

import type { NavItem } from "./types";

const navGroups: { label: string; items: NavItem[] }[] = [
	{
		label: "Clinical",
		items: [
			{
				label: "Dashboard",
				to: "/app",
				icon: <ClipboardListIcon className='size-4' />
			},
			{
				label: "Schedule",
				to: "/app/appointments",
				icon: <CalendarDaysIcon className='size-4' />
			},
			{
				label: "Patients",
				to: "/app/patients",
				icon: <UsersIcon className='size-4' />
			},
			{
				label: "SOAP Visits",
				to: "/app/encounters",
				icon: <StethoscopeIcon className='size-4' />
			}
		]
	},
	{
		label: "Health Tracking",
		items: [
			{
				label: "Growth Charts",
				to: "/app/growth",
				icon: <TrendingUpIcon className='size-4' />
			},
			{
				label: "Immunizations",
				to: "/app/immunizations",
				icon: <SyringeIcon className='size-4' />
			},
			{
				label: "Prescriptions",
				to: "/app/prescriptions",
				icon: <PillIcon className='size-4' />
			},
			{
				label: "Laboratory",
				to: "/app/labs",
				icon: <FlaskConicalIcon className='size-4' />
			}
		]
	},
	{
		label: "Admin",
		items: [
			{
				label: "Analytics",
				to: "/app/analytics",
				icon: <BarChart3Icon className='size-4' />
			},
			{
				label: "Staff",
				to: "/app/staff",
				icon: <UsersIcon className='size-4' />
			},
			{
				label: "Settings",
				to: "/app/settings",
				icon: <SettingsIcon className='size-4' />
			}
		]
	}
];

interface SidebarProps {
	onNavigate?: () => void;
	className?: string;
}

export function Sidebar({ onNavigate, className }: SidebarProps) {
	const location = useRouterState({ select: state => state.location });

	const isActive = (to: string) => {
		if (to === "/app") return location.pathname === "/app";
		return location.pathname === to || location.pathname.startsWith(`${to}/`);
	};

	return (
		<nav
			aria-label='Clinical modules'
			className={cn("flex-1 space-y-4 overflow-y-auto px-3 py-4", className)}
		>
			{navGroups.map(group => (
				<div key={group.label}>
					<p className='mb-1.5 px-3 font-bold text-[10px] text-slate-400 uppercase tracking-widest dark:text-slate-600'>
						{group.label}
					</p>
					<div className='space-y-0.5'>
						{group.items.map(item => (
							<SidebarNavItem
								isActive={isActive(item.to)}
								item={item}
								key={item.to}
								{...(onNavigate ? { onNavigate } : {})}
							/>
						))}
					</div>
				</div>
			))}
		</nav>
	);
}

// Nav item component
function SidebarNavItem({
	item,
	isActive,
	onNavigate
}: {
	item: NavItem;
	isActive: boolean;
	onNavigate?: () => void;
}) {
	return (
		<Link
			className={cn(
				"flex items-center gap-3 rounded-xl px-3 py-2 font-medium text-xs transition-all duration-150",
				isActive
					? "bg-[#1e2d5f] text-white shadow-[#1e2d5f]/20 shadow-sm hover:bg-[#16245a]"
					: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
			)}
			onClick={onNavigate}
			to={item.to}
		>
			<span
				className={cn(
					"flex size-5 shrink-0 items-center justify-center",
					isActive ? "text-white" : "text-slate-400 dark:text-slate-500"
				)}
			>
				{item.icon}
			</span>
			<span className='flex-1 truncate'>{item.label}</span>
			{item.badge && (
				<span
					className={cn(
						"flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-bold text-[10px]",
						isActive
							? "bg-white/20 text-white"
							: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
					)}
				>
					{item.badge}
				</span>
			)}
		</Link>
	);
}
