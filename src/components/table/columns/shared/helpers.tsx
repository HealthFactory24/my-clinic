import type { AppColumnHelper, RowData } from "@tanstack/react-table";
import type { ComponentType, ReactNode } from "react";

import type { TanstackFeatures } from "#/components/table/features.ts";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Keys registered in `table.ts` under `cellComponents`. */

export type AppCellComponents = {
	SelectCell: ComponentType;
	TextCell: ComponentType;
	AgeCell: ComponentType;
	StatusCell: ComponentType;
	DateCell: ComponentType;
	GroupedCell: ComponentType;
	ActionsCell: ComponentType;
	AgeAggregatedCell: ComponentType;
	JoinDateAggregatedCell: ComponentType;
};

export type AppHeaderComponents = {
	ColumnHeader: ComponentType;
	SelectAllHeader: ComponentType;
	ResizeHandle: ComponentType;
};

type AnyHelper<TData extends RowData> = AppColumnHelper<
	TanstackFeatures,
	TData,
	AppCellComponents,
	AppHeaderComponents
>;

export function selectColumn<TData extends RowData>(helper: AnyHelper<TData>) {
	return helper.display({
		id: "select",
		header: ({ header }) => <header.SelectAllHeader />,
		cell: ({ cell }) => <cell.SelectCell />,
		size: 40,
		maxSize: 40,
		enableSorting: false,
		enableHiding: false,
		enableResizing: false
	});
}

export interface ActionsColumnOptions<TData> {
	label?: string;
	size?: number;
	maxSize?: number;
	renderExtra?: (row: TData) => ReactNode;
}

export function actionsColumn<TData extends { id: string }>(
	helper: AnyHelper<TData>,
	buildHref: (row: TData) => string,
	options?: ActionsColumnOptions<TData>
) {
	return helper.display({
		id: "actions",
		header: "Actions",
		cell: ({ row }) => (
			<div className='flex items-center gap-1'>
				<a
					className={cn(
						buttonVariants({ size: "sm", variant: "ghost" }),
						"h-8 px-2.5 text-xs"
					)}
					href={buildHref(row.original)}
				>
					{options?.label ?? "View"}
				</a>
				{options?.renderExtra?.(row.original)}
			</div>
		),
		size: options?.size ?? 80,
		maxSize: options?.maxSize ?? 120,
		enableSorting: false,
		enableHiding: false,
		enableResizing: false
	});
}
