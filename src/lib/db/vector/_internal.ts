export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Extract the first row from a Drizzle `db.execute` result.
 *
 * `postgres-js` returns rows as a plain array; some other drivers wrap them
 * in `{ rows: [...] }`. Both shapes are handled so a driver swap doesn't
 * silently break every call site.
 *
 * `T` is the caller-declared row type — the same contract as `db.execute<T>`
 * itself. The runtime shape is not verified because there is nothing to
 * verify against: the caller's `T` has no runtime tag.
 */
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters
export function firstRow<T>(result: unknown): T | undefined {
	if (Array.isArray(result)) {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- T is caller-declared; matches db.execute<T>'s own contract
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

/**
 * Extract all rows from a Drizzle `db.execute` result.
 *
 * Same contract as `firstRow`. Returns an empty array rather than
 * `undefined` so callers can always `.length` / iterate without a null-check.
 */
export function asArray<T>(result: unknown): T[] {
	if (Array.isArray(result)) {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- T is caller-declared; matches db.execute<T>'s own contract
		return result as T[];
	}
	if (isRecord(result) && "rows" in result) {
		const rows = result["rows"];
		if (Array.isArray(rows)) {
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
			return rows as T[];
		}
	}
	return [];
}

/** `Error` message if `error` is an `Error`; `String(error)` otherwise. */
export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
