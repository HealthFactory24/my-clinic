// scripts/seed-who-growth-data.ts

import * as fs from "node:fs";
import * as path from "node:path";

import { sql } from "drizzle-orm";

import { type NewWHOGrowthData, whoGrowthData } from "#/lib/db/schema/index.ts";
import { db } from "#/lib/db/server.ts";
export const DAY_COLUMN_REGEX = /^day$/i;
export const L_COLUMN_REGEX = /^L$/i;
export const M_COLUMN_REGEX = /^M$/i;
export const S_COLUMN_REGEX = /^S$/i;

// ============================================================
// Types
// ============================================================

interface ExcelRow {
	Day: number;
	L: number;
	M: number;
	S: number;
	SD0: number;
	SD1: number;
	SD1neg: number;
	SD2: number;
	SD2neg: number;
	SD3: number;
	SD3neg: number;
	SD4: number;
	SD4neg: number;
}

interface GrowthDataSet {
	data: Array<ExcelRow>;
	gender: "male" | "female";
	type: "weight" | "height";
}

// ============================================================
// File Configuration
// ============================================================

const DATA_FILES = {
	weight: {
		male: "wfa-boys-zscore-expanded-tables.xlsx",
		female: "wfa-girls-zscore-expanded-tables.xlsx"
	},
	height: {
		male: "lhfa-boys-zscore-expanded-tables.xlsx",
		female: "lhfa-girls-zscore-expanded-tables.xlsx"
	}
} as const;

// ============================================================
// Helper Functions
// ============================================================

function getColumnValue(
	row: Record<string, unknown>,
	...keys: Array<string>
): number {
	for (const key of keys) {
		const value = row[key];
		if (value !== undefined && value !== null) {
			const num = Number(value);
			if (!Number.isNaN(num)) return num;
		}
	}
	return Number.NaN;
}

function detectColumnHeaders(headers: Array<string>): {
	dayCol: string;
	lCol: string;
	mCol: string;
	sCol: string;
	sdCols: Record<string, string>;
} {
	// Find columns by name
	let dayCol = headers.find(h => DAY_COLUMN_REGEX.test(h) || h === "A");
	let lCol = headers.find(h => L_COLUMN_REGEX.test(h) || h === "B");
	let mCol = headers.find(h => M_COLUMN_REGEX.test(h) || h === "C");
	let sCol = headers.find(h => S_COLUMN_REGEX.test(h) || h === "D");

	// If not found, use position
	if (!dayCol) dayCol = headers[0] || "Day";
	if (!lCol) lCol = headers[1] || "L";
	if (!mCol) mCol = headers[2] || "M";
	if (!sCol) sCol = headers[3] || "S";

	// Find SD columns
	const sdCols: Record<string, string> = {};
	const sdPatterns = [
		{ key: "SD4neg", patterns: ["SD4neg", "E"] },
		{ key: "SD3neg", patterns: ["SD3neg", "F"] },
		{ key: "SD2neg", patterns: ["SD2neg", "G"] },
		{ key: "SD1neg", patterns: ["SD1neg", "H"] },
		{ key: "SD0", patterns: ["SD0", "I"] },
		{ key: "SD1", patterns: ["SD1", "J"] },
		{ key: "SD2", patterns: ["SD2", "K"] },
		{ key: "SD3", patterns: ["SD3", "L"] },
		{ key: "SD4", patterns: ["SD4", "M"] }
	];

	for (const { key, patterns } of sdPatterns) {
		const found = headers.find(h =>
			patterns.some(p => h === p || h.toLowerCase() === p.toLowerCase())
		);
		sdCols[key] = found || key;
	}

	return { dayCol, lCol, mCol, sCol, sdCols };
}

async function readExcelFile(filePath: string): Promise<Array<ExcelRow>> {
	console.log(`  📖 Reading: ${path.basename(filePath)}`);

	const rows: Array<ExcelRow> = [];

	try {
		// Dynamically import xlsx — handle both CJS and ESM shapes
		const xlsxModule = await import("xlsx");
		const XLSX = xlsxModule.default ?? xlsxModule;

		// Read the file using fs + XLSX.read (readFile isn't always exposed on ESM namespace)
		const fileBuffer = fs.readFileSync(filePath);
		const workbook = XLSX.read(fileBuffer, { type: "buffer" });

		const [sheetName] = workbook.SheetNames;
		if (!sheetName) {
			throw new Error(`No worksheets found in ${path.basename(filePath)}`);
		}

		const sheet = workbook.Sheets[sheetName];
		if (!sheet) {
			throw new Error(`Worksheet not found: ${sheetName}`);
		}
		// Convert to JSON
		const jsonData = XLSX.utils.sheet_to_json(sheet, {
			defval: "",
			raw: true
		}) as Array<Record<string, unknown>>;

		if (jsonData.length === 0) {
			console.warn(`  ⚠️ No data found in ${path.basename(filePath)}`);
			return rows;
		}

		// Get headers
		const [firstRow] = jsonData;
		if (!firstRow) {
			console.warn(`  ⚠️ No data found in ${path.basename(filePath)}`);
			return rows;
		}

		const headers = Object.keys(firstRow);
		console.log(`  📋 Headers: ${headers.slice(0, 5).join(", ")}...`);

		// Detect columns
		const { dayCol, lCol, mCol, sCol, sdCols } = detectColumnHeaders(headers);
		console.log(
			`  📍 Using columns: Day=${dayCol}, L=${lCol}, M=${mCol}, S=${sCol}`
		);

		// Process rows
		let validCount = 0;
		for (const row of jsonData) {
			const day = getColumnValue(row, dayCol, "Day", "day", "A");
			const L = getColumnValue(row, lCol, "L", "B");
			const M = getColumnValue(row, mCol, "M", "C");
			const S = getColumnValue(row, sCol, "S", "D");

			if (
				!(
					sdCols["SD4neg"] &&
					sdCols["SD3neg"] &&
					sdCols["SD2neg"] &&
					sdCols["SD1neg"] &&
					sdCols["SD0"] &&
					sdCols["SD1"] &&
					sdCols["SD2"] &&
					sdCols["SD3"] &&
					sdCols["SD4"]
				)
			) {
				console.warn(`  ⚠️ Missing SD columns in ${path.basename(filePath)}`);
				continue;
			}
			const sd4neg = getColumnValue(row, sdCols["SD4neg"], "SD4neg", "E");
			const sd3neg = getColumnValue(row, sdCols["SD3neg"], "SD3neg", "F");
			const sd2neg = getColumnValue(row, sdCols["SD2neg"], "SD2neg", "G");
			const sd1neg = getColumnValue(row, sdCols["SD1neg"], "SD1neg", "H");
			const sd0 = getColumnValue(row, sdCols["SD0"], "SD0", "I");
			const sd1 = getColumnValue(row, sdCols["SD1"], "SD1", "J");
			const sd2 = getColumnValue(row, sdCols["SD2"], "SD2", "K");
			const sd3 = getColumnValue(row, sdCols["SD3"], "SD3", "L");
			const sd4 = getColumnValue(row, sdCols["SD4"], "SD4", "M");

			// Skip invalid rows
			if (
				Number.isNaN(day) ||
				Number.isNaN(L) ||
				Number.isNaN(M) ||
				Number.isNaN(S) ||
				Number.isNaN(sd0)
			) {
				continue;
			}

			rows.push({
				Day: day,
				L,
				M,
				S,
				SD4neg: Number.isNaN(sd4neg) ? 0 : sd4neg,
				SD3neg: Number.isNaN(sd3neg) ? 0 : sd3neg,
				SD2neg: Number.isNaN(sd2neg) ? 0 : sd2neg,
				SD1neg: Number.isNaN(sd1neg) ? 0 : sd1neg,
				SD0: sd0,
				SD1: Number.isNaN(sd1) ? 0 : sd1,
				SD2: Number.isNaN(sd2) ? 0 : sd2,
				SD3: Number.isNaN(sd3) ? 0 : sd3,
				SD4: Number.isNaN(sd4) ? 0 : sd4
			});
			validCount += 1;
		}

		console.log(
			`  ✅ Parsed ${validCount} valid rows from ${path.basename(filePath)}`
		);
		return rows;
	} catch (error) {
		console.error(`  ❌ Error reading ${path.basename(filePath)}:`, error);
		return rows;
	}
}

async function processDataFilesAsync(
	baseDir: string
): Promise<Array<GrowthDataSet>> {
	const results: Array<GrowthDataSet> = [];

	for (const [type, genderMap] of Object.entries(DATA_FILES)) {
		for (const [gender, filename] of Object.entries(genderMap)) {
			const filePath = path.join(baseDir, filename);

			if (!fs.existsSync(filePath)) {
				console.warn(`  ⚠️ File not found: ${filePath}`);
				continue;
			}

			const data = await readExcelFile(filePath);
			if (data.length > 0) {
				results.push({
					type: type as "weight" | "height",
					gender: gender as "male" | "female",
					data
				});
			}
		}
	}

	return results;
}

async function truncateWhoGrowthData() {
	console.log("  🗑️ Clearing existing WHO growth data...");
	await db.delete(whoGrowthData);
	console.log("  ✅ Cleared existing data");
}

function prepareInsertData(dataset: GrowthDataSet): Array<NewWHOGrowthData> {
	const { type, gender, data } = dataset;
	const byAge = new Map<number, NewWHOGrowthData>();

	for (const row of data) {
		const ageMonths = row.Day / 30.44;
		const normalizedAgeMonths = Math.round(ageMonths * 10) / 10;

		// The database intentionally stores one reference point per 0.1 month.
		// WHO spreadsheets contain daily rows, so retain the earliest row in each bucket.
		if (byAge.has(normalizedAgeMonths)) continue;

		byAge.set(normalizedAgeMonths, {
			id: `who_${gender}_${type}_${row.Day}`,
			gender,
			metricType: type,
			ageDays: row.Day,
			ageMonths: normalizedAgeMonths,
			L: row.L,
			M: row.M,
			S: row.S,
			sd4neg: row.SD4neg,
			sd3neg: row.SD3neg,
			sd2neg: row.SD2neg,
			sd1neg: row.SD1neg,
			sd0: row.SD0,
			sd1: row.SD1,
			sd2: row.SD2,
			sd3: row.SD3,
			sd4: row.SD4,
			dataSource: "WHO",
			version: "2006",
			createdAt: new Date(),
			updatedAt: new Date()
		});
	}

	const results = [...byAge.values()];
	const skipped = data.length - results.length;
	if (skipped > 0) {
		console.log(
			`  ℹ️ Collapsed ${skipped} daily rows into ${results.length} unique age buckets`
		);
	}

	return results;
}

async function batchInsert(data: Array<NewWHOGrowthData>, batchSize = 1000) {
	const total = data.length;
	let inserted = 0;

	for (let i = 0; i < total; i += batchSize) {
		const batch = data.slice(i, i + batchSize);
		await db.insert(whoGrowthData).values(batch);
		inserted += batch.length;
		console.log(`  📥 Inserted ${inserted}/${total} records`);
	}
}

// ============================================================
// Main Seed Function
// ============================================================

export async function seedWHOGrowthData(dataDir?: string) {
	console.log("\n🌱 Seeding WHO Growth Data...\n");

	// Determine data directory
	const baseDir = dataDir || path.join(process.cwd(), "data");
	console.log(`📁 Data directory: ${baseDir}`);

	// Check if directory exists
	if (!fs.existsSync(baseDir)) {
		console.error(`❌ Data directory not found: ${baseDir}`);
		console.log(
			"\n📋 Please create the data directory and place the Excel files there:"
		);
		for (const [type, genderMap] of Object.entries(DATA_FILES)) {
			for (const [gender, filename] of Object.entries(genderMap)) {
				console.log(`   - ${filename} (${gender} ${type})`);
			}
		}
		throw new Error(`WHO data directory not found: ${baseDir}`);
	}

	// Process files asynchronously
	console.log("\n📊 Processing Excel files...");
	const datasets = await processDataFilesAsync(baseDir);

	if (datasets.length === 0) {
		console.error("❌ No data was parsed. Please check your Excel files.");
		console.log("\n📋 Required files:");
		for (const [type, genderMap] of Object.entries(DATA_FILES)) {
			for (const [gender, filename] of Object.entries(genderMap)) {
				console.log(`   - ${filename} (${gender} ${type})`);
			}
		}
		console.log(`\n💡 Place the files in: ${baseDir}`);
		throw new Error("No WHO growth datasets were parsed");
	}

	console.log(`\n✅ Processed ${datasets.length} datasets:`);
	for (const ds of datasets) {
		console.log(`   - ${ds.gender} ${ds.type}: ${ds.data.length} records`);
	}

	// Clear existing data
	console.log("\n🗑️ Preparing database...");
	await truncateWhoGrowthData();

	// Insert data
	console.log("\n📥 Inserting data into database...");
	let totalRecords = 0;

	for (const dataset of datasets) {
		console.log(`\n  💉 Inserting ${dataset.gender} ${dataset.type}...`);
		const insertData = prepareInsertData(dataset);
		await batchInsert(insertData);
		totalRecords += insertData.length;
	}

	console.log("\n✅ Seeding complete!");
	console.log(`📊 Total records inserted: ${totalRecords}`);
	console.log("\n📈 Summary:");
	for (const ds of datasets) {
		console.log(`   - WHO ${ds.gender} ${ds.type}: ${ds.data.length} records`);
	}

	// Verify the data
	console.log("\n🔍 Verifying data...");
	const count = await db
		.select({ count: sql<number>`count(*)` })
		.from(whoGrowthData);
	console.log(`   Total records in database: ${count[0]?.count || 0}`);

	// Show sample data
	console.log("\n📋 Sample data:");
	const sample = await db.select().from(whoGrowthData).limit(3);
	for (const row of sample) {
		console.log(
			`   - ${row.gender} ${row.metricType} @ ${row.ageDays} days: M=${row.M}, S=${row.S}, L=${row.L}`
		);
	}
}

// ============================================================
// Run if called directly
// ============================================================

if (import.meta.url === `file://${process.argv[1]}`) {
	const dataDir = process.argv[2] || path.join(process.cwd(), "data");

	seedWHOGrowthData(dataDir)
		.then(() => {
			console.log("\n✅ Done!");
			process.exit(0);
		})
		.catch(error => {
			console.error("\n❌ Error:", error);
			process.exit(1);
		});
}
