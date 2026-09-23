import { useCallback, useEffect, useState } from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from "@/components/ui/tooltip";
import { ClassNameItemControl } from "@/components/ui/ui-builder/internal/form-fields/classname-control/classname-item-control";
import ClassNameMultiselect from "@/components/ui/ui-builder/internal/form-fields/classname-control/classname-multiselect";
import type { ClassNameControlProfile } from "@/components/ui/ui-builder/internal/form-fields/classname-control/config";

interface BreakpointClassNameControlProps {
	onChange?: (classes: string) => void;
	value?: string;
	classProfile?: ClassNameControlProfile;
}
export const BreakpointClassNameControl = ({
	onChange,
	value,
	classProfile
}: BreakpointClassNameControlProps) => {
	// Helper to parse classString into base, md, rest
	const parseClassString = (str: string) => {
		const tokens = str.trim().split(/\s+/);
		const base: string[] = [];
		const md: string[] = [];
		const rest: string[] = [];
		for (const token of tokens) {
			if (token.startsWith("md:")) {
				md.push(token.slice(3));
			} else if (token.includes(":")) {
				rest.push(token);
			} else if (token) {
				base.push(token);
			}
		}
		return {
			base: base.join(" "),
			md: md.join(" "),
			rest: rest.join(" ")
		};
	};

	// State for the full class string
	const [classString, setClassString] = useState(value || "");
	// State for the tab
	const [tab, setTab] = useState<"base" | "md">("base");

	// Sync classString with value prop (uncontrolled to controlled fix)
	useEffect(() => {
		if (typeof value === "string" && value !== classString) {
			setClassString(value);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value, classString]);

	// Parse the class string for the tabs
	const { base, md, rest } = parseClassString(classString);

	// Handlers for each tab
	const handleBaseChange = useCallback(
		(newBase: string) => {
			const newClassString = [
				newBase,
				md
					?.split(" ")
					.map(cls => `md:${cls}`)
					.join(" "),
				rest
			]
				.filter(Boolean)
				.join(" ")
				.replace(/\s+/g, " ")
				.trim();
			setClassString(newClassString);
		},
		[md, rest]
	);

	const handleMdChange = useCallback(
		(newMd: string) => {
			const mdClasses = newMd
				.split(" ")
				.filter(Boolean)
				.map(cls => `md:${cls}`)
				.join(" ");
			const newClassString = [base, mdClasses, rest]
				.filter(Boolean)
				.join(" ")
				.replace(/\s+/g, " ")
				.trim();
			setClassString(newClassString);
		},
		[base, rest]
	);

	// When classString changes, call parent onChange
	useEffect(() => {
		if (onChange) onChange(classString);
	}, [classString, onChange]);

	// When multiselect changes, update classString (and tabs will re-parse)
	const handleMultiselectChange = useCallback((newClassString: string) => {
		setClassString(newClassString);
	}, []);

	const handleTabChange = useCallback(
		(val: string) => setTab(val as "base" | "md"),
		[]
	);

	return (
		<div
			className='w-full rounded-lg border'
			data-testid='breakpoint-classname-control'
		>
			<Tabs
				className='w-full'
				data-testid='breakpoint-tabs'
				onValueChange={handleTabChange}
				value={tab}
			>
				<TabsList
					className='grid w-full grid-cols-2'
					data-testid='breakpoint-tabs-list'
				>
					<TabsTrigger
						data-testid='base-tab-trigger'
						value='base'
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className='flex items-center'>
									<span>Base</span>
									{base && (
										<Badge className='!text-[10px] ms-1 h-[18px] min-w-[18px] justify-center px-[3px] text-center'>
											{base.split(" ").filter(Boolean).length}
										</Badge>
									)}
								</div>
							</TooltipTrigger>
							<TooltipContent>Base styles for all screen sizes</TooltipContent>
						</Tooltip>
					</TabsTrigger>
					<TabsTrigger
						data-testid='md-tab-trigger'
						value='md'
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className='flex items-center'>
									<span className='overflow-hidden text-ellipsis whitespace-nowrap text-nowrap'>
										Tablet & Desktop
									</span>
									{md && (
										<Badge className='!text-[10px] ms-1 h-[18px] min-w-[18px] justify-center px-[3px] text-center'>
											{md.split(" ").filter(Boolean).length}
										</Badge>
									)}
								</div>
							</TooltipTrigger>
							<TooltipContent>
								Overrides for screens larger than 768px (md:*)
							</TooltipContent>
						</Tooltip>
					</TabsTrigger>
				</TabsList>
				<TabsContent
					className='mt-0'
					data-testid='base-tab-content'
					value='base'
				>
					<ClassNameItemControl
						classProfile={classProfile}
						onChange={handleBaseChange}
						value={base}
					/>
				</TabsContent>
				<TabsContent
					className='mt-0'
					data-testid='md-tab-content'
					value='md'
				>
					<ClassNameItemControl
						classProfile={classProfile}
						onChange={handleMdChange}
						value={md}
					/>
				</TabsContent>
			</Tabs>
			<Accordion
				collapsible
				data-testid='classes-accordion'
				defaultValue=''
				type='single'
			>
				<AccordionItem
					className='border-t border-b-0 px-4 [&_#accordion-content[data-state=closed]]:overflow-hidden [&_#accordion-content[data-state=open]]:overflow-visible'
					data-testid='classes-accordion-item'
					value='classes'
				>
					<AccordionTrigger
						className='text-sm'
						data-testid='classes-accordion-trigger'
					>
						Edit All Classes
					</AccordionTrigger>
					<AccordionContent
						data-testid='classes-accordion-content'
						id='accordion-content'
					>
						<ClassNameMultiselect
							classProfile={classProfile}
							onChange={handleMultiselectChange}
							value={classString}
						/>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
};
