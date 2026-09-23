import {
	ClipboardCopyIcon,
	DotsHorizontalIcon,
	DownloadIcon,
	Link2Icon,
	SizeIcon
} from "@radix-ui/react-icons";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ImageActionsProps {
	shouldMerge?: boolean;
	isLink?: boolean;
	onView?: () => void;
	onDownload?: () => void;
	onCopy?: () => void;
	onCopyLink?: () => void;
}

interface ActionButtonProps extends React.ComponentProps<"button"> {
	icon: React.ReactNode;
	tooltip: string;
}

export const ActionWrapper = ({
	children,
	className,
	...props
}: React.ComponentProps<"div">) => (
	<div
		className={cn(
			"absolute end-3 top-3 flex flex-row rounded px-0.5 opacity-0 group-hover/node-image:opacity-100",
			"border-[0.5px] bg-[var(--mt-bg-secondary)] [backdrop-filter:saturate(1.8)_blur(20px)]",
			className
		)}
		{...props}
	>
		{children}
	</div>
);

ActionWrapper.displayName = "ActionWrapper";

export const ActionButton = ({
	icon,
	tooltip,
	className,
	...props
}: ActionButtonProps) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<Button
				className={cn(
					"relative flex h-7 w-7 flex-row rounded-none p-0 text-muted-foreground hover:text-foreground",
					"bg-transparent hover:bg-transparent",
					className
				)}
				variant='ghost'
				{...props}
			>
				{icon}
			</Button>
		</TooltipTrigger>
		<TooltipContent side='bottom'>{tooltip}</TooltipContent>
	</Tooltip>
);

ActionButton.displayName = "ActionButton";

type ActionKey = "onView" | "onDownload" | "onCopy" | "onCopyLink";

const ActionItems: Array<{
	key: ActionKey;
	icon: React.ReactNode;
	tooltip: string;
	isLink?: boolean;
}> = [
	{
		key: "onView",
		icon: <SizeIcon />,
		tooltip: "View image"
	},
	{
		key: "onDownload",
		icon: <DownloadIcon />,
		tooltip: "Download image"
	},
	{
		key: "onCopy",
		icon: <ClipboardCopyIcon />,
		tooltip: "Copy image to clipboard"
	},
	{
		key: "onCopyLink",
		icon: <Link2Icon />,
		tooltip: "Copy image link",
		isLink: true
	}
];

export const ImageActions: React.FC<ImageActionsProps> = ({
	shouldMerge = false,
	isLink = false,
	...actions
}) => {
	const [isOpen, setIsOpen] = React.useState(false);

	const handleAction = React.useCallback(
		(e: React.MouseEvent, action: (() => void) | undefined) => {
			e.preventDefault();
			e.stopPropagation();
			action?.();
		},
		[]
	);

	const filteredActions = React.useMemo(
		() => ActionItems.filter(item => isLink || !item.isLink),
		[isLink]
	);

	return (
		<ActionWrapper className={cn({ "opacity-100": isOpen })}>
			{shouldMerge ? (
				<DropdownMenu
					onOpenChange={setIsOpen}
					open={isOpen}
				>
					<DropdownMenuTrigger asChild>
						<ActionButton
							icon={<DotsHorizontalIcon />}
							onClick={e => e.preventDefault()}
							tooltip='Open menu'
						/>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align='end'
						className='w-56'
					>
						{filteredActions.map(({ key, icon, tooltip }) => (
							<DropdownMenuItem
								key={key}
								onClick={e => handleAction(e, actions[key])}
							>
								<div className='flex flex-row items-center gap-2'>
									{icon}
									<span>{tooltip}</span>
								</div>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				filteredActions.map(({ key, icon, tooltip }) => (
					<ActionButton
						icon={icon}
						key={key}
						onClick={e => handleAction(e, actions[key])}
						tooltip={tooltip}
					/>
				))
			)}
		</ActionWrapper>
	);
};

ImageActions.displayName = "ImageActions";
