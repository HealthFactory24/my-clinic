// src/lib/query-persister.ts

import { experimental_createQueryPersister } from "@tanstack/query-persist-client-core";
import { createStore, del, get, set } from "idb-keyval";

const queryStore =
	typeof window === "undefined"
		? undefined
		: createStore("pedia-care-query-cache", "query-cache");

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Persist only queries whose first key segment is a stable string.
 *
 * Server-function-backed queries carry an ephemeral function ID as part of
 * their key. That ID is regenerated on every dev-server restart, so a
 * rehydrated entry re-fires a fetch against a stale ID and produces
 * `Invalid server function ID`. Excluding those queries from persistence
 * keeps IndexedDB hydration safe across dev restarts and across deploys
 * where server functions may have changed shape.
 *
 * @tanstack/react-query's own guidance is that persisted queries must be
 * keyed by data identity, not by transport identity. The `_serverFn`
 * prefix (or whatever your server-fn query keys begin with) is transport.
 */
const PERSIST_PREFIX_BLOCKLIST = ["_serverFn", "server-fn"];

function shouldPersistQueryKey(queryKey: readonly unknown[]): boolean {
	const head = queryKey[0];
	if (typeof head !== "string") return false;
	return !PERSIST_PREFIX_BLOCKLIST.some(prefix => head.startsWith(prefix));
}

export const queryPersister =
	queryStore === undefined
		? undefined
		: experimental_createQueryPersister({
				storage: {
					getItem: (key: string) => get<string>(key, queryStore),
					setItem: (key: string, value: string) => set(key, value, queryStore),
					removeItem: (key: string) => del(key, queryStore)
				},
				maxAge: MAX_AGE_MS,
				filters: {
					// Reject any persisted query whose key isn't a stable, data-identity
					// key. Server-function calls are never safe to persist.
					predicate: query => shouldPersistQueryKey(query.queryKey)
				}
			});
