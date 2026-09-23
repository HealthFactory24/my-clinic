// src/lib/db/repositories/encounter.repository.ts
import { eq, gte, ilike, lte, or, type SQL, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import {
	combineConditions,
	type DB,
	type DBorTx,
	db,
	readCount,
	type Transaction,
	withTransaction
} from "#/lib/db";
import { escapeRegExp, queryCache } from "#/lib/db/cache";
import {
	type AssessmentData,
	type DiagnosisItem,
	ENCOUNTER_STATUSES,
	type Encounter,
	type EncounterStatus,
	encounters,
	type GrowthMeasurement,
	type Guardian,
	type LabOrder,
	type NewEncounter,
	type Patient,
	type PlanData,
	type Prescription,
	patients,
	type Staff,
	VISIT_TYPES,
	type VisitType,
	type VitalSigns,
	vitals as vitalTable
} from "#/lib/db/schema";

import { BaseRepository, type ClinicScope } from "./base.repository";

// ============================================================
// Types
// ============================================================

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;

export type FindByPatientOptions = {
	endDate?: Date;
	limit?: number;
	offset?: number;
	startDate?: Date;
	status?: EncounterStatus;
	visitType?: VisitType;
};
function zeroCounts<K extends string>(keys: readonly K[]): Record<K, number> {
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- loop below fills every key of K
	const result = {} as Record<K, number>;
	for (const k of keys) result[k] = 0;
	return result;
}

export type SearchOptions = {
	endDate?: Date;
	limit?: number;
	offset?: number;
	patientId?: string;
	providerId?: string;
	query?: string;
	startDate?: Date;
	status?: EncounterStatus;
	visitType?: VisitType;
};

export type DateRangeOptions = {
	limit?: number;
	offset?: number;
};

export type CountOptions = {
	endDate?: Date;
	patientId?: string;
	providerId?: string;
	startDate?: Date;
	status?: EncounterStatus;
	visitType?: VisitType;
};

type PatientWithPrimaryGuardians = Patient & {
	guardians: Array<Guardian>;
};

type EncounterWithRelations = Encounter & {
	patient: PatientWithPrimaryGuardians;
	provider: Staff;
	vitals?: Array<VitalSigns>;
	growthMeasurements?: Array<GrowthMeasurement>;
	prescriptions?: Array<Prescription>;
	labOrders?: Array<LabOrder>;
};

type VitalInput = {
	temperatureC: number;
	heartRateBpm: number;
	respiratoryRateBpm: number;
	systolicBp?: number;
	diastolicBp?: number;
	oxygenSaturationPercent: number;
	painScore?: number;
	weightKg?: number;
	heightCm?: number;
	notes?: string;
	recordedAt: Date;
};

// ============================================================
// Helpers
// ============================================================

/**
 * Escape `%` and `_` in a user-supplied LIKE pattern so `search` cannot be
 * used to inject additional wildcards. Mirrors the private helper in
 * `base.repository.ts`.
 */
function escapeLikePattern(value: string): string {
	return value.replace(/[\\%_]/g, ch => `\\${ch}`);
}

/**
 * Translate an option bag into an array of typed SQL conditions. The result is
 * ready to be passed to `combineConditions()` so a single `WHERE` builder
 * serves `findByPatientId`, `search`, and `count`.
 */
function buildEncounterConditions(opts: {
	patientId?: string;
	providerId?: string;
	status?: EncounterStatus;
	visitType?: VisitType;
	startDate?: Date;
	endDate?: Date;
	query?: string;
}): Array<SQL | undefined> {
	const conditions: Array<SQL | undefined> = [];

	if (opts.patientId) conditions.push(eq(encounters.patientId, opts.patientId));
	if (opts.providerId)
		conditions.push(eq(encounters.providerId, opts.providerId));
	if (opts.status) conditions.push(eq(encounters.status, opts.status));
	if (opts.visitType) conditions.push(eq(encounters.visitType, opts.visitType));
	if (opts.startDate)
		conditions.push(gte(encounters.encounterDate, opts.startDate));
	if (opts.endDate)
		conditions.push(lte(encounters.encounterDate, opts.endDate));

	if (opts.query) {
		const pattern = `%${escapeLikePattern(opts.query)}%`;
		conditions.push(
			or(
				ilike(encounters.chiefComplaint, pattern),
				ilike(encounters.providerName, pattern),
				or(
					ilike(patients.firstName, pattern),
					ilike(patients.lastName, pattern),
					ilike(patients.mrn, pattern)
				)
			)
		);
	}

	return conditions;
}

/**
 * Relational `where` shape used by Drizzle's query builder.
 *
 * Uses the schema-derived relations types so Drizzle can validate the shape
 * against `encountersRelations`. Do NOT annotate this as
 * `WhereCondition<EncounterInsert>` — that widens scalar fields to
 * `T[K] | FilterOperator<T[K]>`, which rejects `OR` at the top level and
 * injects `undefined` into `in`/`OR` arrays.
 */
function buildEncounterRelationalWhere(opts: {
	patientId?: string;
	providerId?: string;
	status?: EncounterStatus;
	visitType?: VisitType;
	startDate?: Date;
	endDate?: Date;
	query?: string;
}) {
	const where: Record<string, unknown> = {};

	if (opts.patientId) where.patientId = opts.patientId;
	if (opts.providerId) where.providerId = opts.providerId;
	if (opts.status) where.status = opts.status;
	if (opts.visitType) where.visitType = opts.visitType;

	if (opts.startDate || opts.endDate) {
		const range: { gte?: Date; lte?: Date } = {};
		if (opts.startDate) range.gte = opts.startDate;
		if (opts.endDate) range.lte = opts.endDate;
		where.encounterDate = range;
	}

	if (opts.query) {
		const pattern = `%${escapeLikePattern(opts.query)}%`;
		where.OR = [
			{ chiefComplaint: { ilike: pattern } },
			{ providerName: { ilike: pattern } },
			{
				patient: {
					OR: [
						{ firstName: { ilike: pattern } },
						{ lastName: { ilike: pattern } },
						{ mrn: { ilike: pattern } }
					]
				}
			}
		];
	}

	return Object.keys(where).length > 0 ? where : undefined;
}
const isSql = (val: unknown): val is SQL => {
	return val !== null && typeof val === "object" && "toSQL" in val;
};
// ============================================================
// Repository
// ============================================================

export class EncounterRepository extends BaseRepository {
	protected readonly table = encounters;
	protected readonly idColumn: PgColumn = encounters.id;
	protected readonly tableName = "encounters";

	constructor(database: DB | Transaction | DBorTx = db) {
		super(database);
	}

	// --------------------------------------------------------------------------
	// Read
	// --------------------------------------------------------------------------

	async findById(
		id: string,
		scope?: ClinicScope
	): Promise<EncounterWithRelations | null> {
		const scopeKey = scope?.clinicId ?? "all";
		const cacheKey = `encounter:${scopeKey}:${id}`;
		const cached = queryCache.get<EncounterWithRelations>(cacheKey);
		if (cached) return cached;

		const result = await this.db.query.encounters.findFirst({
			where: scope ? { id, patient: { clinicId: scope.clinicId } } : { id },
			with: {
				patient: {
					with: {
						guardians: {
							where: { isPrimary: true }
						}
					}
				},
				provider: true,
				vitals: true,
				growthMeasurements: true,
				prescriptions: true,
				labOrders: true
			}
		});

		if (result) {
			queryCache.set(cacheKey, result, {
				ttl: CACHE_TTL,
				tags: [`encounter:${id}`, `patient:${result.patientId}:encounters`]
			});
		}

		return (result as EncounterWithRelations | undefined) ?? null;
	}

	async findByPatientId(
		patientId: string,
		options: FindByPatientOptions = {}
	): Promise<{ data: Array<Encounter>; total: number }> {
		const {
			limit = 50,
			offset = 0,
			visitType,
			status,
			startDate,
			endDate
		} = options;

		// limit/offset must be part of the cache key or pagination serves stale windows.
		const cacheKey = `encounter:patient:${patientId}:${JSON.stringify({
			visitType,
			status,
			startDate,
			endDate,
			limit,
			offset
		})}`;
		const cached = queryCache.get<{ data: Array<Encounter>; total: number }>(
			cacheKey
		);
		if (cached) return cached;

		const shared = { patientId, visitType, status, startDate, endDate };
		const relationalWhere = buildEncounterRelationalWhere(shared);
		const countWhere = combineConditions(buildEncounterConditions(shared));

		const [data, totalResult] = await Promise.all([
			this.db.query.encounters.findMany({
				where: relationalWhere,
				limit,
				offset,
				orderBy: { encounterDate: "desc" },
				with: {
					provider: true,
					vitals: true,
					growthMeasurements: true
				}
			}),
			this.db
				.select({ count: sql<number>`count(*)` })
				.from(encounters)
				.where(countWhere)
		]);

		const result = {
			data: data as Array<Encounter>,
			total: readCount(totalResult)
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:encounters`]
		});

		return result;
	}

	async search(
		options: SearchOptions = {}
	): Promise<{ data: Array<Encounter>; total: number }> {
		const {
			query,
			limit = 20,
			offset = 0,
			visitType,
			providerId,
			status,
			startDate,
			endDate
		} = options;

		const cacheKey = `encounter:search:${JSON.stringify(options)}`;
		const cached = queryCache.get<{ data: Array<Encounter>; total: number }>(
			cacheKey
		);
		if (cached) return cached;

		const shared = {
			patientId: options.patientId,
			providerId,
			visitType,
			status,
			startDate,
			endDate,
			query
		};

		const relationalWhere = buildEncounterRelationalWhere(shared);
		const countWhere = combineConditions(buildEncounterConditions(shared));

		const dataQuery = this.db.query.encounters.findMany({
			where: relationalWhere,
			limit,
			offset,
			orderBy: { encounterDate: "desc" },
			with: {
				patient: {
					with: {
						guardians: {
							where: { isPrimary: true }
						}
					}
				},
				provider: true,
				vitals: true
			}
		});

		// Only join patients when the search actually references them.
		const countQuery = query
			? this.db
					.select({ count: sql<number>`count(*)` })
					.from(encounters)
					.leftJoin(patients, eq(encounters.patientId, patients.id))
					.where(countWhere)
			: this.db
					.select({ count: sql<number>`count(*)` })
					.from(encounters)
					.where(countWhere);

		const [data, totalResult] = await Promise.all([dataQuery, countQuery]);

		const result = {
			data: data as Array<Encounter>,
			total: readCount(totalResult)
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: ["encounters:list"]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Write
	// --------------------------------------------------------------------------

	async create(data: NewEncounter): Promise<Encounter> {
		const encounter = await withTransaction(async (tx: Transaction) => {
			const [created] = await tx.insert(encounters).values(data).returning();
			if (!created) throw new Error("Failed to create encounter");
			return created;
		});

		this.invalidateAfterWrite([encounter.patientId], encounter.id);
		return encounter;
	}

	async createBatch(data: Array<NewEncounter>): Promise<Array<Encounter>> {
		if (data.length === 0) return [];

		const results = await withTransaction(async (tx: Transaction) => {
			return tx.insert(encounters).values(data).returning();
		});

		const patientIds = [...new Set(results.map(e => e.patientId))];
		this.invalidateAfterWrite(patientIds);
		return results;
	}

	async update(
		id: string,
		data: Partial<NewEncounter>
	): Promise<Encounter | null> {
		const encounter = await withTransaction(async (tx: Transaction) => {
			const [updated] = await tx
				.update(encounters)
				.set({ ...data, updatedAt: new Date() })
				.where(eq(encounters.id, id))
				.returning();

			return updated ?? null;
		});

		if (encounter) {
			this.invalidateAfterWrite([encounter.patientId], encounter.id);
		}

		return encounter;
	}

	async delete(id: string): Promise<boolean> {
		const encounter = await withTransaction(async (tx: Transaction) => {
			const existing = await tx.query.encounters.findFirst({ where: { id } });
			if (!existing) return null;

			await tx.delete(encounters).where(eq(encounters.id, id));
			return existing;
		});

		if (!encounter) return false;

		this.invalidateAfterWrite([encounter.patientId], id);
		return true;
	}

	// --------------------------------------------------------------------------
	// Range / recent
	// --------------------------------------------------------------------------

	async getEncountersByDateRange(
		startDate: Date,
		endDate: Date,
		options: DateRangeOptions = {}
	): Promise<{ data: Array<Encounter>; total: number }> {
		const { limit = 100, offset = 0 } = options;

		const cacheKey = `encounter:date:${startDate.toISOString()}:${endDate.toISOString()}:${limit}:${offset}`;
		const cached = queryCache.get<{ data: Array<Encounter>; total: number }>(
			cacheKey
		);
		if (cached) return cached;

		const where = {
			encounterDate: { gte: startDate, lte: endDate }
		};

		const countWhere = combineConditions([
			gte(encounters.encounterDate, startDate),
			lte(encounters.encounterDate, endDate)
		]);

		const [data, totalResult] = await Promise.all([
			this.db.query.encounters.findMany({
				where,
				limit,
				offset,
				orderBy: { encounterDate: "desc" },
				with: {
					patient: {
						with: {
							guardians: {
								where: { isPrimary: true }
							}
						}
					},
					provider: true
				}
			}),
			this.db
				.select({ count: sql<number>`count(*)` })
				.from(encounters)
				.where(countWhere)
		]);

		const result = {
			data: data as Array<Encounter>,
			total: readCount(totalResult)
		};

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: ["encounters:date"]
		});

		return result;
	}

	async getRecentEncounters(
		limit = 10
	): Promise<Array<EncounterWithRelations>> {
		const cacheKey = `encounter:recent:${limit}`;
		const cached = queryCache.get<Array<EncounterWithRelations>>(cacheKey);
		if (cached) return cached;

		const result = await this.db.query.encounters.findMany({
			limit,
			orderBy: { encounterDate: "desc" },
			with: {
				patient: {
					with: {
						guardians: {
							where: { isPrimary: true }
						}
					}
				},
				provider: true,
				vitals: true
			}
		});

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: ["encounters:recent"]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Count / stats
	// --------------------------------------------------------------------------
	override async count(where?: SQL): Promise<number>;
	override async count(options: CountOptions): Promise<number>;
	override async count(whereOrOptions?: SQL | CountOptions): Promise<number> {
		const options: CountOptions =
			isSql(whereOrOptions) || !whereOrOptions ? {} : whereOrOptions;

		const cacheKey = `encounter:count:${JSON.stringify(options)}`;
		const cached = queryCache.get<number>(cacheKey);
		if (cached !== null && cached !== undefined) {
			return cached;
		}

		const condition = isSql(whereOrOptions)
			? whereOrOptions
			: combineConditions(buildEncounterConditions(options));

		const result = await this.db
			.select({ count: sql`count(*)` })
			.from(encounters)
			.where(condition);

		const value = readCount(result);

		queryCache.set(cacheKey, value, {
			ttl: CACHE_TTL,
			tags: ["encounter:count"]
		});

		return value;
	}

	async getStats(): Promise<{
		total: number;
		byType: Record<VisitType, number>;
		byStatus: Record<EncounterStatus, number>;
		today: number;
		thisWeek: number;
		thisMonth: number;
	}> {
		const cacheKey = "encounter:stats";
		const cached = queryCache.get<{
			total: number;
			byType: Record<VisitType, number>;
			byStatus: Record<EncounterStatus, number>;
			today: number;
			thisWeek: number;
			thisMonth: number;
		}>(cacheKey);
		if (cached) return cached;

		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const weekAgo = new Date(today);
		weekAgo.setDate(weekAgo.getDate() - 7);
		const monthAgo = new Date(today);
		monthAgo.setMonth(monthAgo.getMonth() - 1);

		const [typeRows, statusRows, timeRow] = await Promise.all([
			this.db
				.select({
					visitType: encounters.visitType,
					count: sql<number>`count(*)`
				})
				.from(encounters)
				.groupBy(encounters.visitType),
			this.db
				.select({
					status: encounters.status,
					count: sql<number>`count(*)`
				})
				.from(encounters)
				.groupBy(encounters.status),
			this.db
				.select({
					total: sql<number>`count(*)`,
					today: sql<number>`count(*) FILTER (WHERE ${encounters.encounterDate} >= ${today})`,
					thisWeek: sql<number>`count(*) FILTER (WHERE ${encounters.encounterDate} >= ${weekAgo})`,
					thisMonth: sql<number>`count(*) FILTER (WHERE ${encounters.encounterDate} >= ${monthAgo})`
				})
				.from(encounters)
		]);

		const byType = zeroCounts(VISIT_TYPES);
		for (const row of typeRows) {
			byType[row.visitType] = row.count;
		}

		const byStatus = zeroCounts(ENCOUNTER_STATUSES);
		for (const row of statusRows) {
			byStatus[row.status] = row.count;
		}

		const bucket = timeRow[0] ?? {
			total: 0,
			today: 0,
			thisWeek: 0,
			thisMonth: 0
		};
		const result = {
			total: bucket.total,
			byType,
			byStatus,
			today: bucket.today,
			thisWeek: bucket.thisWeek,
			thisMonth: bucket.thisMonth
		};

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: ["encounter:stats"]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Domain actions
	// --------------------------------------------------------------------------

	async sign(id: string, signedBy: string): Promise<Encounter | null> {
		return this.update(id, {
			status: "Signed",
			signedAt: new Date(),
			signedBy
		});
	}

	async addDiagnosis(
		id: string,
		diagnosis: DiagnosisItem
	): Promise<Encounter | null> {
		const encounter = await this.findById(id);
		if (!encounter) return null;

		const assessment: AssessmentData =
			encounter.assessmentJson && typeof encounter.assessmentJson === "object"
				? encounter.assessmentJson
				: {};

		const currentDiagnoses = Array.isArray(assessment.diagnoses)
			? assessment.diagnoses
			: [];
		const newDiagnoses: Array<DiagnosisItem> = [...currentDiagnoses, diagnosis];

		return this.update(id, {
			assessmentJson: {
				...assessment,
				diagnoses: newDiagnoses
			}
		});
	}

	async addTreatmentPlan(
		id: string,
		plan: Partial<PlanData>
	): Promise<Encounter | null> {
		const encounter = await this.findById(id);
		if (!encounter) return null;

		const currentPlan: PlanData =
			encounter.planJson && typeof encounter.planJson === "object"
				? encounter.planJson
				: {};

		return this.update(id, {
			planJson: {
				...currentPlan,
				...plan
			}
		});
	}

	async removeDiagnosis(
		id: string,
		diagnosisId: string
	): Promise<Encounter | null> {
		const encounter = await this.findById(id);
		if (!encounter) return null;

		const assessment: AssessmentData =
			encounter.assessmentJson && typeof encounter.assessmentJson === "object"
				? encounter.assessmentJson
				: {};

		const currentDiagnoses = Array.isArray(assessment.diagnoses)
			? assessment.diagnoses
			: [];
		const newDiagnoses: Array<DiagnosisItem> = currentDiagnoses.filter(
			d => d.id !== diagnosisId
		);

		return this.update(id, {
			assessmentJson: {
				...assessment,
				diagnoses: newDiagnoses
			}
		});
	}

	/**
	 * Atomically insert a vitals row linked to `id` and return the refreshed
	 * encounter (with the new vitals relation populated).
	 */
	async addVitals(id: string, vitals: VitalInput): Promise<Encounter | null> {
		const refreshed = await withTransaction(async (tx: Transaction) => {
			const encounter = await tx.query.encounters.findFirst({ where: { id } });
			if (!encounter) return null;

			await tx.insert(vitalTable).values({
				patientId: encounter.patientId,
				encounterId: id,
				...vitals,
				recordedBy: encounter.providerId
			});

			return tx.query.encounters.findFirst({
				where: { id },
				with: {
					patient: {
						with: {
							guardians: {
								where: { isPrimary: true }
							}
						}
					},
					provider: true,
					vitals: true,
					growthMeasurements: true,
					prescriptions: true,
					labOrders: true
				}
			});
		});

		if (!refreshed) return null;

		// Invalidate AFTER commit so a rollback doesn't leave the cache cold.
		queryCache.invalidate(`encounter:${id}`);
		queryCache.invalidateTag(`patient:${refreshed.patientId}:vitals`);
		queryCache.invalidateTag(`patient:${refreshed.patientId}:encounters`);
		queryCache.invalidateTag(`encounter:${id}:vitals`);
		queryCache.invalidatePrefix(`patient:${refreshed.patientId}:`);

		return refreshed;
	}

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	/**
	 * Evict every cache entry that could contain a stale view after a write
	 * touching the given patients. `encounterId` (when present) also drops the
	 * per-encounter record cache.
	 *
	 * Uses `invalidatePrefix` for the patient-scoped entries — the prefix is a
	 * literal string, so no regex escaping is required and no RegExp is
	 * allocated per call.
	 */
	private invalidateAfterWrite(
		patientIds: Array<string>,
		encounterId?: string
	): void {
		if (encounterId) {
			queryCache.invalidate(`encounter:${encounterId}`);
		}

		queryCache.invalidateTag("encounters:list");
		queryCache.invalidateTag("encounters:recent");
		queryCache.invalidateTag("encounters:date");
		queryCache.invalidateTag("encounter:stats");
		queryCache.invalidateTag("encounter:count");

		for (const patientId of new Set(patientIds)) {
			queryCache.invalidateTag(`patient:${patientId}:encounters`);
			queryCache.invalidatePrefix(`patient:${patientId}:`);
			queryCache.invalidate(`encounter:${encounterId}`);
			queryCache.invalidatePattern(
				new RegExp(`^encounter:[^:]+:${escapeRegExp(encounterId ?? "")}$`)
			);
		}
	}
}

export const encounterRepository = new EncounterRepository(db);
