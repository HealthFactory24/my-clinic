import { EventClient } from "@tanstack/devtools-event-client";

export type StoreSnapshot = {
	store: string;
	state: unknown;
	timestamp: number;
};

// Define the event map — keys are event names (suffixes), values are payload types.
export type StoreEvents = {
	"state-changed": StoreSnapshot;
};

// Pass StoreEvents as the type argument to EventClient.
class StoreInspectorClient extends EventClient<StoreEvents> {
	constructor() {
		super({ pluginId: "tanstack-store-inspector" });
	}

	// Now `this.emit` is available and fully typed.
	emitStateChanged(store: string, state: unknown) {
		this.emit("state-changed", {
			store,
			state,
			timestamp: Date.now()
		});
	}
}

export const storeInspector = new StoreInspectorClient();
