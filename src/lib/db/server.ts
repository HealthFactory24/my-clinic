// src/lib/db/server.ts
import "@tanstack/react-start/server-only";
import "dotenv/config";

import { SQL } from "bun";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";

import { authRelations } from "#/lib/db/schema/auth.schema.ts";
import { relations } from "#/lib/db/schema/relations.ts";

import { preparedQueries, queryCache } from "./cache";

const isProduction = process.env.NODE_ENV === "production";

// ─────────────────────────────────────────────────────────────────────────────
// Connection
// ─────────────────────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is required (check .env)");
}

const client = new SQL(DATABASE_URL, {
	max: isProduction ? 20 : 10,
	idleTimeout: 20, // seconds (bun-sql uses seconds, not ms)
	connectionTimeout: 5, // seconds
	maxLifetime: 60 * 30 // seconds
});

export const db = drizzle({
	client,
	relations: { ...relations, ...authRelations },
	logger: isProduction
		? false
		: {
				logQuery(query, params) {
					console.debug({ query, params }, "🐘 drizzle query");
				}
			}
});

export function createDb() {
	return db;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type DB = typeof db;
export type Transaction = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DBorTx = DB | Transaction;

// ─────────────────────────────────────────────────────────────────────────────
// Readiness
// ─────────────────────────────────────────────────────────────────────────────
export async function checkIsDbReady(): Promise<boolean> {
	try {
		await db.execute(sql`SELECT 1`);
		return true;
	} catch (error) {
		console.error({ err: error }, "❌ Database readiness check failed");
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Shutdown
// ─────────────────────────────────────────────────────────────────────────────
let isClosed = false;

export async function closeConnection(): Promise<void> {
	if (isClosed) return;
	isClosed = true;

	try {
		await client.end({ timeout: 5 });
		queryCache.clear();
		preparedQueries.clear();
		console.warn("✅ Database connection closed");
	} catch (error) {
		console.error({ err: error }, "❌ Error closing database connection");
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────────────────────
type QueryOptions = {
	accessMode?: "read only" | "read write";
	isolationLevel?:
		| "read uncommitted"
		| "read committed"
		| "repeatable read"
		| "serializable";
	maxRetries?: number;
};

const RETRYABLE_PG_CODES = new Set(["40001", "40P01", "55P03"]);

function isRetryableTxError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const code = (error as { code?: unknown }).code;
	return typeof code === "string" && RETRYABLE_PG_CODES.has(code);
}

export async function withTransaction<T>(
	fn: (tx: Transaction) => Promise<T>,
	options: QueryOptions = {}
): Promise<T> {
	const { maxRetries = 2, ...txOptions } = options;

	const run = () => {
		const hasTxOptions =
			txOptions.isolationLevel !== undefined ||
			txOptions.accessMode !== undefined;
		return hasTxOptions ? db.transaction(fn, txOptions) : db.transaction(fn);
	};

	let attempt = 0;
	while (true) {
		try {
			return await run();
		} catch (error) {
			if (attempt >= maxRetries || !isRetryableTxError(error)) throw error;
			attempt += 1;
			const delay = 50 * 2 ** (attempt - 1) + Math.random() * 50;
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
}

export async function runWithDb<T>(
	fn: (executor: DBorTx) => Promise<T>,
	options?: QueryOptions
): Promise<T> {
	const hasTxOptions =
		options?.isolationLevel !== undefined || options?.accessMode !== undefined;

	if (hasTxOptions) {
		return withTransaction(async tx => fn(tx), options);
	}
	return fn(db);
}

export { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";
