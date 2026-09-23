"use client";

import { useAuth } from "@better-auth-ui/react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

import { ProviderButton } from "./provider-button";

export type ProviderButtonsProps = {
	socialLayout?: SocialLayout;
};

export type SocialLayout = "auto" | "horizontal" | "vertical" | "grid";

/**
 * Extract a stable string key from an entry in `socialProviders`.
 *
 * `socialProviders` can contain plain strings ("google") or custom provider
 * descriptors (`{ id: "okta", name: "Okta", ... }`). Normalizing to a string
 * here keeps the downstream `key` and `provider` props type-safe.
 */
function resolveProviderId(provider: unknown): string {
	if (typeof provider === "string") return provider;
	if (provider && typeof provider === "object" && "id" in provider) {
		return String(provider.id);
	}
	return String(provider);
}

/**
 * Render sign-in buttons for configured social providers.
 *
 * @param socialLayout - Preferred layout for the provider buttons; `"auto"` chooses based on provider count.
 */
export function ProviderButtons({
	socialLayout = "auto"
}: ProviderButtonsProps) {
	const { socialProviders } = useAuth();

	const resolvedSocialLayout = useMemo(() => {
		if (socialLayout === "auto") {
			if (socialProviders?.length && socialProviders.length >= 4) {
				return "horizontal";
			}
			return "vertical";
		}
		return socialLayout;
	}, [socialLayout, socialProviders?.length]);

	return (
		<div
			className={cn(
				"gap-3",
				resolvedSocialLayout === "grid" && "grid grid-cols-2",
				resolvedSocialLayout === "vertical" && "flex flex-col",
				resolvedSocialLayout === "horizontal" && "flex flex-row flex-wrap"
			)}
		>
			{socialProviders?.map(provider => {
				const id = resolveProviderId(provider);

				return (
					<ProviderButton
						className={cn(resolvedSocialLayout === "horizontal" && "flex-1")}
						display={
							resolvedSocialLayout === "vertical"
								? "full"
								: resolvedSocialLayout === "grid"
									? "name"
									: "icon"
						}
						key={id}
						provider={id}
					/>
				);
			})}
		</div>
	);
}
