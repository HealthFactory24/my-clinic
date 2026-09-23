// src/components/settings/layout/settings-tabs.tsx
import {
	Bell,
	Building2,
	Database,
	type LucideIcon,
	Plug,
	Shield,
	Stethoscope,
	User,
	Users
} from "lucide-react";

import { cn } from "@/lib/utils";

export const SETTINGS_TABS = [
	{ id: "clinic", label: "Clinic Profile", icon: Building2 },
	{ id: "practice", label: "Practice", icon: Stethoscope },
	{ id: "staff", label: "Staff & Roles", icon: Users },
	{ id: "notifications", label: "Notifications", icon: Bell },
	{ id: "security", label: "Security", icon: Shield },
	{ id: "integrations", label: "Integrations", icon: Plug },
	{ id: "data", label: "Data Management", icon: Database },
	{ id: "account", label: "My Account", icon: User }
] as const satisfies ReadonlyArray<{
	id: string;
	label: string;
	icon: LucideIcon;
}>;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

interface SettingsTabsProps {
	activeTab: SettingsTabId;
	onTabChange: (tab: SettingsTabId) => void;
}

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
	return (
		<nav
			aria-label='Settings sections'
			className={cn(
				// Mobile: horizontal scroll row. Desktop: vertical stack.
				"flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-2",
				"lg:sticky lg:top-4 lg:h-fit lg:flex-col lg:overflow-visible"
			)}
		>
			{SETTINGS_TABS.map(tab => {
				const Icon = tab.icon;
				const isActive = activeTab === tab.id;
				return (
					<button
						aria-current={isActive ? "page" : undefined}
						className={cn(
							"flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 font-medium text-sm transition-colors",
							"lg:w-full",
							isActive
								? "bg-primary/10 text-primary"
								: "text-muted-foreground hover:bg-muted hover:text-foreground"
						)}
						key={tab.id}
						onClick={() => onTabChange(tab.id)}
						type='button'
					>
						<Icon className='size-4 shrink-0' />
						<span className='whitespace-nowrap'>{tab.label}</span>
					</button>
				);
			})}
		</nav>
	);
}
