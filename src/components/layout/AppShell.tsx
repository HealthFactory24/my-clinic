// src/components/layout/AppShell.tsx
import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "#/lib/utils";

import type { BreadcrumbItem } from "./types";

interface AppShellProps {
	children: ReactNode;
	title?: string;
	subtitle?: string;
	breadcrumbs?: BreadcrumbItem[];
	className?: string;
	actions?: ReactNode;
	maxWidth?: "sm" | "md" | "lg" | "xl" | "full" | "prose";
}

const maxWidthClasses = {
	sm: "max-w-3xl",
	md: "max-w-4xl",
	lg: "max-w-5xl",
	xl: "max-w-6xl",
	full: "max-w-full",
	prose: "max-w-prose"
};

export function AppShell({
	children,
	title,
	subtitle,
	breadcrumbs,
	className,
	actions,
	maxWidth = "lg"
}: AppShellProps) {
	return (
		<div
			className={cn(
				"min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-950",
				className
			)}
		>
			<div className={cn("mx-auto", maxWidthClasses[maxWidth])}>
				{/* Breadcrumbs */}
				{breadcrumbs && breadcrumbs.length > 0 && (
					<nav
						aria-label='Breadcrumb'
						className='mb-4 flex items-center gap-1 text-muted-foreground text-sm'
					>
						{breadcrumbs.map((item, index) => {
							const isLast = index === breadcrumbs.length - 1;
							return (
								<div
									className='flex items-center gap-1'
									key={item.label}
								>
									{index === 0 ? (
										<Home className='size-3.5' />
									) : (
										<ChevronRight className='size-3.5' />
									)}
									{item.href && !isLast ? (
										<Link
											className='transition-colors hover:text-foreground'
											to={item.href}
										>
											{item.label}
										</Link>
									) : (
										<span
											className={cn(
												isLast ? "font-medium text-foreground" : ""
											)}
										>
											{item.label}
										</span>
									)}
								</div>
							);
						})}
					</nav>
				)}

				{/* Header */}
				{(title || subtitle || actions) && (
					<div className='mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
						<div>
							{title && (
								<h1 className='font-bold text-2xl text-foreground tracking-tight sm:text-3xl'>
									{title}
								</h1>
							)}
							{subtitle && (
								<p className='mt-1 text-muted-foreground text-sm sm:text-base'>
									{subtitle}
								</p>
							)}
						</div>
						{actions && (
							<div className='flex shrink-0 items-center gap-2'>{actions}</div>
						)}
					</div>
				)}

				{/* Content */}
				<div>{children}</div>
			</div>
		</div>
	);
}
