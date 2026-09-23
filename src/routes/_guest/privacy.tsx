// src/routes/privacy.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Database, Eye, Lock, Mail, MapPin, Phone, Shield } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_guest/privacy")({
	component: PrivacyPage,
	head: () => ({
		meta: [
			{ title: "Privacy Policy — Nurtura Pediatric Clinic" },
			{
				name: "description",
				content:
					"Learn how Nurtura protects your data and respects your privacy."
			}
		]
	})
});

function PrivacyPage() {
	return (
		<AppShell
			breadcrumbs={[{ label: "Home", href: "/" }, { label: "Privacy" }]}
			subtitle='Last updated: December 2024'
			title='Privacy Policy'
		>
			<div className='mx-auto max-w-4xl space-y-8'>
				{/* Hero Section */}
				<Card className='border-0 bg-gradient-to-r from-blue-50 to-violet-50 shadow-none'>
					<CardContent className='p-6'>
						<div className='flex items-center gap-4'>
							<div className='rounded-full bg-blue-100 p-3'>
								<Shield className='size-8 text-blue-600' />
							</div>
							<div>
								<h2 className='font-bold text-2xl'>Your Privacy Matters</h2>
								<p className='text-muted-foreground'>
									We are committed to protecting the privacy and security of
									your personal information.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Key Privacy Principles */}
				<div className='grid gap-4 sm:grid-cols-2'>
					<Card>
						<CardHeader>
							<div className='flex items-center gap-2'>
								<Lock className='size-5 text-blue-600' />
								<CardTitle className='text-lg'>Data Security</CardTitle>
							</div>
							<CardDescription>
								We use industry-standard encryption and security measures to
								protect your data.
							</CardDescription>
						</CardHeader>
					</Card>

					<Card>
						<CardHeader>
							<div className='flex items-center gap-2'>
								<Eye className='size-5 text-violet-600' />
								<CardTitle className='text-lg'>Transparency</CardTitle>
							</div>
							<CardDescription>
								We are transparent about how we collect, use, and protect your
								information.
							</CardDescription>
						</CardHeader>
					</Card>

					<Card>
						<CardHeader>
							<div className='flex items-center gap-2'>
								<Database className='size-5 text-emerald-600' />
								<CardTitle className='text-lg'>Data Control</CardTitle>
							</div>
							<CardDescription>
								You have control over your data and can access, modify, or
								delete it at any time.
							</CardDescription>
						</CardHeader>
					</Card>

					<Card>
						<CardHeader>
							<div className='flex items-center gap-2'>
								<Shield className='size-5 text-rose-600' />
								<CardTitle className='text-lg'>HIPAA Compliant</CardTitle>
							</div>
							<CardDescription>
								We comply with HIPAA regulations and ensure your protected
								health information is secure.
							</CardDescription>
						</CardHeader>
					</Card>
				</div>

				{/* Detailed Privacy Policy */}
				<Card>
					<CardHeader>
						<CardTitle>Information We Collect</CardTitle>
						<CardDescription>
							We collect information to provide better care and improve our
							services.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div>
							<h4 className='font-semibold'>Personal Information</h4>
							<ul className='mt-2 list-disc pl-6 text-muted-foreground text-sm'>
								<li>Name, date of birth, and contact information</li>
								<li>Medical history, allergies, and current medications</li>
								<li>Vaccination records and immunization history</li>
								<li>Growth measurements and developmental milestones</li>
								<li>Visit notes and treatment plans</li>
							</ul>
						</div>

						<Separator />

						<div>
							<h4 className='font-semibold'>Usage Information</h4>
							<ul className='mt-2 list-disc pl-6 text-muted-foreground text-sm'>
								<li>Appointment scheduling and attendance history</li>
								<li>Communication preferences and feedback</li>
								<li>How you interact with our platform</li>
							</ul>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>How We Use Your Information</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div>
							<h4 className='font-semibold'>Providing Care</h4>
							<p className='text-muted-foreground text-sm'>
								We use your information to provide high-quality pediatric care,
								including:
							</p>
							<ul className='mt-2 list-disc pl-6 text-muted-foreground text-sm'>
								<li>Tracking growth and developmental milestones</li>
								<li>Managing vaccination schedules</li>
								<li>Coordinating care with other providers</li>
								<li>Scheduling appointments and sending reminders</li>
							</ul>
						</div>

						<Separator />

						<div>
							<h4 className='font-semibold'>Improving Services</h4>
							<p className='text-muted-foreground text-sm'>
								We use aggregated and anonymized data to improve our platform
								and services.
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Your Rights</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid gap-4 sm:grid-cols-2'>
							<div className='rounded-lg border p-4'>
								<h4 className='font-semibold'>Right to Access</h4>
								<p className='text-muted-foreground text-sm'>
									You can access and review your personal information at any
									time.
								</p>
							</div>
							<div className='rounded-lg border p-4'>
								<h4 className='font-semibold'>Right to Correct</h4>
								<p className='text-muted-foreground text-sm'>
									You can request corrections to your personal information.
								</p>
							</div>
							<div className='rounded-lg border p-4'>
								<h4 className='font-semibold'>Right to Delete</h4>
								<p className='text-muted-foreground text-sm'>
									You can request deletion of your personal information.
								</p>
							</div>
							<div className='rounded-lg border p-4'>
								<h4 className='font-semibold'>Right to Portability</h4>
								<p className='text-muted-foreground text-sm'>
									You can request a copy of your data in a portable format.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Contact Us</CardTitle>
						<CardDescription>
							If you have questions about our privacy practices, please contact
							us.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='flex flex-wrap gap-6'>
							<div className='flex items-center gap-2'>
								<Mail className='size-4 text-muted-foreground' />
								<span className='text-sm'>privacy@nurtura.app</span>
							</div>
							<div className='flex items-center gap-2'>
								<Phone className='size-4 text-muted-foreground' />
								<span className='text-sm'>1-800-NURTURA</span>
							</div>
							<div className='flex items-center gap-2'>
								<MapPin className='size-4 text-muted-foreground' />
								<span className='text-sm'>123 Healthcare Way, Suite 100</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
