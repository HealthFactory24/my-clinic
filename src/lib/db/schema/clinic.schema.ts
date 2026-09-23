// src/lib/db/schema/clinic.schema.ts
// src/lib/db/schema/clinic.schema.ts
import {
	boolean,
	index,
	integer,
	json,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	varchar
} from "drizzle-orm/pg-core";

import { createId } from "#/utils/id.ts";

import { user } from "./auth.schema";
import type {
	ACTIVE_STATUSES,
	APPOINTMENT_STATUSES,
	AUDIT_ACTIONS,
	AUDIT_ENTITIES,
	BLOOD_GROUPS,
	ENCOUNTER_STATUSES,
	GENDERS,
	IMMUNIZATION_STATUSES,
	LAB_PRIORITIES,
	LAB_STATUSES,
	MEDICAL_RECORD_STATUSES,
	MEDICAL_RECORD_TYPES,
	METRIC_TYPES,
	PRESCRIPTION_STATUSES,
	ROLES,
	VISIT_TYPES
} from "./enums";

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
	| JsonPrimitive
	| Array<JsonValue>
	| { [key: string]: JsonValue };
// ============================================================
// TABLES with snake_case naming
// ============================================================
export const clinics = pgTable(
	"clinics",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("clinic")),
		name: text("name").notNull(),
		address: text("address"),
		phone: text("phone"),
		email: text("email"),
		website: text("website"),
		logo: text("logo"),
		timezone: text("timezone").default("UTC"),
		currency: text("currency").default("USD"),
		active: boolean("active").notNull().default(true),
		settings: jsonb("settings").default({}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	table => [
		index("idx_clinics_name").on(table.name),
		index("idx_clinics_active").on(table.active)
	]
);

export const staff = pgTable(
	"staff",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("staff")),
		name: text("name").notNull(),
		title: text("title").notNull(),
		role: text("role").notNull().$type<(typeof ROLES)[number]>(),
		licenseNumber: text("license_number").notNull(),
		avatarColor: text("avatar_color").notNull(),
		pinHash: text("pin_hash").notNull(),
		clinicId: text().references(() => clinics.id, { onDelete: "cascade" }),
		// ─── Contact & profile ──────────────────────────────────────────────
		phone: varchar("phone", { length: 32 }),
		bio: text("bio"),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		email: text("email").unique().notNull(),
		isActive: boolean("is_active").notNull().default(true),
		specialty: text("specialty").default("General Pediatrics"),
		department: text("department").default("General"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	table => [
		index("idx_staff_email").on(table.email),
		index("idx_staff_role").on(table.role),
		index("idx_staff_is_active").on(table.isActive),
		index("idx_staff_user_id").on(table.userId)
	]
);

export const patients = pgTable(
	"patients",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("patient")),
		mrn: text("mrn").unique().notNull(),
		firstName: text("first_name").notNull(),
		lastName: text("last_name").notNull(),
		dateOfBirth: text("date_of_birth").notNull(),
		gender: text("gender").notNull().$type<(typeof GENDERS)[number]>(),
		bloodGroup: text("blood_group")
			.notNull()
			.default("Unknown")
			.$type<(typeof BLOOD_GROUPS)[number]>(),
		gestationWeeksAtBirth: real("gestation_weeks_at_birth").default(40),
		birthWeightKg: real("birth_weight_kg"),
		birthLengthCm: real("birth_length_cm"),
		contactNumber: text("contact_number"),
		birthHeadCircumferenceCm: real("birth_head_circ_cm"),
		deliveryMethod: text("delivery_method").$type<
			"Vaginal" | "Cesarean" | "Assisted"
		>(),
		preferredLanguage: text("preferred_language").default("English"),
		activeStatus: text("active_status")
			.notNull()
			.default("Active")
			.$type<(typeof ACTIVE_STATUSES)[number]>(),
		notes: text("notes"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		allergies: jsonb("allergies")
			.default([])
			.$type<Array<{ allergen: string; severity: string; reaction: string }>>(),
		pediatricianId: text("pediatrician_id").references(() => staff.id, {
			onDelete: "set null"
		}),
		clinicId: text("clinic_id").references(() => clinics.id, {
			onDelete: "set null"
		}),
		email: text("email").unique(),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	table => [
		index("idx_patients_mrn").on(table.mrn),
		// Composite covering index for common list queries (active patients sorted by name)
		index("idx_patients_active_name").on(
			table.activeStatus,
			table.lastName,
			table.firstName
		),
		index("idx_patients_dob").on(table.dateOfBirth),
		index("idx_patients_pediatrician_active").on(
			table.pediatricianId,
			table.activeStatus
		),
		index("idx_patients_user_id").on(table.userId),
		index("idx_patients_clinic_id").on(table.clinicId)
	]
);

export const guardians = pgTable(
	"guardians",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("guardian")),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		relationship: text("relationship")
			.notNull()
			.$type<
				| "Mother"
				| "Father"
				| "Grandparent"
				| "Legal Guardian"
				| "Foster Parent"
				| "Other"
			>(),
		phone: text("phone").notNull(),
		email: text("email"),
		address: text("address"),
		isPrimary: boolean("is_primary").notNull().default(true),
		emergencyContact: boolean("emergency_contact").notNull().default(true),
		contactOrder: integer("contact_order").default(1),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
	},
	table => [
		// Composite: most queries filter by patient then sort/filter by isPrimary
		index("idx_guardians_patient_primary").on(table.patientId, table.isPrimary),
		index("idx_guardians_user_id").on(table.userId)
	]
);

export const patientAllergies = pgTable(
	"patient_allergies",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("allergy")),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		allergen: text("allergen").notNull(),
		category: text("category")
			.notNull()
			.$type<"Medication" | "Food" | "Environmental" | "Other">(),
		severity: text("severity")
			.notNull()
			.$type<"Mild" | "Moderate" | "Severe" | "Anaphylactic">(),
		reaction: text("reaction").notNull(),
		identifiedDate: text("identified_date"),
		onsetDate: text("onset_date"),
		resolutionDate: text("resolution_date"),
		status: text("status")
			.default("Active")
			.$type<"Active" | "Resolved" | "Inactive">(),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
	},
	table => [
		// Active allergies per patient is the dominant query pattern
		index("idx_allergies_patient_status").on(table.patientId, table.status),
		index("idx_allergies_category").on(table.category),
		index("idx_allergies_severity").on(table.severity)
	]
);

export const patientChronicConditions = pgTable(
	"patient_chronic_conditions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("condition")),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		condition: text("condition").notNull(),
		icdCode: text("icd_code"),
		diagnosedDate: text("diagnosed_date").notNull(),
		status: text("status")
			.notNull()
			.default("Active")
			.$type<"Active" | "Resolved" | "In Remission">(),
		severity: text("severity").$type<"Mild" | "Moderate" | "Severe">(),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
	},
	table => [
		// Composite: always queried by patient, often filtered by status
		index("idx_conditions_patient_status").on(table.patientId, table.status),
		index("idx_conditions_icd").on(table.icdCode)
	]
);

export const encounters = pgTable(
	"encounters",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("encounter")),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		providerId: text("provider_id")
			.notNull()
			.references(() => staff.id, { onDelete: "cascade" }),
		providerName: text("provider_name").notNull(),
		encounterDate: timestamp("encounter_date", {
			withTimezone: true
		}).notNull(),
		visitType: text("visit_type")
			.notNull()
			.$type<(typeof VISIT_TYPES)[number]>(),
		chiefComplaint: text("chief_complaint").notNull(),
		subjectiveJson: json("subjective_json").notNull().$type<SubjectiveData>(),
		objectiveJson: json("objective_json").notNull().$type<ObjectiveData>(),
		assessmentJson: json("assessment_json").notNull().$type<AssessmentData>(),
		planJson: json("plan_json").notNull().$type<PlanData>(),
		status: text("status")
			.notNull()
			.default("Completed")
			.$type<(typeof ENCOUNTER_STATUSES)[number]>(),
		signedAt: timestamp("signed_at", { withTimezone: true }),
		signedBy: text("signed_by"),
		durationMinutes: integer("duration_minutes"),
		followUpDate: text("follow_up_date"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	table => [
		// Primary timeline query: patient + date desc
		index("idx_encounters_patient_date").on(
			table.patientId,
			table.encounterDate
		),
		// Provider schedule/history view
		index("idx_encounters_provider_date").on(
			table.providerId,
			table.encounterDate
		),
		index("idx_encounters_type").on(table.visitType),
		index("idx_encounters_status").on(table.status)
	]
);

export const vitals = pgTable(
	"vitals",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("vital")),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		encounterId: text("encounter_id").references(() => encounters.id, {
			onDelete: "set null"
		}),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		temperatureC: real("temperature_c").notNull(),
		temperatureMethod: text("temperature_method").default("Axillary"),
		heartRateBpm: integer("heart_rate_bpm").notNull(),
		respiratoryRateBpm: integer("respiratory_rate_bpm").notNull(),
		systolicBp: integer("systolic_bp"),
		diastolicBp: integer("diastolic_bp"),
		meanArterialPressure: integer("mean_arterial_pressure"),
		oxygenSaturationPercent: integer("oxygen_saturation_percent").notNull(),
		painScore: integer("pain_score").default(0),
		painScaleType: text("pain_scale_type").default("Wong-Baker"),
		weightKg: real("weight_kg"),
		heightCm: real("height_cm"),
		headCircumferenceCm: real("head_circumference_cm"),
		bmi: real("bmi"),
		notes: text("notes"),
		recordedBy: text("recorded_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
	},
	table => [
		// Trend queries: patient vitals ordered by time
		index("idx_vitals_patient_date").on(table.patientId, table.recordedAt),
		index("idx_vitals_encounter").on(table.encounterId)
	]
);

export const growthMeasurements = pgTable(
	"growth_measurements",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("growth")),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		encounterId: text("encounter_id").references(() => encounters.id, {
			onDelete: "set null"
		}),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		ageMonths: real("age_months").notNull(),
		ageDays: integer("age_days"),
		weightKg: real("weight_kg").notNull(),
		heightCm: real("height_cm").notNull(),
		headCircumferenceCm: real("head_circ_cm"),
		bmi: real("bmi").notNull(),
		weightForAgeZScore: real("weight_for_age_zscore"),
		weightForAgePercentile: real("weight_for_age_percentile"),
		heightForAgeZScore: real("height_for_age_zscore"),
		heightForAgePercentile: real("height_for_age_percentile"),
		bmiForAgeZScore: real("bmi_for_age_zscore"),
		bmiForAgePercentile: real("bmi_for_age_percentile"),
		headCircumferenceZScore: real("head_circ_zscore"),
		headCircumferencePercentile: real("head_circ_percentile"),
		// Weight velocity (kg/month)
		weightVelocity: real("weight_velocity"),
		heightVelocity: real("height_velocity"),
		recordedBy: text("recorded_by").notNull(),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
	},
	table => [
		// Growth chart queries: patient ordered by age
		index("idx_growth_patient_age").on(table.patientId, table.ageMonths),
		index("idx_growth_encounter").on(table.encounterId)
	]
);

export const immunizations = pgTable(
	"immunizations",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("immunization")),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		vaccineCode: text("vaccine_code").notNull(),
		vaccineName: text("vaccine_name").notNull(),
		targetDisease: text("target_disease").notNull(),
		doseNumber: integer("dose_number").notNull(),
		totalDoses: integer("total_doses"),
		recommendedAgeLabel: text("recommended_age_label").notNull(),
		recommendedAgeMonths: real("recommended_age_months").notNull(),
		dueDate: text("due_date").notNull(),
		administeredDate: text("administered_date"),
		status: text("status")
			.notNull()
			.default("Due")
			.$type<(typeof IMMUNIZATION_STATUSES)[number]>(),
		manufacturer: text("manufacturer"),
		brandName: text("brand_name"),
		batchNumber: text("batch_number"),
		expiryDate: text("expiry_date"),
		administrationSite: text("administration_site"),
		administrationRoute: text("administration_route"),
		administeredBy: text("administered_by"),
		adverseReactions: text("adverse_reactions"),
		parentConsent: boolean("parent_consent").default(false),
		consentFormId: text("consent_form_id"),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	table => [
		// Dashboard: due/overdue immunizations per patient
		index("idx_immunizations_patient_status").on(table.patientId, table.status),
		// Schedule lookups by due date
		index("idx_immunizations_due_date").on(table.dueDate),
		index("idx_immunizations_vaccine_code").on(table.vaccineCode)
	]
);

export const prescriptions = pgTable(
	"prescriptions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("rx")),
		rxNumber: text("rx_number").unique().notNull(),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		encounterId: text("encounter_id").references(() => encounters.id, {
			onDelete: "set null"
		}),
		prescribedDate: text("prescribed_date").notNull(),
		prescriberId: text("prescriber_id")
			.notNull()
			.references(() => staff.id, { onDelete: "cascade" }),
		prescriberName: text("prescriber_name").notNull(),
		prescriberLicense: text("prescriber_license").notNull(),
		patientWeightKg: real("patient_weight_kg").notNull(),
		diagnosis: text("diagnosis"),
		prescriptionItems: json("prescription_items")
			.notNull()
			.$type<Array<PrescriptionItem>>(),
		notes: text("notes"),
		status: text("status")
			.notNull()
			.default("Active")
			.$type<(typeof PRESCRIPTION_STATUSES)[number]>(),
		filledAt: timestamp("filled_at", { withTimezone: true }),
		filledBy: text("filled_by"),
		discontinuedAt: timestamp("discontinued_at", { withTimezone: true }),
		discontinuedReason: text("discontinued_reason"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	table => [
		// Active prescriptions per patient is the dominant query
		index("idx_prescriptions_patient_status").on(table.patientId, table.status),
		index("idx_prescriptions_prescriber").on(table.prescriberId),
		index("idx_prescriptions_rx_number").on(table.rxNumber),
		index("idx_prescriptions_encounter").on(table.encounterId)
	]
);

export const appointments = pgTable(
	"appointments",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("appointment")),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		staffId: text("staff_id")
			.notNull()
			.references(() => staff.id, { onDelete: "cascade" }),
		startTime: timestamp("start_time", { withTimezone: true })
			.notNull()
			.defaultNow(),
		endTime: timestamp("end_time", { withTimezone: true })
			.notNull()
			.defaultNow(),
		appointmentDate: timestamp("appointment_date", { withTimezone: true })
			.notNull()
			.defaultNow(),
		status: text("status")
			.notNull()
			.$type<(typeof APPOINTMENT_STATUSES)[number]>(),
		type: text("type").notNull().$type<(typeof VISIT_TYPES)[number]>(),
		notes: text("notes"),
		priority: text("priority")
			.default("Normal")
			.$type<"Normal" | "Urgent" | "Emergency">(),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	table => [
		// Calendar view: staff schedule by time range
		index("idx_appointments_staff_time").on(table.staffId, table.startTime),
		// Patient appointment history
		index("idx_appointments_patient_time").on(table.patientId, table.startTime),
		index("idx_appointments_status").on(table.status),
		index("appointment_patient_status_idx").on(table.patientId, table.status),
		index("appointment_provider_date_status_idx").on(
			table.staffId,
			table.appointmentDate,
			table.status
		)
	]
);

export const labOrders = pgTable(
	"lab_orders",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("lab")),
		orderNumber: text("order_number").unique().notNull(),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		encounterId: text("encounter_id").references(() => encounters.id, {
			onDelete: "set null"
		}),
		orderDate: timestamp("order_date", { withTimezone: true })
			.notNull()
			.defaultNow(),
		orderedBy: text("ordered_by").notNull(),
		clinicalIndication: text("clinical_indication").notNull(),
		testsJson: json("tests_json").notNull().$type<Array<LabTest>>(),
		status: text("status")
			.notNull()
			.default("Ordered")
			.$type<(typeof LAB_STATUSES)[number]>(),
		priority: text("priority")
			.notNull()
			.default("Routine")
			.$type<(typeof LAB_PRIORITIES)[number]>(),
		completedDate: timestamp("completed_date", { withTimezone: true }),
		specimenCollectionNotes: text("specimen_collection_notes"),
		specimenType: text("specimen_type"),
		specimenCollectedAt: timestamp("specimen_collected_at", {
			withTimezone: true
		}),
		resultsReleasedAt: timestamp("results_released_at", { withTimezone: true }),
		notes: text("notes"),
		instructions: text("instructions"),
		results: json("results").$type<Array<LabTest>>(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	table => [
		index("idx_lab_orders_patient_status").on(table.patientId, table.status),
		index("idx_lab_orders_priority_status").on(table.priority, table.status),
		index("idx_lab_orders_encounter").on(table.encounterId)
	]
);

export const auditLogs = pgTable(
	"audit_logs",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("audit")),
		timestamp: timestamp("timestamp", { withTimezone: true })
			.notNull()
			.defaultNow(),
		staffId: text("staff_id").notNull(),
		staffName: text("staff_name").notNull(),
		action: text("action").notNull().$type<(typeof AUDIT_ACTIONS)[number]>(),
		entity: text("entity").notNull().$type<(typeof AUDIT_ENTITIES)[number]>(),
		entityId: text("entity_id"),
		details: text("details").notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		sessionId: text("session_id"),
		beforeState: jsonb("before_state"),
		afterState: jsonb("after_state")
	},
	table => [
		// Audit trail queries: entity record history and staff activity
		index("idx_audit_entity_id_timestamp").on(
			table.entity,
			table.entityId,
			table.timestamp
		),
		index("idx_audit_staff_timestamp").on(table.staffId, table.timestamp),
		index("idx_audit_action").on(table.action)
	]
);

export const whoGrowthData = pgTable(
	"who_growth_data",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		gender: text("gender").notNull().$type<"male" | "female">(),
		metricType: text("metric_type")
			.notNull()
			.$type<(typeof METRIC_TYPES)[number]>(),
		ageDays: integer("age_days"),
		ageMonths: real("age_months").notNull(),
		// LMS Parameters
		L: real("l_value").notNull(),
		M: real("m_value").notNull(),
		S: real("s_value").notNull(),
		// Standard Deviation values for quick lookup
		sd4neg: real("sd_4neg"),
		sd3neg: real("sd_3neg"),
		sd2neg: real("sd_2neg"),
		sd1neg: real("sd_1neg"),
		sd0: real("sd_0"),
		sd1: real("sd_1"),
		sd2: real("sd_2"),
		sd3: real("sd_3"),
		sd4: real("sd_4"),
		// Metadata
		dataSource: text("data_source").default("WHO"),
		version: text("version").default("2006"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	table => [
		uniqueIndex("who_gender_metric_age_idx").on(
			table.gender,
			table.metricType,
			table.ageMonths
		),
		index("who_gender_idx").on(table.gender),
		index("who_metric_idx").on(table.metricType),
		index("who_age_idx").on(table.ageMonths)
	]
);

// ============================================================
// MEDICAL RECORDS
// Stores documents and attachments linked to a patient and
// optionally to a specific encounter. Separate from SOAP note
// JSON blobs — this tracks external/uploaded files and reports.
// ============================================================
export const medicalRecords = pgTable(
	"medical_records",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId("record")),
		patientId: text("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		encounterId: text("encounter_id").references(() => encounters.id, {
			onDelete: "set null"
		}),
		uploadedBy: text("uploaded_by")
			.notNull()
			.references(() => staff.id, { onDelete: "cascade" }),
		// Document classification
		recordType: text("record_type")
			.notNull()
			.$type<(typeof MEDICAL_RECORD_TYPES)[number]>(),
		title: text("title").notNull(),
		description: text("description"),
		// File storage reference (e.g. S3 key, object URL)
		fileUrl: text("file_url").notNull(),
		fileName: text("file_name").notNull(),
		fileMimeType: text("file_mime_type").notNull(),
		fileSizeBytes: integer("file_size_bytes"),
		// Optional external system reference (e.g. HL7, FHIR resource ID)
		externalId: text("external_id"),
		externalSystem: text("external_system"),
		// Document date (e.g. date the report was issued, may differ from upload)
		documentDate: text("document_date"),
		status: text("status")
			.notNull()
			.default("Active")
			.$type<(typeof MEDICAL_RECORD_STATUSES)[number]>(),
		// Structured metadata for flexible per-type fields (e.g. imaging modality)
		metadata: jsonb("metadata").default({}).$type<Record<string, JsonValue>>(),
		tags: text("tags").array().default([]),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	table => [
		// Primary access pattern: patient record timeline by type and date
		index("idx_medical_records_patient_type").on(
			table.patientId,
			table.recordType
		),
		index("idx_medical_records_patient_status").on(
			table.patientId,
			table.status
		),
		// Encounter documents sidebar
		index("idx_medical_records_encounter").on(table.encounterId),
		// External system deduplication
		index("idx_medical_records_external").on(
			table.externalSystem,
			table.externalId
		),
		index("idx_medical_records_uploaded_by").on(table.uploadedBy)
	]
);
export type PrescriptionItem = {
	calculatedDoseMg?: number;
	calculatedLiquidDoseMl: number;
	concentration?: string;
	dispenseQuantity?: string;
	dose?: string;
	dosePerKg?: number;
	durationDays: number;
	form: string;
	frequency: string;
	genericName?: string;
	id: string;
	instructions?: string;
	medicationName: string;
	notes?: string;
	patientWeightKg?: number;
	refills?: number;
	route: string;
	substitutionAllowed?: boolean;
	warnings?: string;
};
export type LabTest = {
	category: string;
	completedAt?: string;
	flag?: "Normal" | "Abnormal" | "Critical";
	id: string;
	isAbnormal?: boolean;
	notes?: string;
	referenceRange?: string;
	result?: string;
	sampleType?: string;
	status?: "Pending" | "In Progress" | "Completed" | "Abnormal" | "Normal";
	testCode: string;
	testName: string;
	unit?: string;
};

export type SubjectiveData = {
	allergies?: Array<string>;
	familyHistory?: string;
	feedingAndNutrition?: string;
	developmentalMilestones?: string;
	sleepAndBehavior?: string;
	historyOfPresentIllness?: string;
	medications?: Array<string>;
	pastMedicalHistory?: Array<string>;
	reviewOfSystems?: Record<string, string>;
	socialHistory?: string;
};

export type ObjectiveData = {
	clinicalFindings?: string;
	generalAppearance?: string;
	notes?: string;
	physicalExam?: JsonValue;
	physicalExamination?: Record<string, string>;
};

export type DiagnosisItem = {
	id?: string;
	icdCode?: string;

	name: string;
	primary?: boolean;
};

export type AssessmentData = {
	clinicalImpression?: string;
	diagnoses?: Array<DiagnosisItem>;
	primaryDiagnosis?: string;
	primaryIcd10?: string;
	secondaryDiagnoses?: Array<string>;
	summary?: string;
};

export type PlanData = {
	anticipatoryGuidance?: string;
	followUpDate?: string | null;
	investigations?: Array<string>;
	medications?: Array<string>;
	medicationsSummary?: string;
	notes?: string;
	patientEducation?: Array<string>;
	redFlagWarnings?: string;
	treatmentAndInterventions?: string;
	treatments?: Array<string>;
};
