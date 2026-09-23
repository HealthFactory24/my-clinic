// src/lib/tanstack/store/effects.ts

import { uiStore } from "./stores";

// ─── Side effects (persistence) ───────────────────────────────────────────

type Theme = "light" | "dark" | "system";

function isTheme(v: string): v is Theme {
	return v === "light" || v === "dark" || v === "system";
}

export const storeEffects = {
	persistTheme: () => {
		return uiStore.subscribe(() => {
			const { theme } = uiStore.state;
			if (typeof window === "undefined") return;
			localStorage.setItem("theme", theme);
			document.documentElement.className = theme === "system" ? "" : theme;
		});
	},

	persistSidebar: () => {
		return uiStore.subscribe(() => {
			const { sidebar } = uiStore.state;
			if (typeof window === "undefined") return;
			localStorage.setItem("sidebarOpen", String(sidebar.isOpen));
			localStorage.setItem("sidebarCollapsed", String(sidebar.isCollapsed));
		});
	},

	restorePersisted: () => {
		if (typeof window === "undefined") return;

		const themeRaw = localStorage.getItem("theme");
		if (themeRaw !== null && isTheme(themeRaw)) {
			const theme = themeRaw;
			uiStore.setState(state => ({ ...state, theme }));
			document.documentElement.className = theme === "system" ? "" : theme;
		}

		const sidebarOpen = localStorage.getItem("sidebarOpen");
		const sidebarCollapsed = localStorage.getItem("sidebarCollapsed");
		if (sidebarOpen !== null || sidebarCollapsed !== null) {
			uiStore.setState(state => ({
				...state,
				sidebar: {
					isOpen:
						sidebarOpen === null
							? state.sidebar.isOpen
							: sidebarOpen === "true",
					isCollapsed:
						sidebarCollapsed === null
							? state.sidebar.isCollapsed
							: sidebarCollapsed === "true"
				}
			}));
		}
	}
};
