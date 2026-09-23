// oxlint-disable typescript/no-unsafe-type-assertion
// src/db/repositories/vital.repository.ts
import { and, eq, gte, lte, type SQL, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import {
	type DB,
	type DBorTx,
	db,
	type Transaction,
	withTransaction
} from "#/lib/db";
import { queryCache } from "#/lib/db/cache";
import { type NewVitalSigns, type VitalSigns, vitals } from "#/lib/db/schema";

import { BaseRepository, type BaseRow } from "./base.repository";

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;

// ============================================================
// Types
// ============================================================

export type VitalRangeOptions = {
	limit?: number;
	offset?: number;
	startDate?: Date;
	endDate?: Date;
};

export type VitalCountOptions = {
	patientId?: string;
	startDate?: Date;
	endDate?: Date;
};

// ============================================================
// Cast helpers
// ============================================================

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing BaseRow to the concrete VitalSigns row type
const asVital = (row: BaseRow): VitalSigns => row as VitalSigns;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
const asVitals = (rows: Array<BaseRow>): Array<VitalSigns> =>
	rows as Array<VitalSigns>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- widening; no runtime effect
const toBaseRow = (data: object): BaseRow => data as BaseRow;

// ============================================================
// Helpers
// ============================================================

/**
 * Normalize a date value for use in a cache key.
 */
function dateKey(value: Date | undefined): string | undefined {
	return value?.toISOString();
}

/**
 * Build a `SQL` condition from a vital-range options bag. Used by every
 * method that filters vitals by patient and/or date range.
 */
function buildVitalWhere(options: VitalCountOptions): SQL | undefined {
	const conditions: Array<SQL> = [];
	if (options.patientId)
		conditions.push(eq(vitals.patientId, options.patientId));
	if (options.startDate)
		conditions.push(gte(vitals.recordedAt, options.startDate));
	if (options.endDate) conditions.push(lte(vitals.recordedAt, options.endDate));

	if (conditions.length === 0) return undefined;
	if (conditions.length === 1) return conditions[0];
	return and(...conditions);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ============================================================
// Repository
// ============================================================

export class VitalRepository extends BaseRepository {
	protected readonly table = vitals;
	protected readonly idColumn: PgColumn = vitals.id;
	protected readonly tableName = "vitals";

	constructor(database: DB | Transaction | DBorTx = db) {
		super(database);
	}

	// --------------------------------------------------------------------------
	// Public CRUD
	// --------------------------------------------------------------------------

	async findById(id: string): Promise<VitalSigns | null> {
		const cacheKey = `vital:${id}`;
		const cached = queryCache.get<VitalSigns>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: eq(vitals.id, id),
			with: { patient: true, encounter: true }
		});

		if (!isRecord(row)) return null;

		const result = asVital(row);
		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`vital:${id}`]
		});

		return result;
	}

	async delete(id: string): Promise<boolean> {
		const vital = await withTransaction(async (tx: Transaction) => {
			const existing = await tx.query.vitals.findFirst({ where: { id } });
			if (!existing) return null;

			await tx.delete(vitals).where(eq(vitals.id, id));
			return existing;
		});

		if (!vital) return false;

		this.invalidateAfterWrite([vital.patientId], vital.encounterId, id);
		return true;
	}

	// --------------------------------------------------------------------------
	// Reads
	// --------------------------------------------------------------------------

	/**
	 * Vital signs for a patient across a date range.
	 *
	 * The `patientId` filter is applied whenever it's provided.
	 */
	async findByDateRange(
		startDate: Date,
		endDate: Date,
		patientId?: string
	): Promise<Array<VitalSigns>> {
		const cacheKey = `vital:dateRange:${startDate.toISOString()}:${endDate.toISOString()}:${patientId ?? "all"}`;
		const cached = queryCache.get<Array<VitalSigns>>(cacheKey);
		if (cached) return cached;

		const where = buildVitalWhere({ patientId, startDate, endDate });

		const query = this.getQueryBuilder();
		const rows: unknown = await query.findMany({
			where,
			with: { patient: true, encounter: true }
		});

		if (!Array.isArray(rows)) return [];
		const result = rows.filter(isRecord) as Array<VitalSigns>;

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [
				`vital:dateRange:${startDate.toISOString()}:${endDate.toISOString()}`,
				...(patientId ? [`patient:${patientId}:vitals`] : [])
			]
		});

		return result;
	}

	async findByPatientId(
		patientId: string,
		options: VitalRangeOptions = {}
	): Promise<{ data: Array<VitalSigns>; total: number }> {
		const { limit = 50, offset = 0, startDate, endDate } = options;

		const cacheKey = `vital:patient:${patientId}:${JSON.stringify({
			limit,
			offset,
			startDate: dateKey(startDate),
			endDate: dateKey(endDate)
		})}`;
		const cached = queryCache.get<{
			data: Array<VitalSigns>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const where = buildVitalWhere({ patientId, startDate, endDate });

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${vitals.recordedAt} DESC`,
				with: { encounter: true }
			}),
			this.count(where)
		]);

		const result = {
			data: asVitals(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:vitals`]
		});

		return result;
	}

	async findAll(
		patientId: string,
		options: VitalRangeOptions = {}
	): Promise<Array<VitalSigns>> {
		const cacheKey = `vital:findAll:${patientId}:${JSON.stringify({
			limit: options.limit,
			offset: options.offset,
			startDate: dateKey(options.startDate),
			endDate: dateKey(options.endDate)
		})}`;
		const cached = queryCache.get<Array<VitalSigns>>(cacheKey);
		if (cached) return cached;

		// Filters on `recordedAt` (not `createdAt`) — see prior fix note.
		const where = buildVitalWhere({
			patientId,
			startDate: options.startDate,
			endDate: options.endDate
		});

		const rows = await this.findManyImpl(where, {
			limit: options.limit,
			offset: options.offset,
			orderBy: sql`${vitals.recordedAt} ASC`,
			with: { patient: true, encounter: true }
		});
		const result = asVitals(rows);

		if (result.length > 0) {
			queryCache.set(cacheKey, result, {
				ttl: CACHE_TTL,
				tags: [`patient:${patientId}:vitals`]
			});
		}

		return result;
	}

	async findByEncounterId(encounterId: string): Promise<Array<VitalSigns>> {
		const cacheKey = `vital:encounter:${encounterId}`;
		const cached = queryCache.get<Array<VitalSigns>>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const rows: unknown = await query.findMany({
			where: eq(vitals.encounterId, encounterId),
			orderBy: { recordedAt: "desc" },
			with: { patient: true }
		});

		if (!Array.isArray(rows)) return [];
		const result = rows.filter(isRecord) as Array<VitalSigns>;

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`encounter:${encounterId}`, `encounter:${encounterId}:vitals`]
		});

		return result;
	}

	async getLatestVital(patientId: string): Promise<VitalSigns | null> {
		const cacheKey = `vital:patient:${patientId}:latest`;
		const cached = queryCache.get<VitalSigns>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: eq(vitals.patientId, patientId),
			orderBy: { recordedAt: "desc" },
			with: { encounter: true }
		});

		if (!isRecord(row)) return null;

		const result = asVital(row);
		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:vitals`]
		});

		return result;
	}

	async getVitalsByDateRange(
		patientId: string,
		startDate: Date,
		endDate: Date,
		options: { limit?: number } = {}
	): Promise<Array<VitalSigns>> {
		const { limit = 100 } = options;

		const cacheKey = `vital:patient:${patientId}:range:${startDate.toISOString()}:${endDate.toISOString()}:${limit}`;
		const cached = queryCache.get<Array<VitalSigns>>(cacheKey);
		if (cached) return cached;

		const where = and(
			eq(vitals.patientId, patientId),
			gte(vitals.recordedAt, startDate),
			lte(vitals.recordedAt, endDate)
		);

		const rows = await this.findManyImpl(where, {
			limit,
			orderBy: sql`${vitals.recordedAt} ASC`,
			with: { encounter: true }
		});
		const result = asVitals(rows);

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:vitals`]
		});

		return result;
	}

	async getAbnormalVitals(
		patientId: string,
		options: { limit?: number } = {}
	): Promise<Array<VitalSigns>> {
		const { limit = 20 } = options;

		const cacheKey = `vital:patient:${patientId}:abnormal:${limit}`;
		const cached = queryCache.get<Array<VitalSigns>>(cacheKey);
		if (cached) return cached;

		const where = and(
			eq(vitals.patientId, patientId),
			sql`(
        ${vitals.temperatureC} > 38.0
        OR ${vitals.temperatureC} < 35.5
        OR ${vitals.heartRateBpm} > 150
        OR ${vitals.heartRateBpm} < 60
        OR ${vitals.respiratoryRateBpm} > 40
        OR ${vitals.respiratoryRateBpm} < 12
        OR ${vitals.oxygenSaturationPercent} < 95
      )`
		);

		const rows = await this.findManyImpl(where, {
			limit,
			orderBy: sql`${vitals.recordedAt} DESC`,
			with: { encounter: true }
		});
		const result = asVitals(rows);

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:vitals`]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Count
	// --------------------------------------------------------------------------

	async countBy(options: VitalCountOptions = {}): Promise<number> {
		const cacheKey = `vital:count:${JSON.stringify({
			patientId: options.patientId,
			startDate: dateKey(options.startDate),
			endDate: dateKey(options.endDate)
		})}`;
		const cached = queryCache.get<number>(cacheKey);
		if (cached !== null) return cached;

		const where = buildVitalWhere(options);
		const value = await this.count(where);

		queryCache.set(cacheKey, value, {
			ttl: CACHE_TTL,
			tags: ["vital:count"]
		});

		return value;
	}

	// --------------------------------------------------------------------------
	// Writes
	// --------------------------------------------------------------------------

	async create(data: NewVitalSigns): Promise<VitalSigns> {
		const row = await this.createImpl(toBaseRow(data));
		const vital = asVital(row);

		this.invalidateAfterWrite([vital.patientId], vital.encounterId, vital.id);
		return vital;
	}

	async update(
		id: string,
		data: Partial<NewVitalSigns>
	): Promise<VitalSigns | null> {
		const row = await this.updateImpl(
			id,
			toBaseRow(data),
			/* hasUpdatedAt */ true
		);
		if (!row) return null;

		const vital = asVital(row);
		this.invalidateAfterWrite([vital.patientId], vital.encounterId, id);
		return vital;
	}

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	private invalidateAfterWrite(
		patientIds: Array<string>,
		encounterIds?: string | Array<string> | null,
		vitalId?: string
	): void {
		if (vitalId) {
			queryCache.invalidate(`vital:${vitalId}`);
		}

		queryCache.invalidateTag("vital:count");
		queryCache.invalidateTag("vital:dateRange");

		for (const patientId of new Set(patientIds)) {
			queryCache.invalidateTag(`patient:${patientId}:vitals`);
			queryCache.invalidatePrefix(`patient:${patientId}:`);
			queryCache.invalidatePrefix(`vital:patient:${patientId}:`);
		}

		const encounters = encounterIds
			? Array.isArray(encounterIds)
				? encounterIds
				: [encounterIds]
			: [];
		for (const encounterId of new Set(encounters)) {
			if (!encounterId) continue;
			queryCache.invalidateTag(`encounter:${encounterId}:vitals`);
		}
	}
}

export const vitalRepository = new VitalRepository(db);
