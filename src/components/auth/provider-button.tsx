"use client";

import { authMutationKeys, getProviderName } from "@better-auth-ui/core";
import { providerIcons, useAuth, useSignInSocial } from "@better-auth-ui/react";
import { useIsMutating } from "@tanstack/react-query";
import { Circle } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export type ProviderButtonProps = {
	provider: string;
	display?: "full" | "name" | "icon";
} & Omit<ComponentProps<typeof Button>, "onClick" | "children" | "disabled">;

/**
 * Social provider sign-in button.
 *
 * @param provider - Provider key to sign in with.
 * @param display - `"full"` (e.g. "Continue with Google"), `"name"` (just the provider name), or `"icon"` (icon only).
 */
export function ProviderButton({
	provider,
	display = "full",
	variant = "outline",
	...props
}: ProviderButtonProps) {
	const { authClient, baseURL, localization, redirectTo } = useAuth();

	const callbackURL = `${baseURL}${redirectTo}`;

	const { mutate: signInSocial, isPending: signInSocialPending } =
		useSignInSocial(authClient);

	// `providerIcons` is keyed by the built-in provider union — a custom
	// provider string falls through as `undefined`. Fall back to a neutral icon
	// so the button always renders something sensible.
	const ProviderIcon = providerIcons[provider] ?? Circle;

	const signInMutating = useIsMutating({
		mutationKey: authMutationKeys.signIn.all
	});
	const signUpMutating = useIsMutating({
		mutationKey: authMutationKeys.signUp.all
	});
	const isPending = signInMutating + signUpMutating > 0;

	return (
		<Button
			disabled={isPending}
			onClick={() => signInSocial({ provider, callbackURL })}
			type='button'
			variant={variant}
			{...props}
			aria-label={getProviderName(provider)}
		>
			{signInSocialPending ? <Spinner /> : <ProviderIcon />}

			{display === "full"
				? localization.auth.continueWith.replace(
						"{{provider}}",
						getProviderName(provider)
					)
				: display === "name"
					? getProviderName(provider)
					: null}
		</Button>
	);
}
