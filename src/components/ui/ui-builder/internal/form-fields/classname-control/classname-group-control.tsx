import { MoreVertical } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
	CONFIG,
	type ConfigItem,
	type StateType
} from "@/components/ui/ui-builder/internal/form-fields/classname-control/config";

const EMPTY_OBJECT = {};

type ClassNameGroupControlProps = {
	groupConfig: ConfigItem;
	group: {
		label: string;
		keys: string[];
	};
	state: StateType;
	handleStateChange: (
		key: keyof StateType,
		value: string | string[] | null
	) => void;
	handleGroupKeySelect: (groupLabel: string, key: string) => void;
	selectedKey: string | string[] | null;
};

export function ClassNameGroupControl({
	groupConfig,
	group,
	state,
	handleStateChange,
	handleGroupKeySelect,
	selectedKey
}: ClassNameGroupControlProps) {
	// Memoize the conditional spread props
	const spreadProps = useMemo(
		() =>
			"multiple" in groupConfig
				? { multiple: groupConfig.multiple }
				: EMPTY_OBJECT,
		[groupConfig]
	);

	// Memoize the change handler
	const handleChange = useCallback(
		(value: string | string[] | null) =>
			handleStateChange(selectedKey as keyof StateType, value),
		[handleStateChange, selectedKey]
	);

	// Memoize the dropdown click handler
	const handleDropdownClick = useCallback(
		(key: string) => () => handleGroupKeySelect(group.label, key),
		[handleGroupKeySelect, group.label]
	);

	return (
		<>
			<span className='font-medium text-muted-foreground text-xs'>
				{group.label}
			</span>
			<div className='flex flex-row'>
				<div>
					<groupConfig.component
						{...groupConfig}
						{...spreadProps}
						hideLabel={true}
						onChange={handleChange}
						value={state[selectedKey as keyof StateType]}
					/>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							className='w-6 px-1 py-1 text-xs'
							size='icon'
							variant='outline'
						>
							<MoreVertical className='!size-4' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end'>
						{group.keys.map(key => (
							<DropdownMenuItem
								className={
									selectedKey === String(key)
										? "bg-secondary-foreground/10"
										: ""
								}
								key={String(key)}
								onClick={handleDropdownClick(String(key))}
							>
								{CONFIG[String(key)]?.label || String(key)}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</>
	);
}
