import { SettingsSection } from "./settings-page";

export function PracticeSettings() {
	return (
		<SettingsSection
			description='Defaults for timezone, units, and clinical conventions.'
			title='Practice Preferences'
		>
			<ComingSoon>
				Timezone, metric/imperial units, and pediatric default ranges will
				appear here.
			</ComingSoon>
		</SettingsSection>
	);
}

function ComingSoon({ children }: { children: React.ReactNode }) {
	return (
		<div className='rounded-xl border border-border border-dashed bg-muted/30 p-6 text-muted-foreground text-sm'>
			<p className='font-medium text-foreground'>Coming soon</p>
			<p className='mt-1'>{children}</p>
		</div>
	);
}
