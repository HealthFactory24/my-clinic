// src/store/debug.ts
import { authStore, uiStore } from "./stores";

export const debugStore = {
	logAll: () => {
		console.group("📦 Store State");
		console.log("Auth:", authStore.state);
		console.log("UI:", uiStore.state);
		console.groupEnd();
	},

	subscribeToChanges: () => {
		const unsubAuth = authStore.subscribe(() => {
			console.debug("🔐 Auth changed:", authStore.state);
		});
		const unsubUI = uiStore.subscribe(() => {
			console.debug("🎨 UI changed:", uiStore.state);
		});
		return () => {
			unsubAuth.unsubscribe();
			unsubUI.unsubscribe();
		};
	}
};
