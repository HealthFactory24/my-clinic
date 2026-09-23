// src/scripts/fresh.ts
//
// One-command fresh start for local Postgres.
//
// Pipeline:
//   1. reset schema          DROP + recreate public, re-create pgcrypto
//   2. enable pgvector       CREATE EXTENSION vector + helper functions
//   3. push schema           drizzle-kit push
//   4. seed admin            clinic + admin user + staff profile
//   5. seed WHO              WHO growth reference data
//   6. seed app              demo patients, appointments, encounters, …
//   7. verify                row counts + Postgres/pgvector versions
//
// See `--help` for flags. See `--print-paths` for script resolution.
// Refuses to run when NODE_ENV=production unless --force is passed.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { env } from "../env/server";
import {
	abs,
	type DbTarget,
	firstExisting,
	fmtMs,
	PROJECT_ROOT,
	paint,
	type ReportInput,
	type RunContext,
	relToRoot,
	renderReport,
	type Step,
	type StepName,
	type StepResult,
	writeReportFiles
} from "./report";

// ═══════════════════════════════════════════════════════════════════════════
// 0. Self
//
// `report.ts` exports its own SELF_REL, which points at report.ts. Every
// hint and `--print-paths` output must use the *orchestrator's* path, so
// we compute it here and pass it into ReportInput.
// ═══════════════════════════════════════════════════════════════════════════

const SELF_PATH = fileURLToPath(import.meta.url);
const SELF_REL = relToRoot(SELF_PATH);

// ═══════════════════════════════════════════════════════════════════════════
// 1. Terminal output
// ═══════════════════════════════════════════════════════════════════════════

const log = (step: string, msg: string): void =>
	console.log(`\n${paint("cyan", step)} ${paint("bold", msg)}`);

function fail(msg: string): never {
	console.error(`\n${paint("red", "❌")} ${msg}`);
	process.exit(1);
}

const warn = (msg: string): void => console.warn(paint("yellow", `⚠️  ${msg}`));

// ═══════════════════════════════════════════════════════════════════════════
// 2. CLI flags
// ═══════════════════════════════════════════════════════════════════════════

const argv = process.argv.slice(2);

const flag = (name: string): boolean =>
	argv.includes(`--${name}`) || argv.includes(`-${name[0]}`);

function option(name: string): string | undefined {
	const prefixed = argv.find(a => a.startsWith(`--${name}=`));
	if (prefixed) return prefixed.slice(name.length + 3);
	const idx = argv.indexOf(`--${name}`);
	const next = idx >= 0 ? argv[idx + 1] : undefined;
	return next && !next.startsWith("--") ? next : undefined;
}

const FLAGS = {
	force: flag("force"),
	dryRun: flag("dry-run"),
	skipWho: flag("skip-who"),
	skipApp: flag("skip-app"),
	skipSchemaPush: flag("skip-schema-push"),
	printPaths: flag("print-paths"),
	help: flag("help") || flag("h"),
	from: option("from"),
	only: option("only"),
	jsonReport: flag("json-report"),
	noReport: flag("no-report")
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 3. Script registry
// ═══════════════════════════════════════════════════════════════════════════

type ScriptKey = "push" | "setupVector" | "seedAdmin" | "seedWho" | "seedApp";

const SCRIPT_CANDIDATES: Record<ScriptKey, readonly string[]> = {
	push: ["src/scripts/push.ts", "src/db/push.ts"],
	setupVector: [
		"src/lib/db/vector/setup-vector-extension.ts",
		"src/db/vector/setup-vector-extension.ts"
	],
	seedAdmin: [
		"src/scripts/admin.ts",
		"src/lib/auth/admin.ts",
		"src/db/admin.ts"
	],
	seedWho: ["src/scripts/seed-who.ts", "src/db/seed-who.ts"],
	seedApp: ["src/scripts/seed.ts", "src/db/seed.ts"]
};

const SCRIPT_PATHS: Record<ScriptKey, string | undefined> = {
	push: firstExisting(...SCRIPT_CANDIDATES.push),
	setupVector: firstExisting(...SCRIPT_CANDIDATES.setupVector),
	seedAdmin: firstExisting(...SCRIPT_CANDIDATES.seedAdmin),
	seedWho: firstExisting(...SCRIPT_CANDIDATES.seedWho),
	seedApp: firstExisting(...SCRIPT_CANDIDATES.seedApp)
};

function requireScript(key: ScriptKey): string {
	const path = SCRIPT_PATHS[key];
	if (path) return path;
	fail(
		`Missing required script "${key}".\n` +
			"  Looked for:\n" +
			SCRIPT_CANDIDATES[key].map(c => `    • ${c}`).join("\n") +
			`\n  Project root: ${PROJECT_ROOT}`
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Child processes
// ═══════════════════════════════════════════════════════════════════════════

const CHILD_TIMEOUT_MS = 10 * 60 * 1000;

/** Children spawned by `run()`, so a signal handler can kill them all. */
const liveChildren = new Set<ReturnType<typeof spawn>>();

function run(command: string, args: readonly string[]): Promise<void> {
	return new Promise((resolvePromise, reject) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			shell: false,
			cwd: PROJECT_ROOT,
			env: { ...process.env, FORCE_COLOR: "1" },
			timeout: CHILD_TIMEOUT_MS
		});

		liveChildren.add(child);

		child.on("error", err => {
			liveChildren.delete(child);
			reject(err);
		});
		child.on("exit", (code, signal) => {
			liveChildren.delete(child);
			if (code === 0) return resolvePromise();
			if (signal) return reject(new Error(`${command} killed by ${signal}`));
			reject(
				new Error(`${command} ${args.join(" ")} exited with code ${code}`)
			);
		});
	});
}

const runBunScript = (scriptPath: string): Promise<void> =>
	run("bun", ["--env-file=.env", scriptPath]);

// ═══════════════════════════════════════════════════════════════════════════
// 5. Environment guard
// ═══════════════════════════════════════════════════════════════════════════

const REQUIRED_ENV = [
	"DATABASE_URL",
	"BETTER_AUTH_SECRET",
	"VITE_BASE_URL"
] as const;

function assertEnvironment(): DbTarget {
	const missing = REQUIRED_ENV.filter(k => !process.env[k]);
	if (missing.length > 0) {
		fail(
			`Missing required env vars: ${missing.join(", ")}\n` +
				`  Check ${relToRoot(abs(".env"))}`
		);
	}

	const url = env.DATABASE_URL;
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		fail(`DATABASE_URL is not a valid URL: ${url}`);
	}

	if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
		fail("DATABASE_URL must be a postgres:// or postgresql:// URL");
	}

	const name = parsed.pathname.replace(/^\//, "");
	if (!name) fail("DATABASE_URL has no database name");

	const isLocal = /^(localhost|127\.0\.0\.1|::1|host\.docker\.internal)$/.test(
		parsed.hostname
	);
	const looksProd = /prod|staging|live/i.test(name + parsed.hostname);

	if (!FLAGS.force && !isLocal) {
		fail(
			`DATABASE_URL host "${parsed.hostname}" is not local.\n` +
				"  Refusing to wipe without --force."
		);
	}
	if (!FLAGS.force && looksProd) {
		fail(
			`DATABASE_URL looks like production/staging ("${name}").\n` +
				"  Refusing to wipe without --force."
		);
	}

	console.log(`✅ Env OK ${paint("dim", `(${parsed.hostname}/${name})`)}`);
	return { host: parsed.hostname, name };
}

async function confirm(question: string): Promise<void> {
	if (FLAGS.force) {
		console.log(paint("dim", "⏭️  --force passed, skipping confirmation"));
		return;
	}
	if (!process.stdin.isTTY) {
		fail("Non-interactive shell and no --force flag. Refusing to wipe DB.");
	}

	const readline = await import("node:readline/promises");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	const answer = await rl.question(`${question} ${paint("dim", "[y/N]")} `);
	rl.close();

	if (answer.trim().toLowerCase() !== "y") {
		console.log("Aborted.");
		process.exit(0);
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Concurrency lock + signal handling
// ═══════════════════════════════════════════════════════════════════════════

const LOCK_PATH = abs(".fresh-start.lock");

function killLiveChildren(signal: NodeJS.Signals): void {
	for (const child of liveChildren) {
		try {
			child.kill(signal);
		} catch {
			/* already gone */
		}
	}
}

async function acquireLock(): Promise<() => void> {
	if (existsSync(LOCK_PATH)) {
		fail(
			"Another fresh-start appears to be running.\n" +
				`  If that's wrong, delete ${LOCK_PATH} and retry.`
		);
	}

	await writeFile(LOCK_PATH, String(process.pid), "utf8");

	const { unlinkSync, existsSync: fsExists } = await import("node:fs");
	let released = false;

	const release = (): void => {
		if (released) return;
		released = true;
		try {
			if (fsExists(LOCK_PATH)) unlinkSync(LOCK_PATH);
		} catch {
			/* best-effort */
		}
	};

	process.once("exit", release);

	// Kill children first so a Ctrl-C doesn't leave a drizzle-kit push running
	// against a database the parent is about to abort.
	process.once("SIGINT", () => {
		killLiveChildren("SIGINT");
		release();
		process.exit(130);
	});
	process.once("SIGTERM", () => {
		killLiveChildren("SIGTERM");
		release();
		process.exit(143);
	});

	return release;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. Steps
// ═══════════════════════════════════════════════════════════════════════════

async function stepReset(): Promise<void> {
	log("1️⃣", "Resetting database schema...");
	const { resetDatabase } = await import("@/lib/db/reset");
	// Keep the shared connection alive; stepVerify opens its own.
	await resetDatabase({ force: true, closeAfter: false });
}

async function stepEnableVector(): Promise<void> {
	log("2️⃣", "Enabling pgvector extension...");
	await runBunScript(requireScript("setupVector"));
}

async function stepPushSchema(): Promise<void> {
	log("3️⃣", "Pushing Drizzle schema...");
	await runBunScript(requireScript("push"));
}

async function stepSeedAdmin(): Promise<void> {
	log("4️⃣", "Seeding admin user, clinic, and staff profile...");
	await runBunScript(requireScript("seedAdmin"));
}

/**
 * Sanity check that a seeder actually wrote rows. A seeder that exits 0
 * without writing anything is worse than one that crashes: the report
 * turns green and the DB is empty.
 */
async function assertRowCount(
	table: string,
	minRows: number,
	hint: string
): Promise<void> {
	const { SQL } = await import("bun");
	const { drizzle } = await import("drizzle-orm/bun-sql");
	const { sql } = await import("drizzle-orm");

	const url = process.env.DATABASE_URL;
	if (!url) fail(`DATABASE_URL missing while checking ${table}`);

	const client = new SQL(url, { max: 1, idleTimeout: 5 });
	try {
		const db = drizzle({ client });
		const rows = await db.execute<{ count: number }>(
			sql`SELECT count(*)::int AS count FROM ${sql.identifier(table)}`
		);
		const count = Number(rows[0]?.count ?? 0);
		if (count < minRows) {
			fail(
				`${hint}\n  ${table} has ${count} row${count === 1 ? "" : "s"}, ` +
					`expected at least ${minRows}.`
			);
		}
	} finally {
		await client.end({ timeout: 5 });
	}
}

async function stepSeedWho(): Promise<void> {
	log("5️⃣", "Seeding WHO growth reference data...");
	await runBunScript(requireScript("seedWho"));
	await assertRowCount(
		"who_growth_data",
		1,
		"seed-who completed but inserted no WHO rows."
	);
}

async function stepSeedApp(): Promise<void> {
	log("6️⃣", "Seeding application demo data...");
	await runBunScript(requireScript("seedApp"));
	await assertRowCount(
		"patients",
		1,
		"seed-app completed but inserted no patients. " +
			"Check src/scripts/seed.ts for an early return or a swallowed error."
	);
}

const VERIFY_TABLES = [
	["clinics", "clinics"],
	["users", "user"],
	["staff", "staff"],
	["patients", "patients"],
	["appointments", "appointments"],
	["encounters", "encounters"],
	["immunizations", "immunizations"],
	["prescriptions", "prescriptions"],
	["lab_orders", "lab_orders"],
	["vitals", "vitals"],
	["growth_measurements", "growth_measurements"],
	["who_growth_data", "who_growth_data"]
] as const;

const CRITICAL_TABLES: ReadonlySet<string> = new Set([
	"clinics",
	"users",
	"staff"
]);

async function stepVerify(ctx: RunContext): Promise<void> {
	log("7️⃣", "Verifying seed...");

	const { SQL } = await import("bun");
	const { drizzle } = await import("drizzle-orm/bun-sql");
	const { sql } = await import("drizzle-orm");

	const url = process.env.DATABASE_URL;
	if (!url) fail("DATABASE_URL missing during verify");

	const client = new SQL(url, { max: 1, idleTimeout: 5 });
	const db = drizzle({ client });

	try {
		const [counts, extInfo] = await Promise.all([
			Promise.all(
				VERIFY_TABLES.map(async ([label, table]) => {
					const rows = await db.execute<{ count: number }>(
						sql`SELECT count(*)::int AS count FROM ${sql.identifier(table)}`
					);
					return { label, count: Number(rows[0]?.count ?? 0) };
				})
			),
			db.execute<{ pg: string; vector: string | null }>(sql`
        SELECT
          (SELECT current_setting('server_version')) AS pg,
          (SELECT extversion FROM pg_extension WHERE extname = 'vector') AS vector
      `)
		]);

		ctx.tableCounts = counts;
		const row = extInfo[0];
		ctx.pgVersion = row?.pg;
		ctx.vectorVersion = row?.vector ?? undefined;

		console.log("");
		for (const { label, count } of counts) {
			const icon = count === 0 ? paint("dim", "·") : paint("green", "✅");
			console.log(`  ${icon} ${label.padEnd(24)} ${count}`);
		}

		const empty = counts.filter(
			r => CRITICAL_TABLES.has(r.label) && r.count === 0
		);
		if (empty.length > 0) {
			fail(`Critical tables are empty: ${empty.map(r => r.label).join(", ")}`);
		}
	} finally {
		await client.end({ timeout: 5 });
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. Step registry
// ═══════════════════════════════════════════════════════════════════════════

const STEPS: readonly Step[] = [
	{ name: "reset", label: "reset schema", run: stepReset },
	{ name: "enable-vector", label: "enable pgvector", run: stepEnableVector },
	{
		name: "push-schema",
		label: "push schema",
		run: stepPushSchema,
		skip: FLAGS.skipSchemaPush,
		skipHint: "--skip-schema-push"
	},
	{ name: "seed-admin", label: "seed admin", run: stepSeedAdmin },
	{
		name: "seed-who",
		label: "seed WHO data",
		run: stepSeedWho,
		skip: FLAGS.skipWho,
		skipHint: "--skip-who"
	},
	{
		name: "seed-app",
		label: "seed app data",
		run: stepSeedApp,
		skip: FLAGS.skipApp,
		skipHint: "--skip-app"
	},
	{ name: "verify", label: "verify", run: stepVerify }
];

function selectSteps(): readonly Step[] {
	if (FLAGS.only && FLAGS.from) {
		warn("Both --only and --from passed; --only wins.");
	}

	if (FLAGS.only) {
		const match = STEPS.find(s => s.name === FLAGS.only);
		if (!match) {
			fail(
				`--only=${FLAGS.only} did not match any step. Valid: ${STEPS.map(
					s => s.name
				).join(", ")}`
			);
		}
		return [match];
	}

	if (FLAGS.from) {
		const idx = STEPS.findIndex(s => s.name === FLAGS.from);
		if (idx < 0) {
			fail(
				`--from=${FLAGS.from} did not match any step. Valid: ${STEPS.map(
					s => s.name
				).join(", ")}`
			);
		}
		return STEPS.slice(idx);
	}

	return STEPS;
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. Pre-flight validation
// ═══════════════════════════════════════════════════════════════════════════

const STEP_SCRIPT_REQUIREMENT: Partial<Record<StepName, ScriptKey>> = {
	"enable-vector": "setupVector",
	"push-schema": "push",
	"seed-admin": "seedAdmin",
	"seed-who": "seedWho",
	"seed-app": "seedApp"
};

function validateScripts(steps: readonly Step[]): void {
	const needed = new Set<ScriptKey>();
	for (const step of steps) {
		if (step.skip) continue;
		const key = STEP_SCRIPT_REQUIREMENT[step.name];
		if (key) needed.add(key);
	}

	const missing = [...needed].filter(k => !SCRIPT_PATHS[k]);
	if (missing.length === 0) return;

	const lines = missing.map(key => {
		const paths = SCRIPT_CANDIDATES[key].map(p => `      ${p}`).join("\n");
		const hint =
			key === "seedWho"
				? "pass --skip-who"
				: key === "seedApp"
					? "pass --skip-app"
					: key === "push"
						? "pass --skip-schema-push"
						: "create the script";
		return `  • ${key} (${hint})\n${paths}`;
	});

	fail(
		`Missing required scripts:\n${lines.join("\n")}\n\n` +
			`  Project root: ${PROJECT_ROOT}\n` +
			`  Run \`bun ${SELF_REL} --print-paths\` to inspect resolution.`
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. CLI subcommands
// ═══════════════════════════════════════════════════════════════════════════

function printPaths(): void {
	console.log(paint("bold", "Resolved script paths:\n"));
	for (const key of Object.keys(SCRIPT_PATHS) as ScriptKey[]) {
		const path = SCRIPT_PATHS[key];
		const status = path ? paint("green", "✅") : paint("red", "❌");
		const display = path ? relToRoot(path) : paint("dim", "(not found)");
		console.log(`  ${status} ${key.padEnd(12)} ${display}`);
	}
	console.log(`\n  Project root: ${PROJECT_ROOT}`);
	console.log(`  Self path:    ${SELF_REL}`);
}

function printHelp(): void {
	console.log(
		[
			paint("bold", `bun ${SELF_REL} [options]`),
			"",
			paint("bold", "Options:"),
			"  -f, --force              skip the confirmation prompt",
			"  --dry-run                print the plan without touching the DB",
			"  --skip-who               skip WHO growth reference seeding",
			"  --skip-app               skip application demo data seeding",
			"  --skip-schema-push       skip the drizzle-kit push step",
			"  --from=<step>            resume from a step",
			"  --only=<step>            run a single step",
			"  --print-paths            show resolved script paths and exit",
			"  --no-report              do not write a report file",
			"  --json-report            also write a .json report next to the .md",
			"  -h, --help               show this help",
			"",
			paint("bold", "Steps:"),
			...STEPS.map(
				s =>
					`  ${s.name.padEnd(16)} ${s.label}${
						s.skipHint ? paint("dim", ` (skip with ${s.skipHint})`) : ""
					}`
			)
		].join("\n")
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. Orchestration
// ═══════════════════════════════════════════════════════════════════════════

function describePlan(): void {
	console.log(paint("bold", "🔄 Fresh start — resetting local Postgres\n"));
	console.log("This will:");
	for (const step of STEPS) {
		const tag = step.skip ? paint("dim", `  (skipped: ${step.skipHint})`) : "";
		console.log(`  • ${step.label}${tag}`);
	}
	if (FLAGS.only) console.log(paint("yellow", `  • --only=${FLAGS.only}`));
	if (FLAGS.from) console.log(paint("yellow", `  • --from=${FLAGS.from}`));
	if (FLAGS.dryRun) {
		console.log(paint("yellow", "  • DRY RUN — no changes will be made"));
	}
	console.log("");
}

async function runSteps(
	steps: readonly Step[],
	ctx: RunContext
): Promise<{ results: StepResult[]; totalMs: number }> {
	const started = Date.now();
	const results: StepResult[] = [];

	for (const [i, step] of steps.entries()) {
		if (step.skip) {
			console.log(
				paint("dim", `⏭️  Skipping "${step.name}" (${step.skipHint})`)
			);
			results.push({
				name: step.name,
				label: step.label,
				status: "skipped",
				ms: 0
			});
			continue;
		}

		const stepStarted = Date.now();
		try {
			await step.run(ctx);
			const ms = Date.now() - stepStarted;
			results.push({ name: step.name, label: step.label, status: "ok", ms });
			console.log(paint("dim", `   ⏱  ${step.name} took ${fmtMs(ms)}`));
		} catch (error) {
			const ms = Date.now() - stepStarted;
			const message = error instanceof Error ? error.message : String(error);
			results.push({
				name: step.name,
				label: step.label,
				status: "failed",
				ms,
				error: message.split("\n")[0]
			});
			console.error(
				`\n${paint("red", "❌")} Step "${step.name}" (${i + 1}/${steps.length}) failed`
			);
			const okSoFar = results.filter(r => r.status === "ok").map(r => r.name);
			if (okSoFar.length > 0) {
				console.error(`   Completed before failure: ${okSoFar.join(" → ")}`);
				console.error(
					`   Resume with: bun ${SELF_REL} --from=${step.name} --force`
				);
			}
			console.error(message);
			return { results, totalMs: Date.now() - started };
		}
	}

	return { results, totalMs: Date.now() - started };
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. Duration state
// ═══════════════════════════════════════════════════════════════════════════

const STATE_PATH = abs(".fresh-start.state.json");

async function readPreviousDuration(): Promise<number | undefined> {
	try {
		const raw = await readFile(STATE_PATH, "utf8");
		const parsed: unknown = JSON.parse(raw);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"totalMs" in parsed &&
			typeof (parsed as { totalMs: unknown }).totalMs === "number"
		) {
			return (parsed as { totalMs: number }).totalMs;
		}
	} catch {
		/* first run, or unreadable */
	}
	return undefined;
}

async function writeDurationState(totalMs: number): Promise<void> {
	try {
		await writeFile(
			STATE_PATH,
			JSON.stringify({ totalMs, at: new Date().toISOString() }, null, 2),
			"utf8"
		);
	} catch {
		/* best-effort */
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 13. Entry point
// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
	if (FLAGS.help) {
		printHelp();
		return;
	}
	if (FLAGS.printPaths) {
		printPaths();
		return;
	}

	const steps = selectSteps();
	describePlan();
	const target = assertEnvironment();

	if (FLAGS.dryRun) {
		console.log(`\nTarget: ${target.host}/${target.name}`);
		return;
	}

	validateScripts(steps);

	const previousMs = await readPreviousDuration();
	const releaseLock = await acquireLock();

	const ctx: RunContext = {
		target,
		releaseLock,
		startedAt: new Date()
	};

	let results: StepResult[] = [];
	let totalMs = 0;
	let crashed = false;

	try {
		await confirm(
			`Wipe and reseed ${paint("bold", `${target.host}/${target.name}`)}?`
		);
		const run = await runSteps(steps, ctx);
		results = run.results;
		totalMs = run.totalMs;
	} catch (error) {
		crashed = true;
		console.error(`\n${paint("red", "❌")} Unhandled error during run:`, error);
	} finally {
		releaseLock();
		try {
			const { closeConnection } = await import("@/lib/db/server");
			await closeConnection();
		} catch {
			/* ignore */
		}
	}

	// Print the report last, always. Even a crash with zero completed steps
	// should leave a visible artifact.
	const reportInput: ReportInput = {
		ctx,
		results,
		totalMs,
		previousMs,
		selfPath: SELF_PATH
	};

	if (results.length > 0 || crashed) {
		console.log(`\n${renderReport(reportInput)}`);
	}

	if (!FLAGS.noReport) {
		const written = await writeReportFiles(reportInput, {
			writeJson: FLAGS.jsonReport,
			keep: 20
		});
		if (written) {
			console.log(
				`\n   ${paint("dim", "📄 Report:")} ${relToRoot(written.mdPath)}` +
					(written.jsonPath
						? paint("dim", ` · ${relToRoot(written.jsonPath)}`)
						: "") +
					paint("dim", ` · sha ${written.sha}`)
			);
		}
	}

	const failed = crashed || results.some(r => r.status === "failed");
	if (!failed) await writeDurationState(totalMs);

	process.exit(failed ? 1 : 0);
}

main().catch(error => {
	console.error(`\n${paint("red", "❌")} Unhandled error:`, error);
	process.exit(1);
});
