// lib/ui-builder/registry/clinic-blocks.ts
import type { BlockRegistry } from "@/components/ui/ui-builder/types";

/**
 * Clinic Block Registry
 *
 * Pre-built page sections that clinic staff can drag into the editor.
 * Each block is a complete section composed of clinic components.
 */
export const clinicBlocks: BlockRegistry = {
	// ============================================
	// HERO SECTIONS
	// ============================================
	heroWithCTA: {
		name: "Hero with CTA",
		description: "Hero section with title, subtitle, and call-to-action button",
		category: "hero",
		template: {
			id: "hero-section",
			type: "div",
			name: "Hero Section",
			props: {
				className:
					"flex flex-col items-center gap-4 py-16 px-4 bg-primary/5 rounded-lg"
			},
			children: [
				{
					id: "hero-title",
					type: "h1",
					name: "Hero Title",
					props: {
						className: "text-4xl font-bold text-center tracking-tight"
					},
					children: "Welcome to Sunshine Pediatrics"
				},
				{
					id: "hero-subtitle",
					type: "p",
					name: "Hero Subtitle",
					props: {
						className: "text-lg text-center text-muted-foreground max-w-2xl"
					},
					children:
						"Compassionate pediatric care for children from newborns to adolescents."
				},
				{
					id: "hero-cta",
					type: "Button",
					name: "CTA Button",
					props: {
						variant: "default",
						size: "lg",
						className: "mt-4"
					},
					children: [
						{
							id: "cta-text",
							type: "span",
							name: "Button Text",
							props: {},
							children: "Book Appointment"
						}
					]
				}
			]
		}
	},

	heroWithEmergency: {
		name: "Hero with Emergency Banner",
		description: "Hero section with an emergency alert banner above it",
		category: "hero",
		template: {
			id: "heroWithEmergency-root",
			type: "div",
			name: "Hero With Emergency",
			props: {
				className: "flex flex-col gap-4"
			},
			children: [
				{
					id: "hero-emergency-banner",
					type: "EmergencyBanner",
					name: "Emergency Banner",
					props: {
						message: "For medical emergencies, call 911 immediately.",
						phoneNumber: "(555) 911-0000",
						variant: "critical",
						showIcon: true,
						dismissible: false
					},
					children: []
				},
				{
					id: "hero-with-emergency",
					type: "div",
					name: "Hero Content",
					props: {
						className:
							"flex flex-col items-center gap-4 py-16 px-4 bg-primary/5 rounded-lg mt-4"
					},
					children: [
						{
							id: "hero-we-title",
							type: "h1",
							name: "Hero Title",
							props: {
								className: "text-4xl font-bold text-center tracking-tight"
							},
							children: "Your Child's Health, Our Priority"
						},
						{
							id: "hero-we-subtitle",
							type: "p",
							name: "Hero Subtitle",
							props: {
								className: "text-lg text-center text-muted-foreground max-w-2xl"
							},
							children:
								"Trusted pediatric care for over 20 years in the community."
						}
					]
				}
			]
		}
	},

	// ============================================
	// EMERGENCY & ALERTS
	// ============================================
	emergencyCallout: {
		name: "Emergency Callout",
		description: "Red alert banner for medical emergencies",
		category: "alert",
		template: {
			id: "emergency-callout",
			type: "EmergencyBanner",
			name: "Emergency Banner",
			props: {
				message: "For medical emergencies, call 911 immediately.",
				phoneNumber: "(555) 911-0000",
				variant: "critical",
				showIcon: true,
				dismissible: false
			},
			children: []
		}
	},

	afterHoursNotice: {
		name: "After-Hours Notice",
		description: "Warning banner for after-hours information",
		category: "alert",
		template: {
			id: "after-hours-banner",
			type: "EmergencyBanner",
			name: "After-Hours Banner",
			props: {
				message:
					"Clinic is closed. For after-hours care, call our nurse hotline.",
				phoneNumber: "(555) 911-0000",
				variant: "warning",
				showIcon: true,
				dismissible: true
			},
			children: []
		}
	},

	// ============================================
	// SERVICES SECTIONS
	// ============================================
	servicesGrid: {
		name: "Services Grid",
		description: "Three-column grid of clinic services",
		category: "services",
		template: {
			id: "services-section",
			type: "div",
			name: "Services Section",
			props: {
				className: "py-12 px-4"
			},
			children: [
				{
					id: "services-title",
					type: "h2",
					name: "Section Title",
					props: {
						className: "text-3xl font-bold text-center mb-2"
					},
					children: "Our Services"
				},
				{
					id: "services-subtitle",
					type: "p",
					name: "Section Subtitle",
					props: {
						className: "text-center text-muted-foreground mb-8"
					},
					children: "Comprehensive pediatric care for every stage of childhood."
				},
				{
					id: "services-grid",
					type: "Grid",
					name: "Services Grid",
					props: {
						className: "grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
					},
					children: [
						{
							id: "service-well-child",
							type: "ServiceCard",
							name: "Well-Child Visits",
							props: {
								title: "Well-Child Visits",
								description:
									"Regular checkups to monitor growth and development.",
								duration: "30 min",
								featured: false
							},
							children: []
						},
						{
							id: "service-vaccinations",
							type: "ServiceCard",
							name: "Vaccinations",
							props: {
								title: "Vaccinations",
								description:
									"Complete immunization schedule following CDC guidelines.",
								duration: "15 min",
								featured: false
							},
							children: []
						},
						{
							id: "service-sick-visits",
							type: "ServiceCard",
							name: "Sick Visits",
							props: {
								title: "Sick Visits",
								description: "Same-day appointments for acute illnesses.",
								duration: "20 min",
								featured: true
							},
							children: []
						}
					]
				}
			]
		}
	},

	singleServiceHighlight: {
		name: "Featured Service",
		description: "Single highlighted service card",
		category: "services",
		template: {
			id: "featured-service",
			type: "ServiceCard",
			name: "Featured Service",
			props: {
				title: "Newborn Care",
				description:
					"Specialized care for newborns including feeding support, growth monitoring, and developmental screenings.",
				duration: "45 min",
				featured: true
			},
			children: []
		}
	},

	// ============================================
	// DOCTOR / TEAM SECTIONS
	// ============================================
	doctorTeamSection: {
		name: "Doctor Team Section",
		description: "Grid of pediatrician profiles with availability",
		category: "team",
		template: {
			id: "team-section",
			type: "div",
			name: "Team Section",
			props: {
				className: "py-12 px-4 bg-muted/50"
			},
			children: [
				{
					id: "team-title",
					type: "h2",
					name: "Section Title",
					props: {
						className: "text-3xl font-bold text-center mb-2"
					},
					children: "Meet Our Pediatricians"
				},
				{
					id: "team-subtitle",
					type: "p",
					name: "Section Subtitle",
					props: {
						className: "text-center text-muted-foreground mb-8"
					},
					children:
						"Board-certified pediatricians dedicated to your child's health."
				},
				{
					id: "team-grid",
					type: "DoctorTeamGrid",
					name: "Doctor Grid",
					props: {
						title: "Our Team",
						columns: 3,
						showAvailability: true,
						showSpecialties: true
					},
					children: []
				}
			]
		}
	},

	singlePediatricianBio: {
		name: "Pediatrician Bio",
		description: "Single pediatrician profile card",
		category: "team",
		template: {
			id: "pediatrician-bio",
			type: "PediatricianBio",
			name: "Dr. Smith Bio",
			props: {
				name: "Dr. Sarah Smith",
				specialty: "General Pediatrics",
				bio: "Dr. Smith has over 15 years of experience caring for children of all ages.",
				yearsExperience: 15,
				languages: "English, Spanish",
				availability: "available"
			},
			children: []
		}
	},

	// ============================================
	// APPOINTMENT SECTIONS
	// ============================================
	appointmentBookingSection: {
		name: "Appointment Booking",
		description: "Complete appointment booking form section",
		category: "appointment",
		template: {
			id: "booking-section",
			type: "div",
			name: "Booking Section",
			props: {
				className: "py-12 px-4 bg-muted/50"
			},
			children: [
				{
					id: "booking-form",
					type: "AppointmentBookingForm",
					name: "Booking Form",
					props: {
						title: "Book an Appointment",
						subtitle: "Schedule a visit with one of our pediatricians",
						showDatePicker: true,
						showTimeSlots: true,
						showDoctorSelect: true,
						showReasonField: true,
						submitLabel: "Request Appointment"
					},
					children: []
				}
			]
		}
	},

	appointmentSlotsList: {
		name: "Available Appointment Slots",
		description: "List of available appointment time slots",
		category: "appointment",
		template: {
			id: "slots-section",
			type: "div",
			name: "Slots Section",
			props: {
				className: "py-8 px-4 flex flex-col gap-3"
			},
			children: [
				{
					id: "slots-title",
					type: "h3",
					name: "Slots Title",
					props: {
						className: "text-xl font-semibold mb-4"
					},
					children: "Available Today"
				},
				{
					id: "slot-1",
					type: "AppointmentSlot",
					name: "Morning Slot",
					props: {
						date: "2026-09-22",
						time: "09:00",
						endTime: "09:30",
						pediatrician: "Dr. Smith",
						type: "checkup",
						available: true,
						location: "Main Clinic - Room 101"
					},
					children: []
				},
				{
					id: "slot-2",
					type: "AppointmentSlot",
					name: "Midday Slot",
					props: {
						date: "2026-09-22",
						time: "12:00",
						endTime: "12:30",
						pediatrician: "Dr. Johnson",
						type: "vaccination",
						available: true,
						location: "Main Clinic - Room 102"
					},
					children: []
				},
				{
					id: "slot-3",
					type: "AppointmentSlot",
					name: "Afternoon Slot",
					props: {
						date: "2026-09-22",
						time: "15:00",
						endTime: "15:30",
						pediatrician: "Dr. Lee",
						type: "sick-visit",
						available: false,
						location: "Main Clinic - Room 103"
					},
					children: []
				}
			]
		}
	},

	appointmentReminder: {
		name: "Appointment Reminder",
		description: "Reminder card for upcoming appointments",
		category: "appointment",
		template: {
			id: "reminder-card",
			type: "AppointmentReminder",
			name: "Appointment Reminder",
			props: {
				patientName: "Emma Johnson",
				appointmentDate: "2026-09-25",
				appointmentTime: "10:00",
				doctorName: "Dr. Smith",
				appointmentType: "Annual Checkup",
				location: "Main Clinic",
				showDirections: true,
				showReschedule: true
			},
			children: []
		}
	},

	// ============================================
	// PATIENT SECTIONS
	// ============================================
	patientOverviewCard: {
		name: "Patient Overview",
		description: "Detailed patient information card",
		category: "patient",
		template: {
			id: "patient-overview",
			type: "PatientCard",
			name: "Patient Overview",
			props: {
				patientName: "Emma Johnson",
				age: 5,
				gender: "female",
				primaryDoctor: "Dr. Smith",
				bloodType: "O+",
				allergies: "Peanuts",
				lastVisit: "2026-08-15",
				nextVisit: "2026-11-15",
				variant: "detailed"
			},
			children: []
		}
	},

	allergyAlertSection: {
		name: "Allergy Alert",
		description: "Prominent allergy warning card",
		category: "patient",
		template: {
			id: "allergy-alert",
			type: "AllergyAlert",
			name: "Allergy Alert",
			props: {
				patientName: "Emma Johnson",
				allergies: "Peanuts, Penicillin",
				severity: "severe",
				reaction: "Anaphylaxis",
				showIcon: true
			},
			children: []
		}
	},

	prescriptionCard: {
		name: "Prescription Card",
		description: "Active prescription information card",
		category: "patient",
		template: {
			id: "prescription-card",
			type: "PrescriptionCard",
			name: "Prescription",
			props: {
				medication: "Amoxicillin",
				dosage: "250mg",
				frequency: "three-times-daily",
				duration: "7 days",
				prescribedBy: "Dr. Smith",
				prescribedDate: "2026-09-20",
				refillsRemaining: 2,
				instructions: "Take with food. Complete full course.",
				status: "active"
			},
			children: []
		}
	},

	// ============================================
	// VACCINATION SECTIONS
	// ============================================
	vaccinationScheduleSection: {
		name: "Vaccination Schedule",
		description: "Complete vaccination schedule for a patient",
		category: "vaccination",
		template: {
			id: "vaccination-section",
			type: "div",
			name: "Vaccination Section",
			props: {
				className: "py-8 px-4"
			},
			children: [
				{
					id: "vaccination-title",
					type: "h2",
					name: "Section Title",
					props: {
						className: "text-2xl font-bold mb-6"
					},
					children: "Vaccination Schedule"
				},
				{
					id: "vaccination-schedule",
					type: "VaccinationSchedule",
					name: "Vaccination Schedule",
					props: {
						patientAgeMonths: 6,
						showCompleted: true,
						showUpcoming: true,
						showOverdue: true,
						vaccineFilter: "all"
					},
					children: []
				}
			]
		}
	},

	// ============================================
	// GROWTH & DEVELOPMENT SECTIONS
	// ============================================
	growthChartSection: {
		name: "Growth Chart",
		description: "Patient growth chart with measurements",
		category: "growth",
		template: {
			id: "growth-section",
			type: "div",
			name: "Growth Section",
			props: {
				className: "py-8 px-4"
			},
			children: [
				{
					id: "growth-title",
					type: "h2",
					name: "Section Title",
					props: {
						className: "text-2xl font-bold mb-6"
					},
					children: "Growth Tracking"
				},
				{
					id: "growth-chart",
					type: "GrowthChartCard",
					name: "Growth Chart",
					props: {
						patientName: "Emma Johnson",
						ageMonths: 24,
						weightKg: 12.5,
						heightCm: 85,
						showWeight: true,
						showHeight: true,
						showHeadCircumference: false,
						percentileWeight: 50,
						percentileHeight: 55
					},
					children: []
				}
			]
		}
	},

	milestoneTrackerSection: {
		name: "Milestone Tracker",
		description: "Developmental milestone tracking section",
		category: "growth",
		template: {
			id: "milestone-section",
			type: "div",
			name: "Milestone Section",
			props: {
				className: "py-8 px-4"
			},
			children: [
				{
					id: "milestone-title",
					type: "h2",
					name: "Section Title",
					props: {
						className: "text-2xl font-bold mb-6"
					},
					children: "Developmental Milestones"
				},
				{
					id: "milestone-tracker",
					type: "AgeMilestoneTracker",
					name: "Milestone Tracker",
					props: {
						ageMonths: 12,
						showMotorSkills: true,
						showLanguage: true,
						showSocial: true,
						showCognitive: true
					},
					children: []
				}
			]
		}
	},

	feedingGuideSection: {
		name: "Feeding Guide",
		description: "Age-appropriate feeding guide section",
		category: "growth",
		template: {
			id: "feeding-section",
			type: "div",
			name: "Feeding Section",
			props: {
				className: "py-8 px-4"
			},
			children: [
				{
					id: "feeding-title",
					type: "h2",
					name: "Section Title",
					props: {
						className: "text-2xl font-bold mb-6"
					},
					children: "Feeding Guide"
				},
				{
					id: "feeding-guide",
					type: "FeedingGuideCard",
					name: "Feeding Guide",
					props: {
						ageMonths: 6,
						feedingType: "breastfeeding",
						showSchedule: true,
						showPortionSizes: true,
						showAllergenWarnings: true
					},
					children: []
				}
			]
		}
	},

	// ============================================
	// CLINIC INFORMATION SECTIONS
	// ============================================
	contactInfoSection: {
		name: "Contact Information",
		description: "Opening hours, insurance, and emergency info",
		category: "clinic",
		template: {
			id: "contact-section",
			type: "div",
			name: "Contact Section",
			props: {
				className: "py-12 px-4"
			},
			children: [
				{
					id: "contact-title",
					type: "h2",
					name: "Section Title",
					props: {
						className: "text-3xl font-bold text-center mb-8"
					},
					children: "Visit Us"
				},
				{
					id: "contact-grid",
					type: "Grid",
					name: "Contact Grid",
					props: {
						className: "grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
					},
					children: [
						{
							id: "hours-card",
							type: "OpeningHoursCard",
							name: "Opening Hours",
							props: {
								title: "Opening Hours",
								mondayFriday: "8:00 AM - 6:00 PM",
								saturday: "9:00 AM - 2:00 PM",
								sunday: "Closed",
								showHolidayNotice: true,
								holidayNotice: "Closed on Thanksgiving and Christmas Day"
							},
							children: []
						},
						{
							id: "insurance-card",
							type: "InsuranceInfoCard",
							name: "Insurance Info",
							props: {
								title: "Accepted Insurance",
								providers: ["Blue Cross", "Aetna", "Cigna", "UnitedHealth"],
								showMedicaid: true,
								showPaymentPlans: true,
								contactNumber: "(555) 123-4567"
							},
							children: []
						},
						{
							id: "emergency-info",
							type: "EmergencyBanner",
							name: "Emergency Info",
							props: {
								message: "After-hours emergency? Call our hotline.",
								phoneNumber: "(555) 911-0000",
								variant: "warning",
								showIcon: true
							},
							children: []
						}
					]
				}
			]
		}
	},

	// ============================================
	// FAQ SECTIONS
	// ============================================
	faqSection: {
		name: "FAQ Section",
		description: "Frequently asked questions accordion",
		category: "faq",
		template: {
			id: "faq-section",
			type: "div",
			name: "FAQ Section",
			props: {
				className: "py-12 px-4 max-w-3xl mx-auto"
			},
			children: [
				{
					id: "faq-accordion",
					type: "FAQAccordion",
					name: "FAQ Accordion",
					props: {
						title: "Frequently Asked Questions",
						subtitle: "Common questions from parents",
						allowMultiple: false
					},
					children: []
				}
			]
		}
	},

	// ============================================
	// TESTIMONIAL SECTIONS
	// ============================================
	testimonialsSection: {
		name: "Parent Testimonials",
		description: "Grid of parent testimonials",
		category: "testimonial",
		template: {
			id: "testimonials-section",
			type: "div",
			name: "Testimonials Section",
			props: {
				className: "py-12 px-4 bg-muted/50"
			},
			children: [
				{
					id: "testimonials-title",
					type: "h2",
					name: "Section Title",
					props: {
						className: "text-3xl font-bold text-center mb-8"
					},
					children: "What Parents Say"
				},
				{
					id: "testimonials-grid",
					type: "Grid",
					name: "Testimonials Grid",
					props: {
						className: "grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
					},
					children: [
						{
							id: "testimonial-1",
							type: "TestimonialCard",
							name: "Testimonial 1",
							props: {
								parentName: "Jennifer M.",
								childAge: "3 years old",
								rating: 5,
								testimonial:
									"Dr. Smith is amazing with our daughter. She actually looks forward to her checkups!",
								verified: true
							},
							children: []
						},
						{
							id: "testimonial-2",
							type: "TestimonialCard",
							name: "Testimonial 2",
							props: {
								parentName: "Michael R.",
								childAge: "7 years old",
								rating: 5,
								testimonial:
									"Same-day sick appointments have been a lifesaver. The whole team is wonderful.",
								verified: true
							},
							children: []
						},
						{
							id: "testimonial-3",
							type: "TestimonialCard",
							name: "Testimonial 3",
							props: {
								parentName: "Sarah L.",
								childAge: "6 months old",
								rating: 5,
								testimonial:
									"As first-time parents, we appreciate how patient and thorough everyone is.",
								verified: true
							},
							children: []
						}
					]
				}
			]
		}
	},

	// ============================================
	// FORMS SECTIONS
	// ============================================
	patientIntakeFormSection: {
		name: "New Patient Intake Form",
		description: "Complete new patient intake form",
		category: "form",
		template: {
			id: "intake-section",
			type: "div",
			name: "Intake Section",
			props: {
				className: "py-12 px-4 max-w-3xl mx-auto"
			},
			children: [
				{
					id: "intake-form",
					type: "PatientIntakeForm",
					name: "Intake Form",
					props: {
						title: "New Patient Intake",
						showInsurance: true,
						showMedicalHistory: true,
						showEmergencyContact: true,
						showConsentForms: true,
						submitLabel: "Submit Intake Form"
					},
					children: []
				}
			]
		}
	},

	// ============================================
	// DASHBOARD SECTIONS
	// ============================================
	dashboardStatsSection: {
		name: "Dashboard Stats",
		description: "Clinic statistics overview grid",
		category: "dashboard",
		template: {
			id: "dashboard-section",
			type: "div",
			name: "Dashboard Section",
			props: {
				className: "py-8 px-4"
			},
			children: [
				{
					id: "dashboard-title",
					type: "h2",
					name: "Section Title",
					props: {
						className: "text-2xl font-bold mb-6"
					},
					children: "Clinic Overview"
				},
				{
					id: "clinic-stats",
					type: "ClinicStatsGrid",
					name: "Clinic Stats",
					props: {
						title: "Today's Overview",
						showPatientsToday: true,
						showAppointmentsToday: true,
						showAvailableDoctors: true,
						showPendingTasks: true,
						columns: 4
					},
					children: []
				}
			]
		}
	},

	// ============================================
	// FULL PAGE TEMPLATES
	// ============================================
	fullLandingPage: {
		name: "Full Landing Page",
		description: "Complete clinic landing page with all sections",
		category: "page",
		template: {
			id: "landing-page",
			type: "div",
			name: "Landing Page",
			props: {
				className: "min-h-screen flex flex-col gap-8 bg-background"
			},
			children: [
				{
					id: "landing-emergency",
					type: "EmergencyBanner",
					name: "Emergency Banner",
					props: {
						message: "For medical emergencies, call 911 immediately.",
						phoneNumber: "(555) 911-0000",
						variant: "critical",
						showIcon: true
					},
					children: []
				},
				{
					id: "landing-hero",
					type: "div",
					name: "Hero Section",
					props: {
						className:
							"flex flex-col items-center gap-4 py-16 px-4 bg-primary/5"
					},
					children: [
						{
							id: "landing-hero-title",
							type: "h1",
							name: "Hero Title",
							props: {
								className: "text-5xl font-bold text-center tracking-tight"
							},
							children: "Sunshine Pediatrics"
						},
						{
							id: "landing-hero-subtitle",
							type: "p",
							name: "Hero Subtitle",
							props: {
								className: "text-xl text-center text-muted-foreground max-w-2xl"
							},
							children:
								"Compassionate care for your child's health and development."
						}
					]
				},
				{
					id: "landing-services",
					type: "div",
					name: "Services Section",
					props: {
						className: "py-12 px-4"
					},
					children: [
						{
							id: "landing-services-title",
							type: "h2",
							name: "Services Title",
							props: {
								className: "text-3xl font-bold text-center mb-8"
							},
							children: "Our Services"
						},
						{
							id: "landing-services-grid",
							type: "Grid",
							name: "Services Grid",
							props: {
								className: "grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
							},
							children: [
								{
									id: "landing-service-1",
									type: "ServiceCard",
									name: "Well-Child Visits",
									props: {
										title: "Well-Child Visits",
										description:
											"Regular checkups to monitor growth and development.",
										duration: "30 min",
										featured: false
									},
									children: []
								},
								{
									id: "landing-service-2",
									type: "ServiceCard",
									name: "Vaccinations",
									props: {
										title: "Vaccinations",
										description:
											"Complete immunization schedule following CDC guidelines.",
										duration: "15 min",
										featured: false
									},
									children: []
								},
								{
									id: "landing-service-3",
									type: "ServiceCard",
									name: "Sick Visits",
									props: {
										title: "Sick Visits",
										description: "Same-day appointments for acute illnesses.",
										duration: "20 min",
										featured: true
									},
									children: []
								}
							]
						}
					]
				},
				{
					id: "landing-team",
					type: "DoctorTeamGrid",
					name: "Team Grid",
					props: {
						title: "Meet Our Pediatricians",
						columns: 3,
						showAvailability: true,
						showSpecialties: true
					},
					children: []
				},
				{
					id: "landing-faq",
					type: "FAQAccordion",
					name: "FAQ Accordion",
					props: {
						title: "Frequently Asked Questions",
						subtitle: "Common questions from parents",
						allowMultiple: false
					},
					children: []
				}
			]
		}
	}
};
