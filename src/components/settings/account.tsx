// src/components/settings/tabs/account.tsx

import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { useAuthSuspense } from "#/lib/auth/hooks.ts";

import { SignOutButton } from "../sign-out-button";
import { SettingsSection } from "./settings-page";

export function AccountSettings() {
	const { user } = useAuthSuspense();

	return (
		<div className='space-y-6'>
			<SettingsSection
				description='Your personal account details. To change these, contact your clinic administrator.'
				title='Profile'
			>
				<div className='space-y-2'>
					<Label htmlFor='account-name'>Name</Label>
					<Input
						id='account-name'
						readOnly
						value={user?.name ?? ""}
					/>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='account-email'>Email</Label>
					<Input
						id='account-email'
						readOnly
						value={user?.email ?? ""}
					/>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='account-id'>User ID</Label>
					<Input
						className='font-mono text-xs'
						id='account-id'
						readOnly
						value={user?.id}
					/>
				</div>
			</SettingsSection>

			<SettingsSection
				description='Sign out of this device. Other active sessions remain unaffected.'
				title='Session'
			>
				<SignOutButton />
			</SettingsSection>
		</div>
	);
}
