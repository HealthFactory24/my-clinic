// src/db/repositories/base.repository.ts
import { eq, type SQL, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import type { DB, DBorTx, Transaction } from "#/lib/db";
import { queryCache } from "#/lib/db/cache";

export type ClinicScope = {
	clinicId: string;
};

export const DEFAULT_CACHE_TTL_MS = 300_000; // 5 minutes

export type WithClause = Record<string, boolean | Record<string, unknown>>;

export interface BaseFindManyOptions {
	limit?: number;
	offset?: number;
	orderBy?: SQL | Array<SQL>;
	with?: WithClause;
}
export type BaseRow = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Verify that `value` has the two methods the base needs from a Drizzle
 * relational query builder. Returns the narrowed shape directly — no cast.
 */
function isQueryBuilder(value: unknown): value is {
	findMany: (options?: unknown) => Promise<unknown>;
	findFirst: (options?: unknown) => Promise<unknown>;
} {
	return (
		isRecord(value) &&
		typeof value["findMany"] === "function" &&
		typeof value["findFirst"] === "function"
	);
}

function hasQueryMap(
	value: unknown
): value is { query: Record<string, unknown> } {
	return isRecord(value) && isRecord(value["query"]);
}

function sqlToCacheKey(fragment: SQL | undefined): string {
	if (!fragment) return "all";
	const { sql: text, params } = fragment.toQuery({
		escapeName: name => name,
		escapeParam: () => "?",
		escapeString: () => "?"
	});
	return `${text}::${JSON.stringify(params)}`;
}

export abstract class BaseRepository {
	/** The Drizzle table object. Subclasses narrow this in their constructor. */
	protected abstract readonly table: PgTable;

	/** The primary-key column. Subclasses provide the concrete column. */
	protected abstract readonly idColumn: PgColumn;

	/** The table name, used for cache keys and error messages. */
	protected abstract readonly tableName: string;

	/** The Drizzle client (or transaction handle) this repo operates on. */
	protected readonly db: DB | Transaction | DBorTx;

	constructor(db: DB | Transaction | DBorTx) {
		this.db = db;
	}

	protected async cacheQuery<TResult>(
		key: string,
		queryFn: () => Promise<TResult>,
		ttlMs = DEFAULT_CACHE_TTL_MS,
		tags: Array<string> = []
	): Promise<TResult> {
		const cached = queryCache.get<TResult>(key);
		if (cached !== null) return cached;

		const result = await queryFn();
		queryCache.set(key, result, { ttl: ttlMs, tags });
		return result;
	}

	protected invalidateCache(pattern?: string | RegExp): void {
		if (!pattern) {
			queryCache.invalidatePrefix(`${this.tableName}:`);
			return;
		}
		if (typeof pattern === "string") {
			queryCache.invalidate(pattern);
		} else {
			queryCache.invalidatePattern(pattern);
		}
	}

	protected invalidateTag(tag: string): void {
		queryCache.invalidateTag(tag);
	}

	protected invalidateTags(tags: Array<string>): void {
		for (const tag of tags) queryCache.invalidateTag(tag);
	}

	protected getRecordTags(id: string): Array<string> {
		return [`${this.tableName}:${id}`, `${this.tableName}:record`];
	}

	protected getListTags(): Array<string> {
		return [`${this.tableName}:list`];
	}

	protected getCountTags(): Array<string> {
		return [`${this.tableName}:count`];
	}

	protected getQueryBuilder(): {
		findMany: (options?: unknown) => Promise<unknown>;
		findFirst: (options?: unknown) => Promise<unknown>;
	} {
		if (!hasQueryMap(this.db)) {
			throw new Error(
				"Relational query builder not available on this database handle. " +
					"Construct the Drizzle client with { relations } from defineRelations()."
			);
		}
		const queries = this.db.query as Record<string, unknown>;
		const tableQuery = queries[this.tableName];
		if (!isQueryBuilder(tableQuery)) {
			throw new Error(
				`No relational query builder registered for table "${this.tableName}". ` +
					"Add this table to defineRelations() so it exposes a " +
					`\`.query.${this.tableName}\` accessor.`
			);
		}
		return tableQuery;
	}

	protected async findByIdImpl(id: string): Promise<BaseRow | null> {
		const cacheKey = `${this.tableName}:findById:${id}`;
		const tags = this.getRecordTags(id);

		return this.cacheQuery(
			cacheKey,
			async () => {
				const rows = await this.db
					.select()
					.from(this.table)
					.where(eq(this.idColumn, id))
					.limit(1);
				const [row] = rows;
				// `rows[0]` is `unknown` when the table is the base `PgTable`. The
				// guard below narrows it to `BaseRow | null` without a cast.
				return isRecord(row) ? row : null;
			},
			DEFAULT_CACHE_TTL_MS,
			tags
		);
	}

	protected async findManyImpl(
		where: SQL | undefined,
		options: BaseFindManyOptions = {}
	): Promise<Array<BaseRow>> {
		const query = this.getQueryBuilder();

		const queryOptions: Record<string, unknown> = {};
		if (where) queryOptions["where"] = where;
		if (options.orderBy) queryOptions["orderBy"] = options.orderBy;
		if (options.limit !== undefined) queryOptions["limit"] = options.limit;
		if (options.offset !== undefined) queryOptions["offset"] = options.offset;
		if (options.with) queryOptions["with"] = options.with;

		const result = await query.findMany(queryOptions);
		if (!Array.isArray(result)) {
			throw new TypeError(
				`findMany on "${this.tableName}" returned a non-array result.`
			);
		}
		return result.filter(isRecord);
	}

	protected async createImpl(data: BaseRow): Promise<BaseRow> {
		const rows: unknown = await this.db
			.insert(this.table)
			.values(data)
			.returning();

		if (!Array.isArray(rows)) {
			throw new TypeError(
				`Insert into "${this.tableName}" returned a non-array result.`
			);
		}
		const [row] = rows;
		if (!isRecord(row)) {
			throw new Error(`Insert into "${this.tableName}" returned no row.`);
		}

		this.invalidateTags([...this.getListTags(), ...this.getCountTags()]);
		return row;
	}

	protected async updateImpl(
		id: string,
		data: BaseRow,
		hasUpdatedAt: boolean
	): Promise<BaseRow | null> {
		const payload: BaseRow = { ...data };
		if (hasUpdatedAt) {
			payload["updatedAt"] = new Date();
		}

		const rows: unknown = await this.db
			.update(this.table)
			.set(payload)
			.where(eq(this.idColumn, id))
			.returning();

		if (!Array.isArray(rows)) return null;
		const [row] = rows;
		if (!isRecord(row)) return null;

		this.invalidateTags([
			...this.getRecordTags(id),
			...this.getListTags(),
			...this.getCountTags()
		]);
		return row;
	}

	/**
	 * Delete a row by primary key. Returns `true` if a row was removed.
	 */
	protected async deleteImpl(id: string): Promise<boolean> {
		const rows: unknown = await this.db
			.delete(this.table)
			.where(eq(this.idColumn, id))
			.returning();

		if (!Array.isArray(rows) || rows.length === 0) return false;

		this.invalidateTags([
			...this.getRecordTags(id),
			...this.getListTags(),
			...this.getCountTags()
		]);
		return true;
	}
	async count(where?: SQL): Promise<number> {
		const cacheKey = `${this.tableName}:count:${sqlToCacheKey(where)}`;
		const tags = this.getCountTags();

		return this.cacheQuery(
			cacheKey,
			async () => {
				const base = this.db
					.select({ count: sql<number>`count(*)::int` })
					.from(this.table);
				const query = where ? base.where(where) : base;
				const rows = await query;
				return rows[0]?.count ?? 0;
			},
			DEFAULT_CACHE_TTL_MS,
			tags
		);
	}
}
