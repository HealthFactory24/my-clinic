// src/components/settings/tabs/integrations.tsx

import { SettingsSection } from "./settings-page";

export function IntegrationsSettings() {
	return (
		<SettingsSection
			description='Connect external services like lab vendors, SMS providers, and calendars.'
			title='Integrations'
		>
			<div className='rounded-xl border border-border border-dashed bg-muted/30 p-6 text-muted-foreground text-sm'>
				<p className='font-medium text-foreground'>Coming soon</p>
				<p className='mt-1'>
					Lab vendor APIs, SMS gateways, and calendar sync will be configured
					here.
				</p>
			</div>
		</SettingsSection>
	);
}
