// lib/ui-builder/registry/clinic-schemas.ts
import { z } from "zod/v4";

import { genderEnum } from "./db/schema";

// ============================================
// SHARED SUB-SCHEMAS
// ============================================

export const allergySeveritySchema = z.enum([
	"mild",
	"moderate",
	"severe",
	"anaphylactic"
]);

export const allergyItemSchema = z.object({
	allergen: z.string().min(1, "Allergen is required"),
	reaction: z.string().optional(),
	severity: allergySeveritySchema.default("mild")
});

export const appointmentTypeSchema = z.enum([
	"checkup",
	"vaccination",
	"sick-visit",
	"consultation",
	"follow-up",
	"emergency"
]);

export const reminderStatusSchema = z.enum([
	"upcoming",
	"today",
	"tomorrow",
	"overdue",
	"cancelled"
]);

export const educationEntrySchema = z.object({
	degree: z.string().min(1),
	institution: z.string().min(1),
	year: z.string().optional()
});

export const doctorSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	specialty: z.string().min(1),
	bio: z.string().optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	experience: z.coerce.number().int().min(0).optional(),
	avatarUrl: z.string().optional(),
	acceptingPatients: z.boolean().default(true)
});

export const serviceIconSchema = z.enum([
	"stethoscope",
	"syringe",
	"heart",
	"baby",
	"microscope",
	"calendar",
	"users",
	"phone"
]);

export const serviceAvailabilitySchema = z.enum([
	"available",
	"limited",
	"unavailable"
]);

export const statIconSchema = z.enum([
	"users",
	"calendar",
	"activity",
	"heart",
	"syringe",
	"clipboard",
	"stethoscope",
	"userPlus"
]);

export const trendSchema = z.enum(["up", "down", "neutral"]);

export const statItemSchema = z.object({
	id: z.string(),
	label: z.string().min(1),
	value: z.union([z.string(), z.coerce.number()]),
	unit: z.string().optional(),
	description: z.string().optional(),
	change: z.string().optional(),
	trend: trendSchema.optional(),
	icon: statIconSchema.optional()
});

export const feedingTypeSchema = z.enum([
	"breastfeeding",
	"formula",
	"solids",
	"mixed"
]);

export const feedingRecommendationSchema = z.object({
	ageRange: z.string().min(1),
	type: feedingTypeSchema,
	frequency: z.string().min(1),
	amount: z.string().optional(),
	notes: z.string().optional()
});

export const insurancePlanSchema = z.object({
	provider: z.string().min(1),
	planName: z.string().optional(),
	memberId: z.string().optional(),
	groupNumber: z.string().optional(),
	effectiveDate: z.string().optional(),
	isPrimary: z.boolean().default(false),
	status: z
		.enum(["verified", "pending", "expired", "unverified"])
		.default("unverified")
});

export const appointmentSlotItemSchema = z.object({
	time: z.string().regex(/^\d{2}:\d{2}$/u, "Use HH:MM format"),
	available: z.boolean().default(true)
});

export const doctorOptionSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	specialty: z.string().min(1)
});

// ============================================
// PER-COMPONENT SCHEMAS
// ============================================

export const patientIntakeSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	dateOfBirth: z.string().min(1, "Date of birth is required"),
	gender: z.enum(genderEnum.enumValues),
	parentPhone: z.string().min(1, "Contact phone is required")
});
export type PatientIntakeFormValues = z.infer<typeof patientIntakeSchema>; // ─── PatientCard ──────────────────────────────────────────────────────────
export const patientCardSchema = z.object({
	patientName: z.string().default("New Patient"),
	age: z.coerce.number().int().min(0).max(18).default(5),
	dateOfBirth: z.string().optional(),
	gender: z.enum(["male", "female", "other"]).default("male"),
	lastVisit: z.string().optional(),
	nextVisit: z.string().optional(),
	primaryDoctor: z.string().default("Dr. Smith"),
	bloodType: z.string().optional(),
	allergies: z.string().optional(),
	notes: z.string().optional(),
	variant: z.enum(["default", "compact", "detailed"]).default("default"),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── AllergyAlert ─────────────────────────────────────────────────────────
export const allergyAlertSchema = z.object({
	allergies: z
		.array(allergyItemSchema)
		.default([
			{ allergen: "Penicillin", reaction: "Hives", severity: "moderate" }
		]),
	patientName: z.string().optional(),
	showEmptyState: z.boolean().default(true),
	variant: z.enum(["default", "compact", "banner"]).default("default"),
	title: z.string().nullable().optional(),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── PrescriptionCard ─────────────────────────────────────────────────────
export const prescriptionItemSchema = z.object({
	id: z.string(),
	medicationName: z.string().min(1),
	genericName: z.string().optional(),
	form: z.string().optional(),
	concentration: z.string().optional(),
	route: z.string().optional(),
	frequency: z.string().optional(),
	durationDays: z.coerce.number().int().min(0).default(0),
	dispenseQuantity: z.string().optional(),
	instructions: z.string().optional(),
	warnings: z.string().optional()
});

export const prescriptionCardSchema = z.object({
	rxNumber: z.string().default("RX-2026-0001"),
	patientName: z.string().default("John Doe"),
	prescriberName: z.string().default("Dr. Smith"),
	prescribedDate: z.string().default("2026-09-22"),
	diagnosis: z.string().optional(),
	items: z.array(prescriptionItemSchema).default([]),
	status: z
		.enum(["Active", "Completed", "Discontinued", "Cancelled"])
		.default("Active"),
	variant: z.enum(["default", "compact", "detailed"]).default("default"),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── AppointmentSlot ──────────────────────────────────────────────────────
export const appointmentSlotSchema = z.object({
	date: z.string().default("2026-09-22"),
	time: z.string().default("10:00"),
	endTime: z.string().default("10:30"),
	pediatrician: z.string().default("Dr. Smith"), // widened — was an enum
	type: appointmentTypeSchema.default("checkup"),
	available: z.boolean().default(true),
	location: z.string().default("Main Clinic - Room 101"),
	notes: z.string().optional(),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── AppointmentBookingForm ───────────────────────────────────────────────
export const appointmentBookingFormSchema = z.object({
	availableDates: z
		.array(z.string())
		.default([
			"2026-09-22",
			"2026-09-23",
			"2026-09-24",
			"2026-09-25",
			"2026-09-26"
		]),
	availableSlots: z.array(appointmentSlotItemSchema).default([]),
	doctors: z.array(doctorOptionSchema).default([]),
	patientName: z.string().default("John Doe"),
	title: z.string().default("Book an Appointment"),
	description: z.string().optional(),
	isSubmitting: z.boolean().default(false),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── AppointmentReminder ──────────────────────────────────────────────────
export const appointmentReminderSchema = z.object({
	patientName: z.string().default("John Doe"),
	pediatrician: z.string().default("Dr. Smith"),
	date: z.string().default("2026-09-22"),
	time: z.string().default("10:00 AM"),
	endTime: z.string().default("10:30 AM"),
	visitType: z.string().default("Well-Child Check"),
	location: z.string().default("Main Clinic — Room 101"),
	status: reminderStatusSchema.default("today"),
	notes: z.string().optional(),
	contactPhone: z.string().default("(555) 123-4567"),
	variant: z.enum(["default", "compact", "banner"]).default("default"),
	title: z.string().nullable().optional(),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── VaccinationSchedule ──────────────────────────────────────────────────
export const vaccinationScheduleSchema = z.object({
	patientAgeMonths: z.coerce.number().min(0).max(216).default(6),
	showCompleted: z.boolean().default(true),
	showUpcoming: z.boolean().default(true),
	showOverdue: z.boolean().default(true),
	vaccineFilter: z
		.enum(["all", "routine", "travel", "optional"])
		.default("all"),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── GrowthChartCard ──────────────────────────────────────────────────────
// Note: the actual component takes no props — everything is hard-coded
// internal data. Expose only `className`/`children` so the editor still
// gives operators a way to place it.
export const growthChartCardSchema = z.object({
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── AgeMilestoneTracker ──────────────────────────────────────────────────
export const ageMilestoneSchema = z.object({
	ageMonths: z.coerce.number().int().min(0),
	label: z.string().min(1),
	description: z.string().optional()
});

export const ageMilestoneTrackerSchema = z.object({
	ageMonths: z.coerce.number().int().min(0).default(6),
	milestones: z.array(ageMilestoneSchema).optional(),
	showUpcoming: z.boolean().default(true),
	showProgress: z.boolean().default(true),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── FeedingGuideCard ─────────────────────────────────────────────────────
export const feedingGuideCardSchema = z.object({
	ageMonths: z.coerce.number().int().min(0).default(6),
	recommendations: z.array(feedingRecommendationSchema).default([]),
	highlightCurrentAge: z.boolean().default(true),
	title: z.string().nullable().optional(),
	description: z.string().optional(),
	variant: z.enum(["default", "compact", "timeline"]).default("default"),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── PatientIntakeForm ────────────────────────────────────────────────────
export const patientIntakeFormSchema = z.object({
	redirectTo: z.string().default("/app/patients"),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── PediatricianBio ──────────────────────────────────────────────────────
export const pediatricianBioSchema = z.object({
	name: z.string().default("Dr. Sarah Johnson"),
	specialty: z.string().default("General Pediatrics"),
	subSpecialties: z.array(z.string()).default([]),
	bio: z.string().optional(),
	yearsExperience: z.coerce.number().int().min(0).default(15),
	education: z.array(educationEntrySchema).default([]),
	boardCertifications: z.array(z.string()).default([]),
	memberships: z.array(z.string()).default([]),
	languages: z.array(z.string()).default(["English"]),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	location: z.string().optional(),
	avatarUrl: z.string().optional(),
	acceptingPatients: z.boolean().default(true),
	variant: z.enum(["default", "compact", "detailed"]).default("default"),
	title: z.string().nullable().optional(),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── DoctorTeamGrid ───────────────────────────────────────────────────────
export const doctorTeamGridSchema = z.object({
	doctors: z.array(doctorSchema).default([]),
	title: z.string().nullable().optional(),
	description: z.string().optional(),
	columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(4),
	variant: z.enum(["default", "compact", "detailed"]).default("default"),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── ServiceCard ──────────────────────────────────────────────────────────
export const serviceCardSchema = z.object({
	title: z.string().default("Well-Child Visit"),
	description: z.string().optional(),
	icon: serviceIconSchema.default("stethoscope"),
	features: z.array(z.string()).default([]),
	availability: serviceAvailabilitySchema.default("available"),
	phone: z.string().optional(),
	duration: z.string().optional(),
	price: z.string().optional(),
	actionLabel: z.string().default("Book Now"),
	variant: z.enum(["default", "compact", "featured"]).default("default"),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── OpeningHoursCard ─────────────────────────────────────────────────────
export const openingHoursEntrySchema = z.object({
	day: z.string().min(1),
	open: z.string().nullable().optional(),
	close: z.string().nullable().optional()
});

export const openingHoursCardSchema = z.object({
	hours: z.array(openingHoursEntrySchema).optional(),
	today: z.string().optional(),
	afterHoursPhone: z.string().optional(),
	title: z.string().nullable().optional(),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── InsuranceInfoCard ────────────────────────────────────────────────────
export const insuranceInfoCardSchema = z.object({
	plans: z.array(insurancePlanSchema).default([]),
	patientName: z.string().optional(),
	title: z.string().nullable().optional(),
	variant: z.enum(["default", "compact"]).default("default"),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── EmergencyBanner ──────────────────────────────────────────────────────
export const emergencyBannerSchema = z.object({
	message: z.string().default("For medical emergencies, call 911 immediately."),
	phoneNumber: z.string().default("(555) 911-0000"),
	showIcon: z.boolean().default(true),
	variant: z.enum(["info", "warning", "critical"]).default("critical"),
	dismissible: z.boolean().default(false),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── FaqAccordion ─────────────────────────────────────────────────────────
export const faqItemSchema = z.object({
	question: z.string().min(1),
	answer: z.string().min(1)
});

export const faqAccordionSchema = z.object({
	items: z.array(faqItemSchema).optional(),
	title: z.string().nullable().optional(),
	allowMultiple: z.boolean().default(false),
	defaultValue: z.union([z.string(), z.array(z.string())]).optional(),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── TestimonialCard ──────────────────────────────────────────────────────
export const testimonialCardSchema = z.object({
	name: z.string().default("Jennifer Martinez"),
	relationship: z.string().optional(),
	quote: z.string().default("Excellent care for our child!"),
	rating: z.coerce.number().int().min(1).max(5).default(5),
	avatarUrl: z.string().optional(),
	variant: z.enum(["default", "compact", "featured"]).default("default"),
	className: z.string().optional(),
	children: z.any().optional()
});

// ─── ClinicStatsGrid ──────────────────────────────────────────────────────
export const clinicStatsGridSchema = z.object({
	stats: z.array(statItemSchema).default([]),
	columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(4),
	title: z.string().nullable().optional(),
	description: z.string().optional(),
	variant: z.enum(["default", "compact", "detailed"]).default("default"),
	className: z.string().optional(),
	children: z.any().optional()
});
