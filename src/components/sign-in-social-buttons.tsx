import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "#/components/ui/button.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";

import { Icons } from "./ui/icons";

interface SocialLoginButtonProps {
	provider: string;
	icon: React.ReactNode;
	disabled?: boolean;
	callbackURL: string;
}

function providerLabelFor(provider: string): string {
	if (provider === "github") return "GitHub";
	if (provider === "oidc") return "Authentik"; // Added for your local OIDC provider
	return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function SignInSocialButton({
	provider,
	icon,
	disabled,
	callbackURL
}: SocialLoginButtonProps) {
	const providerLabel = providerLabelFor(provider);

	const mutation = useMutation({
		mutationFn: async () =>
			authClient.signIn.social(
				{ provider, callbackURL },
				{
					onError: ({ error }) => {
						toast.error(error.message);
					}
				}
			)
	});

	return (
		<Button
			className='w-full'
			disabled={mutation.isPending || mutation.isSuccess || disabled}
			onClick={() => mutation.mutate()}
			size='lg'
			type='button'
			variant='outline'
		>
			{icon}
			Continue with {providerLabel}
		</Button>
	);
}

export function SocialSignInButtons({
	callbackURL,
	disabled
}: Pick<SocialLoginButtonProps, "callbackURL" | "disabled">) {
	const isPreviewDeployment =
		typeof window !== "undefined" &&
		window.location.hostname.endsWith(".vercel.app");

	return (
		<>
			<div className='relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:border-border after:border-t'>
				<span className='relative z-10 bg-background px-2 text-muted-foreground'>
					Or
				</span>
			</div>
			<div className='grid gap-3 sm:grid-cols-2'>
				<SignInSocialButton
					callbackURL={callbackURL}
					disabled={disabled}
					icon={<Icons.github className='size-4' />}
					provider='github'
				/>
				<SignInSocialButton
					callbackURL={callbackURL}
					disabled={disabled || isPreviewDeployment}
					icon={
						<span className='flex size-4 items-center justify-center font-bold text-xs'>
							A
						</span>
					} // Or your preferred Authentik icon
					provider='oidc'
				/>
			</div>
		</>
	);
}
