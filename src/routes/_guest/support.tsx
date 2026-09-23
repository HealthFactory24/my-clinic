// src/routes/support.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BookOpen,
	CheckCircle2,
	ChevronRight,
	Clock,
	HelpCircle,
	Mail,
	MessageCircle,
	Search,
	Sparkles,
	Video
} from "lucide-react";

import { Button } from "#/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_guest/support")({
	component: SupportPage,
	head: () => ({
		meta: [
			{ title: "Support — Nurtura Pediatric Clinic" },
			{
				name: "description",
				content:
					"Get help and support for using the Nurtura pediatric clinic platform."
			}
		]
	})
});

function SupportPage() {
	return (
		<AppShell
			breadcrumbs={[{ label: "Home", href: "/" }, { label: "Support" }]}
			subtitle='How can we help you today?'
			title='Support Center'
		>
			<div className='mx-auto max-w-4xl space-y-8'>
				{/* Search Bar */}
				<Card>
					<CardContent className='p-4 sm:p-6'>
						<div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
							<div className='relative flex-1'>
								<Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
								<Input
									className='pl-9'
									placeholder='Search support articles...'
									type='search'
								/>
							</div>
							<Button className='gap-2'>
								<Sparkles className='size-4' />
								AI Assistant
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Quick Help Options */}
				<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
					<Card className='transition-all hover:shadow-md'>
						<CardContent className='flex flex-col items-center p-6 text-center'>
							<div className='rounded-full bg-blue-100 p-3'>
								<BookOpen className='size-6 text-blue-600' />
							</div>
							<h3 className='mt-3 font-semibold'>Documentation</h3>
							<p className='text-muted-foreground text-sm'>
								Guides and tutorials
							</p>
							<Button
								className='mt-2 gap-1'
								size='sm'
								variant='ghost'
							>
								Browse <ChevronRight className='size-3' />
							</Button>
						</CardContent>
					</Card>

					<Card className='transition-all hover:shadow-md'>
						<CardContent className='flex flex-col items-center p-6 text-center'>
							<div className='rounded-full bg-emerald-100 p-3'>
								<MessageCircle className='size-6 text-emerald-600' />
							</div>
							<h3 className='mt-3 font-semibold'>Live Chat</h3>
							<p className='text-muted-foreground text-sm'>Chat with support</p>
							<Button
								className='mt-2 gap-1'
								size='sm'
								variant='ghost'
							>
								Start Chat <ChevronRight className='size-3' />
							</Button>
						</CardContent>
					</Card>

					<Card className='transition-all hover:shadow-md'>
						<CardContent className='flex flex-col items-center p-6 text-center'>
							<div className='rounded-full bg-violet-100 p-3'>
								<Mail className='size-6 text-violet-600' />
							</div>
							<h3 className='mt-3 font-semibold'>Email Support</h3>
							<p className='text-muted-foreground text-sm'>
								support@nurtura.app
							</p>
							<Button
								className='mt-2 gap-1'
								size='sm'
								variant='ghost'
							>
								Email Us <ChevronRight className='size-3' />
							</Button>
						</CardContent>
					</Card>

					<Card className='transition-all hover:shadow-md'>
						<CardContent className='flex flex-col items-center p-6 text-center'>
							<div className='rounded-full bg-rose-100 p-3'>
								<Video className='size-6 text-rose-600' />
							</div>
							<h3 className='mt-3 font-semibold'>Schedule Training</h3>
							<p className='text-muted-foreground text-sm'>
								Live onboarding session
							</p>
							<Button
								className='mt-2 gap-1'
								size='sm'
								variant='ghost'
							>
								Book Now <ChevronRight className='size-3' />
							</Button>
						</CardContent>
					</Card>
				</div>

				{/* Support Tabs */}
				<Tabs
					className='space-y-4'
					defaultValue='faq'
				>
					<TabsList className='w-full justify-start'>
						<TabsTrigger value='faq'>FAQ</TabsTrigger>
						<TabsTrigger value='guides'>Guides</TabsTrigger>
						<TabsTrigger value='contact'>Contact</TabsTrigger>
					</TabsList>

					<TabsContent
						className='space-y-4'
						value='faq'
					>
						<Card>
							<CardHeader>
								<CardTitle className='text-lg'>
									Frequently Asked Questions
								</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='rounded-lg border p-4'>
									<button
										className='flex w-full items-center justify-between text-left font-medium hover:text-primary'
										type='button'
									>
										<span>How do I create a new patient record?</span>
										<ChevronRight className='size-4 transition-transform' />
									</button>
									<p className='mt-2 text-muted-foreground text-sm'>
										Click "New Patient" in the dashboard or navigate to Patients
										→ Add Patient. Fill in the required demographic information
										and medical history.
									</p>
								</div>

								<div className='rounded-lg border p-4'>
									<button
										className='flex w-full items-center justify-between text-left font-medium hover:text-primary'
										type='button'
									>
										<span>How do I track vaccination schedules?</span>
										<ChevronRight className='size-4 transition-transform' />
									</button>
									<p className='mt-2 text-muted-foreground text-sm'>
										Navigate to a patient's profile → Vaccinations tab. You can
										view due dates, record administered vaccines, and see
										compliance status.
									</p>
								</div>

								<div className='rounded-lg border p-4'>
									<button
										className='flex w-full items-center justify-between text-left font-medium hover:text-primary'
										type='button'
									>
										<span>How do I update patient information?</span>
										<ChevronRight className='size-4 transition-transform' />
									</button>
									<p className='mt-2 text-muted-foreground text-sm'>
										Go to the patient's profile and click "Edit" on the
										information card. You can update demographics, medical
										history, allergies, and more.
									</p>
								</div>

								<div className='rounded-lg border p-4'>
									<button
										className='flex w-full items-center justify-between text-left font-medium hover:text-primary'
										type='button'
									>
										<span>Is my data secure and HIPAA compliant?</span>
										<ChevronRight className='size-4 transition-transform' />
									</button>
									<p className='mt-2 text-muted-foreground text-sm'>
										Yes! Nurtura uses enterprise-grade encryption and is fully
										HIPAA compliant. All data is encrypted at rest and in
										transit.
									</p>
								</div>
							</CardContent>
						</Card>

						<div className='flex items-center justify-center gap-2 text-muted-foreground text-sm'>
							<HelpCircle className='size-4' />
							<span>Still need help? </span>
							<Link
								className='text-primary hover:underline'
								to='/support'
							>
								Contact us
							</Link>
						</div>
					</TabsContent>

					<TabsContent value='guides'>
						<Card>
							<CardHeader>
								<CardTitle className='text-lg'>
									Getting Started Guides
								</CardTitle>
								<CardDescription>
									Step-by-step tutorials to help you use Nurtura effectively.
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-3'>
								<div className='flex items-center justify-between rounded-lg border p-4'>
									<div className='flex items-center gap-3'>
										<div className='rounded-lg bg-blue-100 p-2'>
											<BookOpen className='size-4 text-blue-600' />
										</div>
										<div>
											<p className='font-medium'>Quick Start Guide</p>
											<p className='text-muted-foreground text-sm'>
												Get started in 10 minutes
											</p>
										</div>
									</div>
									<Badge variant='outline'>Beginner</Badge>
								</div>

								<div className='flex items-center justify-between rounded-lg border p-4'>
									<div className='flex items-center gap-3'>
										<div className='rounded-lg bg-emerald-100 p-2'>
											<Icons.users className='size-4 text-emerald-600' />
										</div>
										<div>
											<p className='font-medium'>Patient Management</p>
											<p className='text-muted-foreground text-sm'>
												Managing patient records
											</p>
										</div>
									</div>
									<Badge variant='outline'>Essential</Badge>
								</div>

								<div className='flex items-center justify-between rounded-lg border p-4'>
									<div className='flex items-center gap-3'>
										<div className='rounded-lg bg-violet-100 p-2'>
											<Clock className='size-4 text-violet-600' />
										</div>
										<div>
											<p className='font-medium'>Scheduling & Appointments</p>
											<p className='text-muted-foreground text-sm'>
												Optimize your clinic schedule
											</p>
										</div>
									</div>
									<Badge variant='outline'>Advanced</Badge>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value='contact'>
						<Card>
							<CardHeader>
								<CardTitle className='text-lg'>Contact Support</CardTitle>
								<CardDescription>
									We're here to help. Choose your preferred contact method.
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-6'>
								<div className='grid gap-4 sm:grid-cols-2'>
									<div className='rounded-lg border p-4 text-center'>
										<Mail className='mx-auto size-8 text-muted-foreground' />
										<h4 className='mt-2 font-medium'>Email</h4>
										<p className='text-muted-foreground text-sm'>
											support@nurtura.app
										</p>
										<p className='text-muted-foreground text-xs'>
											Response within 24 hours
										</p>
										<Button
											className='mt-3 w-full'
											size='sm'
										>
											Send Email
										</Button>
									</div>

									<div className='rounded-lg border p-4 text-center'>
										<MessageCircle className='mx-auto size-8 text-muted-foreground' />
										<h4 className='mt-2 font-medium'>Live Chat</h4>
										<p className='text-muted-foreground text-sm'>
											Chat with a support agent
										</p>
										<p className='text-muted-foreground text-xs'>
											Available 9 AM - 6 PM EST
										</p>
										<Button
											className='mt-3 w-full'
											size='sm'
										>
											Start Chat
										</Button>
									</div>
								</div>

								<div className='rounded-lg border p-4'>
									<div className='flex items-start gap-3'>
										<div className='mt-0.5'>
											<Clock className='size-4 text-muted-foreground' />
										</div>
										<div>
											<p className='font-medium'>Support Hours</p>
											<p className='text-muted-foreground text-sm'>
												Monday - Friday: 9 AM - 6 PM EST
												<br />
												Saturday: 10 AM - 4 PM EST
												<br />
												Sunday: Closed
											</p>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				{/* Status Badge */}
				<div className='flex items-center justify-center gap-2 text-muted-foreground text-sm'>
					<CheckCircle2 className='size-4 text-green-500' />
					<span>All systems operational</span>
				</div>
			</div>
		</AppShell>
	);
}
