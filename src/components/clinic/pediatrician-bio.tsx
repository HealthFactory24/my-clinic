// components/clinic/pediatrician-bio.tsx

import {
	Award,
	BookOpen,
	Briefcase,
	GraduationCap,
	Mail,
	MapPin,
	Phone,
	Stethoscope,
	Users
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface EducationEntry {
	/** Degree or credential, e.g. "MD". */
	degree: string;
	/** Institution name. */
	institution: string;
	/** Year of completion. */
	year?: string;
}

interface PediatricianBioProps {
	/** Full name including title, e.g. "Dr. Sarah Johnson". */
	name?: string;
	/** Primary specialty. */
	specialty?: string;
	/** Sub-specialties or areas of focus. */
	subSpecialties?: string[];
	/** Short professional bio / about text. */
	bio?: string;
	/** Years of experience. */
	yearsExperience?: number;
	/** Education and training entries. */
	education?: EducationEntry[];
	/** Board certifications. */
	boardCertifications?: string[];
	/** Professional memberships. */
	memberships?: string[];
	/** Languages spoken. */
	languages?: string[];
	/** Contact email. */
	email?: string;
	/** Contact phone. */
	phone?: string;
	/** Office location. */
	location?: string;
	/** Avatar image URL. */
	avatarUrl?: string;
	/** Whether the doctor is currently accepting new patients. */
	acceptingPatients?: boolean;
	/** Action: book an appointment. */
	onBook?: () => void;
	/** Action: send a message. */
	onMessage?: () => void;
	/** Visual variant. */
	variant?: "default" | "compact" | "detailed";
	/** Card heading. Set to `null` to omit. */
	title?: string | null;
	className?: string;
	children?: React.ReactNode;
}

const DEFAULT_EDUCATION: EducationEntry[] = [
	{ degree: "MD", institution: "Harvard Medical School", year: "2005" },
	{
		degree: "Residency — Pediatrics",
		institution: "Boston Children's Hospital",
		year: "2008"
	},
	{
		degree: "Fellowship — Pediatric Cardiology",
		institution: "Johns Hopkins Hospital",
		year: "2011"
	}
];

const DEFAULT_CERTIFICATIONS = [
	"American Board of Pediatrics",
	"Pediatric Cardiology Subspecialty"
];

const DEFAULT_MEMBERSHIPS = [
	"American Academy of Pediatrics",
	"American Heart Association"
];

const DEFAULT_SUB_SPECIALTIES = [
	"Congenital Heart Disease",
	"Pediatric Preventive Care",
	"Developmental Screening"
];

function getInitials(name: string): string {
	return name
		.replace(/^Dr\.?\s+/i, "")
		.split(" ")
		.map(part => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function InfoRow({
	icon: Icon,
	label,
	value
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
}) {
	return (
		<div className='flex items-center gap-2 text-sm'>
			<Icon className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
			<span className='text-muted-foreground'>{label}:</span>
			<span className='font-medium'>{value}</span>
		</div>
	);
}

export function PediatricianBio({
	name = "Dr. Sarah Johnson",
	specialty = "General Pediatrics",
	subSpecialties = DEFAULT_SUB_SPECIALTIES,
	bio = "Dr. Johnson is a board-certified pediatrician with over 15 years of experience caring for infants, children, and adolescents. She is passionate about preventive care and building long-term relationships with families to support healthy development from birth through young adulthood.",
	yearsExperience = 15,
	education = DEFAULT_EDUCATION,
	boardCertifications = DEFAULT_CERTIFICATIONS,
	memberships = DEFAULT_MEMBERSHIPS,
	languages = ["English", "Spanish"],
	email = "s.johnson@clinic.example",
	phone = "(555) 123-4567",
	location = "Main Clinic — Suite 200",
	avatarUrl,
	acceptingPatients = true,
	onBook,
	onMessage,
	variant = "default",
	title = null,
	className,
	children
}: PediatricianBioProps) {
	const isCompact = variant === "compact";
	const isDetailed = variant === "detailed";

	// ─── Header block (avatar + name + specialty) ──────────────────────────────
	const header = (
		<div className='flex items-start gap-4'>
			<div
				className={cn(
					"flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-lg text-primary",
					isCompact && "size-12 text-base"
				)}
			>
				{avatarUrl ? (
					<img
						alt={name}
						className='size-full rounded-full object-cover'
						src={avatarUrl}
					/>
				) : (
					getInitials(name)
				)}
			</div>
			<div className='flex-1 space-y-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<h3 className={cn("font-semibold text-lg", isCompact && "text-base")}>
						{name}
					</h3>
					{acceptingPatients && (
						<Badge
							className='bg-emerald-100 text-emerald-800 text-xs'
							variant='outline'
						>
							Accepting Patients
						</Badge>
					)}
				</div>
				<p className='text-muted-foreground text-sm'>{specialty}</p>
				<div className='flex items-center gap-1 text-muted-foreground text-xs'>
					<Award className='h-3 w-3' />
					<span>{yearsExperience} years experience</span>
				</div>
			</div>
		</div>
	);

	// ─── Sub-specialties badges ────────────────────────────────────────────────
	const subSpecialtyBadges =
		subSpecialties.length > 0 ? (
			<div className='flex flex-wrap gap-1.5'>
				{subSpecialties.map(spec => (
					<Badge
						className='text-xs'
						key={spec}
						variant='secondary'
					>
						{spec}
					</Badge>
				))}
			</div>
		) : null;

	// ─── Bio text ──────────────────────────────────────────────────────────────
	const bioBlock = bio ? (
		<p className={cn("text-sm leading-relaxed", isCompact && "text-xs")}>
			{bio}
		</p>
	) : null;

	// ─── Contact block ─────────────────────────────────────────────────────────
	const contactBlock = (
		<div className={cn("space-y-2", isCompact && "space-y-1.5")}>
			{email && (
				<InfoRow
					icon={Mail}
					label='Email'
					value={email}
				/>
			)}
			{phone && (
				<InfoRow
					icon={Phone}
					label='Phone'
					value={phone}
				/>
			)}
			{location && (
				<InfoRow
					icon={MapPin}
					label='Office'
					value={location}
				/>
			)}
		</div>
	);

	// ─── Credentials block (detailed only) ─────────────────────────────────────
	const credentialsBlock = isDetailed ? (
		<>
			<Separator />
			<div className='space-y-4'>
				{education.length > 0 && (
					<div>
						<h4 className='mb-2 flex items-center gap-1.5 font-medium text-sm'>
							<GraduationCap className='h-4 w-4 text-muted-foreground' />
							Education & Training
						</h4>
						<ul className='space-y-2'>
							{education.map(entry => (
								<li
									className='flex items-start gap-2 text-sm'
									key={`${entry.degree}-${entry.institution}`}
								>
									<span className='mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60' />
									<div>
										<p className='font-medium'>{entry.degree}</p>
										<p className='text-muted-foreground text-xs'>
											{entry.institution}
											{entry.year ? ` · ${entry.year}` : ""}
										</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				)}

				{boardCertifications.length > 0 && (
					<div>
						<h4 className='mb-2 flex items-center gap-1.5 font-medium text-sm'>
							<Award className='h-4 w-4 text-muted-foreground' />
							Board Certifications
						</h4>
						<div className='flex flex-wrap gap-1.5'>
							{boardCertifications.map(cert => (
								<Badge
									className='text-xs'
									key={cert}
									variant='outline'
								>
									{cert}
								</Badge>
							))}
						</div>
					</div>
				)}

				{memberships.length > 0 && (
					<div>
						<h4 className='mb-2 flex items-center gap-1.5 font-medium text-sm'>
							<Briefcase className='h-4 w-4 text-muted-foreground' />
							Professional Memberships
						</h4>
						<ul className='space-y-1'>
							{memberships.map(membership => (
								<li
									className='flex items-center gap-2 text-muted-foreground text-sm'
									key={membership}
								>
									<span className='size-1.5 rounded-full bg-primary/60' />
									{membership}
								</li>
							))}
						</ul>
					</div>
				)}

				{languages.length > 0 && (
					<div>
						<h4 className='mb-2 flex items-center gap-1.5 font-medium text-sm'>
							<BookOpen className='h-4 w-4 text-muted-foreground' />
							Languages
						</h4>
						<div className='flex flex-wrap gap-1.5'>
							{languages.map(lang => (
								<Badge
									className='text-xs'
									key={lang}
									variant='secondary'
								>
									{lang}
								</Badge>
							))}
						</div>
					</div>
				)}
			</div>
		</>
	) : null;

	// ─── Action buttons ────────────────────────────────────────────────────────
	const actions =
		onBook || onMessage ? (
			<div className='flex flex-wrap gap-2'>
				{onBook && (
					<Button
						className='gap-1.5'
						onClick={onBook}
						size={isCompact ? "sm" : "default"}
					>
						<Stethoscope
							className={cn("h-4 w-4", isCompact && "h-3.5 w-3.5")}
						/>
						Book Appointment
					</Button>
				)}
				{onMessage && (
					<Button
						className='gap-1.5'
						onClick={onMessage}
						size={isCompact ? "sm" : "default"}
						variant='outline'
					>
						<Mail className={cn("h-4 w-4", isCompact && "h-3.5 w-3.5")} />
						Send Message
					</Button>
				)}
			</div>
		) : null;

	// ─── Compact variant ───────────────────────────────────────────────────────
	if (isCompact) {
		return (
			<div className={cn("space-y-3 rounded-lg border p-4", className)}>
				{header}
				{bioBlock}
				{contactBlock}
				{actions}
				{children}
			</div>
		);
	}

	// ─── Default / Detailed card variant ───────────────────────────────────────
	const content = (
		<div className='space-y-4'>
			{header}
			{subSpecialtyBadges}
			{bioBlock}
			<Separator />
			{contactBlock}
			{credentialsBlock}
			{actions && (
				<>
					<Separator />
					{actions}
				</>
			)}
			{children}
		</div>
	);

	if (title === null) {
		return <div className={className}>{content}</div>;
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<Users className='h-4 w-4 text-muted-foreground' />
					{title}
				</CardTitle>
				<CardDescription>Professional profile and credentials</CardDescription>
			</CardHeader>
			<CardContent>{content}</CardContent>
		</Card>
	);
}
