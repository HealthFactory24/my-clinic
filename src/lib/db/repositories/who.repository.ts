// src/lib/db/repositories/who.repository.ts

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
	type MetricType,
	type NewWHOGrowthData,
	type WHOGrowthData,
	whoGrowthData
} from "#/lib/db/schema";
import { getPercentilesFromLMS, type LMSParameters } from "@/utils/who";

import { BaseRepository, type ClinicScope } from "./base.repository";

// ============================================================
// Constants
// ============================================================

/**
 * 7 days, in milliseconds. WHO growth reference tables are static — the
 * upstream data changes at the cadence of a new WHO publication, not per
 * request — so a long TTL is safe and keeps the hot path off the DB.
 *
 * NOTE: the previous value `60 * 60 * 24 * 7` evaluates to `604_800` ms
 * (~10 minutes), not 7 days. The comment said "7 days" but the code did not.
 * Always express TTLs in milliseconds when the consumer (`queryCache.set`)
 * expects milliseconds.
 */
const CACHE_TTL_MS = 60 * 60 * 24 * 7 * 1000;

const WHO_CACHE_TAG = "who_growth";
const WHO_PERCENTILE_CURVE_TAG = "who:percentile_curve";

// ============================================================
// Types
// ============================================================

type Gender = "male" | "female";

type PercentileRow = {
	ageMonths: number;
	p3: number;
	p15: number;
	p50: number;
	p85: number;
	p97: number;
};

type AgeRange = { min: number; max: number };

// ============================================================
// Repository
// ============================================================

export class WhoGrowthRepository extends BaseRepository {
	protected readonly table = whoGrowthData;
	protected readonly idColumn: PgColumn = whoGrowthData.id;
	protected readonly tableName = "whoGrowthData";

	constructor(database: DB | Transaction | DBorTx = db) {
		super(database);
	}

	// --------------------------------------------------------------------------
	// Reads
	// --------------------------------------------------------------------------

	/**
	 * Get all WHO growth data ordered by age.
	 *
	 * Note: this returns every row for every gender and metric. Callers almost
	 * always want `getByGenderAndMetric` — prefer that unless you genuinely
	 * need the full table.
	 */
	async getAll(): Promise<Array<WHOGrowthData>> {
		const cacheKey = "who_growth:all";
		const cached = queryCache.get<Array<WHOGrowthData>>(cacheKey);
		if (cached) return cached;

		const result = await this.db.query.whoGrowthData.findMany({
			orderBy: { ageMonths: "asc" }
		});

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL_MS,
			tags: [WHO_CACHE_TAG]
		});

		return result;
	}

	/**
	 * Get WHO growth data by gender and metric type.
	 */
	async getByGenderAndMetric(
		gender: Gender,
		metricType: MetricType
	): Promise<Array<WHOGrowthData>> {
		const cacheKey = `who_growth:${gender}:${metricType}`;
		const cached = queryCache.get<Array<WHOGrowthData>>(cacheKey);
		if (cached) return cached;

		const result = await this.db.query.whoGrowthData.findMany({
			where: { gender, metricType },
			orderBy: { ageMonths: "asc" }
		});

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL_MS,
			tags: [WHO_CACHE_TAG, `who_growth:${gender}`, `who_growth:${metricType}`]
		});

		return result;
	}

	/**
	 * Get LMS parameters for a specific age using linear interpolation.
	 *
	 * Behaviour:
	 *   - `ageMonths` below the first row's age → first row's LMS.
	 *   - `ageMonths` above the last row's age  → last row's LMS.
	 *   - `ageMonths` inside the range          → linear interpolation between
	 *                                              the two surrounding rows.
	 *   - no data for `(gender, metricType)`    → `null`.
	 */
	async getLMSParameters(
		gender: Gender,
		metricType: MetricType,
		ageMonths: number
	): Promise<LMSParameters | null> {
		const data = await this.getByGenderAndMetric(gender, metricType);
		if (data.length === 0) return null;

		const first = data[0];
		if (!first) return null;

		// Clamp below the range.
		if (ageMonths <= first.ageMonths) {
			return { ageMonths: first.ageMonths, L: first.L, M: first.M, S: first.S };
		}

		const last = data[data.length - 1];
		if (!last) return null;

		// Clamp above the range.
		if (ageMonths >= last.ageMonths) {
			return { ageMonths: last.ageMonths, L: last.L, M: last.M, S: last.S };
		}

		// Interpolate. `data` is sorted ascending by `ageMonths`, so the first
		// pair whose interval brackets `ageMonths` is the correct one.
		for (let i = 0; i < data.length - 1; i += 1) {
			const p1 = data[i];
			const p2 = data[i + 1];
			if (!p1 || !p2) continue;
			if (ageMonths >= p1.ageMonths && ageMonths <= p2.ageMonths) {
				const span = p2.ageMonths - p1.ageMonths;
				// Guard against divide-by-zero on duplicate age rows.
				if (span === 0) {
					return { ageMonths: p1.ageMonths, L: p1.L, M: p1.M, S: p1.S };
				}
				const t = (ageMonths - p1.ageMonths) / span;
				return {
					ageMonths,
					L: p1.L + t * (p2.L - p1.L),
					M: p1.M + t * (p2.M - p1.M),
					S: p1.S + t * (p2.S - p1.S)
				};
			}
		}

		// Unreachable given the bounds checks above, but kept for safety.
		return null;
	}

	/**
	 * Get the min/max age (in months) available for a gender + metric.
	 */
	async getAgeRange(gender: Gender, metricType: MetricType): Promise<AgeRange> {
		const data = await this.getByGenderAndMetric(gender, metricType);

		const first = data[0];
		const last = data[data.length - 1];
		if (!first || !last) return { min: 0, max: 0 };

		return { min: first.ageMonths, max: last.ageMonths };
	}

	/**
	 * Build a percentile curve for the requested ages.
	 *
	 * The curve is derived from `getLMSParameters` and `getPercentilesFromLMS`.
	 * Ages outside the available LMS range are clamped to the nearest row by
	 * `getLMSParameters` — the returned `ageMonths` for those entries will be
	 * the *clamped* age, not the requested age. If you need to know which
	 * points were clamped, inspect the returned `ageMonths` against the input.
	 */
	async getPercentileCurve(
		gender: Gender,
		metricType: MetricType,
		ageMonths: Array<number>
	): Promise<Array<PercentileRow>> {
		// Sort + dedupe so the cache key is deterministic for the same logical
		// request regardless of the order the caller supplied.
		const normalizedAges = [...new Set(ageMonths)].toSorted((a, b) => a - b);
		const cacheKey = `who:percentile_curve:${gender}:${metricType}:${normalizedAges.join(",")}`;
		const cached = queryCache.get<Array<PercentileRow>>(cacheKey);
		if (cached) return cached;

		const results = await Promise.all(
			normalizedAges.map(async (month): Promise<PercentileRow> => {
				const lms = await this.getLMSParameters(gender, metricType, month);
				if (!lms) {
					return { ageMonths: month, p3: 0, p15: 0, p50: 0, p85: 0, p97: 0 };
				}
				const percentiles = getPercentilesFromLMS(lms, metricType);
				return { ageMonths: month, ...percentiles };
			})
		);

		queryCache.set(cacheKey, results, {
			ttl: CACHE_TTL_MS,
			tags: [WHO_PERCENTILE_CURVE_TAG, WHO_CACHE_TAG, gender, metricType]
		});

		return results;
	}

	// --------------------------------------------------------------------------
	// Writes
	// --------------------------------------------------------------------------

	/**
	 * Bulk insert WHO growth data.
	 *
	 * The transaction is opened via `withTransaction` (not `this.db.transaction`)
	 * so the method works whether the repo was constructed with the root client
	 * or an already-open transaction handle.
	 */
	async bulkInsert(
		data: Array<NewWHOGrowthData>
	): Promise<Array<WHOGrowthData>> {
		if (data.length === 0) return [];

		const results = await withTransaction(async (tx: Transaction) => {
			return tx.insert(whoGrowthData).values(data).returning();
		});

		// Invalidate AFTER commit so a rollback cannot leave the cache cold.
		queryCache.invalidateTag(WHO_CACHE_TAG);

		return results;
	}

	/**
	 * Upsert WHO growth data (insert or update on `id` conflict).
	 *
	 * Uses `withTransaction` for the same reason as `bulkInsert`.
	 */
	async upsert(data: NewWHOGrowthData): Promise<WHOGrowthData> {
		const result = await withTransaction(async (tx: Transaction) => {
			const [row] = await tx
				.insert(whoGrowthData)
				.values({ ...data, updatedAt: new Date() })
				.onConflictDoUpdate({
					target: whoGrowthData.id,
					set: {
						gender: data.gender,
						metricType: data.metricType,
						ageDays: data.ageDays,
						ageMonths: data.ageMonths,
						L: data.L,
						M: data.M,
						S: data.S,
						sd4neg: data.sd4neg,
						sd3neg: data.sd3neg,
						sd2neg: data.sd2neg,
						sd1neg: data.sd1neg,
						sd0: data.sd0,
						sd1: data.sd1,
						sd2: data.sd2,
						sd3: data.sd3,
						sd4: data.sd4,
						updatedAt: new Date()
					}
				})
				.returning();

			if (!row) throw new Error("WHO growth upsert returned no row");
			return row;
		});

		// Invalidate AFTER commit.
		queryCache.invalidateTag(WHO_CACHE_TAG);

		return result;
	}

	// --------------------------------------------------------------------------
	// Cache
	// --------------------------------------------------------------------------

	/**
	 * Clear every WHO cache entry. Delegates to the tag-based invalidation in
	 * `queryCache` so the cache hierarchy (`who_growth`, `who:percentile_curve`,
	 * per-gender, per-metric) is evicted in one call.
	 */
	clearCache(): void {
		queryCache.invalidateTag(WHO_CACHE_TAG);
		queryCache.invalidateTag(WHO_PERCENTILE_CURVE_TAG);
	}

	// --------------------------------------------------------------------------
	// Base-class compatibility
	// --------------------------------------------------------------------------

	/**
	 * The base class accepts an optional `ClinicScope` on every method. WHO
	 * reference data is not clinic-scoped, so the scope parameter is ignored
	 * here. Explicitly overriding `findById` keeps the override signature
	 * compatible with `BaseRepository` and gives the compiler a chance to
	 * flag any future widening.
	 */
	async findById(
		id: string,
		_scope?: ClinicScope
	): Promise<WHOGrowthData | null> {
		return this.findById(id);
	}
}

export const whoGrowthRepository = new WhoGrowthRepository(db);
