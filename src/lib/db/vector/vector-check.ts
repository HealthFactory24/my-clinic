// src/lib/db/vector/vector-check.ts
//
// Diagnostic CLI. Prints pgvector status, vector columns, and vector indexes.
//
// Usage:
//   vpx tsx --env-file=.env src/lib/db/vector/vector-check.ts

import process from "node:process";
import { pathToFileURL } from "node:url";

import { sql } from "drizzle-orm";

import { db } from "../";
import { closeConnection } from "../index";
import { asArray, errorMessage } from "./_internal";
import {
	checkVectorCapabilities,
	getVectorExtensionInfo,
	reportVectorCapabilities
} from "./setup-vector-extension";

// ─────────────────────────────────────────────────────────────────────────────
// Report sections
// ─────────────────────────────────────────────────────────────────────────────

async function reportExtensionStatus(): Promise<boolean> {
	const info = await getVectorExtensionInfo();

	if (!info.exists) {
		console.log("❌ pgvector extension is not installed\n");
		console.log("To enable it, run:");
		console.log("   bun vector:setup\n");
		return false;
	}

	console.log(`📦 pgvector: enabled (version: ${info.version ?? "unknown"})`);

	const caps = await checkVectorCapabilities();
	reportVectorCapabilities(caps);

	if (!caps.vectorOps) {
		console.log(
			"\n❌ pgvector is installed but operator classes are not working. " +
				"Re-run `bun vector:setup` to repair the installation."
		);
		return false;
	}

	return true;
}

async function reportVectorColumns(): Promise<void> {
	const result = await db.execute<{
		table_name: string;
		column_name: string;
	}>(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE data_type = 'vector'
    ORDER BY table_name, column_name
  `);

	const rows = asArray<{ table_name: string; column_name: string }>(result);

	if (rows.length === 0) {
		console.log("\n📊 No tables with vector columns found.");
		return;
	}

	const byTable = new Map<string, string[]>();
	for (const row of rows) {
		const list = byTable.get(row.table_name) ?? [];
		list.push(row.column_name);
		byTable.set(row.table_name, list);
	}

	console.log("\n📊 Tables with vector columns:");
	for (const [table, columns] of byTable) {
		console.log(`   • ${table} (${columns.join(", ")})`);
	}
}

async function reportVectorIndexes(): Promise<void> {
	const result = await db.execute<{
		index_name: string;
		table_name: string;
		method: string;
	}>(sql`
    SELECT
      i.relname AS index_name,
      t.relname AS table_name,
      am.amname AS method
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_am am ON am.oid = i.relam
    WHERE am.amname IN ('hnsw', 'ivfflat')
    ORDER BY t.relname, i.relname
  `);

	const rows = asArray<{
		index_name: string;
		table_name: string;
		method: string;
	}>(result);

	if (rows.length === 0) {
		console.log("\n🔍 No vector indexes found.");
		return;
	}

	console.log("\n🔍 Vector indexes:");
	for (const row of rows) {
		console.log(`   • ${row.index_name} on ${row.table_name} (${row.method})`);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry
// ─────────────────────────────────────────────────────────────────────────────

async function checkVectorExtension(): Promise<void> {
	console.log("🔍 Checking vector extension status...\n");

	const ready = await reportExtensionStatus();

	// Column and index scans are only meaningful when the extension is
	// installed and the `vector` type is visible.
	if (ready) {
		await reportVectorColumns();
		await reportVectorIndexes();
	}
}

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
		await checkVectorExtension();
		await closeConnection();
		process.exit(0);
	} catch (error) {
		console.error(
			`\n❌ Error checking vector extension: ${errorMessage(error)}`
		);
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
