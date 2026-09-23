// src/hooks/use-extract-data.ts
import { useMemo } from "react";

import { extractData, extractSingle } from "@/utils/data-extract";

/**
 * Minimal structural shape that a TanStack Query result satisfies.
 *
 * This is declared locally, not imported from `@/utils/data-extract`, so a
 * misconfigured path alias or a stale `data-extract.ts` cannot silently
 * collapse the parameter type to `any` (which is what produced the
 * `typescript(no-redundant-type-constituents)` diagnostics on the three
 * `queryResult: SafeResult<T> | null | undefined` annotations).
 *
 * The three optional members are structurally compatible with TanStack
 * Query's `UseQueryResult<T>` without a cast.
 */
export interface QueryResultLike<T> {
	data?: T | null;
	error?: Error | null;
	isLoading?: boolean;
	isSuccess?: boolean;
}

/**
 * A hook that extracts data from a query result and memoizes the result.
 *
 * Returns `T[]` unconditionally. `extractData` returns `T[] | null` only when
 * `fallbackToEmptyArray: false` is passed; the default (`true`) always yields
 * an array, so `?? []` is the safe coercion for consumers that rely on `T[]`.
 */
export function useExtractData<T>(
	queryResult: QueryResultLike<T> | null | undefined,
	options?: { fallbackToEmptyArray?: boolean; warnOnUnexpected?: boolean }
): T[] {
	return useMemo(
		// `extractData` is structurally typed to accept anything, so the narrower
		// `QueryResultLike<T>` is a valid argument without a cast.
		() =>
			extractData<T>(
				queryResult as Parameters<typeof extractData<T>>[0],
				options
			) ?? [],
		[queryResult, options]
	);
}

/**
 * A hook that extracts a single item from a query result.
 */
export function useExtractSingle<T>(
	queryResult: QueryResultLike<T> | null | undefined
): T | null {
	return useMemo(
		() =>
			extractSingle<T>(queryResult as Parameters<typeof extractSingle<T>>[0]),
		[queryResult]
	);
}

/**
 * Extract data with loading/error state tracking.
 *
 * NOTE: `refetch` and `isFetching` are hard-coded here because
 * `QueryResultLike<T>` does not carry them. Callers that need real values for
 * those two fields should pass the full TanStack `UseQueryResult<T>` to
 * `useExtractDataWithState` in `#/hooks/use-extract-data-with-state` instead.
 */
export function useExtractDataWithState<T>(
	queryResult: QueryResultLike<T> | null | undefined,
	options?: { fallbackToEmptyArray?: boolean; warnOnUnexpected?: boolean }
) {
	const data = useExtractData<T>(queryResult, options);
	return {
		data,
		isLoading: queryResult?.isLoading ?? false,
		isError: queryResult?.error !== undefined && queryResult?.error !== null,
		error: queryResult?.error ?? null,
		isSuccess: queryResult?.isSuccess ?? false,
		refetch: () => Promise.resolve(),
		isFetching: false
	};
}
