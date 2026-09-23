// src/routes/terms.tsx
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle, Scale } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_guest/terms")({
	component: TermsPage,
	head: () => ({
		meta: [
			{ title: "Terms of Service — Nurtura Pediatric Clinic" },
			{
				name: "description",
				content:
					"Terms and conditions for using the Nurtura pediatric clinic platform."
			}
		]
	})
});

function TermsPage() {
	return (
		<AppShell
			breadcrumbs={[{ label: "Home", href: "/" }, { label: "Terms" }]}
			subtitle='Last updated: December 2024'
			title='Terms of Service'
		>
			<div className='mx-auto max-w-4xl space-y-8'>
				{/* Hero Section */}
				<Card className='border-0 bg-gradient-to-r from-amber-50 to-orange-50 shadow-none'>
					<CardContent className='p-6'>
						<div className='flex items-center gap-4'>
							<div className='rounded-full bg-amber-100 p-3'>
								<Scale className='size-8 text-amber-600' />
							</div>
							<div>
								<h2 className='font-bold text-2xl'>Terms & Conditions</h2>
								<p className='text-muted-foreground'>
									Please read these terms carefully before using our platform.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Quick Summary */}
				<Card>
					<CardHeader>
						<CardTitle>Quick Summary</CardTitle>
						<CardDescription>
							Key points you should know about using Nurtura.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='flex items-start gap-2'>
								<CheckCircle className='mt-0.5 size-4 text-green-500' />
								<div>
									<p className='font-medium text-sm'>Free to Use</p>
									<p className='text-muted-foreground text-xs'>
										Basic features are free forever
									</p>
								</div>
							</div>
							<div className='flex items-start gap-2'>
								<CheckCircle className='mt-0.5 size-4 text-green-500' />
								<div>
									<p className='font-medium text-sm'>Data Ownership</p>
									<p className='text-muted-foreground text-xs'>
										You own your data
									</p>
								</div>
							</div>
							<div className='flex items-start gap-2'>
								<AlertCircle className='mt-0.5 size-4 text-amber-500' />
								<div>
									<p className='font-medium text-sm'>Medical Disclaimer</p>
									<p className='text-muted-foreground text-xs'>
										Not a substitute for medical advice
									</p>
								</div>
							</div>
							<div className='flex items-start gap-2'>
								<CheckCircle className='mt-0.5 size-4 text-green-500' />
								<div>
									<p className='font-medium text-sm'>HIPAA Compliant</p>
									<p className='text-muted-foreground text-xs'>
										Your health data is protected
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Full Terms */}
				<Card>
					<CardHeader>
						<CardTitle>1. Acceptance of Terms</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-muted-foreground text-sm'>
							By using Nurtura, you agree to be bound by these terms of service.
							If you do not agree, please do not use our platform.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>2. User Accounts</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div>
							<h4 className='font-semibold'>Account Creation</h4>
							<ul className='mt-2 list-disc pl-6 text-muted-foreground text-sm'>
								<li>
									You must be a licensed healthcare professional to create a
									provider account
								</li>
								<li>
									You are responsible for maintaining the security of your
									account
								</li>
								<li>
									You are responsible for all activities that occur under your
									account
								</li>
								<li>You must provide accurate and complete information</li>
							</ul>
						</div>

						<Separator />

						<div>
							<h4 className='font-semibold'>Account Types</h4>
							<div className='mt-2 grid gap-3 sm:grid-cols-2'>
								<div className='rounded-lg border p-3'>
									<p className='font-medium text-sm'>Provider Account</p>
									<p className='text-muted-foreground text-xs'>
										For healthcare professionals managing patient care
									</p>
								</div>
								<div className='rounded-lg border p-3'>
									<p className='font-medium text-sm'>Patient Account</p>
									<p className='text-muted-foreground text-xs'>
										For patients to access their health information
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>3. Acceptable Use</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-4'>
							<div>
								<h4 className='font-semibold text-green-600'>Do</h4>
								<ul className='mt-2 list-disc pl-6 text-muted-foreground text-sm'>
									<li>
										Use the platform for legitimate pediatric care purposes
									</li>
									<li>Maintain accurate and up-to-date patient records</li>
									<li>Comply with all applicable laws and regulations</li>
									<li>Protect patient confidentiality and privacy</li>
								</ul>
							</div>

							<Separator />

							<div>
								<h4 className='font-semibold text-rose-600'>Don't</h4>
								<ul className='mt-2 list-disc pl-6 text-muted-foreground text-sm'>
									<li>Share your account credentials with others</li>
									<li>Use the platform for any unlawful purpose</li>
									<li>Interfere with the platform's operation</li>
									<li>Access data that you are not authorized to view</li>
								</ul>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>4. Medical Disclaimer</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-3'>
							<div className='rounded-lg border-l-4 border-l-amber-500 bg-amber-50 p-4'>
								<p className='text-amber-800 text-sm'>
									<span className='font-semibold'>Important:</span> Nurtura is a
									clinical management platform and does not provide medical
									advice. Always consult with a qualified healthcare
									professional for medical decisions.
								</p>
							</div>
							<p className='text-muted-foreground text-sm'>
								The information provided through our platform is for
								informational purposes only and should not be used as a
								substitute for professional medical advice, diagnosis, or
								treatment.
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>5. Termination</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-muted-foreground text-sm'>
							We reserve the right to suspend or terminate your account if you
							violate these terms or engage in any activity that compromises the
							security or integrity of our platform.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Contact</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-muted-foreground text-sm'>
							Questions about these terms? Contact us at{" "}
							<a
								className='text-primary hover:underline'
								href='mailto:legal@nurtura.app'
							>
								legal@nurtura.app
							</a>
						</p>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
