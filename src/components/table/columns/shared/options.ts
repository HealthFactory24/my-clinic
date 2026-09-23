import type {
	ACTIVE_STATUSES,
	ALLERGY_CATEGORIES,
	ALLERGY_SEVERITIES,
	ALLERGY_STATUSES,
	APPOINTMENT_STATUSES,
	AUDIT_ACTIONS,
	AUDIT_ENTITIES,
	BLOOD_GROUPS,
	CONDITION_SEVERITIES,
	CONDITION_STATUSES,
	DELIVERY_METHODS,
	ENCOUNTER_STATUSES,
	GENDERS,
	GUARDIAN_RELATIONSHIPS,
	IMMUNIZATION_STATUSES,
	LAB_PRIORITIES,
	LAB_STATUSES,
	LAB_TEST_FLAGS,
	LAB_TEST_STATUSES,
	MEDICAL_RECORD_STATUSES,
	MEDICAL_RECORD_TYPES,
	METRIC_TYPES,
	PRESCRIPTION_STATUSES,
	ROLES,
	VISIT_TYPES
} from "@/lib/db/schema/enums";

/* ------------------------------------------------------------------ */
/* Core types                                                          */
/* ------------------------------------------------------------------ */

export type Option<T extends string = string> = {
	readonly value: T;
	readonly label: string;
};

/** Generic option list — the single canonical shape used everywhere. */
export type OptionList<T extends string = string> = ReadonlyArray<Option<T>>;

/* ------------------------------------------------------------------ */
/* defineOptions — exhaustive by construction, zero unsafe casts       */
/* ------------------------------------------------------------------ */

/**
 * Build an exhaustive option list from a label map keyed by every enum value.
 *
 * The compiler errors if a member is missing from the map.
 */
function defineOptions<T extends string>(
	labels: Record<T, string>
): OptionList<T> {
	const options: Array<Option<T>> = [];
	for (const key in labels) {
		options.push({ value: key, label: labels[key] });
	}
	return options;
}

/* ------------------------------------------------------------------ */
/* Enum label maps — single source of truth                            */
/* ------------------------------------------------------------------ */

const GENDER_LABELS: Record<(typeof GENDERS)[number], string> = {
	male: "Male",
	female: "Female"
};

const BLOOD_GROUP_LABELS: Record<(typeof BLOOD_GROUPS)[number], string> = {
	"A+": "A+",
	"A-": "A-",
	"B+": "B+",
	"B-": "B-",
	"AB+": "AB+",
	"AB-": "AB-",
	"O+": "O+",
	"O-": "O-",
	Unknown: "Unknown"
};

const DELIVERY_METHOD_LABELS: Record<
	(typeof DELIVERY_METHODS)[number],
	string
> = {
	Vaginal: "Vaginal",
	Cesarean: "Cesarean",
	Assisted: "Assisted"
};

const ACTIVE_STATUS_LABELS: Record<(typeof ACTIVE_STATUSES)[number], string> = {
	Active: "Active",
	Inactive: "Inactive",
	Archived: "Archived"
};

const GUARDIAN_RELATIONSHIP_LABELS: Record<
	(typeof GUARDIAN_RELATIONSHIPS)[number],
	string
> = {
	Mother: "Mother",
	Father: "Father",
	Grandparent: "Grandparent",
	"Legal Guardian": "Legal Guardian",
	"Foster Parent": "Foster Parent",
	Other: "Other"
};

const VISIT_TYPE_LABELS: Record<(typeof VISIT_TYPES)[number], string> = {
	"Well-Child Check": "Well-Child Check",
	"Sick Visit": "Sick Visit",
	"Follow-Up": "Follow-Up",
	"Immunization Visit": "Immunization Visit",
	Consultation: "Consultation",
	"Lactation Consultation": "Lactation Consultation",
	"Emergency/Urgent": "Emergency / Urgent",
	Telehealth: "Telehealth",
	Other: "Other"
};

const APPOINTMENT_STATUS_LABELS: Record<
	(typeof APPOINTMENT_STATUSES)[number],
	string
> = {
	Scheduled: "Scheduled",
	"Checked In": "Checked In",
	"In Progress": "In Progress",
	Completed: "Completed",
	Cancelled: "Cancelled",
	"No Show": "No Show"
};

const ENCOUNTER_STATUS_LABELS: Record<
	(typeof ENCOUNTER_STATUSES)[number],
	string
> = {
	Draft: "Draft",
	Completed: "Completed",
	Signed: "Signed",
	Amended: "Amended"
};

const IMMUNIZATION_STATUS_LABELS: Record<
	(typeof IMMUNIZATION_STATUSES)[number],
	string
> = {
	Administered: "Administered",
	Due: "Due",
	Overdue: "Overdue",
	Upcoming: "Upcoming",
	Deferred: "Deferred",
	Refused: "Refused"
};

const PRESCRIPTION_STATUS_LABELS: Record<
	(typeof PRESCRIPTION_STATUSES)[number],
	string
> = {
	Active: "Active",
	Completed: "Completed",
	Discontinued: "Discontinued",
	Cancelled: "Cancelled"
};

const LAB_STATUS_LABELS: Record<(typeof LAB_STATUSES)[number], string> = {
	Ordered: "Ordered",
	"Sample Collected": "Sample Collected",
	Processing: "Processing",
	Completed: "Completed",
	Cancelled: "Cancelled"
};

const LAB_PRIORITY_LABELS: Record<(typeof LAB_PRIORITIES)[number], string> = {
	Routine: "Routine",
	Urgent: "Urgent",
	Stat: "Stat"
};

const LAB_TEST_FLAG_LABELS: Record<(typeof LAB_TEST_FLAGS)[number], string> = {
	Normal: "Normal",
	Abnormal: "Abnormal",
	Critical: "Critical"
};

const LAB_TEST_STATUS_LABELS: Record<
	(typeof LAB_TEST_STATUSES)[number],
	string
> = {
	Pending: "Pending",
	"In Progress": "In Progress",
	Completed: "Completed",
	Abnormal: "Abnormal",
	Normal: "Normal"
};

const METRIC_TYPE_LABELS: Record<(typeof METRIC_TYPES)[number], string> = {
	weight: "Weight",
	height: "Height",
	head_circumference: "Head Circumference",
	bmi: "BMI"
};

const ALLERGY_CATEGORY_LABELS: Record<
	(typeof ALLERGY_CATEGORIES)[number],
	string
> = {
	Medication: "Medication",
	Food: "Food",
	Environmental: "Environmental",
	Other: "Other"
};

const ALLERGY_SEVERITY_LABELS: Record<
	(typeof ALLERGY_SEVERITIES)[number],
	string
> = {
	Mild: "Mild",
	Moderate: "Moderate",
	Severe: "Severe",
	Anaphylactic: "Anaphylactic"
};

const ALLERGY_STATUS_LABELS: Record<(typeof ALLERGY_STATUSES)[number], string> =
	{
		Active: "Active",
		Resolved: "Resolved",
		Inactive: "Inactive"
	};

const CONDITION_STATUS_LABELS: Record<
	(typeof CONDITION_STATUSES)[number],
	string
> = {
	Active: "Active",
	Resolved: "Resolved",
	"In Remission": "In Remission"
};

const CONDITION_SEVERITY_LABELS: Record<
	(typeof CONDITION_SEVERITIES)[number],
	string
> = {
	Mild: "Mild",
	Moderate: "Moderate",
	Severe: "Severe"
};

const MEDICAL_RECORD_TYPE_LABELS: Record<
	(typeof MEDICAL_RECORD_TYPES)[number],
	string
> = {
	"Lab Report": "Lab Report",
	Imaging: "Imaging",
	Referral: "Referral",
	"Discharge Summary": "Discharge Summary",
	"Consent Form": "Consent Form",
	Insurance: "Insurance",
	"Operative Report": "Operative Report",
	Pathology: "Pathology",
	"External Record": "External Record",
	Other: "Other"
};

const MEDICAL_RECORD_STATUS_LABELS: Record<
	(typeof MEDICAL_RECORD_STATUSES)[number],
	string
> = {
	Active: "Active",
	Archived: "Archived",
	Superseded: "Superseded"
};

const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
	admin: "Administrator",
	doctor: "Doctor",
	staff: "Staff",
	patient: "Patient"
};

const AUDIT_ACTION_LABELS: Record<(typeof AUDIT_ACTIONS)[number], string> = {
	CREATE: "Create",
	UPDATE: "Update",
	DELETE: "Delete",
	VIEW: "View",
	EXPORT: "Export",
	LOGIN: "Login",
	RESTORE: "Restore"
};

const AUDIT_ENTITY_LABELS: Record<(typeof AUDIT_ENTITIES)[number], string> = {
	PATIENT: "Patient",
	ENCOUNTER: "Encounter",
	IMMUNIZATION: "Immunization",
	PRESCRIPTION: "Prescription",
	LAB: "Lab",
	DATABASE: "Database"
};

/* ------------------------------------------------------------------ */
/* Public option lists                                                 */
/* ------------------------------------------------------------------ */

export const GENDER_OPTIONS = defineOptions(GENDER_LABELS);
export const BLOOD_GROUP_OPTIONS = defineOptions(BLOOD_GROUP_LABELS);
export const DELIVERY_METHOD_OPTIONS = defineOptions(DELIVERY_METHOD_LABELS);
export const ACTIVE_STATUS_OPTIONS = defineOptions(ACTIVE_STATUS_LABELS);
export const GUARDIAN_RELATIONSHIP_OPTIONS = defineOptions(
	GUARDIAN_RELATIONSHIP_LABELS
);
export const VISIT_TYPE_OPTIONS = defineOptions(VISIT_TYPE_LABELS);
export const APPOINTMENT_STATUS_OPTIONS = defineOptions(
	APPOINTMENT_STATUS_LABELS
);
export const ENCOUNTER_STATUS_OPTIONS = defineOptions(ENCOUNTER_STATUS_LABELS);
export const IMMUNIZATION_STATUS_OPTIONS = defineOptions(
	IMMUNIZATION_STATUS_LABELS
);
/** Single source of truth for prescription status options. */
export const PRESCRIPTION_STATUS_OPTIONS = defineOptions(
	PRESCRIPTION_STATUS_LABELS
);
export const LAB_STATUS_OPTIONS = defineOptions(LAB_STATUS_LABELS);
export const LAB_PRIORITY_OPTIONS = defineOptions(LAB_PRIORITY_LABELS);
export const LAB_TEST_FLAG_OPTIONS = defineOptions(LAB_TEST_FLAG_LABELS);
export const LAB_TEST_STATUS_OPTIONS = defineOptions(LAB_TEST_STATUS_LABELS);
export const METRIC_TYPE_OPTIONS = defineOptions(METRIC_TYPE_LABELS);
export const ALLERGY_CATEGORY_OPTIONS = defineOptions(ALLERGY_CATEGORY_LABELS);
export const ALLERGY_SEVERITY_OPTIONS = defineOptions(ALLERGY_SEVERITY_LABELS);
export const ALLERGY_STATUS_OPTIONS = defineOptions(ALLERGY_STATUS_LABELS);
export const CONDITION_STATUS_OPTIONS = defineOptions(CONDITION_STATUS_LABELS);
export const CONDITION_SEVERITY_OPTIONS = defineOptions(
	CONDITION_SEVERITY_LABELS
);
export const MEDICAL_RECORD_TYPE_OPTIONS = defineOptions(
	MEDICAL_RECORD_TYPE_LABELS
);
export const MEDICAL_RECORD_STATUS_OPTIONS = defineOptions(
	MEDICAL_RECORD_STATUS_LABELS
);
export const ROLE_OPTIONS = defineOptions(ROLE_LABELS);
export const AUDIT_ACTION_OPTIONS = defineOptions(AUDIT_ACTION_LABELS);
export const AUDIT_ENTITY_OPTIONS = defineOptions(AUDIT_ENTITY_LABELS);

/* ------------------------------------------------------------------ */
/* Administration site / route — free-form strings, not enum members  */
/* ------------------------------------------------------------------ */

export const ADMINISTRATION_SITE_OPTIONS: OptionList = [
	{ value: "Right Anterolateral Thigh", label: "Right Anterolateral Thigh" },
	{ value: "Left Anterolateral Thigh", label: "Left Anterolateral Thigh" },
	{ value: "Right Deltoid", label: "Right Deltoid" },
	{ value: "Left Deltoid", label: "Left Deltoid" },
	{ value: "Oral", label: "Oral" },
	{ value: "Subcutaneous Right Arm", label: "Subcutaneous Right Arm" },
	{ value: "Subcutaneous Left Arm", label: "Subcutaneous Left Arm" }
];

export const ADMINISTRATION_ROUTE_OPTIONS: OptionList = [
	{ value: "Intramuscular", label: "Intramuscular" },
	{ value: "Subcutaneous", label: "Subcutaneous" },
	{ value: "Oral", label: "Oral" },
	{ value: "Intradermal", label: "Intradermal" }
];

/* ------------------------------------------------------------------ */
/* Label lookups — computed once, O(1) at call time                    */
/* ------------------------------------------------------------------ */

export function toLabelMap<T extends string>(
	options: OptionList<T>
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const o of options) out[o.value] = o.label;
	return out;
}

export const GENDER_LABEL_MAP = toLabelMap(GENDER_OPTIONS);
export const BLOOD_GROUP_LABEL_MAP = toLabelMap(BLOOD_GROUP_OPTIONS);
export const DELIVERY_METHOD_LABEL_MAP = toLabelMap(DELIVERY_METHOD_OPTIONS);
export const ACTIVE_STATUS_LABEL_MAP = toLabelMap(ACTIVE_STATUS_OPTIONS);
export const GUARDIAN_RELATIONSHIP_LABEL_MAP = toLabelMap(
	GUARDIAN_RELATIONSHIP_OPTIONS
);
export const VISIT_TYPE_LABEL_MAP = toLabelMap(VISIT_TYPE_OPTIONS);
export const APPOINTMENT_STATUS_LABEL_MAP = toLabelMap(
	APPOINTMENT_STATUS_OPTIONS
);
export const ENCOUNTER_STATUS_LABEL_MAP = toLabelMap(ENCOUNTER_STATUS_OPTIONS);
export const IMMUNIZATION_STATUS_LABEL_MAP = toLabelMap(
	IMMUNIZATION_STATUS_OPTIONS
);
export const PRESCRIPTION_STATUS_LABEL_MAP = toLabelMap(
	PRESCRIPTION_STATUS_OPTIONS
);
export const LAB_STATUS_LABEL_MAP = toLabelMap(LAB_STATUS_OPTIONS);
export const LAB_PRIORITY_LABEL_MAP = toLabelMap(LAB_PRIORITY_OPTIONS);
export const LAB_TEST_FLAG_LABEL_MAP = toLabelMap(LAB_TEST_FLAG_OPTIONS);
export const LAB_TEST_STATUS_LABEL_MAP = toLabelMap(LAB_TEST_STATUS_OPTIONS);
export const METRIC_TYPE_LABEL_MAP = toLabelMap(METRIC_TYPE_OPTIONS);
export const ALLERGY_CATEGORY_LABEL_MAP = toLabelMap(ALLERGY_CATEGORY_OPTIONS);
export const ALLERGY_SEVERITY_LABEL_MAP = toLabelMap(ALLERGY_SEVERITY_OPTIONS);
export const ALLERGY_STATUS_LABEL_MAP = toLabelMap(ALLERGY_STATUS_OPTIONS);
export const CONDITION_STATUS_LABEL_MAP = toLabelMap(CONDITION_STATUS_OPTIONS);
export const CONDITION_SEVERITY_LABEL_MAP = toLabelMap(
	CONDITION_SEVERITY_OPTIONS
);
export const MEDICAL_RECORD_TYPE_LABEL_MAP = toLabelMap(
	MEDICAL_RECORD_TYPE_OPTIONS
);
export const MEDICAL_RECORD_STATUS_LABEL_MAP = toLabelMap(
	MEDICAL_RECORD_STATUS_OPTIONS
);
export const ROLE_LABEL_MAP = toLabelMap(ROLE_OPTIONS);
export const AUDIT_ACTION_LABEL_MAP = toLabelMap(AUDIT_ACTION_OPTIONS);
export const AUDIT_ENTITY_LABEL_MAP = toLabelMap(AUDIT_ENTITY_OPTIONS);

/* ------------------------------------------------------------------ */
/* Legacy aliases — kept for consumers that import the older names    */
/* ------------------------------------------------------------------ */

export const STATUS_OPTIONS = ACTIVE_STATUS_OPTIONS;

export const RELATIONSHIP_OPTIONS = GUARDIAN_RELATIONSHIP_OPTIONS;
