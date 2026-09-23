// src/components/layout/types.ts
import type { ReactNode } from "react";

export interface BreadcrumbItem {
	label: string;
	href?: string;
}

export interface NavItem {
	label: string;
	to: string;
	icon: React.ReactNode;
	badge?: number;
}

export interface AppLayoutProps {
	children?: React.ReactNode;
}

export interface AppShellProps {
	children: ReactNode;
	title?: string;
	subtitle?: string;
	breadcrumbs?: BreadcrumbItem[];
	className?: string;
	actions?: ReactNode;
	maxWidth?: "sm" | "md" | "lg" | "xl" | "full" | "prose";
}
