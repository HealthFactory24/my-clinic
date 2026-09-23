"use client";

import type { LucideIcon } from "lucide-react";
import type React from "react";

export interface TablePageHeaderProps {
	title: string;
	subtitle: string;
	total: number;
	actionIcon: LucideIcon;
	actionLabel: string;
	onAction: () => void;
}

export function TablePageHeader({
	title,
	subtitle,
	total,
	actionIcon: ActionIcon,
	actionLabel,
	onAction
}: TablePageHeaderProps): React.ReactNode {
	return (
		<header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
			<div>
				<div className='flex items-center gap-2'>
					<h1 className='font-bold text-2xl text-slate-800'>{title}</h1>
					<span className='rounded-full bg-teal-100 px-2.5 py-0.5 font-bold text-teal-800 text-xs'>
						{total} total
					</span>
				</div>
				<p className='mt-0.5 text-slate-500 text-xs'>{subtitle}</p>
			</div>

			<button
				className='flex items-center gap-2 self-start rounded-xl bg-teal-600 px-4 py-2.5 font-bold text-white text-xs shadow-xs transition-colors hover:bg-teal-700 sm:self-auto'
				onClick={onAction}
				type='button'
			>
				<ActionIcon className='size-4' />
				{actionLabel}
			</button>
		</header>
	);
}
