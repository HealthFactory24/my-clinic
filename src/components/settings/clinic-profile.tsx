// src/components/settings/tabs/clinic-profile.tsx
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";

import { SettingsSection } from "./settings-page";

interface ClinicProfile {
	name: string;
	legalName: string;
	email: string;
	phone: string;
	website: string;
	addressLine1: string;
	addressLine2: string;
	city: string;
	region: string;
	postalCode: string;
	country: string;
	taxId: string;
	licenseNumber: string;
	notes: string;
}

const INITIAL: ClinicProfile = {
	name: "Smart Clinic Pediatrics",
	legalName: "Smart Clinic Pediatrics, PC",
	email: "hello@smartclinic.example",
	phone: "+1 (555) 010-2030",
	website: "https://smartclinic.example",
	addressLine1: "123 Healthcare Way",
	addressLine2: "Suite 100",
	city: "Springfield",
	region: "IL",
	postalCode: "62704",
	country: "United States",
	taxId: "",
	licenseNumber: "",
	notes: ""
};

export function ClinicProfileSettings() {
	const [profile, setProfile] = useState<ClinicProfile>(INITIAL);
	const [isSaving, setIsSaving] = useState(false);
	const [isDirty, setIsDirty] = useState(false);

	const update = useCallback(
		<K extends keyof ClinicProfile>(key: K, value: ClinicProfile[K]) => {
			setProfile(prev => ({ ...prev, [key]: value }));
			setIsDirty(true);
		},
		[]
	);

	const handleSubmit = useCallback(
		async (e: React.ChangeEvent<HTMLFormElement>) => {
			e.preventDefault();
			setIsSaving(true);
			try {
				// TODO: replace with `await updateClinicProfile(profile)` mutation
				await new Promise(r => setTimeout(r, 400));
				toast.success("Clinic profile saved.");
				setIsDirty(false);
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to save profile."
				);
			} finally {
				setIsSaving(false);
			}
		},
		[]
	);

	return (
		<form
			className='space-y-6'
			onSubmit={handleSubmit}
		>
			<SettingsSection
				description='How your clinic appears on documents, invoices, and patient communications.'
				title='Clinic Identity'
			>
				<Field
					id='clinic-name'
					label='Clinic name'
					onChange={v => update("name", v)}
					required
					value={profile.name}
				/>
				<Field
					description='As registered with your local licensing authority.'
					id='clinic-legal-name'
					label='Legal entity name'
					onChange={v => update("legalName", v)}
					value={profile.legalName}
				/>
				<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
					<Field
						id='clinic-license'
						label='License number'
						onChange={v => update("licenseNumber", v)}
						value={profile.licenseNumber}
					/>
					<Field
						id='clinic-tax-id'
						label='Tax ID'
						onChange={v => update("taxId", v)}
						value={profile.taxId}
					/>
				</div>
			</SettingsSection>

			<SettingsSection title='Contact'>
				<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
					<Field
						id='clinic-email'
						label='Email'
						onChange={v => update("email", v)}
						type='email'
						value={profile.email}
					/>
					<Field
						id='clinic-phone'
						label='Phone'
						onChange={v => update("phone", v)}
						type='tel'
						value={profile.phone}
					/>
				</div>
				<Field
					id='clinic-website'
					label='Website'
					onChange={v => update("website", v)}
					type='url'
					value={profile.website}
				/>
			</SettingsSection>

			<SettingsSection title='Address'>
				<Field
					id='clinic-address-1'
					label='Address line 1'
					onChange={v => update("addressLine1", v)}
					value={profile.addressLine1}
				/>
				<Field
					id='clinic-address-2'
					label='Address line 2'
					onChange={v => update("addressLine2", v)}
					value={profile.addressLine2}
				/>
				<div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
					<Field
						id='clinic-city'
						label='City'
						onChange={v => update("city", v)}
						value={profile.city}
					/>
					<Field
						id='clinic-region'
						label='State / Region'
						onChange={v => update("region", v)}
						value={profile.region}
					/>
					<Field
						id='clinic-postal'
						label='Postal code'
						onChange={v => update("postalCode", v)}
						value={profile.postalCode}
					/>
				</div>
				<Field
					id='clinic-country'
					label='Country'
					onChange={v => update("country", v)}
					value={profile.country}
				/>
			</SettingsSection>

			<SettingsSection title='Notes'>
				<div className='space-y-2'>
					<Label htmlFor='clinic-notes'>Internal notes</Label>
					<Textarea
						id='clinic-notes'
						maxLength={2000}
						onChange={e => update("notes", e.target.value)}
						placeholder="Anything your staff should know about this clinic's configuration..."
						rows={4}
						value={profile.notes}
					/>
				</div>
			</SettingsSection>

			<SaveBar
				isDirty={isDirty}
				isSaving={isSaving}
				onReset={() => {
					setProfile(INITIAL);
					setIsDirty(false);
				}}
			/>
		</form>
	);
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

function Field({
	id,
	label,
	value,
	onChange,
	type = "text",
	required,
	description
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	type?: "text" | "email" | "tel" | "url";
	required?: boolean;
	description?: string;
}) {
	return (
		<div className='space-y-2'>
			<Label htmlFor={id}>
				{label}
				{required ? <span className='text-destructive'> *</span> : null}
			</Label>
			<Input
				id={id}
				onChange={e => onChange(e.target.value)}
				required={required}
				type={type}
				value={value}
			/>
			{description ? (
				<p className='text-muted-foreground text-xs'>{description}</p>
			) : null}
		</div>
	);
}

export function SaveBar({
	isDirty,
	isSaving,
	onReset,
	submitLabel = "Save changes"
}: {
	isDirty: boolean;
	isSaving: boolean;
	onReset: () => void;
	submitLabel?: string;
}) {
	return (
		<div className='sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur'>
			<span className='mr-auto text-muted-foreground text-xs'>
				{isDirty ? "You have unsaved changes." : "All changes saved."}
			</span>
			<Button
				disabled={!isDirty || isSaving}
				onClick={onReset}
				type='button'
				variant='outline'
			>
				Reset
			</Button>
			<Button
				disabled={!isDirty || isSaving}
				type='submit'
			>
				{isSaving ? "Saving…" : submitLabel}
			</Button>
		</div>
	);
}
