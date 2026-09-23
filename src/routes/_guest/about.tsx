// routes/_guest/about.tsx
import { createFileRoute } from "@tanstack/react-router";
import {
	Baby,
	Clock,
	Globe,
	Heart,
	LineChart,
	Mail,
	MapPin,
	Phone,
	Shield,
	Sparkles,
	Users
} from "lucide-react";

import { AppShell } from "#/components/layout/AppShell";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";

export const Route = createFileRoute("/_guest/about")({
	component: AboutPage,
	head: () => ({
		meta: [
			{
				title: "About Smart Clinic — Pediatric Platform"
			},
			{
				name: "description",
				content:
					"Learn about Smart Clinic's mission to transform pediatric healthcare."
			}
		]
	})
});

function AboutPage() {
	const stats = [
		{
			value: "10K+",
			label: "Patients Managed",
			color: "text-primary"
		},
		{
			value: "500+",
			label: "Clinics Using Smart Clinic",
			color: "text-violet-600"
		},
		{
			value: "99.9%",
			label: "Uptime Guaranteed",
			color: "text-emerald-600"
		},
		{
			value: "4.9★",
			label: "User Rating",
			color: "text-amber-600"
		}
	];

	const values = [
		{
			icon: Baby,
			title: "Patient-Centered",
			description: "Every decision we make puts the patient first",
			color: "text-primary"
		},
		{
			icon: Shield,
			title: "Trust & Security",
			description: "Your data is protected with the highest standards",
			color: "text-emerald-600"
		},
		{
			icon: Sparkles,
			title: "Innovation",
			description: "Continuously improving with cutting-edge technology",
			color: "text-violet-600"
		},
		{
			icon: Users,
			title: "Community",
			description: "Building a community of pediatric healthcare providers",
			color: "text-rose-600"
		}
	];

	const features = [
		{
			icon: Clock,
			title: "Intelligent Scheduling",
			description:
				"Smart appointment management with automatic reminders and wait time optimization",
			color: "text-primary"
		},
		{
			icon: LineChart,
			title: "Growth Analytics",
			description: "Visual growth tracking with percentiles and trend analysis",
			color: "text-emerald-600"
		},
		{
			icon: Shield,
			title: "Immunization Management",
			description:
				"Complete vaccination tracking with due date alerts and compliance monitoring",
			color: "text-violet-600"
		},
		{
			icon: Heart,
			title: "Comprehensive Care",
			description:
				"Specialized tools for pediatricians and healthcare providers",
			color: "text-rose-600"
		}
	];

	const team = [
		{
			name: "Dr. Hazem Ali",
			role: "CEO & Founder",
			specialty: "Pediatrician",
			gradient: "from-primary to-teal-500"
		},
		{
			name: "Dr. Sarah Chen",
			role: "CTO & Co-founder",
			specialty: "Neonatologist",
			gradient: "from-emerald-500 to-teal-500"
		},
		{
			name: "Lisa Thompson",
			role: "Head of Product",
			specialty: "IBCLC, RN",
			gradient: "from-rose-500 to-orange-500"
		}
	];

	return (
		<AppShell
			breadcrumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
			subtitle='Transforming pediatric healthcare, one child at a time'
			title='About Smart Clinic'
		>
			<div className='mx-auto max-w-4xl space-y-8'>
				{/* Mission Section */}
				<Card className='border-0 bg-gradient-to-r from-primary to-violet-600 text-white shadow-none'>
					<CardContent className='p-6 text-center sm:p-8'>
						<div className='mx-auto max-w-2xl'>
							<Badge className='bg-white/20 text-white hover:bg-white/30'>
								<Sparkles className='mr-1 size-3' />
								Our Mission
							</Badge>
							<h2 className='mt-4 font-bold text-3xl'>
								Empowering pediatric providers to deliver exceptional care
							</h2>
							<p className='mt-2 text-primary-100'>
								Smart Clinic combines intelligent technology with clinical
								expertise to help pediatricians provide the best possible care
								for every child.
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Stats */}
				<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
					{stats.map(stat => (
						<Card key={stat.label}>
							<CardContent className='p-6 text-center'>
								<p className={`font-bold text-3xl ${stat.color}`}>
									{stat.value}
								</p>
								<p className='text-muted-foreground text-sm'>{stat.label}</p>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Our Story */}
				<Card>
					<CardHeader>
						<CardTitle>Our Story</CardTitle>
						<CardDescription>
							From a pediatric clinic to a transformative platform
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<p className='text-muted-foreground'>
							Smart Clinic was born from the challenges faced by pediatricians
							in managing comprehensive care for children. We started as a small
							clinic's solution to track growth, immunizations, and
							developmental milestones.
						</p>
						<p className='text-muted-foreground'>
							Today, Smart Clinic is trusted by hundreds of pediatric practices
							across the country. Our platform continues to evolve with the
							needs of modern pediatric care, combining clinical expertise with
							cutting-edge technology.
						</p>
						<Separator />
						<div className='flex items-center gap-4'>
							<div className='flex size-10 items-center justify-center rounded-full bg-primary/10'>
								<Heart className='size-5 text-primary' />
							</div>
							<div>
								<p className='font-semibold'>Founded with Purpose</p>
								<p className='text-muted-foreground text-sm'>
									Built by pediatricians, for pediatricians
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Values */}
				<Card>
					<CardHeader>
						<CardTitle>Our Core Values</CardTitle>
						<CardDescription>
							The principles that guide everything we do
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid gap-4 sm:grid-cols-2'>
							{values.map(value => {
								const Icon = value.icon;
								return (
									<div
										className='space-y-2 rounded-lg border p-4 transition-colors hover:bg-muted/50'
										key={value.title}
									>
										<div className='flex items-center gap-2'>
											<Icon className={`size-5 ${value.color}`} />
											<h4 className='font-semibold'>{value.title}</h4>
										</div>
										<p className='text-muted-foreground text-sm'>
											{value.description}
										</p>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>

				{/* Features Overview */}
				<Card>
					<CardHeader>
						<CardTitle>What Makes Smart Clinic Different</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-4'>
							{features.map(feature => {
								const Icon = feature.icon;
								return (
									<div
										className='flex items-start gap-3'
										key={feature.title}
									>
										<div className='rounded-full bg-primary/10 p-1.5'>
											<Icon className={`size-4 ${feature.color}`} />
										</div>
										<div>
											<h4 className='font-semibold'>{feature.title}</h4>
											<p className='text-muted-foreground text-sm'>
												{feature.description}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>

				{/* Team Section */}
				<Card>
					<CardHeader>
						<CardTitle>Meet the Team</CardTitle>
						<CardDescription>
							The passionate people behind Smart Clinic
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid gap-4 sm:grid-cols-3'>
							{team.map(member => (
								<div
									className='text-center'
									key={member.name}
								>
									<div
										className={`mx-auto size-20 rounded-full bg-gradient-to-r ${member.gradient}`}
									/>
									<h4 className='mt-2 font-semibold'>{member.name}</h4>
									<p className='text-muted-foreground text-sm'>{member.role}</p>
									<p className='text-muted-foreground text-xs'>
										{member.specialty}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Contact & Locations */}
				<Card>
					<CardHeader>
						<CardTitle>Get in Touch</CardTitle>
						<CardDescription>We'd love to hear from you</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid gap-4 sm:grid-cols-2'>
							<div className='space-y-2'>
								<div className='flex items-center gap-2'>
									<MapPin className='size-4 text-muted-foreground' />
									<span className='text-sm'>123 Healthcare Way, Suite 100</span>
								</div>
								<div className='flex items-center gap-2'>
									<Mail className='size-4 text-muted-foreground' />
									<span className='text-sm'>hello@smartclinic.app</span>
								</div>
								<div className='flex items-center gap-2'>
									<Phone className='size-4 text-muted-foreground' />
									<span className='text-sm'>1-800-SMART-MD</span>
								</div>
							</div>
							<div className='flex items-center justify-end gap-2'>
								<Button className='gap-2'>
									<Mail className='size-4' />
									Contact Us
								</Button>
								<Button
									className='gap-2'
									variant='outline'
								>
									<Globe className='size-4' />
									Visit Website
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
