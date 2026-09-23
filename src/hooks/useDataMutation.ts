import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type UseDataMutationOptions<TData, TVariables> = {
	mutationFn: (variables: TVariables) => Promise<TData>;
	successMessage?: string;
	errorMessage?: string;
	invalidateQueries?: string[][];
	onSuccess?: (data: TData, variables: TVariables) => void;
	onError?: (error: Error, variables: TVariables) => void;
};

export function useDataMutation<TData = unknown, TVariables = unknown>({
	mutationFn,
	successMessage,
	errorMessage,
	invalidateQueries = [],
	onSuccess,
	onError
}: UseDataMutationOptions<TData, TVariables>) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn,
		onSuccess: (data, variables) => {
			if (successMessage) {
				toast.success(successMessage);
			}
			// Invalidate queries
			for (const queryKey of invalidateQueries) {
				void queryClient.invalidateQueries({ queryKey });
			}
			onSuccess?.(data, variables);
		},
		onError: (error: Error, variables) => {
			const message = error.message || errorMessage || "An error occurred";
			toast.error(message);
			onError?.(error, variables);
		}
	});
}
