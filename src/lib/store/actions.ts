// packages/tanstack/src/store/actions.ts
import type { User } from "@/lib/auth/auth";

import {
	authStore,
	type ModalType,
	type Theme,
	type UINotification,
	uiStore
} from "./stores";

// Auth Actions
export const authActions = {
	setUser: (user: User) => {
		authStore.setState(state => ({
			...state,
			user,
			isAuthenticated: !!user
		}));
	},

	setLoading: (isLoading: boolean) => {
		authStore.setState(state => ({
			...state,
			isLoading
		}));
	},

	logout: () => {
		authStore.setState(() => ({
			user: null,
			isAuthenticated: false,
			isLoading: false
		}));
	}
};

// UI Actions

const AUTO_DISMISS_MS = 5000;

export const uiActions = {
	// Sidebar
	toggleSidebar: () => {
		uiStore.setState(state => ({
			...state,
			sidebar: { ...state.sidebar, isOpen: !state.sidebar.isOpen }
		}));
	},
	setSidebarOpen: (isOpen: boolean) => {
		uiStore.setState(state => ({
			...state,
			sidebar: { ...state.sidebar, isOpen }
		}));
	},
	toggleSidebarCollapse: () => {
		uiStore.setState(state => ({
			...state,
			sidebar: { ...state.sidebar, isCollapsed: !state.sidebar.isCollapsed }
		}));
	},

	// Theme
	setTheme: (theme: Theme) => {
		uiStore.setState(state => ({ ...state, theme }));
	},
	toggleTheme: () => {
		uiStore.setState(state => ({
			...state,
			theme: state.theme === "dark" ? "light" : "dark"
		}));
	},

	// Notifications
	addNotification: (
		notification: Omit<UINotification, "id" | "read"> & { duration?: number }
	) => {
		const id = crypto.randomUUID();
		uiStore.setState(state => ({
			...state,
			notifications: [
				...state.notifications,
				{ ...notification, id, read: false }
			]
		}));

		// duration === 0 means "sticky until manually dismissed"
		if (notification.duration !== 0) {
			setTimeout(() => {
				uiActions.removeNotification(id);
			}, notification.duration ?? AUTO_DISMISS_MS);
		}
	},
	markNotificationRead: (id: string) => {
		uiStore.setState(state => ({
			...state,
			notifications: state.notifications.map(n =>
				n.id === id ? { ...n, read: true } : n
			)
		}));
	},
	removeNotification: (id: string) => {
		uiStore.setState(state => ({
			...state,
			notifications: state.notifications.filter(n => n.id !== id)
		}));
	},
	clearNotifications: () => {
		uiStore.setState(state => ({ ...state, notifications: [] }));
	},

	// Modal
	openModal: (type: ModalType, data: Record<string, unknown> | null = null) => {
		uiStore.setState(state => ({ ...state, modal: { type, data } }));
	},
	closeModal: () => {
		uiStore.setState(state => ({
			...state,
			modal: { type: null, data: null }
		}));
	}
};
