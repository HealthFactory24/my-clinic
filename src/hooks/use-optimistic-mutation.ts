// src/hooks/use-optimistic-mutation.ts

import {
	type UseMutationResult,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";

/**
 * Generic optimistic-update helper.
 *
 * Only used for the three highest-traffic status updates in this pass:
 *   - useUpdateAppointmentStatus
 *   - useUpdateVitals
 *   - useUpdatePrescriptionStatus
 *
 * Do not use it anywhere else in this pass.
 */

// hooks/use-optimistic-mutation.ts
export function useOptimisticMutation<TData, TVariables>({
	mutationFn,
	queryKey,
	optimisticUpdate,
	rollback,
	invalidateKeys
}: {
	mutationFn: (vars: TVariables) => Promise<TData>;
	/** Either a static key, or a function that derives the key from the mutation vars. */
	queryKey: readonly unknown[] | ((vars: TVariables) => readonly unknown[]);
	optimisticUpdate: (
		previous: TData | undefined,
		vars: TVariables
	) => TData | undefined;
	rollback?: (snapshot: TData | undefined, vars: TVariables) => void;
	/** Keys to invalidate on settle. Defaults to `[resolvedKey]`. */
	invalidateKeys?: (
		resolvedKey: readonly unknown[],
		vars: TVariables
	) => ReadonlyArray<readonly unknown[]>;
}): UseMutationResult<TData, Error, TVariables> {
	const queryClient = useQueryClient();

	return useMutation<TData, Error, TVariables, TData | undefined>({
		mutationFn,
		onMutate: async vars => {
			const key = typeof queryKey === "function" ? queryKey(vars) : queryKey;
			await queryClient.cancelQueries({ queryKey: key });
			const previous = queryClient.getQueryData<TData>(key);
			const next = optimisticUpdate(previous, vars);
			if (next !== undefined) queryClient.setQueryData<TData>(key, next);
			return previous;
		},
		onError: (_err, vars, snapshot) => {
			if (snapshot !== undefined) {
				rollback?.(snapshot, vars);
				const key = typeof queryKey === "function" ? queryKey(vars) : queryKey;
				queryClient.setQueryData<TData>(key, snapshot);
			}
		},
		onSettled: (_data, _err, vars) => {
			const resolvedKey =
				typeof queryKey === "function" ? queryKey(vars) : queryKey;
			const keys = invalidateKeys
				? invalidateKeys(resolvedKey, vars)
				: [resolvedKey];
			for (const k of keys) {
				void queryClient.invalidateQueries({ queryKey: k });
			}
		}
	});
}
