// lib/ui-builder/registry/clinic-registry.ts
import { z } from "zod";

import { AgeMilestoneTracker } from "@/components/clinic/age-milestone-tracker";
import { AllergyAlert } from "@/components/clinic/allergy-alert";
import { AppointmentBookingForm } from "@/components/clinic/appointment-booking-form";
import { AppointmentReminder } from "@/components/clinic/appointment-reminder";
import { AppointmentSlot } from "@/components/clinic/appointment-slot";
import { ClinicStatsGrid } from "@/components/clinic/clinic-stats-grid";
import { DoctorTeamGrid } from "@/components/clinic/doctor-team-grid";
import { EmergencyBanner } from "@/components/clinic/emergency-banner";
import { FaqAccordion } from "@/components/clinic/faq-accordion";
import { FeedingGuideCard } from "@/components/clinic/feeding-guide-card";
import { GrowthChartCard } from "@/components/clinic/growth-chart-card";
import { InsuranceInfoCard } from "@/components/clinic/insurance-info-card";
import { OpeningHoursCard } from "@/components/clinic/opening-hours-card";
// ============================================
// CLINIC COMPONENT IMPORTS
// ============================================
import { PatientCard } from "@/components/clinic/patient-card";
import { PatientIntakeForm } from "@/components/clinic/patient-intake-form";
import { PediatricianBio } from "@/components/clinic/pediatrician-bio";
import { PrescriptionCard } from "@/components/clinic/prescription-card";
import { ServiceCard } from "@/components/clinic/service-card";
import { TestimonialCard } from "@/components/clinic/testimonial-card";
import { VaccinationSchedule } from "@/components/clinic/vaccination-schedule";
import type { ComponentRegistry } from "@/components/ui/ui-builder/types";
import { commonFieldOverrides } from "@/lib/ui-builder/registry/field-override";
import { primitiveComponentDefinitions } from "@/lib/ui-builder/registry/primitive-component-definitions";

import {
	ageMilestoneTrackerFieldOverrides,
	allergyAlertFieldOverrides,
	appointmentBookingFormFieldOverrides,
	appointmentReminderFieldOverrides,
	appointmentSlotFieldOverrides,
	clinicStatsGridFieldOverrides,
	doctorTeamGridFieldOverrides,
	emergencyBannerFieldOverrides,
	faqAccordionFieldOverrides,
	feedingGuideCardFieldOverrides,
	growthChartCardFieldOverrides,
	insuranceInfoCardFieldOverrides,
	openingHoursCardFieldOverrides,
	patientCardFieldOverrides,
	patientIntakeFormFieldOverrides,
	pediatricianBioFieldOverrides,
	prescriptionCardFieldOverrides,
	serviceCardFieldOverrides,
	testimonialCardFieldOverrides,
	vaccinationScheduleFieldOverrides
} from "./form-field-overrides";

export const clinicRegistry: ComponentRegistry = {
	// ============================================
	// PRIMITIVE COMPONENTS (HTML elements)
	// ============================================
	...primitiveComponentDefinitions,

	// Appointments
	AppointmentSlot: {
		component: AppointmentSlot,
		schema: z.object({
			date: z.string().default("2026-09-22"),
			time: z.string().default("10:00"),
			endTime: z.string().default("10:30"),
			pediatrician: z
				.enum([
					"Dr. Smith",
					"Dr. Johnson",
					"Dr. Lee",
					"Dr. Garcia",
					"Dr. Patel"
				])
				.default("Dr. Smith"),
			type: z
				.enum([
					"checkup",
					"vaccination",
					"sick-visit",
					"consultation",
					"follow-up",
					"emergency"
				])
				.default("checkup"),
			available: z.boolean().default(true),
			location: z.string().default("Main Clinic - Room 101"),
			notes: z.string().optional(),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/appointment-slot",
		fieldOverrides: appointmentSlotFieldOverrides()
	},

	AppointmentBookingForm: {
		component: AppointmentBookingForm,
		schema: z.object({
			title: z.string().default("Book an Appointment"),
			subtitle: z.string().optional(),
			showDatePicker: z.boolean().default(true),
			showTimeSlots: z.boolean().default(true),
			showDoctorSelect: z.boolean().default(true),
			showReasonField: z.boolean().default(true),
			availableDoctors: z
				.array(z.string())
				.default(["Dr. Smith", "Dr. Johnson", "Dr. Lee"]),
			submitLabel: z.string().default("Request Appointment"),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/appointment-booking-form",
		fieldOverrides: appointmentBookingFormFieldOverrides()
	},

	AppointmentReminder: {
		component: AppointmentReminder,
		schema: z.object({
			patientName: z.string().default("Patient"),
			appointmentDate: z.string().default("2026-09-25"),
			appointmentTime: z.string().default("10:00"),
			doctorName: z.string().default("Dr. Smith"),
			appointmentType: z.string().default("Annual Checkup"),
			location: z.string().default("Main Clinic"),
			showDirections: z.boolean().default(true),
			showReschedule: z.boolean().default(true),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/appointment-reminder",
		fieldOverrides: appointmentReminderFieldOverrides()
	},

	// Vaccinations & Growth
	VaccinationSchedule: {
		component: VaccinationSchedule,
		schema: z.object({
			patientAgeMonths: z.coerce.number().min(0).max(216).default(6),
			showCompleted: z.boolean().default(true),
			showUpcoming: z.boolean().default(true),
			showOverdue: z.boolean().default(true),
			vaccineFilter: z
				.enum(["all", "routine", "travel", "optional"])
				.default("all"),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/vaccination-schedule",
		fieldOverrides: vaccinationScheduleFieldOverrides()
	},

	GrowthChartCard: {
		component: GrowthChartCard,
		schema: z.object({
			patientName: z.string().default("Patient"),
			ageMonths: z.coerce.number().min(0).max(216).default(24),
			weightKg: z.coerce.number().min(0).default(12.5),
			heightCm: z.coerce.number().min(0).default(85),
			headCircumferenceCm: z.coerce.number().min(0).optional(),
			showWeight: z.boolean().default(true),
			showHeight: z.boolean().default(true),
			showHeadCircumference: z.boolean().default(false),
			percentileWeight: z.coerce.number().min(0).max(100).optional(),
			percentileHeight: z.coerce.number().min(0).max(100).optional(),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/growth-chart-card",
		fieldOverrides: growthChartCardFieldOverrides()
	},

	AgeMilestoneTracker: {
		component: AgeMilestoneTracker,
		schema: z.object({
			ageMonths: z.coerce.number().min(0).max(216).default(12),
			showMotorSkills: z.boolean().default(true),
			showLanguage: z.boolean().default(true),
			showSocial: z.boolean().default(true),
			showCognitive: z.boolean().default(true),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/age-milestone-tracker",
		fieldOverrides: ageMilestoneTrackerFieldOverrides()
	},

	FeedingGuideCard: {
		component: FeedingGuideCard,
		schema: z.object({
			ageMonths: z.coerce.number().min(0).max(216).default(6),
			feedingType: z
				.enum(["breastfeeding", "formula", "mixed", "solids", "combination"])
				.default("breastfeeding"),
			showSchedule: z.boolean().default(true),
			showPortionSizes: z.boolean().default(true),
			showAllergenWarnings: z.boolean().default(true),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/feeding-guide-card",
		fieldOverrides: feedingGuideCardFieldOverrides()
	},

	// Forms
	PatientIntakeForm: {
		component: PatientIntakeForm,
		schema: z.object({
			title: z.string().default("New Patient Intake"),
			showInsurance: z.boolean().default(true),
			showMedicalHistory: z.boolean().default(true),
			showEmergencyContact: z.boolean().default(true),
			showConsentForms: z.boolean().default(true),
			submitLabel: z.string().default("Submit Intake Form"),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/patient-intake-form",
		fieldOverrides: patientIntakeFormFieldOverrides()
	},

	// Clinic Info
	PediatricianBio: {
		component: PediatricianBio,
		schema: z.object({
			name: z.string().default("Dr. Pediatrician"),
			specialty: z.string().default("General Pediatrics"),
			bio: z.string().optional(),
			imageUrl: z.string().optional(),
			yearsExperience: z.coerce.number().min(0).default(10),
			education: z.string().optional(),
			languages: z.string().default("English"),
			availability: z
				.enum(["available", "busy", "on-leave"])
				.default("available"),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/pediatrician-bio",
		fieldOverrides: pediatricianBioFieldOverrides()
	},

	DoctorTeamGrid: {
		component: DoctorTeamGrid,
		schema: z.object({
			title: z.string().default("Meet Our Pediatricians"),
			subtitle: z.string().optional(),
			columns: z.coerce.number().min(1).max(4).default(3),
			showAvailability: z.boolean().default(true),
			showSpecialties: z.boolean().default(true),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/doctor-team-grid",
		fieldOverrides: doctorTeamGridFieldOverrides()
	},

	ServiceCard: {
		component: ServiceCard,
		schema: z.object({
			title: z.string().default("Well-Child Visits"),
			description: z.string().optional(),
			icon: z.string().optional(),
			price: z.string().optional(),
			duration: z.string().optional(),
			features: z.array(z.string()).default([]),
			featured: z.boolean().default(false),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/service-card",
		fieldOverrides: serviceCardFieldOverrides()
	},

	OpeningHoursCard: {
		component: OpeningHoursCard,
		schema: z.object({
			title: z.string().default("Opening Hours"),
			mondayFriday: z.string().default("8:00 AM - 6:00 PM"),
			saturday: z.string().default("9:00 AM - 2:00 PM"),
			sunday: z.string().default("Closed"),
			emergencyHours: z.string().optional(),
			showHolidayNotice: z.boolean().default(true),
			holidayNotice: z.string().optional(),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/opening-hours-card",
		fieldOverrides: openingHoursCardFieldOverrides()
	},

	InsuranceInfoCard: {
		component: InsuranceInfoCard,
		schema: z.object({
			title: z.string().default("Accepted Insurance Plans"),
			providers: z
				.array(z.string())
				.default(["Blue Cross", "Aetna", "Cigna", "UnitedHealth"]),
			showMedicaid: z.boolean().default(true),
			showPaymentPlans: z.boolean().default(true),
			contactNumber: z.string().default("(555) 123-4567"),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/insurance-info-card",
		fieldOverrides: insuranceInfoCardFieldOverrides()
	},

	EmergencyBanner: {
		component: EmergencyBanner,
		schema: z.object({
			message: z
				.string()
				.default("For medical emergencies, call 911 immediately."),
			phoneNumber: z.string().default("(555) 911-0000"),
			showIcon: z.boolean().default(true),
			variant: z.enum(["info", "warning", "critical"]).default("critical"),
			dismissible: z.boolean().default(false),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/emergency-banner",
		fieldOverrides: emergencyBannerFieldOverrides()
	},

	FAQAccordion: {
		component: FaqAccordion,
		schema: z.object({
			title: z.string().default("Frequently Asked Questions"),
			subtitle: z.string().optional(),
			allowMultiple: z.boolean().default(false),
			defaultOpen: z.string().optional(),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/faq-accordion",
		fieldOverrides: faqAccordionFieldOverrides()
	},

	TestimonialCard: {
		component: TestimonialCard,
		schema: z.object({
			parentName: z.string().default("Parent Name"),
			childAge: z.string().optional(),
			rating: z.coerce.number().min(1).max(5).default(5),
			testimonial: z.string().default("Excellent care for our child!"),
			date: z.string().optional(),
			imageUrl: z.string().optional(),
			verified: z.boolean().default(true),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/testimonial-card",
		fieldOverrides: testimonialCardFieldOverrides()
	},

	// Dashboard
	ClinicStatsGrid: {
		component: ClinicStatsGrid,
		schema: z.object({
			title: z.string().default("Clinic Overview"),
			showPatientsToday: z.boolean().default(true),
			showAppointmentsToday: z.boolean().default(true),
			showAvailableDoctors: z.boolean().default(true),
			showPendingTasks: z.boolean().default(true),
			columns: z.coerce.number().min(1).max(4).default(4),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/clinic-stats-grid",
		fieldOverrides: clinicStatsGridFieldOverrides()
	},
	PatientCard: {
		component: PatientCard,
		schema: z.object({
			patientName: z.string().default("New Patient"),
			age: z.coerce.number().min(0).max(18).default(5),
			dateOfBirth: z.string().optional(),
			gender: z.enum(["male", "female", "other"]).default("male"),
			lastVisit: z.string().optional(),
			nextVisit: z.string().optional(),
			primaryDoctor: z.string().default("Dr. Smith"),
			bloodType: z
				.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
				.optional(),
			allergies: z.string().optional(),
			notes: z.string().optional(),
			variant: z.enum(["default", "compact", "detailed"]).default("default"),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/patient-card",
		fieldOverrides: patientCardFieldOverrides()
	},

	AllergyAlert: {
		component: AllergyAlert,
		schema: z.object({
			patientName: z.string().default("Patient"),
			allergies: z.string().default("Penicillin"),
			severity: z
				.enum(["mild", "moderate", "severe", "life-threatening"])
				.default("moderate"),
			reaction: z.string().optional(),
			showIcon: z.boolean().default(true),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/allergy-alert",
		fieldOverrides: allergyAlertFieldOverrides()
	},

	PrescriptionCard: {
		component: PrescriptionCard,
		schema: z.object({
			medication: z.string().default("Amoxicillin"),
			dosage: z.string().default("250mg"),
			frequency: z
				.enum([
					"once-daily",
					"twice-daily",
					"three-times-daily",
					"four-times-daily",
					"as-needed"
				])
				.default("three-times-daily"),
			duration: z.string().default("7 days"),
			prescribedBy: z.string().default("Dr. Smith"),
			prescribedDate: z.string().optional(),
			refillsRemaining: z.coerce.number().min(0).default(0),
			instructions: z.string().optional(),
			status: z
				.enum(["active", "completed", "expired", "cancelled"])
				.default("active"),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/prescription-card",
		fieldOverrides: prescriptionCardFieldOverrides()
	},
	FaqAccordion: {
		component: FaqAccordion,
		schema: z.object({
			title: z.string().default("Frequently Asked Questions"),
			subtitle: z.string().optional(),
			allowMultiple: z.boolean().default(false),
			defaultOpen: z.string().optional(),
			className: z.string().optional(),
			children: z.any().optional()
		}),
		from: "@/components/clinic/faq-accordion",
		fieldOverrides: commonFieldOverrides()
	}
};
