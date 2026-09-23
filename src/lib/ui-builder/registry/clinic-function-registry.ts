// lib/ui-builder/registry/clinic-function-registry.ts
import { z } from "zod/v4";

import type { FunctionRegistry } from "@/components/ui/ui-builder/types";

// ============================================
// REUSABLE SCHEMAS
// ============================================

/** No-arg handlers: `fn()` */
// const voidArgs = z.tuple([]);

/** Handlers receiving a React click event. */
const clickEventArgs = z.tuple([z.custom<React.MouseEvent<HTMLElement>>()]);

/** Handlers receiving a React form submit event. */
const submitEventArgs = z.tuple([z.custom<React.FormEvent<HTMLFormElement>>()]);

// /** Handlers receiving a React change event. */
// const changeEventArgs = z.tuple([
// 	z.custom<React.ChangeEvent<HTMLInputElement>>()
// ]);

/** Row actions on a table or list: the entity id. */
const idArgs = z.tuple([z.string()]);

/** Appointment actions: appointment id + optional payload. */
const appointmentArgs = z.tuple([
	z.string(),
	z
		.object({
			date: z.string().optional(),
			time: z.string().optional(),
			doctorId: z.string().optional(),
			reason: z.string().optional()
		})
		.optional()
]);

/** Patient actions: patient id + optional patch. */
const patientArgs = z.tuple([
	z.string(),
	z.record(z.string(), z.unknown()).optional()
]);

/** Prescription actions: prescription id. */
const prescriptionArgs = z.tuple([z.string()]);

/** Vaccination actions: vaccine id + optional details. */
const vaccinationArgs = z.tuple([
	z.string(),
	z
		.object({
			administeredDate: z.string().optional(),
			batchNumber: z.string().optional(),
			administeredBy: z.string().optional()
		})
		.optional()
]);

/** Generic form payload used by contact / feedback handlers. */
const formPayloadArgs = z.tuple([
	z.object({
		name: z.string().optional(),
		email: z.string().email().optional(),
		phone: z.string().optional(),
		message: z.string().optional()
	})
]);

/** Milestone actions: milestone id + optional status. */
const milestoneArgs = z.tuple([
	z.string(),
	z.enum(["pending", "reached", "missed"]).optional()
]);

/** Growth measurement payload. */
const growthArgs = z.tuple([
	z.object({
		weightKg: z.number().optional(),
		heightCm: z.number().optional(),
		headCircumferenceCm: z.number().optional(),
		recordedAt: z.string().optional()
	})
]);

/** Feeding log payload. */
const feedingArgs = z.tuple([
	z.object({
		type: z.enum(["breastfeeding", "formula", "solids", "mixed"]),
		amountMl: z.number().optional(),
		durationMinutes: z.number().optional(),
		notes: z.string().optional()
	})
]);

/** Clinic export: which dataset + format. */
const exportArgs = z.tuple([
	z.enum(["patients", "appointments", "prescriptions", "all"]),
	z.enum(["csv", "json"]).default("csv")
]);

/** Modal helpers: optional modal id. */
const modalArgs = z.tuple([z.string().optional()]);

// ============================================
// FUNCTION REGISTRY
// ============================================

/**
 * Clinic Function Registry
 *
 * Defines event handler functions that can be bound to component props
 * (onClick, onSubmit, onChange, etc.) inside the visual editor.
 *
 * Every entry declares:
 *   - `schema`        → the arguments the handler receives at call time
 *   - `fn`            → the actual implementation
 *   - `typeSignature` → (optional) TS signature used during code generation
 */
export const clinicFunctionRegistry: FunctionRegistry = {
	// ============================================
	// APPOINTMENT FUNCTIONS
	// ============================================
	handleBookAppointment: {
		name: "Book Appointment",
		description: "Opens the appointment booking flow",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Booking appointment...");
			if (typeof window !== "undefined") {
				window.location.href = "/appointments/book";
			}
		}
	},

	handleCancelAppointment: {
		name: "Cancel Appointment",
		description: "Cancels a scheduled appointment",
		schema: appointmentArgs,
		typeSignature:
			"(appointmentId: string, payload?: { date?: string; time?: string; doctorId?: string; reason?: string }) => void",
		fn: (appointmentId: string) => {
			console.log("[Clinic] Cancelling appointment...", appointmentId);
			if (typeof window !== "undefined") {
				const confirmed = window.confirm(
					"Are you sure you want to cancel this appointment?"
				);
				if (confirmed) {
					console.log("[Clinic] Appointment cancelled:", appointmentId);
					// await cancelAppointment(appointmentId);
				}
			}
		}
	},

	handleRescheduleAppointment: {
		name: "Reschedule Appointment",
		description: "Opens the reschedule flow for an appointment",
		schema: appointmentArgs,
		typeSignature:
			"(appointmentId: string, payload?: { date?: string; time?: string; doctorId?: string; reason?: string }) => void",
		fn: (appointmentId: string) => {
			console.log("[Clinic] Rescheduling appointment...", appointmentId);
			if (typeof window !== "undefined") {
				window.location.href = `/appointments/reschedule?id=${encodeURIComponent(appointmentId)}`;
			}
		}
	},

	handleConfirmAppointment: {
		name: "Confirm Appointment",
		description: "Confirms a pending appointment",
		schema: appointmentArgs,
		typeSignature:
			"(appointmentId: string, payload?: { date?: string; time?: string; doctorId?: string; reason?: string }) => void",
		fn: (appointmentId: string) => {
			console.log("[Clinic] Confirming appointment...", appointmentId);
			// await confirmAppointment(appointmentId);
		}
	},

	handleViewAppointmentDetails: {
		name: "View Appointment Details",
		description: "Opens the appointment details view",
		schema: idArgs,
		typeSignature: "(appointmentId: string) => void",
		fn: (appointmentId: string) => {
			console.log("[Clinic] Viewing appointment details...", appointmentId);
			if (typeof window !== "undefined") {
				window.location.href = `/appointments/details?id=${encodeURIComponent(appointmentId)}`;
			}
		}
	},

	// ============================================
	// COMMUNICATION FUNCTIONS
	// ============================================
	handleCallClinic: {
		name: "Call Clinic",
		description: "Initiates a phone call to the main clinic line",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Calling clinic...");
			if (typeof window !== "undefined") {
				window.location.href = "tel:+15551234567";
			}
		}
	},

	handleCallEmergency: {
		name: "Emergency Call (911)",
		description: "Calls 911 for medical emergencies",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Emergency call initiated");
			if (typeof window !== "undefined") {
				window.location.href = "tel:911";
			}
		}
	},

	handleCallAfterHours: {
		name: "After-Hours Hotline",
		description: "Calls the after-hours nurse hotline",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Calling after-hours hotline...");
			if (typeof window !== "undefined") {
				window.location.href = "tel:+15559110000";
			}
		}
	},

	handleSendEmail: {
		name: "Send Email",
		description: "Opens the default email client to contact the clinic",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Opening email client...");
			if (typeof window !== "undefined") {
				window.location.href = "mailto:info@sunshinepediatrics.com";
			}
		}
	},

	handleOpenDirections: {
		name: "Open Directions",
		description: "Opens maps with directions to the clinic",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Opening directions...");
			if (typeof window !== "undefined") {
				const address = encodeURIComponent(
					"123 Health Street, Medical City, MC 12345"
				);
				window.open(`https://maps.google.com/?q=${address}`, "_blank");
			}
		}
	},

	// ============================================
	// PATIENT FUNCTIONS
	// ============================================
	handleViewPatient: {
		name: "View Patient Record",
		description: "Opens a patient's medical record",
		schema: idArgs,
		typeSignature: "(patientId: string) => void",
		fn: (patientId: string) => {
			console.log("[Clinic] Opening patient record...", patientId);
			if (typeof window !== "undefined") {
				window.location.href = `/patients/${encodeURIComponent(patientId)}`;
			}
		}
	},

	handleAddPatient: {
		name: "Add New Patient",
		description: "Opens the new patient intake form",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Adding new patient...");
			if (typeof window !== "undefined") {
				window.location.href = "/patients/new";
			}
		}
	},

	handleEditPatient: {
		name: "Edit Patient",
		description: "Opens the patient edit form",
		schema: patientArgs,
		typeSignature:
			"(patientId: string, patch?: Record<string, unknown>) => void",
		fn: (patientId: string) => {
			console.log("[Clinic] Editing patient...", patientId);
			if (typeof window !== "undefined") {
				window.location.href = `/patients/${encodeURIComponent(patientId)}/edit`;
			}
		}
	},

	handlePrintPatientSummary: {
		name: "Print Patient Summary",
		description: "Opens the print dialog for patient summary",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Printing patient summary...");
			if (typeof window !== "undefined") {
				window.print();
			}
		}
	},

	// ============================================
	// PRESCRIPTION FUNCTIONS
	// ============================================
	handlePrintPrescription: {
		name: "Print Prescription",
		description: "Opens the print dialog for prescriptions",
		schema: prescriptionArgs,
		typeSignature: "(prescriptionId: string) => void",
		fn: (prescriptionId: string) => {
			console.log("[Clinic] Printing prescription...", prescriptionId);
			if (typeof window !== "undefined") {
				window.print();
			}
		}
	},

	handleRefillPrescription: {
		name: "Request Refill",
		description: "Requests a prescription refill",
		schema: prescriptionArgs,
		typeSignature: "(prescriptionId: string) => void",
		fn: (prescriptionId: string) => {
			console.log("[Clinic] Requesting refill...", prescriptionId);
			// await requestRefill(prescriptionId);
		}
	},

	handleSendToPharmacy: {
		name: "Send to Pharmacy",
		description: "Sends the prescription to the patient's pharmacy",
		schema: prescriptionArgs,
		typeSignature: "(prescriptionId: string) => void",
		fn: (prescriptionId: string) => {
			console.log("[Clinic] Sending to pharmacy...", prescriptionId);
			// await sendToPharmacy(prescriptionId);
		}
	},

	// ============================================
	// VACCINATION FUNCTIONS
	// ============================================
	handleMarkVaccineComplete: {
		name: "Mark Vaccine Complete",
		description: "Marks a vaccine as administered",
		schema: vaccinationArgs,
		typeSignature:
			"(vaccineId: string, details?: { administeredDate?: string; batchNumber?: string; administeredBy?: string }) => void",
		fn: (vaccineId: string) => {
			console.log("[Clinic] Marking vaccine complete...", vaccineId);
			// await markVaccineComplete(vaccineId);
		}
	},

	handleScheduleVaccine: {
		name: "Schedule Vaccine",
		description: "Opens the vaccine scheduling flow",
		schema: vaccinationArgs,
		typeSignature:
			"(vaccineId: string, details?: { administeredDate?: string; batchNumber?: string; administeredBy?: string }) => void",
		fn: (vaccineId: string) => {
			console.log("[Clinic] Scheduling vaccine...", vaccineId);
			if (typeof window !== "undefined") {
				window.location.href = `/appointments/book?vaccine=${encodeURIComponent(vaccineId)}`;
			}
		}
	},

	handlePrintVaccinationRecord: {
		name: "Print Vaccination Record",
		description: "Opens print dialog for vaccination records",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Printing vaccination record...");
			if (typeof window !== "undefined") {
				window.print();
			}
		}
	},

	// ============================================
	// FORM SUBMISSION FUNCTIONS
	// ============================================
	handleSubmitContactForm: {
		name: "Submit Contact Form",
		description: "Submits the contact form to the clinic",
		schema: submitEventArgs,
		typeSignature: "(e: React.FormEvent<HTMLFormElement>) => void",
		fn: (e?: React.FormEvent<HTMLFormElement>) => {
			e?.preventDefault();
			console.log("[Clinic] Contact form submitted");
			// const data = new FormData(e.currentTarget);
			// await submitContactForm(data);
		}
	},

	handleSubmitIntakeForm: {
		name: "Submit Intake Form",
		description: "Submits a new patient intake form",
		schema: submitEventArgs,
		typeSignature: "(e: React.FormEvent<HTMLFormElement>) => void",
		fn: (e?: React.FormEvent<HTMLFormElement>) => {
			e?.preventDefault();
			console.log("[Clinic] Intake form submitted");
			// const data = new FormData(e.currentTarget);
			// await submitIntakeForm(data);
		}
	},

	handleSubmitAppointmentRequest: {
		name: "Submit Appointment Request",
		description: "Submits an appointment booking request",
		schema: submitEventArgs,
		typeSignature: "(e: React.FormEvent<HTMLFormElement>) => void",
		fn: (e?: React.FormEvent<HTMLFormElement>) => {
			e?.preventDefault();
			console.log("[Clinic] Appointment request submitted");
			// const data = new FormData(e.currentTarget);
			// await submitAppointmentRequest(data);
		}
	},

	handleSubmitFeedback: {
		name: "Submit Feedback",
		description: "Submits patient/parent feedback",
		schema: formPayloadArgs,
		typeSignature:
			"(payload: { name?: string; email?: string; phone?: string; message?: string }) => void",
		fn: payload => {
			console.log("[Clinic] Feedback submitted", payload);
			// await submitFeedback(payload);
		}
	},

	// ============================================
	// NAVIGATION FUNCTIONS
	// ============================================
	handleNavigateHome: {
		name: "Navigate Home",
		description: "Navigates to the clinic homepage",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			if (typeof window !== "undefined") window.location.href = "/";
		}
	},

	handleNavigateServices: {
		name: "Navigate to Services",
		description: "Navigates to the services page",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			if (typeof window !== "undefined") window.location.href = "/services";
		}
	},

	handleNavigateDoctors: {
		name: "Navigate to Doctors",
		description: "Navigates to the doctors page",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			if (typeof window !== "undefined") window.location.href = "/doctors";
		}
	},

	handleNavigateContact: {
		name: "Navigate to Contact",
		description: "Navigates to the contact page",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			if (typeof window !== "undefined") window.location.href = "/contact";
		}
	},

	handleNavigatePortal: {
		name: "Navigate to Patient Portal",
		description: "Navigates to the patient portal login",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			if (typeof window !== "undefined") window.location.href = "/portal";
		}
	},

	// ============================================
	// UI INTERACTION FUNCTIONS
	// ============================================
	handleOpenModal: {
		name: "Open Modal",
		description: "Opens a modal dialog",
		schema: modalArgs,
		typeSignature: "(modalId?: string) => void",
		fn: (modalId?: string) => {
			console.log("[Clinic] Opening modal...", modalId);
			// setModalOpen(true);
		}
	},

	handleCloseModal: {
		name: "Close Modal",
		description: "Closes the current modal dialog",
		schema: modalArgs,
		typeSignature: "(modalId?: string) => void",
		fn: (modalId?: string) => {
			console.log("[Clinic] Closing modal...", modalId);
			// setModalOpen(false);
		}
	},

	handleToggleSidebar: {
		name: "Toggle Sidebar",
		description: "Toggles the sidebar visibility",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Toggling sidebar...");
			// setSidebarOpen(!sidebarOpen);
		}
	},

	handleScrollToTop: {
		name: "Scroll to Top",
		description: "Smoothly scrolls to the top of the page",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			if (typeof window !== "undefined") {
				window.scrollTo({ top: 0, behavior: "smooth" });
			}
		}
	},

	handlePrintPage: {
		name: "Print Page",
		description: "Opens the browser print dialog",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			if (typeof window !== "undefined") window.print();
		}
	},

	handleSharePage: {
		name: "Share Page",
		description: "Shares the page via the Web Share API",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => Promise<void>",
		fn: async () => {
			if (typeof window !== "undefined" && navigator.share) {
				try {
					await navigator.share({
						title: "Sunshine Pediatrics",
						text: "Check out this page from Sunshine Pediatrics",
						url: window.location.href
					});
				} catch (err) {
					console.log("[Clinic] Share cancelled or failed", err);
				}
			}
		}
	},

	// ============================================
	// GROWTH & MILESTONE FUNCTIONS
	// ============================================
	handleLogGrowth: {
		name: "Log Growth Measurement",
		description: "Opens the growth measurement entry form",
		schema: growthArgs,
		typeSignature:
			"(measurement: { weightKg?: number; heightCm?: number; headCircumferenceCm?: number; recordedAt?: string }) => void",
		fn: measurement => {
			console.log("[Clinic] Logging growth measurement...", measurement);
			// await logGrowth(measurement);
		}
	},

	handleViewGrowthChart: {
		name: "View Growth Chart",
		description: "Opens the detailed growth chart view",
		schema: idArgs,
		typeSignature: "(patientId: string) => void",
		fn: (patientId: string) => {
			console.log("[Clinic] Viewing growth chart...", patientId);
			if (typeof window !== "undefined") {
				window.location.href = `/growth/chart?patientId=${encodeURIComponent(patientId)}`;
			}
		}
	},

	handleUpdateMilestone: {
		name: "Update Milestone",
		description: "Updates a developmental milestone",
		schema: milestoneArgs,
		typeSignature:
			"(milestoneId: string, status?: 'pending' | 'reached' | 'missed') => void",
		fn: (milestoneId: string, status?: "pending" | "reached" | "missed") => {
			console.log("[Clinic] Updating milestone...", milestoneId, status);
			// await updateMilestone(milestoneId, status);
		}
	},

	// ============================================
	// FEEDING & NUTRITION FUNCTIONS
	// ============================================
	handleViewFeedingGuide: {
		name: "View Feeding Guide",
		description: "Opens the detailed feeding guide",
		schema: idArgs,
		typeSignature: "(patientId: string) => void",
		fn: (patientId: string) => {
			console.log("[Clinic] Viewing feeding guide...", patientId);
			if (typeof window !== "undefined") {
				window.location.href = `/feeding/guide?patientId=${encodeURIComponent(patientId)}`;
			}
		}
	},

	handleLogFeeding: {
		name: "Log Feeding",
		description: "Opens the feeding log entry form",
		schema: feedingArgs,
		typeSignature:
			"(entry: { type: 'breastfeeding' | 'formula' | 'solids' | 'mixed'; amountMl?: number; durationMinutes?: number; notes?: string }) => void",
		fn: entry => {
			console.log("[Clinic] Logging feeding...", entry);
			// await logFeeding(entry);
		}
	},

	// ============================================
	// ADMIN FUNCTIONS
	// ============================================
	handleExportData: {
		name: "Export Data",
		description: "Exports clinic data as a file",
		schema: exportArgs,
		typeSignature:
			"(dataset: 'patients' | 'appointments' | 'prescriptions' | 'all', format?: 'csv' | 'json') => void",
		fn: (
			dataset: "patients" | "appointments" | "prescriptions" | "all",
			format: "csv" | "json" = "csv"
		) => {
			console.log("[Clinic] Exporting data...", dataset, format);
			// await exportClinicData(dataset, format);
		}
	},

	handleRefreshData: {
		name: "Refresh Data",
		description: "Refreshes the current page data",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Refreshing data...");
			if (typeof window !== "undefined") window.location.reload();
		}
	},

	handleLogout: {
		name: "Logout",
		description: "Logs the user out of the clinic portal",
		schema: clickEventArgs,
		typeSignature: "(e: React.MouseEvent<HTMLElement>) => void",
		fn: () => {
			console.log("[Clinic] Logging out...");
			if (typeof window !== "undefined") {
				// await logout();
				window.location.href = "/login";
			}
		}
	}
};
