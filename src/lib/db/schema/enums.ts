// db/schema/enums.ts

import { pgEnum } from "drizzle-orm/pg-core";

export const ROLES = ["admin", "doctor", "staff", "patient"] as const;

export const GENDERS = ["male", "female"] as const;

export const BLOOD_GROUPS = [
	"A+",
	"A-",
	"B+",
	"B-",
	"AB+",
	"AB-",
	"O+",
	"O-",
	"Unknown"
] as const;

export const APPOINTMENT_STATUSES = [
	"Scheduled",
	"Checked In",
	"In Progress",
	"Completed",
	"Cancelled",
	"No Show"
] as const;

export const ACTIVE_STATUSES = ["Active", "Inactive", "Archived"] as const;

export const VISIT_TYPES = [
	"Well-Child Check",
	"Sick Visit",
	"Follow-Up",
	"Immunization Visit",
	"Consultation",
	"Lactation Consultation",
	"Emergency/Urgent",
	"Telehealth",
	"Other"
] as const;

export const ENCOUNTER_STATUSES = [
	"Draft",
	"Completed",
	"Signed",
	"Amended"
] as const;

export const IMMUNIZATION_STATUSES = [
	"Administered",
	"Due",
	"Overdue",
	"Upcoming",
	"Deferred",
	"Refused"
] as const;

export const METRIC_TYPES = [
	"weight",
	"height",
	"head_circumference",
	"bmi"
] as const;
export const PRESCRIPTION_STATUSES = [
	"Active",
	"Completed",
	"Discontinued",
	"Cancelled"
] as const;

export const LAB_STATUSES = [
	"Ordered",
	"Sample Collected",
	"Processing",
	"Completed",
	"Cancelled"
] as const;

export const LAB_PRIORITIES = ["Routine", "Urgent", "Stat"] as const;

export const AUDIT_ACTIONS = [
	"CREATE",
	"UPDATE",
	"DELETE",
	"VIEW",
	"EXPORT",
	"LOGIN",
	"RESTORE"
] as const;

export const AUDIT_ENTITIES = [
	"PATIENT",
	"ENCOUNTER",
	"IMMUNIZATION",
	"PRESCRIPTION",
	"LAB",
	"DATABASE"
] as const;

export const DELIVERY_METHODS = ["Vaginal", "Cesarean", "Assisted"] as const;

export const GUARDIAN_RELATIONSHIPS = [
	"Mother",
	"Father",
	"Grandparent",
	"Legal Guardian",
	"Foster Parent",
	"Other"
] as const;

export const ALLERGY_CATEGORIES = [
	"Medication",
	"Food",
	"Environmental",
	"Other"
] as const;

export const ALLERGY_SEVERITIES = [
	"Mild",
	"Moderate",
	"Severe",
	"Anaphylactic"
] as const;

export const ALLERGY_STATUSES = ["Active", "Resolved", "Inactive"] as const;

export const CONDITION_STATUSES = [
	"Active",
	"Resolved",
	"In Remission"
] as const;

export const CONDITION_SEVERITIES = ["Mild", "Moderate", "Severe"] as const;

export const LAB_TEST_FLAGS = ["Normal", "Abnormal", "Critical"] as const;

export const LAB_TEST_STATUSES = [
	"Pending",
	"In Progress",
	"Completed",
	"Abnormal",
	"Normal"
] as const;
export const roleEnum = pgEnum("role", ROLES);
export const genderEnum = pgEnum("gender", GENDERS);
export const appointmentStatusEnum = pgEnum(
	"appointment_status",
	APPOINTMENT_STATUSES
);
export const bloodGroupEnum = pgEnum("blood_group", BLOOD_GROUPS);

export const activeStatusEnum = pgEnum("active_status", ACTIVE_STATUSES);
export const visitTypeEnum = pgEnum("visit_type", VISIT_TYPES);
export const encounterStatusEnum = pgEnum(
	"encounter_status",
	ENCOUNTER_STATUSES
);
export const immunizationStatusEnum = pgEnum(
	"immunization_status",
	IMMUNIZATION_STATUSES
);

export const metricTypeEnum = pgEnum("metric_type", METRIC_TYPES);
export const prescriptionStatusEnum = pgEnum(
	"prescription_status",
	PRESCRIPTION_STATUSES
);
export const labStatusEnum = pgEnum("lab_status", LAB_STATUSES);
export const labPriorityEnum = pgEnum("lab_priority", LAB_PRIORITIES);
export const auditActionEnum = pgEnum("audit_action", AUDIT_ACTIONS);
export const auditEntityEnum = pgEnum("audit_entity", AUDIT_ENTITIES);
export const APPOINTMENT_TYPES = visitTypeEnum.enumValues;

// ============================================================
// Medical record document types and statuses
// ============================================================
export const MEDICAL_RECORD_TYPES = [
	"Lab Report",
	"Imaging",
	"Referral",
	"Discharge Summary",
	"Consent Form",
	"Insurance",
	"Operative Report",
	"Pathology",
	"External Record",
	"Other"
] as const;

export const MEDICAL_RECORD_STATUSES = [
	"Active",
	"Archived",
	"Superseded"
] as const;

export const medicalRecordTypeEnum = pgEnum(
	"medical_record_type",
	MEDICAL_RECORD_TYPES
);
export const medicalRecordStatusEnum = pgEnum(
	"medical_record_status",
	MEDICAL_RECORD_STATUSES
);
export const allergyCategoryEnum = pgEnum(
	"allergy_category",
	ALLERGY_CATEGORIES
);
export const allergySeverityEnum = pgEnum(
	"allergy_severity",
	ALLERGY_SEVERITIES
);
export const allergyStatusEnum = pgEnum("allergy_status", ALLERGY_STATUSES);
export const conditionStatusEnum = pgEnum(
	"condition_status",
	CONDITION_STATUSES
);
export const deliveryMethodEnum = pgEnum("delivery_method", DELIVERY_METHODS);
