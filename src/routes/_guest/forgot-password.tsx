// src/routes/_guest/forgot-password.tsx
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, LoaderCircleIcon, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth/auth-client";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";

export const Route = createFileRoute("/_guest/forgot-password")({
	component: ForgotPasswordPage
});

function ForgotPasswordPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [isSubmitted, setIsSubmitted] = useState(false);

	const { mutate: sendResetLink, isPending } = useMutation({
		mutationFn: async (email: string) => {
			// Use Better Auth's requestPasswordReset (not forgetPassword)
			const result = await authClient.requestPasswordReset({
				email,
				redirectTo: `${window.location.origin}/reset-password`
			});
			// Handle errors properly - Better Auth returns { data, error }
			if (result.error) {
				throw new Error(result.error.message || "Failed to send reset link");
			}

			return result.data;
		},
		onSuccess: () => {
			setIsSubmitted(true);
			toast.success("Password reset link sent to your email");
		},
		onError: (error: Error) => {
			// Don't reveal if email exists or not for security
			toast.error("Unable to send reset link");
			console.error("Password reset error:", error);
		}
	});

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
		// Fixed: FormEvent not SubmitEvent
		e.preventDefault();
		if (!email) {
			toast.error("Please enter your email address");
			return;
		}
		sendResetLink(email);
	};

	// Success state
	if (isSubmitted) {
		return (
			<div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4'>
				<Card className='w-full max-w-md'>
					<CardHeader className='text-center'>
						<div className='mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30'>
							<CheckCircle2 className='size-8 text-emerald-600 dark:text-emerald-400' />
						</div>
						<CardTitle className='mt-4 text-2xl'>Check Your Email</CardTitle>
						<CardDescription>
							We've sent a password reset link to{" "}
							<span className='font-medium text-foreground'>{email}</span>
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='rounded-lg bg-muted/50 p-4 text-sm'>
							<p className='text-muted-foreground'>
								<span className='font-medium'>Didn't receive the email?</span>
								<br />
								Check your spam folder or{" "}
								<button
									className='text-primary hover:underline'
									onClick={() => {
										setIsSubmitted(false);
										setEmail("");
									}}
									type='button'
								>
									try again
								</button>
								.
							</p>
						</div>
						<Button
							className='w-full'
							onClick={() =>
								navigate({ to: "/login", search: { redirect: "/" } })
							}
							variant='outline'
						>
							<ArrowLeft className='mr-2 size-4' />
							Back to Login
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle className='text-2xl'>Reset Your Password</CardTitle>
					<CardDescription>
						Enter your email address and we'll send you a link to reset your
						password.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						className='space-y-6'
						onSubmit={handleSubmit}
					>
						<div className='space-y-2'>
							<Label htmlFor='email'>Email Address</Label>
							<div className='relative'>
								<Mail className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
								<Input
									className='h-11 pl-10'
									disabled={isPending}
									id='email'
									onChange={e => setEmail(e.target.value)}
									placeholder='doctor@clinic.com'
									required
									type='email'
									value={email}
								/>
							</div>
						</div>

						<Button
							className='h-11 w-full'
							disabled={isPending || !email}
							type='submit'
						>
							{isPending ? (
								<>
									<LoaderCircleIcon className='mr-2 size-4 animate-spin' />
									Sending reset link...
								</>
							) : (
								"Send Reset Link"
							)}
						</Button>

						<div className='text-center text-sm'>
							<Link
								className='flex items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-foreground'
								search={{ redirect: "/" }}
								to='/login'
							>
								<ArrowLeft className='size-3' />
								Back to Login
							</Link>
						</div>

						<div className='text-center text-muted-foreground text-xs'>
							<p>
								For security reasons, the reset link will expire in{" "}
								<span className='font-medium'>1 hour</span>.
							</p>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
