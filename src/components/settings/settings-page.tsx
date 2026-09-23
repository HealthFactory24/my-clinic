// src/components/settings/layout/settings-page.tsx
import { useState } from "react";

import { cn } from "@/lib/utils";

import { AccountSettings } from "./account";
import { ClinicProfileSettings } from "./clinic-profile";
import { DataManagementSettings } from "./data-management";
import { IntegrationsSettings } from "./integrations";
import { NotificationsSettings } from "./notifications";
import { PracticeSettings } from "./practice";
import { SecuritySettings } from "./security";
import { type SettingsTabId, SettingsTabs } from "./settings-tabs.tsx";
import { StaffSettings } from "./staff-settings";

interface SettingsPageProps {
	/**
	 * Optionally force an initial tab (useful for deep links like
	 * `/app/settings?tab=security`). If omitted, defaults to "clinic".
	 */
	defaultTab?: SettingsTabId;
}

export function SettingsPage({ defaultTab = "clinic" }: SettingsPageProps) {
	const [activeTab, setActiveTab] = useState<SettingsTabId>(defaultTab);

	return (
		<div className='mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8'>
			<header>
				<h1 className='font-bold text-2xl tracking-tight'>Settings</h1>
				<p className='mt-1 text-muted-foreground text-sm'>
					Manage your clinic profile, staff, security, and integrations.
				</p>
			</header>

			<div className='grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]'>
				{/* Left: vertical tab nav on desktop, horizontal on mobile */}
				<SettingsTabs
					activeTab={activeTab}
					onTabChange={setActiveTab}
				/>

				{/* Right: the selected panel */}
				<main className='min-w-0'>
					<SettingsPanel tab={activeTab} />
				</main>
			</div>
		</div>
	);
}

function SettingsPanel({ tab }: { tab: SettingsTabId }) {
	switch (tab) {
		case "clinic":
			return <ClinicProfileSettings />;
		case "practice":
			return <PracticeSettings />;
		case "staff":
			return <StaffSettings />;
		case "notifications":
			return <NotificationsSettings />;
		case "security":
			return <SecuritySettings />;
		case "integrations":
			return <IntegrationsSettings />;
		case "data":
			return <DataManagementSettings />;
		case "account":
			return <AccountSettings />;
		default: {
			// Exhaustiveness guard. If you add a new SettingsTabId, TypeScript will
			// error here until you handle it.
			// const _exhaustive: never = tab;
			return null;
		}
	}
}

// Re-export a `SettingsSection` helper used by every tab for consistency.
export function SettingsSection({
	title,
	description,
	children,
	className
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"rounded-2xl border border-border bg-card p-6 shadow-sm",
				className
			)}
		>
			<header className='mb-5 border-border/60 border-b pb-4'>
				<h2 className='font-semibold text-base text-foreground'>{title}</h2>
				{description ? (
					<p className='mt-1 text-muted-foreground text-sm'>{description}</p>
				) : null}
			</header>
			<div className='space-y-5'>{children}</div>
		</section>
	);
}
