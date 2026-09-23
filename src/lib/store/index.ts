// src/store/index.ts

// ─── Imports (hoisted to top per convention) ──────────────────────────────
import { useSelector } from "@tanstack/react-store";

import type { User } from "#/lib/auth/auth.ts";

import { authActions, uiActions } from "./actions";
import { storeEffects } from "./effects";
import { StoreProvider } from "./provider";
import { appStore, authStore, uiStore } from "./stores";

// ─── Re-exports ───────────────────────────────────────────────────────────
export {
	useAuthLoading,
	useAuthUser,
	useIsAuthenticated,
	useNotifications,
	useSidebarCollapsed,
	useSidebarOpen,
	useTheme,
	useUnreadNotifications
} from "./selectors";

export { appStore, authActions, authStore, StoreProvider, uiActions, uiStore };

// ─── Types ────────────────────────────────────────────────────────────────

export type AuthState = {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
};

export type Notification = {
	id: string;
	type: "info" | "success" | "warning" | "error";
	message: string;
	title?: string;
	duration?: number;
	read: boolean;
};

/**
 * UIState mirrors the shape of `uiStore` in `./stores.ts`.
 *
 * Kept in sync manually — if `uiStore` changes, update this too (or better:
 * `export type UIState = typeof uiStore.state` once tanstack/store's types
 * allow it cleanly).
 */
export type UIState = {
	sidebar: {
		isOpen: boolean;
		isCollapsed: boolean;
	};
	theme: "light" | "dark" | "system";
	notifications: Notification[];
	modal: {
		type: string | null;
		data: Record<string, unknown> | null;
	};
};

export type AppStoreState = {
	auth: AuthState;
	ui: UIState;
};

// ─── Hooks ────────────────────────────────────────────────────────────────

export const useAuthStore = <T>(selector: (state: AuthState) => T): T =>
	useSelector(authStore, selector);

export const useUIStore = <T>(selector: (state: UIState) => T): T =>
	useSelector(uiStore, selector);

export const useAppStore = () => {
	const auth = useSelector(authStore);
	const ui = useSelector(uiStore);
	return { auth, ui };
};

// ─── Utilities ────────────────────────────────────────────────────────────

export const storeUtils = {
	resetAll: () => {
		authStore.setState(() => ({
			user: null,
			isAuthenticated: false,
			isLoading: false
		}));
		uiStore.setState(() => ({
			sidebar: { isOpen: true, isCollapsed: false },
			theme: "system",
			notifications: [],
			modal: { type: null, data: null }
		}));
	},

	clearAllNotifications: () => {
		uiStore.setState(state => ({
			...state,
			notifications: []
		}));
	},

	markAllNotificationsRead: () => {
		uiStore.setState(state => ({
			...state,
			notifications: state.notifications.map(n => ({ ...n, read: true }))
		}));
	}
};

// ─── Side effects (persistence) — defined in ./effects.ts ────────────────
export { storeEffects };

// ─── Convenience namespace ────────────────────────────────────────────────

export const store = {
	// State
	auth: authStore,
	ui: uiStore,
	app: appStore,

	// Actions
	...authActions,
	...uiActions,

	// Hooks
	useAuth: useAuthStore,
	useUI: useUIStore,
	useApp: useAppStore,

	// Utilities
	utils: storeUtils,
	effects: storeEffects
};
