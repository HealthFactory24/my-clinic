// oxlint-disable-next-line import/no-unassigned-import
import "@tanstack/react-start/server-only";
import { and, count, SQL } from "drizzle-orm";

import { db, withTransaction } from "./server";

export * from "./server";

// Standard Drizzle Query Utilities
// src/lib/db/index.ts
import "@tanstack/react-start/server-only";

import {
	appointments,
	auditLogs,
	clinics,
	encounters,
	growthMeasurements,
	guardians,
	immunizations,
	labOrders,
	medicalRecords,
	patientAllergies,
	patientChronicConditions,
	patients,
	prescriptions,
	staff,
	vitals,
	whoGrowthData
} from "./schema";
import {
	account,
	session,
	twoFactor,
	user,
	verification
} from "./schema/auth.schema";

// ─── Table registry ────────────────────────────────────────────────────────

/**
 * Every table that participates in export/import/reset. Order matters only
 * for readability; the FK graph is respected by the schema itself, not by
 * iteration order — `importAllTables` runs inside a single transaction and
 * `DELETE` cascades resolve dependencies.
 */
export const dbTableMap = {
	user,
	session,
	account,
	verification,
	twoFactor,
	clinics,
	staff,
	patients,
	guardians,
	patientAllergies,
	patientChronicConditions,
	encounters,
	vitals,
	growthMeasurements,
	immunizations,
	prescriptions,
	appointments,
	labOrders,
	medicalRecords,
	auditLogs,
	whoGrowthData
} as const;

export const TABLES = Object.keys(dbTableMap) as Array<keyof typeof dbTableMap>;
export type TableName = keyof typeof dbTableMap;
// Re-export common Drizzle utilities for convenience
export { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";

export async function getTableCounts(): Promise<Record<TableName, number>> {
	const out: Partial<Record<TableName, number>> = {};
	for (const table of TABLES) {
		// ← TABLES not imported or defined
		const [row] = await db.select({ count: count() }).from(dbTableMap[table]); // ← dbTableMap not imported or defined
		out[table] = row?.count ?? 0;
	}
	return out as Record<TableName, number>;
}

export async function exportTable(table: TableName): Promise<unknown[]> {
	return await db.select().from(dbTableMap[table]);
}
export async function exportAllTables() {
	const out: Partial<Record<TableName, unknown[]>> = {};
	for (const table of TABLES) {
		out[table] = await exportTable(table);
	}
	return out;
}
export async function importAllTables(
	tables: Partial<Record<TableName, unknown[]>>
): Promise<void> {
	await withTransaction(async tx => {
		for (const table of TABLES) {
			const rows = tables[table];
			if (rows === undefined) continue;
			const tableDef = dbTableMap[table];
			// Cast once at the boundary; drizzle's `.values()` accepts unknown[] at runtime
			// but wants the inferred insert type. The cast documents that we trust the
			// backup file (validated earlier by `validateBackupFile` in DatabaseSettings).
			await tx.delete(tableDef);
			if (rows.length > 0) {
				const CHUNK = 500;
				for (let i = 0; i < rows.length; i += CHUNK) {
					// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- validated by caller
					await tx.insert(tableDef).values(rows.slice(i, i + CHUNK) as never);
				}
			}
		}
	});
}

export async function clearAllTables(): Promise<void> {
	await db.transaction(async tx => {
		for (const table of TABLES) {
			await tx.delete(dbTableMap[table]);
		}
	});
}
export function combineConditions(
	conditions: Array<SQL | undefined>
): SQL | undefined {
	const validConditions = conditions.filter(
		(cond): cond is SQL => cond !== null && cond !== void 0
	);
	return validConditions.length > 0 ? and(...validConditions) : void 0;
}

export function readCount(
	rows: ReadonlyArray<Record<string, unknown>> | undefined
): number {
	return Number(rows?.[0]?.count ?? 0);
}
