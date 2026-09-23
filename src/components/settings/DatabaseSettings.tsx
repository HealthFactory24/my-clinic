// src/components/settings/DatabaseSettings.tsx

import {
	AlertTriangle,
	Database,
	Download,
	FileJson,
	HardDriveDownload,
	RefreshCcw,
	Trash2,
	Upload
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle
} from "#/components/ui/alert-dialog.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "#/components/ui/card.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { useAuthSuspense } from "#/lib/auth/hooks.ts";
// The DB layer. Adjust the import path to whatever you have in `lib/db`.
// This module is assumed to expose:
//   - `db` — the opened IDB instance
//   - `TABLES` — readonly string[] of table/store names
//   - `exportTable(table)` / `importTable(table, rows)` / `clearTable(table)`
//   - `getTableCounts()` — for the "size" panel

import { cn } from "@/lib/utils";

import {
	clearAllTables,
	exportAllTables,
	exportTable,
	getTableCounts,
	importAllTables,
	TABLES,
	type TableName
} from "../../lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TableCounts = Record<TableName, number>;

type BackupFile = {
	/** Schema version — bump when the export shape changes. */
	version: 1;
	/** ISO timestamp of when the backup was created. */
	createdAt: string;
	/** Optional clinic identifier so imports can warn on cross-clinic restore. */
	clinicId?: string;
	/** The actual data — one array per table. */
	tables: Partial<Record<TableName, unknown[]>>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function DatabaseSettings() {
	const { user } = useAuthSuspense();

	// ── Gate: only admins see this panel ────────────────────────────────────
	if (user?.role !== "admin") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<Database className='size-4 text-muted-foreground' />
						Database
					</CardTitle>
					<CardDescription>
						Only clinic administrators can manage database settings.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<div className='space-y-6'>
			<StorageOverviewCard />
			<ExportCard />
			<ImportCard />
			<ResetCard />
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage overview — shows row counts and a rough size estimate
// ─────────────────────────────────────────────────────────────────────────────

function StorageOverviewCard() {
	const [counts, setCounts] = useState<TableCounts | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		try {
			const result = await getTableCounts();
			setCounts(result);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Could not read table counts."
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Initial load
	useState(() => {
		void refresh();
	});

	const total = counts
		? Object.values(counts).reduce((sum, n) => sum + n, 0)
		: 0;

	return (
		<Card>
			<CardHeader className='flex flex-row items-start justify-between gap-4'>
				<div>
					<CardTitle className='flex items-center gap-2'>
						<HardDriveDownload className='size-4 text-primary' />
						Local Storage
					</CardTitle>
					<CardDescription>
						Row counts per table in your local-first database.
					</CardDescription>
				</div>
				<Button
					disabled={isLoading}
					onClick={() => void refresh()}
					size='sm'
					variant='outline'
				>
					<RefreshCcw
						className={cn("mr-1.5 size-3.5", isLoading && "animate-spin")}
					/>
					Refresh
				</Button>
			</CardHeader>
			<CardContent>
				{counts === null ? (
					<p className='text-muted-foreground text-sm'>Loading…</p>
				) : (
					<>
						<div className='mb-4 flex items-baseline gap-2'>
							<span className='font-bold text-3xl tabular-nums'>
								{total.toLocaleString()}
							</span>
							<span className='text-muted-foreground text-sm'>
								total rows across {TABLES.length} tables
							</span>
						</div>

						<ul className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
							{TABLES.map(table => (
								<li
									className='flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2'
									key={table}
								>
									<span className='truncate font-medium text-sm capitalize'>
										{table.replace(/_/g, " ")}
									</span>
									<span className='font-mono text-muted-foreground text-xs tabular-nums'>
										{counts[table].toLocaleString()}
									</span>
								</li>
							))}
						</ul>
					</>
				)}
			</CardContent>
		</Card>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Export — download a JSON backup of one or all tables
// ─────────────────────────────────────────────────────────────────────────────

function ExportCard() {
	const [isExporting, setIsExporting] = useState(false);
	const [selectedTable, setSelectedTable] = useState<TableName | "all">("all");

	const handleExport = useCallback(async () => {
		setIsExporting(true);
		try {
			const payload: BackupFile =
				selectedTable === "all"
					? {
							version: 1,
							createdAt: new Date().toISOString(),
							tables: await exportAllTables()
						}
					: {
							version: 1,
							createdAt: new Date().toISOString(),
							tables: { [selectedTable]: await exportTable(selectedTable) }
						};

			const filename =
				selectedTable === "all"
					? `smart-clinic-backup-${dateStamp()}.json`
					: `smart-clinic-${selectedTable}-${dateStamp()}.json`;

			downloadJson(filename, payload);

			toast.success(
				selectedTable === "all"
					? "Full backup downloaded."
					: `Exported ${selectedTable}.`
			);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Export failed.");
		} finally {
			setIsExporting(false);
		}
	}, [selectedTable]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<Download className='size-4 text-primary' />
					Export
				</CardTitle>
				<CardDescription>
					Download your data as a JSON file. Lossless — safe to re-import later.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
					<div className='flex-1 space-y-2'>
						<Label htmlFor='export-table'>Table</Label>
						<select
							className='h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm'
							id='export-table'
							onChange={e =>
								setSelectedTable(e.target.value as TableName | "all")
							}
							value={selectedTable}
						>
							<option value='all'>All tables</option>
							{TABLES.map(t => (
								<option
									key={t}
									value={t}
								>
									{t.replace(/_/g, " ")}
								</option>
							))}
						</select>
					</div>
					<Button
						disabled={isExporting}
						onClick={() => void handleExport()}
					>
						<Download className='mr-2 size-4' />
						{isExporting ? "Preparing…" : "Export"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Import — validate then replace
// ─────────────────────────────────────────────────────────────────────────────

function ImportCard() {
	const [file, setFile] = useState<File | null>(null);
	const [parsed, setParsed] = useState<BackupFile | null>(null);
	const [parseError, setParseError] = useState<string | null>(null);
	const [isImporting, setIsImporting] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = useCallback(async (f: File | null) => {
		setFile(f);
		setParsed(null);
		setParseError(null);
		if (!f) return;

		try {
			const text = await f.text();
			const json: unknown = JSON.parse(text);
			const validated = validateBackupFile(json);
			setParsed(validated);
		} catch (err) {
			setParseError(
				err instanceof Error ? err.message : "Invalid backup file."
			);
		}
	}, []);

	const handleConfirm = useCallback(async () => {
		if (!parsed) return;
		setIsImporting(true);
		try {
			await importAllTables(parsed.tables);
			toast.success("Backup imported successfully.");
			setConfirmOpen(false);
			setFile(null);
			setParsed(null);
			if (inputRef.current) inputRef.current.value = "";
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Import failed.");
		} finally {
			setIsImporting(false);
		}
	}, [parsed]);

	const tableCount = parsed
		? Object.entries(parsed.tables).reduce(
				(sum, [, rows]) => sum + (rows?.length ?? 0),
				0
			)
		: 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<Upload className='size-4 text-primary' />
					Import
				</CardTitle>
				<CardDescription>
					Restore from a JSON backup. This replaces all data in the affected
					tables.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='space-y-2'>
					<Label htmlFor='import-file'>Backup file</Label>
					<Input
						accept='application/json,.json'
						id='import-file'
						onChange={e => void handleFileChange(e.target.files?.[0] ?? null)}
						ref={inputRef}
						type='file'
					/>
				</div>

				{parseError ? (
					<div className='flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-destructive text-sm'>
						<AlertTriangle className='mt-0.5 size-4 shrink-0' />
						<span>{parseError}</span>
					</div>
				) : null}

				{parsed ? (
					<div className='rounded-xl border border-border bg-muted/30 p-4'>
						<div className='flex items-center gap-2 text-sm'>
							<FileJson className='size-4 text-muted-foreground' />
							<span className='font-medium'>{file?.name ?? "backup.json"}</span>
						</div>
						<p className='mt-2 text-muted-foreground text-xs'>
							Created {new Date(parsed.createdAt).toLocaleString()} ·{" "}
							{tableCount.toLocaleString()} rows across{" "}
							{Object.keys(parsed.tables).length} tables
						</p>
					</div>
				) : null}

				<Button
					disabled={!parsed || isImporting}
					onClick={() => setConfirmOpen(true)}
					variant='destructive'
				>
					<Upload className='mr-2 size-4' />
					{isImporting ? "Importing…" : "Import and replace"}
				</Button>
			</CardContent>

			<AlertDialog
				onOpenChange={setConfirmOpen}
				open={confirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogMedia className='bg-destructive/10'>
							<AlertTriangle className='text-destructive' />
						</AlertDialogMedia>
						<AlertDialogTitle>Replace existing data?</AlertDialogTitle>
						<AlertDialogDescription>
							This will overwrite the current contents of the{" "}
							{Object.keys(parsed?.tables ?? {}).length} tables in this backup
							with {tableCount.toLocaleString()} rows. This action cannot be
							undone — export a fresh backup first if you are unsure.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={isImporting}
							onClick={e => {
								e.preventDefault();
								void handleConfirm();
							}}
						>
							{isImporting ? "Importing…" : "Replace data"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset — download backup, then wipe
// ─────────────────────────────────────────────────────────────────────────────

function ResetCard() {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const [isResetting, setIsResetting] = useState(false);

	const REQUIRED_CONFIRMATION = "DELETE ALL DATA";
	const canConfirm = confirmText === REQUIRED_CONFIRMATION;

	const handleReset = useCallback(async () => {
		if (!canConfirm) return;
		setIsResetting(true);
		try {
			// Automatic safety net: download a backup before wiping.
			const backup: BackupFile = {
				version: 1,
				createdAt: new Date().toISOString(),
				tables: await exportAllTables()
			};
			downloadJson(`smart-clinic-pre-reset-backup-${dateStamp()}.json`, backup);

			await clearAllTables();

			toast.success(
				"All data has been cleared. Backup saved to your downloads."
			);
			setConfirmOpen(false);
			setConfirmText("");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Reset failed.");
		} finally {
			setIsResetting(false);
		}
	}, [canConfirm]);

	return (
		<Card className='border-destructive/40'>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-destructive'>
					<Trash2 className='size-4' />
					Reset
				</CardTitle>
				<CardDescription>
					Wipe the entire local database. A backup is downloaded automatically
					before anything is deleted.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive text-sm'>
					<p className='font-medium'>This action is irreversible.</p>
					<p className='mt-1 text-destructive/80'>
						All patients, appointments, encounters, immunizations, growth
						records, prescriptions, labs, staff, and vitals will be permanently
						deleted from this device.
					</p>
				</div>
				<Button
					onClick={() => setConfirmOpen(true)}
					variant='destructive'
				>
					<Trash2 className='mr-2 size-4' />
					Reset database
				</Button>
			</CardContent>

			<AlertDialog
				onOpenChange={setConfirmOpen}
				open={confirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogMedia className='bg-destructive/10'>
							<AlertTriangle className='text-destructive' />
						</AlertDialogMedia>
						<AlertDialogTitle>Wipe all local data?</AlertDialogTitle>
						<AlertDialogDescription>
							A backup will be downloaded automatically. To confirm, type{" "}
							<code className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs'>
								{REQUIRED_CONFIRMATION}
							</code>{" "}
							below.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<div className='space-y-2'>
						<Label htmlFor='reset-confirm'>Confirmation</Label>
						<Input
							autoCapitalize='characters'
							autoComplete='off'
							id='reset-confirm'
							onChange={e => setConfirmText(e.target.value)}
							placeholder={REQUIRED_CONFIRMATION}
							spellCheck={false}
							value={confirmText}
						/>
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={!canConfirm || isResetting}
							onClick={e => {
								e.preventDefault();
								void handleReset();
							}}
						>
							{isResetting ? "Resetting…" : "Delete everything"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function dateStamp(): string {
	return new Date().toISOString().slice(0, 10);
}

function downloadJson(filename: string, payload: unknown): void {
	const blob = new Blob([JSON.stringify(payload, null, 2)], {
		type: "application/json"
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * Minimal structural validation. Rejects:
 *   - non-objects
 *   - missing/unknown version
 *   - missing createdAt
 *   - tables not shaped like `Record<string, unknown[]>`
 *
 * This is intentionally loose — the IDB write layer does per-row validation
 * against your Zod schemas. This just catches "you uploaded a PDF".
 */
function validateBackupFile(input: unknown): BackupFile {
	if (typeof input !== "object" || input === null) {
		throw new Error("Backup file is not a JSON object.");
	}
	const obj = input as Record<string, unknown>;

	if (obj.version !== 1) {
		throw new Error(
			`Unsupported backup version: ${String(obj.version)}. Expected 1.`
		);
	}
	if (typeof obj.createdAt !== "string") {
		throw new Error("Backup file is missing `createdAt`.");
	}
	if (typeof obj.tables !== "object" || obj.tables === null) {
		throw new Error("Backup file is missing `tables`.");
	}

	const tables: Partial<Record<TableName, unknown[]>> = {};
	for (const [key, value] of Object.entries(obj.tables)) {
		if (!Array.isArray(value)) {
			throw new Error(`Table "${key}" is not an array.`);
		}
		tables[key as TableName] = value;
	}

	return {
		version: 1,
		createdAt: obj.createdAt,
		...(typeof obj.clinicId === "string" ? { clinicId: obj.clinicId } : {}),
		tables
	};
}
