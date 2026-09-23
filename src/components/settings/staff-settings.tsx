import { SettingsSection } from "./settings-page";

export function StaffSettings() {
	return (
		<SettingsSection
			description='Default permissions for new staff members and role definitions.'
			title='Staff & Roles'
		>
			<div className='rounded-xl border border-border border-dashed bg-muted/30 p-6 text-muted-foreground text-sm'>
				<p className='font-medium text-foreground'>Coming soon</p>
				<p className='mt-1'>
					Role matrix (Admin / Doctor / Staff / Patient) and default permission
					templates will be configurable here.
				</p>
			</div>
		</SettingsSection>
	);
}
