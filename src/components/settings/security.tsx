// src/components/settings/tabs/security.tsx

import { SettingsSection } from "./settings-page";

export function SecuritySettings() {
	return (
		<SettingsSection
			description='Session policy, two-factor authentication, and access controls.'
			title='Security'
		>
			<div className='rounded-xl border border-border border-dashed bg-muted/30 p-6 text-muted-foreground text-sm'>
				<p className='font-medium text-foreground'>Coming soon</p>
				<p className='mt-1'>
					Session timeout, 2FA enforcement, and audit log retention will be
					configurable here.
				</p>
			</div>
		</SettingsSection>
	);
}
