// src/utils/data-extract.ts

import { useMemo } from "react";

// ─── Public types ───────────────────────────────────────────────────────────

export interface SafeResult<T> {
	data?: T | { data?: T } | null;
	error?: Error | null;
	isLoading?: boolean;
	isSuccess?: boolean;
	isError?: boolean;
}

export interface ExtractOptions {
	/**
	 * When `true` (default) an empty array is returned for missing/unrecognised
	 * data shapes. When `false`, `null` is returned instead, letting the caller
	 * distinguish "no data yet" from "server confirmed zero results".
	 */
	fallbackToEmptyArray?: boolean;
	warnOnUnexpected?: boolean;
}

// ─── Runtime guards ─────────────────────────────────────────────────────────
//
// Each guard is a real type predicate, so downstream code narrows without an
// `as` cast. They are the only place in this module that inspects `unknown`.

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * A `{ data: ... }` envelope. Note this is a *shape* check only — it does not
 * verify that `data` is populated. Use `isNonEmpty` at the value level when
 * you need to reject `null`/`undefined` payloads.
 */
function isEnvelope(v: unknown): v is { data?: unknown } {
	return isRecord(v) && "data" in v;
}

/**
 * Return `true` iff `v` is a plain object carrying a non-null `id` field.
 * Distinguishes a single entity from a container or an arbitrary record.
 */
function isEntity(v: unknown): v is Record<string, unknown> & { id: unknown } {
	return isRecord(v) && "id" in v && v.id !== undefined && v.id !== null;
}

/** Return `true` iff `v` is neither `null` nor `undefined`. */
function isPresent<T>(v: T | null | undefined): v is T {
	return v !== null && v !== undefined;
}

/**
 * Walk a shallow envelope chain and return the first array found.
 *
 * Handles:
 *   - value itself is an array            → returned
 *   - `{ data: T[] }`                     → `data` returned
 *   - `{ data: { data: T[] } }`           → nested `data` returned
 *
 * Returns `null` if no array is found. Depth is bounded at 2 — deeper nesting
 * indicates an API contract change and should be handled explicitly rather
 * than through unbounded recursion.
 */
function findArray(value: unknown): unknown[] | null {
	if (Array.isArray(value)) return value;
	if (!isEnvelope(value)) return null;

	const first = value.data;
	if (Array.isArray(first)) return first;

	if (isEnvelope(first)) {
		const second = first.data;
		if (Array.isArray(second)) return second;
	}

	return null;
}

// ─── extractData ────────────────────────────────────────────────────────────

/**
 * Extract an array from an API response that may be:
 *   - already an array              → returned as-is
 *   - `{ data: T[] }`               → `data` is returned
 *   - `{ data: { data: T[] } }`     → nested `data` is returned
 *   - a single object with an `id`  → wrapped in a one-element array
 *   - null / undefined              → empty array (or null, per options)
 *
 * Element types are not verified at runtime — run the result through a Zod
 * schema at the call site if that matters. The assertions below are provably
 * unavoidable: `T` is a caller-supplied type parameter with no runtime guard.
 */
export function extractData<T>(
	result: SafeResult<T> | T | null | undefined,
	options: ExtractOptions = {}
): T[] | null {
	const { fallbackToEmptyArray = true, warnOnUnexpected = false } = options;
	const fallback: T[] | null = fallbackToEmptyArray ? [] : null;

	if (!isPresent(result)) return fallback;

	if (Array.isArray(result)) {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- T is a caller-supplied element type with no runtime guard available
		return result as T[];
	}

	const array = findArray(result);
	if (array) {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- T is a caller-supplied element type with no runtime guard available
		return array as T[];
	}

	if (isEntity(result)) {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- T is a caller-supplied element type with no runtime guard available
		return [result];
	}

	if (warnOnUnexpected) {
		console.warn("extractData: Unexpected data structure", result);
	}

	return fallback;
}

// ─── extractSingle ──────────────────────────────────────────────────────────

/**
 * Extract a single item from an API response. Handles the same shapes as
 * `extractData` plus:
 *   - `{ data: T }` where `T` is not an array → `data` is returned
 *   - a bare object with an `id`              → returned as-is
 *   - a bare scalar or record                 → returned as `T`
 *   - anything empty                          → `null`
 *
 * As with `extractData`, the assertions below are provably unavoidable: `T`
 * is a caller-supplied type parameter with no runtime guard available.
 */
export function extractSingle<T>(
	result: SafeResult<T> | T | null | undefined
): T | null {
	if (!isPresent(result)) return null;

	if (Array.isArray(result)) {
		if (result.length === 0) return null;
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- T is a caller-supplied element type with no runtime guard available
		return result[0] as T;
	}

	// Unwrap up to two levels of `{ data: ... }`. The loop replaces the
	// recursive-looking branch tree that previously mixed `isContainer`,
	// `isEntity`, and a trailing fallback — the fallback was shadowed by the
	// `isEntity` check, which dropped scalar payloads like `{ data: "abc" }`.
	let current: unknown = result;
	for (let depth = 0; depth < 2 && isEnvelope(current); depth += 1) {
		const inner = current.data;
		if (!isPresent(inner)) return null;

		if (Array.isArray(inner)) {
			if (inner.length === 0) return null;
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- T is a caller-supplied element type with no runtime guard available
			return inner[0] as T;
		}

		current = inner;
	}

	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- T is a caller-supplied element type with no runtime guard available
	return current as T;
}

// ─── React hooks ────────────────────────────────────────────────────────────

export interface ExtractDataResult<T> {
	data: T[];
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	isSuccess: boolean;
}

export interface ExtractSingleResult<T> {
	data: T | null;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	isSuccess: boolean;
}

function readStatus(result: SafeResult<unknown> | null | undefined): {
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	isSuccess: boolean;
} {
	return {
		isLoading: result?.isLoading ?? false,
		isError: isPresent(result?.error),
		error: result?.error ?? null,
		isSuccess: result?.isSuccess ?? false
	};
}

export function useExtractData<T>(
	result: SafeResult<T> | null | undefined,
	options: ExtractOptions = {}
): ExtractDataResult<T> {
	const status = readStatus(result);

	// `options` is intentionally included in the dependency array: callers who
	// pass a fresh object literal each render will recompute on every render.
	// Hoist the options object (or pass a `useMemo`-stable reference) if that
	// matters. See `useExtractDataStable` below for a convenience wrapper.
	const data = useMemo(
		() => extractData<T>(result, options) ?? [],
		[result, options]
	);

	return { ...status, data };
}

/**
 * Variant of `useExtractData` that accepts the two option flags as primitives,
 * so the memo is stable across renders without requiring the caller to hoist
 * the options object.
 */
export function useExtractDataStable<T>(
	result: SafeResult<T> | null | undefined,
	fallbackToEmptyArray = true,
	warnOnUnexpected = false
): ExtractDataResult<T> {
	const status = readStatus(result);

	const data = useMemo(
		() =>
			extractData<T>(result, { fallbackToEmptyArray, warnOnUnexpected }) ?? [],
		[result, fallbackToEmptyArray, warnOnUnexpected]
	);

	return { ...status, data };
}

export function useExtractSingle<T>(
	result: SafeResult<T> | null | undefined
): ExtractSingleResult<T> {
	const status = readStatus(result);
	const data = useMemo(() => extractSingle<T>(result), [result]);
	return { ...status, data };
}

// ─── extractPaginatedData ───────────────────────────────────────────────────

export interface PaginatedResult<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}

interface PaginatedShape<T> {
	data?: T[];
	total?: number;
	page?: number;
	limit?: number;
}

function isPaginatedShape<T>(v: unknown): v is PaginatedShape<T> {
	if (!isRecord(v)) return false;
	// Either `data` is present and an array, or the record carries at least one
	// pagination key. This rejects arbitrary records that happen to have a
	// numeric field without being paginated envelopes.
	const hasData = "data" in v && Array.isArray(v.data);
	const hasPaginationKeys = "total" in v || "page" in v || "limit" in v;
	return hasData || hasPaginationKeys;
}

/**
 * Extract `{ data, total, page, limit }` from either:
 *   - a raw paginated shape: `{ data: T[], total: number, ... }`
 *   - a wrapped one:         `{ data: { data: T[], total: number, ... } }`
 *
 * Missing fields default to empty array / zero. Malformed inputs return the
 * same empty shape rather than throwing — callers are rendering UI, not
 * validating API responses.
 */
export function extractPaginatedData<T>(
	result: SafeResult<PaginatedShape<T>> | null | undefined
): PaginatedResult<T> {
	const empty: PaginatedResult<T> = { data: [], total: 0, page: 0, limit: 0 };

	if (!isPresent(result) || typeof result !== "object") return empty;

	let shape: PaginatedShape<T> | null = null;

	if (isPaginatedShape<T>(result)) {
		shape = result;
	} else if (isEnvelope(result) && isPaginatedShape<T>(result.data)) {
		shape = result.data;
	}

	if (!shape) return empty;

	return {
		data: Array.isArray(shape.data) ? shape.data : [],
		total: typeof shape.total === "number" ? shape.total : 0,
		page: typeof shape.page === "number" ? shape.page : 0,
		limit: typeof shape.limit === "number" ? shape.limit : 0
	};
}

export function useExtractPaginatedData<T>(
	result: SafeResult<PaginatedShape<T>> | null | undefined
): PaginatedResult<T> {
	return useMemo(() => extractPaginatedData<T>(result), [result]);
}

// ─── isSafeResult ───────────────────────────────────────────────────────────

/**
 * Return `true` iff `value` looks like a `SafeResult<T>` envelope. Checks
 * field *types*, not just key presence, so `{ error: "oops" }` and
 * `{ isLoading: "yes" }` are rejected.
 *
 * The `data` field is not validated (it may be any `T`), so an object with
 * only `{ data: 1 }` still passes. Tighten to a specific schema at the call
 * site if that matters.
 */
export function isSafeResult<T>(value: unknown): value is SafeResult<T> {
	if (!isRecord(value)) return false;

	const hasData = "data" in value;
	const hasLoading =
		"isLoading" in value && typeof value.isLoading === "boolean";
	const hasErrorFlag = "isError" in value && typeof value.isError === "boolean";
	const hasError =
		"error" in value && (value.error === null || value.error instanceof Error);
	const hasSuccess =
		"isSuccess" in value && typeof value.isSuccess === "boolean";

	return hasData || hasLoading || hasErrorFlag || hasError || hasSuccess;
}

// ─── getNestedData ──────────────────────────────────────────────────────────

/**
 * Walk a path of keys into an unknown object and return the value at the end.
 * Returns `undefined` if any step is missing, or if a non-numeric key is used
 * to index an array.
 *
 * The return is `unknown` by design: this function has no runtime information
 * about the value at `path`, so it will not pretend otherwise. Callers narrow
 * with a type guard, or — when they genuinely know the shape — with a single
 * explicit `as T` at the call site. The cast is visible there rather than
 * hidden inside this helper.
 */
export function getNestedData(
	obj: unknown,
	path: (string | number)[]
): unknown {
	let current: unknown = obj;

	for (const key of path) {
		if (Array.isArray(current)) {
			if (typeof key !== "number") return undefined;
			current = current[key];
			continue;
		}

		if (!isRecord(current)) return undefined;

		current = current[String(key)];
	}

	return current;
}
