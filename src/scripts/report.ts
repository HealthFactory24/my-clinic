// src/scripts/lib/report.ts
//
// Presentation layer for CLI scripts. No DB, no CLI, no child processes.
//
// Owns:
//   1. Paths          PROJECT_ROOT, abs, relToRoot, firstExisting
//   2. Colors/format  paint, pad, fmtMs, fmtNum, pct, fmtDate
//   3. Types          Step*, RunContext, ReportInput, Column, Renderer
//   4. Renderers      console / markdown
//   5. Report body    buildReport
//   6. Public API     renderReport, renderReportMarkdown
//   7. Report files   writeReportFiles, allocateBase, pruneReports
//   8. Duration state readPreviousDuration, writeDurationState

import { createHash } from "node:crypto";
import { existsSync, constants as fsConstants, statSync } from "node:fs";
import {
	access,
	mkdir,
	readdir,
	readFile,
	unlink,
	writeFile
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ═══════════════════════════════════════════════════════════════════════════
// 1. Paths
// ═══════════════════════════════════════════════════════════════════════════

export const SELF_PATH = fileURLToPath(import.meta.url);

function findProjectRoot(start: string): string {
	let dir = start;
	for (let i = 0; i < 10; i += 1) {
		if (existsSync(join(dir, "package.json"))) return dir;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error(
		`Could not find package.json above ${start}. ` +
			"Run this script from inside the project."
	);
}

export const PROJECT_ROOT = findProjectRoot(dirname(SELF_PATH));

export const abs = (p: string): string => resolve(PROJECT_ROOT, p);

export const relToRoot = (p: string): string =>
	p.startsWith(`${PROJECT_ROOT}/`) ? p.slice(PROJECT_ROOT.length + 1) : p;

/**
 * Path of *this* module, relative to the project root. Used only when a
 * caller forgets to pass `selfPath` in `ReportInput`. Orchestrators should
 * always pass their own `import.meta.url`, otherwise resume hints point
 * here instead of at the entry script.
 */
export const SELF_REL = relToRoot(SELF_PATH);

function isFile(p: string): boolean {
	try {
		return statSync(p).isFile();
	} catch {
		return false;
	}
}

/** Return the first candidate that exists as a file, or `undefined`. */
export function firstExisting(...candidates: string[]): string | undefined {
	for (const candidate of candidates) {
		const full = abs(candidate);
		if (isFile(full)) return full;
	}
	return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Colors and formatting
// ═══════════════════════════════════════════════════════════════════════════

const isTTY = process.stdout.isTTY === true;
const TERM_WIDTH = Math.min(process.stdout.columns ?? 80, 100);

const COLOR = {
	reset: "\x1b[0m",
	dim: "\x1b[2m",
	bold: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m"
} as const;

export type ColorName = keyof typeof COLOR;

export function paint(color: ColorName, s: string): string {
	return isTTY ? `${COLOR[color]}${s}${COLOR.reset}` : s;
}

export function stripAnsi(s: string): string {
	// eslint-disable-next-line no-control-regex
	// biome-ignore lint/suspicious/noControlCharactersInRegex: <ok>
	return s.replace(/\x1b\[[0-9;]*m/g, "");
}

const visibleLen = (s: string): number => stripAnsi(s).length;

export function pad(
	s: string,
	width: number,
	align: "left" | "right" = "left"
): string {
	const n = Math.max(0, width - visibleLen(s));
	return align === "left" ? s + " ".repeat(n) : " ".repeat(n) + s;
}

export function fmtMs(ms: number): string {
	return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function fmtNum(n: number): string {
	return n.toLocaleString("en-US");
}

export function pct(part: number, total: number): string {
	if (total <= 0) return "0.0%";
	return `${((part / total) * 100).toFixed(1)}%`;
}

/** "2026-09-23 03:15:38 +03:00" — local time with explicit offset. */
export function fmtDate(d: Date): string {
	const { sign, hh, mm } = offsetParts(d);
	const iso = d.toISOString().slice(0, 19).replace("T", " ");
	return `${iso} ${sign}${hh}:${mm}`;
}

/** "2026-09-23T03:15:38+03:00" — local ISO-8601 with offset. */
function isoLocal(d: Date): string {
	const { sign, hh, mm } = offsetParts(d);
	return `${d.toISOString().slice(0, 19)}${sign}${hh}:${mm}`;
}

function offsetParts(d: Date): { sign: string; hh: string; mm: string } {
	const off = -d.getTimezoneOffset();
	const sign = off >= 0 ? "+" : "-";
	const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
	const mm = String(Math.abs(off) % 60).padStart(2, "0");
	return { sign, hh, mm };
}

// ─── Filename timestamps ───────────────────────────────────────────────────

type FilenameStampFormat = "yymmdd-hhmm" | "mmdd-hhmm";

/**
 * Compact, sortable, filesystem-safe timestamp, in local time.
 *
 *   yymmdd-hhmm → "260923-0306"   sorts correctly across years (default)
 *   mmdd-hhmm   → "0923-0306"     shorter; only sorts correctly within a year
 */
function filenameStamp(
	d: Date = new Date(),
	format: FilenameStampFormat = "yymmdd-hhmm"
): string {
	const yy = String(d.getFullYear() % 100).padStart(2, "0");
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	const hh = String(d.getHours()).padStart(2, "0");
	const mi = String(d.getMinutes()).padStart(2, "0");

	return format === "mmdd-hhmm"
		? `${mm}${dd}-${hh}${mi}`
		: `${yy}${mm}${dd}-${hh}${mi}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Types
// ═══════════════════════════════════════════════════════════════════════════

export type DbTarget = { host: string; name: string };

export type StepName =
	| "reset"
	| "enable-vector"
	| "push-schema"
	| "seed-admin"
	| "seed-who"
	| "seed-app"
	| "verify";

export type StepStatus = "ok" | "skipped" | "failed";

export type StepResult = {
	name: StepName;
	label: string;
	status: StepStatus;
	ms: number;
	/** First line of the thrown error, when status === "failed". */
	error?: string;
};

export type RunContext = {
	target: DbTarget;
	releaseLock: () => void;
	startedAt: Date;
	/** Populated by the verify step. */
	tableCounts?: ReadonlyArray<{ label: string; count: number }>;
	/** Populated by the verify step. */
	pgVersion?: string;
	vectorVersion?: string;
};

export type Step = {
	readonly name: StepName;
	readonly label: string;
	readonly run: (ctx: RunContext) => Promise<void>;
	readonly skip?: boolean;
	readonly skipHint?: string;
};

export type ReportInput = {
	ctx: RunContext;
	results: readonly StepResult[];
	totalMs: number;
	previousMs?: number;
	/**
	 * Path of the entry script for this run (usually `import.meta.url` of the
	 * orchestrator). Used for the "Resume with: bun <script> --from=…" hint.
	 * Required — do not let this default to `report.ts`.
	 */
	selfPath: string;
};

export type ReportFormat = "console" | "markdown";

export type Column<Row> = {
	header: string;
	width: number;
	align?: "left" | "right";
	value: (row: Row) => string;
};

type Renderer = {
	section: (title: string) => string;
	box: (lines: string[]) => string;
	table: <Row>(rows: readonly Row[], columns: readonly Column<Row>[]) => string;
	bar: (value: number, max: number, width: number) => string;
	c: (color: ColorName, s: string) => string;
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. Low-level renderers
// ═══════════════════════════════════════════════════════════════════════════

const BAR_BLOCKS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];

function barChart(value: number, max: number, width = 12): string {
	if (max <= 0) return " ".repeat(width);
	const exact = (value / max) * width;
	const whole = Math.floor(exact);
	const partial = BAR_BLOCKS[Math.round((exact - whole) * 8)] ?? "";
	const tail = " ".repeat(Math.max(0, width - whole - (partial ? 1 : 0)));
	return "█".repeat(whole) + partial + tail;
}

function renderTable<Row>(
	rows: readonly Row[],
	columns: readonly Column<Row>[]
): string {
	const header = columns
		.map(col =>
			paint(
				"bold",
				pad(col.header.toUpperCase(), col.width, col.align ?? "left")
			)
		)
		.join("   ");
	const divider = paint(
		"dim",
		columns.map(col => "─".repeat(col.width)).join("───")
	);
	const bodyLines = rows.map(row =>
		columns
			.map(col => pad(col.value(row), col.width, col.align ?? "left"))
			.join("   ")
	);
	return (
		`   ${header}\n` +
		`   ${divider}\n` +
		bodyLines.map(line => `   ${line}`).join("\n")
	);
}

function consoleRenderer(): Renderer {
	return {
		section: title => {
			const label = `── ${title} `;
			const fill = "─".repeat(Math.max(0, TERM_WIDTH - label.length - 2));
			return `\n  ${paint("bold", label)}${paint("dim", fill)}`;
		},
		box: lines => {
			const inner = TERM_WIDTH - 4;
			const padded = lines.map(l => pad(l, inner));
			const top = `╭${"─".repeat(TERM_WIDTH - 2)}╮`;
			const bottom = `╰${"─".repeat(TERM_WIDTH - 2)}╯`;
			const body = padded.map(l => `│  ${l}  │`).join("\n");
			return paint("cyan", [top, body, bottom].join("\n"));
		},
		table: (rows, columns) => renderTable(rows, columns),
		bar: (value, max, width) => barChart(value, max, width),
		c: (color, s) => paint(color, s)
	};
}

function markdownRenderer(): Renderer {
	return {
		section: title => `\n## ${title}\n`,
		// First line becomes the document H1, remaining lines become a bold
		// subtitle paragraph. Callers must NOT wrap the H1 text in `**`.
		box: lines =>
			lines.map((l, i) => (i === 0 ? `# ${l}` : `**${l}**`)).join("\n\n"),
		table: (rows, columns) => {
			const header = `| ${columns
				.map(col => col.header.toUpperCase())
				.join(" | ")} |`;
			const divider = `| ${columns
				.map(col => (col.align === "right" ? "---:" : ":---"))
				.join(" | ")} |`;
			const body = rows
				.map(
					row =>
						`| ${columns.map(col => stripAnsi(col.value(row))).join(" | ")} |`
				)
				.join("\n");
			return `${header}\n${divider}\n${body}`;
		},
		bar: (value, max, width) => {
			if (max <= 0) return "";
			const filled = Math.round((value / max) * width);
			return `${"=".repeat(filled)}${"-".repeat(Math.max(0, width - filled))}`;
		},
		c: (_color, s) => s
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Report body
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Expected row counts per table after a full seed. Used by the report to
 * flag a "⚠️" when a table's count disagrees. Extend as your seeders grow.
 */
export const EXPECTED_ROWS: Record<string, number | undefined> = {
	clinics: 1
};

function buildReport(
	input: ReportInput,
	r: Renderer,
	format: ReportFormat
): string {
	const { ctx, results, totalMs, previousMs } = input;
	const selfRel = relToRoot(input.selfPath);
	const out: string[] = [];

	const ok = results.filter(x => x.status === "ok").length;
	const skipped = results.filter(x => x.status === "skipped").length;
	const failed = results.filter(x => x.status === "failed").length;
	const ran = results.length;

	// ── Header ────────────────────────────────────────────────────────────
	// Markdown H1s are already bold — do not wrap the text in `**` or some
	// renderers (glow, bat) will show the asterisks literally.
	const headline =
		failed > 0
			? `${r.c("red", "❌")}  ${
					format === "markdown"
						? "FRESH START FAILED"
						: r.c("bold", "FRESH START FAILED")
				}`
			: `${r.c("green", "✅")}  ${
					format === "markdown"
						? "FRESH START COMPLETE"
						: r.c("bold", "FRESH START COMPLETE")
				}`;
	const subtitle =
		failed > 0
			? `${failed} of ${ran} steps failed`
			: "Local Postgres wiped, re-schema'd, and reseeded";
	out.push(r.box([headline, r.c("dim", subtitle)]));

	// ── Summary ───────────────────────────────────────────────────────────
	const delta =
		previousMs !== undefined && previousMs > 0
			? `  (${fmtMs(Math.abs(totalMs - previousMs))} ${
					totalMs >= previousMs ? "slower" : "faster"
				} than last run)`
			: "";

	out.push("");
	if (format === "markdown") {
		out.push("| Field | Value |");
		out.push("| :--- | :--- |");
		out.push(`| Target | \`${ctx.target.host}/${ctx.target.name}\` |`);
		out.push(`| Duration | ${fmtMs(totalMs)}${delta} |`);
		out.push(`| Finished | ${fmtDate(new Date())} |`);
		out.push(
			`| Steps | ${ok}/${ran} succeeded${
				skipped > 0 ? ` · ${skipped} skipped` : ""
			}${failed > 0 ? ` · ${failed} failed` : ""} |`
		);
	} else {
		out.push(
			`  ${r.c("dim", "Target".padEnd(14))}${ctx.target.host}/${ctx.target.name}`
		);
		out.push(`  ${r.c("dim", "Duration".padEnd(14))}${fmtMs(totalMs)}${delta}`);
		out.push(`  ${r.c("dim", "Finished".padEnd(14))}${fmtDate(new Date())}`);
		out.push(
			`  ${r.c("dim", "Steps".padEnd(14))}${ok}/${ran} succeeded` +
				(skipped > 0 ? r.c("dim", ` · ${skipped} skipped`) : "") +
				(failed > 0 ? ` · ${r.c("red", `${failed} failed`)}` : "")
		);
	}

	// ── Timeline ──────────────────────────────────────────────────────────
	out.push(r.section("Step timeline"));
	const maxMs = Math.max(...results.map(x => x.ms), 1);
	const totalOk = results.reduce((a, x) => a + x.ms, 0) || 1;

	type TimelineRow = StepResult & { idx: number };
	const timelineRows: TimelineRow[] = results.map((x, i) => ({
		...x,
		idx: i + 1
	}));
	const timelineCols: Array<Column<TimelineRow>> = [
		{
			header: "#",
			width: 2,
			align: "right",
			value: x => r.c("dim", String(x.idx))
		},
		{ header: "step", width: 16, value: x => x.name },
		{
			header: "status",
			width: 8,
			value: x =>
				x.status === "ok"
					? r.c("green", "✅ ok")
					: x.status === "skipped"
						? r.c("dim", "⏭ skip")
						: r.c("red", "❌ fail")
		},
		{
			header: "duration",
			width: 9,
			align: "right",
			value: x => (x.status === "skipped" ? r.c("dim", "–") : fmtMs(x.ms))
		},
		{
			header: "% of total",
			width: 10,
			align: "right",
			value: x =>
				x.status === "skipped" ? r.c("dim", "–") : pct(x.ms, totalOk)
		},
		{
			header: "bar",
			width: 14,
			value: x =>
				x.status === "skipped"
					? r.c("dim", " ".repeat(12))
					: r.bar(x.ms, maxMs, 12)
		}
	];
	out.push(r.table(timelineRows, timelineCols));

	// ── Database snapshot ─────────────────────────────────────────────────
	if (ctx.tableCounts && ctx.tableCounts.length > 0) {
		out.push(r.section("Database snapshot"));

		type DbRow = { label: string; count: number; expected?: number };
		const dbRows: DbRow[] = ctx.tableCounts.map(t => ({
			label: t.label,
			count: t.count,
			expected: EXPECTED_ROWS[t.label]
		}));

		const dbCols: Array<Column<DbRow>> = [
			{ header: "table", width: 24, value: x => x.label },
			{
				header: "rows",
				width: 8,
				align: "right",
				value: x => fmtNum(x.count)
			},
			{
				header: "expected",
				width: 9,
				align: "right",
				value: x =>
					x.expected === undefined ? r.c("dim", "–") : fmtNum(x.expected)
			},
			{
				header: "status",
				width: 6,
				value: x => {
					if (x.count === 0) return r.c("red", "❌");
					if (x.expected !== undefined && x.count !== x.expected) {
						return r.c("yellow", "⚠️");
					}
					return r.c("green", "✅");
				}
			}
		];

		out.push(r.table(dbRows, dbCols));

		const total = dbRows.reduce((a, x) => a + x.count, 0);
		if (format === "markdown") {
			out.push("");
			out.push(`**Total rows: ${fmtNum(total)}**`);
		} else {
			out.push(
				`   ${r.c("dim", "─".repeat(50))}\n` +
					`   ${r.c("bold", "TOTAL".padEnd(24))}${r.c(
						"bold",
						fmtNum(total).padStart(8)
					)}`
			);
		}
	}

	// ── Environment ───────────────────────────────────────────────────────
	out.push(r.section("Environment"));
	const pgLine = ctx.pgVersion
		? `${ctx.pgVersion}${
				ctx.vectorVersion ? ` (pgvector ${ctx.vectorVersion})` : ""
			}`
		: r.c("dim", "unknown");

	if (format === "markdown") {
		out.push("| Field | Value |");
		out.push("| :--- | :--- |");
		out.push(`| Project root | \`${PROJECT_ROOT}\` |`);
		out.push(`| Script | \`${selfRel}\` |`);
		out.push(`| Runtime | \`bun ${process.versions.bun ?? "?"}\` |`);
		out.push(`| Postgres | ${pgLine} |`);
		out.push(`| NODE_ENV | \`${process.env.NODE_ENV ?? "development"}\` |`);
	} else {
		out.push(`  ${r.c("dim", "Project root".padEnd(14))}${PROJECT_ROOT}`);
		out.push(`  ${r.c("dim", "Script".padEnd(14))}${selfRel}`);
		out.push(
			`  ${r.c("dim", "Runtime".padEnd(14))}bun ${process.versions.bun ?? "?"}`
		);
		out.push(`  ${r.c("dim", "Postgres".padEnd(14))}${pgLine}`);
		out.push(
			`  ${r.c("dim", "NODE_ENV".padEnd(14))}${
				process.env.NODE_ENV ?? "development"
			}`
		);
	}

	// ── Failure detail ────────────────────────────────────────────────────
	if (failed > 0) {
		out.push(r.section("Failure detail"));
		for (const x of results.filter(y => y.status === "failed")) {
			if (format === "markdown") {
				out.push(`### \`${x.name}\` failed`);
				if (x.error) out.push(`\`\`\`\n${x.error}\n\`\`\``);
				out.push(
					"Resume:\n\n```sh\nbun " +
						selfRel +
						" --from=" +
						x.name +
						" --force\n```"
				);
			} else {
				out.push(`  ${r.c("red", "✗")} ${r.c("bold", x.name)}`);
				if (x.error) out.push(`    ${r.c("dim", x.error)}`);
				out.push(
					`    ${r.c("dim", "Resume with:")} bun ${selfRel} --from=${x.name} --force`
				);
			}
		}
	}

	// ── Next steps ────────────────────────────────────────────────────────
	if (failed === 0) {
		out.push(r.section("Next steps"));
		if (format === "markdown") {
			out.push("1. `bun run dev`");
			out.push(
				"2. Log in with the credentials printed by step 4 (seed-admin)."
			);
			out.push("3. Docs: <https://orm.drizzle.team/docs/connect-bun-sql>");
		} else {
			out.push(`  ${r.c("dim", "1.")}  bun run dev`);
			out.push(
				`  ${r.c("dim", "2.")}  Log in with the credentials printed by ${r.c(
					"bold",
					"step 4 (seed-admin)"
				)}`
			);
			out.push(
				`  ${r.c("dim", "3.")}  Docs:  ${r.c(
					"dim",
					"https://orm.drizzle.team/docs/connect-bun-sql"
				)}`
			);
		}
	}

	return out.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Public renderers
// ═══════════════════════════════════════════════════════════════════════════

export function renderReport(input: ReportInput): string {
	return buildReport(input, consoleRenderer(), "console");
}

export function renderReportMarkdown(input: ReportInput): string {
	const failed = input.results.some(r => r.status === "failed");
	const frontMatter = [
		"---",
		`generated_at: ${isoLocal(new Date())}`,
		`duration_ms: ${input.totalMs}`,
		`target: ${input.ctx.target.host}/${input.ctx.target.name}`,
		`steps_total: ${input.results.length}`,
		`steps_ok: ${input.results.filter(r => r.status === "ok").length}`,
		`steps_skipped: ${input.results.filter(r => r.status === "skipped").length}`,
		`steps_failed: ${input.results.filter(r => r.status === "failed").length}`,
		`status: ${failed ? "failed" : "ok"}`,
		`bun: ${process.versions.bun ?? "unknown"}`,
		`postgres: ${input.ctx.pgVersion ?? "unknown"}`,
		`pgvector: ${input.ctx.vectorVersion ?? "unknown"}`,
		"---",
		""
	].join("\n");

	return frontMatter + buildReport(input, markdownRenderer(), "markdown");
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. Report files
// ═══════════════════════════════════════════════════════════════════════════

const REPORTS_DIR = abs("data/reports");

export type WrittenReport = {
	mdPath: string;
	jsonPath?: string;
	sha: string;
};

export type WriteReportOptions = {
	writeJson?: boolean;
	keep?: number;
	/** Filename timestamp format. Default: "yymmdd-hhmm". */
	stampFormat?: FilenameStampFormat;
};

/**
 * Write the Markdown report to `data/reports/fresh-<stamp>.md` and,
 * optionally, a sibling `.json` with the same data in machine-readable form.
 *
 * Filename gets a `-failed` suffix when any step failed, and a `-N` counter
 * when two runs land in the same minute. Older reports beyond `keep` are
 * pruned.
 */
export async function writeReportFiles(
	input: ReportInput,
	opts: WriteReportOptions = {}
): Promise<WrittenReport | undefined> {
	const { writeJson = false, keep = 20, stampFormat = "yymmdd-hhmm" } = opts;
	const failed = input.results.some(r => r.status === "failed");
	const stamp = filenameStamp(new Date(), stampFormat);

	try {
		await mkdir(REPORTS_DIR, { recursive: true });

		const base = await allocateBase(stamp, failed ? "-failed" : "");
		const mdPath = join(REPORTS_DIR, `${base}.md`);
		const markdown = renderReportMarkdown(input);
		await writeFile(mdPath, markdown, "utf8");

		const sha = createHash("sha256")
			.update(markdown)
			.digest("hex")
			.slice(0, 12);

		let jsonPath: string | undefined;
		if (writeJson) {
			jsonPath = join(REPORTS_DIR, `${base}.json`);
			const payload = {
				generatedAt: new Date().toISOString(),
				sha,
				target: input.ctx.target,
				totalMs: input.totalMs,
				previousMs: input.previousMs ?? null,
				results: input.results,
				tableCounts: input.ctx.tableCounts ?? [],
				environment: {
					projectRoot: PROJECT_ROOT,
					script: relToRoot(input.selfPath),
					bun: process.versions.bun ?? "unknown",
					node: process.versions.node ?? "unknown",
					postgres: input.ctx.pgVersion ?? null,
					pgvector: input.ctx.vectorVersion ?? null,
					nodeEnv: process.env.NODE_ENV ?? "development"
				}
			};
			await writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");
		}

		await pruneReports(REPORTS_DIR, keep);
		return { mdPath, jsonPath, sha };
	} catch (error) {
		console.warn(
			paint(
				"yellow",
				`⚠️  Could not write report file: ${
					error instanceof Error ? error.message : String(error)
				}`
			)
		);
		return undefined;
	}
}

/**
 * Find the first `fresh-<stamp>[-N]<suffix>` not already taken.
 *   fresh-260923-0306
 *   fresh-260923-0306-2
 *   fresh-260923-0306-3
 *   …
 */
async function allocateBase(stamp: string, suffix: string): Promise<string> {
	const exists = async (name: string): Promise<boolean> => {
		try {
			await access(join(REPORTS_DIR, `${name}.md`), fsConstants.F_OK);
			return true;
		} catch {
			return false;
		}
	};

	const first = `fresh-${stamp}${suffix}`;
	if (!(await exists(first))) return first;

	for (let n = 2; n < 1000; n += 1) {
		const candidate = `fresh-${stamp}-${n}${suffix}`;
		if (!(await exists(candidate))) return candidate;
	}

	// Guaranteed unique per running process.
	return `fresh-${stamp}-${process.pid}${suffix}`;
}

/** Keep the most recent `keep` reports, delete the rest (and their .json). */
async function pruneReports(dir: string, keep: number): Promise<void> {
	try {
		const entries = await readdir(dir);
		// Lexicographic == chronological for YYMMDD-HHMM names.
		const reports = entries
			.filter(f => f.startsWith("fresh-") && f.endsWith(".md"))
			.sort();

		for (const file of reports.slice(0, Math.max(0, reports.length - keep))) {
			const full = join(dir, file);
			await unlink(full).catch(() => {});
			await unlink(full.replace(/\.md$/, ".json")).catch(() => {});
		}
	} catch {
		/* best-effort */
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. Duration state
// ═══════════════════════════════════════════════════════════════════════════

const STATE_PATH = abs(".fresh-start.state.json");

export async function readPreviousDuration(): Promise<number | undefined> {
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

export async function writeDurationState(totalMs: number): Promise<void> {
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
