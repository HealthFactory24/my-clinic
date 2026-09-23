// packages/db/src/repositories/index.ts

export { appointmentRepository } from "./appointment.repository";
export { authRepository } from "./auth.repository";
export { dashboardRepository } from "./dashboard.repo";
export { encounterRepository } from "./encounter.repository";
export { growthRepository } from "./growth.repository";
export { immunizationRepository } from "./immunization.repository";
export { labRepository } from "./lab.repository";
export { patientRepository } from "./patient.repository";
export { prescriptionRepository } from "./prescription.repository";
export { staffRepository } from "./staff.repository";
export { vitalRepository } from "./vital.repository";
export { whoGrowthRepository } from "./who.repository";

// Convenience object for all repositories
import { appointmentRepository } from "./appointment.repository";
import { encounterRepository } from "./encounter.repository";
import { growthRepository } from "./growth.repository";
import { immunizationRepository } from "./immunization.repository";
import { labRepository } from "./lab.repository";
import { patientRepository } from "./patient.repository";
import { prescriptionRepository } from "./prescription.repository";
import { staffRepository } from "./staff.repository";
import { vitalRepository } from "./vital.repository";
import { whoGrowthRepository } from "./who.repository";

export const repositories = {
	appointment: appointmentRepository,
	encounter: encounterRepository,
	growth: growthRepository,
	immunization: immunizationRepository,
	lab: labRepository,
	patient: patientRepository,
	prescription: prescriptionRepository,
	staff: staffRepository,
	vital: vitalRepository,
	whoGrowth: whoGrowthRepository
};

export type Repositories = typeof repositories;
