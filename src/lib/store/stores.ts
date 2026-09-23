import { Store } from "@tanstack/react-store";

import type { User } from "@/lib/auth/auth";

export type Theme = "light" | "dark" | "system";

export type UINotification = {
	id: string;
	type: "info" | "success" | "warning" | "error";
	message: string;
	title?: string;
	duration?: number;
	read: boolean;
};

// Auth store
export const authStore = new Store<{
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}>({
	user: null,
	isAuthenticated: false,
	isLoading: false
});

export type ModalType =
	| "new-patient"
	| "edit-patient"
	| "new-encounter"
	| "new-vitals"
	| "new-appointment"
	| "new-growth"
	| "new-vaccine"
	| "new-rx"
	| "dosage-calc"
	| "new-lab"
	| "command-palette";

export const uiStore = new Store<{
	sidebar: {
		isOpen: boolean;
		isCollapsed: boolean;
	};
	theme: Theme;
	notifications: UINotification[];
	modal: {
		type: ModalType | null;
		data: Record<string, unknown> | null;
	};
}>({
	sidebar: { isOpen: true, isCollapsed: false },
	theme: "system",
	notifications: [],
	modal: { type: null, data: null }
});

// App store (combines all stores)
export const appStore = {
	auth: authStore,
	ui: uiStore
};
