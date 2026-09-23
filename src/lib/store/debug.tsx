import { storeInspector } from "#/components/providers/store-client.ts";

import { servicesStore } from "./services";
import { appStore, authStore, uiStore } from "./stores";

/**
 * Subscribe every store to the TanStack Devtools event bus.
 * Returns a single cleanup function that unsubscribes all of them.
 */
export function subscribeStoresToDevtools() {
	if (typeof window === "undefined") return () => {};

	const subs = [
		authStore.subscribe(() =>
			storeInspector.emitStateChanged("auth", authStore.state)
		),
		uiStore.subscribe(() =>
			storeInspector.emitStateChanged("ui", uiStore.state)
		),
		servicesStore.subscribe(() =>
			storeInspector.emitStateChanged("services", servicesStore.state)
		)
	];

	// Emit initial snapshots immediately so the panel isn't empty
	storeInspector.emitStateChanged("auth", authStore.state);
	storeInspector.emitStateChanged("ui", uiStore.state);
	storeInspector.emitStateChanged("services", servicesStore.state);

	// Keep `appStore` referenced so tree-shakers don't drop it if you
	// later switch it from an object to a real Store instance.
	void appStore;

	return () => {
		for (const sub of subs) sub.unsubscribe();
	};
}
