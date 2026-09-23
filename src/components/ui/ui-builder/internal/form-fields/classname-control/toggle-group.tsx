import { ChevronDown, XIcon } from "lucide-react";
import { type ReactNode, useCallback, useMemo } from "react";

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

type ToggleGroupProps = {
	label: string;
	options: ToggleOption[];
	value?: string | string[] | null;
	onChange?: (value: string | string[] | null) => void;
	className?: string;
	allowDeselect?: boolean;
	hideLabel?: boolean;
	multiple?: boolean;
};

export type ToggleOption = {
	className?: string;
	value: string;
	tooltip: string;
	label?: string;
	icon?: ReactNode;
	dropdown?: {
		items: { value: string; label: ReactNode }[];
		defaultValue?: string;
		dropdownDisplay?: "grid";
	};
};

export function ToggleGroup({
	label,
	options,
	value = null,
	onChange,
	className,
	allowDeselect = true,
	hideLabel = false,
	multiple = false
}: ToggleGroupProps) {
	// Helper to normalize value to array for multi-select
	const valueArray = useMemo(
		() =>
			multiple ? (Array.isArray(value) ? value : value ? [value] : []) : value,
		[multiple, value]
	);

	const getIsSelected = useCallback(
		(option: ToggleOption) => {
			if (option.dropdown) {
				if (multiple) {
					return option.dropdown.items.some(item =>
						(valueArray as string[]).includes(
							typeof item.value === "string" ? item.value : ""
						)
					);
				}
				return option.dropdown.items.some(
					item =>
						value === (typeof item.value === "string" ? item.value : undefined)
				);
			}
			if (multiple) {
				return (valueArray as string[]).includes(option.value);
			}
			return value === option.value;
		},
		[multiple, valueArray, value]
	);

	const handleToggleClick = useCallback(
		(option: ToggleOption) => {
			if (multiple) {
				let newValue: string[] = Array.isArray(valueArray)
					? [...valueArray]
					: [];
				if (option.dropdown) {
					// For dropdown, add/remove all dropdown items
					const dropdownValues = option.dropdown.items.map(item =>
						typeof item.value === "string" ? item.value : ""
					);
					const hasAny = dropdownValues.some(v => newValue.includes(v));
					if (hasAny && allowDeselect) {
						newValue = newValue.filter(v => !dropdownValues.includes(v));
					} else {
						// Add first dropdown value if none selected
						if (!hasAny && dropdownValues[0]) {
							newValue.push(dropdownValues[0]);
						}
					}
				} else {
					const idx = newValue.indexOf(option.value);
					if (idx > -1 && allowDeselect) {
						newValue.splice(idx, 1);
					} else if (idx === -1) {
						newValue.push(option.value);
					}
				}
				onChange?.(newValue.length ? newValue : null);
			} else {
				if (getIsSelected(option) && allowDeselect) {
					onChange?.(null);
					return;
				}
				if (option.dropdown) {
					const dropdownValue =
						option.dropdown.defaultValue ||
						(option.dropdown.items[0] &&
						typeof option.dropdown.items[0].value === "string"
							? option.dropdown.items[0].value
							: null) ||
						null;
					onChange?.(dropdownValue);
				} else {
					onChange?.(option.value);
				}
			}
		},
		[multiple, valueArray, allowDeselect, onChange, getIsSelected]
	);

	const handleDropdownSelect = useCallback(
		(optionValue: string, dropdownValue: string) => {
			if (multiple) {
				let newValue: string[] = Array.isArray(valueArray)
					? [...valueArray]
					: [];
				// Remove all values from this dropdown's set
				const dropdownValues =
					options
						.find(opt => opt.value === optionValue)
						?.dropdown?.items.map(item =>
							typeof item.value === "string" ? item.value : ""
						) || [];
				newValue = newValue.filter(v => !dropdownValues.includes(v));
				// Add the selected value
				if (!newValue.includes(dropdownValue)) {
					newValue.push(dropdownValue);
				}
				onChange?.(newValue.length ? newValue : null);
			} else {
				onChange?.(dropdownValue);
			}
		},
		[multiple, valueArray, options, onChange]
	);

	const selectedClass = "bg-background font-semibold shadow-sm";

	// Single event handlers that use data attributes to avoid creating functions on each render
	const handleToggleClickEvent = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			const optionValue = e.currentTarget.dataset.optionValue;
			const option = options.find(opt => opt.value === optionValue);
			if (option) {
				handleToggleClick(option);
			}
		},
		[options, handleToggleClick]
	);

	const handleDropdownSelectEvent = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			const optionValue = e.currentTarget.dataset.optionValue;
			const dropdownValue = e.currentTarget.dataset.dropdownValue;
			if (optionValue && dropdownValue) {
				handleDropdownSelect(optionValue, dropdownValue);
			}
		},
		[handleDropdownSelect]
	);

	const handleCloseAutoFocus = useCallback(
		(e: Event) => e.preventDefault(),
		[]
	);

	// Memoized style object
	const minWidthStyle = useMemo(() => ({ minWidth: 0 }), []);

	return (
		<div>
			{!hideLabel && (
				<span className='font-medium text-muted-foreground text-xs'>
					{label}
				</span>
			)}
			<div
				className={cn(
					"flex w-fit flex-wrap items-center gap-1 rounded-md bg-muted p-1",
					className
				)}
			>
				{options.map(option => {
					const isSelected = getIsSelected(option);

					if (option.dropdown) {
						// For multi, show selected dropdown item if any
						let selectedDropdownItem = null;
						if (multiple) {
							selectedDropdownItem = option.dropdown.items.find(item =>
								(valueArray as string[]).includes(
									typeof item.value === "string" ? item.value : ""
								)
							);
						} else {
							selectedDropdownItem = option.dropdown.items.find(
								item =>
									value ===
									(typeof item.value === "string" ? item.value : undefined)
							);
						}
						return (
							<DropdownMenu key={option.value}>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className='flex items-center'>
											<DropdownMenuTrigger asChild>
												<Button
													aria-label={
														option.tooltip || option.label || option.value
													}
													aria-pressed={isSelected}
													className={cn(
														"flex h-8 min-w-8 items-center justify-between gap-px rounded-e-none p-1",
														isSelected && selectedClass
													)}
													data-option-value={option.value}
													onClick={handleToggleClickEvent}
													size='sm'
													variant='ghost'
												>
													<span
														className='flex flex-row items-center gap-1'
														style={minWidthStyle}
													>
														{option.icon ? (
															<div className='contents text-muted-foreground'>
																{option.icon}
															</div>
														) : (
															<div className='font-normal text-muted-foreground text-xs leading-3'>
																{option.label}
																{isSelected && ":"}
															</div>
														)}
														{isSelected && option.dropdown && (
															<DropdownOption>
																{selectedDropdownItem?.label ||
																	option.dropdown.defaultValue ||
																	""}
															</DropdownOption>
														)}
													</span>
													<ChevronDown className='!size-3 ms-1 shrink-0 text-muted-foreground/60' />
												</Button>
											</DropdownMenuTrigger>
											{/* X icon to clear selection, outside the trigger */}
											{isSelected && option.dropdown && (
												<Button
													aria-label='Clear selection'
													className={cn(
														"h-8 cursor-pointer rounded-s-none rounded-e-md border-s border-s-border px-1 focus:outline-none",
														selectedClass
													)}
													data-option-value={option.value}
													onClick={handleToggleClickEvent}
													size='sm'
													variant='ghost'
												>
													<XIcon className='!size-3 text-muted-foreground' />
												</Button>
											)}
										</div>
									</TooltipTrigger>
									<TooltipContent>{option.tooltip}</TooltipContent>
								</Tooltip>
								<DropdownMenuContent
									align='end'
									className={cn(
										"max-h-96 overflow-y-auto",
										option.dropdown.dropdownDisplay === "grid"
											? "grid grid-cols-5 gap-px p-1"
											: ""
									)}
									onCloseAutoFocus={handleCloseAutoFocus}
								>
									{option.dropdown.items.map(item => (
										<DropdownMenuItem
											aria-label={
												typeof item.label === "string" ? item.label : undefined
											}
											aria-selected={
												multiple
													? (valueArray as string[]).includes(
															typeof item.value === "string" ? item.value : ""
														)
													: value ===
														(typeof item.value === "string"
															? item.value
															: undefined)
											}
											className={
												(
													multiple
														? (valueArray as string[]).includes(
																typeof item.value === "string" ? item.value : ""
															)
														: value ===
															(typeof item.value === "string"
																? item.value
																: undefined)
												)
													? selectedClass
													: ""
											}
											data-dropdown-value={
												typeof item.value === "string" ? item.value : ""
											}
											data-option-value={option.value}
											key={
												typeof item.value === "string" ? item.value : undefined
											}
											onClick={handleDropdownSelectEvent}
										>
											{item.label}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						);
					}

					return (
						<Tooltip key={option.value}>
							<TooltipTrigger asChild>
								<Button
									aria-label={option.tooltip || option.label || option.value}
									aria-pressed={isSelected}
									className={cn(
										"flex h-8 min-w-8 items-center justify-between gap-px p-1 text-xs",
										isSelected && selectedClass
									)}
									data-option-value={option.value}
									onClick={handleToggleClickEvent}
									size='sm'
									variant='ghost'
								>
									<span
										className={cn(
											"text-muted-foreground text-sx",
											option.icon
												? "flex flex-row items-center gap-1"
												: "flex flex-1 flex-col items-center justify-center"
										)}
										style={minWidthStyle}
									>
										{option.icon}
										{option.label && (
											<span
												className={cn(
													option.icon && "ms-2",
													!isSelected && "font-normal"
												)}
											>
												{option.label}
											</span>
										)}
									</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>{option.tooltip}</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
		</div>
	);
}

export function DropdownOption({
	color,
	children
}: {
	color?: string;
	children: ReactNode;
}) {
	return (
		<div className='flex w-full flex-row items-center justify-start text-center'>
			{color && (
				<span
					className={cn(
						"me-1 inline-block size-[14px] rounded-full border border-border",
						color
					)}
				/>
			)}
			<span className='text-muted-foreground text-xs'>{children}</span>
		</div>
	);
}
