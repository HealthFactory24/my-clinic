import { PlusCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AddComponentsPopover } from "@/components/ui/ui-builder/internal/components/add-component-popover";
import { cn } from "@/lib/utils";

type DividerControlProps = {
	className?: string;
	addPosition?: number;
	parentLayerId: string;
};

export function DividerControl({
	className,
	addPosition,
	parentLayerId
}: DividerControlProps) {
	const [popoverOpen, setPopoverOpen] = useState(false);
	return (
		<div className={cn("relative py-0", className)}>
			<div
				aria-hidden='true'
				className='absolute inset-0 flex items-center'
			>
				<div className='w-full border-primary border-t border-dashed' />
			</div>
			<AddComponentsPopover
				addPosition={addPosition}
				onOpenChange={setPopoverOpen}
				parentLayerId={parentLayerId}
			>
				<Button
					className='group flex h-min items-center gap-0 rounded-full bg-secondary p-2 font-semibold text-secondar-foreground text-sm shadow-sm ring-1 ring-secondary ring-inset transition-all duration-200 ease-in-out'
					variant='outline'
				>
					<PlusCircle className='h-5 w-5 text-secondary-foreground' />
					<span className='sr-only'>Add component</span>
					<span
						className={cn(
							"max-w-0 overflow-hidden transition-all duration-200 ease-in-out group-hover:max-w-xs group-hover:ps-2",
							popoverOpen ? "max-w-xs ps-2" : "max-w-0"
						)}
					>
						Add component
					</span>
				</Button>
			</AddComponentsPopover>
		</div>
	);
}
