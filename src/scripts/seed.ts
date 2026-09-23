import { faker } from "@faker-js/faker";
import { eq, sql } from "drizzle-orm";
import type { PgInsertValue, PgTable } from "drizzle-orm/pg-core";

import { user as userTable } from "#/lib/db/schema/auth.schema";
import {
	appointments,
	auditLogs,
	type Clinic,
	encounters,
	growthMeasurements,
	guardians,
	immunizations,
	labOrders,
	type NewAppointment,
	type NewAuditLog,
	type NewChronicCondition,
	type NewEncounter,
	type NewGrowthMeasurement,
	type NewGuardian,
	type NewImmunization,
	type NewLabOrder,
	type NewPatient,
	type NewPatientAllergy,
	type NewPrescription,
	type NewStaff,
	type NewVitalSigns,
	patientAllergies,
	patientChronicConditions,
	patients,
	prescriptions,
	roleEnum,
	type Staff,
	type User,
	vitals
} from "@/lib/db/schema";

import { db, withTransaction, type DBorTx } from "../lib/db/server";

// ============================================================
// Configuration
// ============================================================

const CLINIC_ID = "clinic-main";

const SEED_CONFIG = {
	patients: 25,
	staff: 5,
	encountersPerPatient: { min: 2, max: 8 },
	vitalsPerPatient: { min: 2, max: 6 },
	growthPerPatient: { min: 3, max: 10 },
	immunizationsPerPatient: { min: 5, max: 15 },
	prescriptionsPerPatient: { min: 1, max: 5 },
	labsPerPatient: { min: 1, max: 4 },
	appointmentsPerPatient: { min: 1, max: 3 },
	auditLogs: 50
} as const;

/** Postgres parameter cap is 65535; 500 keeps every INSERT well under it. */
const INSERT_BATCH_SIZE = 500;

type Bootstrap = {
	clinic: Clinic;
	staff: Staff[];
	staffIds: string[];
	staffNames: Record<string, string>;
};

async function loadBootstrap(): Promise<Bootstrap> {
	const clinic = await db.query.clinics.findFirst({
		where: { id: CLINIC_ID }
	});
	if (!clinic) {
		throw new Error(
			`Clinic "${CLINIC_ID}" not found. Run the admin seeder first:\n` +
				"  bun --env-file=.env src/scripts/admin.ts"
		);
	}

	const staffRows = await db.query.staff.findMany();
	if (staffRows.length === 0) {
		throw new Error(
			"No staff rows found. Run the admin seeder first:\n" +
				"  bun --env-file=.env src/scripts/admin.ts"
		);
	}

	return {
		clinic,
		staff: staffRows,
		staffIds: staffRows.map(s => s.id),
		staffNames: Object.fromEntries(staffRows.map(s => [s.id, s.name]))
	};
}
async function insertBatched<T extends PgTable>(
	executor: DBorTx,
	table: T,
	rows: PgInsertValue<T>[],
	batchSize = INSERT_BATCH_SIZE
): Promise<void> {
	for (let i = 0; i < rows.length; i += batchSize) {
		await executor.insert(table).values(rows.slice(i, i + batchSize));
	}
}
/** Deterministic-per-call unique string, namespaced by `prefix`. */
const usedIds = {
	mrn: new Set<string>(),
	rx: new Set<string>(),
	lab: new Set<string>()
};

function uniqueNumber(prefix: string, used: Set<string>): string {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const candidate = `${prefix}-${new Date().getFullYear()}-${faker.string.numeric(4)}`;
		if (!used.has(candidate)) {
			used.add(candidate);
			return candidate;
		}
	}
	// Fallback: nanoid-ish suffix, effectively collision-free.
	const fallback = `${prefix}-${new Date().getFullYear()}-${faker.string.alphanumeric(8).toUpperCase()}`;
	used.add(fallback);
	return fallback;
}

const generateMRN = (): string => uniqueNumber("PED", usedIds.mrn);
const generateRxNumber = (): string => uniqueNumber("RX", usedIds.rx);
const generateLabNumber = (): string => uniqueNumber("LAB", usedIds.lab);

const randomDate = (start: Date, end: Date): Date =>
	faker.date.between({ from: start, to: end });

function pickOne<T>(values: readonly T[]): T {
	if (values.length === 0) throw new Error("pickOne: empty array");
	return faker.helpers.arrayElement(values) as T;
}

const PEDIATRIC_AGE_GROUPS = [
	{ label: "Neonate", minMonths: 0, maxMonths: 1 },
	{ label: "Infant", minMonths: 1, maxMonths: 12 },
	{ label: "Toddler", minMonths: 12, maxMonths: 36 },
	{ label: "Preschooler", minMonths: 36, maxMonths: 72 },
	{ label: "School Age", minMonths: 72, maxMonths: 144 },
	{ label: "Adolescent", minMonths: 144, maxMonths: 216 }
] as const;

function randomAgeMonths(): number {
	const group = pickOne(PEDIATRIC_AGE_GROUPS);
	return faker.number.int({ min: group.minMonths, max: group.maxMonths });
}

function dobFromAgeMonths(ageMonths: number): string {
	const d = new Date();
	d.setMonth(d.getMonth() - ageMonths);
	return d.toISOString();
}

function ageMonthsFromDOB(dob: string): number {
	const birth = new Date(dob);
	const now = new Date();
	return (
		(now.getFullYear() - birth.getFullYear()) * 12 +
		(now.getMonth() - birth.getMonth())
	);
}
// async function verifySeededTables(): Promise<void> {
// 	const tables = [
// 		["clinics", clinics],
// 		["user", userTable],
// 		["staff", staff],
// 		["patients", patients],
// 		["guardians", guardians],
// 		["patient allergies", patientAllergies],
// 		["chronic conditions", patientChronicConditions],
// 		["encounters", encounters],
// 		["appointments", appointments],
// 		["vitals", vitals],
// 		["growth measurements", growthMeasurements],
// 		["immunizations", immunizations],
// 		["prescriptions", prescriptions],
// 		["lab orders", labOrders],
// 		["audit logs", auditLogs]
// 	] as const;

// 	for (const [name, table] of tables) {
// 		const [row] = await db.select({ count: sql<number>`count(*)` }).from(table);

// 		// Coerce the string/bigint to a proper JavaScript number
// 		const count = row?.count ?? 0;

// 		if (count === 0) {
// 			throw new Error(`Seed verification failed: ${name} is empty`);
// 		}

// 		console.log(`  ✅ Verified ${name}: ${count} rows`);
// 	}
// }

// // ============================================================
// // Helper Functions
// // ============================================================

// const PEDIATRIC_AGE_GROUPS = [
// 	{ label: "Neonate", minMonths: 0, maxMonths: 1 },
// 	{ label: "Infant", minMonths: 1, maxMonths: 12 },
// 	{ label: "Toddler", minMonths: 12, maxMonths: 36 },
// 	{ label: "Preschooler", minMonths: 36, maxMonths: 72 },
// 	{ label: "School Age", minMonths: 72, maxMonths: 144 },
// 	{ label: "Adolescent", minMonths: 144, maxMonths: 216 }
// ];

// function getRandomAgeGroup() {
// 	const group = faker.helpers.arrayElement(PEDIATRIC_AGE_GROUPS);
// 	const months = faker.number.int({
// 		min: group.minMonths,
// 		max: group.maxMonths
// 	});
// 	return months;
// }

// function getDOBFromAgeMonths(ageMonths: number): string {
// 	const date = new Date();
// 	date.setMonth(date.getMonth() - ageMonths);
// 	return date.toISOString();
// }

// function getAgeMonthsFromDOB(dob: string): number {
// 	const birthDate = new Date(dob);
// 	const now = new Date();
// 	return (
// 		(now.getFullYear() - birthDate.getFullYear()) * 12 +
// 		(now.getMonth() - birthDate.getMonth())
// 	);
// }

// const usedMRNs = new Set<string>();
// const usedRxNumbers = new Set<string>();
// const usedLabOrderNumbers = new Set<string>();

// function generateUniqueNumber(prefix: string, used: Set<string>): string {
// 	let value: string;
// 	do {
// 		value = `${prefix}-${new Date().getFullYear()}-${faker.string.numeric(4)}`;
// 	} while (used.has(value));
// 	used.add(value);
// 	return value;
// }

// function generateMRN(): string {
// 	return generateUniqueNumber("PED", usedMRNs);
// }

// function generateRxNumber(): string {
// 	return generateUniqueNumber("RX", usedRxNumbers);
// }

// function generateLabOrderNumber(): string {
// 	return generateUniqueNumber("LAB", usedLabOrderNumbers);
// }

// function randomDate(start: Date, end: Date): Date {
// 	return faker.date.between({ from: start, to: end });
// }

function requiredAt<T>(values: Array<T>, index: number, label: string): T {
	const value = values[index];
	if (value === undefined)
		throw new Error(`${label} is missing at index ${index}`);
	return value;
}

// /**
//  * Insert an array of rows in fixed-size batches. One `INSERT ... VALUES`
//  * round-trip per batch instead of one per row.
//  */
// async function insertBatched<T extends PgTable>(
// 	table: T,
// 	rows: PgInsertValue<T>[],
// 	batchSize = INSERT_BATCH_SIZE
// ): Promise<void> {
// 	for (let i = 0; i < rows.length; i += batchSize) {
// 		await db.insert(table).values(rows.slice(i, i + batchSize));
// 	}
// }

// function randomDateString(start: Date, end: Date): string {
// 	return randomDate(start, end).toISOString();
// }

const AVATAR_COLORS = [
	"#4F46E5",
	"#7C3AED",
	"#EC4899",
	"#EF4444",
	"#F59E0B",
	"#10B981",
	"#06B6D4",
	"#3B82F6",
	"#8B5CF6",
	"#6366F1"
];

// ============================================================
// Generate Users (First - required for foreign keys)
// ============================================================

function generateUsers(count: number) {
	const users: Array<User> = [];
	// const roles = ["doctor", "staff", "admin", "patient"] ;

	for (let i = 0; i < count; i += 1) {
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		users.push({
			id: `user-${faker.string.alphanumeric(8)}`,
			name: `${firstName} ${lastName}`,
			email: faker.internet.email({ firstName, lastName }),
			emailVerified: faker.datatype.boolean({ probability: 0.9 }),
			image: faker.image.avatar(),
			createdAt: new Date(),
			updatedAt: new Date(),
			banned: faker.datatype.boolean({ probability: 0.05 }),
			banExpires: faker.date.future(),
			banReason: faker.lorem.sentence(),
			address: faker.location.streetAddress(),
			phone: faker.phone.number(),
			twoFactorEnabled: faker.datatype.boolean({ probability: 0.2 }),
			apiKey: faker.string.alphanumeric(32),
			role: faker.helpers.arrayElement(roleEnum.enumValues),
			clinicId: `clinic-${faker.string.alphanumeric(8)}`
		});
	}
	return users;
}

function buildPatientUser(patientId: string, name: string): User {
	return {
		id: `user-${patientId}`,
		name,
		email: `${patientId}@demo.local`,
		emailVerified: true,
		image: faker.image.avatar(),
		createdAt: new Date(),
		updatedAt: new Date(),
		role: "patient",
		banned: false,
		banReason: null,
		banExpires: null,
		twoFactorEnabled: false,
		clinicId: CLINIC_ID,
		apiKey: null,
		address: faker.location.streetAddress(),
		phone: faker.phone.number()
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Patient generation
// ═══════════════════════════════════════════════════════════════════════════

type PatientSeed = {
	patients: Array<NewPatient>;
	users: Array<User>;
	dobs: Record<string, string>;
	weights: Record<string, number>;
};

function generatePatients(bootstrap: Bootstrap): PatientSeed {
	const users: Array<User> = [];
	const patientsOut: Array<NewPatient> = [];
	const dobs: Record<string, string> = {};
	const weights: Record<string, number> = {};

	for (let i = 0; i < SEED_CONFIG.patients; i += 1) {
		const id = `pat-${faker.string.alphanumeric(8)}`;
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		const fullName = `${firstName} ${lastName}`;

		const gender = pickOne(["male", "female"] as const);
		const ageMonths = randomAgeMonths();
		const dob = dobFromAgeMonths(ageMonths);

		const patient: NewPatient = {
			id,
			mrn: generateMRN(),
			firstName,
			lastName,
			dateOfBirth: dob,
			gender,
			bloodGroup: pickOne([
				"A+",
				"A-",
				"B+",
				"B-",
				"AB+",
				"AB-",
				"O+",
				"O-",
				"Unknown"
			] as const),
			gestationWeeksAtBirth: faker.number.float({
				min: 36,
				max: 42,
				fractionDigits: 1
			}),
			birthWeightKg: faker.helpers.maybe(() =>
				faker.number.float({ min: 2.5, max: 4.5, fractionDigits: 2 })
			),
			birthLengthCm: faker.helpers.maybe(() =>
				faker.number.float({ min: 45, max: 55, fractionDigits: 1 })
			),
			birthHeadCircumferenceCm: faker.helpers.maybe(() =>
				faker.number.float({ min: 32, max: 38, fractionDigits: 1 })
			),
			deliveryMethod: pickOne([
				"Vaginal",
				"Cesarean",
				"Assisted",
				null
			] as const),
			preferredLanguage: pickOne(["English", "Spanish", "Mandarin", "Arabic"]),
			activeStatus: pickOne([
				"Active",
				"Active",
				"Active",
				"Inactive"
			] as const),
			notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
			userId: `user-${id}`,
			pediatricianId: pickOne(bootstrap.staffIds),
			clinicId: bootstrap.clinic.id,
			email: null,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		users.push(buildPatientUser(id, fullName));
		patientsOut.push(patient);
		dobs[id] = dob;
		weights[id] = faker.number.float({ min: 3, max: 50, fractionDigits: 1 });
	}

	return { patients: patientsOut, users, dobs, weights };
}

function generateGuardians(patientIds: string[]): Array<NewGuardian> {
	const relationships = [
		"Mother",
		"Father",
		"Grandparent",
		"Legal Guardian"
	] as const;

	const out: Array<NewGuardian> = [];
	for (const patientId of patientIds) {
		const count = faker.number.int({ min: 1, max: 2 });
		for (let j = 0; j < count; j += 1) {
			const isPrimary = j === 0;
			out.push({
				id: `grd-${faker.string.alphanumeric(8)}`,
				patientId,
				name: faker.person.fullName({ sex: isPrimary ? "female" : "male" }),
				userId: null, // demo guardians have no login
				relationship: pickOne(relationships),
				phone: faker.phone.number(),
				email: faker.helpers.maybe(() => faker.internet.email()) ?? null,
				address:
					faker.helpers.maybe(() => faker.location.streetAddress()) ?? null,
				isPrimary,
				emergencyContact: isPrimary,
				contactOrder: j + 1,
				notes: null,
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}
	}
	return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Allergies and chronic conditions
//
// Both are probability-gated, but we guarantee at least one of each so a
// strict verifier upstream (or `verifySeededTables`) never sees an empty
// table by chance.
// ═══════════════════════════════════════════════════════════════════════════

function generateAllergies(patientIds: string[]): Array<NewPatientAllergy> {
	const allergens = [
		"Penicillin",
		"Amoxicillin",
		"Cephalosporins",
		"Peanuts",
		"Tree Nuts",
		"Eggs",
		"Milk",
		"Soy",
		"Latex",
		"Pollen",
		"Dust Mites",
		"Ibuprofen",
		"Aspirin"
	];

	const out: Array<NewPatientAllergy> = [];
	patientIds.forEach((patientId, idx) => {
		// First patient always gets one, to keep the table non-empty.
		const shouldSeed =
			idx === 0 || faker.datatype.boolean({ probability: 0.3 });
		if (!shouldSeed) return;

		const count = faker.number.int({ min: 1, max: 3 });
		const picked = faker.helpers.arrayElements(allergens, count);
		for (const allergen of picked) {
			out.push({
				id: `alg-${faker.string.alphanumeric(8)}`,
				patientId,
				allergen,
				category: pickOne([
					"Medication",
					"Food",
					"Environmental",
					"Other"
				] as const),
				severity: pickOne([
					"Mild",
					"Moderate",
					"Severe",
					"Anaphylactic"
				] as const),
				reaction: pickOne([
					"Rash",
					"Hives",
					"Swelling",
					"Difficulty breathing",
					"Itching",
					"Nausea",
					"Anaphylaxis"
				]),
				identifiedDate:
					faker.helpers.maybe(() => faker.date.past().toISOString()) ?? null,
				onsetDate: null,
				resolutionDate: null,
				status: "Active",
				notes: null,
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}
	});
	return out;
}

function generateChronicConditions(
	patientIds: string[]
): Array<NewChronicCondition> {
	const catalog = [
		{ condition: "Asthma", icd: "J45.909" },
		{ condition: "Eczema", icd: "L20.9" },
		{ condition: "Food Allergy", icd: "T78.1" },
		{ condition: "ADHD", icd: "F90.9" },
		{ condition: "Autism Spectrum Disorder", icd: "F84.0" },
		{ condition: "Type 1 Diabetes", icd: "E10.9" },
		{ condition: "Celiac Disease", icd: "K90.0" },
		{ condition: "Sickle Cell Trait", icd: "D57.3" }
	];

	const out: Array<NewChronicCondition> = [];
	patientIds.forEach((patientId, idx) => {
		const shouldSeed =
			idx === 0 || faker.datatype.boolean({ probability: 0.2 });
		if (!shouldSeed) return;

		const count = faker.number.int({ min: 1, max: 2 });
		const picked = faker.helpers.arrayElements(catalog, count);
		for (const c of picked) {
			out.push({
				id: `cnd-${faker.string.alphanumeric(8)}`,
				patientId,
				condition: c.condition,
				icdCode: c.icd,
				diagnosedDate: faker.date.past().toISOString(),
				status: pickOne(["Active", "Resolved", "In Remission"] as const),
				severity: null,
				notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}
	});
	return out;
}

// ============================================================
// Generate Staff
// ============================================================

function generateStaff(userIds: Array<string>): Array<NewStaff> {
	const staffMembers: Array<NewStaff> = [];

	const names = [
		{
			name: "Dr. Sarah Johnson",
			title: "Senior Pediatrician",
			role: "doctor" as const
		},
		{
			name: "Dr. Michael Chen",
			title: "Pediatrician",
			role: "doctor" as const
		},
		{
			name: "Dr. Emily Rodriguez",
			title: "Pediatrician",
			role: "doctor" as const
		},
		{ name: "Dr. David Kim", title: "Resident", role: "doctor" as const },
		{ name: "Lisa Thompson", title: "Clinic Manager", role: "staff" as const },
		{ name: "Maria Garcia", title: "Receptionist", role: "staff" as const }
	];

	for (let i = 0; i < Math.min(names.length, SEED_CONFIG.staff); i += 1) {
		const person = requiredAt(names, i, "Staff template");
		const userId = requiredAt(userIds, i % userIds.length, "Staff user ID");
		const [firstName = "Staff", lastName = "Clinic"] = person.name.split(" ");
		staffMembers.push({
			id: `staff-${faker.string.alphanumeric(8)}`,
			name: person.name,
			title: person.title,
			role: person.role,
			licenseNumber: `MD-${faker.string.numeric(6)}`,
			avatarColor: faker.helpers.arrayElement(AVATAR_COLORS),
			pinHash: faker.string.alphanumeric(64),
			userId,
			email: faker.internet.email({
				firstName,
				lastName
			}),
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});
	}

	return staffMembers;
}

// ═══════════════════════════════════════════════════════════════════════════
// Encounters
// ═══════════════════════════════════════════════════════════════════════════

const VISIT_TYPES = [
	"Well-Child Check",
	"Sick Visit",
	"Follow-Up",
	"Immunization Visit",
	"Emergency/Urgent",
	"Telehealth"
] as const;

const CHIEF_COMPLAINTS = [
	"Routine well-child checkup",
	"Fever and cough for 3 days",
	"Ear pain and irritability",
	"Sore throat and fever",
	"Rash on chest and back",
	"Vomiting and diarrhea",
	"Difficulty breathing",
	"Wheezing and coughing",
	"Runny nose and congestion",
	"Headache and fatigue",
	"Abdominal pain",
	"Eye redness and discharge"
];

const DIAGNOSES = [
	"Acute upper respiratory infection",
	"Acute otitis media",
	"Pharyngitis",
	"Viral gastroenteritis",
	"Bronchiolitis",
	"Asthma exacerbation",
	"Atopic dermatitis",
	"Allergic rhinitis",
	"Conjunctivitis",
	"Urinary tract infection"
];

function generateEncounters(
	patientIds: string[],
	bootstrap: Bootstrap
): Array<NewEncounter> {
	const out: Array<NewEncounter> = [];
	const sixMonthsAgo = new Date();
	sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

	for (const patientId of patientIds) {
		const count = faker.number.int({
			min: SEED_CONFIG.encountersPerPatient.min,
			max: SEED_CONFIG.encountersPerPatient.max
		});

		for (let i = 0; i < count; i += 1) {
			const providerId = pickOne(bootstrap.staffIds);
			const encounterDate = randomDate(sixMonthsAgo, new Date());
			const isSick = faker.datatype.boolean({ probability: 0.4 });

			const physicalExam = [
				{ system: "General", status: "Normal", findings: "Well-appearing." },
				{ system: "Head & Neck", status: "Normal", findings: "Normocephalic." },
				{ system: "Eyes", status: "Normal", findings: "Red reflex intact." },
				{ system: "ENT", status: "Normal", findings: "TMs pearly grey." },
				{
					system: "Respiratory",
					status: "Normal",
					findings: "Clear breath sounds."
				},
				{
					system: "Cardiovascular",
					status: "Normal",
					findings: "Regular rhythm, no murmurs."
				},
				{ system: "Abdomen", status: "Normal", findings: "Soft, non-tender." },
				{ system: "Skin", status: "Normal", findings: "Warm, dry, intact." },
				{
					system: "Neurological",
					status: "Normal",
					findings: "Age-appropriate reflexes."
				}
			];

			if (isSick) {
				const abnormal = faker.helpers.arrayElements(
					physicalExam,
					faker.number.int({ min: 1, max: 3 })
				);
				for (const sys of abnormal) {
					sys.status = "Abnormal";
					sys.findings = `Abnormal finding: ${faker.lorem.sentence()}`;
				}
			}

			out.push({
				id: `enc-${faker.string.alphanumeric(8)}`,
				patientId,
				providerId,
				providerName: bootstrap.staffNames[providerId] ?? "Unknown Provider",
				encounterDate,
				visitType: pickOne(VISIT_TYPES),
				chiefComplaint: pickOne(CHIEF_COMPLAINTS),
				subjectiveJson: {
					historyOfPresentIllness: faker.lorem.paragraph(),
					feedingAndNutrition:
						faker.helpers.maybe(() => faker.lorem.sentence()) ?? undefined,
					developmentalMilestones:
						faker.helpers.maybe(() => faker.lorem.sentence()) ?? undefined,
					sleepAndBehavior:
						faker.helpers.maybe(() => faker.lorem.sentence()) ?? undefined
				},
				objectiveJson: {
					physicalExam,
					clinicalFindings: faker.lorem.sentence()
				},
				assessmentJson: {
					primaryDiagnosis: pickOne(DIAGNOSES),
					primaryIcd10: `${faker.string.alpha(3).toUpperCase()}.${faker.string.numeric(2)}`,
					secondaryDiagnoses: [],
					clinicalImpression: faker.lorem.sentence()
				},
				planJson: {
					treatmentAndInterventions: faker.lorem.sentence(),
					medicationsSummary:
						faker.helpers.maybe(() => faker.lorem.sentence()) ?? undefined,
					anticipatoryGuidance: faker.lorem.sentence(),
					redFlagWarnings: faker.lorem.sentence(),
					followUpDate:
						faker.helpers.maybe(() => faker.date.future().toISOString()) ??
						undefined
				},
				status: pickOne(["Completed", "Signed"] as const),
				signedAt: faker.helpers.maybe(() => new Date()) ?? null,
				signedBy: null,
				durationMinutes: null,
				followUpDate: null,
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}
	}
	return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Appointments
// ═══════════════════════════════════════════════════════════════════════════

function generateAppointments(
	patientIds: string[],
	bootstrap: Bootstrap
): Array<NewAppointment> {
	const types = [
		"Well-Child Check",
		"Sick Visit",
		"Follow-Up",
		"Immunization Visit",
		"Consultation",
		"Telehealth"
	] as const;
	const statuses = ["Scheduled", "Completed", "Cancelled"] as const;

	const out: Array<NewAppointment> = [];
	for (const patientId of patientIds) {
		const count = faker.number.int({
			min: SEED_CONFIG.appointmentsPerPatient.min,
			max: SEED_CONFIG.appointmentsPerPatient.max
		});
		for (let i = 0; i < count; i += 1) {
			const startTime = faker.date.soon({ days: 30 });
			const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
			out.push({
				id: `apt-${faker.string.alphanumeric(8)}`,
				patientId,
				staffId: pickOne(bootstrap.staffIds),
				startTime,
				endTime,
				appointmentDate: startTime,
				status: pickOne(statuses),
				type: pickOne(types),
				notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
				priority: "Normal",
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}
	}
	return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Vitals
// ═══════════════════════════════════════════════════════════════════════════

function generateVitals(
	patientIds: string[],
	encounterIds: string[]
): Array<NewVitalSigns> {
	const sixMonthsAgo = new Date();
	sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

	const out: Array<NewVitalSigns> = [];
	for (const patientId of patientIds) {
		const count = faker.number.int({
			min: SEED_CONFIG.vitalsPerPatient.min,
			max: SEED_CONFIG.vitalsPerPatient.max
		});
		for (let i = 0; i < count; i += 1) {
			out.push({
				id: `vit-${faker.string.alphanumeric(8)}`,
				patientId,
				encounterId: encounterIds.length ? pickOne(encounterIds) : null,
				recordedAt: randomDate(sixMonthsAgo, new Date()),
				temperatureC: faker.number.float({
					min: 36.0,
					max: 39.5,
					fractionDigits: 1
				}),
				temperatureMethod: pickOne(["Axillary", "Tympanic", "Temporal"]),
				heartRateBpm: faker.number.int({ min: 60, max: 165 }),
				respiratoryRateBpm: faker.number.int({ min: 12, max: 60 }),
				systolicBp:
					faker.helpers.maybe(() => faker.number.int({ min: 60, max: 130 })) ??
					null,
				diastolicBp:
					faker.helpers.maybe(() => faker.number.int({ min: 30, max: 85 })) ??
					null,
				meanArterialPressure: null,
				oxygenSaturationPercent: faker.number.int({ min: 92, max: 100 }),
				painScore: faker.number.int({ min: 0, max: 10 }),
				painScaleType: "Wong-Baker",
				weightKg: null,
				heightCm: null,
				headCircumferenceCm: null,
				bmi: null,
				notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
				recordedBy: faker.person.fullName(),
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}
	}
	return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Growth measurements
// ═══════════════════════════════════════════════════════════════════════════

function generateGrowthMeasurements(
	patientIds: string[],
	dobs: Record<string, string>
): Array<NewGrowthMeasurement> {
	const out: Array<NewGrowthMeasurement> = [];

	for (const patientId of patientIds) {
		const dob = dobs[patientId];
		if (!dob) continue;

		const count = faker.number.int({
			min: SEED_CONFIG.growthPerPatient.min,
			max: SEED_CONFIG.growthPerPatient.max
		});
		const birthDate = new Date(dob);
		const now = new Date();
		const maxAge = Math.min(60, ageMonthsFromDOB(dob) + 6);

		for (let i = 0; i < count; i += 1) {
			const ageMonths = faker.number.float({
				min: 1,
				max: maxAge,
				fractionDigits: 1
			});
			const recordedAt = new Date(birthDate);
			recordedAt.setMonth(recordedAt.getMonth() + ageMonths);
			if (recordedAt > now) continue;

			const weightKg = faker.number.float({
				min: 3 + ageMonths * 0.3,
				max: 5 + ageMonths * 0.5,
				fractionDigits: 2
			});
			const heightCm = faker.number.float({
				min: 50 + ageMonths * 1.2,
				max: 55 + ageMonths * 1.5,
				fractionDigits: 1
			});
			const heightM = heightCm / 100;
			const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

			out.push({
				id: `grw-${faker.string.alphanumeric(8)}`,
				patientId,
				encounterId: null,
				recordedAt,
				ageMonths,
				ageDays: null,
				weightKg,
				heightCm,
				headCircumferenceCm:
					faker.helpers.maybe(() =>
						faker.number.float({
							min: 32 + ageMonths * 0.2,
							max: 38 + ageMonths * 0.3,
							fractionDigits: 1
						})
					) ?? null,
				bmi,
				weightForAgeZScore: faker.number.float({
					min: -2.5,
					max: 2.5,
					fractionDigits: 2
				}),
				weightForAgePercentile: faker.number.int({ min: 3, max: 97 }),
				heightForAgeZScore: faker.number.float({
					min: -2.5,
					max: 2.5,
					fractionDigits: 2
				}),
				heightForAgePercentile: faker.number.int({ min: 3, max: 97 }),
				bmiForAgeZScore: faker.number.float({
					min: -2.5,
					max: 2.5,
					fractionDigits: 2
				}),
				bmiForAgePercentile: faker.number.int({ min: 3, max: 97 }),
				headCircumferenceZScore: null,
				headCircumferencePercentile: null,
				weightVelocity: null,
				heightVelocity: null,
				recordedBy: faker.person.fullName(),
				notes: null,
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}
	}
	return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Immunizations
// ═══════════════════════════════════════════════════════════════════════════

const VACCINE_CATALOG = [
	{
		code: "HepB-1",
		name: "Hepatitis B (Dose 1)",
		disease: "Hepatitis B",
		months: 0
	},
	{ code: "DTaP-1", name: "DTaP (Dose 1)", disease: "DTaP", months: 2 },
	{ code: "IPV-1", name: "IPV (Dose 1)", disease: "Poliomyelitis", months: 2 },
	{ code: "Hib-1", name: "Hib (Dose 1)", disease: "Hib", months: 2 },
	{
		code: "PCV15-1",
		name: "PCV15 (Dose 1)",
		disease: "Pneumococcal",
		months: 2
	},
	{
		code: "Rota-1",
		name: "Rotavirus (Dose 1)",
		disease: "Rotavirus",
		months: 2
	},
	{ code: "DTaP-2", name: "DTaP (Dose 2)", disease: "DTaP", months: 4 },
	{ code: "IPV-2", name: "IPV (Dose 2)", disease: "Poliomyelitis", months: 4 },
	{ code: "Hib-2", name: "Hib (Dose 2)", disease: "Hib", months: 4 },
	{
		code: "PCV15-2",
		name: "PCV15 (Dose 2)",
		disease: "Pneumococcal",
		months: 4
	},
	{
		code: "Rota-2",
		name: "Rotavirus (Dose 2)",
		disease: "Rotavirus",
		months: 4
	},
	{ code: "DTaP-3", name: "DTaP (Dose 3)", disease: "DTaP", months: 6 },
	{
		code: "HepB-2",
		name: "Hepatitis B (Dose 2)",
		disease: "Hepatitis B",
		months: 6
	},
	{
		code: "PCV15-3",
		name: "PCV15 (Dose 3)",
		disease: "Pneumococcal",
		months: 6
	},
	{ code: "MMR-1", name: "MMR (Dose 1)", disease: "MMR", months: 12 },
	{
		code: "Varicella-1",
		name: "Varicella (Dose 1)",
		disease: "Chickenpox",
		months: 12
	},
	{
		code: "HepA-1",
		name: "Hepatitis A (Dose 1)",
		disease: "Hepatitis A",
		months: 12
	},
	{ code: "DTaP-4", name: "DTaP (Booster)", disease: "DTaP", months: 15 },
	{
		code: "HepA-2",
		name: "Hepatitis A (Dose 2)",
		disease: "Hepatitis A",
		months: 18
	},
	{ code: "MMR-2", name: "MMR (Dose 2)", disease: "MMR", months: 48 },
	{
		code: "Varicella-2",
		name: "Varicella (Dose 2)",
		disease: "Chickenpox",
		months: 48
	},
	{ code: "DTaP-5", name: "DTaP (Booster 2)", disease: "DTaP", months: 48 }
] as const;

function generateImmunizations(
	patientIds: string[],
	dobs: Record<string, string>
): Array<NewImmunization> {
	const sites = [
		"Right Anterolateral Thigh",
		"Left Anterolateral Thigh",
		"Right Deltoid",
		"Left Deltoid"
	];
	const out: Array<NewImmunization> = [];

	for (const patientId of patientIds) {
		const dob = dobs[patientId];
		if (!dob) continue;

		const birthDate = new Date(dob);
		const now = new Date();
		const ageMonths = ageMonthsFromDOB(dob);

		const eligible = VACCINE_CATALOG.filter(v => v.months <= ageMonths + 6);
		if (eligible.length === 0) continue;

		const count = faker.number.int({
			min: Math.min(5, eligible.length),
			max: Math.min(12, eligible.length)
		});
		const picked = faker.helpers.arrayElements(eligible, count);

		for (const vaccine of picked) {
			const dueDate = new Date(birthDate);
			dueDate.setMonth(dueDate.getMonth() + vaccine.months);

			const status: NewImmunization["status"] =
				dueDate <= now
					? pickOne(["Administered", "Overdue"] as const)
					: pickOne(["Due", "Upcoming", "Deferred"] as const);
			const isAdministered = status === "Administered";

			out.push({
				id: `imm-${faker.string.alphanumeric(8)}`,
				patientId,
				vaccineCode: vaccine.code,
				vaccineName: vaccine.name,
				targetDisease: vaccine.disease,
				doseNumber: faker.number.int({ min: 1, max: 5 }),
				totalDoses: null,
				recommendedAgeLabel: `${vaccine.months} Months`,
				recommendedAgeMonths: vaccine.months,
				dueDate: dueDate.toISOString(),
				administeredDate: isAdministered
					? faker.date.between({ from: dueDate, to: now }).toISOString()
					: null,
				status,
				manufacturer: pickOne(["Sanofi Pasteur", "Merck", "Pfizer", "GSK"]),
				brandName: faker.helpers.maybe(() => faker.company.name()) ?? null,
				batchNumber: isAdministered
					? `LOT-${faker.string.alphanumeric(8).toUpperCase()}`
					: null,
				expiryDate:
					faker.helpers.maybe(() => faker.date.future().toISOString()) ?? null,
				administrationSite: pickOne(sites),
				administrationRoute: pickOne(["Intramuscular", "Subcutaneous", "Oral"]),
				administeredBy: isAdministered ? faker.person.fullName() : null,
				adverseReactions:
					faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
				parentConsent: true,
				consentFormId: null,
				notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}
	}
	return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Prescriptions
// ═══════════════════════════════════════════════════════════════════════════

const MEDICATIONS = [
	{
		name: "Amoxicillin",
		generic: "Amoxicillin Trihydrate",
		conc: "250 mg/5 mL"
	},
	{
		name: "Azithromycin",
		generic: "Azithromycin Dihydrate",
		conc: "200 mg/5 mL"
	},
	{ name: "Cefdinir", generic: "Cefdinir", conc: "125 mg/5 mL" },
	{ name: "Paracetamol", generic: "Acetaminophen", conc: "160 mg/5 mL" },
	{ name: "Ibuprofen", generic: "Ibuprofen", conc: "100 mg/5 mL" },
	{ name: "Albuterol", generic: "Albuterol Sulfate", conc: "2.5 mg/3 mL" },
	{ name: "Cetirizine", generic: "Cetirizine HCl", conc: "5 mg/5 mL" },
	{
		name: "Prednisolone",
		generic: "Prednisolone Sodium Phosphate",
		conc: "15 mg/5 mL"
	}
] as const;

function generatePrescriptions(
	patientIds: string[],
	bootstrap: Bootstrap,
	weights: Record<string, number>
): Array<NewPrescription> {
	const out: Array<NewPrescription> = [];

	for (const patientId of patientIds) {
		const count = faker.number.int({
			min: SEED_CONFIG.prescriptionsPerPatient.min,
			max: SEED_CONFIG.prescriptionsPerPatient.max
		});

		for (let i = 0; i < count; i += 1) {
			const med = pickOne(MEDICATIONS);
			const providerId = pickOne(bootstrap.staffIds);
			const weight =
				weights[patientId] ??
				faker.number.float({ min: 5, max: 50, fractionDigits: 1 });

			const mgPerKg = faker.number.float({
				min: 10,
				max: 50,
				fractionDigits: 1
			});
			const doseMg = Math.round(mgPerKg * weight);
			const volumeMl = Math.round((doseMg / 250) * 5 * 10) / 10;

			out.push({
				id: `rx-${faker.string.alphanumeric(8)}`,
				rxNumber: generateRxNumber(),
				patientId,
				encounterId: null,
				prescribedDate: faker.date.recent().toISOString(),
				prescriberId: providerId,
				prescriberName: bootstrap.staffNames[providerId] ?? "Unknown Provider",
				prescriberLicense: `MD-${faker.string.numeric(6)}`,
				patientWeightKg: weight,
				diagnosis: pickOne([
					"Acute otitis media",
					"Pharyngitis",
					"Pneumonia",
					"Sinusitis",
					"Asthma exacerbation"
				]),
				prescriptionItems: [
					{
						id: `item-${faker.string.alphanumeric(8)}`,
						medicationName: med.name,
						genericName: med.generic,
						form: "Suspension",
						concentration: med.conc,
						calculatedDoseMg: doseMg,
						patientWeightKg: weight,
						dosePerKg: mgPerKg,
						calculatedLiquidDoseMl: volumeMl,
						frequency: pickOne([
							"Every 8 hours (TID)",
							"Every 12 hours (BID)",
							"Once daily"
						]),
						route: "Oral",
						durationDays: faker.number.int({ min: 5, max: 10 }),
						instructions: `Give ${volumeMl} mL by mouth ${pickOne([
							"every 8 hours",
							"every 12 hours",
							"once daily"
						])}. Complete full course.`,
						dispenseQuantity: `${faker.number.int({ min: 60, max: 150 })} mL`,
						refills: faker.number.int({ min: 0, max: 2 })
					}
				],
				notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
				status: pickOne(["Active", "Active", "Completed"] as const),
				filledAt: null,
				filledBy: null,
				discontinuedAt: null,
				discontinuedReason: null,
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}
	}
	return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Lab orders
// ═══════════════════════════════════════════════════════════════════════════

const LAB_TESTS = [
	{ name: "Complete Blood Count (CBC)", category: "Hematology" },
	{ name: "Basic Metabolic Panel", category: "Biochemistry" },
	{ name: "Rapid Strep Test", category: "Microbiology" },
	{ name: "RSV / Flu PCR", category: "Microbiology" },
	{ name: "Urinalysis", category: "Urinalysis" },
	{ name: "Blood Culture", category: "Microbiology" },
	{ name: "Lead Screening", category: "Biochemistry" },
	{ name: "Iron Panel", category: "Biochemistry" }
] as const;

function generateLabOrders(
	patientIds: string[],
	bootstrap: Bootstrap
): Array<NewLabOrder> {
	const staffNames = Object.values(bootstrap.staffNames);
	const out: Array<NewLabOrder> = [];

	for (const patientId of patientIds) {
		const count = faker.number.int({
			min: SEED_CONFIG.labsPerPatient.min,
			max: SEED_CONFIG.labsPerPatient.max
		});

		for (let i = 0; i < count; i += 1) {
			const test = pickOne(LAB_TESTS);
			const isCompleted = faker.datatype.boolean({ probability: 0.6 });

			out.push({
				id: `lab-${faker.string.alphanumeric(8)}`,
				orderNumber: generateLabNumber(),
				patientId,
				encounterId: null,
				orderDate: faker.date.recent(),
				orderedBy: pickOne(staffNames),
				clinicalIndication: pickOne([
					"Evaluate for infection",
					"Fever workup",
					"Routine screening",
					"Monitor therapy",
					"Diagnostic evaluation"
				]),
				testsJson: [
					{
						id: `test-${faker.string.alphanumeric(8)}`,
						testCode: test.name.slice(0, 8).toUpperCase(),
						testName: test.name,
						category: test.category,
						sampleType: pickOne([
							"Blood",
							"Urine",
							"Throat Swab",
							"Nasal Swab"
						]),
						result: isCompleted
							? pickOne(["Normal", "Abnormal", "Positive", "Negative"])
							: "Pending",
						referenceRange: pickOne([
							"10-20 g/dL",
							"150-400 k/µL",
							"4.5-5.5 x10^6/µL"
						]),
						isAbnormal: faker.datatype.boolean({ probability: 0.2 }),
						...(isCompleted
							? { completedAt: faker.date.recent().toISOString() }
							: {}),
						notes: faker.lorem.sentence()
					}
				],
				status: isCompleted
					? "Completed"
					: pickOne(["Ordered", "Sample Collected"] as const),
				priority: pickOne(["Routine", "Urgent"] as const),
				completedDate: isCompleted ? faker.date.recent() : null,
				specimenCollectionNotes: null,
				specimenType: null,
				specimenCollectedAt: null,
				resultsReleasedAt: null,
				notes: null,
				instructions: null,
				results: null,
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}
	}
	return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// Audit logs
// ═══════════════════════════════════════════════════════════════════════════

function generateAuditLogs(
	bootstrap: Bootstrap,
	patientIds: string[]
): Array<NewAuditLog> {
	const actions = [
		"CREATE",
		"UPDATE",
		"DELETE",
		"VIEW",
		"EXPORT",
		"LOGIN"
	] as const;
	const entities = [
		"PATIENT",
		"ENCOUNTER",
		"IMMUNIZATION",
		"PRESCRIPTION",
		"LAB",
		"DATABASE"
	] as const;
	const details = [
		"Patient record accessed",
		"Encounter documented",
		"Vaccination recorded",
		"Prescription issued",
		"Lab order placed",
		"Database backup exported",
		"Staff login recorded",
		"Patient chart viewed"
	];

	const out: Array<NewAuditLog> = [];
	for (let i = 0; i < SEED_CONFIG.auditLogs; i += 1) {
		const staffId = pickOne(bootstrap.staffIds);
		out.push({
			id: `aud-${faker.string.alphanumeric(8)}`,
			timestamp: faker.date.recent({ days: 30 }),
			staffId,
			staffName: bootstrap.staffNames[staffId] ?? "Unknown",
			action: pickOne(actions),
			entity: pickOne(entities),
			entityId: patientIds.length ? pickOne(patientIds) : null,
			details: pickOne(details),
			ipAddress: null,
			userAgent: null,
			sessionId: null,
			beforeState: null,
			afterState: null
		});
	}
	return out;
}

// ============================================================
// Main Seed Function
// ============================================================

async function clearDemoData(): Promise<void> {
	// Order matters: children before parents.
	await db.delete(auditLogs);
	await db.delete(appointments);
	await db.delete(labOrders);
	await db.delete(prescriptions);
	await db.delete(immunizations);
	await db.delete(growthMeasurements);
	await db.delete(vitals);
	await db.delete(encounters);
	await db.delete(patientChronicConditions);
	await db.delete(patientAllergies);
	await db.delete(guardians);

	// Delete the per-patient `user` rows before the patients themselves —
	// patients.user_id has ON DELETE CASCADE, so deleting the user first
	// would cascade to the patients anyway, but being explicit documents
	// the order.
	const demoPatientUsers = await db
		.select({ id: userTable.id })
		.from(userTable)
		.where(sql`${userTable.id} LIKE 'user-pat-%'`);
	for (const u of demoPatientUsers) {
		await db.delete(userTable).where(eq(userTable.id, u.id));
	}

	await db.delete(patients);
}

function logSummary(counts: {
	patients: number;
	guardians: number;
	allergies: number;
	conditions: number;
	encounters: number;
	appointments: number;
	vitals: number;
	growth: number;
	immunizations: number;
	prescriptions: number;
	labs: number;
	auditLogs: number;
}): void {
	console.log(`
📊 Demo data summary:
   👶 Patients:            ${counts.patients}
   👨‍👩‍👧 Guardians:           ${counts.guardians}
   💊 Allergies:           ${counts.allergies}
   🏥 Chronic conditions:  ${counts.conditions}
   📝 Encounters:          ${counts.encounters}
   📅 Appointments:        ${counts.appointments}
   ❤️  Vitals:              ${counts.vitals}
   📈 Growth:              ${counts.growth}
   💉 Immunizations:       ${counts.immunizations}
   💊 Prescriptions:       ${counts.prescriptions}
   🧪 Lab orders:          ${counts.labs}
   📋 Audit logs:          ${counts.auditLogs}
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Entry point
// ═══════════════════════════════════════════════════════════════════════════

export async function seedDatabase(): Promise<void> {
	console.log("🌱 Seeding application demo data...");

	usedIds.mrn.clear();
	usedIds.rx.clear();
	usedIds.lab.clear();

	const bootstrap = await loadBootstrap();
	console.log(
		`  ✅ Found clinic "${bootstrap.clinic.name}" and ${bootstrap.staff.length} staff`
	);

	await clearDemoData();
	console.log("  🧹 Cleared existing demo data");

	// ── Build all rows in memory first, so a generator error fails before any
	//    write hits the DB. ─────────────────────────────────────────────────
	const {
		patients: patientRows,
		users: patientUsers,
		dobs,
		weights
	} = generatePatients(bootstrap);
	const patientIds = patientRows.map(p => p.id as string);

	const guardianRows = generateGuardians(patientIds);
	const allergyRows = generateAllergies(patientIds);
	const conditionRows = generateChronicConditions(patientIds);
	const encounterRows = generateEncounters(patientIds, bootstrap);
	const encounterIds = encounterRows.map(e => e.id as string);
	const appointmentRows = generateAppointments(patientIds, bootstrap);
	const vitalRows = generateVitals(patientIds, encounterIds);
	const growthRows = generateGrowthMeasurements(patientIds, dobs);
	const immunizationRows = generateImmunizations(patientIds, dobs);
	const prescriptionRows = generatePrescriptions(
		patientIds,
		bootstrap,
		weights
	);
	const labRows = generateLabOrders(patientIds, bootstrap);
	const auditRows = generateAuditLogs(bootstrap, patientIds);

	// ── Persist everything in a single transaction, so a failure mid-way
	//    leaves the DB unchanged. ──────────────────────────────────────────
	await withTransaction(async tx => {
		// Per-patient user rows first — `patients.user_id` references them.
		for (let i = 0; i < patientUsers.length; i += INSERT_BATCH_SIZE) {
			await tx
				.insert(userTable)
				.values(patientUsers.slice(i, i + INSERT_BATCH_SIZE));
		}
		for (let i = 0; i < patientRows.length; i += INSERT_BATCH_SIZE) {
			await tx
				.insert(patients)
				.values(patientRows.slice(i, i + INSERT_BATCH_SIZE));
		}
		for (let i = 0; i < guardianRows.length; i += INSERT_BATCH_SIZE) {
			await tx
				.insert(guardians)
				.values(guardianRows.slice(i, i + INSERT_BATCH_SIZE));
		}
		if (allergyRows.length > 0)
			await insertBatched(tx, patientAllergies, allergyRows);
		if (conditionRows.length > 0) {
			await insertBatched(tx, patientChronicConditions, conditionRows);
		}
		if (encounterRows.length > 0)
			await insertBatched(tx, encounters, encounterRows);
		if (appointmentRows.length > 0) {
			await insertBatched(tx, appointments, appointmentRows);
		}
		if (vitalRows.length > 0) await insertBatched(tx, vitals, vitalRows);
		if (growthRows.length > 0) {
			await insertBatched(tx, growthMeasurements, growthRows);
		}
		if (immunizationRows.length > 0) {
			await insertBatched(tx, immunizations, immunizationRows);
		}
		if (prescriptionRows.length > 0) {
			await insertBatched(tx, prescriptions, prescriptionRows);
		}
		if (labRows.length > 0) await insertBatched(tx, labOrders, labRows);
		if (auditRows.length > 0) await insertBatched(tx, auditLogs, auditRows);
	});

	console.log("  ✅ Inserted all demo rows");

	logSummary({
		patients: patientRows.length,
		guardians: guardianRows.length,
		allergies: allergyRows.length,
		conditions: conditionRows.length,
		encounters: encounterRows.length,
		appointments: appointmentRows.length,
		vitals: vitalRows.length,
		growth: growthRows.length,
		immunizations: immunizationRows.length,
		prescriptions: prescriptionRows.length,
		labs: labRows.length,
		auditLogs: auditRows.length
	});

	console.log("✅ Demo seeding complete.");
}

// ─── CLI ──────────────────────────────────────────────────────────────────

if (import.meta.main) {
	seedDatabase()
		.then(() => process.exit(0))
		.catch(error => {
			console.error("❌ Seed failed:", error);
			process.exit(1);
		});
}
