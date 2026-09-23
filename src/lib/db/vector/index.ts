// oxlint-disable typescript/no-unsafe-type-assertion no-await-in-loop
// src/lib/db/vector/index.ts
//
// Vector search + embedding providers for pgvector-backed workloads.
//
// Structure:
//   ─ VectorStore   : pgvector CRUD/search helpers (SQL-level).
//   ─ Embeddings    : provider abstraction + batch orchestration.
//
// All public exports are at the bottom of the file. Keep provider-specific
// logic inside the `Embeddings` section so future providers (Cohere, Voyage,
// local ONNX, …) have a consistent place to live.

import { createHash } from "node:crypto";

import { sql } from "drizzle-orm";

import { db } from "../index";

// ============================================================================
// Constants
// ============================================================================

/**
 * Per-request timeout for embedding calls.
 *
 * LM Studio can hang for tens of seconds while a model is loaded. Without a
 * timeout the caller awaits forever — `withRetry` never fires because nothing
 * throws, and downstream HTTP requests stall. 30s is generous for a local
 * model on a warm cache; raise it if you run cold-start embeddings on very
 * small hardware.
 */
const EMBEDDING_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Backoff schedule for `withRetry`. Total budget ≈ 6s before final failure.
 * Kept short because embeddings are usually called on user-facing paths
 * where a slow retry is worse than a fast error.
 */
const RETRY_DELAYS_MS = [500, 1_500, 4_000] as const;

/**
 * HTTP status codes in the 4xx range that are worth retrying.
 *
 * 408 — Request Timeout (server-side transient)
 * 425 — Too Early (rare; TLS/HTTP2 negotiation races)
 * 429 — Too Many Requests (rate limit)
 *
 * Every other 4xx is a client error: retrying will produce the same failure.
 */
const TRANSIENT_4XX: ReadonlySet<number> = new Set([408, 425, 429]);

/**
 * Known embedding dimensions for common models. Used to fail fast at boot
 * when `EMBEDDING_DIMENSION` disagrees with the configured provider model —
 * otherwise the mismatch only surfaces after the first paid API call.
 *
 * Extend this list as you add models. Unknown models are allowed through
 * (some self-hosted models have non-standard dimensions).
 */
const KNOWN_MODEL_DIMENSIONS: Readonly<Record<string, number>> = {
	// OpenAI
	"text-embedding-3-small": 1536,
	"text-embedding-3-large": 3072,
	"text-embedding-ada-002": 1536,
	// LM Studio / Hugging Face — common names
	"nomic-embed-text-v1.5": 768,
	"nomic-embed-text-v1": 768,
	"bge-large-en-v1.5": 1024,
	"bge-base-en-v1.5": 768,
	"bge-small-en-v1.5": 384,
	"mxbai-embed-large-v1": 1024,
	"all-minilm-l6-v2": 384
};

// ============================================================================
// Types
// ============================================================================

export type EmbeddingProvider = "lmstudio" | "openai" | "none";

/** A single row returned by an OpenAI-compatible `/embeddings` endpoint. */
type EmbeddingDatum = {
	embedding: number[];
	index: number;
};

type ProviderResponse = {
	data: EmbeddingDatum[];
	model: string;
};

/** Options accepted by every embedding call. */
export interface EmbeddingOptions {
	/** Cancellation signal, propagated into `fetch`. */
	signal?: AbortSignal;
	/**
	 * When `true`, wraps the provider call in `withRetry`. Defaults to `true`
	 * for network providers, ignored for `"none"`.
	 */
	retry?: boolean;
}

/** A pgvector search result. */
export interface VectorSearchResult<T = Record<string, unknown>> {
	row: T;
	distance: number;
	similarity: number;
}

/** Options for `VectorStore.search`. */
export interface VectorSearchOptions {
	/** Distance metric. Defaults to `"cosine"`. */
	metric?: "cosine" | "l2" | "inner_product";
	/** `LIMIT`. Defaults to 10. */
	limit?: number;
	/** Optional `WHERE` fragment, as raw SQL. */
	where?: ReturnType<typeof sql>;
	/** Columns to return alongside the distance. Defaults to `*`. */
	select?: Array<string>;
}

// ============================================================================
// Vector store (pgvector helpers)
// ============================================================================

/**
 * SQL-level helpers for pgvector-backed tables.
 *
 * Every method is a thin wrapper over `db.execute`. Column and table names
 * are validated as SQL identifiers (`^[a-z_][a-z0-9_]*$`) before
 * interpolation so a caller cannot smuggle SQL through them. If you need
 * dynamic identifiers beyond that constraint, extend the validator rather
 * than removing it.
 */
const IDENTIFIER_REGEX = /^[a-z_][a-z0-9_]*$/;

function assertIdentifier(value: string, label: string): string {
	if (!IDENTIFIER_REGEX.test(value)) {
		throw new Error(`Invalid SQL identifier for ${label}: "${value}"`);
	}
	return value;
}

function pgvectorOp(
	metric: NonNullable<VectorSearchOptions["metric"]>
): string {
	switch (metric) {
		case "cosine":
			return "<=>";
		case "l2":
			return "<->";
		case "inner_product":
			return "<#>";
		default: {
			const exhaustive: never = metric;
			throw new Error(`Unknown vector metric: ${String(exhaustive)}`);
		}
	}
}

function toSqlLiteral(vector: number[]): string {
	// pgvector accepts the text form '[1,2,3]'. We validate finiteness here
	// because a NaN/Infinity would poison the index silently.
	for (const v of vector) {
		if (!Number.isFinite(v)) {
			throw new Error("Vector contains a non-finite value (NaN or Infinity)");
		}
	}
	return `[${vector.join(",")}]`;
}

export const VectorStore = {
	/**
	 * Insert (or upsert) a row with a vector column.
	 *
	 * `idColumn` / `vectorColumn` are identifiers; `values` is a column→value
	 * map whose values are bound as SQL parameters. Use `ON CONFLICT (id) DO
	 * UPDATE` when `upsert` is true.
	 */
	async insert(
		table: string,
		idColumn: string,
		vectorColumn: string,
		id: string,
		vector: number[],
		values: Record<string, unknown> = {},
		options: { upsert?: boolean } = {}
	): Promise<void> {
		const t = assertIdentifier(table, "table");
		const idCol = assertIdentifier(idColumn, "idColumn");
		const vecCol = assertIdentifier(vectorColumn, "vectorColumn");

		const extraColumns = Object.keys(values);
		for (const col of extraColumns) assertIdentifier(col, "column");

		const columnList = [idCol, vecCol, ...extraColumns];
		const placeholders = [
			sql`${id}`,
			sql`${toSqlLiteral(vector)}::vector`,
			...extraColumns.map(col => sql`${values[col]}`)
		];

		const conflictClause = options.upsert
			? sql`ON CONFLICT (${sql.identifier(idCol)}) DO UPDATE SET
              ${sql.identifier(vecCol)} = EXCLUDED.${sql.identifier(vecCol)}`
			: sql``;

		await db.execute(sql`
      INSERT INTO ${sql.identifier(t)} (${sql.join(
				columnList.map(c => sql.identifier(c)),
				sql`, `
			)})
      VALUES (${sql.join(placeholders, sql`, `)})
      ${conflictClause}
    `);
	},

	/**
	 * Nearest-neighbour search.
	 *
	 * Returns rows plus both `distance` (metric-native) and `similarity`
	 * (1 - distance for cosine, so higher is better). The `distance` column
	 * name is fixed as `_distance` in the generated SQL to avoid collisions
	 * with user columns.
	 */
	/**
	 * Nearest-neighbour search.
	 *
	 * Returns rows plus both `distance` (metric-native) and `similarity`
	 * (1 - distance for cosine, so higher is better). The `distance` column
	 * name is fixed as `_distance` in the generated SQL to avoid collisions
	 * with user columns.
	 */
	async search<T = Record<string, unknown>>(
		table: string,
		vectorColumn: string,
		queryVector: number[],
		options: VectorSearchOptions = {}
	): Promise<Array<VectorSearchResult<T>>> {
		const t = assertIdentifier(table, "table");
		const vecCol = assertIdentifier(vectorColumn, "vectorColumn");
		const metric = options.metric ?? "cosine";
		const op = pgvectorOp(metric);
		const limit = options.limit ?? 10;

		const selectList =
			options.select && options.select.length > 0
				? sql.join(
						options.select.map(c =>
							sql.identifier(assertIdentifier(c, "select"))
						),
						sql`, `
					)
				: sql`*`;

		const whereClause = options.where ? sql`WHERE ${options.where}` : sql``;

		const rows = await db.execute(sql`
      SELECT
        ${selectList},
        ${sql.identifier(vecCol)} ${sql.raw(op)} ${toSqlLiteral(queryVector)}::vector AS _distance
      FROM ${sql.identifier(t)}
      ${whereClause}
      ORDER BY _distance ASC
      LIMIT ${limit}
    `);

		return rows.map((row: Record<string, unknown>) => {
			const distance = Number(row["_distance"] ?? 0);
			const similarity = metric === "cosine" ? 1 - distance : distance;
			const { _distance: _omit, ...rest } = row;
			void _omit;
			// The caller declares the row shape via `search<MyRow>()`. The SQL is
			// `SELECT <user columns> FROM <user table>`, so TypeScript cannot
			// relate the runtime column list to `T`. This assertion is the same
			// contract `db.execute<T>` itself uses — the generic is the caller's
			// promise, not a verified one.
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion typescript/no-unsafe-type-assertion typescript/no-unsafe-type-assertion typescript/no-unsafe-type-assertion
			return { row: rest as T, distance, similarity };
		});
	},
	/**
	 * Return the list of tables in the current database that have at least one
	 * `vector` column, along with the vector columns per table.
	 */
	async listVectorColumns(): Promise<
		Array<{ table: string; columns: string[] }>
	> {
		const rows = await db.execute<{
			table_name: string;
			column_name: string;
		}>(sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE data_type = 'vector'
      ORDER BY table_name, column_name
    `);

		const byTable = new Map<string, string[]>();
		for (const row of rows) {
			const list = byTable.get(row.table_name) ?? [];
			list.push(row.column_name);
			byTable.set(row.table_name, list);
		}
		return [...byTable.entries()].map(([table, columns]) => ({
			table,
			columns
		}));
	},

	/**
	 * True iff pgvector is installed and the `vector` type is usable.
	 */
	async isAvailable(): Promise<boolean> {
		try {
			const rows = await db.execute<{ available: boolean }>(sql`
        SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS available
      `);
			return rows[0]?.available === true;
		} catch {
			return false;
		}
	}
} as const;

// ============================================================================
// Embedding providers
// ============================================================================

/**
 * Shape guard for OpenAI-compatible `/embeddings` responses.
 *
 * Anything that isn't `{ data: [{ embedding: number[], index }], model:
 * string }` fails here rather than at the first property access downstream.
 */
function isProviderResponse(v: unknown): v is ProviderResponse {
	if (typeof v !== "object" || v === null) return false;
	if (!("data" in v) || !Array.isArray(v.data)) return false;
	if (!("model" in v) || typeof v.model !== "string") return false;

	const [first] = v.data;
	if (typeof first !== "object" || first === null) return false;
	if (!("embedding" in first) || !Array.isArray(first.embedding)) return false;
	if (!first.embedding.every((n: unknown) => typeof n === "number"))
		return false;

	return true;
}

/**
 * Read the first embedding from a response. The guard above already rejected
 * `data: []`, so the only remaining failure mode is a malformed first item —
 * which the guard also rejected. Reaching the `throw` here means the guard
 * and this function disagree; treat it as a bug, not a user error.
 */
async function parseEmbeddingResponse(
	res: Response,
	provider: "LM Studio" | "OpenAI"
): Promise<number[]> {
	const json: unknown = await res.json();

	if (!isProviderResponse(json)) {
		throw new Error(
			`${provider} returned an unexpected response shape ` +
				"(expected { data: [{ embedding: number[] }], model: string })"
		);
	}

	const embedding = json.data[0]?.embedding;
	if (!embedding || embedding.length === 0) {
		// Defensive: should be unreachable given the guard. Surface as a
		// distinct message so a future refactor that loosens the guard is
		// immediately visible in logs.
		throw new Error(`${provider} returned an empty embedding array`);
	}

	return embedding;
}

/**
 * Normalize a base URL by stripping trailing slashes. Prevents
 * `http://host//embeddings` when a `.env` value ends with `/`.
 */
function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, "");
}

const LM_STUDIO_EMBEDDINGS_URL = `${normalizeBaseUrl(process.env.LM_STUDIO_BASE_URL ?? "")}/embeddings`;
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

async function callLMStudio(
	text: string,
	signal?: AbortSignal
): Promise<number[]> {
	const res = await fetch(LM_STUDIO_EMBEDDINGS_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: process.env.LM_STUDIO_EMBEDDING_MODEL,
			input: text
		}),
		signal: signal ?? AbortSignal.timeout(EMBEDDING_REQUEST_TIMEOUT_MS)
	});

	if (!res.ok) {
		throw new Error(
			`LM Studio embeddings failed: ${res.status} ${await res.text()}`
		);
	}

	return parseEmbeddingResponse(res, "LM Studio");
}

async function callOpenAI(
	text: string,
	signal?: AbortSignal
): Promise<number[]> {
	if (!process.env.OPENAI_API_KEY) {
		throw new Error("OPENAI_API_KEY is not set but EMBEDDING_PROVIDER=openai");
	}

	const res = await fetch(OPENAI_EMBEDDINGS_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
		},
		body: JSON.stringify({
			model: process.env.OPENAI_EMBEDDING_MODEL,
			input: text
		}),
		signal: signal ?? AbortSignal.timeout(EMBEDDING_REQUEST_TIMEOUT_MS)
	});

	if (!res.ok) {
		throw new Error(
			`OpenAI embeddings failed: ${res.status} ${await res.text()}`
		);
	}

	return parseEmbeddingResponse(res, "OpenAI");
}

/**
 * Deterministic pseudo-embedding derived from a SHA-256 digest of `text`.
 *
 * Only used when `EMBEDDING_PROVIDER="none"` — CI, tests, and offline
 * development. **Not semantically meaningful.** The output is L2-normalized
 * so it behaves like a real embedding for cosine-similarity comparisons; do
 * not rely on it for retrieval quality.
 */
const HEX_CHARS_PER_BYTE = 2;
const BYTE_MAX = 255;

/**
 * `EMBEDDING_DIMENSION` parsed as a positive integer.
 *
 * The environment value is only ever used numerically, so it is validated
 * once at the point of use rather than scattered across arithmetic.
 */
function embeddingDimension(): number {
	const raw = process.env.EMBEDDING_DIMENSION;
	const parsed = Number.parseInt(raw ?? "", 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(
			`EMBEDDING_DIMENSION must be a positive integer, got "${raw}"`
		);
	}
	return parsed;
}

function deterministicEmbedding(text: string): number[] {
	const dimension = embeddingDimension();
	const digest = createHash("SHA-256").update(text).digest("hex");
	const hex = digest.repeat(
		Math.ceil((dimension * HEX_CHARS_PER_BYTE) / digest.length)
	);

	const out = Array.from<number>({ length: dimension });
	let normSq = 0;

	for (let i = 0; i < dimension; i += 1) {
		const byte = Number.parseInt(
			hex.slice(
				i * HEX_CHARS_PER_BYTE,
				i * HEX_CHARS_PER_BYTE + HEX_CHARS_PER_BYTE
			),
			16
		);
		// Map [0, BYTE_MAX] → [-1, 1] so the vector spans the full unit range.
		const v = (byte / BYTE_MAX) * 2 - 1;
		out[i] = v;
		normSq += v * v;
	}

	const norm = Math.sqrt(normSq);
	if (norm > 0) {
		const inv = 1 / norm;
		for (let i = 0; i < out.length; i += 1) out[i] *= inv;
	}

	return out;
}

/**
 * Fail-fast check at module load: does the configured model's known
 * dimension match `EMBEDDING_DIMENSION`?
 *
 * Silent mismatches are expensive — the first embedding call returns a
 * vector of the wrong size, `assertDimension` throws, and (for OpenAI) you
 * have already paid for the call. This surfaces it at boot.
 */
function assertConfiguredDimension(): void {
	const configuredProvider = process.env.EMBEDDING_PROVIDER;
	const model =
		configuredProvider === "openai"
			? process.env.OPENAI_EMBEDDING_MODEL
			: configuredProvider === "lmstudio"
				? process.env.LM_STUDIO_EMBEDDING_MODEL
				: undefined;

	if (!model) return;
	const known = KNOWN_MODEL_DIMENSIONS[model];
	if (known !== undefined && known !== embeddingDimension()) {
		throw new Error(
			`EMBEDDING_DIMENSION=${process.env.EMBEDDING_DIMENSION} does not match the ` +
				`known dimension ${known} for model "${model}". ` +
				"Update EMBEDDING_DIMENSION or change EMBEDDING_PROVIDER / model."
		);
	}
}

assertConfiguredDimension();

// ============================================================================
// Retry helper
// ============================================================================

/**
 * Extract an HTTP status code from an unknown thrown value, if present.
 *
 * `fetch` throws `TypeError` for network errors (no `status`). Providers
 * often throw custom error classes that carry a `status` or `statusCode`
 * field. Both shapes are accepted here.
 */
function getErrorStatus(err: unknown): number | undefined {
	if (typeof err !== "object" || err === null) return undefined;

	if ("status" in err && typeof err.status === "number") return err.status;
	if ("statusCode" in err && typeof err.statusCode === "number")
		return err.statusCode;

	return undefined;
}

/** True for 4xx statuses that are NOT worth retrying. */
function isNonRetryable4xx(status: number | undefined): boolean {
	if (status === undefined) return false;
	return status >= 400 && status < 500 && !TRANSIENT_4XX.has(status);
}

export async function withRetry<T>(
	fn: () => Promise<T>,
	label: string
): Promise<T> {
	async function attempt(n: number): Promise<T> {
		try {
			return await fn();
		} catch (err) {
			if (isNonRetryable4xx(getErrorStatus(err))) throw err;

			const delay = RETRY_DELAYS_MS[n];
			if (delay === undefined) {
				throw new Error(`${label} failed after retries`, { cause: err });
			}

			await new Promise(resolve => setTimeout(resolve, delay));
			return attempt(n + 1);
		}
	}
	return attempt(0);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Validate `EMBEDDING_PROVIDER` against the known providers.
 *
 * The env value is `string | undefined`, so it cannot be narrowed to the
 * `EmbeddingProvider` union by a switch alone; failing fast here keeps the
 * exhaustive `never` check below meaningful.
 */
function assertProvider(raw: string | undefined): EmbeddingProvider {
	switch (raw) {
		case "lmstudio":
		case "openai":
		case "none":
			return raw;
		default:
			throw new Error(`Unknown EMBEDDING_PROVIDER: ${String(raw)}`);
	}
}

/**
 * Generate a single embedding for `text`.
 *
 * The `retry` option defaults to `true` for network providers and is ignored
 * for the `"none"` provider (deterministic embeddings cannot fail
 * transiently). Pass a `signal` to cancel a long-running LM Studio call.
 */
export async function generateEmbedding(
	text: string,
	options: EmbeddingOptions = {}
): Promise<number[]> {
	const provider = assertProvider(process.env.EMBEDDING_PROVIDER);
	const useRetry = options.retry ?? provider !== "none";

	let embedding: number[];

	switch (provider) {
		case "lmstudio": {
			const call = () => callLMStudio(text, options.signal);
			embedding = useRetry
				? await withRetry(call, "LM Studio embedding")
				: await call();
			break;
		}
		case "openai": {
			const call = () => callOpenAI(text, options.signal);
			embedding = useRetry
				? await withRetry(call, "OpenAI embedding")
				: await call();
			break;
		}
		case "none":
			embedding = deterministicEmbedding(text);
			break;
		default: {
			const exhaustive: never = provider;
			throw new Error(`Unknown EMBEDDING_PROVIDER: ${String(exhaustive)}`);
		}
	}

	assertDimension(embedding, provider);
	return embedding;
}

/**
 * Batch-embed an array of texts with bounded concurrency.
 *
 * Results preserve input order. Any single failure aborts the whole batch
 * (`Promise.all` semantics) — the caller decides whether to retry or skip.
 * `undefined` slots are rejected eagerly rather than passed to the provider.
 */
export async function generateEmbeddings(
	texts: readonly string[],
	options: EmbeddingOptions & { concurrency?: number } = {}
): Promise<number[][]> {
	if (texts.length === 0) return [];

	const concurrency = Math.max(
		1,
		Math.min(options.concurrency ?? 4, texts.length)
	);
	const results: Array<number[] | undefined> = Array.from({
		length: texts.length
	});
	let cursor = 0;
	const worker = async (): Promise<void> => {
		while (true) {
			const i = cursor++;
			if (i >= texts.length) return;

			const text = texts[i];
			if (typeof text !== "string") {
				throw new Error(`generateEmbeddings: texts[${i}] is not a string`);
			}

			// Add 'await' here
			results[i] = await generateEmbedding(text, options);
		}
	};

	await Promise.all(Array.from({ length: concurrency }, worker));

	// Every slot is populated: workers only return once `cursor >= texts.length`
	// and the loop above throws on any invalid slot.
	return results as number[][];
}

function assertDimension(
	embedding: number[],
	provider: EmbeddingProvider
): void {
	if (embedding.length !== embeddingDimension()) {
		throw new Error(
			`Embedding dimension mismatch: provider "${provider}" returned ${embedding.length}, ` +
				`schema expects ${process.env.EMBEDDING_DIMENSION}. ` +
				"Update EMBEDDING_DIMENSION or change EMBEDDING_PROVIDER / model."
		);
	}
	if (embedding.some(v => !Number.isFinite(v))) {
		throw new Error(
			`Provider "${provider}" returned a non-finite embedding value`
		);
	}
}

// ============================================================================
// Utilities (public, kept for callers that previously imported them)
// ============================================================================

/** Cosine similarity between two unit-length vectors (i.e. their dot product). */
export function calculateCosineSimilarity(
	a: readonly number[],
	b: readonly number[]
): number {
	if (a.length !== b.length) {
		throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
	}
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i += 1) {
		const av = a[i] ?? 0;
		const bv = b[i] ?? 0;
		dot += av * bv;
		normA += av * av;
		normB += bv * bv;
	}
	const denom = Math.sqrt(normA) * Math.sqrt(normB);
	return denom === 0 ? 0 : dot / denom;
}

/** Euclidean distance between two vectors. */
export function calculateEuclideanDistance(
	a: readonly number[],
	b: readonly number[]
): number {
	if (a.length !== b.length) {
		throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
	}
	let sum = 0;
	for (let i = 0; i < a.length; i += 1) {
		const d = (a[i] ?? 0) - (b[i] ?? 0);
		sum += d * d;
	}
	return Math.sqrt(sum);
}
