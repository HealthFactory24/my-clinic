// src/lib/db/vector/setup-vector-extension.ts
//
// Enables pgvector and creates a handful of SQL helper functions.
// Safe to run repeatedly — every statement is idempotent.
//
// Usage:
//   vpx tsx --env-file=.env src/lib/db/vector/setup-vector-extension.ts

import process from "node:process";
import { pathToFileURL } from "node:url";

import { sql } from "drizzle-orm";

import { closeConnection, db } from "../index";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VectorExtensionInfo {
	exists: boolean;
	version: string | null;
}

export interface VectorCapabilities {
	/** pgvector operator classes work (`<=>`, `<->`, `<#>`). */
	vectorOps: boolean;
	/** HNSW access method is available (`CREATE INDEX ... USING hnsw`). */
	hnsw: boolean;
	/**
	 * When `vectorOps` is `false`, the reason the arithmetic test failed.
	 * `undefined` when the test passed. Surface this to the caller so a
	 * missing extension is distinguishable from a broken installation.
	 */
	vectorOpsError?: string;
	/**
	 * When `hnsw` is `false`, the reason the capability query failed, if any.
	 * The HNSW check returning `false` without an error is normal on older
	 * Postgres builds — it means IVFFlat should be used instead.
	 */
	hnswError?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle result normalization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape guard for a plain record (non-array, non-null object).
 *
 * We can't ask Drizzle for the driver's result shape because `db.execute`'s
 * return type is intentionally driver-agnostic. This narrows `unknown` to
 * `Record<string, unknown>` without an assertion, so the subsequent
 * `"rows" in value` access is safe.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Extract the first row from a Drizzle `db.execute` result.
 *
 * `postgres-js` returns rows as a plain array; some other drivers wrap them
 * in `{ rows: [...] }`. Both shapes are handled here so a driver swap doesn't
 * silently break every capability check.
 *
 * The caller declares the row type `T`; the runtime shape of `T` is not
 * verified. This matches the contract of `db.execute<T>` itself — see the
 * call sites below, which pass a literal column list.
 */
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters
function firstRow<T>(result: unknown): T | undefined {
	if (Array.isArray(result)) {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- T is a caller-supplied row type with no runtime guard available; matches db.execute<T>'s own contract
		return result[0] as T | undefined;
	}
	if (isRecord(result) && "rows" in result) {
		const rows = result["rows"];
		if (Array.isArray(rows)) {
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
			return rows[0] as T | undefined;
		}
	}
	return undefined;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

// ─────────────────────────────────────────────────────────────────────────────
// Checks
// ─────────────────────────────────────────────────────────────────────────────

export async function getVectorExtensionInfo(): Promise<VectorExtensionInfo> {
	const result = await db.execute<{
		exists: boolean;
		version: string | null;
	}>(sql`
    SELECT
      EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists,
      (SELECT extversion FROM pg_extension WHERE extname = 'vector') AS version
  `);

	const row = firstRow<{ exists: boolean; version: string | null }>(result);
	return {
		exists: row?.exists ?? false,
		version: row?.version ?? null
	};
}

/**
 * Probe pgvector's two capabilities.
 *
 * Never throws — returns a result object with per-capability flags and the
 * failure reason (if any). This lets `setupVectorExtension` continue on a
 * partially-usable install and lets callers distinguish "not installed"
 * from "installed but broken".
 */
export async function checkVectorCapabilities(): Promise<VectorCapabilities> {
	const capabilities: VectorCapabilities = { vectorOps: false, hnsw: false };

	// 1. Operator classes: cast two literals and add them.
	try {
		const result = await db.execute<{ result: string }>(sql`
      SELECT ('[1,2,3]'::vector + '[4,5,6]'::vector)::text AS result
    `);
		const row = firstRow<{ result: string }>(result);
		capabilities.vectorOps = row?.result === "[5,7,9]";
		if (!capabilities.vectorOps) {
			capabilities.vectorOpsError = `unexpected result: ${row?.result ?? "<none>"}`;
		}
	} catch (error) {
		capabilities.vectorOpsError = errorMessage(error);
	}

	// 2. HNSW access method.
	try {
		const result = await db.execute<{ has_indexing: boolean }>(sql`
      SELECT EXISTS(SELECT 1 FROM pg_am WHERE amname = 'hnsw') AS has_indexing
    `);
		const row = firstRow<{ has_indexing: boolean }>(result);
		capabilities.hnsw = row?.has_indexing ?? false;
	} catch (error) {
		capabilities.hnswError = errorMessage(error);
	}

	return capabilities;
}

/** Human-readable log lines for a `VectorCapabilities` object. */
export function reportVectorCapabilities(caps: VectorCapabilities): void {
	if (caps.vectorOps) {
		console.log("🧪 Vector arithmetic: ✅ working");
	} else {
		console.log(
			`🧪 Vector arithmetic: ❌ failed${caps.vectorOpsError ? ` (${caps.vectorOpsError})` : ""}`
		);
	}

	if (caps.hnsw) {
		console.log("🔄 HNSW indexing: ✅ available");
	} else {
		const reason = caps.hnswError ? ` (${caps.hnswError})` : "";
		console.log(
			`🔄 HNSW indexing: ⚠️  not available — fall back to IVFFlat${reason}`
		);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SQL helper functions the app relies on for semantic search.
 *
 * Kept as a module-level constant so tests can enumerate them and so the
 * `setupVectorExtension` flow can create them idempotently with
 * `CREATE OR REPLACE FUNCTION`. All three are `IMMUTABLE` so they can be
 * used in indexes and generated columns.
 */
const VECTOR_FUNCTIONS = [
	sql`
    CREATE OR REPLACE FUNCTION cosine_similarity(vec1 vector, vec2 vector)
    RETURNS float AS $$
      SELECT 1 - (vec1 <=> vec2);
    $$ LANGUAGE sql IMMUTABLE;
  `,
	sql`
    CREATE OR REPLACE FUNCTION euclidean_distance(vec1 vector, vec2 vector)
    RETURNS float AS $$
      SELECT vec1 <-> vec2;
    $$ LANGUAGE sql IMMUTABLE;
  `,
	sql`
    CREATE OR REPLACE FUNCTION inner_product(vec1 vector, vec2 vector)
    RETURNS float AS $$
      SELECT vec1 <#> vec2;
    $$ LANGUAGE sql IMMUTABLE;
  `
] as const;

/**
 * Create (or replace) the SQL helper functions.
 *
 * Runs sequentially, not in parallel. `CREATE OR REPLACE FUNCTION` writes
 * to `pg_proc`, and while three separate functions don't contend on the same
 * row, running them sequentially:
 *   1. Keeps the connection pool free for other callers during setup.
 *   2. Makes the log output deterministic on failure (you know exactly which
 *      statement failed).
 *   3. Costs nothing meaningful — this runs once per environment.
 *
 * The `no-await-in-loop` rule is disabled below: the sequential execution is
 * the point — see the doc comment above. Collecting into `Promise.all` would
 * defeat items (1) and (2).
 */
async function createVectorFunctions(): Promise<void> {
	console.log("🔧 Creating vector utility functions...");

	for (const [index, statement] of VECTOR_FUNCTIONS.entries()) {
		try {
			// oxlint-disable-next-line eslint/no-await-in-loop -- sequential by design; see doc comment
			await db.execute(statement);
		} catch (error) {
			throw new Error(
				`Failed to create vector function #${index + 1}: ${errorMessage(error)}`,
				{
					cause: error
				}
			);
		}
	}

	console.log("✅ Vector utility functions ready");
}

/**
 * Enable pgvector and its helper functions.
 *
 * Idempotent. Every step runs on every invocation so a partially-broken
 * install self-heals:
 *   - `CREATE EXTENSION IF NOT EXISTS` — no-op when already enabled.
 *   - `CREATE OR REPLACE FUNCTION`        — refreshes the helper functions.
 *
 * Throws on unrecoverable errors so the caller decides whether to abort.
 * Does not call `process.exit`.
 */
export async function setupVectorExtension(): Promise<void> {
	const target =
		process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] ?? "unknown";
	console.log(`🚀 Setting up pgvector on ${target}...`);

	const before = await getVectorExtensionInfo();

	if (before.exists) {
		console.log(
			`✅ pgvector already enabled (version: ${before.version ?? "unknown"})`
		);
	} else {
		console.log("📦 Enabling pgvector...");
		try {
			await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
		} catch (error) {
			throw new Error(
				"Failed to enable pgvector. The extension must be installable on this " +
					"Postgres instance. For local Docker, use the image " +
					`\`pgvector/pgvector:pg17\`. Error: ${errorMessage(error)}`,
				{ cause: error }
			);
		}

		const after = await getVectorExtensionInfo();
		console.log(`✅ pgvector enabled (version: ${after.version ?? "unknown"})`);
	}

	const caps = await checkVectorCapabilities();
	reportVectorCapabilities(caps);

	if (!caps.vectorOps) {
		throw new Error(
			"pgvector is installed but operator classes are not working. " +
				"Verify the extension was created in the current schema and that " +
				"the `vector` type is visible to the connecting role."
		);
	}

	await createVectorFunctions();

	console.log("\n📝 Vector storage is ready.");
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entrypoint
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True when this module is the entry point of the current process.
 *
 * `pathToFileURL` handles spaces, Windows paths, symlinks, and URL-encoding
 * correctly, unlike the naive `import.meta.url === \`file://${argv[1]}\``.
 */
function isMainModule(): boolean {
	const entry = process.argv[1];
	if (!entry) return false;
	try {
		return import.meta.url === pathToFileURL(entry).href;
	} catch {
		return false;
	}
}

async function runCli(): Promise<void> {
	try {
		await setupVectorExtension();
		console.log("✅ Done!");
		await closeConnection();
		process.exit(0);
	} catch (error) {
		console.error(`\n❌ Vector setup failed: ${errorMessage(error)}`);
		try {
			await closeConnection();
		} catch {
			// Best-effort cleanup; the process is about to exit either way.
		}
		process.exit(1);
	}
}

if (isMainModule()) {
	void runCli();
}
