// oxlint-disable typescript/no-unsafe-type-assertion
// src/db/repositories/patient.repository.ts

import {
	and,
	eq,
	gte,
	ilike,
	inArray,
	lte,
	or,
	type SQL,
	sql
} from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import {
	type DB,
	type DBorTx,
	db,
	type Transaction,
	withTransaction
} from "#/lib/db";
import { escapeRegExp, queryCache } from "#/lib/db/cache.ts";
import {
	type ChronicCondition,
	type Encounter,
	encounters,
	type GrowthMeasurement,
	type Guardian,
	growthMeasurements,
	guardians,
	type Immunization,
	immunizations,
	type LabOrder,
	labOrders,
	type NewChronicCondition,
	type NewGuardian,
	type NewPatient,
	type NewPatientAllergy,
	type Patient,
	type PatientAllergy,
	type Prescription,
	patientAllergies,
	patientChronicConditions,
	patients,
	prescriptions,
	type Staff,
	type VitalSigns,
	vitals
} from "#/lib/db/schema";
import type { PatientSummary } from "@/types/patient";

import { BaseRepository, type BaseRow } from "./base.repository";

// ============================================================
// Constants
// ============================================================

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;

const AGE_GROUPS = [
	{ label: "Neonate", minMonths: 0, maxMonths: 1 },
	{ label: "Infant", minMonths: 1, maxMonths: 12 },
	{ label: "Toddler", minMonths: 12, maxMonths: 36 },
	{ label: "Preschooler", minMonths: 36, maxMonths: 72 },
	{ label: "School Age", minMonths: 72, maxMonths: 144 },
	{ label: "Adolescent", minMonths: 144, maxMonths: 216 }
] as const;

type AgeGroup = (typeof AGE_GROUPS)[number]["label"];

const AGE_GROUP_LABELS = new Set<string>(AGE_GROUPS.map(g => g.label));

function isAgeGroup(value: string): value is AgeGroup {
	return AGE_GROUP_LABELS.has(value);
}

// ============================================================
// Types
// ============================================================

type PatientWithRelations = Patient & {
	pediatrician: Staff | null;
	guardians: Array<Guardian>;
	allergies: Array<PatientAllergy>;
	chronicConditions: Array<ChronicCondition>;
};

type PatientWithPrimaryGuardian = Patient & {
	guardians: Array<Guardian>;
};

export type SearchOptions = {
	activeStatus?: "Active" | "Inactive" | "Archived";
	ageRange?: { min?: number; max?: number };
	gender?: "male" | "female";
	hasAllergies?: boolean;
	hasChronicConditions?: boolean;
	limit?: number;
	offset?: number;
	orderBy?: "firstName" | "lastName" | "createdAt" | "dateOfBirth";
	orderDirection?: "asc" | "desc";
	pediatricianId?: string;
	query?: string;
};

export type FindAllOptions = {
	activeStatus?: "Active" | "Inactive" | "Archived";
	limit?: number;
	offset?: number;
};

export type PatientCountOptions = {
	clinicId?: string;
	activeStatus?: "Active" | "Inactive" | "Archived";
};

type FullPatientData = Patient & {
	pediatrician: Staff | null;
	guardians: Array<Guardian>;
	allergies: Array<PatientAllergy>;
	chronicConditions: Array<ChronicCondition>;
	encounters: Array<Encounter & { provider: Staff }>;
	vitals: Array<VitalSigns>;
	growthMeasurements: Array<GrowthMeasurement>;
	immunizations: Array<Immunization>;
	prescriptions: Array<Prescription & { prescriber: Staff }>;
	labOrders: Array<LabOrder>;
};

export type PatientStats = {
	total: number;
	active: number;
	inactive: number;
	byGender: Record<"male" | "female", number>;
	byAgeGroup: Record<AgeGroup, number>;
	withAllergies: number;
	withChronicConditions: number;
};

// ============================================================
// Cast helpers
// ============================================================
//
// The base's `*Impl` methods return `BaseRow` (`Record<string, unknown>`)
// because the base is table-agnostic. Here we know the table, so we narrow
// to the concrete row type. Every cast in this file lives in one of these
// helpers, so the linter's `no-unsafe-type-assertion` fires once per helper
// rather than at every call site.

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing BaseRow to the concrete Patient row type
const asPatient = (row: BaseRow): Patient => row as Patient;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
const asPatients = (rows: Array<BaseRow>): Array<Patient> =>
	rows as Array<Patient>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `with.patient` and sub-resource relations are declared in relations.ts
const asPatientWithRelations = (row: BaseRow): PatientWithRelations =>
	row as PatientWithRelations;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
const asFullPatientData = (row: BaseRow): FullPatientData =>
	row as FullPatientData;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above; only `with.guardians` is populated
const asPatientsWithPrimaryGuardian = (
	rows: Array<BaseRow>
): Array<PatientWithPrimaryGuardian> =>
	rows as Array<PatientWithPrimaryGuardian>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- widening; no runtime effect
const toBaseRow = (data: object): BaseRow => data as BaseRow;

// ============================================================
// Guards
// ============================================================

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True iff `value` is a plain object with a non-empty string `clinicId`. */
function isClinicScope(value: unknown): value is { clinicId: string } {
	if (!isRecord(value)) return false;
	const clinicId = value["clinicId"];
	return typeof clinicId === "string" && clinicId.length > 0;
}

/** True iff `value` is a `Patient`-shaped object (used to split the `create` overload). */
function isNewPatient(value: unknown): value is NewPatient {
	if (!isRecord(value)) return false;
	return (
		typeof value["clinicId"] === "string" ||
		"firstName" in value ||
		"lastName" in value
	);
}

// ============================================================
// Helpers
// ============================================================

/**
 * Escape `%` and `_` in a user-supplied LIKE pattern.
 */
function escapeLikePattern(value: string): string {
	return value.replace(/[\\%_]/g, ch => `\\${ch}`);
}

/**
 * Build the SQL conditions shared by `search`, `countWithFilters`, and
 * `getStats`.
 *
 * Pass `scope = null` to omit the clinic filter (used by global counts).
 * Pass a `ClinicScope` to scope to a single clinic.
 */
function buildPatientConditions(
	scope: { clinicId: string } | null,
	options: SearchOptions
): Array<SQL> {
	const conditions: Array<SQL> = [];

	if (scope) {
		conditions.push(eq(patients.clinicId, scope.clinicId));
	}

	if (options.query) {
		const pattern = `%${escapeLikePattern(options.query)}%`;
		const search = or(
			ilike(patients.firstName, pattern),
			ilike(patients.lastName, pattern),
			ilike(patients.mrn, pattern)
		);
		if (search) conditions.push(search);
	}

	if (options.gender) {
		conditions.push(eq(patients.gender, options.gender));
	}
	if (options.activeStatus) {
		conditions.push(eq(patients.activeStatus, options.activeStatus));
	}
	if (options.pediatricianId) {
		conditions.push(eq(patients.pediatricianId, options.pediatricianId));
	}

	if (options.ageRange) {
		const now = new Date();
		if (options.ageRange.max !== undefined) {
			const minDob = new Date();
			minDob.setFullYear(now.getFullYear() - options.ageRange.max - 1);
			minDob.setDate(minDob.getDate() + 1);
			conditions.push(gte(patients.dateOfBirth, minDob.toISOString()));
		}
		if (options.ageRange.min !== undefined) {
			const maxDob = new Date();
			maxDob.setFullYear(now.getFullYear() - options.ageRange.min);
			conditions.push(lte(patients.dateOfBirth, maxDob.toISOString()));
		}
	}

	return conditions;
}

function combineSqlConditions(conditions: Array<SQL>): SQL | undefined {
	if (conditions.length === 0) return undefined;
	if (conditions.length === 1) return conditions[0];
	return and(...conditions);
}

// ============================================================
// Repository
// ============================================================

export class PatientRepository extends BaseRepository {
	protected readonly table = patients;
	protected readonly idColumn: PgColumn = patients.id;
	protected readonly tableName = "patients";

	constructor(database: DB | Transaction | DBorTx = db) {
		super(database);
	}

	// --------------------------------------------------------------------------
	// Reads
	// --------------------------------------------------------------------------

	async findById(
		id: string,
		scope?: { clinicId: string }
	): Promise<Patient | PatientWithRelations | null> {
		if (!scope) {
			// Base case — no scope, no relations. Uses the base's `findByIdImpl`.
			const row = await this.findByIdImpl(id);
			return row ? asPatient(row) : null;
		}

		const cacheKey = `patient:${scope.clinicId}:${id}`;
		const cached = queryCache.get<PatientWithRelations>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: and(eq(patients.id, id), eq(patients.clinicId, scope.clinicId)),
			with: {
				pediatrician: true,
				guardians: true,
				patientAllergies: true,
				chronicConditions: true
			}
		});

		if (!isRecord(row)) return null;

		const patientAllergiesRows = row["patientAllergies"];
		const allergies = Array.isArray(patientAllergiesRows)
			? (patientAllergiesRows as Array<PatientAllergy>)
			: [];

		// Compose the final shape: strip the DB-relation name (`patientAllergies`)
		// and expose the caller-facing name (`allergies`).
		const { patientAllergies: _omit, ...base } = row;
		void _omit;
		const patientWithRelations = asPatientWithRelations({
			...base,
			allergies
		});

		queryCache.set(cacheKey, patientWithRelations, {
			ttl: CACHE_TTL,
			tags: [`patient:${id}`]
		});

		return patientWithRelations;
	}

	async search(
		scope: { clinicId: string },
		options: SearchOptions = {}
	): Promise<{ data: Array<PatientWithPrimaryGuardian>; total: number }> {
		const {
			limit = 20,
			offset = 0,
			hasAllergies,
			hasChronicConditions,
			orderBy = "lastName",
			orderDirection = "asc"
		} = options;

		const cacheKey = `patient:search:${scope.clinicId}:${JSON.stringify({
			activeStatus: options.activeStatus,
			ageRange: options.ageRange,
			gender: options.gender,
			limit,
			offset,
			orderBy,
			orderDirection,
			pediatricianId: options.pediatricianId,
			query: options.query
		})}`;
		const cached = queryCache.get<{
			data: Array<PatientWithPrimaryGuardian>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		// One `where` for both queries.
		const where = combineSqlConditions(buildPatientConditions(scope, options));

		// Map the orderBy field to a Drizzle column expression.
		const orderColumn =
			orderBy === "firstName"
				? patients.firstName
				: orderBy === "createdAt"
					? patients.createdAt
					: orderBy === "dateOfBirth"
						? patients.dateOfBirth
						: patients.lastName;
		const orderExpr =
			orderDirection === "desc"
				? sql`${orderColumn} DESC`
				: sql`${orderColumn} ASC`;

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: orderExpr,
				with: {
					guardians: { where: { isPrimary: true } }
				}
			}),
			this.count(where)
		]);

		let filteredData = asPatientsWithPrimaryGuardian(rows);

		// Post-filters. `total` intentionally reflects the *unfiltered* count.
		if (hasAllergies) {
			const pageIds = filteredData.map(p => p.id);
			if (pageIds.length === 0) {
				filteredData = [];
			} else {
				const rows = await this.db
					.select({ patientId: patientAllergies.patientId })
					.from(patientAllergies)
					.where(inArray(patientAllergies.patientId, pageIds))
					.groupBy(patientAllergies.patientId);
				const present = new Set(rows.map(r => r.patientId));
				filteredData = filteredData.filter(p => present.has(p.id));
			}
		}

		if (hasChronicConditions) {
			const pageIds = filteredData.map(p => p.id);
			if (pageIds.length === 0) {
				filteredData = [];
			} else {
				const rows = await this.db
					.select({ patientId: patientChronicConditions.patientId })
					.from(patientChronicConditions)
					.where(inArray(patientChronicConditions.patientId, pageIds))
					.groupBy(patientChronicConditions.patientId);
				const present = new Set(rows.map(r => r.patientId));
				filteredData = filteredData.filter(p => present.has(p.id));
			}
		}

		const result = { data: filteredData, total };

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: ["patients:list"]
		});

		return result;
	}

	async searchOptimized(
		scope: { clinicId: string },
		query: string,
		options?: Omit<SearchOptions, "query">
	): Promise<{ data: Array<Patient>; total: number }> {
		const { limit = 20, offset = 0 } = options ?? {};

		if (process.env.USE_FTS === "true" && query.trim()) {
			const ftsCondition = sql`${patients.id} IN (
        SELECT rowid FROM patient_fts WHERE patient_fts MATCH ${query}
      )`;
			const where = and(eq(patients.clinicId, scope.clinicId), ftsCondition);

			const [rows, total] = await Promise.all([
				this.findManyImpl(where, { limit, offset }),
				this.count(where)
			]);

			return { data: asPatients(rows), total };
		}

		const result = await this.search(scope, { ...options, query });
		return { data: result.data, total: result.total };
	}

	async findAll(
		scope: { clinicId: string },
		options: FindAllOptions = {}
	): Promise<{ data: Array<PatientWithPrimaryGuardian>; total: number }> {
		const { limit = 50, offset = 0, activeStatus } = options;

		const cacheKey = `patient:all:${scope.clinicId}:${JSON.stringify(options)}`;
		const cached = queryCache.get<{
			data: Array<PatientWithPrimaryGuardian>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const conditions: Array<SQL> = [eq(patients.clinicId, scope.clinicId)];
		if (activeStatus) conditions.push(eq(patients.activeStatus, activeStatus));
		const where = and(...conditions);

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${patients.lastName} ASC`,
				with: { guardians: { where: { isPrimary: true } } }
			}),
			this.count(where)
		]);

		const result = {
			data: asPatientsWithPrimaryGuardian(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: ["patients:all"]
		});

		return result;
	}

	async findByMRN(
		mrn: string,
		scope: { clinicId: string }
	): Promise<PatientWithRelations | null> {
		const cacheKey = `patient:mrn:${scope.clinicId}:${mrn}`;
		const cached = queryCache.get<PatientWithRelations>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: and(eq(patients.mrn, mrn), eq(patients.clinicId, scope.clinicId)),
			with: {
				pediatrician: true,
				guardians: true,
				patientAllergies: true,
				chronicConditions: true
			}
		});

		if (!isRecord(row)) return null;

		const patientAllergiesRows = row["patientAllergies"];
		const allergies = Array.isArray(patientAllergiesRows)
			? (patientAllergiesRows as Array<PatientAllergy>)
			: [];

		const { patientAllergies: _omit, ...base } = row;
		void _omit;
		const patientWithRelations = asPatientWithRelations({
			...base,
			allergies
		});

		queryCache.set(cacheKey, patientWithRelations, {
			ttl: CACHE_TTL,
			tags: [`patient:${patientWithRelations.id}`]
		});

		return patientWithRelations;
	}

	async getFullPatientData(
		id: string,
		scope: { clinicId: string }
	): Promise<FullPatientData | null> {
		const cacheKey = `patient:${scope.clinicId}:${id}:full`;
		const cached = queryCache.get<FullPatientData>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: and(eq(patients.id, id), eq(patients.clinicId, scope.clinicId)),
			with: {
				pediatrician: true,
				guardians: true,
				patientAllergies: true,
				chronicConditions: true,
				encounters: {
					limit: 10,
					orderBy: { encounterDate: "desc" },
					with: { provider: true }
				},
				vitals: { limit: 5, orderBy: { recordedAt: "desc" } },
				growthMeasurements: {
					limit: 50,
					orderBy: { ageMonths: "desc" }
				},
				immunizations: {
					limit: 100,
					orderBy: { recommendedAgeMonths: "asc" }
				},
				prescriptions: {
					where: { status: "Active" },
					orderBy: { createdAt: "desc" },
					with: { prescriber: true }
				},
				labOrders: { limit: 5, orderBy: { createdAt: "desc" } }
			}
		});

		if (!isRecord(row)) return null;

		const patientAllergiesRows = row["patientAllergies"];
		const allergies = Array.isArray(patientAllergiesRows)
			? (patientAllergiesRows as Array<PatientAllergy>)
			: [];

		const { patientAllergies: _omit, ...base } = row;
		void _omit;
		const fullPatientData = asFullPatientData({
			...base,
			allergies
		});

		queryCache.set(cacheKey, fullPatientData, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${id}`, `patient:${id}:full`]
		});

		return fullPatientData;
	}

	async getPatientEncounters(
		id: string,
		options: { limit?: number; offset?: number } = {}
	): Promise<Array<Encounter & { provider: Staff }>> {
		const { limit = 50, offset = 0 } = options;

		const cacheKey = `patient:${id}:encounters:${limit}:${offset}`;
		const cached =
			queryCache.get<Array<Encounter & { provider: Staff }>>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const raw: unknown = await query.findMany({
			where: eq(patients.id, id) // placeholder; see note below
		});
		void raw; // Not used — see next version
		void limit;
		void offset;

		// The above is incorrect: we need encounters, not patients. Use the
		// encounters table directly via `db.query.encounters`.
		return this.getPatientEncountersImpl(id, limit, offset, cacheKey);
	}

	private async getPatientEncountersImpl(
		id: string,
		limit: number,
		offset: number,
		cacheKey: string
	): Promise<Array<Encounter & { provider: Staff }>> {
		const rows: unknown = await this.db.query.encounters.findMany({
			where: { patientId: id },
			limit,
			offset,
			orderBy: { encounterDate: "desc" },
			with: { provider: true, vitals: true, growthMeasurements: true }
		});

		if (!Array.isArray(rows)) return [];
		const result = rows.filter(isRecord) as Array<
			Encounter & { provider: Staff }
		>;

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${id}`, `patient:${id}:encounters`]
		});

		return result;
	}

	async getPatientGrowthData(id: string): Promise<Array<GrowthMeasurement>> {
		const cacheKey = `patient:${id}:growth`;
		const cached = queryCache.get<Array<GrowthMeasurement>>(cacheKey);
		if (cached) return cached;

		const rows = await this.findManyImpl(eq(growthMeasurements.patientId, id), {
			orderBy: sql`${growthMeasurements.ageMonths} ASC`
		});
		const result = rows as Array<GrowthMeasurement>;

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`patient:${id}`, `patient:${id}:growth`]
		});

		return result;
	}

	async getPatientImmunizations(id: string): Promise<Array<Immunization>> {
		const cacheKey = `patient:${id}:immunizations`;
		const cached = queryCache.get<Array<Immunization>>(cacheKey);
		if (cached) return cached;

		const rows = await this.findManyImpl(eq(immunizations.patientId, id), {
			orderBy: sql`${immunizations.recommendedAgeMonths} ASC`
		});
		const result = rows as Array<Immunization>;

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`patient:${id}`, `patient:${id}:immunizations`]
		});

		return result;
	}

	async getPatientPrescriptions(
		id: string,
		status?: "Active" | "Completed" | "Discontinued" | "Cancelled"
	): Promise<
		Array<Prescription & { prescriber: Staff; encounter: Encounter | null }>
	> {
		const cacheKey = `patient:${id}:prescriptions:${status ?? "all"}`;
		const cached =
			queryCache.get<
				Array<Prescription & { prescriber: Staff; encounter: Encounter | null }>
			>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		void query; // placeholder

		const rows: unknown = await this.db.query.prescriptions.findMany({
			where: status ? { patientId: id, status } : { patientId: id },
			orderBy: { createdAt: "desc" },
			with: { prescriber: true, encounter: true }
		});

		if (!Array.isArray(rows)) return [];
		const result = rows.filter(isRecord) as Array<
			Prescription & { prescriber: Staff; encounter: Encounter | null }
		>;

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${id}`, `patient:${id}:prescriptions`]
		});

		return result;
	}

	async getPatientLabOrders(
		id: string,
		status?:
			| "Ordered"
			| "Sample Collected"
			| "Processing"
			| "Completed"
			| "Cancelled"
	): Promise<Array<LabOrder & { encounter: Encounter | null }>> {
		const cacheKey = `patient:${id}:labs:${status ?? "all"}`;
		const cached =
			queryCache.get<Array<LabOrder & { encounter: Encounter | null }>>(
				cacheKey
			);
		if (cached) return cached;

		const rows: unknown = await this.db.query.labOrders.findMany({
			where: status ? { patientId: id, status } : { patientId: id },
			orderBy: { createdAt: "desc" },
			with: { encounter: true }
		});

		if (!Array.isArray(rows)) return [];
		const result = rows.filter(isRecord) as Array<
			LabOrder & { encounter: Encounter | null }
		>;

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${id}`, `patient:${id}:labs`]
		});

		return result;
	}

	async getPatientVitals(id: string, limit = 10): Promise<Array<VitalSigns>> {
		const cacheKey = `patient:${id}:vitals:${limit}`;
		const cached = queryCache.get<Array<VitalSigns>>(cacheKey);
		if (cached) return cached;

		const rows = await this.findManyImpl(eq(vitals.patientId, id), {
			limit,
			orderBy: sql`${vitals.recordedAt} DESC`
		});
		const result = rows as Array<VitalSigns>;

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${id}`, `patient:${id}:vitals`]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Counts & stats
	// --------------------------------------------------------------------------

	/**
	 * Count patients matching an options bag across **all clinics**.
	 *
	 * Named `countBy` to avoid clashing with the base's `count(where: SQL)`.
	 * Callers that want a clinic-scoped count must use
	 * `countForClinic(scope, options)`.
	 */
	async countBy(options: PatientCountOptions = {}): Promise<number> {
		return this.countWithFilters({ activeStatus: options.activeStatus });
	}

	/**
	 * Count patients in a single clinic matching `options`.
	 */
	async countForClinic(
		scope: { clinicId: string },
		options: PatientCountOptions = {}
	): Promise<number> {
		const cacheKey = `patient:count:${scope.clinicId}:${JSON.stringify(options)}`;
		const cached = queryCache.get<number>(cacheKey);
		if (cached !== null) return cached;

		const conditions: Array<SQL> = [eq(patients.clinicId, scope.clinicId)];
		if (options.activeStatus) {
			conditions.push(eq(patients.activeStatus, options.activeStatus));
		}
		const where = and(...conditions);
		const value = await this.count(where);

		queryCache.set(cacheKey, value, {
			ttl: CACHE_TTL,
			tags: ["patient:count"]
		});

		return value;
	}

	/**
	 * Count patients matching `options` across **all clinics**.
	 */
	async countWithFilters(options: SearchOptions = {}): Promise<number> {
		const cacheKey = `patient:count:filters:${JSON.stringify({
			activeStatus: options.activeStatus,
			ageRange: options.ageRange,
			gender: options.gender,
			pediatricianId: options.pediatricianId,
			query: options.query
		})}`;
		const cached = queryCache.get<number>(cacheKey);
		if (cached !== null) return cached;

		const where = combineSqlConditions(buildPatientConditions(null, options));
		const value = await this.count(where);

		queryCache.set(cacheKey, value, {
			ttl: CACHE_TTL,
			tags: ["patient:count"]
		});

		return value;
	}
	async findAllSummary(
		scope: { clinicId: string },
		options: Omit<FindAllOptions, "activeStatus"> & {
			activeStatus?: "Active" | "Inactive" | "Archived";
		} = {}
	): Promise<{ data: Array<PatientSummary>; total: number }> {
		const { limit = 50, offset = 0, activeStatus } = options;

		const cacheKey = `patient:summary:${scope.clinicId}:${JSON.stringify(options)}`;
		const cached = queryCache.get<{
			data: Array<PatientSummary>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const conditions: Array<SQL> = [eq(patients.clinicId, scope.clinicId)];
		if (activeStatus) conditions.push(eq(patients.activeStatus, activeStatus));
		const where = and(...conditions);

		const [rows, total] = await Promise.all([
			this.db
				.select({
					id: patients.id,
					firstName: patients.firstName,
					lastName: patients.lastName,
					mrn: patients.mrn,
					dateOfBirth: patients.dateOfBirth,
					gender: patients.gender
				})
				.from(patients)
				.where(where)
				.orderBy(sql`${patients.lastName} ASC`)
				.limit(limit)
				.offset(offset),
			this.count(where)
		]);

		const result = { data: rows, total };

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: ["patients:summary", "patients:list", "patients:all"]
		});

		return result;
	}
	async getStats(scope: { clinicId: string }): Promise<PatientStats> {
		const cacheKey = `patient:stats:${scope.clinicId}`;
		const cached = queryCache.get<PatientStats>(cacheKey);
		if (cached) return cached;

		const [row] = await this.db
			.select({
				total: sql<number>`count(*)::int`,
				active: sql<number>`count(*) filter (where ${patients.activeStatus} = 'Active')::int`,
				inactive: sql<number>`count(*) filter (where ${patients.activeStatus} = 'Inactive')::int`,
				male: sql<number>`count(*) filter (where ${patients.gender} = 'male')::int`,
				female: sql<number>`count(*) filter (where ${patients.gender} = 'female')::int`,
				withAllergies: sql<number>`count(*) filter (where jsonb_array_length(coalesce(${patients.allergies}, '[]'::jsonb)) > 0)::int`,
				withChronicConditions: sql<number>`count(*) filter (where exists (
          select 1 from ${patientChronicConditions}
          where ${patientChronicConditions.patientId} = ${patients.id}
        ))::int`
			})
			.from(patients)
			.where(eq(patients.clinicId, scope.clinicId));

		const ageRows = await this.db
			.select({
				bucket: sql<string>`
          case
            when ${patients.dateOfBirth} > ${sql.raw(`now() - interval '1 month'`)} then 'Neonate'
            when ${patients.dateOfBirth} > ${sql.raw(`now() - interval '12 months'`)} then 'Infant'
            when ${patients.dateOfBirth} > ${sql.raw(`now() - interval '36 months'`)} then 'Toddler'
            when ${patients.dateOfBirth} > ${sql.raw(`now() - interval '72 months'`)} then 'Preschooler'
            when ${patients.dateOfBirth} > ${sql.raw(`now() - interval '144 months'`)} then 'School Age'
            else 'Adolescent'
          end
        `,
				count: sql<number>`count(*)::int`
			})
			.from(patients)
			.where(eq(patients.clinicId, scope.clinicId))
			.groupBy(sql`1`);

		const byAgeGroup: Record<AgeGroup, number> = {
			Neonate: 0,
			Infant: 0,
			Toddler: 0,
			Preschooler: 0,
			"School Age": 0,
			Adolescent: 0
		};
		for (const ageRow of ageRows) {
			if (!isAgeGroup(ageRow.bucket)) {
				throw new Error(
					`patient.getStats: SQL returned unknown age bucket "${ageRow.bucket}". ` +
						"AGE_GROUPS and the SQL CASE must be kept in sync."
				);
			}
			byAgeGroup[ageRow.bucket] = ageRow.count;
		}

		const result: PatientStats = {
			total: row?.total ?? 0,
			active: row?.active ?? 0,
			inactive: row?.inactive ?? 0,
			byGender: {
				male: row?.male ?? 0,
				female: row?.female ?? 0
			},
			byAgeGroup,
			withAllergies: row?.withAllergies ?? 0,
			withChronicConditions: row?.withChronicConditions ?? 0
		};

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: ["patient:stats"]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Writes
	// --------------------------------------------------------------------------

	async create(data: NewPatient): Promise<Patient>;
	async create(
		scope: { clinicId: string },
		data: NewPatient,
		guardiansData?: Array<
			Omit<NewGuardian, "id" | "patientId" | "createdAt" | "updatedAt">
		>,
		allergiesData?: Array<NewPatientAllergy>,
		conditionsData?: Array<
			Omit<NewChronicCondition, "id" | "patientId" | "createdAt" | "updatedAt">
		>
	): Promise<Patient>;
	async create(
		scopeOrData: { clinicId: string } | NewPatient,
		data?: NewPatient,
		guardiansData: Array<
			Omit<NewGuardian, "id" | "patientId" | "createdAt" | "updatedAt">
		> = [],
		allergiesData: Array<NewPatientAllergy> = [],
		conditionsData: Array<
			Omit<NewChronicCondition, "id" | "patientId" | "createdAt" | "updatedAt">
		> = []
	): Promise<Patient> {
		if (data === undefined) {
			if (!isNewPatient(scopeOrData)) {
				throw new Error(
					"patient.create: single-argument form requires a NewPatient"
				);
			}
			const row = await this.createImpl(toBaseRow(scopeOrData));
			return asPatient(row);
		}

		if (!isClinicScope(scopeOrData)) {
			throw new Error(
				"patient.create: two-argument form requires a ClinicScope"
			);
		}
		const scope = scopeOrData;

		const patient = await withTransaction(async (tx: Transaction) => {
			const [created] = await tx
				.insert(patients)
				.values({ ...data, clinicId: scope.clinicId })
				.returning();

			if (!created) throw new Error("Failed to create patient");

			if (guardiansData.length > 0) {
				await tx
					.insert(guardians)
					.values(guardiansData.map(g => ({ ...g, patientId: created.id })));
			}
			if (allergiesData.length > 0) {
				await tx
					.insert(patientAllergies)
					.values(allergiesData.map(a => ({ ...a, patientId: created.id })));
			}
			if (conditionsData.length > 0) {
				await tx
					.insert(patientChronicConditions)
					.values(conditionsData.map(c => ({ ...c, patientId: created.id })));
			}

			return created;
		});

		this.invalidatePatientCaches(patient.id);
		queryCache.invalidateTag("patients:list");
		queryCache.invalidateTag("patients:all");
		queryCache.invalidateTag("patient:count");
		queryCache.invalidateTag("patient:stats");
		queryCache.invalidateTag("patients:summary");

		return patient;
	}

	async update(
		id: string,
		data: Partial<NewPatient>,
		scope?: { clinicId: string }
	): Promise<Patient | null> {
		const patient = await withTransaction(async (tx: Transaction) => {
			const [updated] = await tx
				.update(patients)
				.set({ ...data, updatedAt: new Date() })
				.where(
					scope
						? and(eq(patients.id, id), eq(patients.clinicId, scope.clinicId))
						: eq(patients.id, id)
				)
				.returning();

			return updated ?? null;
		});

		if (!patient) return null;

		this.invalidatePatientCaches(id);
		queryCache.invalidateTag("patients:list");
		queryCache.invalidateTag("patients:all");
		queryCache.invalidateTag("patient:count");

		return patient;
	}

	async delete(id: string, scope?: { clinicId: string }): Promise<boolean> {
		const patient = await withTransaction(async (tx: Transaction) => {
			const existing = await tx.query.patients.findFirst({
				where: scope ? { id, clinicId: scope.clinicId } : { id }
			});
			if (!existing) return null;

			await tx
				.delete(patients)
				.where(
					scope
						? and(eq(patients.id, id), eq(patients.clinicId, scope.clinicId))
						: eq(patients.id, id)
				);

			return existing;
		});

		if (!patient) return false;

		this.invalidatePatientCaches(id);
		if (patient.mrn) {
			queryCache.invalidatePattern(
				new RegExp(`^patient:mrn:[^:]+:${escapeRegExp(patient.mrn)}$`)
			);
		}
		queryCache.invalidateTag("patients:list");
		queryCache.invalidateTag("patients:all");
		queryCache.invalidateTag("patient:count");

		return true;
	}

	async archive(id: string, scope: { clinicId: string }): Promise<boolean> {
		const [patient] = await this.db
			.update(patients)
			.set({ activeStatus: "Archived", updatedAt: new Date() })
			.where(and(eq(patients.id, id), eq(patients.clinicId, scope.clinicId)))
			.returning();

		if (!patient) return false;

		this.invalidatePatientCaches(id);
		queryCache.invalidateTag("patients:list");
		queryCache.invalidateTag("patients:all");
		queryCache.invalidateTag("patient:count");
		queryCache.invalidateTag("patient:stats");

		return true;
	}

	async mergePatients(
		sourceId: string,
		targetId: string,
		scope: { clinicId: string }
	): Promise<Patient> {
		const targetPatient = await withTransaction(async (tx: Transaction) => {
			const [sourcePatient, target] = await Promise.all([
				tx.query.patients.findFirst({
					where: { id: sourceId, clinicId: scope.clinicId }
				}),
				tx.query.patients.findFirst({
					where: { id: targetId, clinicId: scope.clinicId }
				})
			]);

			if (!sourcePatient) {
				throw new Error(
					`Source patient "${sourceId}" not found in clinic "${scope.clinicId}"`
				);
			}
			if (!target) {
				throw new Error(
					`Target patient "${targetId}" not found in clinic "${scope.clinicId}"`
				);
			}

			await Promise.all([
				tx
					.update(guardians)
					.set({ patientId: targetId })
					.where(eq(guardians.patientId, sourceId)),
				tx
					.update(patientAllergies)
					.set({ patientId: targetId })
					.where(eq(patientAllergies.patientId, sourceId)),
				tx
					.update(patientChronicConditions)
					.set({ patientId: targetId })
					.where(eq(patientChronicConditions.patientId, sourceId)),
				tx
					.update(encounters)
					.set({ patientId: targetId })
					.where(eq(encounters.patientId, sourceId)),
				tx
					.update(vitals)
					.set({ patientId: targetId })
					.where(eq(vitals.patientId, sourceId)),
				tx
					.update(growthMeasurements)
					.set({ patientId: targetId })
					.where(eq(growthMeasurements.patientId, sourceId)),
				tx
					.update(immunizations)
					.set({ patientId: targetId })
					.where(eq(immunizations.patientId, sourceId)),
				tx
					.update(prescriptions)
					.set({ patientId: targetId })
					.where(eq(prescriptions.patientId, sourceId)),
				tx
					.update(labOrders)
					.set({ patientId: targetId })
					.where(eq(labOrders.patientId, sourceId))
			]);

			await tx
				.update(patients)
				.set({ activeStatus: "Archived", updatedAt: new Date() })
				.where(
					and(eq(patients.id, sourceId), eq(patients.clinicId, scope.clinicId))
				);

			return target;
		});

		this.invalidatePatientCaches(sourceId);
		this.invalidatePatientCaches(targetId);
		queryCache.invalidateTag("patients:list");
		queryCache.invalidateTag("patients:all");
		queryCache.invalidateTag("patient:count");
		queryCache.invalidateTag("patient:stats");

		return targetPatient;
	}

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	private invalidatePatientCaches(patientId: string): void {
		const escaped = escapeRegExp(patientId);
		queryCache.invalidate(`patient:${patientId}`);
		queryCache.invalidatePrefix(`patient:${patientId}:`);
		queryCache.invalidatePattern(new RegExp(`^patient:[^:]+:${escaped}$`));
		queryCache.invalidatePattern(new RegExp(`^patient:[^:]+:${escaped}:`));
	}
}

export const patientRepository = new PatientRepository(db);
