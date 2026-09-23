// oxlint-disable typescript/no-unsafe-type-assertion
// src/db/repositories/growth.repository.ts
import { and, desc, eq, gte, ilike, lt, lte, or, type SQL } from "drizzle-orm";
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
	type GrowthMeasurement,
	growthMeasurements,
	type MetricType,
	type NewGrowthMeasurement
} from "#/lib/db/schema";

import type { PercentileBand } from "../../../utils/growth-utils";
import { BaseRepository, type BaseRow } from "./base.repository";

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;
const STATS_CACHE_TTL = 60_000;
const PERCENTILE_BAND_RANGES: Record<
	PercentileBand,
	readonly [number, number]
> = {
	"severe-low": [0, 3],
	low: [3, 15],
	normal: [15, 85],
	high: [85, 97],
	"severe-high": [97, 101]
};

/** Characters that need escaping when building an ILIKE pattern. */
const LIKE_ESCAPE_RE = /[\\%_]/g;
function escapeLikePattern(input: string): string {
	return input.replace(LIKE_ESCAPE_RE, ch => `\\${ch}`);
}

export interface FindForTableOptions {
	patientId?: string;
	query?: string;
	ageRange?: readonly [number, number];
	/** Excludes the "all" sentinel — the caller should pass `undefined` instead. */
	percentileBand?: Exclude<PercentileBand, "all">;
	limit: number;
	offset: number;
}

export interface FindForTableResult {
	data: GrowthMeasurement[];
	total: number;
}
// ============================================================
// Types
// ============================================================

export type FindByPatientOptions = {
	limit?: number;
	offset?: number;
	startDate?: Date;
	endDate?: Date;
	minAgeMonths?: number;
	maxAgeMonths?: number;
};

export type CountOptions = {
	patientId?: string;
	startDate?: Date;
	endDate?: Date;
};

export type GrowthStats = {
	latestWeight: number | null;
	latestHeight: number | null;
	latestBmi: number | null;
	weightVelocity: number | null;
	heightVelocity: number | null;
	measurementsCount: number;
};

export type GrowthPercentileRow = {
	ageMonths: number;
	weightPercentile: number | null;
	heightPercentile: number | null;
	bmiPercentile: number | null;
	headPercentile: number | null;
};

// ============================================================
// Cast helpers
// ============================================================
//
// The base's `*Impl` methods return `BaseRow` (`Record<string, unknown>`)
// because the base is table-agnostic. Here we know the table, so we narrow
// to the concrete row type. Every cast in this file lives in one of these
// three helpers, so the linter's `no-unsafe-type-assertion` fires exactly
// once per helper rather than at every call site.

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing BaseRow to the concrete GrowthMeasurement row type
const asGrowthMeasurement = (row: BaseRow): GrowthMeasurement =>
	row as GrowthMeasurement;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
const asGrowthMeasurements = (rows: Array<BaseRow>): Array<GrowthMeasurement> =>
	rows as Array<GrowthMeasurement>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- widening; no runtime effect
const toBaseRow = (data: object): BaseRow => data as BaseRow;

// ============================================================
// Repository
// ============================================================

export class GrowthRepository extends BaseRepository {
	protected readonly table = growthMeasurements;
	protected readonly idColumn: PgColumn = growthMeasurements.id;
	protected readonly tableName = "growthMeasurements";

	constructor(database: DB | Transaction | DBorTx = db) {
		super(database);
	}

	// --------------------------------------------------------------------------
	// Public CRUD — wrap the base *Impl methods with concrete types
	// --------------------------------------------------------------------------

	async findById(id: string): Promise<GrowthMeasurement | null> {
		const row = await this.findByIdImpl(id);
		return row ? asGrowthMeasurement(row) : null;
	}

	async delete(id: string): Promise<boolean> {
		return this.deleteImpl(id);
	}

	// --------------------------------------------------------------------------
	// Reads
	// --------------------------------------------------------------------------

	async findByPatientId(
		patientId: string,
		options: FindByPatientOptions = {}
	): Promise<{ data: Array<GrowthMeasurement>; total: number }> {
		const {
			limit = 50,
			offset = 0,
			startDate,
			endDate,
			minAgeMonths,
			maxAgeMonths
		} = options;

		const cacheKey = `growth:patient:${patientId}:list:${JSON.stringify({
			limit,
			offset,
			startDate: startDate?.toISOString(),
			endDate: endDate?.toISOString(),
			minAgeMonths,
			maxAgeMonths
		})}`;
		const cached = queryCache.get<{
			data: Array<GrowthMeasurement>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		// Build the condition once, reuse for both the page query and the count.
		const conditions = [eq(growthMeasurements.patientId, patientId)];
		if (startDate)
			conditions.push(gte(growthMeasurements.recordedAt, startDate));
		if (endDate) conditions.push(lte(growthMeasurements.recordedAt, endDate));
		if (minAgeMonths !== undefined)
			conditions.push(gte(growthMeasurements.ageMonths, minAgeMonths));
		if (maxAgeMonths !== undefined)
			conditions.push(lte(growthMeasurements.ageMonths, maxAgeMonths));

		const where = and(...conditions);

		const [rows, total] = await Promise.all([
			this.db.query.growthMeasurements.findMany({
				where: {
					patientId,
					recordedAt: {
						gte: startDate,
						lte: endDate
					},
					ageMonths: {
						gte: minAgeMonths,
						lte: maxAgeMonths
					}
				},
				limit,
				offset,
				orderBy: (measurements, { asc }) => [asc(measurements.ageMonths)]
			}),
			this.count(where)
		]);

		const result = {
			data: asGrowthMeasurements(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:growth`]
		});

		return result;
	}
	async findForTable(
		options: FindForTableOptions
	): Promise<FindForTableResult> {
		const conditions: SQL[] = [];

		if (options.patientId) {
			conditions.push(eq(growthMeasurements.patientId, options.patientId));
		}

		if (options.ageRange) {
			const [minMonths, maxMonths] = options.ageRange;
			conditions.push(gte(growthMeasurements.ageMonths, minMonths));
			conditions.push(lt(growthMeasurements.ageMonths, maxMonths));
		}

		if (options.percentileBand) {
			const range = PERCENTILE_BAND_RANGES[options.percentileBand];
			if (range) {
				conditions.push(
					gte(growthMeasurements.weightForAgePercentile, range[0]),
					lt(growthMeasurements.weightForAgePercentile, range[1])
				);
			}
		}

		if (options.query) {
			const pattern = `%${escapeLikePattern(options.query)}%`;
			const searchClause = or(
				ilike(growthMeasurements.recordedBy, pattern),
				ilike(growthMeasurements.notes, pattern)
			);
			// `or` returns `SQL | undefined` only when given zero args; we always
			// pass two, so the guard is defensive rather than a non-null assert.
			if (searchClause) {
				conditions.push(searchClause);
			}
		}

		const where: SQL | undefined =
			conditions.length > 0 ? and(...conditions) : undefined;

		const [rows, total] = await Promise.all([
			this.db
				.select()
				.from(growthMeasurements)
				.where(where)
				// `id` tiebreaker keeps pagination stable when two rows share
				// `recordedAt` (common with bulk imports / backfills).
				.orderBy(
					desc(growthMeasurements.recordedAt),
					desc(growthMeasurements.id)
				)
				.limit(options.limit)
				.offset(options.offset),
			this.count(where)
		]);

		return { data: rows, total };
	}
	// src/lib/db/repositories/growth.repository.ts
	async findWhoReference(options: {
		gender: "male" | "female";
		metricType: MetricType;
		maxAgeMonths: number;
	}) {
		return this.db.query.whoGrowthData.findMany({
			where: {
				gender: options.gender,
				metricType: options.metricType,
				ageMonths: { lte: options.maxAgeMonths }
			},
			orderBy: { ageMonths: "asc" }
		});
	}
	async findLatestByPatientId(
		patientId: string
	): Promise<GrowthMeasurement | null> {
		const cacheKey = `growth:patient:${patientId}:latest`;
		const cached = queryCache.get<GrowthMeasurement>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row = await query.findFirst({
			where: { patientId },
			orderBy: { ageMonths: "desc" }
		});

		if (!isBaseRow(row)) return null;

		const result = asGrowthMeasurement(row);
		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:growth`]
		});

		return result;
	}

	async getGrowthChartData(
		patientId: string,
		metric: MetricType
	): Promise<Array<GrowthMeasurement>> {
		const cacheKey = `growth:patient:${patientId}:chart:${metric}`;
		const cached = queryCache.get<Array<GrowthMeasurement>>(cacheKey);
		if (cached) return cached;

		const rows = await this.db.query.growthMeasurements.findMany({
			where: { patientId },
			orderBy: {
				ageMonths: "asc"
			}
		});

		const measurements = asGrowthMeasurements(rows);

		// Filter to rows that actually have a value for the requested metric.
		const filtered = measurements.filter(g => {
			switch (metric) {
				case "weight":
					return g.weightKg !== null;
				case "height":
					return g.heightCm !== null;
				case "head_circumference":
					return g.headCircumferenceCm !== null;
				case "bmi":
					return g.bmi !== null;
				default: {
					// Exhaustiveness guard: if `MetricType` gains a new member, this
					// branch fails to compile until the case is added.
					const exhaustive: never = metric;
					return exhaustive;
				}
			}
		});

		queryCache.set(cacheKey, filtered, {
			ttl: CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:growth:chart`]
		});

		return filtered;
	}

	// --------------------------------------------------------------------------
	// Statistics
	// --------------------------------------------------------------------------

	async getGrowthStats(patientId: string): Promise<GrowthStats> {
		const cacheKey = `growth:patient:${patientId}:stats`;
		const cached = queryCache.get<GrowthStats>(cacheKey);
		if (cached) return cached;

		const rows = await this.db.query.growthMeasurements.findMany({
			where: { patientId },
			orderBy: {
				ageMonths: "asc"
			}
		});

		const measurements = asGrowthMeasurements(rows);

		if (measurements.length === 0) {
			const empty: GrowthStats = {
				latestWeight: null,
				latestHeight: null,
				latestBmi: null,
				weightVelocity: null,
				heightVelocity: null,
				measurementsCount: 0
			};
			queryCache.set(cacheKey, empty, {
				ttl: STATS_CACHE_TTL,
				tags: [`patient:${patientId}`, `patient:${patientId}:growth`]
			});
			return empty;
		}

		const latest = measurements.at(-1);
		const first = measurements[0];
		if (!latest || !first) {
			throw new Error("Growth measurements unexpectedly empty");
		}

		let weightVelocity: number | null = null;
		let heightVelocity: number | null = null;

		if (measurements.length > 1) {
			const ageDiff = latest.ageMonths - first.ageMonths;
			if (ageDiff > 0) {
				weightVelocity = (latest.weightKg - first.weightKg) / ageDiff;
				heightVelocity = (latest.heightCm - first.heightCm) / ageDiff;
			}
		}

		const result: GrowthStats = {
			latestWeight: latest.weightKg ?? null,
			latestHeight: latest.heightCm ?? null,
			latestBmi: latest.bmi ?? null,
			weightVelocity,
			heightVelocity,
			measurementsCount: measurements.length
		};

		queryCache.set(cacheKey, result, {
			ttl: STATS_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:growth`]
		});

		return result;
	}

	async getPercentiles(patientId: string): Promise<Array<GrowthPercentileRow>> {
		const cacheKey = `growth:patient:${patientId}:percentiles`;
		const cached = queryCache.get<Array<GrowthPercentileRow>>(cacheKey);
		if (cached) return cached;

		const rows = await this.db.query.growthMeasurements.findMany({
			where: { patientId },
			orderBy: {
				ageMonths: "asc"
			}
		});

		const measurements = asGrowthMeasurements(rows);

		const result: Array<GrowthPercentileRow> = measurements.map(m => ({
			ageMonths: m.ageMonths,
			weightPercentile: m.weightForAgePercentile ?? null,
			heightPercentile: m.heightForAgePercentile ?? null,
			bmiPercentile: m.bmiForAgePercentile ?? null,
			headPercentile: m.headCircumferencePercentile ?? null
		}));

		queryCache.set(cacheKey, result, {
			ttl: STATS_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:growth`]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Count
	// --------------------------------------------------------------------------

	/**
	 * Count measurements matching the given filters. Uses the base's cached
	 * `count(where)` for the actual query.
	 */
	async countBy(options: CountOptions = {}): Promise<number> {
		const cacheKey = `growth:count:${JSON.stringify({
			patientId: options.patientId,
			startDate: options.startDate?.toISOString(),
			endDate: options.endDate?.toISOString()
		})}`;
		const cached = queryCache.get<number>(cacheKey);
		if (cached !== null) return cached;

		const conditions = [];
		if (options.patientId) {
			conditions.push(eq(growthMeasurements.patientId, options.patientId));
		}
		if (options.startDate) {
			conditions.push(gte(growthMeasurements.recordedAt, options.startDate));
		}
		if (options.endDate) {
			conditions.push(lte(growthMeasurements.recordedAt, options.endDate));
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;
		const count = await this.count(where);

		queryCache.set(cacheKey, count, {
			ttl: STATS_CACHE_TTL,
			tags: ["growth:count"]
		});

		return count;
	}

	// --------------------------------------------------------------------------
	// Writes
	// --------------------------------------------------------------------------

	async create(data: NewGrowthMeasurement): Promise<GrowthMeasurement> {
		const row = await this.createImpl(toBaseRow(data));
		const growth = asGrowthMeasurement(row);

		// Invalidate AFTER commit so a rollback cannot leave the cache cold.
		this.invalidateAfterWrite(
			[growth.patientId],
			growth.encounterId ?? "",
			growth.id
		);
		return growth;
	}

	async createBatch(
		measurements: Array<NewGrowthMeasurement>
	): Promise<Array<GrowthMeasurement>> {
		if (measurements.length === 0) return [];

		const results = await withTransaction(async (tx: Transaction) =>
			tx.insert(growthMeasurements).values(measurements).returning()
		);

		const patientIds = [...new Set(results.map(m => m.patientId))];
		const encounterIds = results
			.map(m => m.encounterId)
			.filter((id): id is string => id !== null);

		this.invalidateAfterWrite(patientIds, encounterIds);
		return results;
	}

	async update(
		id: string,
		data: Partial<NewGrowthMeasurement>
	): Promise<GrowthMeasurement | null> {
		const row = await this.updateImpl(
			id,
			toBaseRow(data),
			/* hasUpdatedAt */ false
		);
		if (!row) return null;

		const growth = asGrowthMeasurement(row);
		this.invalidateAfterWrite(
			[growth.patientId],
			growth.encounterId ?? "",
			growth.id
		);
		return growth;
	}

	// Note: growth_measurements has no `updatedAt` column — pass `false` above.

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	/**
	 * Evict every cache entry that could contain a stale view after a write
	 * touching the given patients. `encounterIds` (when present) also drops
	 * the per-encounter growth tag. `growthId` drops the record cache.
	 */
	private invalidateAfterWrite(
		patientIds: Array<string>,
		encounterIds?: string | Array<string>,
		growthId?: string
	): void {
		if (growthId) {
			queryCache.invalidate(`growth:${growthId}`);
		}

		const encounters = encounterIds
			? Array.isArray(encounterIds)
				? encounterIds
				: [encounterIds]
			: [];

		for (const patientId of new Set(patientIds)) {
			queryCache.invalidateTag(`patient:${patientId}:growth`);
			queryCache.invalidatePrefix(`growth:patient:${patientId}:`);
		}

		for (const encounterId of new Set(encounters)) {
			if (!encounterId) continue;
			queryCache.invalidateTag(`encounter:${encounterId}:growth`);
		}
	}
}

// Reusable guard for the `findFirst` result in `findLatestByPatientId`.
function isBaseRow(value: unknown): value is BaseRow {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const growthRepository = new GrowthRepository(db);
