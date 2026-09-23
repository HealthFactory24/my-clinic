// src/routes/_guest/signup.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SignInSocialButton } from "#/components/sign-in-social-buttons";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth/auth-client";
import { authQueryOptions } from "#/lib/auth/queries";
import { Icons } from "@/components/ui/icons";

import { ClinicLogo } from "../../components/logo";

// Password validation helper
const validatePassword = (
	password: string
): { valid: boolean; message?: string } => {
	if (password.length < 8) {
		return { valid: false, message: "Password must be at least 8 characters" };
	}
	if (!/[A-Z]/.test(password)) {
		return {
			valid: false,
			message: "Password must contain at least one uppercase letter"
		};
	}
	if (!/[a-z]/.test(password)) {
		return {
			valid: false,
			message: "Password must contain at least one lowercase letter"
		};
	}
	if (!/\d/.test(password)) {
		return {
			valid: false,
			message: "Password must contain at least one number"
		};
	}
	if (!/[@$!%*?&]/.test(password)) {
		return {
			valid: false,
			message: "Password must contain at least one special character (@$!%*?&)"
		};
	}
	return { valid: true };
};

export const Route = createFileRoute("/_guest/signup")({
	component: SignupForm
});

function SignupForm() {
	const { redirectUrl } = Route.useRouteContext();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const { mutate: signupMutate, isPending } = useMutation({
		mutationFn: async (data: {
			name: string;
			email: string;
			password: string;
		}) => {
			await authClient.signUp.email(
				{
					...data,
					callbackURL: redirectUrl
				},
				{
					onError: ({ error }: { error: { message?: string } }) => {
						toast.error(
							error?.message || "An error occurred while signing up."
						);
					},
					onSuccess: () => {
						queryClient.removeQueries({
							queryKey: authQueryOptions().queryKey
						});
						navigate({ to: redirectUrl });
					}
				}
			);
		}
	});

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isPending) return;

		if (!name || !email || !password || !confirmPassword) {
			toast.error("Please fill in all fields");
			return;
		}

		if (password !== confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}

		const passwordValidation = validatePassword(password);
		if (!passwordValidation.valid) {
			toast.error(passwordValidation.message || "Invalid password");
			return;
		}

		signupMutate({ name, email, password });
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
					<h1 className='mt-2 text-center font-bold text-2xl'>
						Create an Account
					</h1>
					<p className='text-center text-muted-foreground text-sm'>
						Start managing your pediatric practice today
					</p>
				</div>

				{/* Signup Form */}
				<form
					className='space-y-6'
					onSubmit={handleSubmit}
				>
					<div className='space-y-4'>
						{/* Name */}
						<div className='space-y-2'>
							<Label htmlFor='name'>Full Name</Label>
							<Input
								className='h-11'
								disabled={isPending}
								id='name'
								name='name'
								onChange={e => setName(e.target.value)}
								placeholder='Dr. John Doe'
								required
								type='text'
								value={name}
							/>
						</div>

						{/* Email */}
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

						{/* Password */}
						<div className='space-y-2'>
							<Label htmlFor='password'>Password</Label>
							<div className='relative'>
								<Input
									className='h-11 pr-10'
									disabled={isPending}
									id='password'
									name='password'
									onChange={e => setPassword(e.target.value)}
									placeholder='Create a strong password'
									required
									type={showPassword ? "text" : "password"}
									value={password}
								/>
								<button
									className='absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground'
									onClick={() => setShowPassword(!showPassword)}
									type='button'
								>
									{showPassword ? "👁️" : "👁️‍🗨️"}
								</button>
							</div>
							<p className='text-muted-foreground text-xs'>
								Must be at least 8 characters with uppercase, lowercase, number,
								and special character
							</p>
						</div>

						{/* Confirm Password */}
						<div className='space-y-2'>
							<Label htmlFor='confirm_password'>Confirm Password</Label>
							<Input
								className='h-11'
								disabled={isPending}
								id='confirm_password'
								name='confirm_password'
								onChange={e => setConfirmPassword(e.target.value)}
								placeholder='Confirm your password'
								required
								type={showPassword ? "text" : "password"}
								value={confirmPassword}
							/>
							{password && confirmPassword && password !== confirmPassword && (
								<p className='text-destructive text-xs'>
									Passwords do not match
								</p>
							)}
							{password && confirmPassword && password === confirmPassword && (
								<p className='text-emerald-500 text-xs'>✓ Passwords match</p>
							)}
						</div>

						<Button
							className='h-11 w-full'
							disabled={
								isPending ||
								!name ||
								!email ||
								!password ||
								!confirmPassword ||
								password !== confirmPassword
							}
							size='lg'
							type='submit'
						>
							{isPending ? (
								<>
									<LoaderCircleIcon className='mr-2 size-4 animate-spin' />
									Creating account...
								</>
							) : (
								"Create Account"
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
							callbackURL={redirectUrl}
							disabled={isPending}
							icon={<Icons.github className='size-4' />}
							provider='github'
						/>
						<SignInSocialButton
							callbackURL={redirectUrl}
							disabled={true} // Enable when Google OAuth is configured
							icon={<Icons.google className='size-4' />}
							provider='google'
						/>
					</div>
				</form>

				{/* Login Link */}
				<div className='text-center text-sm'>
					Already have an account?{" "}
					<Link
						className='font-medium text-primary hover:underline'
						search={{ redirect: "/" }}
						to='/login'
					>
						Sign in
					</Link>
				</div>
			</div>
		</div>
	);
}
