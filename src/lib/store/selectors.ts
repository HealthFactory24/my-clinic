import { useSelector } from "@tanstack/react-store";

import { authStore, uiStore } from "./stores";

// Auth selectors
export const useAuthUser = () => useSelector(authStore, s => s.user);
export const useIsAuthenticated = () =>
	useSelector(authStore, s => s.isAuthenticated);
export const useAuthLoading = () => useSelector(authStore, s => s.isLoading);

// UI selectors
export const useSidebarOpen = () => useSelector(uiStore, s => s.sidebar.isOpen);
export const useSidebarCollapsed = () =>
	useSelector(uiStore, s => s.sidebar.isCollapsed);
export const useTheme = () => useSelector(uiStore, s => s.theme);
export const useNotifications = () =>
	useSelector(uiStore, s => s.notifications);
export const useUnreadNotifications = () =>
	useSelector(uiStore, s => s.notifications.filter(n => !n.read));
