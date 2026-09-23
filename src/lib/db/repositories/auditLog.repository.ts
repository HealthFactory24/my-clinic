// src/lib/db/repositories/auditLog.repository.ts
import { and, count, desc, eq, gte, lte, type SQL } from "drizzle-orm";

import { queryCache } from "#/lib/db/cache.ts";
import { auditLogs } from "#/lib/db/schema/clinic.schema.ts";
import type {
	AuditAction,
	AuditEntity,
	NewAuditLog
} from "#/lib/db/schema/types.ts";
import { db, readCount } from "#/lib/db/server.ts";
import { createId } from "#/utils/id.ts";

// ============================================================
// Constants
// ============================================================

const AUDIT_CACHE_TAG = "auth:audit";
const AUDIT_COUNT_CACHE_TAG = "auth:audit:count";

const LIST_CACHE_TTL = 30_000;

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

// ============================================================
// Types
// ============================================================

export type AuditLogRow = typeof auditLogs.$inferSelect;

export type FindAuditLogsOptions = {
	/** Filter by staff who performed the action. */
	staffId?: string;
	/** Filter by action type. */
	action?: AuditAction;
	/** Filter by entity type. */
	entity?: AuditEntity;
	/** Filter by the specific entity ID (e.g. a patient id). */
	entityId?: string;
	/** Inclusive lower bound on `timestamp`. */
	startDate?: Date;
	/** Inclusive upper bound on `timestamp`. */
	endDate?: Date;
	/** Page size (default 50, max 200). */
	limit?: number;
	/** Offset (default 0). */
	offset?: number;
};

export type FindAuditLogsResult = {
	data: AuditLogRow[];
	total: number;
	limit: number;
	offset: number;
};

// ============================================================
// Helpers
// ============================================================

/**
 * Build the SQL conditions shared by `findAuditLogs`'s page query and its
 * count query so the two cannot drift.
 */
function buildAuditConditions(
	options: FindAuditLogsOptions
): Array<SQL | undefined> {
	const conditions: Array<SQL | undefined> = [];

	if (options.staffId) conditions.push(eq(auditLogs.staffId, options.staffId));
	if (options.action) conditions.push(eq(auditLogs.action, options.action));
	if (options.entity) conditions.push(eq(auditLogs.entity, options.entity));
	if (options.entityId)
		conditions.push(eq(auditLogs.entityId, options.entityId));
	if (options.startDate)
		conditions.push(gte(auditLogs.timestamp, options.startDate));
	if (options.endDate)
		conditions.push(lte(auditLogs.timestamp, options.endDate));

	return conditions;
}

function combineConditions(
	conditions: Array<SQL | undefined>
): SQL | undefined {
	const valid = conditions.filter((c): c is SQL => c !== undefined);
	if (valid.length === 0) return undefined;
	if (valid.length === 1) return valid[0];
	return and(...valid);
}

// ============================================================
// Repository
// ============================================================

export const auditRepository = {
	/**
	 * Append a single audit log entry.
	 *
	 * A lone INSERT is atomic in PostgreSQL, so no transaction wrapper is
	 * needed. Skipping the transaction saves one round-trip (`BEGIN`/`COMMIT`)
	 * per audit event, which matters because `record()` is on the hot path of
	 * every write in the application.
	 *
	 * The `timestamp` column is left to its `defaultNow()` default so the
	 * value comes from the DB server's clock rather than the application
	 * process's — audit timestamps should not be affected by app-server NTP
	 * drift or clock skew.
	 */
	async record(entry: Omit<NewAuditLog, "id" | "timestamp">): Promise<void> {
		await db.insert(auditLogs).values({
			id: createId("audit"),
			...entry
		});

		// Invalidate AFTER the insert resolves so a failed write cannot leave
		// the cache cold.
		queryCache.invalidateTag(AUDIT_CACHE_TAG);
		queryCache.invalidateTag(AUDIT_COUNT_CACHE_TAG);
	},

	/**
	 * Append many audit log entries in a single round-trip.
	 *
	 * Use this on bulk-write paths (batch create, batch update, bulk import)
	 * so the audit trail costs one INSERT statement instead of N.
	 */
	async recordBatch(
		entries: Array<Omit<NewAuditLog, "id" | "timestamp">>
	): Promise<void> {
		if (entries.length === 0) return;

		await db.insert(auditLogs).values(
			entries.map(entry => ({
				id: createId("audit"),
				...entry
			}))
		);

		queryCache.invalidateTag(AUDIT_CACHE_TAG);
		queryCache.invalidateTag(AUDIT_COUNT_CACHE_TAG);
	},

	/**
	 * Page through the audit trail with the given filters.
	 *
	 * This is the canonical implementation. `authRepository.findAuditLogs`
	 * was previously the only implementation, which created a circular
	 * dependency (auth imports the types from this file, this file has no
	 * function) and duplicated the query logic. Both repositories now call
	 * this method.
	 */
	async findAuditLogs(
		options: FindAuditLogsOptions = {}
	): Promise<FindAuditLogsResult> {
		const limit = Math.min(
			Math.max(1, options.limit ?? DEFAULT_PAGE_SIZE),
			MAX_PAGE_SIZE
		);
		const offset = Math.max(0, options.offset ?? 0);

		const cacheKey = `auth:audit:${JSON.stringify({
			staffId: options.staffId,
			action: options.action,
			entity: options.entity,
			entityId: options.entityId,
			startDate: options.startDate?.toISOString(),
			endDate: options.endDate?.toISOString(),
			limit,
			offset
		})}`;

		const cached = queryCache.get<FindAuditLogsResult>(cacheKey);
		if (cached) return cached;

		const where = combineConditions(buildAuditConditions(options));

		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(auditLogs)
				.where(where)
				.orderBy(desc(auditLogs.timestamp))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(auditLogs).where(where)
		]);

		const result: FindAuditLogsResult = {
			data,
			total: readCount(totalResult),
			limit,
			offset
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [AUDIT_CACHE_TAG]
		});

		return result;
	},

	/**
	 * Evict every cached audit-log entry.
	 *
	 * Call after a bulk import or after a schema-migration that backfills
	 * historical audit entries. Regular writes already invalidate via
	 * `record()` / `recordBatch()`.
	 */
	clearCache(): void {
		queryCache.invalidateTag(AUDIT_CACHE_TAG);
		queryCache.invalidateTag(AUDIT_COUNT_CACHE_TAG);
	}
};

export type AuditRepository = typeof auditRepository;
