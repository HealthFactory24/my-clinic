// src/components/settings/tabs/notifications.tsx
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Switch } from "#/components/ui/switch.tsx";

import { SaveBar } from "./clinic-profile.tsx";
import { SettingsSection } from "./settings-page";

interface NotificationPrefs {
	appointmentReminders: boolean;
	reminderLeadHours: number;
	immunizationOverdue: boolean;
	immunizationLeadDays: number;
	labResults: boolean;
	prescriptionRenewal: boolean;
	dailyDigest: boolean;
	weeklyDigest: boolean;
	emailEnabled: boolean;
	smsEnabled: boolean;
}

const INITIAL: NotificationPrefs = {
	appointmentReminders: true,
	reminderLeadHours: 24,
	immunizationOverdue: true,
	immunizationLeadDays: 7,
	labResults: true,
	prescriptionRenewal: true,
	dailyDigest: false,
	weeklyDigest: true,
	emailEnabled: true,
	smsEnabled: false
};

export function NotificationsSettings() {
	const [prefs, setPrefs] = useState<NotificationPrefs>(INITIAL);
	const [isSaving, setIsSaving] = useState(false);
	const [isDirty, setIsDirty] = useState(false);

	const update = useCallback(
		<K extends keyof NotificationPrefs>(
			key: K,
			value: NotificationPrefs[K]
		) => {
			setPrefs(prev => ({ ...prev, [key]: value }));
			setIsDirty(true);
		},
		[]
	);

	const handleSubmit = useCallback(async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			await new Promise(r => setTimeout(r, 400)); // TODO: mutation
			toast.success("Notification preferences saved.");
			setIsDirty(false);
		} finally {
			setIsSaving(false);
		}
	}, []);

	return (
		<form
			className='space-y-6'
			onSubmit={handleSubmit}
		>
			<SettingsSection
				description='Where notifications are delivered. Each channel can be toggled independently.'
				title='Channels'
			>
				<SwitchRow
					checked={prefs.emailEnabled}
					description="Send notifications to the staff member's email on file."
					id='email-enabled'
					label='Email notifications'
					onChange={v => update("emailEnabled", v)}
				/>
				<SwitchRow
					checked={prefs.smsEnabled}
					description='Requires an SMS provider integration. Configure in Integrations.'
					id='sms-enabled'
					label='SMS notifications'
					onChange={v => update("smsEnabled", v)}
				/>
			</SettingsSection>

			<SettingsSection title='Appointments'>
				<SwitchRow
					checked={prefs.appointmentReminders}
					description='Notify the responsible provider before each scheduled visit.'
					id='appointment-reminders'
					label='Appointment reminders'
					onChange={v => update("appointmentReminders", v)}
				/>
				{prefs.appointmentReminders ? (
					<div className='space-y-2 pl-8'>
						<Label htmlFor='reminder-lead'>Lead time (hours)</Label>
						<Input
							className='max-w-[120px]'
							id='reminder-lead'
							max={168}
							min={1}
							onChange={e =>
								update("reminderLeadHours", Number(e.target.value))
							}
							type='number'
							value={prefs.reminderLeadHours}
						/>
					</div>
				) : null}
			</SettingsSection>

			<SettingsSection title='Clinical Alerts'>
				<SwitchRow
					checked={prefs.immunizationOverdue}
					description='Alert the care team when a patient is overdue for a scheduled vaccine.'
					id='immunization-overdue'
					label='Immunization overdue'
					onChange={v => update("immunizationOverdue", v)}
				/>
				{prefs.immunizationOverdue ? (
					<div className='space-y-2 pl-8'>
						<Label htmlFor='immunization-lead'>
							Notify before due date (days)
						</Label>
						<Input
							className='max-w-[120px]'
							id='immunization-lead'
							max={90}
							min={0}
							onChange={e =>
								update("immunizationLeadDays", Number(e.target.value))
							}
							type='number'
							value={prefs.immunizationLeadDays}
						/>
					</div>
				) : null}
				<SwitchRow
					checked={prefs.labResults}
					description='Notify the ordering provider when results are returned.'
					id='lab-results'
					label='Lab results ready'
					onChange={v => update("labResults", v)}
				/>
				<SwitchRow
					checked={prefs.prescriptionRenewal}
					description='Notify when a patient or guardian requests a refill.'
					id='prescription-renewal'
					label='Prescription renewal requests'
					onChange={v => update("prescriptionRenewal", v)}
				/>
			</SettingsSection>

			<SettingsSection title='Digests'>
				<SwitchRow
					checked={prefs.dailyDigest}
					description="A single email at the start of each day with today's schedule and alerts."
					id='daily-digest'
					label='Daily summary'
					onChange={v => update("dailyDigest", v)}
				/>
				<SwitchRow
					checked={prefs.weeklyDigest}
					description="A recap of the week's activity, sent Monday morning."
					id='weekly-digest'
					label='Weekly summary'
					onChange={v => update("weeklyDigest", v)}
				/>
			</SettingsSection>

			<SaveBar
				isDirty={isDirty}
				isSaving={isSaving}
				onReset={() => {
					setPrefs(INITIAL);
					setIsDirty(false);
				}}
			/>
		</form>
	);
}

function SwitchRow({
	id,
	label,
	description,
	checked,
	onChange
}: {
	id: string;
	label: string;
	description?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<div className='flex items-start justify-between gap-4'>
			<div className='min-w-0'>
				<Label
					className='font-medium text-sm'
					htmlFor={id}
				>
					{label}
				</Label>
				{description ? (
					<p className='mt-0.5 text-muted-foreground text-xs'>{description}</p>
				) : null}
			</div>
			<Switch
				checked={checked}
				id={id}
				onCheckedChange={onChange}
			/>
		</div>
	);
}
