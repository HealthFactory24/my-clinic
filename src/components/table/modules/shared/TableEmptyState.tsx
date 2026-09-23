"use client";

import type { LucideIcon } from "lucide-react";
import type React from "react";

export interface TableEmptyStateProps {
	icon: LucideIcon;
	hasFilters: boolean;
	entityName: string; // "appointments", "patients", ...
	emptyMessage: string; // "Schedule your first appointment to get started."
	filteredMessage?: string; // defaults to "Try adjusting your search or filter criteria."
	actionLabel?: string;
	onAction?: () => void;
}

export function TableEmptyState({
	icon: Icon,
	hasFilters,
	entityName,
	emptyMessage,
	filteredMessage = "Try adjusting your search or filter criteria.",
	actionLabel,
	onAction
}: TableEmptyStateProps): React.ReactNode {
	return (
		<div className='rounded-2xl border border-slate-300 border-dashed bg-white p-12 text-center'>
			<Icon className='mx-auto mb-3 size-10 text-slate-300' />
			<h3 className='font-bold text-slate-700 text-sm'>
				{hasFilters ? `No matching ${entityName}` : `No ${entityName} yet`}
			</h3>
			<p className='mx-auto mt-1 max-w-sm text-slate-500 text-xs'>
				{hasFilters ? filteredMessage : emptyMessage}
			</p>
			{!hasFilters && actionLabel && onAction ? (
				<button
					className='mt-4 rounded-xl bg-teal-600 px-4 py-2 font-bold text-white text-xs'
					onClick={onAction}
					type='button'
				>
					{actionLabel}
				</button>
			) : null}
		</div>
	);
}
