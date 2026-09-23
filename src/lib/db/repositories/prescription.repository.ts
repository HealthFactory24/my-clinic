// oxlint-disable typescript/no-unsafe-type-assertion
// src/db/repositories/prescription.repository.ts
import {
	and,
	countDistinct,
	eq,
	gte,
	ilike,
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
import { escapeRegExp, queryCache } from "#/lib/db/cache";
import {
	type Encounter,
	type NewPrescription,
	type Patient,
	type Prescription,
	type PrescriptionItem,
	type PrescriptionStatus,
	patients,
	prescriptions,
	type Staff
} from "#/lib/db/schema";

import { BaseRepository, type BaseRow } from "./base.repository";

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;

// ============================================================
// Types
// ============================================================

export type FindByPatientOptions = {
	endDate?: Date;
	limit?: number;
	offset?: number;
	startDate?: Date;
	status?: PrescriptionStatus;
};

export type SearchOptions = {
	endDate?: Date;
	limit?: number;
	offset?: number;
	patientId?: string;
	prescriberId?: string;
	query?: string;
	startDate?: Date;
	status?: PrescriptionStatus;
};

export type CountOptions = {
	endDate?: Date;
	patientId?: string;
	prescriberId?: string;
	startDate?: Date;
	status?: PrescriptionStatus;
};

export type PrescriptionStats = {
	total: number;
	active: number;
	completed: number;
	discontinued: number;
	cancelled: number;
	byPatient: number;
};

type PrescriptionWithRelations = Prescription & {
	patient: Patient;
	prescriber: Staff;
	encounter: Encounter | null;
};

type PrescriptionWithPatient = Prescription & {
	patient: Patient;
};

type AddItemInput = {
	medicationName: string;
	dosage: string;
	frequency: string;
	duration: string;
	quantity: number;
	instructions?: string;
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

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing BaseRow to the concrete Prescription row type
const asPrescription = (row: BaseRow): Prescription => row as Prescription;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `with.patient`, `with.prescriber`, `with.encounter` declared in relations.ts
const asPrescriptionWithRelations = (row: BaseRow): PrescriptionWithRelations =>
	row as PrescriptionWithRelations;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
const asPrescriptionsWithRelations = (
	rows: Array<BaseRow>
): Array<PrescriptionWithRelations> => rows as Array<PrescriptionWithRelations>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above; only `with.patient` is populated
const asPrescriptionsWithPatient = (
	rows: Array<BaseRow>
): Array<PrescriptionWithPatient> => rows as Array<PrescriptionWithPatient>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- widening; no runtime effect
const toBaseRow = (data: object): BaseRow => data as BaseRow;

// ============================================================
// Guards
// ============================================================

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ============================================================
// Filters
// ============================================================

function escapeLikePattern(value: string): string {
	return value.replace(/[\\%_]/g, ch => `\\${ch}`);
}

/**
 * Build a single Drizzle `SQL` condition from search options.
 *
 * This is the *only* filter builder for prescriptions. Both the page query
 * and the count query use the same `SQL`, so list/count results cannot drift.
 */
function buildPrescriptionWhere(
	options: SearchOptions,
	scope?: { clinicId: string }
): SQL | undefined {
	const conditions: Array<SQL> = [];
	const { query, status, patientId, prescriberId, startDate, endDate } =
		options;

	if (status) conditions.push(eq(prescriptions.status, status));
	if (patientId) conditions.push(eq(prescriptions.patientId, patientId));
	if (prescriberId)
		conditions.push(eq(prescriptions.prescriberId, prescriberId));
	if (startDate) {
		conditions.push(gte(prescriptions.prescribedDate, startDate.toISOString()));
	}
	if (endDate) {
		conditions.push(lte(prescriptions.prescribedDate, endDate.toISOString()));
	}

	if (query) {
		const pattern = `%${escapeLikePattern(query)}%`;
		const search = or(
			ilike(prescriptions.rxNumber, pattern),
			ilike(prescriptions.diagnosis, pattern),
			ilike(prescriptions.prescriberName, pattern),
			or(
				ilike(patients.firstName, pattern),
				ilike(patients.lastName, pattern),
				ilike(patients.mrn, pattern)
			)
		);
		if (search) conditions.push(search);
	}

	if (scope) {
		conditions.push(
			sql`${prescriptions.patientId} IN (SELECT id FROM ${patients} WHERE clinic_id = ${scope.clinicId})`
		);
	}

	if (conditions.length === 0) return undefined;
	if (conditions.length === 1) return conditions[0];
	return and(...conditions);
}

// ============================================================
// Repository
// ============================================================

export class PrescriptionRepository extends BaseRepository {
	protected readonly table = prescriptions;
	protected readonly idColumn: PgColumn = prescriptions.id;
	protected readonly tableName = "prescriptions";

	constructor(database: DB | Transaction | DBorTx = db) {
		super(database);
	}

	// --------------------------------------------------------------------------
	// Public CRUD — wrap the base *Impl methods with concrete types
	// --------------------------------------------------------------------------

	async findById(
		id: string,
		scope?: { clinicId: string }
	): Promise<PrescriptionWithRelations | null> {
		const scopeKey = scope?.clinicId ?? "all";
		const cacheKey = `prescription:${scopeKey}:${id}`;
		const cached = queryCache.get<PrescriptionWithRelations>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: eq(prescriptions.id, id),
			with: { patient: true, prescriber: true, encounter: true }
		});

		if (!isRecord(row)) return null;

		// Scope check: if a scope is supplied, verify the joined patient belongs
		// to that clinic. The relational query can't filter by joined columns in
		// the `where` clause cleanly across all Drizzle versions, so we verify
		// post-fetch. This keeps the cache key honest (`prescription:clinic:id`).
		if (scope) {
			const patient = row["patient"];
			if (!isRecord(patient) || patient["clinicId"] !== scope.clinicId) {
				return null;
			}
		}

		const result = asPrescriptionWithRelations(row);
		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`prescription:${id}`, `patient:${result.patientId}:prescriptions`]
		});

		return result;
	}

	async delete(id: string): Promise<boolean> {
		const prescription = await withTransaction(async (tx: Transaction) => {
			const existing = await tx.query.prescriptions.findFirst({
				where: { id }
			});
			if (!existing) return null;

			await tx.delete(prescriptions).where(eq(prescriptions.id, id));
			return existing;
		});

		if (!prescription) return false;

		this.invalidateAfterWrite(
			[prescription.patientId],
			prescription.id,
			prescription.rxNumber,
			prescription.encounterId
		);
		return true;
	}

	// --------------------------------------------------------------------------
	// Reads
	// --------------------------------------------------------------------------

	async findByRxNumber(
		rxNumber: string
	): Promise<PrescriptionWithRelations | null> {
		const cacheKey = `prescription:rx:${rxNumber}`;
		const cached = queryCache.get<PrescriptionWithRelations>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: eq(prescriptions.rxNumber, rxNumber),
			with: { patient: true, prescriber: true, encounter: true }
		});

		if (!isRecord(row)) return null;

		const result = asPrescriptionWithRelations(row);
		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [
				`prescription:${result.id}`,
				`patient:${result.patientId}:prescriptions`
			]
		});

		return result;
	}

	async findAll(
		options: SearchOptions,
		scope?: { clinicId: string }
	): Promise<{ data: Array<PrescriptionWithPatient>; total: number }> {
		const { limit = 50, offset = 0, query } = options;

		const scopeKey = scope?.clinicId ?? "all";
		const cacheKey = `prescription:list:${scopeKey}:${JSON.stringify({
			...options,
			startDate: options.startDate?.toISOString(),
			endDate: options.endDate?.toISOString()
		})}`;
		const cached = queryCache.get<{
			data: Array<PrescriptionWithPatient>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const where = buildPrescriptionWhere(options, scope);

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${prescriptions.createdAt} DESC`,
				with: { patient: true }
			}),
			query ? this.countWithPatientJoin(where) : this.count(where)
		]);

		const result = {
			data: asPrescriptionsWithPatient(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: ["prescriptions:list"]
		});

		return result;
	}

	async findByPatientId(
		patientId: string,
		options: FindByPatientOptions = {}
	): Promise<{ data: Array<PrescriptionWithRelations>; total: number }> {
		const { limit = 50, offset = 0, status, startDate, endDate } = options;

		const cacheKey = `prescription:patient:${patientId}:${JSON.stringify({
			...options,
			startDate: startDate?.toISOString(),
			endDate: endDate?.toISOString()
		})}`;
		const cached = queryCache.get<{
			data: Array<PrescriptionWithRelations>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const where = buildPrescriptionWhere({
			patientId,
			status,
			startDate,
			endDate
		});

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${prescriptions.createdAt} DESC`,
				with: { patient: true, prescriber: true, encounter: true }
			}),
			this.count(where)
		]);

		const result = {
			data: asPrescriptionsWithRelations(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:prescriptions`]
		});

		return result;
	}

	async findActiveByPatientId(
		patientId: string
	): Promise<Array<PrescriptionWithRelations>> {
		const cacheKey = `prescription:patient:${patientId}:active`;
		const cached = queryCache.get<Array<PrescriptionWithRelations>>(cacheKey);
		if (cached) return cached;

		const where = and(
			eq(prescriptions.patientId, patientId),
			eq(prescriptions.status, "Active")
		);
		const rows = await this.findManyImpl(where, {
			orderBy: sql`${prescriptions.createdAt} DESC`,
			with: { patient: true, prescriber: true, encounter: true }
		});
		const result = asPrescriptionsWithRelations(rows);

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [
				`patient:${patientId}`,
				`patient:${patientId}:prescriptions:active`
			]
		});

		return result;
	}

	async getByDateRange(
		startDate: Date,
		endDate: Date,
		options: { limit?: number; offset?: number } = {}
	): Promise<{ data: Array<PrescriptionWithPatient>; total: number }> {
		const { limit = 100, offset = 0 } = options;

		const cacheKey = `prescription:date:${startDate.toISOString()}:${endDate.toISOString()}:${limit}:${offset}`;
		const cached = queryCache.get<{
			data: Array<PrescriptionWithPatient>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const startStr = startDate.toISOString();
		const endStr = endDate.toISOString();

		const where = and(
			gte(prescriptions.prescribedDate, startStr),
			lte(prescriptions.prescribedDate, endStr)
		);

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${prescriptions.prescribedDate} DESC`,
				with: { patient: true }
			}),
			this.count(where)
		]);

		const result = {
			data: asPrescriptionsWithPatient(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: ["prescriptions:date"]
		});

		return result;
	}

	async search(
		options: SearchOptions,
		scope?: { clinicId: string }
	): Promise<{ data: Array<PrescriptionWithPatient>; total: number }> {
		// Delegates to `findAll`, which owns the cache key and query logic.
		return this.findAll(options, scope);
	}

	// --------------------------------------------------------------------------
	// Statistics
	// --------------------------------------------------------------------------

	async getPrescriptionStats(): Promise<PrescriptionStats> {
		const cacheKey = "prescription:stats";
		const cached = queryCache.get<PrescriptionStats>(cacheKey);
		if (cached) return cached;

		const [row] = await this.db
			.select({
				total: sql<number>`count(*)::int`,
				active: sql<number>`count(*) filter (where ${prescriptions.status} = 'Active')::int`,
				completed: sql<number>`count(*) filter (where ${prescriptions.status} = 'Completed')::int`,
				discontinued: sql<number>`count(*) filter (where ${prescriptions.status} = 'Discontinued')::int`,
				cancelled: sql<number>`count(*) filter (where ${prescriptions.status} = 'Cancelled')::int`,
				byPatient: countDistinct(prescriptions.patientId)
			})
			.from(prescriptions);

		const result: PrescriptionStats = {
			total: row?.total ?? 0,
			active: row?.active ?? 0,
			completed: row?.completed ?? 0,
			discontinued: row?.discontinued ?? 0,
			cancelled: row?.cancelled ?? 0,
			byPatient: row?.byPatient ?? 0
		};

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: ["prescription:stats"]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Count
	// --------------------------------------------------------------------------

	/**
	 * Count prescriptions matching the given filter options.
	 *
	 * Named `countBy` to avoid clashing with the base's `count(where: SQL)`.
	 */
	async countBy(options: CountOptions = {}): Promise<number> {
		const cacheKey = `prescription:count:${JSON.stringify({
			...options,
			startDate: options.startDate?.toISOString(),
			endDate: options.endDate?.toISOString()
		})}`;
		const cached = queryCache.get<number>(cacheKey);
		if (cached !== null) return cached;

		const where = buildPrescriptionWhere(options);
		const value = await this.count(where);

		queryCache.set(cacheKey, value, {
			ttl: CACHE_TTL,
			tags: ["prescription:count"]
		});

		return value;
	}

	// --------------------------------------------------------------------------
	// Writes
	// --------------------------------------------------------------------------

	async create(data: NewPrescription): Promise<Prescription> {
		const row = await this.createImpl(toBaseRow(data));
		const prescription = asPrescription(row);

		this.invalidateAfterWrite(
			[prescription.patientId],
			prescription.id,
			prescription.rxNumber,
			prescription.encounterId
		);
		return prescription;
	}

	async createBatch(
		data: Array<NewPrescription>
	): Promise<Array<Prescription>> {
		if (data.length === 0) return [];

		const results = await withTransaction(async (tx: Transaction) =>
			tx.insert(prescriptions).values(data).returning()
		);

		const patientIds = [...new Set(results.map(p => p.patientId))];
		const encounterIds = results
			.map(p => p.encounterId)
			.filter((id): id is string => id !== null);

		this.invalidateAfterWrite(patientIds, undefined, undefined, encounterIds);
		return results;
	}

	async update(
		id: string,
		data: Partial<NewPrescription>
	): Promise<Prescription | null> {
		const row = await this.updateImpl(
			id,
			toBaseRow(data),
			/* hasUpdatedAt */ true
		);
		if (!row) return null;

		const prescription = asPrescription(row);
		this.invalidateAfterWrite(
			[prescription.patientId],
			prescription.id,
			prescription.rxNumber,
			prescription.encounterId
		);
		return prescription;
	}

	// --------------------------------------------------------------------------
	// Domain actions
	// --------------------------------------------------------------------------

	async fill(
		id: string,
		filledBy: string,
		filledAt?: Date
	): Promise<Prescription | null> {
		return this.update(id, {
			status: "Completed",
			filledBy,
			filledAt: filledAt ?? new Date()
		});
	}

	async discontinue(id: string, reason?: string): Promise<Prescription | null> {
		return this.update(id, {
			status: "Discontinued",
			discontinuedAt: new Date(),
			discontinuedReason: reason ?? "Not specified"
		});
	}

	async updateStatus(
		id: string,
		status: PrescriptionStatus
	): Promise<Prescription | null> {
		return this.update(id, { status });
	}

	/**
	 * Renew a prescription: mark the original as `Completed` and create a new
	 * `Active` prescription derived from it.
	 *
	 * The two writes happen inside a single transaction so a failure cannot
	 * leave the original marked `Completed` with no renewal.
	 */
	async renew(
		id: string,
		renewedBy: string,
		refills?: number
	): Promise<Prescription | null> {
		const renewed = await withTransaction(async (tx: Transaction) => {
			const original = await tx.query.prescriptions.findFirst({
				where: { id }
			});
			if (!original) return null;

			await tx
				.update(prescriptions)
				.set({ status: "Completed" })
				.where(eq(prescriptions.id, id));

			// Generate a unique Rx number. `prescriptions.rxNumber` has a unique
			// index; a collision surfaces as a DB error and propagates. Retry-once
			// logic was previously in a comment; there is no point retrying without
			// catching the constraint violation first.
			const rxNumber = `RX-${Math.floor(100_000 + Math.random() * 900_000)}`;

			// Build the insert payload explicitly, excluding fields we don't want to
			// copy. Notably we do NOT spread `id` — the schema's `$defaultFn` mints
			// a fresh one.
			const {
				id: _omitId,
				createdAt: _omitCreatedAt,
				updatedAt: _omitUpdatedAt,
				...rest
			} = original;
			void _omitId;
			void _omitCreatedAt;
			void _omitUpdatedAt;

			const [created] = await tx
				.insert(prescriptions)
				.values({
					...rest,
					rxNumber,
					status: "Active",
					prescribedDate: new Date().toISOString(),
					filledAt: null,
					filledBy: null,
					discontinuedAt: null,
					discontinuedReason: null,
					notes: `Renewed from prescription ${original.rxNumber} by ${renewedBy}${
						refills ? ` (${refills} refills)` : ""
					}`
				})
				.returning();

			if (!created) throw new Error("Failed to renew prescription");

			return { original, created };
		});

		if (!renewed) return null;

		this.invalidateAfterWrite(
			[renewed.created.patientId],
			renewed.original.id,
			renewed.original.rxNumber,
			renewed.original.encounterId
		);
		this.invalidateAfterWrite(
			[renewed.created.patientId],
			renewed.created.id,
			renewed.created.rxNumber,
			renewed.created.encounterId
		);

		return renewed.created;
	}

	/**
	 * Append items to an existing prescription.
	 *
	 * `AddItemInput` is a lightweight caller-facing payload; `PrescriptionItem`
	 * is the persisted shape. The adapter below maps the two.
	 */
	async addItems(
		id: string,
		items: Array<AddItemInput>
	): Promise<Prescription | null> {
		const prescription = await this.findById(id);
		if (!prescription) return null;

		const existingItems: Array<PrescriptionItem> =
			prescription.prescriptionItems ?? [];

		const newItems: Array<PrescriptionItem> = items.map((item, index) => ({
			id: `${id}-item-${existingItems.length + index}`,
			medicationName: item.medicationName,
			form: "Suspension",
			route: "Oral",
			frequency: item.frequency,
			durationDays: Number.parseInt(item.duration, 10) || 1,
			calculatedLiquidDoseMl: 0,
			dose: item.dosage,
			dispenseQuantity: String(item.quantity),
			instructions: item.instructions
		}));

		return this.update(id, {
			prescriptionItems: [...existingItems, ...newItems]
		});
	}

	// --------------------------------------------------------------------------
	// Internal helpers
	// --------------------------------------------------------------------------

	/**
	 * Count with a `LEFT JOIN patients`. Used by `findAll` when the search term
	 * references patient columns. The base's `count(where)` doesn't join.
	 */
	private async countWithPatientJoin(where: SQL | undefined): Promise<number> {
		const base = this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(prescriptions)
			.leftJoin(patients, eq(prescriptions.patientId, patients.id));
		const query = where ? base.where(where) : base;
		const rows = await query;
		return rows[0]?.count ?? 0;
	}

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	private invalidateAfterWrite(
		patientIds: Array<string>,
		prescriptionId?: string,
		rxNumber?: string,
		encounterIds?: string | Array<string> | null
	): void {
		if (prescriptionId) {
			queryCache.invalidate(`prescription:${prescriptionId}`);
			queryCache.invalidatePattern(
				new RegExp(`^prescription:[^:]+:${escapeRegExp(prescriptionId)}$`)
			);
		}
		if (rxNumber) {
			queryCache.invalidate(`prescription:rx:${rxNumber}`);
		}

		queryCache.invalidateTag("prescriptions:list");
		queryCache.invalidateTag("prescriptions:date");
		queryCache.invalidateTag("prescription:stats");
		queryCache.invalidateTag("prescription:count");

		for (const patientId of new Set(patientIds)) {
			queryCache.invalidateTag(`patient:${patientId}:prescriptions`);
			queryCache.invalidateTag(`patient:${patientId}:prescriptions:active`);
			queryCache.invalidatePrefix(`patient:${patientId}:`);
			queryCache.invalidatePrefix(`prescription:patient:${patientId}:`);
		}

		const encounters = encounterIds
			? Array.isArray(encounterIds)
				? encounterIds
				: [encounterIds]
			: [];
		for (const encounterId of new Set(encounters)) {
			if (!encounterId) continue;
			queryCache.invalidateTag(`encounter:${encounterId}:prescriptions`);
		}
	}
}

export type { PrescriptionStatus };
export const prescriptionRepository = new PrescriptionRepository(db);
