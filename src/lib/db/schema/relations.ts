// src/lib/db/schema/relations.ts
import { defineRelations } from "drizzle-orm";

import * as schema from "../schema";

export const relations = defineRelations(schema, r => ({
	// ============================================================
	// Staff Relations
	// ============================================================
	staff: {
		patients: r.many.patients({
			from: r.staff.id,
			to: r.patients.pediatricianId
		}),
		encounters: r.many.encounters({
			from: r.staff.id,
			to: r.encounters.providerId
		}),
		prescriptions: r.many.prescriptions({
			from: r.staff.id,
			to: r.prescriptions.prescriberId
		}),
		user: r.one.user({
			from: r.staff.userId,
			to: r.user.id,
			optional: false
		}),
		appointments: r.many.appointments({
			from: r.staff.id,
			to: r.appointments.staffId
		}),
		labOrders: r.many.labOrders({
			from: r.staff.id,
			to: r.labOrders.orderedBy
		})
	},

	// ============================================================
	// Patient Relations
	// ============================================================
	patients: {
		pediatrician: r.one.staff({
			from: r.patients.pediatricianId,
			to: r.staff.id
		}),
		guardians: r.many.guardians({
			from: r.patients.id,
			to: r.guardians.patientId
		}),
		patientAllergies: r.many.patientAllergies({
			from: r.patients.id,
			to: r.patientAllergies.patientId
		}),
		chronicConditions: r.many.patientChronicConditions({
			from: r.patients.id,
			to: r.patientChronicConditions.patientId
		}),
		encounters: r.many.encounters({
			from: r.patients.id,
			to: r.encounters.patientId
		}),
		vitals: r.many.vitals({
			from: r.patients.id,
			to: r.vitals.patientId
		}),
		growthMeasurements: r.many.growthMeasurements({
			from: r.patients.id,
			to: r.growthMeasurements.patientId
		}),
		immunizations: r.many.immunizations({
			from: r.patients.id,
			to: r.immunizations.patientId
		}),
		prescriptions: r.many.prescriptions({
			from: r.patients.id,
			to: r.prescriptions.patientId
		}),
		labOrders: r.many.labOrders({
			from: r.patients.id,
			to: r.labOrders.patientId
		}),
		user: r.one.user({
			from: r.patients.userId,
			to: r.user.id,
			optional: false
		}),
		appointments: r.many.appointments({
			from: r.patients.id,
			to: r.appointments.patientId
		}),
		medicalRecords: r.many.medicalRecords({
			from: r.patients.id,
			to: r.medicalRecords.patientId
		})
	},

	// ============================================================
	// Guardian Relations
	// ============================================================
	guardians: {
		// Each guardian belongs to one patient
		patient: r.one.patients({
			from: r.guardians.patientId,
			to: r.patients.id,
			optional: false
		}),
		// Each guardian is linked to one user
		user: r.one.user({
			from: r.guardians.userId,
			to: r.user.id
		})
	},

	// ============================================================
	// Allergy Relations
	// ============================================================
	patientAllergies: {
		patient: r.one.patients({
			from: r.patientAllergies.patientId,
			to: r.patients.id,
			optional: false
		})
	},

	// ============================================================
	// Chronic Condition Relations
	// ============================================================
	patientChronicConditions: {
		patient: r.one.patients({
			from: r.patientChronicConditions.patientId,
			to: r.patients.id,
			optional: false
		})
	},

	// ============================================================
	// Encounter Relations
	// ============================================================
	encounters: {
		patient: r.one.patients({
			from: r.encounters.patientId,
			to: r.patients.id,
			optional: false
		}),
		provider: r.one.staff({
			from: r.encounters.providerId,
			to: r.staff.id,
			optional: false
		}),
		vitals: r.many.vitals({
			from: r.encounters.id,
			to: r.vitals.encounterId
		}),
		growthMeasurements: r.many.growthMeasurements({
			from: r.encounters.id,
			to: r.growthMeasurements.encounterId
		}),
		prescriptions: r.many.prescriptions({
			from: r.encounters.id,
			to: r.prescriptions.encounterId
		}),
		labOrders: r.many.labOrders({
			from: r.encounters.id,
			to: r.labOrders.encounterId
		}),
		medicalRecords: r.many.medicalRecords({
			from: r.encounters.id,
			to: r.medicalRecords.encounterId
		})
	},

	// ============================================================
	// Vital Signs Relations
	// ============================================================
	vitals: {
		patient: r.one.patients({
			from: r.vitals.patientId,
			to: r.patients.id,
			optional: false
		}),
		encounter: r.one.encounters({
			from: r.vitals.encounterId,
			to: r.encounters.id
		})
	},

	// ============================================================
	// Growth Measurement Relations
	// ============================================================
	growthMeasurements: {
		patient: r.one.patients({
			from: r.growthMeasurements.patientId,
			to: r.patients.id,
			optional: false
		}),
		encounter: r.one.encounters({
			from: r.growthMeasurements.encounterId,
			to: r.encounters.id
		})
	},

	// ============================================================
	// Immunization Relations
	// ============================================================
	immunizations: {
		patient: r.one.patients({
			from: r.immunizations.patientId,
			to: r.patients.id,
			optional: false
		})
	},

	// ============================================================
	// Prescription Relations
	// ============================================================
	prescriptions: {
		patient: r.one.patients({
			from: r.prescriptions.patientId,
			to: r.patients.id,
			optional: false
		}),
		encounter: r.one.encounters({
			from: r.prescriptions.encounterId,
			to: r.encounters.id
		}),
		prescriber: r.one.staff({
			from: r.prescriptions.prescriberId,
			to: r.staff.id,
			optional: false
		})
	},

	// ============================================================
	// Appointment Relations
	// ============================================================
	appointments: {
		patient: r.one.patients({
			from: r.appointments.patientId,
			to: r.patients.id,
			optional: false
		}),
		staff: r.one.staff({
			from: r.appointments.staffId,
			to: r.staff.id,
			optional: false
		})
	},

	// ============================================================
	// Lab Order Relations
	// ============================================================
	labOrders: {
		patient: r.one.patients({
			from: r.labOrders.patientId,
			to: r.patients.id,
			optional: false
		}),
		encounter: r.one.encounters({
			from: r.labOrders.encounterId,
			to: r.encounters.id
		}),
		staff: r.one.staff({
			from: r.labOrders.orderedBy,
			to: r.staff.id,
			optional: false
		})
	},

	// ============================================================
	// Medical Record Relations
	// ============================================================
	medicalRecords: {
		patient: r.one.patients({
			from: r.medicalRecords.patientId,
			to: r.patients.id,
			optional: false
		}),
		encounter: r.one.encounters({
			from: r.medicalRecords.encounterId,
			to: r.encounters.id
		}),
		uploadedByStaff: r.one.staff({
			from: r.medicalRecords.uploadedBy,
			to: r.staff.id,
			optional: false
		})
	},

	// ============================================================
	// Audit Log Relations
	// ============================================================
	auditLogs: {
		// Could add staff relation if needed
	}
}));
