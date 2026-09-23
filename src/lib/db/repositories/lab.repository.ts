// oxlint-disable typescript/no-unsafe-type-assertion
// src/lib/db/repositories/lab.repository.ts
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
import { queryCache } from "#/lib/db/cache";
import {
	type Encounter,
	type LabOrder,
	type LabPriority,
	type LabStatus,
	type LabTest,
	labOrders,
	type NewLabOrder,
	type Patient,
	patients,
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
	priority?: LabPriority;
	startDate?: Date;
	status?: LabStatus;
};

export type SearchOptions = {
	endDate?: Date;
	limit?: number;
	offset?: number;
	orderedBy?: string;
	patientId?: string;
	priority?: LabPriority;
	query?: string;
	startDate?: Date;
	status?: LabStatus;
};

export type CountOptions = {
	endDate?: Date;
	orderedBy?: string;
	patientId?: string;
	priority?: LabPriority;
	startDate?: Date;
	status?: LabStatus;
};

export type LabStats = {
	total: number;
	ordered: number;
	collected: number;
	processing: number;
	completed: number;
	cancelled: number;
	byPriority: Record<LabPriority, number>;
	byPatient: number;
};

type LabOrderWithRelations = LabOrder & {
	patient: Patient;
	encounter: Encounter | null;
};

type LabOrderWithPatient = LabOrder & {
	patient: Patient;
	staff: Staff;
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

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing BaseRow to the concrete LabOrder row type
const asLabOrder = (row: BaseRow): LabOrder => row as LabOrder;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `with.patient` and `with.encounter` are declared in relations.ts
const asLabOrderWithRelations = (row: BaseRow): LabOrderWithRelations =>
	row as LabOrderWithRelations;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
const asLabOrdersWithRelations = (
	rows: Array<BaseRow>
): Array<LabOrderWithRelations> => rows as Array<LabOrderWithRelations>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `with.patient` and `with.staff` are declared in relations.ts
const asLabOrdersWithPatient = (
	rows: Array<BaseRow>
): Array<LabOrderWithPatient> => rows as Array<LabOrderWithPatient>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- widening; no runtime effect
const toBaseRow = (data: object): BaseRow => data as BaseRow;

// ============================================================
// Filters
// ============================================================

function escapeLikePattern(value: string): string {
	return value.replace(/[\\%_]/g, ch => `\\${ch}`);
}

/**
 * Build a single Drizzle `SQL` condition from search options.
 *
 * This is the *only* filter builder for lab orders. Both the page query and
 * the count query use the same `SQL`, so list/count results cannot drift.
 */
function buildLabWhere(options: SearchOptions): SQL | undefined {
	const { query, status, priority, patientId, orderedBy, startDate, endDate } =
		options;

	const conditions: Array<SQL> = [];

	if (status) conditions.push(eq(labOrders.status, status));
	if (priority) conditions.push(eq(labOrders.priority, priority));
	if (patientId) conditions.push(eq(labOrders.patientId, patientId));

	if (orderedBy) {
		conditions.push(
			ilike(labOrders.orderedBy, `%${escapeLikePattern(orderedBy)}%`)
		);
	}

	if (startDate) conditions.push(gte(labOrders.orderDate, startDate));
	if (endDate) conditions.push(lte(labOrders.orderDate, endDate));

	if (query) {
		const pattern = `%${escapeLikePattern(query)}%`;
		const search = or(
			ilike(labOrders.orderNumber, pattern),
			ilike(labOrders.clinicalIndication, pattern),
			or(
				ilike(patients.firstName, pattern),
				ilike(patients.lastName, pattern),
				ilike(patients.mrn, pattern)
			)
		);
		if (search) conditions.push(search);
	}

	if (conditions.length === 0) return undefined;
	if (conditions.length === 1) return conditions[0];
	return and(...conditions);
}

// ============================================================
// Repository
// ============================================================

export class LabRepository extends BaseRepository {
	protected readonly table = labOrders;
	protected readonly idColumn: PgColumn = labOrders.id;
	protected readonly tableName = "labOrders";

	constructor(database: DB | Transaction | DBorTx = db) {
		super(database);
	}

	// --------------------------------------------------------------------------
	// Public CRUD — wrap the base *Impl methods with concrete types
	// --------------------------------------------------------------------------

	async findById(id: string): Promise<LabOrderWithRelations | null> {
		const cacheKey = `lab:${id}`;
		const cached = queryCache.get<LabOrderWithRelations>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: eq(labOrders.id, id),
			with: { patient: true, encounter: true }
		});

		if (!isBaseRow(row)) return null;

		const result = asLabOrderWithRelations(row);
		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`lab:${id}`, `patient:${result.patientId}:labs`]
		});

		return result;
	}

	async delete(id: string): Promise<boolean> {
		const labOrder = await withTransaction(async (tx: Transaction) => {
			const existing = await tx.query.labOrders.findFirst({ where: { id } });
			if (!existing) return null;

			await tx.delete(labOrders).where(eq(labOrders.id, id));
			return existing;
		});

		if (!labOrder) return false;

		this.invalidateAfterWrite(
			[labOrder.patientId],
			labOrder.orderNumber,
			labOrder.encounterId,
			id
		);
		return true;
	}

	// --------------------------------------------------------------------------
	// Reads
	// --------------------------------------------------------------------------

	async findByOrderNumber(
		orderNumber: string
	): Promise<LabOrderWithRelations | null> {
		const cacheKey = `lab:order:${orderNumber}`;
		const cached = queryCache.get<LabOrderWithRelations>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: eq(labOrders.orderNumber, orderNumber),
			with: { patient: true, encounter: true }
		});

		if (!isBaseRow(row)) return null;

		const result = asLabOrderWithRelations(row);
		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`lab:${result.id}`, `patient:${result.patientId}:labs`]
		});

		return result;
	}

	async findOrders(
		options: SearchOptions = {}
	): Promise<{ data: Array<LabOrderWithPatient>; total: number }> {
		const { limit = 50, offset = 0, query } = options;

		const cacheKey = `lab:list:${JSON.stringify({
			...options,
			startDate: options.startDate?.toISOString(),
			endDate: options.endDate?.toISOString()
		})}`;
		const cached = queryCache.get<{
			data: Array<LabOrderWithPatient>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const where = buildLabWhere(options);

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${labOrders.orderDate} DESC`,
				with: { patient: true, staff: true }
			}),
			// The count query joins `patients` only when the search term references
			// patient columns. Otherwise we use the base's join-free `count`.
			query ? this.countWithPatientJoin(where) : this.count(where)
		]);

		const result = {
			data: asLabOrdersWithPatient(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: ["lab:list"]
		});

		return result;
	}

	async findByPatientId(
		patientId: string,
		options: FindByPatientOptions = {}
	): Promise<{ data: Array<LabOrderWithRelations>; total: number }> {
		const {
			limit = 50,
			offset = 0,
			status,
			priority,
			startDate,
			endDate
		} = options;

		const cacheKey = `lab:patient:${patientId}:${JSON.stringify({
			...options,
			startDate: options.startDate?.toISOString(),
			endDate: options.endDate?.toISOString()
		})}`;
		const cached = queryCache.get<{
			data: Array<LabOrderWithRelations>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const where = buildLabWhere({
			patientId,
			status,
			priority,
			startDate,
			endDate
		});

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${labOrders.orderDate} DESC`,
				with: { patient: true, encounter: true }
			}),
			this.count(where)
		]);

		const result = {
			data: asLabOrdersWithRelations(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:labs`]
		});

		return result;
	}

	async findPending(patientId?: string): Promise<Array<LabOrderWithRelations>> {
		const cacheKey = `lab:pending:${patientId ?? "all"}`;
		const cached = queryCache.get<Array<LabOrderWithRelations>>(cacheKey);
		if (cached) return cached;

		const conditions: Array<SQL> = [
			sql`${labOrders.status} NOT IN ('Completed', 'Cancelled')`
		];
		if (patientId) conditions.push(eq(labOrders.patientId, patientId));
		const where = conditions.length === 1 ? conditions[0] : and(...conditions);

		const rows = await this.findManyImpl(where, {
			orderBy: sql`${labOrders.orderDate} ASC`,
			with: { patient: true, encounter: true }
		});
		const result = asLabOrdersWithRelations(rows);

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: ["lab:pending", ...(patientId ? [`patient:${patientId}:labs`] : [])]
		});

		return result;
	}

	async getByDateRange(
		startDate: Date,
		endDate: Date,
		options: { limit?: number; offset?: number } = {}
	): Promise<{ data: Array<LabOrderWithPatient>; total: number }> {
		const { limit = 100, offset = 0 } = options;

		const cacheKey = `lab:date:${startDate.toISOString()}:${endDate.toISOString()}:${limit}:${offset}`;
		const cached = queryCache.get<{
			data: Array<LabOrderWithPatient>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const where = and(
			gte(labOrders.orderDate, startDate),
			lte(labOrders.orderDate, endDate)
		);

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${labOrders.orderDate} DESC`,
				with: { patient: true, staff: true }
			}),
			this.count(where)
		]);

		const result = {
			data: asLabOrdersWithPatient(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: ["lab:date"]
		});

		return result;
	}

	async search(
		options: SearchOptions
	): Promise<{ data: Array<LabOrderWithPatient>; total: number }> {
		// Delegates to `findOrders`, which owns the cache key and the query logic.
		// Re-using the same key shape means a `search` call and an equivalent
		// `findOrders` call share a single cache entry.
		return this.findOrders(options);
	}

	async getAbnormalResults(
		patientId: string
	): Promise<Array<LabOrderWithRelations>> {
		const cacheKey = `lab:patient:${patientId}:abnormal`;
		const cached = queryCache.get<Array<LabOrderWithRelations>>(cacheKey);
		if (cached) return cached;

		const where = and(
			eq(labOrders.patientId, patientId),
			eq(labOrders.status, "Completed")
		);
		const rows = await this.findManyImpl(where, {
			with: { patient: true, encounter: true }
		});
		const orders = asLabOrdersWithRelations(rows);

		const abnormal = orders.filter(lab => {
			const tests = lab.testsJson ?? [];
			return tests.some(
				test =>
					test.isAbnormal === true ||
					test.result?.toLowerCase().includes("abnormal")
			);
		});

		queryCache.set(cacheKey, abnormal, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:labs:abnormal`]
		});

		return abnormal;
	}

	// --------------------------------------------------------------------------
	// Statistics
	// --------------------------------------------------------------------------

	/**
	 * Single aggregate query using `COUNT(*) FILTER (WHERE ...)`.
	 */
	async getLabStats(): Promise<LabStats> {
		const cacheKey = "lab:stats";
		const cached = queryCache.get<LabStats>(cacheKey);
		if (cached) return cached;

		const [row] = await this.db
			.select({
				total: sql<number>`count(*)::int`,
				ordered: sql<number>`count(*) filter (where ${labOrders.status} = 'Ordered')::int`,
				collected: sql<number>`count(*) filter (where ${labOrders.status} = 'Sample Collected')::int`,
				processing: sql<number>`count(*) filter (where ${labOrders.status} = 'Processing')::int`,
				completed: sql<number>`count(*) filter (where ${labOrders.status} = 'Completed')::int`,
				cancelled: sql<number>`count(*) filter (where ${labOrders.status} = 'Cancelled')::int`,
				routine: sql<number>`count(*) filter (where ${labOrders.priority} = 'Routine')::int`,
				urgent: sql<number>`count(*) filter (where ${labOrders.priority} = 'Urgent')::int`,
				stat: sql<number>`count(*) filter (where ${labOrders.priority} = 'Stat')::int`,
				byPatient: countDistinct(labOrders.patientId)
			})
			.from(labOrders);

		const result: LabStats = {
			total: row?.total ?? 0,
			ordered: row?.ordered ?? 0,
			collected: row?.collected ?? 0,
			processing: row?.processing ?? 0,
			completed: row?.completed ?? 0,
			cancelled: row?.cancelled ?? 0,
			byPriority: {
				Routine: row?.routine ?? 0,
				Urgent: row?.urgent ?? 0,
				Stat: row?.stat ?? 0
			},
			byPatient: row?.byPatient ?? 0
		};

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: ["lab:stats"]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Count
	// --------------------------------------------------------------------------

	/**
	 * Count lab orders matching the given filter options.
	 *
	 * Named `countBy` to avoid clashing with the base's `count(where: SQL)`.
	 */
	async countBy(options: CountOptions = {}): Promise<number> {
		const cacheKey = `lab:count:${JSON.stringify({
			...options,
			startDate: options.startDate?.toISOString(),
			endDate: options.endDate?.toISOString()
		})}`;
		const cached = queryCache.get<number>(cacheKey);
		if (cached !== null) return cached;

		const where = buildLabWhere(options);
		const value = await this.count(where);

		queryCache.set(cacheKey, value, {
			ttl: CACHE_TTL,
			tags: ["lab:count"]
		});

		return value;
	}

	// --------------------------------------------------------------------------
	// Writes
	// --------------------------------------------------------------------------

	async create(data: NewLabOrder): Promise<LabOrder> {
		const row = await this.createImpl(toBaseRow(data));
		const labOrder = asLabOrder(row);

		this.invalidateAfterWrite(
			[labOrder.patientId],
			labOrder.orderNumber,
			labOrder.encounterId,
			labOrder.id
		);
		return labOrder;
	}

	async createBatch(data: Array<NewLabOrder>): Promise<Array<LabOrder>> {
		if (data.length === 0) return [];

		const results = await withTransaction(async (tx: Transaction) =>
			tx.insert(labOrders).values(data).returning()
		);

		const patientIds = [...new Set(results.map(l => l.patientId))];
		const encounterIds = results
			.map(l => l.encounterId)
			.filter((id): id is string => id !== null);
		this.invalidateAfterWrite(patientIds, undefined, encounterIds);
		return results;
	}

	async update(
		id: string,
		data: Partial<NewLabOrder>
	): Promise<LabOrder | null> {
		const row = await this.updateImpl(
			id,
			toBaseRow(data),
			/* hasUpdatedAt */ true
		);
		if (!row) return null;

		const labOrder = asLabOrder(row);
		this.invalidateAfterWrite(
			[labOrder.patientId],
			labOrder.orderNumber,
			labOrder.encounterId,
			labOrder.id
		);
		return labOrder;
	}

	// --------------------------------------------------------------------------
	// Domain actions
	// --------------------------------------------------------------------------

	async cancel(id: string, reason: string): Promise<LabOrder | null> {
		return this.update(id, {
			status: "Cancelled",
			notes: `Cancelled: ${reason}`
		});
	}

	async updateStatus(id: string, status: LabStatus): Promise<LabOrder | null> {
		const updates: Partial<NewLabOrder> = { status };

		if (status === "Completed") {
			updates.completedDate = new Date();
			updates.resultsReleasedAt = new Date();
		}
		if (status === "Sample Collected") {
			updates.specimenCollectedAt = new Date();
		}

		return this.update(id, updates);
	}

	async collectSample(
		id: string,
		specimenCollectedAt: Date,
		specimenType: string,
		collectionNotes?: string
	): Promise<LabOrder | null> {
		return this.update(id, {
			status: "Sample Collected",
			specimenCollectedAt,
			specimenType,
			specimenCollectionNotes: collectionNotes
		});
	}

	async submitResults(
		id: string,
		results: Array<{
			testName: string;
			value: string;
			unit: string;
			referenceRange: string;
		}>,
		notes?: string
	): Promise<LabOrder | null> {
		const labOrder = await this.findById(id);
		if (!labOrder) return null;

		const labTests: Array<LabTest> = results.map((result, index) => ({
			id: `${id}-test-${index}`,
			testName: result.testName,
			testCode: result.testName.toUpperCase().replace(/\s+/g, "_"),
			category: "General",
			result: result.value,
			referenceRange: result.referenceRange,
			unit: result.unit,
			isAbnormal: false,
			status: "Completed",
			completedAt: new Date().toISOString()
		}));

		return this.update(id, {
			testsJson: labTests,
			status: "Completed",
			completedDate: new Date(),
			resultsReleasedAt: new Date(),
			notes: notes ? `${labOrder.notes ?? ""}\n${notes}`.trim() : labOrder.notes
		});
	}

	async addResults(
		id: string,
		results: Array<LabTest>,
		status: LabStatus = "Completed"
	): Promise<LabOrder | null> {
		const labOrder = await this.findById(id);
		if (!labOrder) return null;

		const existingTests = labOrder.testsJson ?? [];
		const updatedTests = [...existingTests];

		for (const result of results) {
			const index = updatedTests.findIndex(t => t.id === result.id);
			if (index >= 0) {
				const existing = updatedTests[index];
				if (existing) updatedTests[index] = { ...existing, ...result };
			} else {
				updatedTests.push(result);
			}
		}

		return this.update(id, {
			testsJson: updatedTests,
			status,
			completedDate: new Date(),
			resultsReleasedAt: status === "Completed" ? new Date() : undefined
		});
	}

	// --------------------------------------------------------------------------
	// Internal helpers
	// --------------------------------------------------------------------------

	/**
	 * Count with a `LEFT JOIN patients`. Used by `findOrders` when the search
	 * term references patient columns. The base's `count(where)` doesn't join,
	 * so we implement a targeted variant here.
	 */
	private async countWithPatientJoin(where: SQL | undefined): Promise<number> {
		const base = this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(labOrders)
			.leftJoin(patients, eq(labOrders.patientId, patients.id));
		const query = where ? base.where(where) : base;
		const rows = await query;
		return rows[0]?.count ?? 0;
	}

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	private invalidateAfterWrite(
		patientIds: Array<string>,
		orderNumber?: string,
		encounterIds?: string | Array<string> | null,
		labId?: string
	): void {
		if (labId) {
			queryCache.invalidate(`lab:${labId}`);
		}
		if (orderNumber) {
			queryCache.invalidate(`lab:order:${orderNumber}`);
		}

		queryCache.invalidateTag("lab:list");
		queryCache.invalidateTag("lab:pending");
		queryCache.invalidateTag("lab:stats");
		queryCache.invalidateTag("lab:count");
		queryCache.invalidateTag("lab:date");

		for (const patientId of new Set(patientIds)) {
			queryCache.invalidateTag(`patient:${patientId}:labs`);
			queryCache.invalidatePrefix(`patient:${patientId}:`);
			queryCache.invalidatePrefix(`lab:patient:${patientId}:`);
		}

		const encounters = encounterIds
			? Array.isArray(encounterIds)
				? encounterIds
				: [encounterIds]
			: [];
		for (const encounterId of new Set(encounters)) {
			if (!encounterId) continue;
			queryCache.invalidateTag(`encounter:${encounterId}:labs`);
		}
	}
}

// Local guard for `findFirst` results.
function isBaseRow(value: unknown): value is BaseRow {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const labRepository = new LabRepository(db);
