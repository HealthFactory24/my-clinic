"use client";

import { AlertCircle } from "lucide-react";
import type React from "react";

export interface TableErrorStateProps {
	entityName: string;
	message?: string;
	onRetry: () => void;
}

export function TableErrorState({
	entityName,
	message,
	onRetry
}: TableErrorStateProps): React.ReactNode {
	return (
		<div className='rounded-2xl border border-rose-200 bg-rose-50 p-12 text-center'>
			<AlertCircle className='mx-auto mb-3 size-10 text-rose-500' />
			<div className='font-bold text-rose-700 text-sm'>
				Error loading {entityName}
			</div>
			<p className='mt-1 text-rose-600 text-xs'>{message}</p>
			<button
				className='mt-4 rounded-xl bg-teal-600 px-4 py-2 font-bold text-white text-xs'
				onClick={onRetry}
				type='button'
			>
				Retry
			</button>
		</div>
	);
}
