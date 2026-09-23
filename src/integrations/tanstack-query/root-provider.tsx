import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
	defaultShouldDehydrateQuery,
	MutationCache,
	QueryCache,
	QueryClient
} from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import type { RegisteredRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { queryPersister } from "@/lib/query-persister";
import {
	appStore,
	authActions,
	authStore,
	uiActions,
	uiStore
} from "@/lib/store";
import { servicesStore } from "@/lib/store/services";

export function getContext() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5 * 60 * 1000,
				gcTime: 30 * 60 * 1000,
				refetchOnWindowFocus: true,
				refetchOnMount: true,
				refetchOnReconnect: true,
				throwOnError: false,
				...(queryPersister ? { persister: queryPersister.persisterFn } : {}),
				retry: 2
			},
			dehydrate: {
				shouldDehydrateQuery: query =>
					defaultShouldDehydrateQuery(query) || query.state.status === "pending"
			},
			mutations: {
				retry: 1,
				onError: (error: unknown) => {
					// Global mutation error handling with oRPC errors
					let message = "An unexpected error occurred.";

					if (error instanceof Error) {
						switch (error.message) {
							case "UNAUTHORIZED":
								message = "Please log in to continue.";
								setTimeout(() => {
									const navigate = (
										window as unknown as {
											__TANSTACK_ROUTER_NAVIGATE?: RegisteredRouter["navigate"];
										}
									).__TANSTACK_ROUTER_NAVIGATE;
									if (navigate) {
										navigate({ to: "/login", search: { redirect: "/" } });
									} else {
										window.location.href = "/login";
									}
								}, 1500);
								break;
							case "FORBIDDEN":
								message = "You don't have permission to perform this action.";
								break;
							case "NOT_FOUND":
								message = "The requested resource was not found.";
								break;
							case "CONFLICT":
								message = error.message || "A conflict occurred.";
								break;
							case "BAD_REQUEST":
								message =
									error.message || "Invalid request. Please check your input.";
								break;
							case "INTERNAL_SERVER_ERROR":
								message = "Something went wrong. Please try again later.";
								break;
							default:
								message = error.message || "An unexpected error occurred.";
						}
					}

					toast.error(message);
				}
			}
		}
	});
	const localStoragePersister = createAsyncStoragePersister({
		storage: typeof window !== "undefined" ? window.localStorage : undefined
	});
	persistQueryClient({
		queryClient,
		persister: localStoragePersister,
		maxAge: 1000 * 60 * 60 * 24 // Persist for 24 hours
	});
	const queryCache = new QueryCache({
		onError: (error: Error, query) => {
			// Only show refresh errors for existing data
			if (query.state.data !== undefined) {
				const message =
					error instanceof Error ? error.message : "Refresh failed";
				toast.error(`Error: ${message}`, {
					action: {
						onClick: () => {
							void queryClient.invalidateQueries({ queryKey: query.queryKey });
						},
						label: "Retry"
					}
				});
			}
		}
	});
	const mutationCache = new MutationCache({
		onSuccess: (_data, _variables, _context, mutation) => {
			const mutationKey = mutation.options?.mutationKey;
			if (!mutationKey || mutationKey.length === 0) return;

			const primaryKey = String(mutationKey[0]);
			void queryClient.invalidateQueries({ queryKey: [primaryKey] });

			const pluralMap: Record<string, string> = {
				patient: "patients",
				appointment: "appointments",
				clinic: "clinics",
				vaccination: "vaccinations",
				encounter: "encounters"
			};

			if (pluralMap[primaryKey]) {
				void queryClient.invalidateQueries({
					queryKey: [pluralMap[primaryKey]]
				});
			}

			if (
				[
					"patient",
					"patients",
					"appointment",
					"appointments",
					"vaccination",
					"vaccinations",
					"encounter",
					"encounters"
				].includes(primaryKey)
			) {
				void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			}

			if (mutationKey.some(k => String(k).includes("auth"))) {
				void queryClient.invalidateQueries({ queryKey: ["auth"] });
			}
		},
		// `mutation` is the 4th positional arg. This handler doesn't need it,
		// so it's omitted entirely (the previous `mutation` param was unused).
		onError: (error: Error) => {
			toast.error(`Error: ${error.message}`);
		}
	});

	return {
		queryClient,
		queryCache,
		mutationCache,
		// Modular store
		authStore,
		uiStore,
		appStore,
		servicesStore,
		authActions,
		uiActions
	};
}

export type Context = ReturnType<typeof getContext>;

const context = getContext();
export const { queryClient, queryCache, mutationCache } = context;
export const createQueryClient = () =>
	new QueryClient({
		defaultOptions: context.queryClient.getDefaultOptions()
	});

export default function TanstackQueryProvider() {}
