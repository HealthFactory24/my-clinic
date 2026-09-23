// src/config/app.config.ts

import { env } from "../env/server";

// ─────────────────────────────────────────────────────────────────────────────
// Build metadata
// ─────────────────────────────────────────────────────────────────────────────
declare const __BUILD_SOURCE_COMMIT__: string | undefined;

const BUILD_SOURCE_COMMIT: string =
	typeof __BUILD_SOURCE_COMMIT__ === "string" &&
	__BUILD_SOURCE_COMMIT__.length > 0
		? __BUILD_SOURCE_COMMIT__
		: "dev";

// ─────────────────────────────────────────────────────────────────────────────
// Public site URL
//
// `VITE_BASE_URL` and `BASE_URL` come from Vite's `import.meta.env` — no
// varlock schema entry needed. Fallback is localhost for tests.
// ─────────────────────────────────────────────────────────────────────────────
const PUBLIC_BASE_URL: string =
	(import.meta.env.VITE_BASE_URL as string | undefined) ??
	(import.meta.env.BASE_URL as string | undefined) ??
	"http://localhost:3000";

const publicBase = new URL(PUBLIC_BASE_URL);
const emailSupport = `support@${publicBase.host}`;

// ─────────────────────────────────────────────────────────────────────────────
// Deep freeze
// ─────────────────────────────────────────────────────────────────────────────
function deepFreeze<T>(value: T): Readonly<T> {
	if (value && typeof value === "object" && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const key of Object.getOwnPropertyNames(value)) {
			deepFreeze((value as Record<string, unknown>)[key]);
		}
	}
	return value as Readonly<T>;
}
// const _isDev = process.env.NODE_ENV === "development";
const isProd = process.env.NODE_ENV === "production";
// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const rawConfig = {
	site: {
		author: "tsu!moe",
		basePath: publicBase.pathname,
		baseUrl: publicBase.origin,
		description:
			"Pedia - Pediatric Clinic Management System. An opinionated Vite Plus (Vite+) monorepo featuring TanStack Start, Paraglide.js (i18n), Hono, oRPC, drizzle-orm, better-auth, and more.",
		emailSupport,
		jurisdictionCountry: "the Republic of the Philippines",
		longName: "Pedia Clinic Management System",
		serverLocation: "Japan",
		shortName: "Pedia",
		url: PUBLIC_BASE_URL,
		version: BUILD_SOURCE_COMMIT
	},

	db: {
		pool: {
			max: isProd ? 20 : 10,
			idleTimeoutMillis: isProd ? 10_000 : 30_000,
			connectionTimeoutMillis: 2_000,
			keepAlive: true,
			keepAliveInitialDelayMillis: 10_000
		},
		cacheTTL: {
			patient: 30_000,
			appointment: 15_000,
			clinic: 60_000,
			static: 300_000
		},
		defaultTTL: 60_000,
		whoDataTTL: 7 * 24 * 60 * 60 * 1_000
	},

	clinical: {
		ageGroups: {
			neonate: { label: "Neonate", minMonths: 0, maxMonths: 1 },
			infant: { label: "Infant", minMonths: 1, maxMonths: 12 },
			toddler: { label: "Toddler", minMonths: 12, maxMonths: 36 },
			preschooler: { label: "Preschooler", minMonths: 36, maxMonths: 72 },
			schoolAge: { label: "School Age", minMonths: 72, maxMonths: 144 },
			adolescent: { label: "Adolescent", minMonths: 144, maxMonths: 216 }
		},
		vitals: {
			neonate: {
				hrMin: 100,
				hrMax: 165,
				rrMin: 30,
				rrMax: 60,
				sbpMin: 60,
				sbpMax: 90,
				dbpMin: 30,
				dbpMax: 60
			},
			infant: {
				hrMin: 90,
				hrMax: 150,
				rrMin: 24,
				rrMax: 40,
				sbpMin: 70,
				sbpMax: 105,
				dbpMin: 35,
				dbpMax: 65
			},
			toddler: {
				hrMin: 80,
				hrMax: 130,
				rrMin: 20,
				rrMax: 30,
				sbpMin: 80,
				sbpMax: 110,
				dbpMin: 40,
				dbpMax: 70
			},
			preschooler: {
				hrMin: 70,
				hrMax: 120,
				rrMin: 18,
				rrMax: 26,
				sbpMin: 85,
				sbpMax: 115,
				dbpMin: 45,
				dbpMax: 75
			},
			schoolAge: {
				hrMin: 65,
				hrMax: 110,
				rrMin: 16,
				rrMax: 22,
				sbpMin: 90,
				sbpMax: 120,
				dbpMin: 55,
				dbpMax: 80
			},
			adolescent: {
				hrMin: 60,
				hrMax: 100,
				rrMin: 12,
				rrMax: 20,
				sbpMin: 95,
				sbpMax: 130,
				dbpMin: 60,
				dbpMax: 85
			}
		},
		fever: {
			hypothermia: 35.5,
			normal: 37.4,
			lowGrade: 38.0,
			moderate: 39.0,
			high: 39.0 // REVIEW: same as moderate
		},
		painScale: {
			items: [
				{ score: 0, label: "No Hurt", emoji: "😊" },
				{ score: 2, label: "Hurts Little Bit", emoji: "🙂" },
				{ score: 4, label: "Hurts Little More", emoji: "😐" },
				{ score: 6, label: "Hurts Even More", emoji: "😟" },
				{ score: 8, label: "Hurts Whole Lot", emoji: "😣" },
				{ score: 10, label: "Hurts Worst", emoji: "😭" }
			]
		},
		bmi: {
			// REVIEW: percentiles, not absolute kg/m²
			underweight: 14.0,
			normal: 18.0,
			overweight: 20.0,
			obese: 20.0
		}
	},

	scheduling: {
		defaultDurationMinutes: 30,
		minNoticeMinutes: 15,
		maxDaysAhead: 90,
		workingHours: { start: "08:00", end: "17:00", timezone: "Asia/Manila" },
		statuses: [
			"Scheduled",
			"Checked In",
			"In Progress",
			"Completed",
			"Cancelled",
			"No Show"
		] as const,
		visitTypes: [
			"Well-Child Check",
			"Sick Visit",
			"Follow-Up",
			"Immunization Visit",
			"Consultation",
			"Lactation Consultation",
			"Emergency/Urgent",
			"Telehealth"
		] as const
	},

	immunizations: {
		milestones: [
			{ code: "HepB-1", name: "Hepatitis B (Dose 1)", months: 0 },
			{ code: "BCG-1", name: "BCG Vaccine", months: 0 },
			{ code: "DTaP-1", name: "DTaP (Dose 1)", months: 2 },
			{ code: "IPV-1", name: "IPV #1", months: 2 },
			{ code: "Hib-1", name: "Hib #1", months: 2 },
			{ code: "PCV15-1", name: "Pneumococcal #1", months: 2 },
			{ code: "Rota-1", name: "Rotavirus #1", months: 2 },
			{ code: "DTaP-2", name: "DTaP (Dose 2)", months: 4 },
			{ code: "IPV-2", name: "IPV #2", months: 4 },
			{ code: "Hib-2", name: "Hib #2", months: 4 },
			{ code: "PCV15-2", name: "Pneumococcal #2", months: 4 },
			{ code: "Rota-2", name: "Rotavirus #2", months: 4 },
			{ code: "DTaP-3", name: "DTaP (Dose 3)", months: 6 },
			{ code: "HepB-2", name: "Hepatitis B (Dose 2)", months: 6 },
			{ code: "PCV15-3", name: "Pneumococcal #3", months: 6 },
			{ code: "Flu-Annual", name: "Influenza", months: 6 },
			{ code: "MMR-1", name: "MMR #1", months: 12 },
			{ code: "Varicella-1", name: "Varicella #1", months: 12 },
			{ code: "HepA-1", name: "Hepatitis A (Dose 1)", months: 12 },
			{ code: "DTaP-4", name: "DTaP Booster #4", months: 15 },
			{ code: "Hib-Booster", name: "Hib Booster", months: 15 },
			{ code: "HepA-2", name: "Hepatitis A (Dose 2)", months: 18 },
			{ code: "DTaP-5", name: "DTaP Booster #5", months: 48 },
			{ code: "IPV-3", name: "IPV #3", months: 48 },
			{ code: "MMR-2", name: "MMR #2", months: 48 },
			{ code: "Varicella-2", name: "Varicella #2", months: 48 },
			{ code: "Tdap-1", name: "Tdap Adolescent", months: 132 },
			{ code: "HPV-1", name: "HPV 9-Valent #1", months: 132 },
			{ code: "MenACWY-1", name: "MenACWY #1", months: 132 }
		],
		statuses: [
			"Administered",
			"Due",
			"Overdue",
			"Upcoming",
			"Deferred",
			"Refused"
		] as const
	},

	prescriptions: {
		statuses: ["Active", "Completed", "Discontinued", "Cancelled"] as const,
		maxRefills: 5,
		defaultDurationDays: 7,
		formulary: [
			{
				id: "paracetamol",
				name: "Paracetamol / Acetaminophen",
				category: "Antipyretic / Analgesic"
			},
			{
				id: "ibuprofen",
				name: "Ibuprofen",
				category: "Antipyretic / Analgesic"
			},
			{
				id: "amoxicillin-standard",
				name: "Amoxicillin (Standard Dose)",
				category: "Antibiotic"
			},
			{
				id: "amoxicillin-high-dose",
				name: "Amoxicillin High-Dose (AOM Protocol)",
				category: "Antibiotic"
			},
			{
				id: "amox-clav",
				name: "Amoxicillin-Clavulanate (Augmentin)",
				category: "Antibiotic"
			},
			{
				id: "azithromycin",
				name: "Azithromycin (Zithromax)",
				category: "Antibiotic"
			},
			{
				id: "salbutamol",
				name: "Salbutamol / Albuterol",
				category: "Respiratory / Bronchodilator"
			},
			{
				id: "cetirizine",
				name: "Cetirizine (Zyrtec)",
				category: "Antihistamine"
			},
			{
				id: "ondansetron",
				name: "Ondansetron (Zofran)",
				category: "Antiemetic"
			},
			{
				id: "prednisolone",
				name: "Prednisolone Oral Solution",
				category: "Steroid"
			}
		]
	},

	laboratory: {
		statuses: [
			"Ordered",
			"Sample Collected",
			"Processing",
			"Completed",
			"Cancelled"
		] as const,
		priorities: ["Routine", "Urgent", "Stat"] as const,
		commonTests: [
			{ name: "Complete Blood Count (CBC)", category: "Hematology" },
			{ name: "Basic Metabolic Panel", category: "Biochemistry" },
			{ name: "Rapid Strep Test", category: "Microbiology" },
			{ name: "RSV / Flu PCR", category: "Microbiology" },
			{ name: "Urinalysis", category: "Urinalysis" },
			{ name: "Blood Culture", category: "Microbiology" },
			{ name: "Lead Screening", category: "Biochemistry" },
			{ name: "Iron Panel", category: "Biochemistry" }
		]
	},

	vector: {
		embeddingDimension: env.EMBEDDING_DIMENSION,
		similarityThreshold: 0.7,
		defaultLimit: 10,
		indexType: "hnsw" as const
	},

	auth: {
		sessionExpiryHours: 7 * 24,
		passwordResetExpiryHours: 1,
		twoFactorMaxAttempts: 5,
		twoFactorLockoutMinutes: 30,
		roles: ["admin", "doctor", "staff", "patient"] as const
	},

	audit: {
		actions: [
			"CREATE",
			"UPDATE",
			"DELETE",
			"VIEW",
			"EXPORT",
			"LOGIN",
			"RESTORE"
		] as const,
		entities: [
			"PATIENT",
			"ENCOUNTER",
			"IMMUNIZATION",
			"PRESCRIPTION",
			"LAB",
			"DATABASE"
		] as const,
		maxEntries: 10_000,
		retentionDays: 90
	},

	pagination: {
		defaultLimit: 50,
		maxLimit: 100
	},

	seed: {
		patients: 25,
		encountersPerPatient: { min: 2, max: 8 },
		vitalsPerEncounter: { min: 1, max: 1 },
		growthMeasurementsPerPatient: { min: 3, max: 10 },
		immunizationsPerPatient: { min: 5, max: 15 },
		prescriptionsPerPatient: { min: 1, max: 5 },
		labsPerPatient: { min: 1, max: 4 },
		staff: 6,
		appointmentsPerPatient: { min: 1, max: 3 },
		auditLogs: 50
	}
} as const;

export const appConfig = deepFreeze(rawConfig);
export default appConfig;

export type AppConfig = typeof appConfig;
export type ClinicalConfig = typeof appConfig.clinical;
export type SchedulingConfig = typeof appConfig.scheduling;
export type AuthConfig = typeof appConfig.auth;
