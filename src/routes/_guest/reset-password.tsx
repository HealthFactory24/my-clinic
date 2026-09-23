// src/routes/_guest/reset-password.tsx
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle2,
	Eye,
	EyeOff,
	LoaderCircleIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getPasswordValidation } from "#/components/auth/PasswordValidation";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth/auth-client";

export const Route = createFileRoute("/_guest/reset-password")({
	component: ResetPasswordPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			token: (search.token as string) || ""
		};
	}
});

function ResetPasswordPage() {
	const navigate = useNavigate();
	const { token } = Route.useSearch();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
	const [isSubmitted, setIsSubmitted] = useState(false);

	// Validate token on mount
	useEffect(() => {
		const validateToken = async () => {
			if (!token) {
				setIsValidToken(false);
				return;
			}

			try {
				// Check if token is valid using Better Auth
				const isValid = await validateResetToken(token);
				setIsValidToken(isValid);
			} catch {
				setIsValidToken(false);
			}
		};

		validateToken();
	}, [token]);

	const { mutate: resetPassword, isPending } = useMutation({
		mutationFn: async (data: { token: string; password: string }) => {
			// Use the correct Better Auth reset password API
			await authClient.resetPassword({
				newPassword: data.password,
				token: data.token
			});
		},
		onSuccess: () => {
			setIsSubmitted(true);
			toast.success("Password reset successfully");
		},
		onError: (error: Error) => {
			toast.error(
				error.message ||
					"The reset link may have expired. Please request a new one."
			);
		}
	});

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!token) {
			toast.error("Invalid reset token");
			return;
		}

		const validation = getPasswordValidation(password);
		if (!validation.isValid) {
			toast.error(validation.message);
			return;
		}

		if (password !== confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}

		resetPassword({ token, password });
	};

	// Invalid token state
	if (isValidToken === false) {
		return (
			<div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4'>
				<Card className='w-full max-w-md'>
					<CardHeader className='text-center'>
						<div className='mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10'>
							<span className='text-3xl'>🔒</span>
						</div>
						<CardTitle className='mt-4 text-2xl'>Invalid Reset Link</CardTitle>
						<CardDescription>
							The password reset link is invalid or has expired.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<p className='text-center text-muted-foreground text-sm'>
							Please request a new password reset link from the login page.
						</p>
						<Button
							className='w-full'
							onClick={() => navigate({ to: "/forgot-password" })}
						>
							Request New Link
						</Button>
						<Button
							className='w-full'
							onClick={() =>
								navigate({
									params: { id: token },
									to: "/login",
									search: { redirect: "/" }
								})
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

	// Success state
	if (isSubmitted) {
		return (
			<div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4'>
				<Card className='w-full max-w-md'>
					<CardHeader className='text-center'>
						<div className='mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30'>
							<CheckCircle2 className='size-8 text-emerald-600 dark:text-emerald-400' />
						</div>
						<CardTitle className='mt-4 text-2xl'>
							Password Reset Complete
						</CardTitle>
						<CardDescription>
							Your password has been successfully reset.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							className='w-full'
							onClick={() =>
								navigate({
									params: { id: token },
									to: "/login",
									search: { redirect: "/" }
								})
							}
						>
							Sign In with New Password
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Loading token validation
	if (isValidToken === null) {
		return (
			<div className='flex min-h-screen items-center justify-center'>
				<div className='text-center'>
					<LoaderCircleIcon className='mx-auto size-8 animate-spin text-primary' />
					<p className='mt-2 text-muted-foreground text-sm'>
						Validating reset link...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle className='text-2xl'>Set New Password</CardTitle>
					<CardDescription>
						Enter a new password for your account.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						className='space-y-6'
						onSubmit={handleSubmit}
					>
						<div className='space-y-2'>
							<Label htmlFor='password'>New Password</Label>
							<div className='relative'>
								<Input
									className='h-11 pr-10'
									disabled={isPending}
									id='password'
									onChange={e => setPassword(e.target.value)}
									placeholder='Enter new password'
									required
									type={showPassword ? "text" : "password"}
									value={password}
								/>
								<button
									className='absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground'
									onClick={() => setShowPassword(!showPassword)}
									type='button'
								>
									{showPassword ? (
										<EyeOff className='size-4' />
									) : (
										<Eye className='size-4' />
									)}
								</button>
							</div>
							{/* PasswordStrengthIndicator component would go here if available */}
							<div className='mt-2'>
								<div className='flex items-center gap-2'>
									<div className='h-1 flex-1 rounded-full bg-muted'>
										<div
											className='h-full rounded-full bg-primary transition-all duration-300'
											style={{
												width: `${Math.min((password.length / 20) * 100, 100)}%`
											}}
										/>
									</div>
									<span className='text-muted-foreground text-xs'>
										{password.length < 8
											? "Weak"
											: password.length < 12
												? "Good"
												: "Strong"}
									</span>
								</div>
								<p className='mt-1 text-muted-foreground text-xs'>
									Minimum 8 characters with at least one number and special
									character
								</p>
							</div>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='confirm-password'>Confirm Password</Label>
							<Input
								className='h-11'
								disabled={isPending}
								id='confirm-password'
								onChange={e => setConfirmPassword(e.target.value)}
								placeholder='Confirm new password'
								required
								type={showPassword ? "text" : "password"}
								value={confirmPassword}
							/>
							{password && confirmPassword && (
								<p
									className={`text-xs ${
										password === confirmPassword
											? "text-emerald-500"
											: "text-destructive"
									}`}
								>
									{password === confirmPassword
										? "✓ Passwords match"
										: "✗ Passwords do not match"}
								</p>
							)}
						</div>

						<Button
							className='h-11 w-full'
							disabled={
								isPending ||
								!password ||
								!confirmPassword ||
								password !== confirmPassword ||
								!getPasswordValidation(password).isValid
							}
							type='submit'
						>
							{isPending ? (
								<>
									<LoaderCircleIcon className='mr-2 size-4 animate-spin' />
									Resetting password...
								</>
							) : (
								"Reset Password"
							)}
						</Button>

						<div className='text-center text-sm'>
							<Link
								className='flex items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-foreground'
								params={{ id: token }}
								search={{ redirect: "/" }}
								to='/login'
							>
								<ArrowLeft className='size-3' />
								Back to Login
							</Link>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

// Server function to validate reset token
async function validateResetToken(token: string): Promise<boolean> {
	try {
		// This would be a server function call
		const response = await fetch("/api/auth/validate-reset-token", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token })
		});
		const data = await response.json();
		return data.valid;
	} catch {
		return false;
	}
}
