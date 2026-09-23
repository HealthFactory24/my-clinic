// src/routes/_guest/login.tsx
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ClinicLogo } from "#/components/logo.tsx";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth/auth-client";
import { SignInSocialButton } from "@/components/sign-in-social-buttons";
import { Icons } from "@/components/ui/icons";

export const Route = createFileRoute("/_guest/login")({
	component: LoginForm,
	// Validate and parse search params safely with a fallback default
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: (search.redirect as string) || "/app"
	})
});

function LoginForm() {
	// Correctly access the validated search parameters using useSearch()
	const { redirect } = Route.useSearch();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const { mutate: emailLoginMutate, isPending } = useMutation({
		mutationFn: async (data: { email: string; password: string }) => {
			await authClient.signIn.email(
				{
					...data,
					callbackURL: redirect
				},
				{
					onError: ({ error }: { error: { message?: string } }) => {
						toast.error(
							error?.message || "An error occurred while signing in."
						);
					}
				}
			);
		}
	});

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isPending) return;

		if (!email || !password) {
			toast.error("Please fill in all fields");
			return;
		}

		emailLoginMutate({ email, password });
	};

	return (
		<div className='flex min-h-screen items-center justify-center bg-background p-4'>
			<div className='w-full max-w-md space-y-8'>
				{/* Logo/Brand */}
				<div className='flex flex-col items-center gap-2'>
					<Link
						className='flex flex-col items-center gap-2 font-medium'
						to='/'
					>
						<div className='flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary'>
							<ClinicLogo className='size-10' />
						</div>
						<span className='font-semibold text-lg'>Smart Clinic</span>
					</Link>
					<h1 className='mt-2 text-center font-bold text-2xl'>Welcome Back</h1>
					<p className='text-center text-muted-foreground text-sm'>
						Sign in to manage your pediatric practice
					</p>
				</div>

				{/* Login Form */}
				<form
					className='space-y-6'
					onSubmit={handleSubmit}
				>
					<div className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='email'>Email Address</Label>
							<Input
								className='h-11'
								disabled={isPending}
								id='email'
								name='email'
								onChange={e => setEmail(e.target.value)}
								placeholder='doctor@clinic.com'
								required
								type='email'
								value={email}
							/>
						</div>

						<div className='space-y-2'>
							<div className='flex items-center justify-between'>
								<Label htmlFor='password'>Password</Label>
								<Link
									className='text-primary text-sm hover:underline'
									to='/forgot-password'
								>
									Forgot password?
								</Link>
							</div>
							<Input
								className='h-11'
								disabled={isPending}
								id='password'
								name='password'
								onChange={e => setPassword(e.target.value)}
								placeholder='Enter your password'
								required
								type='password'
								value={password}
							/>
						</div>

						<Button
							className='h-11 w-full'
							disabled={isPending || !email || !password}
							size='lg'
							type='submit'
						>
							{isPending ? (
								<>
									<LoaderCircleIcon className='mr-2 size-4 animate-spin' />
									Signing in...
								</>
							) : (
								"Sign In"
							)}
						</Button>
					</div>

					{/* Divider */}
					<div className='relative'>
						<div className='absolute inset-0 flex items-center'>
							<span className='w-full border-t' />
						</div>
						<div className='relative flex justify-center text-xs uppercase'>
							<span className='bg-background px-2 text-muted-foreground'>
								Or continue with
							</span>
						</div>
					</div>

					{/* Social Login */}
					<div className='grid gap-3 sm:grid-cols-2'>
						<SignInSocialButton
							callbackURL={redirect}
							disabled={isPending}
							icon={<Icons.github className='size-4' />}
							provider='github'
						/>
						<SignInSocialButton
							callbackURL={redirect}
							disabled={true} // Enable when Google OAuth is configured
							icon={<Icons.google className='size-4' />}
							provider='google'
						/>
					</div>
				</form>

				{/* Sign Up Link */}
				<div className='text-center text-sm'>
					Don&apos;t have an account?{" "}
					<Link
						className='font-medium text-primary hover:underline'
						to='/signup'
					>
						Create an account
					</Link>
				</div>
			</div>
		</div>
	);
}
