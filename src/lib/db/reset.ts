// src/lib/db/reset.ts
import { sql } from "drizzle-orm";

import { closeConnection, db } from "./index";

interface ResetOptions {
	force?: boolean;
	/**
	 * Close the shared connection when done.
	 *
	 * Defaults to `true` when this file is the process entry point
	 * (`bun src/lib/db/reset.ts`), `false` when it's imported as a library
	 * so the caller keeps its `db` handle usable.
	 */
	closeAfter?: boolean;
}

/**
 * Reset the local Postgres database.
 *
 * Drops and recreates the `public` schema. The DROP runs outside a
 * transaction because `DROP SCHEMA ... CASCADE` inside a transaction can
 * deadlock against other open connections, and because we want the reset
 * to be atomic per-statement rather than all-or-nothing.
 */
export async function resetDatabase(options: ResetOptions = {}): Promise<void> {
	const isMain = import.meta.main;
	const { force = false, closeAfter = isMain } = options;

	if (process.env.NODE_ENV === "production" && !force) {
		throw new Error(
			"❌ Refusing to reset database in a production environment " +
				"without explicit { force: true }."
		);
	}

	console.warn("⚠️  Resetting PostgreSQL database...");

	try {
		console.info("🗑️  Dropping schema public...");
		// Run these WITHOUT a wrapping transaction. Each is idempotent.
		await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE;`);
		await db.execute(sql`CREATE SCHEMA IF NOT EXISTS public;`);
		await db.execute(sql`GRANT ALL ON SCHEMA public TO public;`);

		console.info("🔌 Re-enabling extensions...");
		// pgcrypto is safe to install; pgvector is best-effort (the orchestrator
		// runs setup-vector-extension.ts separately with a clearer error).
		await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
		await db
			.execute(sql`CREATE EXTENSION IF NOT EXISTS "vector";`)
			.catch(() => {
				console.warn(
					"⚠️  Could not enable pgvector — run `bun vector:setup` after this " +
						"finishes. The orchestrator does this for you in `bun fresh`."
				);
			});

		console.info("✅ Database reset successful.");
	} catch (error) {
		console.error("❌ Critical error during database reset:", error);
		throw error;
	} finally {
		if (closeAfter) await closeConnection();
	}
} // ← the missing brace

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

if (import.meta.main) {
	const force = process.argv.includes("--force") || process.argv.includes("-f");

	resetDatabase({ force })
		.then(() => {
			console.log("✅ Done!");
			process.exit(0);
		})
		.catch(error => {
			console.error("❌ Reset failed:", error);
			process.exit(1);
		});
}
