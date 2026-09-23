// src/lib/store/provider.tsx
import { type ReactNode, useEffect } from "react";

import { storeEffects } from "./effects";

interface StoreProviderProps {
	children: ReactNode;
	/** Enable debug subscriptions in development (default: false) */
	debug?: boolean;
	/** Enable localStorage persistence for theme and sidebar state (default: true) */
	persist?: boolean;
}

function isFunction(v: unknown): v is () => void {
	return typeof v === "function";
}

function isUnsubscribeable(v: unknown): v is { unsubscribe: () => void } {
	return (
		typeof v === "object" &&
		v !== null &&
		"unsubscribe" in v &&
		typeof (v as Record<string, unknown>).unsubscribe === "function"
	);
}

export function StoreProvider({
	children,
	persist = true,
	debug = false
}: StoreProviderProps) {
	useEffect(() => {
		if (!persist) return undefined;

		storeEffects.restorePersisted();
		const subTheme = storeEffects.persistTheme();
		const subSidebar = storeEffects.persistSidebar();

		return () => {
			subTheme.unsubscribe();
			subSidebar.unsubscribe();
		};
	}, [persist]);

	useEffect(() => {
		if (!debug || process.env.NODE_ENV !== "development") return undefined;

		let cleanupFn: (() => void) | undefined;

		void import("./debug").then(({ debugStore }) => {
			const result: unknown = debugStore.subscribeToChanges();

			if (isFunction(result)) {
				cleanupFn = result;
				return;
			}

			if (isUnsubscribeable(result)) {
				const unsubscribe = result.unsubscribe.bind(result);
				cleanupFn = () => unsubscribe();
			}
		});

		return () => {
			cleanupFn?.();
		};
	}, [debug]);

	return <>{children}</>;
}
